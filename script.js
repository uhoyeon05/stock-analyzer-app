// script.js
document.addEventListener('DOMContentLoaded', () => {
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

    const priceChartContainer = document.getElementById('price-chart-container');
    let priceChart = null;
    let candlestickSeries = null;
    let volumeSeries = null;
    let fairValueLines = [];

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

    // --- 1. 티커 목록 로드 ---
    async function loadTickerData() {
        try {
            const response = await fetch('tickers.json');
            if (!response.ok) throw new Error(`Ticker list fetch failed: ${response.status}`);
            tickerDataStore = await response.json();
        } catch (error) {
            console.error("Error loading ticker data:", error);
        }
    }
    // loadTickerData를 호출하여 티커 데이터를 미리 로드합니다.
    // 이 함수가 완료된 후에 이벤트 리스너를 등록하는 것이 더 안전할 수 있지만,
    // 현재 구조에서는 DOMContentLoaded 후에 바로 호출해도 큰 문제는 없습니다.
    loadTickerData();


    // --- 2. 자동 완성 로직 ---
    if (tickerInput && autocompleteList) { // 요소가 존재하는지 확인 후 이벤트 리스너 등록
        tickerInput.addEventListener('input', function(e) {
            const val = this.value;
            autocompleteList.innerHTML = ''; 
            if (!val || val.length < 1) {
                autocompleteList.style.display = 'none';
                return false;
            }
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
    } else {
        console.error("Ticker input or autocomplete list element not found.");
    }

    function closeAllLists(elmnt) {
        if (autocompleteList && elmnt !== tickerInput && (!elmnt || !autocompleteList.contains(elmnt))) {
            autocompleteList.innerHTML = '';
            autocompleteList.style.display = 'none';
        }
    }
    document.addEventListener('click', (e) => closeAllLists(e.target));


    // --- 3. "분석하기" 버튼 ---
    if (analyzeButton) { // 요소가 존재하는지 확인
        analyzeButton.addEventListener('click', async () => {
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
                if (!currentStockData.price || currentStockData.eps === undefined || currentStockData.bps === undefined || !currentStockData.historicalData) {
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
    } else {
        console.error("Analyze button not found.");
    }

    // --- 4. "재계산" 버튼 ---
    if (recalculateButton) { // 요소가 존재하는지 확인
        recalculateButton.addEventListener('click', () => {
            if (!currentStockData) { showError('먼저 주식을 분석해주세요.'); return; }
            hideError();
            const userAssumptions = getUserAssumptions();
            const fairValuesResult = calculateFairValues(currentStockData, userAssumptions);
            updateFairValueLinesOnChart(fairValuesResult.final); // 주가 차트의 선 업데이트
            updateModelDetailsDisplays(currentStockData, userAssumptions, fairValuesResult.modelOutputs);
        });
    } else {
        console.error("Recalculate button not found.");
    }

    // --- 5. 가정치 입력 필드 변경 시 Ke 자동 업데이트 ---
    if (inputRf && inputErp) { // 요소 존재 확인
        [inputRf, inputErp].forEach(input => {
            if (input) { // 각 input 요소도 존재하는지 확인
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
    function updateKeInput(betaValue) {
        if (!inputRf || !inputErp || !inputKe) return; // 필요한 입력 필드가 없으면 중단
        const rf = parseFloat(inputRf.value) || 0;
        const erp = parseFloat(inputErp.value) || 0;
        const beta = (betaValue !== undefined && betaValue !== null) ? parseFloat(betaValue) : 1.0;
        const calculatedKe = rf + beta * erp;
        inputKe.value = calculatedKe.toFixed(1);
    }
    
    function initializePageWithData(apiData) {
        if (stockNameTitle) stockNameTitle.textContent = `${apiData.companyName || apiData.symbol} (${apiData.symbol || 'N/A'})`;
        if (currentPriceSpan) currentPriceSpan.textContent = apiData.price !== undefined ? apiData.price.toFixed(2) : 'N/A';
        if (dataDateSpan) dataDateSpan.textContent = 'API 제공 기준';

        if(apiEpsSpan) apiEpsSpan.textContent = apiData.eps !== undefined ? `$${apiData.eps.toFixed(2)}` : 'N/A';
        if(apiBpsSpan) apiBpsSpan.textContent = apiData.bps !== undefined ? `$${apiData.bps.toFixed(2)}` : 'N/A';
        if(apiDpsSpan) apiDpsSpan.textContent = apiData.dpsTTM !== undefined ? `$${apiData.dpsTTM.toFixed(2)}` : 'N/A';
        if(apiPerSpan) apiPerSpan.textContent = apiData.peTTM !== undefined ? apiData.peTTM.toFixed(2) : 'N/A';
        if(apiPbrSpan) apiPbrSpan.textContent = apiData.pbTTM !== undefined ? apiData.pbTTM.toFixed(2) : 'N/A';
        if(apiDividendYieldSpan) apiDividendYieldSpan.textContent = apiData.dividendYieldTTM !== undefined ? (apiData.dividendYieldTTM * 100).toFixed(2) : 'N/A';
        if(apiRoeSpan) apiRoeSpan.textContent = apiData.roeTTM !== undefined ? (apiData.roeTTM * 100).toFixed(2) : 'N/A';
        const betaForDisplay = (apiData.beta !== undefined && apiData.beta !== null) ? apiData.beta.toFixed(2) : '1.00 (기본값)';
        if(apiBetaSpan) apiBetaSpan.textContent = betaForDisplay;
        if(dataBetaDisplaySpan) dataBetaDisplaySpan.textContent = betaForDisplay;
        if(apiPayoutRatioSpan) apiPayoutRatioSpan.textContent = apiData.payoutRatioTTM !== undefined ? (apiData.payoutRatioTTM * 100).toFixed(2) : 'N/A';

        if(inputPerLow) inputPerLow.value = 20; if(inputPerBase) inputPerBase.value = 25; if(inputPerHigh) inputPerHigh.value = 30;
        if(inputPbrLow) inputPbrLow.value = 3.0; if(inputPbrBase) inputPbrBase.value = 5.0; if(inputPbrHigh) inputPbrHigh.value = 8.0;
        if(inputRf) inputRf.value = 3.0; if(inputErp) inputErp.value = 5.0;
        updateKeInput(apiData.beta);

        let initialG;
        const keForGCalc = parseFloat(inputKe.value) / 100;
        if (apiData.roeTTM && apiData.payoutRatioTTM !== undefined && apiData.payoutRatioTTM >= 0 && apiData.payoutRatioTTM <=1 && apiData.roeTTM > 0) {
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
        
        createOrUpdatePriceChart(apiData.historicalData, fairValuesResult.final);
        updateModelDetailsDisplays(apiData, userAssumptions, fairValuesResult.modelOutputs);
        
        if(fairValueSummaryP) fairValueSummaryP.textContent = `산출된 모델들의 기본 추정치 평균은 $${fairValuesResult.final.base.toFixed(2)} 입니다.`;
        showResults();
    }

    function getUserAssumptions() {
        const keValue = inputKe ? parseFloat(inputKe.value) : NaN; // null 체크
        const gValue = inputG ? parseFloat(inputG.value) : NaN; // null 체크
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
        let modelOutputs = { PER: {low:0, base:0, high:0}, PBR: {low:0, base:0, high:0}, Intrinsic: {low:0, base:0, high:0, name: "내재가치 (계산 불가)", formula: ""} };

        if (apiData.eps !== undefined && apiData.eps > 0) {
            modelOutputs.PER = {low: apiData.eps * perLow, base: apiData.eps * perBase, high: apiData.eps * perHigh};
        }
        if (apiData.bps !== undefined && apiData.bps > 0) {
            modelOutputs.PBR = {low: apiData.bps * pbrLow, base: apiData.bps * pbrBase, high: apiData.bps * pbrHigh};
        }
        
        if (g < ke && ke > 0) {
            let intrinsicBase = 0;
            if (apiData.dpsTTM !== undefined && apiData.dpsTTM > 0) {
                modelOutputs.Intrinsic.name = "DDM (배당할인)";
                intrinsicBase = (apiData.dpsTTM * (1 + g)) / (ke - g);
                modelOutputs.Intrinsic.formula = `DPS($${apiData.dpsTTM.toFixed(2)}) * (1 + ${(g*100).toFixed(1)}%) / (${(ke*100).toFixed(1)}% - ${(g*100).toFixed(1)}%)`;
            } else if (apiData.eps !== undefined && apiData.eps > 0) {
                modelOutputs.Intrinsic.name = "EPS 성장 모델";
                intrinsicBase = (apiData.eps * (1 + g)) / (ke - g);
                modelOutputs.Intrinsic.formula = `EPS($${apiData.eps.toFixed(2)}) * (1 + ${(g*100).toFixed(1)}%) / (${(ke*100).toFixed(1)}% - ${(g*100).toFixed(1)}%)`;
            }
            if (intrinsicBase > 0 && isFinite(intrinsicBase)) {
                modelOutputs.Intrinsic.base = intrinsicBase;
                modelOutputs.Intrinsic.low = intrinsicBase * 0.8;
                modelOutputs.Intrinsic.high = intrinsicBase * 1.2;
            } else {
                modelOutputs.Intrinsic.name = "내재가치 (산출값 유효X)";
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
            showError("유효한 평가 모델 결과를 산출할 수 없습니다.");
        }
        return { final: {low: finalFvLow, base: finalFvBase, high: finalFvHigh}, modelOutputs };
    }

    function updateModelDetailsDisplays(apiData, assumptions, modelOutputs) {
        const { ke, g } = assumptions; // 이미 소수점으로 변환된 값 사용

        if(modelEpsPerSpan) modelEpsPerSpan.textContent = apiData.eps !== undefined ? `$${apiData.eps.toFixed(2)}` : 'N/A';
        if(perValueRangeSpan) perValueRangeSpan.textContent = `$${modelOutputs.PER.low.toFixed(2)} / $${modelOutputs.PER.base.toFixed(2)} / $${modelOutputs.PER.high.toFixed(2)}`;
        
        if(modelBpsPbrSpan) modelBpsPbrSpan.textContent = apiData.bps !== undefined ? `$${apiData.bps.toFixed(2)}` : 'N/A';
        if(pbrValueRangeSpan) pbrValueRangeSpan.textContent = `$${modelOutputs.PBR.low.toFixed(2)} / $${modelOutputs.PBR.base.toFixed(2)} / $${modelOutputs.PBR.high.toFixed(2)}`;
        
        if(intrinsicModelNameTitleSpan) intrinsicModelNameTitleSpan.textContent = modelOutputs.Intrinsic.name + ":";
        if(intrinsicFormulaDisplaySpan) intrinsicFormulaDisplaySpan.textContent = modelOutputs.Intrinsic.formula || "N/A";
        if(intrinsicValueRangeSpan) intrinsicValueRangeSpan.textContent = `$${modelOutputs.Intrinsic.low.toFixed(2)} / $${modelOutputs.Intrinsic.base.toFixed(2)} / $${modelOutputs.Intrinsic.high.toFixed(2)}`;

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
        if (!priceChartContainer) return;
        priceChartContainer.innerHTML = ''; 

        if (!historicalData || historicalData.length === 0) {
            priceChartContainer.textContent = '주가 차트 데이터를 가져올 수 없습니다.';
            return;
        }

        // LightweightCharts 라이브러리가 로드되었는지 확인
        if (typeof LightweightCharts === 'undefined' || typeof LightweightCharts.createChart !== 'function') {
            console.error('LightweightCharts.createChart 함수를 사용할 수 없습니다. 라이브러리가 올바르게 로드되었는지, HTML에 스크립트 태그가 있는지 확인하세요.');
            priceChartContainer.textContent = '차트 생성 오류: 라이브러리 로드 실패. HTML의 <head>에 Lightweight Charts 스크립트 태그를 추가하세요.';
            return; 
        }

        try {
            priceChart = LightweightCharts.createChart(priceChartContainer, {
                width: priceChartContainer.clientWidth || 600, // 너비 기본값
                height: priceChartContainer.clientHeight || 400, // 높이 기본값
                layout: { backgroundColor: '#ffffff', textColor: 'rgba(33, 56, 77, 1)' },
                grid: { vertLines: { color: 'rgba(197, 203, 206, 0.2)' }, horzLines: { color: 'rgba(197, 203, 206, 0.2)' }},
                crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
                rightPriceScale: { borderColor: 'rgba(197, 203, 206, 0.8)' },
                timeScale: { borderColor: 'rgba(197, 203, 206, 0.8)', timeVisible: true, secondsVisible: false },
            });
        } catch (e) {
            console.error("LightweightCharts.createChart 호출 중 오류:", e);
            priceChartContainer.textContent = '차트 생성 중 오류가 발생했습니다. 콘솔을 확인해주세요.';
            return;
        }

        if (priceChart && typeof priceChart.addCandlestickSeries === 'function') {
            candlestickSeries = priceChart.addCandlestickSeries({
                upColor: 'rgba(0, 150, 136, 0.8)', downColor: 'rgba(255, 82, 82, 0.8)',
                borderDownColor: 'rgba(255, 82, 82, 1)', borderUpColor: 'rgba(0, 150, 136, 1)',
                wickDownColor: 'rgba(255, 82, 82, 1)', wickUpColor: 'rgba(0, 150, 136, 1)',
            });
            candlestickSeries.setData(historicalData.filter(d => d.open && d.high && d.low && d.close && d.time)); // 유효한 데이터만 필터링

            if (typeof priceChart.addHistogramSeries === 'function') {
                volumeSeries = priceChart.addHistogramSeries({
                    color: '#26a69a', priceFormat: { type: 'volume' },
                    priceScaleId: 'volume_scale', // 별도 Y축 사용 (아래쪽에 표시)
                    scaleMargins: { top: 0.7, bottom: 0 }, // 위쪽 70% 가격, 아래쪽 30% 볼륨
                });
                 // 볼륨 Y축을 오른쪽에 배치 (기본값은 왼쪽)
                priceChart.priceScale('volume_scale').applyOptions({
                    scaleMargins: { top: 0.7, bottom: 0 },
                });

                const volumeData = historicalData.filter(d => d.time && d.volume !== undefined).map(d => ({ 
                    time: d.time, 
                    value: d.volume, 
                    color: d.close > d.open ? 'rgba(0, 150, 136, 0.4)' : 'rgba(255, 82, 82, 0.4)' 
                }));
                volumeSeries.setData(volumeData);
            } else { console.error("priceChart.addHistogramSeries is not a function"); }
            
            updateFairValueLinesOnChart(fairValueResults); 
            priceChart.timeScale().fitContent(); 
        } else {
            console.error("priceChart 객체 또는 addCandlestickSeries 메소드가 없습니다.");
            if(priceChartContainer) priceChartContainer.textContent = '차트 시리즈 추가 중 오류 발생.';
        }
    }
    
    function updateFairValueLinesOnChart(fairValueResults) {
        if (!candlestickSeries || !fairValueResults) return;
        fairValueLines.forEach(line => candlestickSeries.removePriceLine(line));
        fairValueLines = [];

        const lineOptions = (price, color, title, lineStyle = LightweightCharts.LineStyle.Solid) => ({
            price: price, color: color, lineWidth: 2, lineStyle: lineStyle,
            axisLabelVisible: true, title: `${title}: ${price.toFixed(2)}`
        });

        if (fairValueResults.base > 0 && isFinite(fairValueResults.base)) {
            fairValueLines.push(candlestickSeries.createPriceLine(lineOptions(fairValueResults.base, 'rgba(0, 123, 255, 0.8)', '기본')));
        }
        if (fairValueResults.low > 0 && isFinite(fairValueResults.low)) {
            fairValueLines.push(candlestickSeries.createPriceLine(lineOptions(fairValueResults.low, 'rgba(255, 120, 117, 0.7)', '최저', LightweightCharts.LineStyle.Dashed)));
        }
        if (fairValueResults.high > 0 && isFinite(fairValueResults.high)) {
             fairValueLines.push(candlestickSeries.createPriceLine(lineOptions(fairValueResults.high, 'rgba(0, 180, 130, 0.7)', '최고', LightweightCharts.LineStyle.Dashed)));
        }
    }
    
    function showLoading(isLoading) { if(loadingIndicator) loadingIndicator.style.display = isLoading ? 'block' : 'none'; }
    function showError(message) { if(errorMessageDiv) {errorMessageDiv.textContent = message; errorMessageDiv.style.display = 'block';} }
    function hideError() { if(errorMessageDiv) errorMessageDiv.style.display = 'none'; }
    function showResults() { if(resultsArea) resultsArea.style.display = 'block'; }
    function hideResults() { if(resultsArea) resultsArea.style.display = 'none'; }
});
