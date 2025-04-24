import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import 'chart.js/auto';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

function App() {
  const [prices, setPrices] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [volume, setVolume] = useState<number[]>([]);
  const [sma50, setSma50] = useState<number[]>([]);
  const [sma200, setSma200] = useState<number[]>([]);
  const [rsi, setRsi] = useState<number[]>([]);
  const [bollingerBands, setBollingerBands] = useState<{
    upper: number[];
    middle: number[];
    lower: number[];
  }>({ upper: [], middle: [], lower: [] });
  const [macd, setMacd] = useState<{
    line: number[];
    signal: number[];
    histogram: number[];
  }>({ line: [], signal: [], histogram: [] });
  const [ticker, setTicker] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<string>('30d');
  const [interval, setInterval] = useState<string>('30m');
  const [activeIndicators, setActiveIndicators] = useState<{
    sma: boolean;
    rsi: boolean;
    bollinger: boolean;
    macd: boolean;
  }>({
    sma: true,
    rsi: false,
    bollinger: false,
    macd: false,
  });

  useEffect(() => {
    if (!ticker) return;

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
          new Date(t * 1000).toLocaleString()
        );
        setLabels(dates);

        // Calculate all technical indicators
        setSma50(calculateSMA(prices, 50));
        setSma200(calculateSMA(prices, 200));
        setRsi(calculateRSI(prices, 14));
        setBollingerBands(calculateBollingerBands(prices, 20, 2));
        setMacd(calculateMACD(prices));

        setError(null);
      })
      .catch(() => {
        setError('Failed to fetch stock data');
      });
  }, [ticker, range, interval]);

  const handleTickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTicker(event.target.value.toUpperCase());
  };

  const handleRangeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRange(event.target.value);
  };

  const handleIntervalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setInterval(event.target.value);
  };

  const toggleIndicator = (indicator: keyof typeof activeIndicators) => {
    setActiveIndicators({
      ...activeIndicators,
      [indicator]: !activeIndicators[indicator]
    });
  };

  // Function to calculate Simple Moving Average (SMA)
  const calculateSMA = (data: number[], period: number) => {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i + 1 < period) {
        sma.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  };

  // Function to calculate RSI
  const calculateRSI = (data: number[], period: number = 14) => {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial average gain and loss
    let avgGain = 0;
    let avgLoss = 0;

    // First RSI value uses simple average
    for (let i = 0; i < period; i++) {
      avgGain += gains[i] || 0;
      avgLoss += losses[i] || 0;
    }

    avgGain /= period;
    avgLoss /= period;

    // Calculate RSI
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        rsi.push(NaN); // Not enough data
      } else if (i === period) {
        const rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
        rsi.push(100 - (100 / (1 + rs)));
      } else {
        // Use smoothed averages for subsequent calculations
        avgGain = ((avgGain * (period - 1)) + (gains[i - 1] || 0)) / period;
        avgLoss = ((avgLoss * (period - 1)) + (losses[i - 1] || 0)) / period;
        
        const rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return rsi;
  };

  // Function to calculate EMA (Exponential Moving Average)
  const calculateEMA = (data: number[], period: number) => {
    const ema: number[] = [];
    const k = 2 / (period + 1);

    // Start with SMA for the first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    
    ema.push(sum / period);

    // Calculate EMA for the rest
    for (let i = period; i < data.length; i++) {
      ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
    }

    // Pad with NaN for the initial values
    const result = Array(period - 1).fill(NaN).concat(ema);
    return result;
  };

  // Function to calculate MACD
  const calculateMACD = (data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) => {
    // Calculate EMAs
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);

    // Calculate MACD line
    const macdLine: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
        macdLine.push(NaN);
      } else {
        macdLine.push(fastEMA[i] - slowEMA[i]);
      }
    }

    // Calculate signal line (EMA of MACD line)
    const validMacdValues = macdLine.filter(val => !isNaN(val));
    const signalLineValues = calculateEMA(validMacdValues, signalPeriod);
    
    // Pad signal line with NaN values
    const signalLine: number[] = Array(data.length).fill(NaN);
    let signalIndex = 0;
    for (let i = 0; i < macdLine.length; i++) {
      if (!isNaN(macdLine[i])) {
        if (signalIndex < signalLineValues.length) {
          signalLine[i] = signalLineValues[signalIndex];
          signalIndex++;
        }
      }
    }

    // Calculate histogram
    const histogram: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
        histogram.push(NaN);
      } else {
        histogram.push(macdLine[i] - signalLine[i]);
      }
    }

    return {
      line: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  };

  // Function to calculate Bollinger Bands
  const calculateBollingerBands = (data: number[], period: number = 20, multiplier: number = 2) => {
    const middle = calculateSMA(data, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        // Calculate standard deviation
        const slice = data.slice(i - period + 1, i + 1);
        const mean = slice.reduce((sum, price) => sum + price, 0) / period;
        const squaredDiffs = slice.map(price => Math.pow(price - mean, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
        const stdDev = Math.sqrt(variance);
        
        upper.push(middle[i] + (multiplier * stdDev));
        lower.push(middle[i] - (multiplier * stdDev));
      }
    }

    return { upper, middle, lower };
  };

  // Get price chart datasets based on active indicators
  const getPriceChartDatasets = () => {
    const datasets = [
      {
        label: 'Price',
        data: prices,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      }
    ];

    if (activeIndicators.sma) {
      datasets.push(
        {
          label: '50-Period SMA',
          data: sma50,
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'transparent',
          fill: false,
          borderWidth: 2,
        },
        {
          label: '200-Period SMA',
          data: sma200,
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'transparent',
          fill: false,
          borderWidth: 2,
        }
      );
    }

    if (activeIndicators.bollinger) {
      datasets.push(
        {
          label: 'Bollinger Upper',
          data: bollingerBands.upper,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'transparent',
          fill: false,
          borderWidth: 1,
          borderDash: [5, 5],
        },
        {
          label: 'Bollinger Middle',
          data: bollingerBands.middle,
          borderColor: 'rgba(255, 99, 132, 0.7)',
          backgroundColor: 'transparent',
          fill: false,
          borderWidth: 1,
        },
        {
          label: 'Bollinger Lower',
          data: bollingerBands.lower,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          fill: '+1', // Fill between this dataset and the previous one
          borderWidth: 1,
          borderDash: [5, 5],
        }
      );
    }

    return datasets;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-semibold mb-4 text-center">
          {ticker ? `${ticker} Stock Data` : 'Stock Data Viewer'}
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

        {/* Technical Indicators Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Technical Indicators:</label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => toggleIndicator('sma')}
              className={`px-3 py-1 rounded text-sm ${
                activeIndicators.sma 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              SMA
            </button>
            <button
              onClick={() => toggleIndicator('bollinger')}
              className={`px-3 py-1 rounded text-sm ${
                activeIndicators.bollinger 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Bollinger Bands
            </button>
            <button
              onClick={() => toggleIndicator('rsi')}
              className={`px-3 py-1 rounded text-sm ${
                activeIndicators.rsi 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              RSI
            </button>
            <button
              onClick={() => toggleIndicator('macd')}
              className={`px-3 py-1 rounded text-sm ${
                activeIndicators.macd 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              MACD
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && <p className="text-red-500 text-center">{error}</p>}

        {/* Price Chart with Indicators */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-center mb-4">Price Chart</h2>
          <ResizableBox
            width={600}
            height={400}
            minConstraints={[300, 200]}
            maxConstraints={[900, 600]}
          >
            <Line
              data={{
                labels,
                datasets: getPriceChartDatasets(),
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
                      maxTicksLimit: 15,
                    },
                  },
                },
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
              }}
            />
          </ResizableBox>
        </div>

        {/* RSI Chart */}
        {activeIndicators.rsi && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-center mb-4">RSI (14)</h2>
            <ResizableBox
              width={600}
              height={200}
              minConstraints={[300, 150]}
              maxConstraints={[900, 300]}
            >
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: 'RSI',
                      data: rsi,
                      borderColor: 'rgba(255, 99, 132, 1)',
                      backgroundColor: 'rgba(255, 99, 132, 0.2)',
                      fill: false,
                      borderWidth: 2,
                    },
                    {
                      label: 'Overbought (70)',
                      data: Array(labels.length).fill(70),
                      borderColor: 'rgba(255, 0, 0, 0.5)',
                      borderDash: [5, 5],
                      fill: false,
                      pointRadius: 0,
                    },
                    {
                      label: 'Oversold (30)',
                      data: Array(labels.length).fill(30),
                      borderColor: 'rgba(0, 255, 0, 0.5)',
                      borderDash: [5, 5],
                      fill: false,
                      pointRadius: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      min: 0,
                      max: 100,
                      title: {
                        display: true,
                        text: 'RSI Value',
                      },
                    },
                    x: {
                      ticks: {
                        autoSkip: true,
                        maxTicksLimit: 15,
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
            </ResizableBox>
          </div>
        )}

        {/* MACD Chart */}
        {activeIndicators.macd && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-center mb-4">MACD (12, 26, 9)</h2>
            <ResizableBox
              width={600}
              height={200}
              minConstraints={[300, 150]}
              maxConstraints={[900, 300]}
            >
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: 'MACD Line',
                      data: macd.line,
                      borderColor: 'rgba(54, 162, 235, 1)',
                      backgroundColor: 'transparent',
                      fill: false,
                      borderWidth: 2,
                      yAxisID: 'y',
                    },
                    {
                      label: 'Signal Line',
                      data: macd.signal,
                      borderColor: 'rgba(255, 159, 64, 1)',
                      backgroundColor: 'transparent',
                      fill: false,
                      borderWidth: 2,
                      yAxisID: 'y',
                    },
                    {
                      label: 'Histogram',
                      data: macd.histogram,
                      borderColor: 'rgba(75, 192, 192, 1)',
                      backgroundColor: (context) => {
                        const value = context.dataset.data[context.dataIndex] as number;
                        return value >= 0 
                          ? 'rgba(75, 192, 192, 0.5)' 
                          : 'rgba(255, 99, 132, 0.5)';
                      },
                      borderWidth: 0,
                      type: 'line',
                      yAxisID: 'y',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: 'MACD Value',
                      },
                    },
                    x: {
                      ticks: {
                        autoSkip: true,
                        maxTicksLimit: 15,
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
            </ResizableBox>
          </div>
        )}

        {/* Volume Chart */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-center mb-4">Volume</h2>
          <ResizableBox
            width={600}
            height={200}
            minConstraints={[300, 150]}
            maxConstraints={[900, 300]}
          >
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
                    type: 'line',
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
                    ticks: {
                      autoSkip: true,
                      maxTicksLimit: 15,
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
          </ResizableBox>
        </div>
      </div>
    </div>
  );
}

export default App;