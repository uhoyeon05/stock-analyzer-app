// script.js

function ensureChartJsIsReady(callback, attempt = 1) {
    const MAX_ATTEMPTS = 50; // 최대 50번 시도 (50 * 200ms = 10초)
    const chartReady = typeof window.Chart !== 'undefined' && typeof window.Chart.register === 'function';
    const momentReady = typeof window.moment !== 'undefined';
    const annotationReady = typeof window.ChartAnnotation !== 'undefined' || (typeof window.Chart !== 'undefined' && typeof window.Chart.Annotation !== 'undefined') ;

    if (chartReady && momentReady && annotationReady) {
        console.log("All chart libraries (Chart.js, Moment.js, Annotation Plugin) are ready.");
        try {
            if (typeof window.ChartAnnotation !== 'undefined') {
                Chart.register(window.ChartAnnotation);
                // console.log("ChartAnnotation (window.ChartAnnotation) registered.");
            } else if (typeof window.Chart !== 'undefined' && typeof window.Chart.Annotation !== 'undefined') {
                Chart.register(window.Chart.Annotation);
                // console.log("ChartAnnotation (window.Chart.Annotation) registered.");
            } else {
                console.warn("Could not find ChartAnnotation object to register. Annotation lines might not be displayed.");
            }
        } catch (e) {
            console.error("Error registering ChartAnnotation plugin:", e);
        }
        callback();
    } else {
        if (attempt <= MAX_ATTEMPTS) {
            console.warn(
                `Chart libraries not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in 200ms. Status:`,
                { chart: chartReady, moment: momentReady, annotation: annotationReady }
            );
            setTimeout(() => ensureChartJsIsReady(callback, attempt + 1), 200);
        } else {
            console.error("Failed to load chart libraries after multiple attempts. Aborting chart initialization.");
            const errDiv = document.getElementById('error-message');
            if (errDiv) {
                errDiv.textContent = '차트 라이브러리 로드에 실패했습니다. 페이지를 새로고침하거나 인터넷 연결을 확인해주세요.';
                errDiv.style.display = 'block';
            }
            // 차트 생성 시도 함수에서 이 상태를 확인하고 사용자에게 메시지를 보여줄 수 있도록 처리 필요.
            // 또는 여기서 바로 특정 UI 업데이트
            const priceChartContainer = document.getElementById('price-chart-wrapper');
            if (priceChartContainer) {
                const canvasEl = document.getElementById('price-chart-canvas');
                if(canvasEl && canvasEl.getContext('2d')) {
                    const ctx = canvasEl.getContext('2d');
                    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                    ctx.font = "14px Arial"; ctx.textAlign = "center";
                    ctx.fillText('차트 라이브러리 로드 실패.', canvasEl.width / 2, canvasEl.height / 2);
                } else if (priceChartContainer.firstChild) {
                     priceChartContainer.firstChild.textContent = '차트 라이브러리 로드 실패.';
                } else {
                     priceChartContainer.textContent = '차트 라이브러리 로드 실패.';
                }
            }
        }
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

    async function loadTickerData() {
        try {
            const response = await fetch('tickers.json');
            if (!response.ok) throw new Error(`Ticker list fetch failed: ${response.status}`);
            tickerDataStore = await response.json();
        } catch (error) { console.error("Error loading ticker data:", error); }
    }
    loadTickerData();

    if (tickerInput && autocompleteList) {
        tickerInput.addEventListener('input', function(e) {
            const val = this.value;
            autocompleteList.innerHTML = '';
            if (!val || val.length < 1) { autocompleteList.style.display = 'none'; return false; }
            let count = 0;
            tickerDataStore.forEach(item => {
                const pureSymbol = item.symbol.split('.')[0];
                const searchText = val.toUpperCase();
                const itemName = item.name.toUpperCase();
                const itemSymbol = pureSymbol.toUpperCase();
                if (((itemName && itemName.includes(searchText)) || (itemSymbol && itemSymbol.includes(searchText))) && count < 7) {
                    const suggestionDiv = document.createElement("DIV");
                    const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(escapedVal, 'gi');
                    const displayNameHTML = item.name.replace(regex, (match) => `<u>${match}</u>`);
                    const displaySymbolHTML = item.symbol.replace(regex, (match) => `<u>${match}</u>`);
                    suggestionDiv.innerHTML = `<strong>${displayNameHTML}</strong> (${displaySymbolHTML})`;
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
    } else { console.error("Ticker input or autocomplete list element not found."); }

    function closeAllLists(elmnt) {
        if (autocompleteList && elmnt !== tickerInput && (!elmnt || !autocompleteList.contains(elmnt))) {
            autocompleteList.innerHTML = '';
            autocompleteList.style.display = 'none';
        }
    }
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
            ensureChartJsIsReady(() => {
                if (!currentStockData) { showError('먼저 주식을 분석해주세요.'); return; }
                hideError();
                const userAssumptions = getUserAssumptions();
                const fairValuesResult = calculateFairValues(currentStockData, userAssumptions);
                createOrUpdatePriceChart(currentStockData.historicalData, fairValuesResult.final);
                updateModelDetailsDisplays(currentStockData, userAssumptions, fairValuesResult.modelOutputs);
            });
        });
    } else { console.error("Recalculate button not found."); }

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
    
    function updateKeInput(betaValue) {
        if (!inputRf || !inputErp || !inputKe) return;
        const rf = parseFloat(inputRf.value) || 0;
        const erp = parseFloat(inputErp.value) || 0;
        const beta = (betaValue !== undefined && betaValue !== null) ? parseFloat(betaValue) : 1.0;
        const calculatedKe = rf + beta * erp;
        inputKe.value = calculatedKe.toFixed(1);
    }
    
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
        const fairValuesResult = calculateFairValues(apiData, userAssumptions);
        
        updateModelDetailsDisplays(apiData, userAssumptions, fairValuesResult.modelOutputs);
        if(fairValueSummaryP) fairValueSummaryP.textContent = `산출된 모델들의 기본 추정치 평균은 $${fairValuesResult.final.base.toFixed(2)} 입니다. (단, EPS/BPS 등 정보 부족 시 정확도 낮음)`;
        
        showResults(); 

        setTimeout(() => {
            createOrUpdatePriceChart(apiData.historicalData, fairValuesResult.final);
        }, 100); 
    }

    function getUserAssumptions() {
        const keValue = inputKe ? parseFloat(inputKe.value) : NaN;
        const gValue = inputG ? parseFloat(inputG.value) : NaN;
        return {
            perLow: inputPerLow ? parseFloat(inputPerLow.value) || 10 : 10,
            perBase: inputPerBase ? parseFloat(inputPerBase.value) || 15 : 15,
            perHigh: inputPerHigh ? parseFloat(inputPerHigh.value) || 20 : 20,
            pbrLow: inputPbrLow ? parseFloat(inputPbrLow.value) || 1.0 : 1.0,
            pbrBase: inputPbrBase ? parseFloat(inputPbrBase.value) || 1.5 : 1.5,
            pbrHigh: inputPbrHigh ? parseFloat(inputPbrHigh.value) || 2.0 : 2.0,
            ke: !isNaN(keValue) ? keValue / 100 : 0.08,
            g: !isNaN(gValue) ? gValue / 100 : 0.03,
        };
    }

    function calculateFairValues(apiData, assumptions) {
        const { perLow, perBase, perHigh, pbrLow, pbrBase, pbrHigh, ke, g } = assumptions;
        let modelOutputs = { PER: {low:0, base:0, high:0, name: "PER"}, PBR: {low:0, base:0, high:0, name: "PBR"}, Intrinsic: {low:0, base:0, high:0, name: "내재가치 (계산 불가)", formula: ""} };

        if (apiData.eps !== undefined && apiData.eps !== null && apiData.eps > 0) {
            modelOutputs.PER = {low: apiData.eps * perLow, base: apiData.eps * perBase, high: apiData.eps * perHigh, name: "PER"};
        } else {
            modelOutputs.PER.name = "PER (EPS 정보 없음)";
        }
        if (apiData.bps !== undefined && apiData.bps !== null && apiData.bps > 0) {
            modelOutputs.PBR = {low: apiData.bps * pbrLow, base: apiData.bps * pbrBase, high: apiData.bps * pbrHigh, name: "PBR"};
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
            if (fv.base > 0 && isFinite(fv.base)) { // 모델 이름에 "정보 없음" 또는 "유효X"가 없는 경우만 포함 고려 가능
                if (!fv.name.includes("정보 없음") && !fv.name.includes("유효X")) {
                    fvLowSum += fv.low; fvBaseSum += fv.base; fvHighSum += fv.high;
                    validModels++;
                }
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

    function updateModelDetailsDisplays(apiData, assumptions, modelOutputs) {
        const { ke, g } = assumptions; 

        if(modelEpsPerSpan) modelEpsPerSpan.textContent = apiData.eps !== undefined && apiData.eps !== null ? `$${apiData.eps.toFixed(2)}` : 'N/A';
        if(perValueRangeSpan) perValueRangeSpan.textContent = modelOutputs.PER.name.includes("정보 없음") ? modelOutputs.PER.name : `$${modelOutputs.PER.low.toFixed(2)} / $${modelOutputs.PER.base.toFixed(2)} / $${modelOutputs.PER.high.toFixed(2)}`;
        
        if(modelBpsPbrSpan) modelBpsPbrSpan.textContent = apiData.bps !== undefined && apiData.bps !== null ? `$${apiData.bps.toFixed(2)}` : 'N/A';
        if(pbrValueRangeSpan) pbrValueRangeSpan.textContent = modelOutputs.PBR.name.includes("정보 없음") ? modelOutputs.PBR.name : `$${modelOutputs.PBR.low.toFixed(2)} / $${modelOutputs.PBR.base.toFixed(2)} / $${modelOutputs.PBR.high.toFixed(2)}`;
        
        if(intrinsicModelNameTitleSpan) intrinsicModelNameTitleSpan.textContent = modelOutputs.Intrinsic.name + ":";
        if(intrinsicFormulaDisplaySpan) intrinsicFormulaDisplaySpan.textContent = modelOutputs.Intrinsic.formula || "N/A";
        if(intrinsicValueRangeSpan) intrinsicValueRangeSpan.textContent = modelOutputs.Intrinsic.name.includes("정보 없음") || modelOutputs.Intrinsic.name.includes("유효X") || modelOutputs.Intrinsic.name.includes("계산 불가") ? "N/A" : `$${modelOutputs.Intrinsic.low.toFixed(2)} / $${modelOutputs.Intrinsic.base.toFixed(2)} / $${modelOutputs.Intrinsic.high.toFixed(2)}`;

        if(intrinsicModelDescriptionDiv) {
            let desc = "";
            if (modelOutputs.Intrinsic.name.includes("DDM")) {
                desc = "배당할인모형(DDM)은 기업이 미래에 지급할 것으로 예상되는 배당금들을 현재가치로 할인하여 기업의 내재가치를 평가하는 방법입니다. 안정적으로 배당을 지급하는 성숙 기업에 비교적 적합합니다.";
            } else if (modelOutputs.Intrinsic.name.includes("EPS 성장")) {
                desc = "EPS 성장 모델은 기업의 미래 주당순이익(EPS) 성장을 바탕으로 현재가치를 평가하는 방법입니다. 꾸준히 이익이 성장하는 기업 또는 배당을 지급하지 않는 성장주 평가에 참고할 수 있습니다.";
            } else {
                desc = "내재가치 모델을 계산하기 위한 조건(예: 성장률 < 요구수익률)이 충족되지 않았거나, 유효한 산출값이 나오지 않았습니다.";
            }
            desc += `<br>주요 가정인 요구수익률(Ke)은 ${ (ke * 100).toFixed(1) }% (투자자가 기대하는 최소 수익률), 성장률(g)은 ${ (g * 100).toFixed(1) }% (미래 이익/배당의 연평균 성장 예상치)로 설정되었습니다. 이 값들의 작은 변화에도 평가 결과가 크게 달라질 수 있습니다.`;
            intrinsicModelDescriptionDiv.innerHTML = desc;
        }
    }

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
        
        const chartReady = typeof window.Chart !== 'undefined' && typeof window.Chart.register === 'function';
        const momentReady = typeof window.moment !== 'undefined';
        const annotationReady = typeof window.ChartAnnotation !== 'undefined' || (typeof window.Chart !== 'undefined' && typeof window.Chart.Annotation !== 'undefined');

        if (!chartReady || !momentReady || !annotationReady) {
             console.error('createOrUpdatePriceChart: Chart.js 관련 라이브러리가 아직 준비되지 않았습니다 (내부 확인).');
             if(canvasEl.getContext('2d')) {
                const ctx = canvasEl.getContext('2d');
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                ctx.font = "14px Arial"; ctx.textAlign = "center";
                ctx.fillText('차트 라이브러리 문제 (createOrUpdate)', canvasEl.width / 2, canvasEl.height / 2);
             }
             return;
        }
        
        try {
            if (typeof window.ChartAnnotation !== 'undefined') Chart.register(window.ChartAnnotation);
            else if (typeof window.Chart !== 'undefined' && typeof window.Chart.Annotation !== 'undefined') Chart.register(window.Chart.Annotation);
        } catch (e) { console.error("ChartAnnotation 플러그인 등록 중 오류:", e); }

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
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    if (context.dataset.yAxisID === 'y-axis-price') {
                                        label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                    } else {
                                         label += new Intl.NumberFormat('en-US').format(context.parsed.y);
                                    }
                                }
                                return label;
                            }
                        }
                    },
                    annotation: { annotations: annotations } 
                },
                scales: {
                    x: {
                        type: 'time',
                        adapters: { date: { locale: 'en-US' } }, 
                        time: { unit: 'month', tooltipFormat: 'YYYY-MM-DD', displayFormats: { day: 'MM/DD', month: 'YYYY MMM'} },
                        title: { display: true, text: '날짜' }
                    },
                    'y-axis-price': {
                        type: 'linear', display: true, position: 'left',
                        title: { display: true, text: '주가 ($)' },
                        ticks: { callback: function(value) { return '$' + value.toFixed(0); } }
                    },
                    'y-axis-volume': {
                        type: 'linear', display: true, position: 'right',
                        title: { display: true, text: '거래량' },
                        grid: { drawOnChartArea: false, },
                        ticks: { callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                            return value;
                        }}
                    }
                }
            }
        };
        
        if (canvasEl) {
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
    
    function updateFairValueLinesOnChart(fairValueResults) {
        if (!priceChartInstance || !priceChartInstance.options || !priceChartInstance.options.plugins || !priceChartInstance.options.plugins.annotation) {
            return;
        }
        const newAnnotations = {};
         if (fairValueResults.base > 0 && isFinite(fairValueResults.base)) {
            newAnnotations['fairValueBaseLine'] = {
                type: 'line', yMin: fairValueResults.base, yMax: fairValueResults.base,
                borderColor: 'rgba(0, 123, 255, 0.8)', borderWidth: 2,
                label: { content: `기본: $${fairValueResults.base.toFixed(2)}`, enabled: true, position: 'end', backgroundColor: 'rgba(0, 123, 255, 0.8)', color: 'white', font: { weight: 'bold' } }
            };
        }
        if (fairValueResults.low > 0 && isFinite(fairValueResults.low)) {
            newAnnotations['fairValueLowLine'] = {
                type: 'line', yMin: fairValueResults.low, yMax: fairValueResults.low,
                borderColor: 'rgba(255, 120, 117, 0.7)', borderWidth: 1, borderDash: [6, 6],
                label: { content: `최저: $${fairValueResults.low.toFixed(2)}`, enabled: true, position: 'end', backgroundColor: 'rgba(255, 120, 117, 0.7)', color: 'white'}
            };
        }
        if (fairValueResults.high > 0 && isFinite(fairValueResults.high)) {
            newAnnotations['fairValueHighLine'] = {
                type: 'line', yMin: fairValueResults.high, yMax: fairValueResults.high,
                borderColor: 'rgba(0, 180, 130, 0.7)', borderWidth: 1, borderDash: [6, 6],
                label: { content: `최고: $${fairValueResults.high.toFixed(2)}`, enabled: true, position: 'end', backgroundColor: 'rgba(0, 180, 130, 0.7)', color: 'white'}
            };
        }
        priceChartInstance.options.plugins.annotation.annotations = newAnnotations;
        priceChartInstance.update();
    }
    
    function showLoading(isLoading) { if(loadingIndicator) loadingIndicator.style.display = isLoading ? 'block' : 'none'; }
    function showError(message) { if(errorMessageDiv) {errorMessageDiv.textContent = message; errorMessageDiv.style.display = 'block';} }
    function hideError() { if(errorMessageDiv) errorMessageDiv.style.display = 'none'; }
    function showResults() { if(resultsArea) resultsArea.style.display = 'block'; }
    function hideResults() { if(resultsArea) resultsArea.style.display = 'none'; }

}; // window.onload 끝
