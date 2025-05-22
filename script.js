// netlify/functions/fetchStockData.js
const fetch = require('node-fetch');

// Netlify 환경 변수에서 Polygon.io API 키를 가져옵니다.
// 이름은 FMP_API_KEY 대신 POLYGON_API_KEY로 변경하는 것이 좋습니다.
// Netlify 대시보드에서 이 이름으로 환경 변수를 새로 만드시거나 기존 것을 수정해주세요.
const API_KEY = process.env.POLYGON_API_KEY;

// 날짜를 YYYY-MM-DD 형식으로 변환하는 함수
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
            body: JSON.stringify({ error: 'Polygon.io API 키가 서버에 설정되지 않았습니다.' }),
        };
    }

    // 과거 1년치 주가 데이터 가져오기
    const today = new Date();
    const toDate = formatDate(today);
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const fromDate = formatDate(oneYearAgo);

    // Polygon.io API 엔드포인트
    const aggregatesUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=366&apiKey=${API_KEY}`;
    const tickerDetailsUrl = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${API_KEY}`;
    const previousCloseUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${API_KEY}`;
    // 재무 비율 등 다른 데이터는 FMP 또는 Polygon 유료 플랜에서 가져와야 할 수 있습니다.
    // 여기서는 Polygon 무료 플랜에서 가능한 데이터에 집중합니다.

    try {
        const [aggregatesResponse, detailsResponse, prevCloseResponse] = await Promise.all([
            fetch(aggregatesUrl),
            fetch(tickerDetailsUrl),
            fetch(prevCloseResponse),
        ]);

        let errorDetail = '';
        if (!aggregatesResponse.ok) errorDetail += `과거 주가 데이터 가져오기 실패(${aggregatesResponse.status}). `;
        if (!detailsResponse.ok) errorDetail += `티커 상세 정보 가져오기 실패(${detailsResponse.status}). `;
        if (!prevCloseResponse.ok) errorDetail += `전일 종가 정보 가져오기 실패(${prevCloseResponse.status}). `;


        if (errorDetail) {
            console.error('Polygon.io API 오류:', errorDetail);
            const firstFailedResponse = !aggregatesResponse.ok ? aggregatesResponse : (!detailsResponse.ok ? detailsResponse : prevCloseResponse);
             const statusCode = (firstFailedResponse.status === 401 || firstFailedResponse.status === 403 || firstFailedResponse.status === 429) ? firstFailedResponse.status : 500;
            return {
                statusCode: statusCode,
                body: JSON.stringify({ error: `${ticker} 정보를 Polygon.io API에서 가져오는데 실패했습니다. ${errorDetail}` }),
            };
        }

        const aggregatesData = await aggregatesResponse.json();
        const detailsData = await detailsResponse.json();
        const prevCloseData = await prevCloseResponse.json();

        const companyProfile = detailsData.results || {};
        const historicalPrices = (aggregatesData.results || []).map(item => ({
            time: formatDate(new Date(item.t)), // Polygon은 타임스탬프(ms)로 제공
            open: item.o,
            high: item.h,
            low: item.l,
            close: item.c,
            volume: item.v,
        }));

        // 현재 주가 (전일 종가 사용)
        const currentPrice = prevCloseData.results && prevCloseData.results.length > 0 ? prevCloseData.results[0].c : null;

        // Polygon.io 무료 티어에서는 EPS, BPS, ROE, Beta, 배당성향 등의 상세한 TTM 재무비율을 직접 제공하지 않을 수 있습니다.
        // 이 값들은 FMP API를 계속 사용하거나, Polygon.io 유료 플랜, 또는 다른 소스에서 가져와야 합니다.
        // 여기서는 해당 값들을 null 또는 기본값으로 처리합니다.
        const relevantData = {
            symbol: companyProfile.ticker || ticker.toUpperCase(),
            companyName: companyProfile.name || 'N/A',
            price: currentPrice,
            // 아래 값들은 Polygon.io 무료 버전에서 직접 얻기 어려우므로, FMP API 등을 병행 사용하거나
            // 지금은 기본값/N/A 처리합니다.
            beta: null, // 예시: FMP에서 가져오거나 계산 필요
            eps: null,  // 예시: FMP 또는 다른 소스
            bps: null,  // 예시: FMP 또는 다른 소스
            dividendYieldTTM: null,
            payoutRatioTTM: null,
            roeTTM: null,
            dpsTTM: null,
            peTTM: null,
            pbTTM: null,
            historicalData: historicalPrices,
        };

        if (relevantData.price === null || !relevantData.historicalData || relevantData.historicalData.length === 0) {
            console.warn(`핵심 주가 또는 과거 주가 데이터가 부족합니다. 티커: ${ticker}.`, {prevCloseData, aggregatesData});
            // throw new Error() 대신, 클라이언트에서 처리할 수 있도록 isDataSufficient 같은 플래그를 추가할 수도 있습니다.
        }

        return {
            statusCode: 200,
            body: JSON.stringify(relevantData),
        };

    } catch (error) {
        console.error('fetchStockData 함수 내 예상치 못한 오류 (Polygon.io):', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: '내부 서버 오류가 발생했습니다.', details: error.message }),
        };
    }
};
