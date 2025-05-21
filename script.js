// script.js

// Chart.js 인스턴스를 저장할 변수 (차트 업데이트 및 파괴 시 사용)
let priceChartInstance = null;

// Chart.js 라이브러리가 로드되었는지 확인하고, 로드될 때까지 기다리는 함수 (선택적, 보통은 바로 사용)
function ensureChartJsIsReady(callback) {
    if (typeof Chart !== 'undefined' && typeof moment !== 'undefined') {
        // console.log("Chart.js and Moment.js libraries are ready.");
        callback();
    } else {
        console.warn("Chart.js or Moment.js not ready yet, retrying in 200ms...");
        setTimeout(() => ensureChartJsIsReady(callback), 200);
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

    // const priceChartContainer = document.getElementById('price-chart-wrapper'); // Chart.js는 canvas에 그림
    const priceChartCanvas = document.getElementById('price-chart-canvas');


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
        });
    } else { console.error("Analyze button not found."); }

    if (recalculateButton) {
        recalculateButton.addEventListener('click', () => {
            ensureChartJsIsReady(() => {
                if (!currentStockData) { showError('먼저 주식을 분석해주세요.'); return; }
                hideError();
                const userAssumptions = getUserAssumptions();
                const fairValuesResult = calculateFairValues(currentStockData, userAssumptions);
                // 차트 업데이트는 Chart.js 방식으로 변경 필요
                createOrUpdatePriceChart(currentStockData.historicalData, fairValuesResult.final); // Chart.js는 전체 차트를 다시 그림
                updateModelDetailsDisplays(currentStockData, userAssumptions, fairValuesResult.modelOutputs);
            });
        });
    } else { console.error("Recalculate button not found."); }

    if (inputRf && inputErp) { /* ... 이전과 동일 ... */ }
    function updateKeInput(betaValue) { /* ... 이전과 동일 ... */ }
    function initializePageWithData(apiData) { /* ... 이전과 거의 동일, 차트 호출 부분만 변경됨 ... */
        if (stockNameTitle) stockNameTitle.textContent = `${apiData.companyName || apiData.symbol} (${apiData.symbol || 'N/A'})`;
        if (currentPriceSpan) currentPriceSpan.textContent = apiData.price !== undefined ? apiData.price.toFixed(2) : 'N/A';
        if (dataDateSpan) dataDateSpan.textContent = 'API 제공 기준';

        if(apiEpsSpan) apiEpsSpan.textContent = apiData.eps !== undefined ? `$${apiData.eps.toFixed(2)}` : 'N/A';
        // ... (기타 api 데이터 표시 부분은 이전과 동일)
        if(apiPayoutRatioSpan) apiPayoutRatioSpan.textContent = apiData.payoutRatioTTM !== undefined ? (apiData.payoutRatioTTM * 100).toFixed(2) : 'N/A';


        if(inputPerLow) inputPerLow.value = 20; if(inputPerBase) inputPerBase.value = 25; if(inputPerHigh) inputPerHigh.value = 30;
        // ... (기타 input 필드 초기화 부분은 이전과 동일) ...
        if(inputG) inputG.value = (initialG * 100).toFixed(1);


        const userAssumptions = getUserAssumptions();
        const fairValuesResult = calculateFairValues(apiData, userAssumptions);
        
        updateModelDetailsDisplays(apiData, userAssumptions, fairValuesResult.modelOutputs);
        if(fairValueSummaryP) fairValueSummaryP.textContent = `산출된 모델들의 기본 추정치 평균은 $${fairValuesResult.final.base.toFixed(2)} 입니다.`;
        
        showResults(); 

        // Chart.js 차트 생성 호출
        setTimeout(() => { // DOM이 확실히 그려진 후 차트 생성
            createOrUpdatePriceChart(apiData.historicalData, fairValuesResult.final);
        }, 100);
    }

    function getUserAssumptions() { /* ... 이전과 동일 ... */ }
    function calculateFairValues(apiData, assumptions) { /* ... 이전과 동일 ... */ }
    function updateModelDetailsDisplays(apiData, assumptions, modelOutputs) { /* ... 이전과 동일 ... */ }

    // --- Chart.js를 사용한 차트 생성 및 업데이트 함수 ---
    function createOrUpdatePriceChart(historicalData, fairValueResults) {
        if (!priceChartCanvas) {
            console.error("HTML에서 #price-chart-canvas 요소를 찾을 수 없습니다.");
            return;
        }
        if (!historicalData || historicalData.length === 0) {
            const ctx = priceChartCanvas.getContext('2d');
            ctx.clearRect(0, 0, priceChartCanvas.width, priceChartCanvas.height); // 이전 차트 지우기
            priceChartCanvas.style.display = 'block'; // 보이도록 설정
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("주가 차트 데이터를 가져올 수 없습니다.", priceChartCanvas.width / 2, priceChartCanvas.height / 2);
            return;
        }
        
        // 기존 차트 인스턴스가 있으면 파괴
        if (priceChartInstance) {
            priceChartInstance.destroy();
            priceChartInstance = null;
        }

        const labels = historicalData.map(d => d.time); // 날짜
        const closePrices = historicalData.map(d => d.close); // 종가
        const volumes = historicalData.map(d => d.volume); // 거래량

        // 적정주가 선을 위한 Annotation 플러그인 데이터 구성
        const annotations = {};
        if (fairValueResults.base > 0 && isFinite(fairValueResults.base)) {
            annotations['fairValueBaseLine'] = {
                type: 'line',
                yMin: fairValueResults.base,
                yMax: fairValueResults.base,
                borderColor: 'rgba(0, 123, 255, 0.8)',
                borderWidth: 2,
                label: {
                    content: `기본: $${fairValueResults.base.toFixed(2)}`,
                    enabled: true,
                    position: 'end',
                    backgroundColor: 'rgba(0, 123, 255, 0.8)',
                    color: 'white',
                    font: { weight: 'bold' }
                }
            };
        }
        if (fairValueResults.low > 0 && isFinite(fairValueResults.low)) {
            annotations['fairValueLowLine'] = {
                type: 'line',
                yMin: fairValueResults.low,
                yMax: fairValueResults.low,
                borderColor: 'rgba(255, 120, 117, 0.7)',
                borderWidth: 1,
                borderDash: [6, 6],
                label: {
                    content: `최저: $${fairValueResults.low.toFixed(2)}`,
                    enabled: true,
                    position: 'end',
                    backgroundColor: 'rgba(255, 120, 117, 0.7)',
                    color: 'white'
                }
            };
        }
        if (fairValueResults.high > 0 && isFinite(fairValueResults.high)) {
            annotations['fairValueHighLine'] = {
                type: 'line',
                yMin: fairValueResults.high,
                yMax: fairValueResults.high,
                borderColor: 'rgba(0, 180, 130, 0.7)',
                borderWidth: 1,
                borderDash: [6, 6],
                label: {
                    content: `최고: $${fairValueResults.high.toFixed(2)}`,
                    enabled: true,
                    position: 'end',
                    backgroundColor: 'rgba(0, 180, 130, 0.7)',
                    color: 'white'
                }
            };
        }


        const data = {
            labels: labels,
            datasets: [
                {
                    type: 'line', // 주가 라인 차트
                    label: '종가',
                    data: closePrices,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    yAxisID: 'y-axis-price',
                    tension: 0.1
                },
                {
                    type: 'bar', // 거래량 바 차트
                    label: '거래량',
                    data: volumes,
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    borderColor: 'rgb(153, 102, 255)',
                    yAxisID: 'y-axis-volume',
                }
            ]
        };

        const config = {
            // type: 'line', // 기본 타입을 설정할 수 있으나, datasets에서 개별적으로 설정
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false, // 이 옵션과 컨테이너 div의 height 설정이 중요
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                stacked: false,
                plugins: {
                    title: {
                        display: true,
                        text: '주가 및 거래량 (1년)'
                    },
                    tooltip: {
                        callbacks: { // 툴팁에 $ 표시 및 소수점 정리
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
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
                    annotation: { // Annotation 플러그인 설정
                        annotations: annotations
                    }
                },
                scales: {
                    x: { // 시간 축 설정
                        type: 'time',
                        time: {
                            unit: 'month', // 데이터 기간에 따라 'day', 'week', 'month' 등 자동 또는 수동 설정
                             tooltipFormat: 'YYYY-MM-DD', // 툴팁에 표시될 날짜 형식
                             displayFormats: { // 축에 표시될 날짜 형식
                                day: 'MM/DD',
                                week: 'MMM DD',
                                month: 'YYYY MMM'
                            }
                        },
                        title: {
                            display: true,
                            text: '날짜'
                        }
                    },
                    'y-axis-price': { // 주가 Y축 (왼쪽)
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '주가 ($)'
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    },
                    'y-axis-volume': { // 거래량 Y축 (오른쪽)
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '거래량'
                        },
                        grid: {
                            drawOnChartArea: false, // 거래량 축의 그리드 라인은 그리지 않음
                        },
                        ticks: {
                             callback: function(value, index, values) {
                                if (value >= 1000000) return (value / 1000000) + 'M';
                                if (value >= 1000) return (value / 1000) + 'K';
                                return value;
                            }
                        }
                    }
                }
            }
        };
        
        if (priceChartCanvas) {
            priceChartInstance = new Chart(priceChartCanvas, config);
        } else {
            console.error("priceChartCanvas is null, cannot create chart.");
        }
    }
    
    // function updateFairValueLinesOnChart(fairValueResults) { /* Chart.js에서는 annotation으로 처리 */ }
    // 이 함수는 Chart.js에서는 직접적으로 사용되지 않으므로 주석 처리하거나,
    // 차트 업데이트 시 annotations 객체를 새로 만들고 chart.update()를 호출하는 방식으로 변경해야 합니다.
    // 지금은 createOrUpdatePriceChart에서 annotations을 매번 새로 설정합니다.

    function showLoading(isLoading) { /* ... 이전과 동일 ... */ }
    function showError(message) { /* ... 이전과 동일 ... */ }
    function hideError() { /* ... 이전과 동일 ... */ }
    function showResults() { /* ... 이전과 동일 ... */ }
    function hideResults() { /* ... 이전과 동일 ... */ }

}; // window.onload 끝
