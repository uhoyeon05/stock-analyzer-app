// 3. netlify/functions/fetchStockData.js
const fetch = require('node-fetch'); // node-fetch v2.x.x를 사용해야 CommonJS 환경에서 잘 작동합니다. package.json에 "node-fetch": "^2.6.7" 추가 필요.

const API_KEY = process.env.FMP_API_KEY; // Netlify 환경 변수에서 API 키를 가져옵니다.

exports.handler = async (event, context) => {
  const ticker = event.queryStringParameters.ticker;

  if (!ticker) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Ticker is required' }),
    };
  }

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key is not configured' }),
    };
  }

  const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${API_KEY}`;
  const ratiosUrl = `https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}?apikey=${API_KEY}`;
  // FMP 무료 티어에서는 연간 성장률 데이터 접근이 제한적일 수 있습니다.
  // 우선 ROE를 사용하고, 성장률은 기본값을 적용하거나 ROE 기반으로 단순 계산하는 방향을 고려합니다.

  try {
    const [profileRes, ratiosRes] = await Promise.all([
      fetch(profileUrl),
      fetch(ratiosUrl),
    ]);

    if (!profileRes.ok || !ratiosRes.ok) {
      let errorMsg = `Failed to fetch data for ${ticker}.`;
      if (!profileRes.ok) errorMsg += ` Profile status: ${profileRes.status}.`;
      if (!ratiosRes.ok) errorMsg += ` Ratios status: ${ratiosRes.status}.`;
      console.error(errorMsg);
      return {
        statusCode: profileRes.status === 401 || ratiosRes.status === 401 ? 401 : 500, // API 키 문제일 수 있음
        body: JSON.stringify({ error: errorMsg }),
      };
    }

    const profileData = await profileRes.json();
    const ratiosData = await ratiosRes.json();

    // FMP API 응답은 배열로 올 수 있으므로 첫 번째 항목을 사용합니다.
    const profile = profileData[0] || {};
    const ratios = ratiosData[0] || {};

    const relevantData = {
      symbol: profile.symbol,
      companyName: profile.companyName,
      price: profile.price,
      beta: profile.beta,
      eps: ratios.epsदृश्यमानताTTM, // TTM EPS from ratios
      bps: ratios.bookValuePerShareTTM, // TTM BPS from ratios
      dividendYield: ratios.dividendYieldTTM, // TTM Dividend Yield
      payoutRatio: ratios.payoutRatioTTM, // TTM Payout Ratio
      roe: ratios.returnOnEquityTTM, // TTM ROE
      // FMP에서 DPS를 직접 제공하지 않으므로, 배당수익률과 현재 주가로 역산하거나, EPS와 배당성향으로 계산
      // dps: (ratios.dividendYieldTTM * profile.price) 또는 (ratios.epsदृश्यमानताTTM * ratios.payoutRatioTTM)
      // 둘 중 더 안정적인 값을 선택하거나, API 응답을 확인 후 결정 필요
      dps: ratios.dividendPerShareTTM || (ratios.dividendYieldTTM && profile.price ? ratios.dividendYieldTTM * profile.price : 0),
    };

    // 필수 데이터 누락 체크
    if (!relevantData.price || !relevantData.eps || !relevantData.bps) {
        console.warn(`Incomplete data for ${ticker}:`, relevantData);
        // 필수 데이터가 하나라도 없으면 분석이 어려우므로 에러 처리 또는 부분 데이터만 반환 결정
    }


    return {
      statusCode: 200,
      body: JSON.stringify(relevantData),
    };
  } catch (error) {
    console.error('Error in fetchStockData function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error while fetching stock data', details: error.message }),
    };
  }
};