// script.js

// Chart.js 관련 라이브러리가 로드되었는지 확인하는 함수
function ensureChartJsIsReady(callback) {
    const chartReady = typeof window.Chart !== 'undefined' && typeof window.Chart.register === 'function';
    const momentReady = typeof window.moment !== 'undefined';
    // Annotation Plugin은 Chart.js에 등록된 후 Chart.plugins.get('annotation') 등으로 확인하거나,
    // 또는 특정 전역 객체 (예: Chart.Annotation)가 생기는지 확인해야 합니다.
    // Chart.js v3 이상 및 chartjs-plugin-annotation v1.x.x 버전에서는
    // 보통 Chart.register(ChartAnnotation) 후 Chart.plugins.get('annotation')으로 확인 가능하나,
    // 여기서는 ChartAnnotation 전역 객체의 존재 유무로 단순화 시도합니다.
    // 또는, Annotation 플러그인이 window.Chart.Annotation으로 등록될 수도 있습니다.
    const annotationReady = (typeof window.ChartAnnotation !== 'undefined') || (typeof window.Chart !== 'undefined' && typeof window.Chart.Annotation !== 'undefined');


    if (chartReady && momentReady && annotationReady) {
        console.log("All chart libraries (Chart.js, Moment.js, Annotation Plugin) are ready.");
        // Annotation 플러그인을 사용하기 전에 명시적으로 등록합니다.
        // Chart.js v3에서는 Chart.register()를 사용합니다.
        // window.ChartAnnotation이 Chart.js 플러그인 객체 그 자체일 것으로 가정합니다.
        // 또는 Chart.Annotation일 수도 있습니다.
        try {
            if (typeof window.ChartAnnotation !== 'undefined') {
                Chart.register(window.ChartAnnotation);
                console.log("ChartAnnotation (window.ChartAnnotation) registered.");
            } else if (typeof window.Chart !== 'undefined' && typeof window.Chart.Annotation !== 'undefined') {
                Chart.register(window.Chart.Annotation);
                console.log("ChartAnnotation (window.Chart.Annotation) registered.");
            } else {
                console.error("Could not find ChartAnnotation object to register.");
                // 이 경우 annotation 기능을 사용할 수 없으므로 사용자에게 알리거나,
                // annotation 없이 차트를 그리도록 처리해야 합니다.
                // 여기서는 일단 진행하고, annotation 옵션 부분에서 오류가 날 수 있습니다.
            }
        } catch (e) {
            console.error("Error registering ChartAnnotation plugin:", e);
        }
        callback();
    } else {
        console.warn(
            "Chart libraries not ready yet, retrying in 200ms. Status:",
            { chart: chartReady, moment: momentReady, annotation: annotationReady }
        );
        setTimeout(() => ensureChartJsIsReady(callback), 200);
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
            ensureChartJsIsReady(async () => { // ★★★ ensureChartJsIsReady 콜백 안으로 이동 ★★★
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
                } finally {
                    showLoading(false);
                }
            });
        });
    } else { console.error("Analyze button not found."); }

    if (recalculateButton) {
        recalculateButton.addEventListener('click', () => {
            ensureChartJsIsReady(() => { // ★★★ ensureChartJsIsReady 콜백 안으로 이동 ★★★
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
            if(canvasEl.getContext('2d')) { 
                const ctx = canvasEl.getContext('2d');
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                ctx.font = "16px Arial"; ctx.textAlign = "center";
                ctx.fillText("주가 차트 데이터를 가져올 수 없습니다.", canvasEl.width / 2, canvasEl.height / 2);
            }
            return;
        }
        
        // 라이브러리 로드 상태는 ensureChartJsIsReady에서 이미 확인했으므로, 여기서는 ChartAnnotation 등록에 집중
        try {
            // Annotation 플러그인이 Chart 객체에 속성으로 추가될 수도 있고, 전역일 수도 있습니다.
            // Chart.js v3+ 및 chartjs-plugin-annotation v1.x+ 에서는 보통 Chart.register() 사용
            if (typeof window.ChartAnnotation !== 'undefined') {
                Chart.register(window.ChartAnnotation);
            } else if (typeof Chart !== 'undefined' && typeof Chart.Annotation !== 'undefined') {
                 Chart.register(Chart.Annotation); // 대문자 A로 시도
            } else {
                console.warn("ChartAnnotation 플러그인을 찾거나 등록할 수 없습니다. 적정주가 선이 표시되지 않을 수 있습니다.");
            }
        } catch (e) {
            console.error("ChartAnnotation 플러그인 등록 중 오류:", e);
        }

        const containerWidth = chartContainerEl.clientWidth;
        const containerHeight = chartContainerEl.clientHeight;

        if (containerWidth <= 0 || containerHeight <= 0) {
            console.warn("차트 컨테이너(#price-chart-wrapper)의 크기가 유효하지 않습니다.");
             if(canvasEl.getContext('2d')) {
                const ctx = canvasEl.getContext('2d');
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                ctx.font = "14px Arial"; ctx.textAlign = "center";
                ctx.fillText('차트 영역 크기 오류 (CSS height: 400px; 확인)', canvasEl.width / 2, canvasEl.height / 2);
             }
            return;
        }
        
        const labels = historicalData.map(d => d.time);
        const closePrices = historicalData.map(d => d.close);
        const volumes = historicalData.map(d => d.volume);

        const annotations = {};
        // ... (annotations 객체 구성 로직은 이전과 동일)
        if (fairValueResults.base > 0 && isFinite(fairValueResults.base)) {
            annotations['fairValueBaseLine'] = {
                type: 'line', yMin: fairValueResults.base, yMax: fairValueResults.base,
                borderColor: 'rgba(0, 123, 255, 0.8)', borderWidth: 2,
                label: { content: `기본: $${fairValueResults.base.toFixed(2)}`, enabled: true, position: 'end', backgroundColor: 'rgba(0, 123, 255, 0.8)', color: 'white', font: { weight: 'bold' } }
            };
        }
        if (fairValueResults.low > 0 && isFinite(fairValueResults.low)) {
            annotations['fairValueLowLine'] = {
                type: 'line', yMin: fairValueResults.low, yMax: fairValueResults.low,
                borderColor: 'rgba(255, 120, 117, 0.7)', borderWidth: 1, borderDash: [6, 6],
                label: { content: `최저: $${fairValueResults.low.toFixed(2)}`, enabled: true, position: 'end', backgroundColor: 'rgba(255, 120, 117, 0.7)', color: 'white'}
            };
        }
        if (fairValueResults.high > 0 && isFinite(fairValueResults.high)) {
            annotations['fairValueHighLine'] = {
                type: 'line', yMin: fairValueResults.high, yMax: fairValueResults.high,
                borderColor: 'rgba(0, 180, 130, 0.7)', borderWidth: 1, borderDash: [6, 6],
                label: { content: `최고: $${fairValueResults.high.toFixed(2)}`, enabled: true, position: 'end', backgroundColor: 'rgba(0, 180, 130, 0.7)', color: 'white'}
            };
        }


        const data = {
            labels: labels,
            datasets: [
                {
                    type: 'line', label: '종가', data: closePrices,
                    borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    yAxisID: 'y-axis-price', tension: 0.1, pointRadius: 0
                },
                {
                    type: 'bar', label: '거래량', data: volumes,
                    backgroundColor: 'rgba(153, 102, 255, 0.4)', borderColor: 'rgb(153, 102, 255)',
                    yAxisID: 'y-axis-volume',
                }
            ]
        };

        const config = {
            data: data,
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false, },
                stacked: false,
                plugins: {
                    title: { display: true, text: '주가 및 거래량 (1년)' },
                    tooltip: { /* ... 이전과 동일 ... */ },
                    annotation: { annotations: annotations } 
                },
                scales: { /* ... 이전과 동일 ... */ }
            }
        };
        
        if (canvasEl) { // priceChartCanvas -> canvasEl
            try {
                priceChartInstance = new Chart(canvasEl, config);
            } catch (e) {
                console.error("new Chart() 호출 중 예외 발생:", e);
                if(canvasEl.getContext('2d')) {
                    const ctx = canvasEl.getContext('2d');
                    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height); 
                    ctx.font = "14px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText('차트 생성 실패 (new Chart 오류)', canvasEl.width / 2, canvasEl.height / 2);
                }
            }
        } else {
            console.error("priceChartCanvas is null, cannot create chart.");
        }
    }
    
    function updateFairValueLinesOnChart(fairValueResults) { /* ... 이전과 동일 ... */ }
    function showLoading(isLoading) { /* ... 이전과 동일 ... */ }
    function showError(message) { /* ... 이전과 동일 ... */ }
    function hideError() { /* ... 이전과 동일 ... */ }
    function showResults() { /* ... 이전과 동일 ... */ }
    function hideResults() { /* ... 이전과 동일 ... */ }

}; // window.onload 끝
