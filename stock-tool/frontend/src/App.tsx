import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import 'chart.js/auto';
import { ResizableBox } from 'react-resizable'; // Import resizable box
import 'react-resizable/css/styles.css'; // Import necessary styles

function App() {
  const [prices, setPrices] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [volume, setVolume] = useState<number[]>([]);
  const [sma50, setSma50] = useState<number[]>([]); // 50-hour Simple Moving Average (SMA)
  const [sma200, setSma200] = useState<number[]>([]); // 200-hour Simple Moving Average (SMA)
  const [optionsPrices, setOptionsPrices] = useState<number[]>([]); // Option prices (Call/Puts)
  const [optionLabels, setOptionLabels] = useState<string[]>([]); // Option timestamps
  const [rsi, setRsi] = useState<number[]>([]); // RSI
  const [macd, setMacd] = useState<number[]>([]); // MACD
  const [signal, setSignal] = useState<number[]>([]); // MACD Signal line
  const [ticker, setTicker] = useState<string>(''); // Default to no ticker
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<string>('30d'); // Default to 30-day range
  const [interval, setInterval] = useState<string>('30m'); // Default to 30-minute interval

  useEffect(() => {
    if (!ticker) return; // Don't fetch data if no ticker is provided

    // Fetch stock data with the selected range and interval
    axios
      .get(`https://smart-signals.onrender.com/api/stock/${ticker}`, {
        params: { range, interval }
      })
      .then((res) => {
        const { prices, timestamps, volumes } = res.data;

        setPrices(prices);
        setVolume(volumes);

        // Convert timestamps to date labels
        const dates = timestamps.map((t: number) =>
          new Date(t * 1000).toLocaleString() // Format as a more readable date-time string
        );
        setLabels(dates);

        // Calculate moving averages (SMA 50 and SMA 200 for hourly data)
        setSma50(calculateSMA(prices, 50)); // 50-hour moving average
        setSma200(calculateSMA(prices, 200)); // 200-hour moving average

        // Calculate RSI and MACD
        setRsi(calculateRSI(prices));
        const { macd, signal } = calculateMACD(prices);
        setMacd(macd);
        setSignal(signal);

        setError(null);
      })
      .catch(() => {
        setError('Failed to fetch stock data');
      });

    // Fetch options data with the selected range and interval (example API)
  }, [ticker, range, interval]); // Re-fetch data when range or interval changes

  const handleTickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTicker(event.target.value.toUpperCase());
  };

  const handleRangeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRange(event.target.value);
  };

  const handleIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setInterval(event.target.value);
  };

  // Function to calculate Simple Moving Average (SMA)
  const calculateSMA = (data: number[], period: number) => {
    const sma: number[] = [];
    // Loop through the data to calculate SMA
    for (let i = 0; i < data.length; i++) {
      if (i + 1 < period) {
        sma.push(NaN); // Not enough data for SMA calculation
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  };

  // Function to calculate RSI (Relative Strength Index)
  const calculateRSI = (data: number[], period: number = 14) => {
    const rsi: number[] = [];
    for (let i = period; i < data.length; i++) {
      let gain = 0;
      let loss = 0;

      for (let j = i - period; j < i; j++) {
        const diff = data[j + 1] - data[j];
        if (diff > 0) gain += diff;
        else loss -= diff;
      }

      const avgGain = gain / period;
      const avgLoss = loss / period;

      const rs = avgGain / avgLoss;
      const rsiValue = 100 - 100 / (1 + rs);
      rsi.push(rsiValue);
    }

    return rsi;
  };

  // Function to calculate MACD (Moving Average Convergence Divergence)
  const calculateMACD = (data: number[], shortPeriod: number = 12, longPeriod: number = 26, signalPeriod: number = 9) => {
    const macd: number[] = [];
    const signal: number[] = [];

    const shortEMA = calculateEMA(data, shortPeriod);
    const longEMA = calculateEMA(data, longPeriod);

    // Calculate MACD line
    for (let i = 0; i < data.length; i++) {
      macd.push(shortEMA[i] - longEMA[i]);
    }

    // Calculate Signal line
    for (let i = signalPeriod - 1; i < data.length; i++) {
      const signalLine = macd.slice(i - signalPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / signalPeriod;
      signal.push(signalLine);
    }

    return { macd, signal };
  };

  // Function to calculate Exponential Moving Average (EMA)
  const calculateEMA = (data: number[], period: number) => {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    let previousEMA = data[0];
    ema.push(previousEMA);

    for (let i = 1; i < data.length; i++) {
      const currentEMA = (data[i] - previousEMA) * multiplier + previousEMA;
      ema.push(currentEMA);
      previousEMA = currentEMA;
    }

    return ema;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold mb-4 text-center">
          {ticker ? `${ticker} Stock Data` : 'Stock Data Viewer'} {/* Static title, dynamic ticker */}
        </h1>

        {/* Ticker input field */}
        <div className="mb-4">
          <label htmlFor="ticker" className="block text-sm font-medium mb-2">Enter Ticker:</label>
          <input
            id="ticker"
            type="text"
            value={ticker}
            onChange={handleTickerChange}
            className="w-full p-2 border rounded"
            placeholder="Enter stock ticker (e.g., AAPL)"
          />
        </div>

        {/* Range selector */}
        <div className="mb-4">
          <label htmlFor="range" className="block text-sm font-medium mb-2">Select Date Range:</label>
          <select
            id="range"
            value={range}
            onChange={handleRangeChange}
            className="w-full p-2 border rounded"
          >
            <option value="1d">1 Day</option>
            <option value="5d">5 Days</option>
            <option value="30d">30 Days</option>
            <option value="1mo">1 Month</option>
            <option value="3mo">3 Months</option>
            <option value="6mo">6 Months</option>
            <option value="1y">1 Year</option>
            <option value="2y">2 Years</option>
            <option value="5y">5 Years</option>
          </select>
        </div>

        {/* Interval selector */}
        <div className="mb-4">
          <label htmlFor="interval" className="block text-sm font-medium mb-2">Select Interval:</label>
          <select
            id="interval"
            value={interval}
            onChange={handleIntervalChange}
            className="w-full p-2 border rounded"
          >
            <option value="1m">1 Minute</option>
            <option value="2m">2 Minutes</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="30m">30 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="1d">1 Day</option>
            <option value="5d">5 Days</option>
            <option value="1wk">1 Week</option>
          </select>
        </div>

        {/* Error message */}
        {error && <p className="text-red-500 text-center">{error}</p>}
          {/* Chart for Prices */}
        <ResizableBox width={600} height={400} minConstraints={[200, 200]} maxConstraints={[800, 800]} axis="both">
          <Line
            data={{
              labels: labels,
              datasets: [
                {
                  label: 'Stock Price',
                  data: prices,
                  borderColor: 'rgba(75, 192, 192, 1)',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  fill: true,
                  tension: 0.4,
                },
                {
                  label: '50-hour SMA',
                  data: sma50,
                  borderColor: 'rgba(255, 99, 132, 1)',
                  backgroundColor: 'rgba(255, 99, 132, 0.2)',
                  fill: false,
                },
                {
                  label: '200-hour SMA',
                  data: sma200,
                  borderColor: 'rgba(153, 102, 255, 1)',
                  backgroundColor: 'rgba(153, 102, 255, 0.2)',
                  fill: false,
                }
              ],
            }}
            options={{
              responsive: true,
              scales: {
                x: {
                  ticks: { autoSkip: true, maxTicksLimit: 10 },
                },
                y: {
                  ticks: { autoSkip: true, maxTicksLimit: 5 },
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Price (USD)',
                    font: { size: 14 }, // Font size for Y-axis title

                  },
                },
              },
            }}
          />
        </ResizableBox>
      </div>
    </div>
    );
  }
export default App;
