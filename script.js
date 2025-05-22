// script.js

function ensureBaseChartLibrariesReady(callback, attempt = 1) {
    const MAX_ATTEMPTS = 25;
    const chartReady = typeof window.Chart !== 'undefined' && typeof window.Chart.register === 'function';
    const momentReady = typeof window.moment !== 'undefined';

    if (chartReady && momentReady) {
        console.log("Base libraries (Chart.js, Moment.js) are ready.");
        if (typeof window.ChartAnnotation !== 'undefined') {
            try {
                window.Chart.register(window.ChartAnnotation);
                console.log("ChartAnnotation (window.ChartAnnotation) registered.");
            } catch (e) {
                console.error("Error registering window.ChartAnnotation:", e);
            }
        } else if (typeof window.Chart !== 'undefined' && typeof window.Chart.Annotation !== 'undefined') {
            try {
                window.Chart.register(window.Chart.Annotation);
                console.log("ChartAnnotation (Chart.Annotation) registered.");
            } catch (e) {
                console.error("Error registering Chart.Annotation:", e);
            }
        } else {
            console.warn("ChartAnnotation object not found on window. Annotation features might be unavailable.");
        }
        callback();
    } else {
        if (attempt <= MAX_ATTEMPTS) {
            console.warn(
                `Base chart libraries not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in 200ms. Status:`,
                { chart: chartReady, moment: momentReady }
            );
            setTimeout(() => ensureBaseChartLibrariesReady(callback, attempt + 1), 200);
        } else {
            console.error("Failed to load Chart.js or Moment.js after multiple attempts. Aborting chart initialization.");
            const errDiv = document.getElementById('error-message');
            if (errDiv) {
                errDiv.textContent = '차트 기본 라이브러리 로드에 실패했습니다. 페이지를 새로고침하거나 인터넷 연결을 확인해주세요.';
                errDiv.style.display = 'block';
            }
            const priceChartContainer = document.getElementById('price-chart-wrapper');
            if (priceChartContainer) {
                const canvasEl = document.getElementById('price-chart-canvas');
                if(canvasEl && canvasEl.getContext('2d')) {
                    const ctx = canvasEl.getContext('2d');
                    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                    ctx.font = "14px Arial"; ctx.textAlign = "center";
                    ctx.fillText('차트 라이브러리 로드 실패.', canvasEl.width / 2, canvasEl.height / 2);
                } else if (priceChartContainer.firstChild && typeof priceChartContainer.firstChild.textContent !== 'undefined') {
                     priceChartContainer.firstChild.textContent = '차트 라이브러리 로드 실패.';
                } else if (priceChartContainer.textContent === '') {
                     priceChartContainer.textContent = '차트 라이브러리 로드 실패.';
                }
            }
        }
    }
}

window.onload = () => {
    // --- HTML 요소 가져오기 ---
    const tickerInput = document.getElementById('ticker-input');
    const analyzeButton = document.getElementById('analyze-button');
    const recalculateButton = document.getElementById('recalculate-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');
    const resultsArea = document.getElementById('results-area');
    const autocompleteList = document.getElementById('autocomplete-list');

    // ... (나머지 HTML 요소 가져오기는 이전과 동일) ...
    const stockNameTitle = document.getElementById('stock-name-title');
    const currentPriceSpan = document.getElementById('current-price');
    const dataDateSpan = document.getElementById('data-date');
    const priceChartCanvas = document.getElementById('price-chart-canvas');
    let priceChartInstance = null;
    const fairValueSummaryP = document.getElementById('fair-value-summary');
    const modelEpsPerSpan = document.getElementById('model-eps-per');
    const perValueRangeSpan = document.getElementById('per-value-range');
    const modelBpsPbrSpan = document.getElementById('model-bps-pbr');
    const pbrValueRangeSpan = document.getElementById('pbr-value-range');
    const intrinsicModelNameTitleSpan = document.getElementById('intrinsic-model-name-title');
    const intrinsicFormulaDisplaySpan = document.getElementById('intrinsic-formula-display');
    const intrinsicValueRangeSpan = document.getElementById('intrinsic-value-range');
    const intrinsicModelDescriptionDiv = document.getElementById('intrinsic-model-description');
    const inputPerLow = document.getElementById('input-per-low');
    const inputPerBase = document.getElementById('input-per-base');
    const inputPerHigh = document.getElementById('input-per-high');
    const inputPbrLow = document.getElementById('input-pbr-low');
    const inputPbrBase = document.getElementById('input-pbr-base');
    const inputPbrHigh = document.getElementById('input-pbr-high');
    const inputRf = document.getElementById('input-rf');
    const inputErp = document.getElementById('input-erp');
    const inputKe = document.getElementById('input-ke');
    const inputG = document.getElementById('input-g');
    const dataBetaDisplaySpan = document.getElementById('data-beta-display');
    const apiEpsSpan = document.getElementById('api-eps');
    const apiBpsSpan = document.getElementById('api-bps');
    const apiDpsSpan = document.getElementById('api-dps');
    const apiPerSpan = document.getElementById('api-per');
    const apiPbrSpan = document.getElementById('api-pbr');
    const apiDividendYieldSpan = document.getElementById('api-dividend-yield');
    const apiRoeSpan = document.getElementById('api-roe');
    const apiBetaSpan = document.getElementById('api-beta');
    const apiPayoutRatioSpan = document.getElementById('api-payout-ratio');


    let tickerDataStore = [];
    let currentStockData = null;

    // --- 1. 티커 목록 로드 (자동 완성용) ---
    async function loadTickerData() {
        try {
            const response = await fetch('tickers.json');
            if (!response.ok) {
                console.error(`Ticker list fetch failed: ${response.status}`);
                tickerDataStore = []; // 실패 시 빈 배열로 초기화
                return;
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                tickerDataStore = data;
                console.log("Tickers loaded successfully:", tickerDataStore.length, "items");
            } else {
                console.error("Loaded ticker data is not an array:", data);
                tickerDataStore = [];
            }
        } catch (error) {
            console.error("Error loading or parsing ticker data:", error);
            tickerDataStore = [];
        }
    }
    loadTickerData(); // 페이지 로드 시 티커 데이터 가져오기

    // --- 2. 자동 완성 로직 ---
    if (tickerInput && autocompleteList) {
        tickerInput.addEventListener('input', function(e) {
            const val = this.value;
            autocompleteList.innerHTML = ''; // 이전 목록 초기화
            // console.log("Input value:", val); // 입력값 확인 로그

            if (!val || val.length < 1) {
                autocompleteList.style.display = 'none';
                return false;
            }

            if (!tickerDataStore || tickerDataStore.length === 0) {
                // console.warn("tickerDataStore is empty. Autocomplete cannot function."); // 티커 데이터 없음 경고
                return false;
            }

            let count = 0;
            tickerDataStore.forEach(item => {
                if (!item || typeof item.symbol !== 'string' || typeof item.name !== 'string') {
                    // console.warn("Invalid item in tickerDataStore:", item); // 잘못된 데이터 형식 경고
                    return; // 다음 아이템으로 건너뛰기
                }

                const pureSymbol = item.symbol.split('.')[0];
                const searchText = val.toUpperCase();
                const itemName = item.name.toUpperCase();
                const itemSymbol = pureSymbol.toUpperCase();

                if (((itemName.includes(searchText)) || (itemSymbol.includes(searchText))) && count < 7) {
                    const suggestionDiv = document.createElement("DIV");
                    try {
                        const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(escapedVal, 'gi');
                        const displayNameHTML = item.name.replace(regex, (match) => `<u>${match}</u>`);
                        const displaySymbolHTML = item.symbol.replace(regex, (match) => `<u>${match}</u>`);
                        suggestionDiv.innerHTML = `<strong>${displayNameHTML}</strong> (${displaySymbolHTML})`;
                    } catch (err) {
                        // console.error("Error creating suggestion HTML:", err); // HTML 생성 오류 시
                        suggestionDiv.textContent = `${item.name} (${item.symbol})`; // 기본 텍스트로 대체
                    }
                    
                    suggestionDiv.addEventListener('click', function() {
                        tickerInput.value = item.symbol;
                        closeAllLists();
                    });
                    autocompleteList.appendChild(suggestionDiv);
                    count++;
                }
            });
            // console.log("Suggestions found:", count); // 찾은 추천 수 로그
            autocompleteList.style.display = count > 0 ? 'block' : 'none';
        });
    } else {
        console.error("CRITICAL: tickerInput or autocompleteList element not found in HTML.");
    }

    function closeAllLists(elmnt) { /* ... 이전과 동일 ... */ }
    document.addEventListener('click', (e) => closeAllLists(e.target));

    // --- 3. "분석하기" 버튼 --- (이하 모든 함수는 이전 최종본과 동일하게 유지)
    if (analyzeButton) { /* ... 이전과 동일 ... */ }
    if (recalculateButton) { /* ... 이전과 동일 ... */ }
    if (inputRf && inputErp) { /* ... 이전과 동일 ... */ }
    function updateKeInput(betaValue) { /* ... 이전과 동일 ... */ }
    function initializePageWithData(apiData) { /* ... 이전과 동일 ... */ }
    function getUserAssumptions() { /* ... 이전과 동일 ... */ }
    function calculateFairValues(apiData, assumptions) { /* ... 이전과 동일 ... */ }
    function updateModelDetailsDisplays(apiData, assumptions, modelOutputs) { /* ... 이전과 동일 ... */ }
    function createOrUpdatePriceChart(historicalData, fairValueResults) { /* ... 이전과 동일 ... */ }
    function updateFairValueLinesOnChart(fairValueResults) { /* ... 이전과 동일 ... */ }
    function showLoading(isLoading) { /* ... 이전과 동일 ... */ }
    function showError(message) { /* ... 이전과 동일 ... */ }
    function hideError() { /* ... 이전과 동일 ... */ }
    function showResults() { /* ... 이전과 동일 ... */ }
    function hideResults() { /* ... 이전과 동일 ... */ }

}; // window.onload 끝
