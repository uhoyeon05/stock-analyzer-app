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

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toDateStr = formatDate(today);
  const fromDateStr = formatDate(oneYearAgo);

  const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${API_KEY}`;
  const ratiosUrl = `https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}?apikey=${API_KEY}`;
  // 1년치 일별 주가 데이터 (종가만 필요하면 historical-chart, 캔들스틱은 historical-price-full)
  const historicalPriceUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?from=${fromDateStr}&to=${toDateStr}&apikey=${API_KEY}`;


  try {
    const [profileResponse, ratiosResponse, historicalResponse] = await Promise.all([
      fetch(profileUrl),
      fetch(ratiosUrl),
      fetch(historicalPriceUrl),
    ]);

    // API 응답 성공 여부 확인
    let errorDetail = '';
    if (!profileResponse.ok) errorDetail += `프로필 정보 가져오기 실패: ${profileResponse.status} ${profileResponse.statusText}. `;
    if (!ratiosResponse.ok) errorDetail += `재무 비율 정보 가져오기 실패: ${ratiosResponse.status} ${ratiosResponse.statusText}. `;
    if (!historicalResponse.ok) errorDetail += `과거 주가 정보 가져오기 실패: ${historicalResponse.status} ${historicalResponse.statusText}. `;

    if (errorDetail) {
      console.error('FMP API 오류:', errorDetail);
      // 특정 API 호출 실패 상태 코드에 따라 더 구체적인 오류 반환 가능
      const primaryFailedResponse = !profileResponse.ok ? profileResponse : (!ratiosResponse.ok ? ratiosResponse : historicalResponse);
      const statusCode = (primaryFailedResponse.status === 401 || primaryFailedResponse.status === 403 || primaryFailedResponse.status === 429) ? primaryFailedResponse.status : 500;
      return {
        statusCode: statusCode,
        body: JSON.stringify({ error: `${ticker} 주식 정보를 FMP API에서 가져오는데 실패했습니다. ${errorDetail}` }),
      };
    }

    const profileData = await profileResponse.json();
    const ratiosData = await ratiosResponse.json();
    const historicalDataResult = await historicalResponse.json();

    const profile = profileData[0] || {};
    const ratios = ratiosData[0] || {};
    // historicalDataResult.historical는 배열일 것으로 예상
    const historicalPrices = historicalDataResult.historical || []; 

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
      dividendYieldTTM: ratios.dividendYielTTM, // API 응답에서 확인된 정확한 필드명 사용 (Yiel 오타 주의)
      payoutRatioTTM: ratios.payoutRatioTTM,
      roeTTM: ratios.returnOnEquityTTM,
      dpsTTM: ratios.dividendPerShareTTM, // API 응답에서 직접 제공됨
      peTTM: ratios.priceEarningsRatioTTM, // 현재 PER 추가
      pbTTM: ratios.priceToBookRatioTTM,   // 현재 PBR 추가
      historicalData: historicalPrices.map(item => ({ // 차트 라이브러리 형식에 맞게 가공
        time: item.date, // YYYY-MM-DD 형식이어야 함
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      })).sort((a, b) => new Date(a.time) - new Date(b.time)), // 날짜 오름차순 정렬
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
