// script.js
document.addEventListener('DOMContentLoaded', () => {
    // ... (이전 변수 선언은 동일) ...

    // Lightweight Charts 라이브러리 로드 확인용 (스크립트 상단)
    if (typeof LightweightCharts === 'undefined') {
        console.error('LightweightCharts 라이브러리가 로드되지 않았습니다!');
        // 사용자에게 알림을 표시할 수도 있습니다.
        // errorMessageDiv.textContent = '차트 라이브러리를 로드할 수 없습니다. 페이지를 새로고침 해보세요.';
        // errorMessageDiv.style.display = 'block';
    }

    // ... (나머지 변수 선언 및 함수들) ...

    function createOrUpdatePriceChart(historicalData, fairValueResults) {
        if (!priceChartContainer) return;
        priceChartContainer.innerHTML = ''; 

        if (!historicalData || historicalData.length === 0) {
            priceChartContainer.textContent = '주가 차트 데이터를 가져올 수 없습니다.';
            return;
        }

        // LightweightCharts 객체가 로드되었는지 다시 한번 확인
        if (typeof LightweightCharts === 'undefined' || typeof LightweightCharts.createChart !== 'function') {
            console.error('LightweightCharts.createChart 함수를 사용할 수 없습니다. 라이브러리가 올바르게 로드되었는지 확인하세요.');
            priceChartContainer.textContent = '차트 생성 오류: 라이브러리 로드 실패';
            return; // 함수 실행 중단
        }

        try {
            priceChart = LightweightCharts.createChart(priceChartContainer, { // 여기를 try-catch로 감쌉니다.
                width: priceChartContainer.clientWidth,
                height: priceChartContainer.clientHeight, 
                layout: {
                    backgroundColor: '#ffffff',
                    textColor: 'rgba(33, 56, 77, 1)',
                },
                grid: {
                    vertLines: { color: 'rgba(197, 203, 206, 0.2)' },
                    horzLines: { color: 'rgba(197, 203, 206, 0.2)' },
                },
                crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
                rightPriceScale: { borderColor: 'rgba(197, 203, 206, 0.8)' },
                timeScale: { borderColor: 'rgba(197, 203, 206, 0.8)', timeVisible: true, secondsVisible: false },
            });
        } catch (e) {
            console.error("LightweightCharts.createChart 호출 중 오류:", e);
            priceChartContainer.textContent = '차트 생성 중 오류가 발생했습니다.';
            return;
        }


        // priceChart가 정상적으로 생성되었는지 확인 후 시리즈 추가
        if (priceChart && typeof priceChart.addCandlestickSeries === 'function') {
            candlestickSeries = priceChart.addCandlestickSeries({
                upColor: 'rgba(0, 150, 136, 0.8)', 
                downColor: 'rgba(255, 82, 82, 0.8)', 
                borderDownColor: 'rgba(255, 82, 82, 1)',
                borderUpColor: 'rgba(0, 150, 136, 1)',
                wickDownColor: 'rgba(255, 82, 82, 1)',
                wickUpColor: 'rgba(0, 150, 136, 1)',
            });
            candlestickSeries.setData(historicalData);

            // 거래량 시리즈 추가 (이것도 priceChart 존재 여부 확인 후)
            if (typeof priceChart.addHistogramSeries === 'function') {
                volumeSeries = priceChart.addHistogramSeries({
                    color: '#26a69a',
                    priceFormat: { type: 'volume' },
                    priceScaleId: '', 
                    scaleMargins: { top: 0.8, bottom: 0 }, 
                });
                const volumeData = historicalData.map(d => ({ time: d.time, value: d.volume, color: d.close > d.open ? 'rgba(0, 150, 136, 0.4)' : 'rgba(255, 82, 82, 0.4)' }));
                volumeSeries.setData(volumeData);
            } else {
                console.error("priceChart.addHistogramSeries is not a function");
            }
            
            updateFairValueLinesOnChart(fairValueResults); 
            priceChart.timeScale().fitContent(); 
        } else {
            console.error("priceChart 객체가 제대로 생성되지 않았거나, addCandlestickSeries 메소드가 없습니다.");
            priceChartContainer.textContent = '차트 시리즈 추가 중 오류 발생.';
        }
    }

    // ... (나머지 script.js 코드는 이전과 동일) ...
});
