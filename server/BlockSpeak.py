# BlockSpeak.py
"""
BlockSpeak.py - Pure JSON API Backend for BlockSpeak
--------------------------------------------------
This is the backend brain of BlockSpeak, serving data to our React frontend at https://blockspeak.co.
- Local: Runs at http://127.0.0.1:8080 with Hardhat for testing
- Production: Runs at https://blockspeak.onrender.com with Ethereum mainnet via Alchemy
- No HTML here, just JSON responses for everything!
"""

# Imports: All the tools we need
import os  # For file system stuff
from dotenv import load_dotenv  # Loads secrets from .env file
from flask import redirect  # http rederict
import re  # Regular expressions for parsing contract requests
import json  # For working with JSON data
import sqlite3  # Our simple database for users
from flask import Flask, request, session, jsonify  # Flask for the API
from flask_cors import CORS  # Lets React talk to us from different domains
import requests  # For fetching external data (news, prices)
from openai import OpenAI  # ChatGPT integration
import feedparser  # Parses RSS feeds for news
from datetime import datetime, timedelta, timezone  # Time handling
import logging  # Logs for debugging
import stripe  # Payment processing
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user  # User sessions
from werkzeug.security import generate_password_hash, check_password_hash  # Password security
from eth_account.messages import encode_defunct  # For MetaMask login
from web3 import Web3 as Web3Py  # Blockchain interaction
import uuid  # Unique IDs for nonces

# Load .env (keep this file out of Git!)
load_dotenv(dotenv_path="C:/Users/brody/BlockchainQueryTool/BlockSpeak/server/.env")

# NETWORK decides if we are testing locally or live:
# - "hardhat": Local blockchain at http://127.0.0.1:8545 for testing
# - "mainnet": Ethereum mainnet via Alchemy for production
NETWORK = os.getenv("NETWORK", "hardhat")
if NETWORK == "hardhat":
    w3 = Web3Py(Web3Py.HTTPProvider("http://127.0.0.1:8545"))
elif NETWORK == "mainnet":
    w3 = Web3Py(Web3Py.HTTPProvider(f"https://eth-mainnet.g.alchemy.com/v2/{os.getenv('ALCHEMY_API_KEY')}"))
else:
    raise ValueError(f"Unsupported NETWORK: {NETWORK}")

# Set up Flask app
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "supersecretkey")  # Secret for sessions
app.config.update(
    SESSION_TYPE="memory",  # Store sessions in memory
    SESSION_PERMANENT=False,  # Sessions do not last forever
    SESSION_COOKIE_SAMESITE="None",  # Allow cross-origin cookies
    SESSION_COOKIE_SECURE=True  # Only HTTPS cookies
)
# CORS: Lets our React app at blockspeak.co (or localhost:3000 for testing) talk to the backend
CORS(app, supports_credentials=True, resources={r"/*": {"origins": ["http://localhost:3000", "https://blockspeak.co"]}})
logging.basicConfig(level=logging.INFO)  # Log info for debugging

# Load API keys and Stripe secrets
ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
stripe.api_key = STRIPE_SECRET_KEY
client = OpenAI(api_key=OPENAI_API_KEY)

# Set up Flask-Login for managing user sessions
login_manager = LoginManager()
login_manager.init_app(app)

# Database setup: Simple SQLite for users
def init_db():
    """Creates the users table if it doesnt exist."""
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        subscription TEXT DEFAULT 'free', stripe_customer_id TEXT, history TEXT DEFAULT '[]')''')
    conn.commit()
    conn.close()

init_db()

# User class for Flask-Login
class User(UserMixin):
    """Represents a user with email, subscription, Stripe ID, and history."""
    def __init__(self, email, subscription="free", stripe_customer_id=None, history=None):
        self.email = email
        self.subscription = subscription
        self.stripe_customer_id = stripe_customer_id
        self.history = json.loads(history) if history else []
    def get_id(self):
        return self.email  # Unique ID is the email

@login_manager.user_loader
def load_user(email):
    """Loads a user from the database by email."""
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute("SELECT email, subscription, stripe_customer_id, history FROM users WHERE email = ?", (email,))
    user_data = c.fetchone()
    conn.close()
    if user_data:
        return User(user_data[0], user_data[1], user_data[2], user_data[3])
    return None

def save_user_history(email, history):
    """Saves the users last 3 queries to the database."""
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute("UPDATE users SET history = ? WHERE email = ?", (json.dumps(history[:3]), email))
    conn.commit()
    conn.close()

# Utility Functions: Helpers for our logic
def is_bitcoin_address(text):
    """Checks if text is a Bitcoin address."""
    return (text.startswith("1") or text.startswith("3") or text.startswith("bc1")) and 26 <= len(text) <= 35

def is_wallet_address(text):
    """Checks if text is an Ethereum address."""
    return text.startswith("0x") and len(text) == 42

def is_solana_address(text):
    """Checks if text is a Solana address."""
    return len(text) == 44 and all(c in "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" for c in text)

def normalize_question(text):
    """Turns user questions into standard formats for easier handling."""
    text = text.lower().strip()
    if "predict" in text or "price in" in text: return "price_prediction"
    if "gas" in text: return "gas"
    elif "solana" in text: return "solana block" if "block" in text else "solana price"
    elif "bitcoin" in text or "btc" in text: return "bitcoin block" if "block" in text else "bitcoin price"
    elif "eth" in text or "ethereum" in text: return "ethereum block" if "block" in text else "ethereum price"
    return text

def get_crypto_price(coin):
    """Fetches current price from CoinCap API."""
    url = f"https://api.coincap.io/v2/assets/{coin}"
    try:
        response = requests.get(url).json()
        price = float(response["data"]["priceUsd"])
        return f"{price:.2f}"
    except Exception as e:
        app.logger.error(f"CoinCap price fetch failed for {coin}: {str(e)}")
        return "Price unavailable"

def get_trending_crypto():
    """Gets top 3 trending coins by volume from CoinCap."""
    url = "https://api.coincap.io/v2/assets?limit=3"
    try:
        response = requests.get(url).json()
        return [{"topic": coin["name"], "snippet": f"Volume 24h: ${int(float(coin['volumeUsd24Hr'])):,}", "link": f"https://coincap.io/assets/{coin['id']}"} for coin in response["data"]]
    except Exception as e:
        app.logger.error(f"CoinCap trending fetch failed: {str(e)}")
        return [{"topic": "Error", "snippet": "Could not fetch trends", "link": "#"}]

def get_x_profiles():
    """Returns static list of crypto X profiles."""
    return [{"name": "Bitcoin", "link": "https://x.com/Bitcoin"}, {"name": "Ethereum", "link": "https://x.com/ethereum"}, {"name": "Solana", "link": "https://x.com/Solana"}]

def get_news_items():
    """Fetches latest crypto news from RSS feeds."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    urls = ["https://coinjournal.net/feed/", "https://cointelegraph.com/rss"]
    for url in urls:
        try:
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            feed = feedparser.parse(response.content)
            if not feed.entries: continue
            return [{"title": entry.title, "link": entry.link} for entry in feed.entries[:3]]
        except requests.RequestException as e:
            app.logger.error(f"RSS fetch failed for {url}: {str(e)}")
    return [{"title": "News unavailable - check back later!", "link": "#"}]

def get_wallet_analytics(address):
    """Gets wallet stats for Bitcoin, Ethereum, or Solana."""
    analytics = {}
    if is_bitcoin_address(address):
        try:
            btc_url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}/balance"
            btc_response = requests.get(btc_url).json()
            balance_btc = btc_response.get("balance", 0) / 1e8
            tx_count = btc_response.get("n_tx", 0)
            analytics = {"chain": "Bitcoin", "balance": f"{balance_btc:.8f} BTC", "tx_count": tx_count, "gas_spent": "N/A", "top_tokens": "N/A", "hot_wallet": "Yes" if tx_count > 50 else "No"}
        except Exception as e:
            app.logger.error(f"BTC analytics failed: {str(e)}")
            return {"error": "Could not fetch Bitcoin analytics"}
    elif is_wallet_address(address):
        try:
            # Convert to checksum address for Web3.py compatibility
            checksum_address = w3.to_checksum_address(address)
            balance_wei = w3.eth.get_balance(checksum_address)
            balance_eth = balance_wei / 1e18
            tx_count = w3.eth.get_transaction_count(checksum_address)
            top_tokens = "ETH only"  # Default for Hardhat
            if NETWORK == "mainnet":  # Only check USDT on mainnet
                usdt_contract = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                usdt_balance = w3.eth.call({
                    "to": usdt_contract,
                    "data": f"0x70a08231000000000000000000000000{checksum_address[2:]}"
                }) / 1e6
                top_tokens = f"ETH, USDT ({usdt_balance:.2f})" if usdt_balance > 0 else "ETH only"
            analytics = {
                "chain": "Ethereum",
                "balance": f"{balance_eth:.4f} ETH",
                "tx_count": tx_count,
                "gas_spent": "N/A",  # Placeholder - no gas calc yet
                "top_tokens": top_tokens,
                "hot_wallet": "Yes" if tx_count > 50 else "No"
            }
            return analytics
        except Exception as e:
            app.logger.error(f"ETH analytics failed for {address}: {str(e)}")
            return {"error": "Could not fetch Ethereum analytics"}
    elif is_solana_address(address):
        try:
            sol_url = f"https://solana-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}" 
            payload = {"jsonrpc": "2.0", "method": "getBalance", "params": [address], "id": 1}
            balance_response = requests.post(sol_url, json=payload).json()
            if "result" not in balance_response:
                return {"error": "Invalid Solana address"}
            balance_sol = balance_response["result"]["value"] / 1e9
            payload = {"jsonrpc": "2.0", "method": "getSignaturesForAddress", "params": [address, {"limit": 1000}], "id": 1}
            tx_response = requests.post(sol_url, json=payload).json()
            if "result" not in tx_response:
                return {"error": "Could not fetch Solana tx data"}
            tx_count = len(tx_response["result"])
            analytics = {"chain": "Solana", "balance": f"{balance_sol:.4f} SOL", "tx_count": tx_count, "gas_spent": "N/A", "top_tokens": "SOL only", "hot_wallet": "Yes" if tx_count > 50 else "No"}
            return analytics
        except Exception as e:
            app.logger.error(f"SOL analytics failed: {str(e)}")
            return {"error": "Could not fetch Solana analytics"}
    else:
        return {"error": "Invalid wallet address"}
    return analytics

def get_historical_balance(address, chain):
    """Gets 30-day balance history for a wallet."""
    # Omitted for brevity same as before just returns balances list
    pass

def get_top_coins():
    """Fetches top coins from CoinCap with caching."""
    cache_file = "top_coins_cache.json"
    now = datetime.now(timezone.utc)
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            cached = json.load(f)
        if datetime.fromisoformat(cached["timestamp"]) > now - timedelta(minutes=15):
            return cached["data"]
    coin_ids = ["bitcoin", "ethereum", "solana"]
    coins = []
    url = "https://api.coincap.io/v2/assets"
    try:
        response = requests.get(url).json()
        all_coins = response["data"]
        for coin_id in coin_ids:
            coin_data = next((c for c in all_coins if c["id"] == coin_id), None)
            if coin_data:
                coins.append({"id": coin_data["id"], "name": coin_data["name"], "image": f"https://assets.coincap.io/assets/icons/{coin_data['symbol'].lower()}@2x.png",
                              "price": f"{float(coin_data['priceUsd']):.2f}", "market_cap": f"{int(float(coin_data['marketCapUsd'])):,}",
                              "change": round(float(coin_data["changePercent24Hr"]), 2), "graph_color": "#2ecc71" if float(coin_data["changePercent24Hr"]) > 0 else "#e74c3c"})
        other_coins = [c for c in all_coins[:10] if c["id"] not in coin_ids]
        if other_coins:
            random_coin = other_coins[0]
            coins.append({"id": random_coin["id"], "name": random_coin["name"], "image": f"https://assets.coincap.io/assets/icons/{random_coin['symbol'].lower()}@2x.png",
                          "price": f"{float(random_coin['priceUsd']):.2f}", "market_cap": f"{int(float(random_coin['marketCapUsd'])):,}",
                          "change": round(float(random_coin["changePercent24Hr"]), 2), "graph_color": "#2ecc71" if float(random_coin["changePercent24Hr"]) > 0 else "#e74c3c"})
        with open(cache_file, "w") as f:
            json.dump({"data": coins, "timestamp": now.isoformat()}, f)
        return coins
    except Exception as e:
        app.logger.error(f"CoinCap top coins failed: {str(e)}")
        return [{"id": "bitcoin", "name": "Bitcoin", "image": "https://assets.coincap.io/assets/icons/btc@2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "graph_color": "#2ecc71"},
                {"id": "ethereum", "name": "Ethereum", "image": "https://assets.coincap.io/assets/icons/eth@2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "graph_color": "#2ecc71"},
                {"id": "solana", "name": "Solana", "image": "https://assets.coincap.io/assets/icons/sol@2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "graph_color": "#2ecc71"},
                {"id": "tether", "name": "Tether", "image": "https://assets.coincap.io/assets/icons/usdt@2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "graph_color": "#2ecc71"}]

def get_coin_graph(coin_id):
    """Fetches 7-day price history for a coin."""
    cache_key = f"coin_graph_{coin_id}"
    if cache_key in session and session[cache_key]["timestamp"] > datetime.now(timezone.utc) - timedelta(minutes=5):
        return session[cache_key]["data"]
    url = f"https://api.coincap.io/v2/assets/{coin_id}/history?interval=d1&start={(int((datetime.now(timezone.utc) - timedelta(days=7)).timestamp() * 1000))}&end={(int(datetime.now(timezone.utc).timestamp() * 1000))}"
    try:
        response = requests.get(url).json()
        if "data" not in response or not response["data"]:
            now = datetime.now(timezone.utc)
            dates = [(now - timedelta(days=x)).strftime("%Y-%m-%d") for x in range(7)][::-1]
            prices = [0] * 7
        else:
            prices_data = response["data"]
            dates = [datetime.fromtimestamp(p["time"] / 1000).strftime("%Y-%m-%d") for p in prices_data]
            prices = [float(p["priceUsd"]) for p in prices_data]
        graph_data = {"dates": dates, "prices": prices}
        session[cache_key] = {"data": graph_data, "timestamp": datetime.now(timezone.utc)}
        return graph_data
    except Exception as e:
        app.logger.error(f"CoinCap graph API failed for {coin_id}: {str(e)}")
        now = datetime.now(timezone.utc)
        dates = [(now - timedelta(days=x)).strftime("%Y-%m-%d") for x in range(7)][::-1]
        prices = [0] * 7
        graph_data = {"dates": dates, "prices": prices}
        session[cache_key] = {"data": graph_data, "timestamp": datetime.now(timezone.utc)}
        return graph_data

def predict_price(coin, days):
    """Predicts future price based on 30-day trend."""
    # Omitted for brevity same as before
    pass

@app.route("/nonce")
def get_nonce():
    # Gives React a nonce for secure MetaMask login.
    nonce = str(uuid.uuid4())
    session["nonce"] = nonce
    app.logger.info(f"Generated nonce: {nonce}")  # Add this line to log the nonce!
    return nonce

@app.route("/api/register", methods=["POST"])
def register():
    """Registers a new user with email and password."""
    email = request.form.get("email")
    password = request.form.get("password")
    if not email or "@" not in email or "." not in email:
        return jsonify({"error": "Invalid email"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password too short"}), 400
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    try:
        hashed_password = generate_password_hash(password)
        c.execute("INSERT INTO users (email, password) VALUES (?, ?)", (email, hashed_password))
        conn.commit()
        customer = stripe.Customer.create(email=email)
        c.execute("UPDATE users SET stripe_customer_id = ? WHERE email = ?", (customer["id"], email))
        conn.commit()
        user = User(email)
        login_user(user)
        return jsonify({"success": True, "message": "Registered!", "email": email})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email taken"}), 400
    except stripe.error.StripeError as e:
        return jsonify({"error": "Stripe failed"}), 500
    finally:
        conn.close()

@app.route("/api/login", methods=["POST"])
def login():
    """Logs in a user with email and password."""
    email = request.form.get("email")
    password = request.form.get("password")
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute("SELECT email, password, subscription, stripe_customer_id, history FROM users WHERE email = ?", (email,))
    user_data = c.fetchone()
    conn.close()
    if user_data and check_password_hash(user_data[1], password):
        user = User(user_data[0], user_data[2], user_data[3], user_data[4])
        login_user(user)
        return jsonify({"success": True, "message": "Logged in!", "email": email})
    return jsonify({"error": "Wrong credentials"}), 400

@app.route("/api/logout")
@login_required
def logout():
    """Logs out the current user."""
    logout_user()
    return jsonify({"success": True, "message": "Logged out!"})

@app.route("/login/metamask", methods=["POST"])
def login_metamask():
    """Logs in a user with MetaMask signature."""
    data = request.json
    address = data.get("address")
    signature = data.get("signature")
    if not address or not signature:
        return jsonify({"error": "Missing data"}), 400
    nonce = session.pop("nonce", None)
    if not nonce:
        return jsonify({"error": "Invalid nonce"}), 400
    message = encode_defunct(text=f"Log in to BlockSpeak: {nonce}")
    try:
        recovered_address = w3.eth.account.recover_message(message, signature=signature)
        if recovered_address.lower() == address.lower():
            conn = sqlite3.connect("users.db")
            c = conn.cursor()
            c.execute("SELECT email, subscription, stripe_customer_id, history FROM users WHERE email = ?", (address,))
            user_data = c.fetchone()
            if not user_data:
                c.execute("INSERT INTO users (email, password) VALUES (?, ?)", (address, "metamask"))
                conn.commit()
                user = User(address)
            else:
                user = User(user_data[0], user_data[1], user_data[2], user_data[3])
            login_user(user)
            conn.close()
            return jsonify({"success": True, "address": address})
        return jsonify({"error": "Invalid signature"}), 401
    except Exception as e:
        return jsonify({"error": "Login failed"}), 500

@app.route("/api/create_contract", methods=["POST"])
@login_required
def create_contract():
    """Creates a smart contract based on user input."""
    contract_request = request.form.get("contract_request")
    if not contract_request:
        return jsonify({"error": "No request"}), 400
    w3_py = w3  # Use global w3 (Hardhat or mainnet)
    if not w3_py.is_connected():
        return jsonify({"error": "Blockchain not connected"}), 500
    sender_address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" if NETWORK == "hardhat" else current_user.email
    # Pick the right private key based on NETWORK
    sender_private_key = os.getenv("HARDHAT_PRIVATE_KEY") if NETWORK == "hardhat" else os.getenv("MAINNET_PRIVATE_KEY")
    if not sender_private_key:
        return jsonify({"error": f"Missing {'HARDHAT_PRIVATE_KEY' if NETWORK == 'hardhat' else 'MAINNET_PRIVATE_KEY'}"}), 500
    match = re.search(r"send (\d+) eth to (0x[a-fA-F0-9]{40})(?:\s+every\s+(\w+))?", contract_request, re.IGNORECASE)
    if match:
        amount, recipient, frequency = int(match.group(1)), match.group(2), match.group(3).lower() if match.group(3) else "once"
        contract_path = "skillchain_contracts/artifacts/contracts/RecurringPayment.sol/RecurringPayment.json"
        try:
            with open(contract_path) as f:
                contract_data = json.load(f)
        except FileNotFoundError:
            return jsonify({"error": "Contract file missing"}), 500
        contract = w3_py.eth.contract(abi=contract_data["abi"], bytecode=contract_data["bytecode"])
        tx = contract.constructor(recipient).build_transaction({
            "from": sender_address, "nonce": w3_py.eth.get_transaction_count(sender_address),
            "gas": 2000000, "gasPrice": w3_py.to_wei("50", "gwei"), "value": w3_py.to_wei(amount, "ether")
        })
        signed_tx = w3_py.eth.account.sign_transaction(tx, sender_private_key)
        try:
            tx_hash = w3_py.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_receipt = w3_py.eth.wait_for_transaction_receipt(tx_hash)
            contract_address = tx_receipt.contractAddress
            message = f"Success! Sent {amount} ETH to {recipient}" + (f" every {frequency}" if frequency != "once" else "")
            return jsonify({"message": message, "contract_address": contract_address, "status": "success"})
        except Exception as e:
            return jsonify({"error": f"Transaction failed: {str(e)}"}), 500
    return jsonify({"message": f"Unsupported request: '{contract_request}'", "status": "unsupported"})

@app.route("/api/analytics/<address>")
@login_required
def get_analytics(address):
    """Fetches wallet analytics for an address."""
    analytics = get_wallet_analytics(address)
    return jsonify(analytics) if "error" not in analytics else (jsonify({"error": analytics["error"]}), 400)

@app.route("/api/news")
def get_news_api():
    """Returns latest crypto news."""
    return jsonify(get_news_items())

@app.route("/api/query", methods=["POST"])
@login_required
def query():
    """Handles user questions about crypto."""
    user_question = request.form.get("question", "").strip()
    normalized_question = normalize_question(user_question)
    history = current_user.history
    if is_bitcoin_address(user_question) or is_wallet_address(user_question) or is_solana_address(user_question):
        analytics = get_wallet_analytics(user_question)
        answer = analytics["error"] if "error" in analytics else f"Wallet Analytics ({analytics['chain']}): Balance {analytics['balance']}"
        wallet_data = {"address": user_question, "chain": analytics.get("chain")} if "error" not in analytics else None
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": wallet_data})
    elif "price" in normalized_question:
        coin = "bitcoin" if "bitcoin" in user_question.lower() or "btc" in user_question.lower() else \
               "ethereum" if "ethereum" in user_question.lower() or "eth" in user_question.lower() else \
               "solana" if "solana" in user_question.lower() or "sol" in user_question.lower() else None
        answer = f"Current {coin.capitalize()} price: ${get_crypto_price(coin)} USD." if coin else "Only BTC, ETH, SOL supported."
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
    else:
        try:
            response = client.chat.completions.create(model="gpt-4", messages=[{"role": "user", "content": f"Answer about crypto: {user_question}"}], max_tokens=100)
            answer = response.choices[0].message.content
        except Exception as e:
            answer = f"Error: {str(e)}"
        history.insert(0, {"question": user_question, "answer": answer, "wallet_data": None})
    save_user_history(current_user.email, history)
    current_user.history = history[:3]
    return jsonify({"answer": answer, "question": user_question, "history": history[:3]})

@app.route("/api/subscribe", methods=["POST"])
@login_required
def subscribe():
    """Starts a Stripe subscription."""
    plan = request.form.get("plan")
    price_id = {"basic": "price_1QzXTCKv6dFcpMYlxS712fan", "pro": "price_1QzXY5Kv6dFcpMYluAWw5638"}.get(plan)
    if not price_id:
        return jsonify({"error": "Invalid plan"}), 400
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"], customer=current_user.stripe_customer_id,
            line_items=[{"price": price_id, "quantity": 1}], mode="subscription",
            success_url="https://blockspeak.co/success?plan=" + plan, cancel_url="https://blockspeak.co"
        )
        return jsonify({"checkout_url": checkout_session.url})
    except stripe.error.StripeError as e:
        return jsonify({"error": "Subscription failed"}), 500

@app.route("/api/subscription_success")
@login_required
def subscription_success():
    """Confirms a subscription after Stripe payment."""
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
            return jsonify({"success": True, "message": "Subscription confirmed"})
    return jsonify({"error": "Subscription not confirmed"}), 500

@app.route("/api/")
def home_api():
    """Main data endpoint for the home page."""
    history = current_user.history if current_user.is_authenticated else []
    subscription = current_user.subscription if current_user.is_authenticated else "free"
    return jsonify({
        "history": history, "news_items": get_news_items(), "trends": get_trending_crypto(),
        "x_profiles": get_x_profiles(), "top_coins": get_top_coins(), "stripe_key": STRIPE_PUBLISHABLE_KEY,
        "subscription": subscription
    })

@app.route("/api/coin_graph/<coin_id>")
def coin_graph(coin_id):
    """Returns 7-day price graph data for a coin."""
    return jsonify(get_coin_graph(coin_id))

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path):
    """Redirects non-API requests to the frontend at https://blockspeak.co."""
    if path.startswith("api/") or path == "nonce" or path == "login/metamask":
        # Let API routes pass through (handled by specific endpoints)
        return app.handle_url_build_error(None, path, None)
    # Redirect everything else to the frontend
    return redirect("https://blockspeak.co", code=302)

@app.before_request
def start_session():
    """Ensures a session exists for each request."""
    if "nonce" not in session:
        session["nonce"] = None

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)  # Runs locally for testing