import os
from flask import Flask, request, render_template, session
import requests
from openai import OpenAI
import feedparser

app = Flask(__name__)
app.secret_key = "supersecretkey"  # For session
app.config["SESSION_TYPE"] = "filesystem"  # For history persistence

ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

def is_bitcoin_address(text):
    return (text.startswith("1") or text.startswith("3") or text.startswith("bc1")) and 26 <= len(text) <= 35

def is_wallet_address(text):
    return text.startswith("0x") and len(text) == 42

def is_solana_address(text):
    return len(text) == 44 and all(c in "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" for c in text)

def normalize_question(text):
    text = text.lower().strip()
    if "gas" in text:
        return "gas"
    elif "solona" in text or "solana" in text or "sol" in text:
        return "solana block" if "block" in text else "solana price"
    elif "bitcoin" in text or "btc" in text:
        return "bitcoin block" if "block" in text else "bitcoin price"
    elif "eth" in text or "ethereum" in text:
        return "ethereum block" if "block" in text else "ethereum price"
    return text

def get_crypto_price(coin):
    url = "https://api.coingecko.com/api/v3/simple/price?ids=" + coin + "&vs_currencies=usd"
    response = requests.get(url).json()
    return response.get(coin, {}).get("usd", "Price unavailable")

def get_trending_crypto():
    url = "https://api.coingecko.com/api/v3/search/trending"
    try:
        response = requests.get(url).json()
        coins = response.get("coins", [])[:3]  # Top 3 trending
        trends = []
        x_links = {
            "bitcoin": "https://x.com/Bitcoin",
            "ethereum": "https://x.com/ethereum",
            "solana": "https://x.com/Solana"
        }
        for coin in coins:
            item = coin["item"]
            coin_id = item["id"].lower()
            x_link = x_links.get(coin_id, "https://www.coingecko.com/en/coins/" + item["id"])
            trends.append({
                "topic": item["name"],
                "snippet": "Trending on CoinGecko - Rank " + str(item["market_cap_rank"]),
                "link": x_link
            })
        return trends
    except Exception as e:
        app.logger.error("Trending fetch failed: " + str(e))
        return [{"topic": "Error", "snippet": "Could not fetch trends", "link": "#"}]

def get_news_items():
    feedparser.USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    feed = feedparser.parse("https://coinjournal.net/feed/")
    app.logger.info("RSS Feed Status: " + str(feed.status))
    app.logger.info("RSS Feed Entries: " + str(len(feed.entries)))
    if feed.status != 200 or not feed.entries:
        return [{"title": "News unavailable - check back later!", "link": "#"}]
    return [{"title": entry.title, "link": entry.link} for entry in feed.entries[:3]]

@app.route("/")
def home():
    session["history"] = session.get("history", [])  # Init history if not set
    news_items = get_news_items()
    return render_template("index.html", history=session["history"], news_items=news_items, trends=get_trending_crypto())

@app.route("/about")
def about():
    session["history"] = session.get("history", [])
    return render_template("about.html", history=session["history"])

@app.route("/how-it-works")
def how_it_works():
    session["history"] = session.get("history", [])
    return render_template("how_it_works.html", history=session["history"])

@app.route("/query", methods=["POST"])
def query():
    user_question = request.form["question"].strip()
    normalized_question = normalize_question(user_question)
    eth_url = "https://eth-mainnet.g.alchemy.com/v2/" + ALCHEMY_API_KEY
    sol_url = "https://solana-mainnet.g.alchemy.com/v2/" + ALCHEMY_API_KEY

    if is_bitcoin_address(user_question):
        try:
            btc_url = "https://api.blockcypher.com/v1/btc/main/addrs/" + user_question + "/balance"
            btc_response = requests.get(btc_url).json()
            app.logger.info("Bitcoin Balance Response: " + str(btc_response))
            if "balance" in btc_response:
                balance_sat = btc_response["balance"]
                balance_btc = balance_sat / 1e8
                prompt = "User asked for balance of " + user_question + ". Wallet balance is " + str(balance_btc) + " BTC. Answer simply."
                ai_response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}]
                )
                answer = ai_response.choices[0].message.content
                history = session.get("history", [])
                history.insert(0, {"question": user_question, "answer": answer})
                session["history"] = history[:5]
                news_items = get_news_items()
                return render_template("index.html", answer=answer, question=user_question, history=session["history"], news_items=news_items, trends=get_trending_crypto())
            else:
                history = session.get("history", [])
                news_items = get_news_items()
                return render_template("index.html", answer="Oops! Invalid Bitcoin address or no data.", question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())
        except Exception as e:
            app.logger.error("Bitcoin balance query failed: " + str(e))
            history = session.get("history", [])
            news_items = get_news_items()
            return render_template("index.html", answer="Something went wrong with Bitcoin balance - try again!", question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())
    elif is_wallet_address(user_question):
        payload = {"jsonrpc": "2.0", "method": "eth_getBalance", "params": [user_question, "latest"], "id": 1}
        url = eth_url
    elif is_solana_address(user_question):
        payload = {"jsonrpc": "2.0", "method": "getBalance", "params": [user_question], "id": 1}
        url = sol_url
    elif "price" in normalized_question:
        if "bitcoin" in normalized_question:
            price = get_crypto_price("bitcoin")
            answer = "The current Bitcoin price is $" + str(price) + " USD."
        elif "ethereum" in normalized_question:
            price = get_crypto_price("ethereum")
            answer = "The current Ethereum price is $" + str(price) + " USD."
        elif "solana" in normalized_question:
            price = get_crypto_price("solana")
            answer = "The current Solana price is $" + str(price) + " USD."
        else:
            answer = "Sorry, I can only check Bitcoin, Ethereum, or Solana prices for now!"
        history = session.get("history", [])
        history.insert(0, {"question": user_question, "answer": answer})
        session["history"] = history[:5]
        news_items = get_news_items()
        return render_template("index.html", answer=answer, question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())
    elif "trending" in normalized_question or "buzz" in normalized_question:
        trends = get_trending_crypto()
        answer = "Here is what is trending in crypto right now:\n" + "\n".join([t["topic"] + ": " + t["snippet"] + " (See more: " + t["link"] + ")" for t in trends])
        history = session.get("history", [])
        history.insert(0, {"question": user_question, "answer": answer})
        session["history"] = history[:5]
        news_items = get_news_items()
        return render_template("index.html", answer=answer, question=user_question, history=history, news_items=news_items, trends=trends)
    elif "gas" in normalized_question:
        payload = {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 1}
        url = eth_url
    elif "transactions" in normalized_question or "many" in normalized_question:
        block_payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
        block_response = requests.post(eth_url, json=block_payload).json()
        if "result" in block_response:
            latest_block = block_response["result"]
            payload = {"jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": [latest_block, False], "id": 1}
            url = eth_url
        else:
            history = session.get("history", [])
            news_items = get_news_items()
            return render_template("index.html", answer="Oops! Could not fetch block data.", question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())
    elif "bitcoin block" in normalized_question:
        try:
            btc_response = requests.get("https://blockchain.info/latestblock").json()
            if "height" in btc_response:
                block_number = btc_response["height"]
                prompt = "User asked: " + user_question + ". Latest Bitcoin block number is " + str(block_number) + ". Answer simply."
                ai_response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}]
                )
                answer = ai_response.choices[0].message.content
                history = session.get("history", [])
                history.insert(0, {"question": user_question, "answer": answer})
                session["history"] = history[:5]
                news_items = get_news_items()
                return render_template("index.html", answer=answer, question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())
            else:
                history = session.get("history", [])
                news_items = get_news_items()
                return render_template("index.html", answer="Oops! Could not fetch Bitcoin data.", question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())
        except Exception as e:
            app.logger.error("Bitcoin block query failed: " + str(e))
            history = session.get("history", [])
            news_items = get_news_items()
            return render_template("index.html", answer="Something went wrong with Bitcoin - try again!", question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())
    elif "solana block" in normalized_question:
        payload = {"jsonrpc": "2.0", "method": "getSlot", "params": [], "id": 1}
        url = sol_url
    else:
        payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
        url = eth_url
    
    try:
        response = requests.post(url, json=payload).json()
        app.logger.info("Alchemy Response: " + str(response))
        if "result" in response:
            if is_wallet_address(user_question):
                balance_wei = int(response["result"], 16)
                balance_eth = balance_wei / 1e18
                prompt = "User asked for balance of " + user_question + ". Wallet balance is " + str(balance_eth) + " ETH. Answer simply."
            elif is_solana_address(user_question):
                balance_lamports = response["result"]["value"]
                balance_sol = balance_lamports / 1e9
                prompt = "User asked for balance of " + user_question + ". Wallet balance is " + str(balance_sol) + " SOL. Answer simply."
            elif "gas" in normalized_question:
                gas_price = int(response["result"], 16) / 1e9
                prompt = "User asked: " + user_question + ". Current Ethereum gas price is " + str(gas_price) + " Gwei. Answer simply."
            elif "transactions" in normalized_question or "many" in normalized_question:
                tx_count = len(response["result"]["transactions"])
                prompt = "User asked: " + user_question + ". The latest Ethereum block has " + str(tx_count) + " transactions. Answer simply."
            elif "solana block" in normalized_question:
                slot_number = response["result"]
                prompt = "User asked: " + user_question + ". Latest Solana slot number is " + str(slot_number) + ". Answer simply."
            else:
                block_number = int(response["result"], 16)
                prompt = "User asked: " + user_question + ". Latest Ethereum block number is " + str(block_number) + ". Answer simply."
        else:
            app.logger.error("No result in response: " + str(response))
            history = session.get("history", [])
            news_items = get_news_items()
            return render_template("index.html", answer="Oops! Blockchain data unavailable - try again.", question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())
        ai_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        answer = ai_response.choices[0].message.content
        history = session.get("history", [])
        history.insert(0, {"question": user_question, "answer": answer})
        session["history"] = history[:5]
        news_items = get_news_items()
        return render_template("index.html", answer=answer, question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())
    except Exception as e:
        app.logger.error("Query failed: " + str(e))
        history = session.get("history", [])
        news_items = get_news_items()
        return render_template("index.html", answer="Something went wrong - try again later!", question=user_question, history=history, news_items=news_items, trends=get_trending_crypto())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)