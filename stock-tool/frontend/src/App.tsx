import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
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
  const [loading, setLoading] = useState<boolean>(false);
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
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    if (!ticker) return;

    setLoading(true);
    setError(null);

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

        setLastUpdated(new Date().toLocaleString());
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to fetch stock data: ${err.message}`);
        setLoading(false);
      });
  }, [ticker, range, interval]);

  const handleTickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTicker(event.target.value.toUpperCase());
  };

  const handleTickerSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Re-fetch data for the current ticker
    if (ticker) {
      setLoading(true);
      setError(null);
      
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

          setLastUpdated(new Date().toLocaleString());
          setLoading(false);
        })
        .catch((err) => {
          setError(`Failed to fetch stock data: ${err.message}`);
          setLoading(false);
        });
    }
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
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
        borderColor: darkMode ? 'rgba(0, 255, 255, 1)' : 'rgba(75, 192, 192, 1)',
        backgroundColor: darkMode ? 'rgba(0, 255, 255, 0.1)' : 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.1, // Add slight curve to lines
        pointRadius: 0.5, // Smaller points
        pointHoverRadius: 5, // Larger points on hover
      }
    ];

    if (activeIndicators.sma) {
      datasets.push(
        {
          label: '50-Period SMA',
          data: sma50,
          borderColor: darkMode ? 'rgba(255, 165, 0, 1)' : 'rgba(255, 159, 64, 1)',
          backgroundColor: 'transparent',
          fill: false,
          pointRadius: 0,
          tension: 0,
          pointHoverRadius: 0
        },
        {
          label: '200-Period SMA',
          data: sma200,
          borderColor: darkMode ? 'rgba(138, 43, 226, 1)' : 'rgba(153, 102, 255, 1)',
          backgroundColor: 'transparent',
          fill: false,
          pointRadius: 0, // Hide points
          tension: 0,
          pointHoverRadius: 0
        }
      );
    }

    if (activeIndicators.bollinger) {
      datasets.push(
        {
          label: 'Bollinger Upper',
          data: bollingerBands.upper,
          borderColor: darkMode ? 'rgba(255, 105, 180, 1)' : 'rgba(255, 99, 132, 1)',
          backgroundColor: 'transparent',
          fill: false,
          pointRadius: 0,
          tension: 0,
          pointHoverRadius: 0
        },
        {
          label: 'Bollinger Middle',
          data: bollingerBands.middle,
          borderColor: darkMode ? 'rgba(255, 105, 180, 0.7)' : 'rgba(255, 99, 132, 0.7)',
          backgroundColor: 'transparent',
          fill: false,
          pointRadius: 0, // Hide points
          tension: 0,
          pointHoverRadius: 0
        },
        {
          label: 'Bollinger Lower',
          data: bollingerBands.lower,
          borderColor: darkMode ? 'rgba(255, 105, 180, 1)' : 'rgba(255, 99, 132, 1)',
          backgroundColor: darkMode ? 'rgba(255, 105, 180, 0.05)' : 'rgba(255, 99, 132, 0.05)',
          fill: true,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      );
    }

    return datasets;
  };

  // Get background and text colors based on dark mode
  const getThemeColors = () => {
    return {
      bgColor: darkMode ? 'bg-gray-900' : 'bg-gray-100',
      cardBgColor: darkMode ? 'bg-gray-800' : 'bg-white',
      textColor: darkMode ? 'text-gray-200' : 'text-gray-800',
      borderColor: darkMode ? 'border-gray-700' : 'border-gray-300',
      inputBgColor: darkMode ? 'bg-gray-700' : 'bg-white',
      inputTextColor: darkMode ? 'text-gray-200' : 'text-gray-800',
      buttonBgColor: darkMode ? 'bg-blue-600' : 'bg-blue-500',
      buttonHoverColor: darkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-600',
    };
  };

  const theme = getThemeColors();

  return (
    <div className={`min-h-screen ${theme.bgColor} ${theme.textColor} transition-colors duration-300`}>
      <div className="container mx-auto p-4">
        <div className={`${theme.cardBgColor} rounded-xl shadow-lg p-6 mb-6 transition-colors duration-300`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">
              {ticker ? `${ticker} Stock Analysis` : 'Stock Market Analysis'}
            </h1>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-white'}`}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>

          {/* Search and Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2">
              <form onSubmit={handleTickerSubmit} className="flex">
                <div className="flex-grow">
                  <label htmlFor="ticker" className="block text-sm font-medium mb-1">Stock Ticker</label>
                  <input
                    id="ticker"
                    type="text"
                    value={ticker}
                    onChange={handleTickerChange}
                    className={`w-full p-2 border ${theme.borderColor} rounded-l ${theme.inputBgColor} ${theme.inputTextColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Enter ticker (e.g., AAPL)"
                  />
                </div>
                <button
                  type="submit"
                  className={`${theme.buttonBgColor} ${theme.buttonHoverColor} text-white px-4 rounded-r focus:outline-none focus:ring-2 focus:ring-blue-500 mt-6`}
                  disabled={loading}
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    "Search"
                  )}
                </button>
              </form>
            </div>
            
            <div>
              <label htmlFor="range" className="block text-sm font-medium mb-1">Time Range</label>
              <select
                id="range"
                value={range}
                onChange={handleRangeChange}
                className={`w-full p-2 border ${theme.borderColor} rounded ${theme.inputBgColor} ${theme.inputTextColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
            
            <div>
              <label htmlFor="interval" className="block text-sm font-medium mb-1">Interval</label>
              <select
                id="interval"
                value={interval}
                onChange={handleIntervalChange}
                className={`w-full p-2 border ${theme.borderColor} rounded ${theme.inputBgColor} ${theme.inputTextColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
          </div>

          {/* Technical Indicators Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Technical Indicators:</label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => toggleIndicator('sma')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  activeIndicators.sma 
                    ? `${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white` 
                    : `${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`
                }`}
              >
                SMA
              </button>
              <button
                onClick={() => toggleIndicator('bollinger')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  activeIndicators.bollinger 
                    ? `${darkMode ? 'bg-pink-600' : 'bg-pink-500'} text-white` 
                    : `${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`
                }`}
              >
                Bollinger Bands
              </button>
              <button
                onClick={() => toggleIndicator('rsi')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  activeIndicators.rsi 
                    ? `${darkMode ? 'bg-green-600' : 'bg-green-500'} text-white` 
                    : `${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`
                }`}
              >
                RSI
              </button>
              <button
                onClick={() => toggleIndicator('macd')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  activeIndicators.macd 
                    ? `${darkMode ? 'bg-purple-600' : 'bg-purple-500'} text-white` 
                    : `${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${darkMode ? 'text-gray-300' : 'text-gray-700'}`
                }`}
              >
                MACD
              </button>
            </div>
          </div>

          {/* Status and Error Messages */}
          {loading && (
            <div className="flex justify-center items-center p-4 mb-6">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-3/4`}></div>
                  <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded`}></div>
                  <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-5/6`}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {/* Stock Info Card */}
          {ticker && prices.length > 0 && (
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 ${theme.borderColor} border-t pt-4`}>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <h3 className="text-lg font-semibold mb-2">Current Price</h3>
                <p className="text-3xl font-bold">${prices[prices.length - 1].toFixed(2)}</p>
                <p className={`text-sm ${
                  prices[prices.length - 1] > prices[prices.length - 2] 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  {prices[prices.length - 1] > prices[prices.length - 2] ? '▲' : '▼'} 
                  ${Math.abs(prices[prices.length - 1] - prices[prices.length - 2]).toFixed(2)} 
                  ({((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2] * 100).toFixed(2)}%)
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <h3 className="text-lg font-semibold mb-2">Trading Range</h3>
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm">Low</p>
                    <p className="text-xl font-bold">${Math.min(...prices.filter(p => !isNaN(p))).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm">High</p>
                    <p className="text-xl font-bold">${Math.max(...prices.filter(p => !isNaN(p))).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <h3 className="text-lg font-semibold mb-2">Volume</h3>
                <p className="text-3xl font-bold">{volume[volume.length - 1]?.toLocaleString()}</p>
                <p className="text-sm">Last updated: {lastUpdated}</p>
              </div>
            </div>
          )}

          {/* Price Chart with Indicators */}
          {ticker && prices.length > 0 && (
            <div className={`mb-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} shadow-inner`}>
              <h2 className="text-xl font-bold text-center mb-4">
                {ticker} Price Chart
              </h2>
              <div className="chart-container" style={{ position: 'relative', height: '60vh', width: '100%' }}>
                <Line
                  data={{
                    labels,
                    datasets: getPriceChartDatasets(),
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: false,
                        grid: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        },
                        ticks: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                          callback: function(value) {
                            return '$' + value;
                          }
                        },
                        title: {
                          display: true,
                          text: 'Price (USD)',
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        },
                      },
                      x: {
                        grid: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        },
                        ticks: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                          autoSkip: true,
                          maxTicksLimit: 10,
                          maxRotation: 0,
                        },
                        title: {
                          display: true,
                          text: 'Date/Time',
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                          padding: 20,
                          usePointStyle: true,
                          pointStyle: 'circle',
                        },
                      },
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        bodyColor: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 6,
                        callbacks: {
                          label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                              label += ': ';
                            }
                            if (context.parsed.y !== null) {
                              label += '$' + context.parsed.y.toFixed(2);
                            }
                            return label;
                          }
                        }
                      },
                    },
                    interaction: {
                      mode: 'nearest',
                      axis: 'x',
                      intersect: false
                    },
                    elements: {
                      line: {
                        tension: 0.1 // Smoother curves
                      }
                    },
                    animation: {
                      duration: 1000
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* RSI Chart */}
          {ticker && prices.length > 0 && activeIndicators.rsi && (
            <div className={`mb-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} shadow-inner`}>
              <h2 className="text-xl font-bold text-center mb-4">
                Relative Strength Index (RSI-14)
              </h2>
              <div className="chart-container" style={{ position: 'relative', height: '30vh', width: '100%' }}>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: 'RSI',
                        data: rsi,
                        borderColor: darkMode ? 'rgba(46, 204, 113, 1)' : 'rgba(46, 204, 113, 1)',
                        backgroundColor: darkMode ? 'rgba(46, 204, 113, 0.1)' : 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                      },
                      {
                        label: 'Overbought (70)',
                        data: Array(labels.length).fill(70),
                        borderColor: darkMode ? 'rgba(231, 76, 60, 0.7)' : 'rgba(231, 76, 60, 0.7)',
                        backgroundColor: 'transparent',
                        fill: false,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        borderWidth: 1,
                      },
                      {
                        label: 'Oversold (30)',
                        data: Array(labels.length).fill(30),
                        borderColor: darkMode ? 'rgba(52, 152, 219, 0.7)' : 'rgba(52, 152, 219, 0.7)',
                        backgroundColor: 'transparent',
                        fill: false,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        min: 0,
                        max: 100,
                        grid: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        },
                        ticks: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                        },
                        title: {
                          display: true,
                          text: 'RSI Value',
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        },
                      },
                      x: {
                        grid: {
                          display: false,
                        },
                        ticks: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                          autoSkip: true,
                          maxTicksLimit: 10,
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                          usePointStyle: true,
                          pointStyle: 'circle',
                        },
                      },
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        bodyColor: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* MACD Chart */}
          {ticker && prices.length > 0 && activeIndicators.macd && (
            <div className={`mb-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} shadow-inner`}>
              <h2 className="text-xl font-bold text-center mb-4">
                MACD (12, 26, 9)
              </h2>
              <div className="chart-container" style={{ position: 'relative', height: '30vh', width: '100%' }}>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: 'MACD Line',
                        data: macd.line,
                        borderColor: darkMode ? 'rgba(52, 152, 219, 1)' : 'rgba(52, 152, 219, 1)',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                        yAxisID: 'y',
                      },
                      {
                        label: 'Signal Line',
                        data: macd.signal,
                        borderColor: darkMode ? 'rgba(231, 76, 60, 1)' : 'rgba(231, 76, 60, 1)',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                        yAxisID: 'y',
                      },
                      {
                        label: 'Histogram',
                        data: macd.histogram,
                        borderColor: (context) => {
                          const value = context.dataset.data[context.dataIndex] as number;
                          return value >= 0 
                            ? darkMode ? 'rgba(46, 204, 113, 1)' : 'rgba(46, 204, 113, 1)'
                            : darkMode ? 'rgba(231, 76, 60, 1)' : 'rgba(231, 76, 60, 1)';
                        },
                        backgroundColor: (context) => {
                          const value = context.dataset.data[context.dataIndex] as number;
                          return value >= 0 
                            ? darkMode ? 'rgba(46, 204, 113, 0.5)' : 'rgba(46, 204, 113, 0.5)'
                            : darkMode ? 'rgba(231, 76, 60, 0.5)' : 'rgba(231, 76, 60, 0.5)';
                        },
                        borderWidth: 1,
                        type: 'line',
                        yAxisID: 'y',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        grid: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        },
                        ticks: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                        },
                        title: {
                          display: true,
                          text: 'MACD Value',
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        },
                      },
                      x: {
                        grid: {
                          display: false,
                        },
                        ticks: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                          autoSkip: true,
                          maxTicksLimit: 10,
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                          usePointStyle: true,
                          pointStyle: 'circle',
                        },
                      },
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        bodyColor: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Volume Chart */}
          {ticker && prices.length > 0 && (
            <div className={`mb-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} shadow-inner`}>
              <h2 className="text-xl font-bold text-center mb-4">
                Trading Volume
              </h2>
              <div className="chart-container" style={{ position: 'relative', height: '25vh', width: '100%' }}>
                <Bar
                  data={{
                    labels,
                    datasets: [
                      {
                        label: 'Volume',
                        data: volume,
                        backgroundColor: (context) => {
                          // Color bars based on price movement
                          if (context.dataIndex > 0) {
                            return prices[context.dataIndex] >= prices[context.dataIndex - 1]
                              ? darkMode ? 'rgba(46, 204, 113, 0.7)' : 'rgba(46, 204, 113, 0.7)'  // Green for up
                              : darkMode ? 'rgba(231, 76, 60, 0.7)' : 'rgba(231, 76, 60, 0.7)';   // Red for down
                          }
                          return darkMode ? 'rgba(52, 152, 219, 0.7)' : 'rgba(52, 152, 219, 0.7)'; // Blue for first bar
                        },
                        borderColor: 'transparent',
                        borderWidth: 1,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        },
                        ticks: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                          callback: function(value) {
                            if (Number(value) >= 1000000) {
                              return (Number(value) / 1000000).toFixed(1) + 'M';
                            } else if (Number(value) >= 1000) {
                              return (Number(value) / 1000).toFixed(1) + 'K';
                            }
                            return value;
                          }
                        },
                        title: {
                          display: true,
                          text: 'Volume',
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        },
                      },
                      x: {
                        grid: {
                          display: false,
                        },
                        ticks: {
                          color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                          autoSkip: true,
                          maxTicksLimit: 10,
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        bodyColor: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                        callbacks: {
                          label: function(context) {
                            let label = 'Volume: ';
                            const value = context.parsed.y;
                            if (value >= 1000000) {
                              return label + (value / 1000000).toFixed(2) + 'M';
                            } else if (value >= 1000) {
                              return label + (value / 1000).toFixed(2) + 'K';
                            }
                            return label + value;
                          }
                        }
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* No Data Message */}
          {!loading && !error && ticker && prices.length === 0 && (
            <div className="text-center p-10">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium">No data available</h3>
              <p className="mt-1 text-sm text-gray-500">Try a different ticker symbol or time range.</p>
            </div>
          )}

          {/* Welcome Message */}
          {!ticker && (
            <div className="text-center p-10">
              <svg className="mx-auto h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="mt-2 text-xl font-medium">Welcome to Stock Market Analysis</h3>
              <p className="mt-1 text-sm text-gray-500">Enter a ticker symbol above to get started.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {['AAPL', 'MSFT', 'GOOGL', 'AMZN'].map((suggestedTicker) => (
                  <button
                    key={suggestedTicker}
                    onClick={() => setTicker(suggestedTicker)}
                    className={`px-4 py-2 border ${theme.borderColor} rounded-md text-sm font-medium ${theme.buttonBgColor} text-white hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    {suggestedTicker}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-8 pb-4">
          <p>© {new Date().getFullYear()} Stock Market Analysis Tool</p>
          <p className="mt-1">Data provided for informational purposes only. Not financial advice.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;