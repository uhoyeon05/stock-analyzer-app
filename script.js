// script.js

function ensureChartJsIsReady(callback) {
    if (typeof window.Chart !== 'undefined' && typeof window.moment !== 'undefined' && typeof Chart.register === 'function' && typeof window.ChartAnnotation !== 'undefined') {
        callback();
    } else {
        console.warn("Chart.js, Moment.js, or Annotation Plugin not ready yet, retrying in 200ms...");
        setTimeout(() => ensureChartJsIsReady(callback), 200);
    }
}

window.onload = () => {
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

    async function loadTickerData() { /* 이전과 동일 */ }
    loadTickerData();

    if (tickerInput && autocompleteList) { /* 이전과 동일 */ }
    function closeAllLists(elmnt) { /* 이전과 동일 */ }
    document.addEventListener('click', (e) => closeAllLists(e.target));

    if (analyzeButton) {
        analyzeButton.addEventListener('click', () => {
            ensureChartJsIsReady(async () => {
                const ticker = tickerInput.value.trim().toUpperCase();
                if (!ticker) { showError('티커를 입력해주세요.'); return; }
                showLoading(true); hideError(); hideResults();
                try {
                    const response = await fetch(`/.netlify/functions/fetchStockData?ticker=${ticker}`);
                    if (!response.ok) {
                        const errData = await response.json().catch(()=>({error: `HTTP 오류! 상태: ${response.status}`}));
                        throw new Error(errData.error || `HTTP 오류! 상태: ${response.status}`);
                    }
                    currentStockData = await response.json(); // Polygon.io API 응답으로 변경됨
                    if (currentStockData.error) throw new Error(currentStockData.error);
                    
                    // Polygon.io 응답에 price와 historicalData가 있는지 확인
                    if (currentStockData.price === undefined || currentStockData.price === null || 
                        !currentStockData.historicalData || currentStockData.historicalData.length === 0) {
                         throw new Error(`주가 또는 과거 주가 데이터가 부족하여 분석할 수 없습니다. (티커: ${ticker})`);
                    }
                    // EPS, BPS 등은 Polygon.io 무료에서 안 올 수 있으므로, 없어도 오류는 내지 않음.
                    // 다만, 이 값들이 없으면 적정주가 모델 계산이 제한됨.
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

    if (recalculateButton) { /* 이전과 동일하나, createOrUpdatePriceChart 호출은 유지 */
        recalculateButton.addEventListener('click', () => {
            ensureChartJsIsReady(() => {
                if (!currentStockData) { showError('먼저 주식을 분석해주세요.'); return; }
                hideError();
                const userAssumptions = getUserAssumptions();
                const fairValuesResult = calculateFairValues(currentStockData, userAssumptions);
                createOrUpdatePriceChart(currentStockData.historicalData, fairValuesResult.final);
                updateModelDetailsDisplays(currentStockData, userAssumptions, fairValuesResult.modelOutputs);
            });
        });
    }

    if (inputRf && inputErp) { /* 이전과 동일 */ }
    function updateKeInput(betaValue) { /* 이전과 동일 */ }
    
    function initializePageWithData(apiData) {
        if (stockNameTitle) stockNameTitle.textContent = `${apiData.companyName || apiData.symbol} (${apiData.symbol || 'N/A'})`;
        if (currentPriceSpan) currentPriceSpan.textContent = apiData.price !== undefined && apiData.price !== null ? apiData.price.toFixed(2) : 'N/A';
        if (dataDateSpan) dataDateSpan.textContent = 'API 제공 기준';

        // Polygon.io에서 직접 제공하지 않는 값들은 'N/A' 또는 기본값 처리
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

        // 사용자 입력 필드 초기화 (기본값 유지)
        if(inputPerLow) inputPerLow.value = 20; if(inputPerBase) inputPerBase.value = 25; if(inputPerHigh) inputPerHigh.value = 30;
        if(inputPbrLow) inputPbrLow.value = 3.0; if(inputPbrBase) inputPbrBase.value = 5.0; if(inputPbrHigh) inputPbrHigh.value = 8.0;
        if(inputRf) inputRf.value = 3.0; if(inputErp) inputErp.value = 5.0;
        updateKeInput(apiData.beta); // Beta가 null일 수 있으므로 updateKeInput에서 처리

        let initialG;
        const keForGCalc = inputKe ? (parseFloat(inputKe.value) / 100) : 0.08;
        // ROE가 null일 수 있으므로 체크
        if (apiData.roeTTM && apiData.payoutRatioTTM !== undefined && apiData.payoutRatioTTM !== null && apiData.payoutRatioTTM >= 0 && apiData.payoutRatioTTM <=1 && apiData.roeTTM > 0) {
            initialG = apiData.roeTTM * (1 - apiData.payoutRatioTTM);
        } else if (apiData.roeTTM && apiData.roeTTM > 0) {
            initialG = apiData.roeTTM * 0.5;
        } else {
            initialG = 0.05; // 기본 성장률 5%
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

    function getUserAssumptions() { /* 이전과 동일 */ }
    function calculateFairValues(apiData, assumptions) { // EPS, BPS가 null일 경우 모델 계산 안되도록 수정
        const { perLow, perBase, perHigh, pbrLow, pbrBase, pbrHigh, ke, g } = assumptions;
        let modelOutputs = { PER: {low:0, base:0, high:0}, PBR: {low:0, base:0, high:0}, Intrinsic: {low:0, base:0, high:0, name: "내재가치 (계산 불가)", formula: ""} };

        if (apiData.eps !== undefined && apiData.eps !== null && apiData.eps > 0) {
            modelOutputs.PER = {low: apiData.eps * perLow, base: apiData.eps * perBase, high: apiData.eps * perHigh};
        } else {
            modelOutputs.PER.name = "PER (EPS 정보 없음)";
        }
        if (apiData.bps !== undefined && apiData.bps !== null && apiData.bps > 0) {
            modelOutputs.PBR = {low: apiData.bps * pbrLow, base: apiData.bps * pbrBase, high: apiData.bps * pbrHigh};
        } else {
            modelOutputs.PBR.name = "PBR (BPS 정보 없음)";
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
                fvLowSum += fv.low; fvBaseSum += fv.base; fvHighSum += fv.high;
                validModels++;
            }
        });

        let finalFvLow = 0, finalFvBase = 0, finalFvHigh = 0;
        if (validModels > 0) {
            finalFvLow = fvLowSum / validModels;
            finalFvBase = fvBaseSum / validModels;
            finalFvHigh = fvHighSum / validModels;
        } else {
            showError("모든 평가 모델 결과를 산출할 수 없습니다. 제공된 재무 데이터가 부족합니다.");
        }
        return { final: {low: finalFvLow, base: finalFvBase, high: finalFvHigh}, modelOutputs };
    }

    function updateModelDetailsDisplays(apiData, assumptions, modelOutputs) { /* 이전과 동일 */ }
    function createOrUpdatePriceChart(historicalData, fairValueResults) { /* 이전과 동일 */ }
    function updateFairValueLinesOnChart(fairValueResults) { /* 이전과 동일 */ }
    function showLoading(isLoading) { /* 이전과 동일 */ }
    function showError(message) { /* 이전과 동일 */ }
    function hideError() { /* 이전과 동일 */ }
    function showResults() { /* 이전과 동일 */ }
    function hideResults() { /* 이전과 동일 */ }

}; // window.onload 끝
