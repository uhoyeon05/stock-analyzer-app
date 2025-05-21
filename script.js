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
    // const dataDateSpan = document.getElementById('data-date');

    const barLow = document.getElementById('bar-low');
    const valueLow = document.getElementById('value-low');
    const barBase = document.getElementById('bar-base');
    const valueBase = document.getElementById('value-base');
    const barHigh = document.getElementById('bar-high');
    const valueHigh = document.getElementById('value-high');

    const targetPerRangeSpan = document.getElementById('target-per-range');
    const perValueRangeSpan = document.getElementById('per-value-range');
    const targetPbrRangeSpan = document.getElementById('target-pbr-range');
    const pbrValueRangeSpan = document.getElementById('pbr-value-range');
    const intrinsicModelNameSpan = document.getElementById('intrinsic-model-name');
    const intrinsicKeSpan = document.getElementById('intrinsic-ke');
    const intrinsicGSpan = document.getElementById('intrinsic-g');
    const intrinsicValueRangeSpan = document.getElementById('intrinsic-value-range');

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

    const dataEpsSpan = document.getElementById('data-eps');
    const dataBpsSpan = document.getElementById('data-bps');
    const dataDpsSpan = document.getElementById('data-dps');
    const dataBetaSpan = document.getElementById('data-beta');
    const dataBetaDisplaySpan = document.getElementById('data-beta-display');
    const dataRoeSpan = document.getElementById('data-roe');
    const dataPayoutRatioSpan = document.getElementById('data-payout-ratio');

    let tickerDataStore = [];
    let currentStockData = null;

    async function loadTickerData() {
        try {
            const response = await fetch('tickers.json');
            if (!response.ok) {
                throw new Error(`Ticker list fetch failed: ${response.status}`);
            }
            tickerDataStore = await response.json();
        } catch (error) {
            console.error("Error loading ticker data:", error);
        }
    }
    loadTickerData();

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

            if (((itemName && itemName.includes(searchText)) ||
                (itemSymbol && itemSymbol.includes(searchText))) && count < 7) {
                
                const suggestionDiv = document.createElement("DIV");

                const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedVal, 'gi');
                
                const displayNameHTML = item.name.replace(regex, (match) => `<u>${match}</u>`);
                const displaySymbolHTML = item.symbol.replace(regex, (match) => `<u>${match}</u>`);
                
                suggestionDiv.innerHTML = `<strong>${displayNameHTML}</strong> (${displaySymbolHTML})`;
                
                suggestionDiv.addEventListener('click', function(e) {
                    tickerInput.value = item.symbol;
                    closeAllLists();
                });
                autocompleteList.appendChild(suggestionDiv);
                count++;
            }
        });
        if (count > 0) {
            autocompleteList.style.display = 'block';
        } else {
            autocompleteList.style.display = 'none';
        }
    });

    function closeAllLists(elmnt) {
        if (autocompleteList && elmnt !== tickerInput && (!elmnt || !autocompleteList.contains(elmnt))) {
            autocompleteList.innerHTML = '';
            autocompleteList.style.display = 'none';
        }
    }
    document.addEventListener('click', function (e) {
        closeAllLists(e.target);
    });

    analyzeButton.addEventListener('click', async () => {
        const ticker = tickerInput.value.trim().toUpperCase();
        if (!ticker) {
            showError('티커를 입력해주세요.');
            return;
        }
        showLoading(true);
        hideError();
        hideResults();
        try {
            const response = await fetch(`/.netlify/functions/fetchStockData?ticker=${ticker}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: `HTTP 오류! 상태: ${response.status}`}));
                throw new Error(errorData.error || `HTTP 오류! 상태: ${response.status}`);
            }
            currentStockData = await response.json();
            if (currentStockData.error) throw new Error(currentStockData.error);
            if (currentStockData.price === undefined || currentStockData.eps === undefined || currentStockData.bps === undefined ) {
                 throw new Error(`핵심 재무 데이터(주가, EPS, BPS)가 부족하여 분석할 수 없습니다. (티커: ${ticker})`);
            }
            initializeAssumptionsAndDisplay(currentStockData);
        } catch (error) {
            console.error("분석 오류:", error);
            currentStockData = null;
            showError(`분석 중 오류 발생: ${error.message}`);
        } finally {
            showLoading(false);
        }
    });

    recalculateButton.addEventListener('click', () => {
        if (!currentStockData) {
            showError('먼저 주식을 분석해주세요.');
            return;
        }
        hideError();
        calculateAndDisplayFairValues(currentStockData, getUserAssumptions());
    });

    [inputRf, inputErp].forEach(input => {
        input.addEventListener('change', () => {
            if (currentStockData && currentStockData.beta !== undefined) {
                updateKeInput(currentStockData.beta);
            } else if (currentStockData === null && (inputRf.value || inputErp.value)) { 
                 updateKeInput(1.0); // 기본 Beta 1.0으로 Ke 업데이트
            }
        });
    });
    
    function updateKeInput(betaValue) {
        const rf = parseFloat(inputRf.value) || 0;
        const erp = parseFloat(inputErp.value) || 0;
        const beta = (betaValue !== undefined && betaValue !== null) ? parseFloat(betaValue) : 1.0;
        const calculatedKe = rf + beta * erp;
        inputKe.value = calculatedKe.toFixed(1);
    }
    
    function initializeAssumptionsAndDisplay(apiData) {
        stockNameTitle.textContent = `${apiData.companyName || apiData.symbol} (${apiData.symbol || 'N/A'})`;
        currentPriceSpan.textContent = apiData.price !== undefined ? apiData.price.toFixed(2) : 'N/A';

        dataEpsSpan.textContent = apiData.eps !== undefined ? `$${apiData.eps.toFixed(2)}` : 'N/A';
        dataBpsSpan.textContent = apiData.bps !== undefined ? `$${apiData.bps.toFixed(2)}` : 'N/A';
        dataDpsSpan.textContent = apiData.dps !== undefined ? `$${apiData.dps.toFixed(2)}` : 'N/A';
        const betaForDisplay = (apiData.beta !== undefined && apiData.beta !== null) ? apiData.beta.toFixed(2) : '1.00 (기본값)';
        dataBetaSpan.textContent = betaForDisplay;
        dataBetaDisplaySpan.textContent = betaForDisplay;
        dataRoeSpan.textContent = apiData.roe !== undefined ? (apiData.roe * 100).toFixed(2) : 'N/A';
        dataPayoutRatioSpan.textContent = apiData.payoutRatio !== undefined ? (apiData.payoutRatio * 100).toFixed(2) : 'N/A';

        inputPerLow.value = 20; inputPerBase.value = 25; inputPerHigh.value = 30;
        inputPbrLow.value = 3.0; inputPbrBase.value = 5.0; inputPbrHigh.value = 8.0;
        
        inputRf.value = 3.0;
        inputErp.value = 5.0;
        updateKeInput(apiData.beta);

        let initialG;
        const keForGCalc = parseFloat(inputKe.value) / 100;
        if (apiData.roe && apiData.payoutRatio !== undefined && apiData.payoutRatio >= 0 && apiData.payoutRatio <=1 && apiData.roe > 0) {
            initialG = apiData.roe * (1 - apiData.payoutRatio);
        } else if (apiData.roe && apiData.roe > 0) {
            initialG = apiData.roe * 0.5; 
        } else {
            initialG = 0.05;
        }
        initialG = Math.min(initialG, keForGCalc * 0.85); 
        initialG = Math.max(0.02, initialG);
        inputG.value = (initialG * 100).toFixed(1);

        showResults();
        calculateAndDisplayFairValues(apiData, getUserAssumptions());
    }

    function getUserAssumptions() {
        const keValue = parseFloat(inputKe.value);
        const gValue = parseFloat(inputG.value);

        return {
            perLow: parseFloat(inputPerLow.value) || 10,
            perBase: parseFloat(inputPerBase.value) || 15,
            perHigh: parseFloat(inputPerHigh.value) || 20,
            pbrLow: parseFloat(inputPbrLow.value) || 1.0,
            pbrBase: parseFloat(inputPbrBase.value) || 1.5,
            pbrHigh: parseFloat(inputPbrHigh.value) || 2.0,
            ke: !isNaN(keValue) ? keValue / 100 : 0.08,
            g: !isNaN(gValue) ? gValue / 100 : 0.03,
        };
    }

    function calculateAndDisplayFairValues(apiData, assumptions) {
        const { perLow, perBase, perHigh, pbrLow, pbrBase, pbrHigh, ke, g } = assumptions;

        targetPerRangeSpan.textContent = `${perLow} / ${perBase} / ${perHigh}`;
        targetPbrRangeSpan.textContent = `${pbrLow.toFixed(2)} / ${pbrBase.toFixed(2)} / ${pbrHigh.toFixed(2)}`;
        intrinsicKeSpan.textContent = (ke * 100).toFixed(1);
        intrinsicGSpan.textContent = (g * 100).toFixed(1);

        let fairValues = [];
        let perValLow = 0, perValBase = 0, perValHigh = 0;
        if (apiData.eps !== undefined && apiData.eps > 0) {
            perValLow = apiData.eps * perLow;
            perValBase = apiData.eps * perBase;
            perValHigh = apiData.eps * perHigh;
            fairValues.push({ model: 'PER', low: perValLow, base: perValBase, high: perValHigh });
        }
        perValueRangeSpan.textContent = `$${perValLow.toFixed(2)} / $${perValBase.toFixed(2)} / $${perValHigh.toFixed(2)}`;

        let pbrValLow = 0, pbrValBase = 0, pbrValHigh = 0;
        if (apiData.bps !== undefined && apiData.bps > 0) {
            pbrValLow = apiData.bps * pbrLow;
            pbrValBase = apiData.bps * pbrBase;
            pbrValHigh = apiData.bps * pbrHigh;
            fairValues.push({ model: 'PBR', low: pbrValLow, base: pbrValBase, high: pbrValHigh });
        }
        pbrValueRangeSpan.textContent = `$${pbrValLow.toFixed(2)} / $${pbrValBase.toFixed(2)} / $${pbrValHigh.toFixed(2)}`;
        
        let intrinsicValLow = 0, intrinsicValBase = 0, intrinsicValHigh = 0;
        let modelName = "내재가치 모델 (계산 불가)";
        if (g < ke && ke > 0) {
            if (apiData.dps !== undefined && apiData.dps > 0) {
                modelName = "DDM (배당할인)";
                intrinsicValBase = (apiData.dps * (1 + g)) / (ke - g);
            } else if (apiData.eps !== undefined && apiData.eps > 0) {
                modelName = "EPS 성장 모델";
                intrinsicValBase = (apiData.eps * (1 + g)) / (ke - g);
            }
            if (intrinsicValBase > 0 && isFinite(intrinsicValBase)) {
                intrinsicValLow = intrinsicValBase * 0.8;
                intrinsicValHigh = intrinsicValBase * 1.2;
                fairValues.push({ model: modelName, low: intrinsicValLow, base: intrinsicValBase, high: intrinsicValHigh });
            } else {
                modelName = "내재가치 모델 (산출값 유효하지 않음)";
                intrinsicValLow = 0; intrinsicValHigh = 0; intrinsicValBase = 0;
            }
        }
        intrinsicModelNameSpan.textContent = modelName + ":";
        intrinsicValueRangeSpan.textContent = `$${intrinsicValLow.toFixed(2)} / $${intrinsicValBase.toFixed(2)} / $${intrinsicValHigh.toFixed(2)}`;
        
        let fvLowSum = 0, fvBaseSum = 0, fvHighSum = 0;
        let validModels = 0;
        fairValues.forEach(fv => {
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
            showError("유효한 평가 모델 결과를 산출할 수 없습니다. 데이터가 부족하거나 적절하지 않습니다.");
            valueLow.textContent = `$0.00`; barLow.style.width = '0%';
            valueBase.textContent = `$0.00`; barBase.style.width = '0%';
            valueHigh.textContent = `$0.00`; barHigh.style.width = '0%';
            return;
        }
        
        const chartMaxVal = Math.max(apiData.price || 0, finalFvHigh, 0) * 1.1;
        valueLow.textContent = `$${finalFvLow.toFixed(2)}`;
        barLow.style.width = chartMaxVal > 0 ? `${(Math.max(0, finalFvLow) / chartMaxVal) * 100}%` : '0%';
        valueBase.textContent = `$${finalFvBase.toFixed(2)}`;
        barBase.style.width = chartMaxVal > 0 ? `${(Math.max(0, finalFvBase) / chartMaxVal) * 100}%` : '0%';
        valueHigh.textContent = `$${finalFvHigh.toFixed(2)}`;
        barHigh.style.width = chartMaxVal > 0 ? `${(Math.max(0, finalFvHigh) / chartMaxVal) * 100}%` : '0%';
    }

    function showLoading(isLoading) { loadingIndicator.style.display = isLoading ? 'block' : 'none'; }
    function showError(message) { errorMessageDiv.textContent = message; errorMessageDiv.style.display = 'block'; }
    function hideError() { errorMessageDiv.style.display = 'none'; }
    function showResults() { resultsArea.style.display = 'block'; }
    function hideResults() { resultsArea.style.display = 'none'; }
});
