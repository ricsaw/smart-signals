# fetch_options.py
import yfinance as yf
import sys
import json

# Fetch the stock ticker from the command line argument
ticker = sys.argv[1]

# Get the stock data using yfinance
stock = yf.Ticker(ticker)

# Fetch the expiration dates and option data
expiration_dates = stock.options
options_data = {}

for date in expiration_dates:
    calls = stock.option_chain(date).calls.to_dict(orient='records')
    puts = stock.option_chain(date).puts.to_dict(orient='records')
    options_data[date] = {'calls': calls, 'puts': puts}

# Print the options data in JSON format
print(json.dumps(options_data))
