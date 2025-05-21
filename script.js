// 6. script.js
document.addEventListener('DOMContentLoaded', () => {
    const tickerInput = document.getElementById('ticker-input');
    const analyzeButton = document.getElementById('analyze-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');
    const resultsArea = document.getElementById('results-area');
    const autocompleteList = document.getElementById('autocomplete-list');

    const stockNameTitle = document.getElementById('stock-name-title');
    const currentPriceSpan = document.getElementById('current-price');
    const dataDateSpan = document.getElementById('data-date'); // 기준일은 FMP API에서 명시적으로 제공하지 않으므로 "API 제공 기준"으로 표시

    const barLow = document.getElementById('bar-low');
    const valueLow = document.getElementById('value-low');
    const barBase = document.getElementById('bar-base');
    const valueBase = document.getElementById('value-base');
    const barHigh = document.getElementById('bar-high');
    const valueHigh = document.getElementById('value-high');

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

    // --- 1. 티커 목록 로드 ---
    async function loadTickerData() {
        try {
            const response = await fetch('tickers.json');
            if (!response.ok) {
                throw new Error(`Ticker list fetch failed: ${response.status}`);
            }
            tickerDataStore = await response.json();
        } catch (error) {
            console.error("Error loading ticker data:", error);
            // 티커 로드 실패 시 사용자에게 알릴 수 있음 (선택적)
        }
    }
    loadTickerData();

    // --- 2. 자동 완성 로직 ---
    tickerInput.addEventListener('input', function(e) {
        const val = this.value;
        closeAllLists();
        if (!val || val.length < 1) { return false; } // 한 글자 이상 입력 시

        let count = 0;
        tickerDataStore.forEach(item => {
            // 회사명 또는 티커 코드(접미사 제외)로 검색
            const pureSymbol = item.symbol.split('.')[0];
            if ((item.name && item.name.toUpperCase().includes(val.toUpperCase())) || 
                (pureSymbol && pureSymbol.toUpperCase().includes(val.toUpperCase())) && count < 7) { // 최대 7개 추천
                const b = document.createElement("DIV");
                b.innerHTML = `<strong>${item.name}</strong> (${item.symbol})`;
                b.addEventListener('click', function(e) {
                    tickerInput.value = item.symbol; // .KS 포함된 심볼로 설정
                    closeAllLists();
                });
                autocompleteList.appendChild(b);
                count++;
            }
        });
    });

    function closeAllLists(elmnt) {
        const x = document.getElementsByClassName("autocomplete-items")[0]; // Assuming only one
        if (x) {
          const items = x.getElementsByTagName("div");
          for (let i = 0; i < items.length; i++) {
              if (elmnt != items[i] && elmnt != tickerInput) {
                  items[i].parentNode.removeChild(items[i]);
              }
          }
          // If autocompleteList is empty, clear its innerHTML to remove it effectively
          if(items.length === 0) autocompleteList.innerHTML = '';
        }
    }
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });


    // --- 3. 분석 버튼 클릭 이벤트 ---
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
            // 서버리스 함수 호출 (Netlify 기준)
            const response = await fetch(`/.netlify/functions/fetchStockData?ticker=${ticker}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: `HTTP error! status: ${response.status}`}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.error) { // 서버리스 함수 내부에서 발생한 에러
                throw new Error(data.error);
            }
            
            // 필수 데이터 누락 재확인
            if (!data.price || data.eps === undefined || data.bps === undefined ) {
                 throw new Error(`핵심 재무 데이터(주가, EPS, BPS)가 부족하여 분석할 수 없습니다. (티커: ${ticker})`);
            }

            displayResults(data);

        } catch (error) {
            console.error("Analysis error:", error);
            showError(`분석 중 오류 발생: ${error.message}`);
        } finally {
            showLoading(false);
        }
    });

    // --- 4. 결과 표시 및 계산 로직 ---
    function displayResults(data) {
        stockNameTitle.textContent = `${data.companyName || data.symbol} (${data.symbol || 'N/A'})`;
        currentPriceSpan.textContent = data.price ? data.price.toLocaleString() : 'N/A';

        // 주요 데이터 표시
        dataEpsSpan.textContent = data.eps !== undefined ? data.eps.toFixed(2) : 'N/A';
        dataBpsSpan.textContent = data.bps !== undefined ? data.bps.toFixed(2) : 'N/A';
        dataDpsSpan.textContent = data.dps !== undefined ? data.dps.toFixed(2) : 'N/A';
        dataBetaSpan.textContent = data.beta !== undefined ? data.beta.toFixed(2) : 'N/A';
        dataRoeSpan.textContent = data.roe !== undefined ? (data.roe * 100).toFixed(2) : 'N/A'; // ROE는 %로 표시

        // 고정 가정치
        const rf = 3.5; // 무위험수익률 (%)
        const erp = 6.0; // 주식위험프리미엄 (%)
        dataRfSpan.textContent = rf.toFixed(1);
        dataErpSpan.textContent = erp.toFixed(1);

        // 요구수익률 (Ke) 계산
        const beta = data.beta || 1.0; // 베타 없으면 1로 가정
        const ke = (rf + beta * erp) / 100; // 소수점으로 변환
        dataKeSpan.textContent = (ke * 100).toFixed(2);

        // 예상 성장률 (g) - ROE와 배당성향 기반 또는 기본값
        let g;
        if (data.roe && data.payoutRatio !== undefined && data.payoutRatio >= 0 && data.payoutRatio <=1) {
            g = data.roe * (1 - data.payoutRatio);
        } else if (data.roe) { // 배당성향이 이상하거나 없으면 ROE의 일정 비율로 단순 가정 (예: ROE의 30~50%)
            g = data.roe * 0.4; 
        } else {
            g = 0.03; // ROE도 없으면 기본 3% 성장 가정
        }
        g = Math.max(0, Math.min(g, ke * 0.8)); // 성장률은 0 이상, 요구수익률의 80% 이하로 제한 (안정성)
        dataGSpan.textContent = (g * 100).toFixed(2);


        // 적정주가 계산 로직 (혼합 모델)
        let fairValues = [];

        // 1. PER 기반 (목표 PER: 10 (Low), 12 (Base), 15 (High) - 단순 가정)
        if (data.eps > 0) { // EPS가 양수일 때만 의미 있음
            fairValues.push({ model: 'PER', low: data.eps * 10, base: data.eps * 12, high: data.eps * 15 });
        }
        
        // 2. PBR 기반 (목표 PBR: ROE/Ke 근사치 또는 기본값)
        let targetPbrBase = 1.0; // 기본 PBR
        if (data.roe && ke > g && ke > 0) { // ROE와 Ke가 유효할 때
             // 이론적 PBR = (ROE - g) / (Ke - g). 단, Ke > g, ROE > g 여야 함.
             // 단순화: ROE / Ke 비율을 참고하되, 너무 높거나 낮지 않게 조정.
             let justifiedPbr = data.roe / ke;
             targetPbrBase = Math.max(0.8, Math.min(justifiedPbr, 2.5)); // 0.8 ~ 2.5 사이로 제한
        }
        if (data.bps > 0) {
            fairValues.push({ model: 'PBR', low: data.bps * Math.max(0.7, targetPbrBase * 0.8), base: data.bps * targetPbrBase, high: data.bps * Math.min(3.0, targetPbrBase * 1.2) });
        }

        // 3. 간소화된 배당할인모형(DDM) 또는 EPS 성장 모델 (g가 Ke보다 작아야 함)
        if (ke > g) {
            if (data.dps > 0) { // 배당이 있으면 DDM 우선
                const ddmBase = (data.dps * (1 + g)) / (ke - g);
                fairValues.push({ model: 'DDM', low: ddmBase * 0.8, base: ddmBase, high: ddmBase * 1.2 });
            } else if (data.eps > 0) { // 배당 없고 EPS 양수면 EPS 성장 모델
                const epsGrowthModelBase = (data.eps * (1 + g)) / (ke - g);
                fairValues.push({ model: 'EPS Growth', low: epsGrowthModelBase * 0.8, base: epsGrowthModelBase, high: epsGrowthModelBase * 1.2 });
            }
        }
        
        // 최종 적정주가 범위 계산 (각 모델 결과의 평균)
        let fvLowSum = 0, fvBaseSum = 0, fvHighSum = 0;
        let validModels = 0;

        fairValues.forEach(fv => {
            if (fv.base > 0) { // 유효한(0보다 큰) 적정가만 포함
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
        
        // 현재 주가 대비 최대값 설정 (차트 스케일링 용)
        const chartMaxVal = Math.max(data.price, finalFvHigh) * 1.1; // 약간의 여유 공간

        valueLow.textContent = finalFvLow.toLocaleString(undefined, {maximumFractionDigits: 0}) + "원";
        barLow.style.width = `${(finalFvLow / chartMaxVal) * 100}%`;

        valueBase.textContent = finalFvBase.toLocaleString(undefined, {maximumFractionDigits: 0}) + "원";
        barBase.style.width = `${(finalFvBase / chartMaxVal) * 100}%`;

        valueHigh.textContent = finalFvHigh.toLocaleString(undefined, {maximumFractionDigits: 0}) + "원";
        barHigh.style.width = `${(finalFvHigh / chartMaxVal) * 100}%`;

        showResults();
    }


    // --- 유틸리티 함수 ---
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