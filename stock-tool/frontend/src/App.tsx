import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import 'chart.js/auto';

function App() {
  const [prices, setPrices] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [volume, setVolume] = useState<number[]>([]);
  const [sma50, setSma50] = useState<number[]>([]); // 50-hour Simple Moving Average (SMA)
  const [sma200, setSma200] = useState<number[]>([]); // 200-hour Simple Moving Average (SMA)
  const [ticker, setTicker] = useState<string>('AAPL');
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<string>('30d'); // Default to 30-day range
  const [interval, setInterval] = useState<string>('30m'); // Default to 1-minute interval

  useEffect(() => {
    // Fetch stock data with the selected range and interval
    axios
      .get(`https://smart-signals.onrender.com/api/stock/${ticker}`, {
        params: { range, interval } // Use selected range and interval
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

        setError(null);
      })
      .catch(() => {
        setError('Failed to fetch stock data');
      });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold mb-4 text-center">
          {ticker} {range} {interval} Price & Volume Chart
        </h1>

        {/* Ticker input field */}
        <div className="mb-4">
          <input
            type="text"
            value={ticker}
            onChange={handleTickerChange}
            className="w-full p-2 border rounded"
            placeholder="Enter stock ticker (e.g., AAPL)"
          />
        </div>

        {/* Range selector */}
        <div className="mb-4">
          <select
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
          <select
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

        {/* Price and SMA Chart */}
        <Line
          data={{
            labels,
            datasets: [
              {
                label: 'Price',
                data: prices,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
              },
              {
                label: '50-Hour SMA',
                data: sma50,
                borderColor: 'rgba(255, 159, 64, 1)',
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                fill: false,
                borderWidth: 2,
              },
              {
                label: '200-Hour SMA',
                data: sma200,
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                fill: false,
                borderWidth: 2,
              },
            ],
          }}
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: false,
                title: {
                  display: true,
                  text: 'Price (USD)',
                },
              },
              x: {
                title: {
                  display: true,
                  text: 'Date/Time',
                },
                ticks: {
                  autoSkip: true,
                  maxTicksLimit: 15, // Limit number of labels to avoid overcrowding
                },
              },
            },
            plugins: {
              legend: {
                position: 'top',
              },
            },
          }}
        />

        {/* Volume Chart */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-center">Volume</h2>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: 'Volume',
                  data: volume,
                  borderColor: 'rgba(153, 102, 255, 1)',
                  backgroundColor: 'rgba(153, 102, 255, 0.2)',
                  fill: true,
                },
              ],
            }}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Volume',
                  },
                },
                x: {
                  title: {
                    display: true,
                    text: 'Date/Time',
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
