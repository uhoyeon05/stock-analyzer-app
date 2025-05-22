// script.js

// ★★★ Chart.js와 Moment.js만 확인하도록 단순화 ★★★
function ensureBaseChartLibrariesReady(callback, attempt = 1) {
    const MAX_ATTEMPTS = 25; 
    const chartReady = typeof window.Chart !== 'undefined' && typeof window.Chart.register === 'function';
    const momentReady = typeof window.moment !== 'undefined';

    if (chartReady && momentReady) {
        console.log("Base libraries (Chart.js, Moment.js) are ready.");
        callback(); // Chart.js와 Moment.js만 준비되면 바로 콜백 실행
    } else {
        if (attempt <= MAX_ATTEMPTS) {
            console.warn(
                `Base chart libraries not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in 200ms. Status:`,
                { chart: chartReady, moment: momentReady }
            );
            setTimeout(() => ensureBaseChartLibrariesReady(callback, attempt + 1), 200);
        } else {
            console.error("Failed to load Chart.js or Moment.js after multiple attempts. Aborting further operations.");
            const errDiv = document.getElementById('error-message');
            if (errDiv) {
                errDiv.textContent = '차트 기본 라이브러리 로드에 실패했습니다. 페이지를 새로고침하거나 인터넷 연결을 확인해주세요.';
                errDiv.style.display = 'block';
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

    async function loadTickerData() { /* ... 이전과 동일 ... */ }
    loadTickerData();

    if (tickerInput && autocompleteList) { /* ... 이전과 동일 ... */ }
    function closeAllLists(elmnt) { /* ... 이전과 동일 ... */ }
    document.addEventListener('click', (e) => closeAllLists(e.target));

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

        let initialG; 
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

    function createOrUpdatePriceChart(historicalData, fairValueResults) {
        const chartContainerEl = document.getElementById('price-chart-wrapper'); 
        const canvasEl = document.getElementById('price-chart-canvas');

        if (!chartContainerEl || !canvasEl) { /* ... 이전과 동일 ... */ return; }
        if (priceChartInstance) { priceChartInstance.destroy(); priceChartInstance = null; }
        if (!historicalData || historicalData.length === 0) { /* ... 이전과 동일 ... */ return; }
        
        // ★★★ Annotation 플러그인 등록은 여기서, Chart.js가 확실히 준비된 후 시도 ★★★
        let annotationPluginRegistered = false;
        if (typeof window.Chart !== 'undefined' && typeof window.Chart.register === 'function') {
            if (typeof window.ChartAnnotation !== 'undefined') {
                try { 
                    Chart.register(window.ChartAnnotation);
                    annotationPluginRegistered = true;
                    console.log("ChartAnnotation (window.ChartAnnotation) registered in createOrUpdatePriceChart.");
                } catch(e) { console.error("Error registering window.ChartAnnotation in createOrUpdatePriceChart:", e); }
            } else if (typeof window.Chart.Annotation !== 'undefined') {
                 try { 
                    Chart.register(window.Chart.Annotation);
                    annotationPluginRegistered = true;
                    console.log("ChartAnnotation (Chart.Annotation) registered in createOrUpdatePriceChart.");
                 } catch(e) { console.error("Error registering Chart.Annotation in createOrUpdatePriceChart:", e); }
            } else {
                console.warn("ChartAnnotation plugin object not found. Fair value lines might not be displayed.");
            }
        } else {
             console.error('createOrUpdatePriceChart: Chart.js (Chart.register) is not available for annotation.');
             if(canvasEl.getContext('2d')) { /* ... 오류 메시지 표시 ... */ }
             return;
        }

        const containerWidth = chartContainerEl.clientWidth;
        const containerHeight = chartContainerEl.clientHeight;
        if (containerWidth <= 0 || containerHeight <= 0) { /* ... 이전과 동일 ... */ return; }
        
        const labels = historicalData.map(d => d.time);
        const closePrices = historicalData.map(d => d.close);
        const volumes = historicalData.map(d => d.volume);

        const annotations = {};
        if (annotationPluginRegistered) { // 플러그인이 성공적으로 등록되었을 때만 annotation 객체 구성
            if (fairValueResults.base > 0 && isFinite(fairValueResults.base)) {
                annotations['fairValueBaseLine'] = { /* ... 이전과 동일 ... */ };
            }
            if (fairValueResults.low > 0 && isFinite(fairValueResults.low)) {
                annotations['fairValueLowLine'] = { /* ... 이전과 동일 ... */ };
            }
            if (fairValueResults.high > 0 && isFinite(fairValueResults.high)) {
                annotations['fairValueHighLine'] = { /* ... 이전과 동일 ... */ };
            }
        }

        const data = { /* ... 이전과 동일 ... */ };
        const config = { 
            data: data,
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false, },
                stacked: false,
                plugins: {
                    title: { display: true, text: '주가 및 거래량 (1년)' },
                    tooltip: { /* ... 이전과 동일 ... */ },
                    // annotation 옵션은 annotationPluginRegistered 상태에 따라 조건부로 추가
                    ...(annotationPluginRegistered && Object.keys(annotations).length > 0 && { annotation: { annotations: annotations } })
                },
                scales: { /* ... 이전과 동일 ... */ }
            }
        };
        
        if (canvasEl) {
            try {
                priceChartInstance = new Chart(canvasEl, config);
            } catch (e) { /* ... 이전과 동일 ... */ }
        } else {
            console.error("priceChartCanvas is null, cannot create chart.");
        }
    }
    
    function updateFairValueLinesOnChart(fairValueResults) {
        if (!priceChartInstance || !priceChartInstance.options || !priceChartInstance.options.plugins) { // annotation 존재 여부 체크 단순화
            return;
        }
        // Annotation 플러그인이 등록되어 있고, annotation 옵션 객체가 존재할 때만 업데이트 시도
        if (priceChartInstance.options.plugins.annotation) {
            const newAnnotations = {};
            if (fairValueResults.base > 0 && isFinite(fairValueResults.base)) {
                newAnnotations['fairValueBaseLine'] = { /* ... 이전과 동일 ... */ };
            }
            // ... (최저, 최고 annotation 구성) ...
            priceChartInstance.options.plugins.annotation.annotations = newAnnotations;
            priceChartInstance.update();
        }
    }
    
    // --- 나머지 유틸리티 함수 (showLoading 등)는 이전과 동일 ---
    function showLoading(isLoading) { if(loadingIndicator) loadingIndicator.style.display = isLoading ? 'block' : 'none'; }
    function showError(message) { if(errorMessageDiv) {errorMessageDiv.textContent = message; errorMessageDiv.style.display = 'block';} }
    function hideError() { if(errorMessageDiv) errorMessageDiv.style.display = 'none'; }
    function showResults() { if(resultsArea) resultsArea.style.display = 'block'; }
    function hideResults() { if(resultsArea) resultsArea.style.display = 'none'; }

}; // window.onload 끝
