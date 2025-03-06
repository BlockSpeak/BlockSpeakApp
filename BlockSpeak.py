import os
from flask import Flask, request, render_template, session, jsonify
from markupsafe import Markup
import requests
from openai import OpenAI
import feedparser
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = "supersecretkey"
app.config["SESSION_TYPE"] = "filesystem"

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
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin}&vs_currencies=usd"
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
            gas_spent_wei = 0  # Placeholder
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
    now = datetime.now()
    thirty_days_ago = now - timedelta(days=30)
    if chain == "Bitcoin":
        url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}/full?limit=50"
        response = requests.get(url).json()
        txs = response.get("txs", [])
        balance = response.get("balance", 0) / 1e8
        daily_balances = {}
        # Sort transactions by "received" timestamp
        sorted_txs = sorted([tx for tx in txs if "received" in tx], key=lambda x: datetime.fromisoformat(x["received"].replace("Z", "+00:00")))
        for tx in sorted_txs:
            timestamp = datetime.fromisoformat(tx["received"].replace("Z", "+00:00"))
            if timestamp < thirty_days_ago:
                continue
            day = timestamp.strftime("%Y-%m-%d")
            if tx["inputs"][0]["addresses"][0] == address:
                balance -= sum(output["value"] for output in tx["outputs"]) / 1e8
            else:
                balance += tx["total"] / 1e8
            daily_balances[day] = balance
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
            balance_change = 0.001  # Placeholder; real tx parsing TBD
            balance -= balance_change
            daily_balances[day] = balance
        for day in [thirty_days_ago + timedelta(days=x) for x in range(31)]:
            day_str = day.strftime("%Y-%m-%d")
            balances.append({"date": day_str, "balance": daily_balances.get(day_str, balance)})
    return balances

@app.route("/graph_data/<address>/<chain>")
def graph_data(address, chain):
    balances = get_historical_balance(address, chain)
    return jsonify(balances)

@app.route("/")
def home():
    session["history"] = session.get("history", [])
    news_items = get_news_items()
    return render_template("index.html", history=session["history"], news_items=news_items, trends=get_trending_crypto(), x_profiles=get_x_profiles())

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
    eth_url = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
    sol_url = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"

    if is_bitcoin_address(user_question) or is_wallet_address(user_question) or is_solana_address(user_question):
        analytics = get_wallet_analytics(user_question)
        if "error" in analytics:
            answer = analytics["error"]
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
        history = session.get("history", [])
        history.insert(0, {"question": user_question, "answer": answer})
        session["history"] = history[:5]
        news_items = get_news_items()
        return render_template("index.html", answer=answer, question=user_question, history=session["history"], news_items=news_items, trends=get_trending_crypto(), x_profiles=get_x_profiles())
    return render_template("index.html", answer="Sorry, I can only analyze wallet addresses right now!", question=user_question, history=session["history"])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)