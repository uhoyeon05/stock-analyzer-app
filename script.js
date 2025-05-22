// script.js

// ★★★★★ 중요: 이 함수는 DOMContentLoaded 바깥, 스크립트 최상단에 위치해야 합니다. ★★★★★
function ensureBaseChartLibrariesReady(callback, attempt = 1) {
    const MAX_ATTEMPTS = 25; 
    const chartReady = typeof window.Chart !== 'undefined' && typeof window.Chart.register === 'function';
    const momentReady = typeof window.moment !== 'undefined';

    if (chartReady && momentReady) {
        console.log("Base libraries (Chart.js, Moment.js) are ready.");
        // Annotation 플러그인 등록 시도 (존재한다면)
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
        }
    }
}

// DOMContentLoaded를 사용하여 HTML 파싱이 완료된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', () => { // ★★★ window.onload 대신 DOMContentLoaded 사용 ★★★
    // --- HTML 요소 가져오기 ---
    const tickerInput = document.getElementById('ticker-input');
    const analyzeButton = document.getElementById('analyze-button');
    const recalculateButton = document.getElementById('recalculate-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');
    const resultsArea = document.getElementById('results-area');
    const autocompleteList = document.getElementById('autocomplete-list');

    // ... (나머지 HTML 요소 가져오기 코드는 이전 답변과 동일)
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
    loadTickerData(); // DOMContentLoaded 후 티커 데이터 로드

    // --- 2. 자동 완성 로직 ---
    if (tickerInput && autocompleteList) { 
        tickerInput.addEventListener('input', function(e) {
            const val = this.value;
            autocompleteList.innerHTML = ''; 
            if (!val || val.length < 1) {
                autocompleteList.style.display = 'none';
                return false;
            }
            if (!tickerDataStore || tickerDataStore.length === 0) {
                // console.warn("tickerDataStore is empty for autocomplete."); // 필요시 로그
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
                        closeAllLists(); 
                    });
                    autocompleteList.appendChild(suggestionDiv);
                    count++;
                }
            });
            autocompleteList.style.display = count > 0 ? 'block' : 'none';
        });
    } else {
        console.error("CRITICAL: tickerInput or autocompleteList element not found in HTML for autocomplete.");
    }

    function closeAllLists() { // elmnt 파라미터 제거
        if (autocompleteList) {
            autocompleteList.innerHTML = '';
            autocompleteList.style.display = 'none';
        }
    }
    document.addEventListener('click', function (e) { // 문서 전체 클릭 시
        if (autocompleteList && tickerInput) {
            if (e.target !== tickerInput && !autocompleteList.contains(e.target)) {
                closeAllLists();
            }
        }
    });


    // --- 3. "분석하기" 버튼 ---
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

    // --- 4. "재계산" 버튼 ---
    if (recalculateButton) {
        recalculateButton.addEventListener('click', () => {
            ensureBaseChartLibrariesReady(() => { 
                if (!currentStockData) { showError('먼저 주식을 분석해주세요.'); return; }
                hideError();
                const userAssumptions = getUserAssumptions();
                const fairValuesResult = calculateFairValues(currentStockData, userAssumptions);
                createOrUpdatePriceChart(currentStockData.historicalData, fairValuesResult.final);
                updateModelDetailsDisplays(currentStockData, userAssumptions, fairValuesResult.modelOutputs);
            });
        });
    } else { console.error("Recalculate button not found."); }

    // --- 5. 가정치 입력 필드 변경 시 Ke 자동 업데이트 ---
    if (inputRf && inputErp) {
      [inputRf, inputErp].forEach(input => {
          if (input) {
              input.addEventListener('change', () => {
                  let betaToUse = 1.0;
                  if (currentStockData && currentStockData.beta !== undefined && currentStockData.beta !== null) {
                      betaToUse = currentStockData.beta;
                  }
                  updateKeInput(betaToUse);
              });
          }
      });
    }
    
    // --- 6. 함수 정의 ---
    function updateKeInput(betaValue) { /* ... 이전과 동일 ... */ }
    function initializePageWithData(apiData) { /* ... 이전과 거의 동일 ... */
        if (stockNameTitle) stockNameTitle.textContent = `${apiData.companyName || apiData.symbol} (${apiData.symbol || 'N/A'})`;
        if (currentPriceSpan) currentPriceSpan.textContent = apiData.price !== undefined && apiData.price !== null ? apiData.price.toFixed(2) : 'N/A';
        if (dataDateSpan) dataDateSpan.textContent = 'API 제공 기준';

        if(apiEpsSpan) apiEpsSpan.textContent = apiData.eps !== undefined && apiData.eps !== null ? `$${apiData.eps.toFixed(2)}` : 'N/A (정보 없음)';
        if(apiBpsSpan) apiBpsSpan.textContent = apiData.bps !== undefined && apiData.bps !== null ? `$${apiData.bps.toFixed(2)}` : 'N/A (정보 없음)';
        if(apiDpsSpan) apiDpsSpan.textContent = apiData.dpsTTM !== undefined && apiData.dpsTTM !== null ? `$${apiData.dpsTTM.toFixed(2)}` : 'N/A (정보 없음)';
        if(apiPerSpan) apiPerSpan.textContent = apiData.peTTM !== undefined && apiData.peTTM !== null ? apiData.peTTM.toFixed(2) : 'N/A (정보 없음)';
        if(apiPbrSpan) apiPbrSpan.textContent = apiData.pbTTM !== undefined && apiData.pbTTM !== null ? apiData.pbTTM.toFixed(2) : 'N/A (정보 없음)';
        if(apiDividendYieldSpan) apiDividendYieldSpan.textContent = apiData.dividendYieldTTM !== undefined && apiData.dividendYieldTTM !== null ? (apiData.dividendYieldTTM * 100).toFixed(2) : 'N/A (정보 없음)';
        if(apiRoeSpan) apiRoeSpan.textContent = apiData.roeTTM !== undefined && apiData.roeTTM !== null ? (apiData.roeTTM * 100).toFixed(2) : 'N/A (정보 없음)';
        const betaForDisplay = (apiData.beta !== undefined && apiData.beta !== null) ? apiData.beta.toFixed(2) : '1.00 (가정)';
        if(apiBetaSpan) apiBetaSpan.textContent = betaForDisplay;
        if(dataBetaDisplaySpan) dataBetaDisplaySpan.textContent = betaForDisplay;
        if(apiPayoutRatioSpan) apiPayoutRatioSpan.textContent = apiData.payoutRatioTTM !== undefined && apiData.payoutRatioTTM !== null ? (apiData.payoutRatioTTM * 100).toFixed(2) : 'N/A (정보 없음)';

        if(inputPerLow) inputPerLow.value = 20; if(inputPerBase) inputPerBase.value = 25; if(inputPerHigh) inputPerHigh.value = 30;
        if(inputPbrLow) inputPbrLow.value = 3.0; if(inputPbrBase) inputPbrBase.value = 5.0; if(inputPbrHigh) inputPbrHigh.value = 8.0;
        if(inputRf) inputRf.value = 3.0; if(inputErp) inputErp.value = 5.0;
        updateKeInput(apiData.beta);

        let initialG; 
        const keForGCalc = inputKe ? (parseFloat(inputKe.value) / 100) : 0.08;
        if (apiData.roeTTM && apiData.payoutRatioTTM !== undefined && apiData.payoutRatioTTM !== null && apiData.payoutRatioTTM >= 0 && apiData.payoutRatioTTM <=1 && apiData.roeTTM > 0) {
            initialG = apiData.roeTTM * (1 - apiData.payoutRatioTTM);
        } else if (apiData.roeTTM && apiData.roeTTM > 0) {
            initialG = apiData.roeTTM * 0.5;
        } else {
            initialG = 0.05;
        }
        initialG = Math.min(initialG, keForGCalc * 0.85);
        initialG = Math.max(0.02, initialG);
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

}; // window.onload 끝 -> DOMContentLoaded로 변경
