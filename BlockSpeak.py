import os
from flask import Flask, request, render_template, session
import requests
from openai import OpenAI
import feedparser

app = Flask(__name__)
app.secret_key = "supersecretkey"  # For session

ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

def is_wallet_address(text):
    return text.startswith("0x") and len(text) == 42

def get_news_items():
    feedparser.USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    feed = feedparser.parse("https://coinjournal.net/feed/")
    app.logger.info("RSS Feed Status: " + str(feed.status))
    app.logger.info("RSS Feed Entries: " + str(len(feed.entries)))
    if feed.status != 200 or not feed.entries:
        return [{"title": "News unavailable - check back later!", "link": "#"}]
    return [{"title": entry.title, "link": entry.link} for entry in feed.entries[:3]]

@app.route('/')
def home():
    last_query = session.get('last_query', None)
    news_items = get_news_items()
    return render_template('index.html', last_query=last_query, news_items=news_items)

@app.route('/query', methods=['POST'])
def query():
    user_question = request.form['question'].lower().strip()
    url = "https://eth-mainnet.g.alchemy.com/v2/" + ALCHEMY_API_KEY

    if is_wallet_address(user_question):
        payload = {"jsonrpc": "2.0", "method": "eth_getBalance", "params": [user_question, "latest"], "id": 1}
    elif "gas" in user_question:
        payload = {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 1}
    elif "transactions" in user_question or "many" in user_question:
        block_payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
        block_response = requests.post(url, json=block_payload).json()
        if 'result' in block_response:
            latest_block = block_response['result']
            payload = {"jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": [latest_block, False], "id": 1}
        else:
            last_query = session.get('last_query', None)
            news_items = get_news_items()
            return render_template('index.html', answer="Oops! Could not fetch block data.", question=user_question, last_query=last_query, news_items=news_items)
    elif "bitcoin" in user_question:
        try:
            btc_response = requests.get("https://blockchain.info/latestblock").json()
            if 'height' in btc_response:
                block_number = btc_response['height']
                prompt = "User asked: '" + user_question + "'. Latest Bitcoin block number is " + str(block_number) + ". Answer simply."
                ai_response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}]
                )
                answer = ai_response.choices[0].message.content
                last_query = session.get('last_query', None)
                session['last_query'] = {'question': user_question, 'answer': answer}
                news_items = get_news_items()
                return render_template('index.html', answer=answer, question=user_question, last_query=last_query, news_items=news_items)
            else:
                last_query = session.get('last_query', None)
                news_items = get_news_items()
                return render_template('index.html', answer="Oops! Could not fetch Bitcoin data.", question=user_question, last_query=last_query, news_items=news_items)
        except Exception as e:
            app.logger.error("Bitcoin query failed: " + str(e))
            last_query = session.get('last_query', None)
            news_items = get_news_items()
            return render_template('index.html', answer="Something went wrong with Bitcoin - try again!", question=user_question, last_query=last_query, news_items=news_items)
    else:
        payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
    
    try:
        response = requests.post(url, json=payload).json()
        app.logger.info("Alchemy Response: " + str(response))
        if 'result' in response:
            if is_wallet_address(user_question):
                balance_wei = int(response['result'], 16)
                balance_eth = balance_wei / 1e18
                prompt = "User asked for balance of '" + user_question + "'. Wallet balance is " + str(balance_eth) + " ETH. Answer simply."
            elif "gas" in user_question:
                gas_price = int(response['result'], 16) / 1e9
                prompt = "User asked: '" + user_question + "'. Current Ethereum gas price is " + str(gas_price) + " Gwei. Answer simply."
            elif "transactions" in user_question or "many" in user_question:
                tx_count = len(response['result']['transactions'])
                prompt = "User asked: '" + user_question + "'. The latest Ethereum block has " + str(tx_count) + " transactions. Answer simply."
            else:
                block_number = int(response['result'], 16)
                prompt = "User asked: '" + user_question + "'. Latest Ethereum block number is " + str(block_number) + ". Answer simply."
        else:
            app.logger.error("No 'result' in response: " + str(response))
            last_query = session.get('last_query', None)
            news_items = get_news_items()
            return render_template('index.html', answer="Oops! Blockchain data unavailable - try again.", question=user_question, last_query=last_query, news_items=news_items)
        ai_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        answer = ai_response.choices[0].message.content
        last_query = session.get('last_query', None)
        session['last_query'] = {'question': user_question, 'answer': answer}
        news_items = get_news_items()
        return render_template('index.html', answer=answer, question=user_question, last_query=last_query, news_items=news_items)
    except Exception as e:
        app.logger.error("Query failed: " + str(e))
        last_query = session.get('last_query', None)
        news_items = get_news_items()
        return render_template('index.html', answer="Something went wrong - try again later!", question=user_question, last_query=last_query, news_items=news_items)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8080, debug=True)