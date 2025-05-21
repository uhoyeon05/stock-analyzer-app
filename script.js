// script.js
document.addEventListener('DOMContentLoaded', () => {
    const tickerInput = document.getElementById('ticker-input');
    const analyzeButton = document.getElementById('analyze-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');
    const resultsArea = document.getElementById('results-area');
    const autocompleteList = document.getElementById('autocomplete-list');

    // ... (다른 HTML 요소 ID 가져오는 부분은 이전과 동일) ...
    const stockNameTitle = document.getElementById('stock-name-title');
    const currentPriceSpan = document.getElementById('current-price');

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

    const dataEpsSpan = document.getElementById('data-eps');
    const dataBpsSpan = document.getElementById('data-bps');
    const dataDpsSpan = document.getElementById('data-dps');
    const dataBetaSpan = document.getElementById('data-beta');
    const dataRoeSpan = document.getElementById('data-roe');
    const dataRfSpan = document.getElementById('data-rf');
    const dataErpSpan = document.getElementById('data-erp');
    const dataKeSpan = document.getElementById('data-ke');
    const dataGSpan = document.getElementById('data-g');

    let tickerDataStore = [];

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
                
                const suggestionDiv = document.createElement("DIV"); // 새 DIV 생성

                // 회사명 부분 (입력값 하이라이트)
                const nameStrong = document.createElement("STRONG");
                const escapedValName = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regexName = new RegExp(escapedValName, 'gi');
                const nameParts = item.name.split(regexName); // 입력값을 기준으로 문자열 분리
                nameParts.forEach((part, index) => {
                    if (part) nameStrong.appendChild(document.createTextNode(part));
                    if (index < nameParts.length - 1) { // 마지막 부분이 아니면
                        const u = document.createElement("U");
                        // 원본 문자열에서 실제 매칭된 부분을 가져와야 대소문자 유지됨
                        const matchedOriginal = item.name.substring(nameStrong.textContent.length, nameStrong.textContent.length + val.length);
                        u.textContent = matchedOriginal;
                        nameStrong.appendChild(u);
                    }
                });
                suggestionDiv.appendChild(nameStrong);

                // 티커 심볼 부분 (입력값 하이라이트)
                const symbolTextNode = document.createTextNode(` (${item.symbol.substring(0, item.symbol.search(regexName) === -1 ? item.symbol.length : item.symbol.search(regexName))}`); // 괄호와 하이라이트 전 부분
                suggestionDiv.appendChild(symbolTextNode);
                
                if(item.symbol.search(regexName) !== -1){ // 일치하는 부분이 있다면
                    const symbolU = document.createElement("U");
                    const matchedSymbolOriginal = item.symbol.substring(item.symbol.search(regexName), item.symbol.search(regexName) + val.length);
                    symbolU.textContent = matchedSymbolOriginal;
                    suggestionDiv.appendChild(symbolU);
                    const symbolTextNodeAfter = document.createTextNode(item.symbol.substring(item.symbol.search(regexName) + val.length) + ')');
                    suggestionDiv.appendChild(symbolTextNodeAfter);
                } else { // 일치하는 부분 없으면 나머지 심볼과 닫는 괄호
                     const symbolTextNodeRest = document.createTextNode(item.symbol.substring(suggestionDiv.textContent.length -1 - nameStrong.textContent.length) + ')'); // 이미 추가된 ( 제외하고
                     suggestionDiv.appendChild(symbolTextNodeRest);
                }


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

    // --- analyzeButton 클릭 이벤트 및 displayResults 함수 등 나머지 코드는 이전과 동일 ---
    // (이하 생략 - 이전 답변의 나머지 부분을 여기에 붙여넣으시면 됩니다)
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
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.price === undefined || data.eps === undefined || data.bps === undefined ) {
                 throw new Error(`핵심 재무 데이터(주가, EPS, BPS)가 부족하여 분석할 수 없습니다. (티커: ${ticker})`);
            }
            displayResults(data);

        } catch (error) {
            console.error("분석 오류:", error);
            showError(`분석 중 오류 발생: ${error.message}`);
        } finally {
            showLoading(false);
        }
    });

    function displayResults(data) {
        stockNameTitle.textContent = `${data.companyName || data.symbol} (${data.symbol || 'N/A'})`;
        currentPriceSpan.textContent = data.price !== undefined ? data.price.toFixed(2) : 'N/A';

        dataEpsSpan.textContent = data.eps !== undefined ? `$${data.eps.toFixed(2)}` : 'N/A';
        dataBpsSpan.textContent = data.bps !== undefined ? `$${data.bps.toFixed(2)}` : 'N/A';
        dataDpsSpan.textContent = data.dps !== undefined ? `$${data.dps.toFixed(2)}` : 'N/A';
        dataBetaSpan.textContent = data.beta !== undefined ? data.beta.toFixed(2) : 'N/A';
        dataRoeSpan.textContent = data.roe !== undefined ? (data.roe * 100).toFixed(2) : 'N/A';

        const rf = 3.5;
        const erp = 6.0;
        dataRfSpan.textContent = rf.toFixed(1);
        dataErpSpan.textContent = erp.toFixed(1);

        const beta = (data.beta !== undefined && data.beta !== null) ? data.beta : 1.0;
        const ke = (rf + beta * erp) / 100;
        dataKeSpan.textContent = (ke * 100).toFixed(2);

        let g;
        if (data.roe && data.payoutRatio !== undefined && data.payoutRatio >= 0 && data.payoutRatio <=1 && data.roe > 0) {
            g = data.roe * (1 - data.payoutRatio);
        } else if (data.roe && data.roe > 0) {
            g = data.roe * 0.4; 
        } else {
            g = 0.03;
        }
        g = Math.min(g, ke * 0.8); 
        g = Math.max(0.01, g);

        dataGSpan.textContent = (g * 100).toFixed(2);

        let fairValues = [];

        const targetPerLow = 10, targetPerBase = 15, targetPerHigh = 20;
        targetPerRangeSpan.textContent = `${targetPerLow} / ${targetPerBase} / ${targetPerHigh}`;
        let perValLow = 0, perValBase = 0, perValHigh = 0;
        if (data.eps !== undefined && data.eps > 0) {
            perValLow = data.eps * targetPerLow;
            perValBase = data.eps * targetPerBase;
            perValHigh = data.eps * targetPerHigh;
            fairValues.push({ model: 'PER', low: perValLow, base: perValBase, high: perValHigh });
        }
        perValueRangeSpan.textContent = `$${perValLow.toFixed(2)} / $${perValBase.toFixed(2)} / $${perValHigh.toFixed(2)}`;

        let baseTargetPbr = 1.5;
        if (data.roe && ke > 0 && g < ke ) {
             let justifiedPbr = (data.roe - g) / (ke - g) ;
             if (justifiedPbr > 0 && isFinite(justifiedPbr)) baseTargetPbr = Math.max(1.0, Math.min(justifiedPbr, 5.0));
        }
        const targetPbrLow = Math.max(0.8, baseTargetPbr * 0.8);
        const targetPbrHigh = Math.min(6.0, baseTargetPbr * 1.2);
        targetPbrRangeSpan.textContent = `${targetPbrLow.toFixed(2)} / ${baseTargetPbr.toFixed(2)} / ${targetPbrHigh.toFixed(2)}`;
        let pbrValLow = 0, pbrValBase = 0, pbrValHigh = 0;
        if (data.bps !== undefined && data.bps > 0) {
            pbrValLow = data.bps * targetPbrLow;
            pbrValBase = data.bps * baseTargetPbr;
            pbrValHigh = data.bps * targetPbrHigh;
            fairValues.push({ model: 'PBR', low: pbrValLow, base: pbrValBase, high: pbrValHigh });
        }
        pbrValueRangeSpan.textContent = `$${pbrValLow.toFixed(2)} / $${pbrValBase.toFixed(2)} / $${pbrValHigh.toFixed(2)}`;

        intrinsicKeSpan.textContent = (ke * 100).toFixed(2);
        intrinsicGSpan.textContent = (g * 100).toFixed(2);
        let intrinsicValLow = 0, intrinsicValBase = 0, intrinsicValHigh = 0;
        let modelName = "내재가치 모델 (계산 불가)";
        if (g < ke) {
            if (data.dps !== undefined && data.dps > 0) {
                modelName = "DDM (배당할인)";
                intrinsicValBase = (data.dps * (1 + g)) / (ke - g);
            } else if (data.eps !== undefined && data.eps > 0) {
                modelName = "EPS 성장 모델";
                intrinsicValBase = (data.eps * (1 + g)) / (ke - g);
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
                fvLowSum += fv.low;
                fvBaseSum += fv.base;
                fvHighSum += fv.high;
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
            return;
        }
        
        const chartMaxVal = Math.max(data.price || 0, finalFvHigh, 0) * 1.1;

        valueLow.textContent = `$${finalFvLow.toFixed(2)}`;
        barLow.style.width = chartMaxVal > 0 ? `${(Math.max(0, finalFvLow) / chartMaxVal) * 100}%` : '0%';

        valueBase.textContent = `$${finalFvBase.toFixed(2)}`;
        barBase.style.width = chartMaxVal > 0 ? `${(Math.max(0, finalFvBase) / chartMaxVal) * 100}%` : '0%';

        valueHigh.textContent = `$${finalFvHigh.toFixed(2)}`;
        barHigh.style.width = chartMaxVal > 0 ? `${(Math.max(0, finalFvHigh) / chartMaxVal) * 100}%` : '0%';

        showResults();
    }

    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    function showError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    }
    function hideError() {
        errorMessageDiv.style.display = 'none';
    }
    function showResults() {
        resultsArea.style.display = 'block';
    }
    function hideResults() {
        resultsArea.style.display = 'none';
    }
});
