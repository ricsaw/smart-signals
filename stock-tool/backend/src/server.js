const express = require('express');
const cors = require('cors');
const axios = require('axios');
const technicalindicators = require('technicalindicators'); // Import technical indicators package

const app = express();
app.use(cors());

app.get('/api/stock/:ticker', async (req, res) => {
    const { ticker } = req.params;
    const { range = '30d', interval = '1h' } = req.query;

    // Handle supported intervals
    const validIntervals = [
        '1m', '2m', '5m', '15m', '30m', '60m', '90m', 
        '1h', '1d', '5d', '1wk', '1mo', '3mo', '6mo', '1y'
    ];

    if (!validIntervals.includes(interval)) {
        return res.status(400).json({ error: 'Invalid interval' });
    }

    // Handle specific limitations for 1m interval
    if (interval === '1m') {
        if (range !== '1d' && range !== '5d' && range !== '1wk') {
            return res.status(400).json({ error: '1m interval is only available for 1d, 5d, or 1wk range.' });
        }
    }

    // Handle other intraday intervals (2m, 5m, 15m, 30m, 60m, 90m, 1h) limitation
    if (['2m', '5m', '15m', '30m', '60m', '90m', '1h'].includes(interval)) {
        if (parseInt(range) > 60) {
            return res.status(400).json({ error: 'These intraday intervals (2m, 5m, 15m, 30m, 60m, 90m, 1h) are only available up to a range of 60 days.' });
        }
    }

    try {
        // Fetch stock data from Yahoo Finance
        const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`);
        const chartData = response.data.chart.result[0];

        const prices = chartData.indicators.quote[0].close;
        const timestamps = chartData.timestamp;
        const volumes = chartData.indicators.quote[0].volume || [];

        // Calculate indicators
        const sma = technicalindicators.sma({ period: 14, values: prices });  // Simple Moving Average (SMA)
        const ema = technicalindicators.ema({ period: 14, values: prices });  // Exponential Moving Average (EMA)
        const rsi = technicalindicators.rsi({ period: 14, values: prices });  // Relative Strength Index (RSI)

        // Example for other indicators (e.g., Bollinger Bands)
        const bb = technicalindicators.bollingerbands({ 
            period: 14, 
            values: prices, 
            stdDev: 2 
        });

        // Send the data along with indicators
        res.json({
            prices,
            timestamps,
            volumes,
            sma,
            ema,
            rsi,
            bb  // Bollinger Bands (includes upper, middle, and lower bands)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

app.listen(3001, () => {
  console.log('✅ Backend running at http://localhost:3001');
});
