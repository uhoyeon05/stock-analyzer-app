// script.js

function ensureBaseChartLibrariesReady(callback, attempt = 1) { // 함수 이름 변경 및 조건 단순화
    const MAX_ATTEMPTS = 25; // 재시도 횟수 줄임 (5초)
    const chartReady = typeof window.Chart !== 'undefined' && typeof window.Chart.register === 'function';
    const momentReady = typeof window.moment !== 'undefined';

    if (chartReady && momentReady) {
        console.log("Base libraries (Chart.js, Moment.js) are ready.");
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
            // 차트 컨테이너에 메시지 표시
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
            ensureBaseChartLibrariesReady(async () => { // 함수 이름 변경
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
                    if (!currentStockData.price || currentStockData.eps === undefined || currentStockData.bps === undefined || !currentStockData.historicalData || currentStockData.historicalData.length === 0) {
                         throw new Error(`핵심 재무 또는 과거 주가 데이터가 부족하여 분석할 수 없습니다. (티커: ${ticker})`);
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

    if (recalculateButton) {
        recalculateButton.addEventListener('click', () => {
            ensureBaseChartLibrariesReady(() => { // 함수 이름 변경
                if (!currentStockData) { showError('먼저 주식을 분석해주세요.'); return; }
                hideError();
                const userAssumptions = getUserAssumptions();
                const fairValuesResult = calculateFairValues(currentStockData, userAssumptions);
                createOrUpdatePriceChart(currentStockData.historicalData, fairValuesResult.final);
                updateModelDetailsDisplays(currentStockData, userAssumptions, fairValuesResult.modelOutputs);
            });
        });
    } else { console.error("Recalculate button not found."); }

    if (inputRf && inputErp) { /* ... 이전과 동일 ... */ }
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
        
        updateModelDetailsDisplays(apiData, userAssumptions, fairValuesResult.modelOutputs);
        if(fairValueSummaryP) fairValueSummaryP.textContent = `산출된 모델들의 기본 추정치 평균은 $${fairValuesResult.final.base.toFixed(2)} 입니다. (단, EPS/BPS 등 정보 부족 시 정확도 낮음)`;
        
        showResults(); 

        setTimeout(() => {
            createOrUpdatePriceChart(apiData.historicalData, fairValuesResult.final);
        }, 100); 
    }

    function getUserAssumptions() { /* ... 이전과 동일 ... */ }
    function calculateFairValues(apiData, assumptions) { /* ... 이전과 동일 ... */ }
    function updateModelDetailsDisplays(apiData, assumptions, modelOutputs) { /* ... 이전과 동일 ... */ }

    function createOrUpdatePriceChart(historicalData, fairValueResults) {
        const chartContainerEl = document.getElementById('price-chart-wrapper'); 
        const canvasEl = document.getElementById('price-chart-canvas');

        if (!chartContainerEl || !canvasEl) {
            console.error("CRITICAL: #price-chart-wrapper 또는 #price-chart-canvas HTML 요소를 찾을 수 없습니다!");
            return;
        }
        
        if (priceChartInstance) { 
            priceChartInstance.destroy();
            priceChartInstance = null;
        }

        if (!historicalData || historicalData.length === 0) {
            // (이하 데이터 없을 때 메시지 표시는 이전과 동일)
            return;
        }
        
        // ★★★ Annotation 플러그인 등록 시도 (Chart.js와 Annotation 객체가 모두 있을 때) ★★★
        let annotationPluginRegistered = false;
        if (typeof window.Chart !== 'undefined' && typeof window.Chart.register === 'function') {
            if (typeof window.ChartAnnotation !== 'undefined') {
                try { 
                    Chart.register(window.ChartAnnotation);
                    annotationPluginRegistered = true;
                    // console.log("ChartAnnotation (window.ChartAnnotation) registered in createOrUpdatePriceChart.");
                } catch(e) { console.error("Error registering window.ChartAnnotation:", e); }
            } else if (typeof window.Chart.Annotation !== 'undefined') { // 대문자 A 확인
                 try { 
                    Chart.register(window.Chart.Annotation);
                    annotationPluginRegistered = true;
                    // console.log("ChartAnnotation (Chart.Annotation) registered in createOrUpdatePriceChart.");
                 } catch(e) { console.error("Error registering Chart.Annotation:", e); }
            }
        }
        if (!annotationPluginRegistered) {
            console.warn("Annotation plugin could not be registered. Fair value lines will not be displayed.");
        }
        // ★★★ Annotation 플러그인 등록 시도 끝 ★★★


        const containerWidth = chartContainerEl.clientWidth;
        const containerHeight = chartContainerEl.clientHeight;

        if (containerWidth <= 0 || containerHeight <= 0) { /* ... 이전과 동일 ... */ return; }
        
        const labels = historicalData.map(d => d.time);
        const closePrices = historicalData.map(d => d.close);
        const volumes = historicalData.map(d => d.volume);

        const annotations = {};
        if (annotationPluginRegistered) { // 플러그인이 등록되었을 때만 annotation 설정
            if (fairValueResults.base > 0 && isFinite(fairValueResults.base)) {
                annotations['fairValueBaseLine'] = {
                    type: 'line', yMin: fairValueResults.base, yMax: fairValueResults.base,
                    borderColor: 'rgba(0, 123, 255, 0.8)', borderWidth: 2,
                    label: { content: `기본: $${fairValueResults.base.toFixed(2)}`, enabled: true, position: 'end', backgroundColor: 'rgba(0, 123, 255, 0.8)', color: 'white', font: { weight: 'bold' } }
                };
            }
            // ... (최저, 최고 적정주가선 annotation 추가 로직도 if (annotationPluginRegistered) 안에 두거나, 여기서 처리)
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
                    ...(annotationPluginRegistered && { annotation: { annotations: annotations } })
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
        if (!priceChartInstance || !priceChartInstance.options || !priceChartInstance.options.plugins || !priceChartInstance.options.plugins.annotation) {
            return;
        }
        const newAnnotations = {};
        // ... (annotation 객체 구성 로직은 이전과 동일) ...
        priceChartInstance.options.plugins.annotation.annotations = newAnnotations;
        priceChartInstance.update();
    }
    
    // --- 나머지 유틸리티 함수 (showLoading 등)는 이전과 동일 ---
    function showLoading(isLoading) { if(loadingIndicator) loadingIndicator.style.display = isLoading ? 'block' : 'none'; }
    function showError(message) { if(errorMessageDiv) {errorMessageDiv.textContent = message; errorMessageDiv.style.display = 'block';} }
    function hideError() { if(errorMessageDiv) errorMessageDiv.style.display = 'none'; }
    function showResults() { if(resultsArea) resultsArea.style.display = 'block'; }
    function hideResults() { if(resultsArea) resultsArea.style.display = 'none'; }

}; // window.onload 끝
