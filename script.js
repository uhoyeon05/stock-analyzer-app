// script.js
document.addEventListener('DOMContentLoaded', () => {
    const tickerInput = document.getElementById('ticker-input');
    const analyzeButton = document.getElementById('analyze-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');
    const resultsArea = document.getElementById('results-area');
    const autocompleteList = document.getElementById('autocomplete-list');

    const stockNameTitle = document.getElementById('stock-name-title');
    const currentPriceSpan = document.getElementById('current-price');
    // const dataDateSpan = document.getElementById('data-date'); // 기준일은 FMP API에서 명시적으로 제공하지 않으므로 "API 제공 기준"으로 표시

    const barLow = document.getElementById('bar-low');
    const valueLow = document.getElementById('value-low');
    const barBase = document.getElementById('bar-base');
    const valueBase = document.getElementById('value-base');
    const barHigh = document.getElementById('bar-high');
    const valueHigh = document.getElementById('value-high');

    // 모델별 상세 정보 span
    const targetPerRangeSpan = document.getElementById('target-per-range');
    const perValueRangeSpan = document.getElementById('per-value-range');
    const targetPbrRangeSpan = document.getElementById('target-pbr-range');
    const pbrValueRangeSpan = document.getElementById('pbr-value-range');
    const intrinsicModelNameSpan = document.getElementById('intrinsic-model-name');
    const intrinsicKeSpan = document.getElementById('intrinsic-ke');
    const intrinsicGSpan = document.getElementById('intrinsic-g');
    const intrinsicValueRangeSpan = document.getElementById('intrinsic-value-range');

    // 주요 데이터 및 가정 span
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
        closeAllLists();
        if (!val || val.length < 1) { return false; }

        let count = 0;
        autocompleteList.innerHTML = ''; // 이전 목록 초기화
        tickerDataStore.forEach(item => {
            const pureSymbol = item.symbol.split('.')[0];
            if (((item.name && item.name.toUpperCase().includes(val.toUpperCase())) || 
                (pureSymbol && pureSymbol.toUpperCase().includes(val.toUpperCase()))) && count < 7) {
                const b = document.createElement("DIV");
                b.innerHTML = `<strong>${item.name.replace(new RegExp(val, 'gi'), (match) => `<u>${match}</u>`)}</strong> (${item.symbol.replace(new RegExp(val, 'gi'), (match) => `<u>${match}</u>`)})`;
                b.addEventListener('click', function(e) {
                    tickerInput.value = item.symbol;
                    closeAllLists();
                });
                autocompleteList.appendChild(b);
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
    document.addEventListener("click', function (e) {
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
                const errorData = await response.json().catch(() => ({error: `HTTP 오류! 상태: ${response.status}`})); // 한글
                throw new Error(errorData.error || `HTTP 오류! 상태: ${response.status}`); // 한글
            }
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.price === undefined || data.eps === undefined || data.bps === undefined ) {
                 throw new Error(`핵심 재무 데이터(주가, EPS, BPS)가 부족하여 분석할 수 없습니다. (티커: ${ticker})`); // 한글
            }
            displayResults(data);

        } catch (error) {
            console.error("분석 오류:", error); // 한글
            showError(`분석 중 오류 발생: ${error.message}`); // 한글
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
        // 성장률은 음수가 될 수 있으나, DDM/EPS 성장 모델에서는 양수여야 하고 Ke보다 작아야 함.
        // 여기서는 일단 계산된 g를 그대로 표시하고, 모델 적용 시 조건 체크.
        // 너무 높은 성장률 방지 (예: Ke의 80% 이하)
        g = Math.min(g, ke * 0.8); 
        // 너무 낮은 성장률 (음수) 방지 - 최소 0% 또는 작은 양수로 설정 가능 (예: 0.01 = 1%)
        g = Math.max(0.01, g); // 최소 성장률 1%로 가정, 또는 0으로 해도 무방

        dataGSpan.textContent = (g * 100).toFixed(2);

        let fairValues = [];

        const targetPerLow = 10, targetPerBase = 15, targetPerHigh = 20; // 미국 주식은 PER이 높은 경향이 있어 약간 상향 조정
        targetPerRangeSpan.textContent = `${targetPerLow} / ${targetPerBase} / ${targetPerHigh}`;
        let perValLow = 0, perValBase = 0, perValHigh = 0;
        if (data.eps !== undefined && data.eps > 0) { // EPS가 0보다 클 때만 의미
            perValLow = data.eps * targetPerLow;
            perValBase = data.eps * targetPerBase;
            perValHigh = data.eps * targetPerHigh;
            fairValues.push({ model: 'PER', low: perValLow, base: perValBase, high: perValHigh });
        }
        perValueRangeSpan.textContent = `$${perValLow.toFixed(2)} / $${perValBase.toFixed(2)} / $${perValHigh.toFixed(2)}`;

        let baseTargetPbr = 1.5; // PBR 기본값 조정
        if (data.roe && ke > 0 && g < ke ) { // g < ke 조건 추가
             // 이론적 PBR = (ROE - g) / (Ke - g)를 단순화: ROE와 Ke의 비율 등을 참고하되, 과도한 값 방지
             let justifiedPbr = (data.roe - g) / (ke - g) ; // RIM 기반의 이론적 PBR 유사 형태
             if (justifiedPbr > 0) baseTargetPbr = Math.max(1.0, Math.min(justifiedPbr, 5.0)); // 1.0 ~ 5.0 사이로 제한
        }
        const targetPbrLow = Math.max(0.8, baseTargetPbr * 0.8);
        const targetPbrHigh = Math.min(6.0, baseTargetPbr * 1.2); // PBR 상한 조정
        targetPbrRangeSpan.textContent = `${targetPbrLow.toFixed(2)} / ${baseTargetPbr.toFixed(2)} / ${targetPbrHigh.toFixed(2)}`;
        let pbrValLow = 0, pbrValBase = 0, pbrValHigh = 0;
        if (data.bps !== undefined && data.bps > 0) { // BPS가 0보다 클 때만 의미
            pbrValLow = data.bps * targetPbrLow;
            pbrValBase = data.bps * baseTargetPbr;
            pbrValHigh = data.bps * targetPbrHigh;
            fairValues.push({ model: 'PBR', low: pbrValLow, base: pbrValBase, high: pbrValHigh });
        }
        pbrValueRangeSpan.textContent = `$${pbrValLow.toFixed(2)} / $${pbrValBase.toFixed(2)} / $${pbrValHigh.toFixed(2)}`;

        intrinsicKeSpan.textContent = (ke * 100).toFixed(2);
        intrinsicGSpan.textContent = (g * 100).toFixed(2);
        let intrinsicValLow = 0, intrinsicValBase = 0, intrinsicValHigh = 0;
        let modelName = "내재가치 모델 (계산 불가)"; // 기본값
        if (g < ke) { // 성장률이 요구수익률보다 작아야 모델이 의미 있음
            if (data.dps !== undefined && data.dps > 0) {
                modelName = "DDM (배당할인)";
                intrinsicValBase = (data.dps * (1 + g)) / (ke - g);
            } else if (data.eps !== undefined && data.eps > 0) {
                modelName = "EPS 성장 모델";
                intrinsicValBase = (data.eps * (1 + g)) / (ke - g);
            }
            
            if (intrinsicValBase > 0) {
                intrinsicValLow = intrinsicValBase * 0.8;
                intrinsicValHigh = intrinsicValBase * 1.2;
                fairValues.push({ model: modelName, low: intrinsicValLow, base: intrinsicValBase, high: intrinsicValHigh });
            } else { // intrinsicValBase가 0이거나 음수면 계산 불가 처리
                modelName = "내재가치 모델 (산출값 유효하지 않음)";
                intrinsicValLow = 0; intrinsicValHigh = 0; intrinsicValBase = 0; // 명시적으로 0으로
            }
        }
        intrinsicModelNameSpan.textContent = modelName + ":";
        intrinsicValueRangeSpan.textContent = `$${intrinsicValLow.toFixed(2)} / $${intrinsicValBase.toFixed(2)} / $${intrinsicValHigh.toFixed(2)}`;
        
        let fvLowSum = 0, fvBaseSum = 0, fvHighSum = 0;
        let validModels = 0;

        fairValues.forEach(fv => {
            if (fv.base > 0 && isFinite(fv.base)) { // 유효하고 무한대가 아닌 값만
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
            showError("유효한 평가 모델 결과를 산출할 수 없습니다. 데이터가 부족하거나 적절하지 않습니다."); // 한글
            return;
        }
        
        const chartMaxVal = Math.max(data.price, finalFvHigh, 0) * 1.1; // 0을 포함하여 음수 방지

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
