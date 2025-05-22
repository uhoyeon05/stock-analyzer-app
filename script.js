// script.js

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
            // ... (이하 오류 메시지 표시는 이전과 동일)
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
                    // EPS, BPS가 없어도 여기서 오류를 내지 않고 initializePageWithData로 전달
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
    
    function initializePageWithData(apiData) {
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
        const fairValuesResult = calculateFairValues(apiData, userAssumptions); // ★★★ 이 함수의 반환값을 항상 확인 ★★★
        
        // fairValuesResult와 그 하위 속성이 존재하는지 확인 후 사용
        if (fairValuesResult && fairValuesResult.modelOutputs && fairValuesResult.final) {
            updateModelDetailsDisplays(apiData, userAssumptions, fairValuesResult.modelOutputs);
            if(fairValueSummaryP) fairValueSummaryP.textContent = `산출된 모델들의 기본 추정치 평균은 $${fairValuesResult.final.base.toFixed(2)} 입니다. (단, EPS/BPS 등 정보 부족 시 정확도 낮음)`;
        } else {
            console.error("initializePageWithData: fairValuesResult 또는 그 하위 속성이 undefined입니다.", fairValuesResult);
            if(fairValueSummaryP) fairValueSummaryP.textContent = "적정주가 관련 상세 정보를 표시할 수 없습니다.";
            // 모델별 상세 정보도 초기화 또는 "계산 불가" 메시지 표시
            if(modelEpsPerSpan) modelEpsPerSpan.textContent = 'N/A';
            if(perValueRangeSpan) perValueRangeSpan.textContent = 'N/A';
            // ... (다른 모델 상세 정보도 유사하게 처리) ...
        }
        
        showResults(); 

        setTimeout(() => {
            // 차트 생성 시 fairValuesResult.final이 유효한지 다시 확인
            if (fairValuesResult && fairValuesResult.final) {
                createOrUpdatePriceChart(apiData.historicalData, fairValuesResult.final);
            } else {
                 const chartContainerEl = document.getElementById('price-chart-wrapper');
                 const canvasEl = document.getElementById('price-chart-canvas');
                 if (chartContainerEl && canvasEl && canvasEl.getContext('2d')) {
                    const ctx = canvasEl.getContext('2d');
                    ctx.clearRect(0,0, canvasEl.width, canvasEl.height);
                    ctx.font = "16px Arial"; ctx.textAlign = "center";
                    ctx.fillText("적정주가 데이터 부족으로 차트 선 표시 불가.", canvasEl.width/2, canvasEl.height/2);
                 }
            }
        }, 100); 
    }

    function getUserAssumptions() { /* ... 이전과 동일 ... */ }

    function calculateFairValues(apiData, assumptions) {
        const { perLow, perBase, perHigh, pbrLow, pbrBase, pbrHigh, ke, g } = assumptions;
        // ★★★ 함수 시작 시 반환할 객체 구조를 명확히 초기화 ★★★
        let modelOutputs = { 
            PER: {low:0, base:0, high:0, name: "PER (정보 없음)"}, 
            PBR: {low:0, base:0, high:0, name: "PBR (정보 없음)"}, 
            Intrinsic: {low:0, base:0, high:0, name: "내재가치 (계산 불가)", formula: ""} 
        };
        let finalResult = {low: 0, base: 0, high: 0}; // 최종 결과도 초기화

        // ... (이하 PER, PBR, Intrinsic 모델 계산 로직은 이전과 동일) ...
        if (apiData.eps !== undefined && apiData.eps !== null && apiData.eps > 0) {
            modelOutputs.PER = {low: apiData.eps * perLow, base: apiData.eps * perBase, high: apiData.eps * perHigh, name: "PER"};
        }
        if (apiData.bps !== undefined && apiData.bps !== null && apiData.bps > 0) {
            modelOutputs.PBR = {low: apiData.bps * pbrLow, base: apiData.bps * pbrBase, high: apiData.bps * pbrHigh, name: "PBR"};
        }
        
        if (g < ke && ke > 0) {
            let intrinsicBase = 0;
            if (apiData.dpsTTM !== undefined && apiData.dpsTTM !== null && apiData.dpsTTM > 0) {
                modelOutputs.Intrinsic.name = "DDM (배당할인)";
                intrinsicBase = (apiData.dpsTTM * (1 + g)) / (ke - g);
                modelOutputs.Intrinsic.formula = `DPS($${apiData.dpsTTM.toFixed(2)}) * (1 + ${(g*100).toFixed(1)}%) / (${(ke*100).toFixed(1)}% - ${(g*100).toFixed(1)}%)`;
            } else if (apiData.eps !== undefined && apiData.eps !== null && apiData.eps > 0) {
                modelOutputs.Intrinsic.name = "EPS 성장 모델";
                intrinsicBase = (apiData.eps * (1 + g)) / (ke - g);
                modelOutputs.Intrinsic.formula = `EPS($${apiData.eps.toFixed(2)}) * (1 + ${(g*100).toFixed(1)}%) / (${(ke*100).toFixed(1)}% - ${(g*100).toFixed(1)}%)`;
            } else {
                modelOutputs.Intrinsic.name = "내재가치 (DPS/EPS 정보 없음)";
            }

            if (intrinsicBase > 0 && isFinite(intrinsicBase)) {
                modelOutputs.Intrinsic.base = intrinsicBase;
                modelOutputs.Intrinsic.low = intrinsicBase * 0.8;
                modelOutputs.Intrinsic.high = intrinsicBase * 1.2;
            } else {
                 if (modelOutputs.Intrinsic.name === "DDM (배당할인)" || modelOutputs.Intrinsic.name === "EPS 성장 모델") {
                    modelOutputs.Intrinsic.name += " (산출값 유효X)";
                 }
            }
        }
        
        let fvLowSum = 0, fvBaseSum = 0, fvHighSum = 0, validModels = 0;
        [modelOutputs.PER, modelOutputs.PBR, modelOutputs.Intrinsic].forEach(fv => {
            if (fv.base > 0 && isFinite(fv.base)) {
                if (fv.name && !fv.name.includes("정보 없음") && !fv.name.includes("유효X") && !fv.name.includes("계산 불가")) {
                    fvLowSum += fv.low; fvBaseSum += fv.base; fvHighSum += fv.high;
                    validModels++;
                }
            }
        });

        if (validModels > 0) {
            finalResult = { // finalResult 객체에 값 할당
                low: fvLowSum / validModels,
                base: fvBaseSum / validModels,
                high: fvHighSum / validModels
            };
        } else {
            showError("모든 평가 모델 결과를 산출할 수 없습니다. 제공된 재무 데이터가 부족합니다.");
            // finalResult는 이미 {low: 0, base: 0, high: 0}으로 초기화되어 있음
        }
        return { final: finalResult, modelOutputs }; // ★★★ 항상 이 구조로 객체를 반환 ★★★
    }

    function updateModelDetailsDisplays(apiData, assumptions, modelOutputs) { /* ... 이전과 동일 ... */ }
    function createOrUpdatePriceChart(historicalData, fairValueResults) { /* ... 이전과 동일 ... */ }
    function updateFairValueLinesOnChart(fairValueResults) { /* ... 이전과 동일 ... */ }
    function showLoading(isLoading) { /* ... 이전과 동일 ... */ }
    function showError(message) { /* ... 이전과 동일 ... */ }
    function hideError() { /* ... 이전과 동일 ... */ }
    function showResults() { /* ... 이전과 동일 ... */ }
    function hideResults() { /* ... 이전과 동일 ... */ }

}; // window.onload 끝
