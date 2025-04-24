const express = require('express');
const cors = require('cors');
const axios = require('axios');

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
        // 1m interval is only supported for the last 1 day, 5 days or 1 week
        if (range !== '1d' && range !== '5d' && range !== '1wk') {
            return res.status(400).json({ error: '1m interval is only available for 1d, 5d, or 1wk range.' });
        }
    }

    // Handle other intraday intervals (2m, 5m, 15m, 30m, 60m, 90m, 1h) limitation
    if (['2m', '5m', '15m', '30m', '60m', '90m', '1h'].includes(interval)) {
        // These intraday intervals are only available up to a range of 60 days
        if (parseInt(range) > 60) {
            return res.status(400).json({ error: 'These intraday intervals (2m, 5m, 15m, 30m, 60m, 90m, 1h) are only available up to a range of 60 days.' });
        }
    }

    try {
        // Fetch stock price data
        const stockResponse = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`);
        const chartData = stockResponse.data.chart.result[0];

        if (!chartData) {
            return res.status(500).json({ error: `No stock data found for ticker: ${ticker}` });
        }

        const prices = chartData.indicators.quote[0].close;
        const timestamps = chartData.timestamp;
        const volumes = chartData.indicators.quote[0].volume || [];

        // Fetch options data
        const optionsResponse = await axios.get(`https://query1.finance.yahoo.com/v7/finance/options/${ticker}`);
        const optionsData = optionsResponse.data.optionChain.result[0];

        if (!optionsData) {
            return res.status(500).json({ error: `No options data found for ticker: ${ticker}` });
        }

        // Extract expiration dates and options (calls/puts)
        const expirationDates = optionsData.expirationDates;
        const options = optionsData.options;

        // Send combined data: stock prices + options data
        res.json({
            prices,
            timestamps,
            volumes,
            expirationDates,
            options
        });

    } catch (err) {
        console.error("Error details:", err.response || err); // Log the error response from axios
        res.status(500).json({ error: 'Failed to fetch stock or options data', details: err.message });
    }
});

app.listen(3001, () => {
    console.log('✅ Backend running at http://localhost:3001');
});
