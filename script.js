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
    // --- HTML 요소 가져오기 --- (이전과 동일)
    const tickerInput = document.getElementById('ticker-input');
    const analyzeButton = document.getElementById('analyze-button');
    // ... (나머지 모든 HTML 요소 가져오기 코드는 이전 답변의 window.onload 내부와 동일하게 유지) ...
    const recalculateButton = document.getElementById('recalculate-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');
    const resultsArea = document.getElementById('results-area');
    const autocompleteList = document.getElementById('autocomplete-list');

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

    async function loadTickerData() {
        try {
            const response = await fetch('tickers.json');
            if (!response.ok) {
                console.error(`Ticker list fetch failed: ${response.status}`);
                tickerDataStore = [];
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
    loadTickerData();

    if (tickerInput && autocompleteList) {
        tickerInput.addEventListener('input', function(e) {
            const val = this.value;
            autocompleteList.innerHTML = ''; 
            if (!val || val.length < 1) {
                autocompleteList.style.display = 'none';
                return false;
            }
            if (!tickerDataStore || tickerDataStore.length === 0) {
                return false;
            }
            let count = 0;
            tickerDataStore.forEach(item => {
                if (!item || typeof item.symbol !== 'string' || typeof item.name !== 'string') {
                    return; 
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
                        suggestionDiv.textContent = `${item.name} (${item.symbol})`;
                    }
                    
                    suggestionDiv.addEventListener('click', function() {
                        tickerInput.value = item.symbol;
                        closeAllLists(); // ★★★ 항목 선택 시 목록 닫기 ★★★
                        // 선택 후에는 input 이벤트가 다시 발생하지 않도록 포커스를 잠시 다른 곳으로 옮겼다가 돌려놓거나,
                        // 혹은 input 이벤트 리스너 내에서 플래그를 사용하여 목록을 다시 그리지 않도록 할 수 있습니다.
                        // 가장 간단한 방법은 input 값 변경 후 목록을 즉시 닫는 것입니다.
                        autocompleteList.innerHTML = ''; // 클릭 후 즉시 목록 비우기
                        autocompleteList.style.display = 'none';
                    });
                    autocompleteList.appendChild(suggestionDiv);
                    count++;
                }
            });
            autocompleteList.style.display = count > 0 ? 'block' : 'none';
        });

        // 입력창에서 포커스가 벗어났을 때도 목록을 닫도록 추가 (선택적)
        // tickerInput.addEventListener('blur', function() {
        //     setTimeout(closeAllLists, 150); // 다른 클릭 이벤트(항목 선택)가 먼저 처리될 시간을 줌
        // });

    } else {
        console.error("CRITICAL: tickerInput or autocompleteList element not found in HTML.");
    }

    // closeAllLists 함수는 이전과 동일하게 유지하거나, 더 단순화 가능
    function closeAllLists() { // elmnt 파라미터 제거하고 항상 닫도록 단순화
        if (autocompleteList) {
            autocompleteList.innerHTML = '';
            autocompleteList.style.display = 'none';
        }
    }
    // 문서 전체 클릭 시 자동완성 목록 닫기 (이벤트 버블링 고려)
    document.addEventListener('click', function (e) {
        if (autocompleteList && tickerInput) { // 요소 존재 확인
            // 클릭된 요소가 tickerInput이나 autocompleteList 내부가 아니라면 닫음
            if (e.target !== tickerInput && !autocompleteList.contains(e.target)) {
                closeAllLists();
            }
        }
    });


    if (analyzeButton) {
        analyzeButton.addEventListener('click', () => {
            ensureBaseChartLibrariesReady(async () => { 
                const ticker = tickerInput.value.trim().toUpperCase();
                if (!ticker) { showError('티커를 입력해주세요.'); return; }
                showLoading(true); hideError(); hideResults();
                try {
                    const response = await fetch(`/.netlify/functions/fetchStockData?ticker=${ticker}`);
                    if (!response.ok) {
                        const errData = await response.json().catch(()=>({error: `HTTP 오류! 상태: ${response.status}`}));
                        throw new Error(errData.error || `HTTP 오류! 상태: ${response.status}`);
                    }
                    currentStockData = await response.json();
                    if (currentStockData.error) throw new Error(currentStockData.error);
                    if (currentStockData.price === undefined || currentStockData.price === null || 
                        !currentStockData.historicalData || currentStockData.historicalData.length === 0) {
                         throw new Error(`주가 또는 과거 주가 데이터가 부족하여 분석할 수 없습니다. (티커: ${ticker})`);
                    }
                    initializePageWithData(currentStockData);
                } catch (error) {
                    console.error("분석 오류:", error.message, error.stack);
                    currentStockData = null;
                    showError(`분석 중 오류 발생: ${error.message}`);
                } finally { showLoading(false); }
            });
        });
    } else { console.error("Analyze button not found."); }

    if (recalculateButton) { /* ... 이전과 동일 ... */ }
    if (inputRf && inputErp) { /* ... 이전과 동일 ... */ }
    function updateKeInput(betaValue) { /* ... 이전과 동일 ... */ }
    function initializePageWithData(apiData) { /* ... 이전과 거의 동일 ... */
        if (stockNameTitle) stockNameTitle.textContent = `${apiData.companyName || apiData.symbol} (${apiData.symbol || 'N/A'})`;
        // ... (나머지 initializePageWithData 함수 내용은 이전 답변과 동일)
        if (currentPriceSpan) currentPriceSpan.textContent = apiData.price !== undefined && apiData.price !== null ? apiData.price.toFixed(2) : 'N/A';
        if (dataDateSpan) dataDateSpan.textContent = 'API 제공 기준';

        if(apiEpsSpan) apiEpsSpan.textContent = apiData.eps !== undefined && apiData.eps !== null ? `$${apiData.eps.toFixed(2)}` : 'N/A (정보 없음)';
        // ... (이하 API 데이터 표시 부분 동일)
        if(apiPayoutRatioSpan) apiPayoutRatioSpan.textContent = apiData.payoutRatioTTM !== undefined && apiData.payoutRatioTTM !== null ? (apiData.payoutRatioTTM * 100).toFixed(2) : 'N/A (정보 없음)';


        if(inputPerLow) inputPerLow.value = 20; if(inputPerBase) inputPerBase.value = 25; if(inputPerHigh) inputPerHigh.value = 30;
        // ... (이하 input 필드 초기화 부분 동일)
        updateKeInput(apiData.beta);

        let initialG; // 선언
        const keForGCalc = inputKe ? (parseFloat(inputKe.value) / 100) : 0.08;
        // ... (initialG 계산 로직 동일)
        if(inputG) inputG.value = (initialG * 100).toFixed(1);

        const userAssumptions = getUserAssumptions();
        const fairValuesResult = calculateFairValues(apiData, userAssumptions);
        
        if (fairValuesResult && fairValuesResult.modelOutputs && fairValuesResult.final) {
            updateModelDetailsDisplays(apiData, userAssumptions, fairValuesResult.modelOutputs);
            if(fairValueSummaryP) fairValueSummaryP.textContent = `산출된 모델들의 기본 추정치 평균은 $${fairValuesResult.final.base.toFixed(2)} 입니다. (단, EPS/BPS 등 정보 부족 시 정확도 낮음)`;
        } else { /* ... 이전과 동일 ... */ }
        
        showResults(); 

        setTimeout(() => {
            if (fairValuesResult && fairValuesResult.final) {
                createOrUpdatePriceChart(apiData.historicalData, fairValuesResult.final);
            } else { /* ... 이전과 동일 ... */ }
        }, 100); 
    }

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
