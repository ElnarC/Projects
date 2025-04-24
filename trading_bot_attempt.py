import requests
from bs4 import BeautifulSoup
import pandas as pd
from transformers import pipeline
from datetime import datetime

# Initialize the sentiment analysis pipeline
sentiment_analysis = pipeline("sentiment-analysis")

def get_latest_price(coin_id):
    """Fetch the latest price for a given cryptocurrency using the CoinGecko API."""
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd"
    response = requests.get(url)
    data = response.json()
    return data.get(coin_id, {}).get('usd', 0)

def fetch_yahoo_finance_news():
    """Fetch recent news headlines related to cryptocurrency from Yahoo Finance."""
    url = "https://finance.yahoo.com/topic/crypto/"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    headlines = soup.find_all('h3', class_='Mb(5px)')
    news_list = [headline.text for headline in headlines if 'MATIC' in headline.text]
    return news_list

def analyze_news_headline(headline):
    """Analyze the sentiment of a news headline."""
    sentiment = sentiment_analysis(headline)[0]
    return sentiment['label'], sentiment['score']

def make_decision(price, sentiment_label):
    """Make a buy or sell decision based on the sentiment label and price."""
    if sentiment_label == "POSITIVE":
        decision = "Buy"
    elif sentiment_label == "NEGATIVE":
        decision = "Sell"
    else:
        decision = "Hold"
    return decision, price, sentiment_label

# Example usage
if __name__ == "__main__":
    # Fetch the latest news headlines about MATIC from Yahoo Finance
    headlines = fetch_yahoo_finance_news()
    
    # Initialize lists to store analyzed sentiments
    sentiment_scores = []
    sentiment_labels = []
    
    if not headlines:
        print("No headlines found related to MATIC.")
    else:
        for headline in headlines:
            # Analyze the sentiment of each headline
            sentiment_label, sentiment_score = analyze_news_headline(headline)
            sentiment_labels.append(sentiment_label)
            sentiment_scores.append(sentiment_score)
        
        # Get the latest price of MATIC
        matic_price = get_latest_price('matic-network')
        print(f"Latest MATIC Price: ${matic_price}")
        
        if sentiment_scores:
            # Display analyzed headlines and their sentiments
            print("\nAnalyzing headlines related to MATIC:")
            for headline, label, score in zip(headlines, sentiment_labels, sentiment_scores):
                print(f"\nHeadline: {headline}")
                print(f"Sentiment: {label} | Score: {score}")
            
            # Make a decision based on the sentiment and price
            overall_sentiment_score = sum(sentiment_scores) / len(sentiment_scores)
            overall_sentiment_label, _ = analyze_news_headline(" ".join(headlines))
            decision, price, sentiment = make_decision(matic_price, overall_sentiment_label)
            
            # Print overall decision
            print(f"\nOverall Decision: {decision} | Price: ${price} | Sentiment: {overall_sentiment_label} | Average Score: {overall_sentiment_score}")
    
            # Log decisions for review
            log_data = pd.DataFrame({
                'Timestamp': [datetime.now()],
                'Decision': [decision],
                'Price': [price],
                'SentimentScore': [overall_sentiment_score],
                'Headlines': [headlines]
            })
            print(log_data)
        else:
            print("No sentiment scores available due to no headlines analyzed.")

