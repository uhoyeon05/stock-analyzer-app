// netlify/functions/fetchStockData.js
const fetch = require('node-fetch');

const API_KEY = process.env.FMP_API_KEY;

exports.handler = async (event, context) => {
  const ticker = event.queryStringParameters.ticker;

  if (!ticker) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '티커가 필요합니다.' }),
    };
  }

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API 키가 서버에 설정되지 않았습니다.' }),
    };
  }

  const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${API_KEY}`;
  const ratiosUrl = `https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}?apikey=${API_KEY}`;

  try {
    const [profileResponse, ratiosResponse] = await Promise.all([
      fetch(profileUrl),
      fetch(ratiosUrl),
    ]);

    if (!profileResponse.ok || !ratiosResponse.ok) {
      let errorDetail = '';
      if (!profileResponse.ok) errorDetail += `프로필 정보 가져오기 실패: ${profileResponse.status} ${profileResponse.statusText}. `;
      if (!ratiosResponse.ok) errorDetail += `재무 비율 정보 가져오기 실패: ${ratiosResponse.status} ${ratiosResponse.statusText}.`;
      
      console.error('FMP API 오류:', errorDetail);
      const statusCode = (profileResponse.status === 401 || ratiosResponse.status === 401 || profileResponse.status === 403 || ratiosResponse.status === 403 || profileResponse.status === 429 || ratiosResponse.status === 429) ? profileResponse.status : 500;
      return {
        statusCode: statusCode,
        body: JSON.stringify({ error: `${ticker} 주식 정보를 FMP API에서 가져오는데 실패했습니다. ${errorDetail}` }),
      };
    }

    const profileData = await profileResponse.json();
    const ratiosData = await ratiosResponse.json();

    const profile = profileData[0] || {};
    const ratios = ratiosData[0] || {};

    let eps, bps;
    const currentPrice = profile.price;

    if (currentPrice && ratios.priceEarningsRatioTTM && ratios.priceEarningsRatioTTM !== 0) {
      eps = currentPrice / ratios.priceEarningsRatioTTM;
    } else {
      eps = undefined;
    }

    if (currentPrice && ratios.priceToBookRatioTTM && ratios.priceToBookRatioTTM !== 0) {
      bps = currentPrice / ratios.priceToBookRatioTTM;
    } else {
      bps = undefined;
    }

    const relevantData = {
      symbol: profile.symbol,
      companyName: profile.companyName,
      price: currentPrice,
      beta: profile.beta,
      eps: eps,
      bps: bps,
      dividendYield: ratios.dividendYielTTM, // 사용자가 제공한 API 응답 기준 필드명
      payoutRatio: ratios.payoutRatioTTM,
      roe: ratios.returnOnEquityTTM,
      dps: ratios.dividendPerShareTTM, // 사용자가 제공한 API 응답 기준 필드명
    };
    
    if (relevantData.price === undefined || relevantData.eps === undefined || relevantData.bps === undefined) {
      console.warn(`핵심 재무 데이터(주가, EPS, 또는 BPS)가 누락되었거나 계산할 수 없습니다. 티커: ${ticker}. API 응답/계산값:`, {profile, ratios, derivedEps: eps, derivedBps: bps});
    }

    return {
      statusCode: 200,
      body: JSON.stringify(relevantData),
    };

  } catch (error) {
    console.error('fetchStockData 함수 내 예상치 못한 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '내부 서버 오류가 발생했습니다.', details: error.message }),
    };
  }
};
