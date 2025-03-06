import os
from flask import Flask, request, render_template, session, jsonify
from markupsafe import Markup
import requests
from openai import OpenAI
import feedparser
from datetime import datetime, timedelta, timezone
import logging

app = Flask(__name__)
app.secret_key = "supersecretkey"
app.config["SESSION_TYPE"] = "filesystem"

logging.basicConfig(level=logging.INFO)

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
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin}&vs_currency=usd"
    response = requests.get(url).json()
    return response.get(coin, {}).get("usd", "Price unavailable")

def get_trending_crypto():
    url = "https://api.coingecko.com/api/v3/search/trending"
    try:
        response = requests.get(url).json()
        coins = response.get("coins", [])[:3]
        trends = []
        for coin in coins:
            item = coin["item"]
            trends.append({
                "topic": item["name"],
                "snippet": f"Trending on CoinGecko - Rank {item['market_cap_rank']}",
                "link": f"https://www.coingecko.com/en/coins/{item['id']}"
            })
        return trends
    except Exception as e:
        app.logger.error(f"Trending fetch failed: {str(e)}")
        return [{"topic": "Error", "snippet": "Could not fetch trends", "link": "#"}]

def get_x_profiles():
    return [
        {"name": "Bitcoin", "link": "https://x.com/Bitcoin"},
        {"name": "Ethereum", "link": "https://x.com/ethereum"},
        {"name": "Solana", "link": "https://x.com/Solana"}
    ]

def get_news_items():
    feedparser.USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    feed = feedparser.parse("https://coinjournal.net/feed/")
    app.logger.info(f"RSS Feed Status: {str(feed.status)}")
    app.logger.info(f"RSS Feed Entries: {str(len(feed.entries))}")
    if feed.status != 200 or not feed.entries:
        return [{"title": "News unavailable - check back later!", "link": "#"}]
    return [{"title": entry.title, "link": entry.link} for entry in feed.entries[:3]]

def get_wallet_analytics(address):
    analytics = {}
    if is_bitcoin_address(address):
        try:
            btc_url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}/balance"
            btc_response = requests.get(btc_url).json()
            balance_sat = btc_response.get("balance", 0)
            balance_btc = balance_sat / 1e8
            tx_count = btc_response.get("n_tx", 0)
            hot_wallet = "Yes" if tx_count > 50 else "No"
            analytics = {
                "chain": "Bitcoin",
                "balance": f"{balance_btc:.8f} BTC",
                "tx_count": tx_count,
                "gas_spent": "N/A",
                "top_tokens": "N/A",
                "hot_wallet": hot_wallet
            }
        except Exception as e:
            app.logger.error(f"BTC analytics failed: {str(e)}")
            return {"error": "Could not fetch Bitcoin analytics"}
    elif is_wallet_address(address):
        try:
            eth_url = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
            payload = {"jsonrpc": "2.0", "method": "eth_getBalance", "params": [address, "latest"], "id": 1}
            balance_response = requests.post(eth_url, json=payload).json()
            balance_wei = int(balance_response["result"], 16)
            balance_eth = balance_wei / 1e18
            payload = {"jsonrpc": "2.0", "method": "eth_getTransactionCount", "params": [address, "latest"], "id": 1}
            tx_response = requests.post(eth_url, json=payload).json()
            tx_count = int(tx_response["result"], 16)
            gas_spent_wei = 0
            eth_price = get_crypto_price("ethereum")
            gas_spent_usd = "N/A" if eth_price == "Price unavailable" else f"${(gas_spent_wei / 1e18 * float(eth_price)):.2f}"
            usdt_contract = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
            payload = {"jsonrpc": "2.0", "method": "eth_call", "params": [{"to": usdt_contract, "data": f"0x70a08231000000000000000000000000{address[2:]}"}, "latest"], "id": 1}
            token_response = requests.post(eth_url, json=payload).json()
            usdt_balance = int(token_response["result"], 16) / 1e6 if "result" in token_response else 0
            top_tokens = f"ETH, USDT ({usdt_balance:.2f})" if usdt_balance > 0 else "ETH only"
            hot_wallet = "Yes" if tx_count > 50 else "No"
            analytics = {
                "chain": "Ethereum",
                "balance": f"{balance_eth:.4f} ETH",
                "tx_count": tx_count,
                "gas_spent": gas_spent_usd,
                "top_tokens": top_tokens,
                "hot_wallet": hot_wallet
            }
        except Exception as e:
            app.logger.error(f"ETH analytics failed: {str(e)}")
            return {"error": "Could not fetch Ethereum analytics"}
    elif is_solana_address(address):
        try:
            sol_url = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
            payload = {"jsonrpc": "2.0", "method": "getBalance", "params": [address], "id": 1}
            balance_response = requests.post(sol_url, json=payload).json()
            if "result" not in balance_response:
                app.logger.error(f"Solana balance response missing 'result': {balance_response}")
                return {"error": "Invalid Solana address or API error"}
            balance_lamports = balance_response["result"]["value"]
            balance_sol = balance_lamports / 1e9
            payload = {"jsonrpc": "2.0", "method": "getSignaturesForAddress", "params": [address, {"limit": 1000}], "id": 1}
            tx_response = requests.post(sol_url, json=payload).json()
            if "result" not in tx_response:
                app.logger.error(f"Solana tx response missing 'result': {tx_response}")
                return {"error": "Could not fetch Solana transaction data"}
            tx_count = len(tx_response["result"])
            hot_wallet = "Yes" if tx_count > 50 else "No"
            analytics = {
                "chain": "Solana",
                "balance": f"{balance_sol:.4f} SOL",
                "tx_count": tx_count,
                "gas_spent": "N/A",
                "top_tokens": "SOL only (more coming soon)",
                "hot_wallet": hot_wallet
            }
        except Exception as e:
            app.logger.error(f"SOL analytics failed: {str(e)}")
            return {"error": "Could not fetch Solana analytics"}
    else:
        return {"error": "Invalid wallet address"}
    return analytics

def get_historical_balance(address, chain):
    balances = []
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    if chain == "Bitcoin":
        url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}/full?limit=50"
        response = requests.get(url).json()
        txs = response.get("txs", [])
        balance = response.get("balance", 0) / 1e8
        daily_balances = {}
        sorted_txs = sorted(
            [tx for tx in txs if "received" in tx],
            key=lambda x: datetime.fromisoformat(x["received"].replace("Z", "+00:00"))
        )
        for tx in sorted_txs:
            try:
                timestamp = datetime.fromisoformat(tx["received"].replace("Z", "+00:00"))
                if timestamp < thirty_days_ago:
                    continue
                day = timestamp.strftime("%Y-%m-%d")
                if tx["inputs"][0]["addresses"][0] == address:
                    balance -= sum(output["value"] for output in tx["outputs"]) / 1e8
                else:
                    balance += tx["total"] / 1e8
                daily_balances[day] = balance
            except ValueError as e:
                app.logger.error(f"Invalid timestamp format in tx: {tx}, error: {e}")
                continue
        for day in [thirty_days_ago + timedelta(days=x) for x in range(31)]:
            day_str = day.strftime("%Y-%m-%d")
            balances.append({"date": day_str, "balance": daily_balances.get(day_str, balance)})
    elif chain == "Ethereum":
        eth_url = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
        payload = {
            "jsonrpc": "2.0",
            "method": "alchemy_getAssetTransfers",
            "params": [{"fromAddress": address, "toAddress": address, "maxCount": "0x3e8"}],
            "id": 1
        }
        response = requests.post(eth_url, json=payload).json()
        transfers = response.get("result", {}).get("transfers", [])
        balance = float(get_wallet_analytics(address)["balance"].split()[0])
        daily_balances = {}
        for transfer in sorted(transfers, key=lambda x: int(x["blockNum"], 16)):
            timestamp = datetime.fromtimestamp(int(transfer["blockNum"], 16))
            if timestamp < thirty_days_ago:
                continue
            day = timestamp.strftime("%Y-%m-%d")
            value = float(transfer["value"]) if transfer["asset"] == "ETH" else 0
            if transfer["from"].lower() == address.lower():
                balance -= value
            else:
                balance += value
            daily_balances[day] = balance
        for day in [thirty_days_ago + timedelta(days=x) for x in range(31)]:
            day_str = day.strftime("%Y-%m-%d")
            balances.append({"date": day_str, "balance": daily_balances.get(day_str, balance)})
    elif chain == "Solana":
        sol_url = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
        payload = {"jsonrpc": "2.0", "method": "getSignaturesForAddress", "params": [address, {"limit": 100}], "id": 1}
        response = requests.post(sol_url, json=payload).json()
        signatures = response.get("result", [])
        balance = float(get_wallet_analytics(address)["balance"].split()[0])
        daily_balances = {}
        for sig in sorted(signatures, key=lambda x: x["blockTime"]):
            timestamp = datetime.fromtimestamp(sig["blockTime"])
            if timestamp < thirty_days_ago:
                continue
            day = timestamp.strftime("%Y-%m-%d")
            balance_change = 0.001  # Placeholder
            balance -= balance_change
            daily_balances[day] = balance
        for day in [thirty_days_ago + timedelta(days=x) for x in range(31)]:
            day_str = day.strftime("%Y-%m-%d")
            balances.append({"date": day_str, "balance": daily_balances.get(day_str, balance)})
    return balances

def get_top_coins():
    url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true"
    response = requests.get(url).json()
    coins = []
    for coin in response:
        coins.append({
            "id": coin["id"],
            "name": coin["name"],
            "image": coin["image"],
            "price": f"{coin['current_price']:.2f}",
            "market_cap": f"{coin['market_cap']:,}",
            "change": round(coin["price_change_percentage_24h"], 2),
            "sparkline": coin["sparkline_in_7d"]["price"]
        })
    return coins

def get_coin_graph(coin_id):
    # Check if cached in session and not expired
    cache_key = f"coin_graph_{coin_id}"
    if cache_key in session:
        cached = session[cache_key]
        if cached["timestamp"] > datetime.now(timezone.utc) - timedelta(minutes=5):
            return cached["data"]
    
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart?vs_currency=usd&days=7&interval=daily"
    try:
        response = requests.get(url).json()
        if "prices" not in response:
            app.logger.error(f"No 'prices' in CoinGecko response for {coin_id}: {response}")
            now = datetime.now(timezone.utc)
            dates = [(now - timedelta(days=x)).strftime("%Y-%m-%d") for x in range(7)][::-1]
            prices = [0] * 7
        else:
            prices = response["prices"]
            dates = [datetime.fromtimestamp(p[0] / 1000).strftime("%Y-%m-%d") for p in prices]
            values = [p[1] for p in prices]
            prices = values
        graph_data = {"dates": dates, "prices": prices}
        # Cache it
        session[cache_key] = {"data": graph_data, "timestamp": datetime.now(timezone.utc)}
        return graph_data
    except Exception as e:
        app.logger.error(f"CoinGecko API failed for {coin_id}: {str(e)}")
        now = datetime.now(timezone.utc)
        dates = [(now - timedelta(days=x)).strftime("%Y-%m-%d") for x in range(7)][::-1]
        prices = [0] * 7
        graph_data = {"dates": dates, "prices": prices}
        session[cache_key] = {"data": graph_data, "timestamp": datetime.now(timezone.utc)}
        return graph_data

@app.route("/graph_data/<address>/<chain>")
def graph_data(address, chain):
    balances = get_historical_balance(address, chain)
    return jsonify(balances)

@app.route("/coin_graph/<coin_id>")
def coin_graph(coin_id):
    graph_data = get_coin_graph(coin_id)
    return jsonify(graph_data)

@app.route("/")
def home():
    session["history"] = session.get("history", [])
    news_items = get_news_items()
    top_coins = get_top_coins()
    return render_template("index.html", history=session["history"], news_items=news_items, trends=get_trending_crypto(), x_profiles=get_x_profiles(), top_coins=top_coins)

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/how-it-works")
def how_it_works():
    return render_template("how_it_works.html")

@app.route("/query", methods=["POST"])
def query():
    user_question = request.form["question"].strip()
    normalized_question = normalize_question(user_question)
    eth_url = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
    sol_url = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"

    if is_bitcoin_address(user_question) or is_wallet_address(user_question) or is_solana_address(user_question):
        analytics = get_wallet_analytics(user_question)
        if "error" in analytics:
            answer = analytics["error"]
            wallet_data = None
        else:
            chain = analytics["chain"]
            address = user_question
            answer = Markup(f"""
            <div id="analytics">
                <h3>Wallet Analytics ({chain})</h3>
                <p>Balance: {analytics['balance']}</p>
                <p>Transactions (30 days): {analytics['tx_count']}</p>
                <p>Gas Spent: {analytics['gas_spent']}</p>
                <p>Top Tokens: {analytics['top_tokens']}</p>
                <p>Hot Wallet: {analytics['hot_wallet']}</p>
                <canvas id="balanceChart" width="400" height="200"></canvas>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <script>
                    fetch('/graph_data/{address}/{chain}')
                        .then(response => response.json())
                        .then(data => {{
                            const ctx = document.getElementById('balanceChart').getContext('2d');
                            const chainColors = {{
                                'Bitcoin': '#f7931a',
                                'Ethereum': '#3498db',
                                'Solana': '#9945ff'
                            }};
                            new Chart(ctx, {{
                                type: 'line',
                                data: {{
                                    labels: data.map(d => d.date),
                                    datasets: [{{
                                        label: 'Balance History',
                                        data: data.map(d => d.balance),
                                        borderColor: chainColors['{chain}'],
                                        tension: 0.1,
                                        fill: false
                                    }}]
                                }},
                                options: {{
                                    scales: {{ y: {{ beginAtZero: true }} }},
                                    plugins: {{ tooltip: {{ mode: 'index', intersect: false }} }}
                                }}
                            }});
                        }});
                </script>
            </div>
            """)
            wallet_data = {"address": address, "chain": chain}
        history = session.get("history", [])
        history.insert(0, {"question": user_question, "answer": Markup(f"Wallet Analytics ({analytics['chain']})<br>Balance: {analytics['balance']}<br>Transactions (30 days): {analytics['tx_count']}<br>Gas Spent: {analytics['gas_spent']}<br>Top Tokens: {analytics['top_tokens']}<br>Hot Wallet: {analytics['hot_wallet']}") if wallet_data else answer, "wallet_data": wallet_data})
        session["history"] = history[:5]
        news_items = get_news_items()
        top_coins = get_top_coins()
        return render_template("index.html", answer=answer, question=user_question, history=session["history"], news_items=news_items, trends=get_trending_crypto(), x_profiles=get_x_profiles(), top_coins=top_coins)
    elif "price" in normalized_question:
        if "bitcoin" in normalized_question:
            price = get_crypto_price("bitcoin")
            answer = f"The current Bitcoin price is ${price} USD."
        elif "ethereum" in normalized_question:
            price = get_crypto_price("ethereum")
            answer = f"The current Ethereum price is ${price} USD."
        elif "solana" in normalized_question:
            price = get_crypto_price("solana")
            answer = f"The current Solana price is ${price} USD."
        else:
            answer = "Sorry, I can only check Bitcoin, Ethereum, or Solana prices for now!"
    elif "trending" in normalized_question or "buzz" in normalized_question:
        trends = get_trending_crypto()
        answer = Markup("Here is what's trending in crypto right now:<br>" + "<br>".join([f"{t['topic']}: {t['snippet']} (<a href='{t['link']}' target='_blank'>See Post Now</a>)" for t in trends]))
    elif "gas" in normalized_question:
        payload = {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 1}
        response = requests.post(eth_url, json=payload).json()
        if "result" in response:
            gas_price = int(response["result"], 16) / 1e9
            answer = f"The current Ethereum gas price is {gas_price} Gwei."
        else:
            answer = "Oops! Could not fetch gas price."
    elif "transactions" in normalized_question or "many" in normalized_question:
        block_payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
        block_response = requests.post(eth_url, json=block_payload).json()
        if "result" in block_response:
            latest_block = block_response["result"]
            payload = {"jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": [latest_block, False], "id": 1}
            block_data = requests.post(eth_url, json=payload).json()
            if "result" in block_data and "transactions" in block_data["result"]:
                tx_count = len(block_data["result"]["transactions"])
                answer = f"The latest Ethereum block has {tx_count} transactions."
            else:
                answer = "Oops! Could not fetch transaction data."
        else:
            answer = "Oops! Could not fetch block data."
    elif "ethereum block" in normalized_question:
        payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
        response = requests.post(eth_url, json=payload).json()
        if "result" in response:
            block_number = int(response["result"], 16)
            answer = f"The latest Ethereum block number is {block_number}."
        else:
            answer = "Oops! Could not fetch Ethereum block data."
    elif "bitcoin block" in normalized_question:
        try:
            btc_response = requests.get("https://blockchain.info/latestblock").json()
            if "height" in btc_response:
                block_number = btc_response["height"]
                answer = f"The latest Bitcoin block number is {block_number}."
            else:
                answer = "Oops! Could not fetch Bitcoin data."
        except Exception as e:
            app.logger.error(f"Bitcoin block query failed: {str(e)}")
            answer = "Something went wrong with Bitcoin - try again!"
    elif "solana block" in normalized_question:
        payload = {"jsonrpc": "2.0", "method": "getSlot", "params": [], "id": 1}
        response = requests.post(sol_url, json=payload).json()
        if "result" in response:
            slot_number = response["result"]
            answer = f"The latest Solana slot number is {slot_number}."
        else:
            answer = "Oops! Could not fetch Solana slot data."
    else:
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": f"Answer this about crypto: {user_question}"}],
                max_tokens=100
            )
            answer = response.choices[0].message.content
        except Exception as e:
            answer = f"Sorry, I had trouble answering that: {str(e)}"

    history = session.get("history", [])
    history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
    session["history"] = history[:5]
    news_items = get_news_items()
    top_coins = get_top_coins()
    return render_template("index.html", answer=answer, question=user_question, history=session["history"], news_items=news_items, trends=get_trending_crypto(), x_profiles=get_x_profiles(), top_coins=top_coins)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)