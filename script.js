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
                    initializePageWithData(currentStockData); // ★★★ 이 함수 내부에서 오류 발생 ★★★
                } catch (error) {
                    console.error("분석 오류:", error.message, error.stack); // 스택 트레이스 포함
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
        // ... (나머지 API 데이터 표시 부분은 이전과 동일)
        if(apiPayoutRatioSpan) apiPayoutRatioSpan.textContent = apiData.payoutRatioTTM !== undefined && apiData.payoutRatioTTM !== null ? (apiData.payoutRatioTTM * 100).toFixed(2) : 'N/A (정보 없음)';


        if(inputPerLow) inputPerLow.value = 20; if(inputPerBase) inputPerBase.value = 25; if(inputPerHigh) inputPerHigh.value = 30;
        // ... (나머지 input 필드 초기화 부분은 이전과 동일) ...
        updateKeInput(apiData.beta);

        let initialG; // 선언 위치 확인
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

        const userAssumptions = getUserAssumptions(); // ★★★ 이 함수가 객체를 반환하는지 확인 ★★★
        // console.log("User Assumptions for calc:", userAssumptions); // 디버깅 로그 추가

        const fairValuesResult = calculateFairValues(apiData, userAssumptions);
        // console.log("Fair Values Result:", fairValuesResult); // 디버깅 로그 추가
        
        if (fairValuesResult && fairValuesResult.modelOutputs && fairValuesResult.final) {
            updateModelDetailsDisplays(apiData, userAssumptions, fairValuesResult.modelOutputs); // 여기가 184번째 줄 근처
            if(fairValueSummaryP) fairValueSummaryP.textContent = `산출된 모델들의 기본 추정치 평균은 $${fairValuesResult.final.base.toFixed(2)} 입니다. (단, EPS/BPS 등 정보 부족 시 정확도 낮음)`;
        } else {
            console.error("initializePageWithData: fairValuesResult 또는 그 하위 속성이 undefined입니다.", fairValuesResult);
            if(fairValueSummaryP) fairValueSummaryP.textContent = "적정주가 관련 상세 정보를 표시할 수 없습니다.";
            // 모델별 상세 정보도 초기화
            if(modelEpsPerSpan) modelEpsPerSpan.textContent = 'N/A';
            if(perValueRangeSpan) perValueRangeSpan.textContent = 'N/A';
            if(modelBpsPbrSpan) modelBpsPbrSpan.textContent = 'N/A';
            if(pbrValueRangeSpan) pbrValueRangeSpan.textContent = 'N/A';
            if(intrinsicModelNameTitleSpan) intrinsicModelNameTitleSpan.textContent = '내재가치 모델 (오류)';
            if(intrinsicFormulaDisplaySpan) intrinsicFormulaDisplaySpan.textContent = 'N/A';
            if(intrinsicValueRangeSpan) intrinsicValueRangeSpan.textContent = 'N/A';
            if(intrinsicModelDescriptionDiv) intrinsicModelDescriptionDiv.innerHTML = '데이터 오류로 상세 설명을 표시할 수 없습니다.';
        }
        
        showResults(); 

        setTimeout(() => {
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

    function getUserAssumptions() {
        // ★★★ 함수 시작 시점에 모든 input 요소들이 존재하는지 확인 ★★★
        if (!inputPerLow || !inputPerBase || !inputPerHigh || 
            !inputPbrLow || !inputPbrBase || !inputPbrHigh ||
            !inputRf || !inputErp || !inputKe || !inputG) {
            console.error("getUserAssumptions: 하나 이상의 가정치 입력 필드를 찾을 수 없습니다.");
            // 모든 필드가 없으면 기본 가정치 객체라도 반환하거나, 오류 처리
            return { perLow: 10, perBase: 15, perHigh: 20, pbrLow: 1.0, pbrBase: 1.5, pbrHigh: 2.0, ke: 0.08, g: 0.03 };
        }

        const keValue = parseFloat(inputKe.value);
        const gValue = parseFloat(inputG.value);
        return {
            perLow: parseFloat(inputPerLow.value) || 10,
            perBase: parseFloat(inputPerBase.value) || 15,
            perHigh: parseFloat(inputPerHigh.value) || 20,
            pbrLow: parseFloat(inputPbrLow.value) || 1.0,
            pbrBase: parseFloat(inputPbrBase.value) || 1.5,
            pbrHigh: parseFloat(inputPbrHigh.value) || 2.0,
            // Rf, Erp는 Ke 계산에만 직접 쓰이고, Ke를 직접 사용하므로 여기서 Ke를 가져옴
            ke: !isNaN(keValue) ? keValue / 100 : 0.08,
            g: !isNaN(gValue) ? gValue / 100 : 0.03,
        };
    }

    function calculateFairValues(apiData, assumptions) { // ★★★ assumptions가 undefined인지 여기서도 확인 ★★★
        if (!assumptions) {
            console.error("calculateFairValues: assumptions 객체가 undefined입니다.");
            // 기본 반환 구조라도 제공하여 추가 오류 방지
            return { 
                final: {low: 0, base: 0, high: 0}, 
                modelOutputs: { 
                    PER: {low:0, base:0, high:0, name: "PER (가정치 오류)"}, 
                    PBR: {low:0, base:0, high:0, name: "PBR (가정치 오류)"}, 
                    Intrinsic: {low:0, base:0, high:0, name: "내재가치 (가정치 오류)", formula: ""} 
                } 
            };
        }

        const { perLow, perBase, perHigh, pbrLow, pbrBase, pbrHigh, ke, g } = assumptions;
        let modelOutputs = { 
            PER: {low:0, base:0, high:0, name: "PER (정보 없음)"}, 
            PBR: {low:0, base:0, high:0, name: "PBR (정보 없음)"}, 
            Intrinsic: {low:0, base:0, high:0, name: "내재가치 (계산 불가)", formula: ""} 
        };
        let finalResult = {low: 0, base: 0, high: 0};

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
            finalResult = {
                low: fvLowSum / validModels,
                base: fvBaseSum / validModels,
                high: fvHighSum / validModels
            };
        } else {
            showError("모든 평가 모델 결과를 산출할 수 없습니다. 제공된 재무 데이터가 부족합니다.");
        }
        return { final: finalResult, modelOutputs };
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
