import os
import json
import os.path
import sqlite3
from flask import Flask, request, render_template, session, jsonify, redirect, url_for
from markupsafe import Markup
import requests
from openai import OpenAI
import feedparser
from datetime import datetime, timedelta, timezone
import logging
import stripe
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "supersecretkey"
app.config["SESSION_TYPE"] = "filesystem"

logging.basicConfig(level=logging.INFO)

ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")

stripe.api_key = STRIPE_SECRET_KEY
client = OpenAI(api_key=OPENAI_API_KEY)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

def init_db():
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        subscription TEXT DEFAULT 'free',
        stripe_customer_id TEXT
    )''')
    conn.commit()
    conn.close()

init_db()

class User(UserMixin):
    def __init__(self, email, subscription="free", stripe_customer_id=None):
        self.email = email
        self.subscription = subscription
        self.stripe_customer_id = stripe_customer_id
    def get_id(self):
        return self.email

@login_manager.user_loader
def load_user(email):
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute("SELECT email, subscription, stripe_customer_id FROM users WHERE email = ?", (email,))
    user_data = c.fetchone()
    conn.close()
    if user_data:
        return User(user_data[0], user_data[1], user_data[2])
    return None

def is_bitcoin_address(text):
    return (text.startswith("1") or text.startswith("3") or text.startswith("bc1")) and 26 <= len(text) <= 35

def is_wallet_address(text):
    return text.startswith("0x") and len(text) == 42

def is_solana_address(text):
    return len(text) == 44 and all(c in "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" for c in text)

def normalize_question(text):
    text = text.lower().strip()
    if "predict" in text or "price in" in text:
        return "price_prediction"
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
            balance_change = 0.001
            balance -= balance_change
            daily_balances[day] = balance
        for day in [thirty_days_ago + timedelta(days=x) for x in range(31)]:
            day_str = day.strftime("%Y-%m-%d")
            balances.append({"date": day_str, "balance": daily_balances.get(day_str, balance)})
    return balances

def get_top_coins():
    cache_file = "top_coins_cache.json"
    now = datetime.now(timezone.utc)
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            cached = json.load(f)
        if datetime.fromisoformat(cached["timestamp"]) > now - timedelta(minutes=15):
            return cached["data"]
    url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=4&page=1&sparkline=true"
    try:
        response = requests.get(url).json()
        if not isinstance(response, list):
            app.logger.error(f"CoinGecko response not a list: {response}")
            fallback = [
                {"id": "bitcoin", "name": "Bitcoin", "image": "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png", "price": "N/A", "market_cap": "N/A", "change": 0, "sparkline": [0] * 7},
                {"id": "ethereum", "name": "Ethereum", "image": "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png", "price": "N/A", "market_cap": "N/A", "change": 0, "sparkline": [0] * 7},
                {"id": "tether", "name": "Tether", "image": "https://assets.coingecko.com/coins/images/325/thumb/Tether.png", "price": "N/A", "market_cap": "N/A", "change": 0, "sparkline": [0] * 7},
                {"id": "binancecoin", "name": "BNB", "image": "https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "sparkline": [0] * 7}
            ]
            with open(cache_file, "w") as f:
                json.dump({"data": fallback, "timestamp": now.isoformat()}, f)
            return fallback
        coins = []
        for coin in response[:4]:
            coins.append({
                "id": coin["id"],
                "name": coin["name"],
                "image": coin["image"],
                "price": f"{coin['current_price']:.2f}",
                "market_cap": f"{coin['market_cap']:,}",
                "change": round(coin["price_change_percentage_24h"], 2),
                "sparkline": coin["sparkline_in_7d"]["price"]
            })
        with open(cache_file, "w") as f:
            json.dump({"data": coins, "timestamp": now.isoformat()}, f)
        return coins
    except Exception as e:
        app.logger.error(f"CoinGecko top coins failed: {str(e)}")
        fallback = [
            {"id": "bitcoin", "name": "Bitcoin", "image": "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png", "price": "N/A", "market_cap": "N/A", "change": 0, "sparkline": [0] * 7},
            {"id": "ethereum", "name": "Ethereum", "image": "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png", "price": "N/A", "market_cap": "N/A", "change": 0, "sparkline": [0] * 7},
            {"id": "tether", "name": "Tether", "image": "https://assets.coingecko.com/coins/images/325/thumb/Tether.png", "price": "N/A", "market_cap": "N/A", "change": 0, "sparkline": [0] * 7},
            {"id": "binancecoin", "name": "BNB", "image": "https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "sparkline": [0] * 7}
        ]
        with open(cache_file, "w") as f:
            json.dump({"data": fallback, "timestamp": now.isoformat()}, f)
        return fallback

def get_coin_graph(coin_id):
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

def predict_price(coin, days):
    url = f"https://api.coingecko.com/api/v3/coins/{coin}/market_chart?vs_currency=usd&days=30&interval=daily"
    try:
        response = requests.get(url).json()
        if "prices" not in response:
            return "Sorry, couldn't fetch price data for prediction."
        prices = [p[1] for p in response["prices"]]
        avg_change = sum((prices[i] - prices[i-1]) for i in range(1, len(prices))) / (len(prices) - 1)
        current_price = prices[-1]
        predicted = current_price + (avg_change * days)
        return f"Predicted {coin.capitalize()} price in {days} days: ${predicted:.2f} (based on 30-day trend)."
    except Exception as e:
        app.logger.error(f"Price prediction failed for {coin}: {str(e)}")
        return "Sorry, prediction unavailable right now."

@app.route("/graph_data/<address>/<chain>")
def graph_data(address, chain):
    balances = get_historical_balance(address, chain)
    return jsonify(balances)

@app.route("/coin_graph/<coin_id>")
def coin_graph(coin_id):
    graph_data = get_coin_graph(coin_id)
    return jsonify(graph_data)

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        if not "@" in email or not "." in email:
            return render_template("register.html", error="Please enter a valid email.")
        if len(password) < 8:
            return render_template("register.html", error="Password must be at least 8 characters.")
        conn = sqlite3.connect("users.db")
        c = conn.cursor()
        try:
            hashed_password = generate_password_hash(password)
            c.execute("INSERT INTO users (email, password) VALUES (?, ?)", (email, hashed_password))
            conn.commit()
            try:
                customer = stripe.Customer.create(email=email)
                c.execute("UPDATE users SET stripe_customer_id = ? WHERE email = ?", (customer["id"], email))
                conn.commit()
            except stripe.error.StripeError as e:
                app.logger.error(f"Stripe customer creation failed: {str(e)}")
                return render_template("register.html", error="Registration failed - try again later.")
            user = User(email)
            login_user(user)
            return redirect(url_for("home"))
        except sqlite3.IntegrityError:
            return render_template("register.html", error="Email already registered.")
        finally:
            conn.close()
    return render_template("register.html", error=None)

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        conn = sqlite3.connect("users.db")
        c = conn.cursor()
        c.execute("SELECT email, password, subscription, stripe_customer_id FROM users WHERE email = ?", (email,))
        user_data = c.fetchone()
        conn.close()
        if user_data and check_password_hash(user_data[1], password):
            user = User(user_data[0], user_data[2], user_data[3])
            login_user(user)
            return redirect(url_for("home"))
        return render_template("login.html", error="Invalid email or password.")
    return render_template("login.html", error=None)

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("home"))

@app.route("/subscribe", methods=["POST"])
@login_required
def subscribe():
    plan = request.form["plan"]
    if plan == "basic":
        price_id = "price_1QzXTCKv6dFcpMYlxS712fan"
    elif plan == "pro":
        price_id = "price_1QzXY5Kv6dFcpMYluAWw5638"
    else:
        return "Invalid plan", 400
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            customer=current_user.stripe_customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=url_for("subscription_success", plan=plan, _external=True),
            cancel_url=url_for("home", _external=True),
        )
    except stripe.error.StripeError as e:
        app.logger.error(f"Stripe checkout failed: {str(e)}")
        return "Subscription failed - try again later.", 500
    return redirect(checkout_session.url)

@app.route("/subscription_success")
@login_required
def subscription_success():
    plan = request.args.get("plan")
    if plan in ["basic", "pro"]:
        subscriptions = stripe.Subscription.list(customer=current_user.stripe_customer_id)
        if subscriptions.data and subscriptions.data[0].status == "active":
            current_user.subscription = plan
            conn = sqlite3.connect("users.db")
            c = conn.cursor()
            c.execute("UPDATE users SET subscription = ? WHERE email = ?", (plan, current_user.email))
            conn.commit()
            conn.close()
            app.logger.info(f"Subscription confirmed for {current_user.email}: {plan}")
        else:
            app.logger.error(f"Subscription not active for {current_user.email}")
            return "Subscription not confirmed - contact support.", 500
    return redirect(url_for("home"))

@app.route("/")
def home():
    session["history"] = session.get("history", [])
    news_items = get_news_items()
    top_coins = get_top_coins()
    subscription = current_user.subscription if current_user.is_authenticated else "free"
    return render_template("index.html", history=session["history"], news_items=news_items, trends=get_trending_crypto(), x_profiles=get_x_profiles(), top_coins=top_coins, stripe_key=STRIPE_PUBLISHABLE_KEY, subscription=subscription)

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/how-it-works")
def how_it_works():
    return render_template("how_it_works.html")

@app.route("/query", methods=["POST"])
@login_required
def query():
    app.logger.info(f"Query from {current_user.email}, subscription: {current_user.subscription}")
    user_question = request.form["question"].strip()
    normalized_question = normalize_question(user_question)
    eth_url = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
    sol_url = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"

    history = session.get("history", [])
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
        history.insert(0, {"question": user_question, "answer": Markup(f"Wallet Analytics ({analytics['chain']})<br>Balance: {analytics['balance']}<br>Transactions (30 days): {analytics['tx_count']}<br>Gas Spent: {analytics['gas_spent']}<br>Top Tokens: {analytics['top_tokens']}<br>Hot Wallet: {analytics['hot_wallet']}") if wallet_data else answer, "wallet_data": wallet_data})
    elif "price_prediction" in normalized_question and current_user.subscription != "free":
        if "bitcoin" in user_question:
            coin = "bitcoin"
            days = 7 if "7" not in user_question else int(user_question.split("in")[-1].split()[0])
            answer = predict_price(coin, days)
        elif "ethereum" in user_question:
            coin = "ethereum"
            days = 7 if "7" not in user_question else int(user_question.split("in")[-1].split()[0])
            answer = predict_price(coin, days)
        elif "solana" in user_question:
            coin = "solana"
            days = 7 if "7" not in user_question else int(user_question.split("in")[-1].split()[0])
            answer = predict_price(coin, days)
        else:
            answer = "Sorry, I can only predict prices for Bitcoin, Ethereum, or Solana."
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
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
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
    elif "trending" in normalized_question or "buzz" in normalized_question:
        trends = get_trending_crypto()
        answer = Markup("Here is what's trending in crypto right now:<br>" + "<br>".join([f"{t['topic']}: {t['snippet']} (<a href='{t['link']}' target='_blank'>See Post Now</a>)" for t in trends]))
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
    elif "gas" in normalized_question:
        payload = {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 1}
        response = requests.post(eth_url, json=payload).json()
        if "result" in response:
            gas_price = int(response["result"], 16) / 1e9
            answer = f"The current Ethereum gas price is {gas_price} Gwei."
        else:
            answer = "Oops! Could not fetch gas price."
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
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
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
    elif "ethereum block" in normalized_question:
        payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
        response = requests.post(eth_url, json=payload).json()
        if "result" in response:
            block_number = int(response["result"], 16)
            answer = f"The latest Ethereum block number is {block_number}."
        else:
            answer = "Oops! Could not fetch Ethereum block data."
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
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
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
    elif "solana block" in normalized_question:
        payload = {"jsonrpc": "2.0", "method": "getSlot", "params": [], "id": 1}
        response = requests.post(sol_url, json=payload).json()
        if "result" in response:
            slot_number = response["result"]
            answer = f"The latest Solana slot number is {slot_number}."
        else:
            answer = "Oops! Could not fetch Solana slot data."
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
    else:
        if "price_prediction" in normalized_question:
            answer = "Please upgrade to a paid plan to use price predictions."
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
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})

    session["history"] = history[:3]
    news_items = get_news_items()
    top_coins = get_top_coins()
    return render_template("index.html", answer=answer, question=user_question, history=session["history"], news_items=news_items, trends=get_trending_crypto(), x_profiles=get_x_profiles(), top_coins=top_coins, stripe_key=STRIPE_PUBLISHABLE_KEY, subscription=current_user.subscription)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)