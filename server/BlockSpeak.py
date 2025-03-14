# BlockSpeak.py
# Pure JSON API Backend for BlockSpeak
# This is the backend brain of BlockSpeak, serving data to our React frontend at https://blockspeak.co.
# Local: Runs at http://127.0.0.1:8080 with Hardhat for testing.
# Production: Runs at https://blockspeak.onrender.com with Ethereum Mainnet via Alchemy.
# No HTML here, just JSON responses for everything!

# Imports: All the tools we need to make BlockSpeak work
import os  # For file system stuff like paths and env variables
import json  # For working with JSON data like API responses to React
import re  # Regular expressions for parsing contract requests like send 1 eth to...
import sqlite3  # Our simple database for users to store emails and subscriptions
import requests  # For fetching external data like news and prices from APIs
import feedparser  # Parses RSS feeds for news like CoinTelegraph
import logging  # Logs for debugging to see whats happening when things break
import stripe  # Payment processing for subscriptions via Stripe for card payments
import uuid  # Unique IDs for nonces to secure login with MetaMask
import time  # For adding delays in retries
from decimal import Decimal  # floating-point precision
from dotenv import load_dotenv  # Loads secrets from .env file to keep keys safe
from flask import Flask  # Flask is our API engine
from flask import request  # Grabs data from frontend requests
from flask import session  # Stores temporary data like nonces
from flask import jsonify  # Makes JSON responses for React
from flask import redirect  # HTTP redirect for non-API requests to frontend
from web3 import Web3 as Web3Py  # Blockchain interaction to connect to Hardhat or Mainnet
from openai import OpenAI  # ChatGPT integration for answering crypto questions
from datetime import datetime  # Time handling for caching data
from datetime import timedelta  # Helps calculate time differences
from datetime import timezone  # Ensures times are UTC
from flask_cors import CORS  # Lets React talk to us from different domains
from web3.exceptions import ContractLogicError  # Catches blockchain reverts like Already a member
from flask_login import LoginManager  # Manages user sessions
from flask_login import UserMixin  # Base class for User objects
from flask_login import login_user  # Logs users in
from flask_login import login_required  # Restricts routes to logged-in users
from flask_login import logout_user  # Logs users out
from flask_login import current_user  # Tracks the current logged-in user
from eth_account.messages import encode_defunct  # For MetaMask login signing messages
from werkzeug.security import generate_password_hash  # Secures passwords
from werkzeug.security import check_password_hash  # Checks hashed passwords

# Load .env to keep this file out of Git!
# Our secrets like API keys and private keys live here, pointing to skillchain_contracts folder
load_dotenv(dotenv_path="C:/Users/brody/BlockchainQueryTool/BlockSpeak/skillchain_contracts/.env")

# NETWORK decides if we are testing locally or live:
# hardhat: Local blockchain at http://127.0.0.1:8545 for testing with fake ETH
# mainnet: Ethereum Mainnet via Alchemy for production with real ETH
NETWORK = os.getenv("NETWORK", "hardhat")  # Defaults to hardhat if not set in .env

# Load API keys for Alchemy and Infura
ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
INFURA_KEY = os.getenv("INFURA_KEY")

# Web3 provider setup with Alchemy as primary and Infura as fallback for mainnet
if NETWORK == "hardhat":
    w3 = Web3Py(Web3Py.HTTPProvider("http://127.0.0.1:8545"))  # Connects to local Hardhat node
    logging.info("Connected to Hardhat local network")
elif NETWORK == "mainnet":  # connects to mainnet if not hardhat
    try:
        # Try Alchemy first
        w3 = Web3Py(Web3Py.HTTPProvider(f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"))
        if w3.is_connected():
            logging.info("Connected to Ethereum Mainnet via Alchemy")
        else:
            raise ConnectionError("Alchemy connection failed")
    except Exception as e:
        logging.warning(f"Alchemy connection failed: {str(e)}. Falling back to Infura.")
        if not INFURA_KEY:
            raise ValueError("INFURA_KEY must be set for fallback")
        w3 = Web3Py(Web3Py.HTTPProvider(f"https://mainnet.infura.io/v3/{INFURA_KEY}"))
        if w3.is_connected():
            logging.info("Connected to Ethereum Mainnet via Infura")
        else:
            raise ConnectionError("Infura connection failed")
else:
    raise ValueError(f"Unsupported NETWORK: {NETWORK}")  # Oops, typo in .env? Crash with a message!

# ETH payment address where users send ETH for subscriptions
ETH_PAYMENT_ADDRESS = os.getenv("ETH_PAYMENT_ADDRESS")
if not ETH_PAYMENT_ADDRESS:
    raise ValueError("ETH_PAYMENT_ADDRESS is not set in environment variables")
# ETH subscription prices as test values, adjust for live ETH price like $2000 per ETH
BASIC_PLAN_ETH = 0.005  # About $10 in test mode
PRO_PLAN_ETH = 0.025    # About $50 in test mode

# Set up Flask app, this is our servers engine
app = Flask(__name__)  # Creates the Flask app
app.secret_key = os.getenv("SECRET_KEY")  # Secret for sessions to secure cookies, update in .env for prod
app.config.update(
    SESSION_TYPE="memory",  # Store sessions in memory, good for testing
    SESSION_PERMANENT=False,  # Sessions dont last forever, log out when browser closes
    SESSION_COOKIE_SAMESITE="None",  # Allow cross-origin cookies, React frontend needs this
    SESSION_COOKIE_SECURE=True  # Only HTTPS cookies, secure in production
)
# CORS: Lets our React app at blockspeak.co or localhost:3000 for testing talk to the backend
CORS(app, supports_credentials=True, resources={r"/*": {"origins": ["http://localhost:3000", "https://blockspeak.co"]}})
logging.basicConfig(level=logging.INFO)  # Log info for debugging to see requests in terminal

# Load API keys and Stripe secrets from .env
ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")  # For blockchain connections on Mainnet
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")    # For ChatGPT answers
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")  # For Stripe payments on backend
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")  # Frontend Stripe key, React uses this
stripe.api_key = STRIPE_SECRET_KEY  # Set Stripe API key for payments
client = OpenAI(api_key=OPENAI_API_KEY)  # Initialize OpenAI client for ChatGPT

# Set up Flask-Login for managing user sessions
# Keeps track of whos logged in with email or MetaMask address
login_manager = LoginManager()
login_manager.init_app(app)

# Database setup: Simple SQLite for users and blog posts
def init_db():
    # Creates the users and blog_posts tables if they dont exist
    # Stores user email, password, subscription, Stripe ID, and query history
    # NEW: Also stores blog posts for dynamic content
    conn = sqlite3.connect("users.db")  # Connects to users.db file
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        subscription TEXT DEFAULT 'free', stripe_customer_id TEXT, history TEXT DEFAULT '[]')''')
    # NEW: Create blog_posts table
    c.execute('''CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
        isFree INTEGER DEFAULT 1, teaser TEXT, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()  # Saves changes
    conn.close()  # Closes connection

init_db()  # Runs the setup right away

# NEW: Seed the blog posts table with sample data (optional)
def seed_blog_posts():
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    # Check if posts already exist to avoid duplicates
    c.execute("SELECT COUNT(*) FROM blog_posts")
    if c.fetchone()[0] == 0:
        sample_posts = [
            ("How to Create a Smart Contract", "smart-contract-guide", 1, "Learn the basics...", "Full content here..."),
            ("Crypto Wallet Security Tips", "wallet-security", 1, "Secure your funds...", "Full content here..."),
            ("Blockchain for Beginners", "blockchain-basics", 1, "Start here...", "Full content here..."),
            ("Understanding DAOs", "understanding-daos", 0, "What are DAOs?...", "Detailed DAO content..."),
            ("Latest DeFi Trends", "defi-trends", 0, "Explore DeFi...", "Latest DeFi insights...")
        ]
        c.executemany("INSERT INTO blog_posts (title, slug, isFree, teaser, content) VALUES (?, ?, ?, ?, ?)", sample_posts)
        conn.commit()
    conn.close()

seed_blog_posts()  # Seed the database with initial posts (optional, remove if not needed)

# User class for Flask-Login
class User(UserMixin):
    # Represents a user with email, subscription, Stripe ID, and history
    def __init__(self, email, subscription="free", stripe_customer_id=None, history=None):
        self.email = email  # Email or wallet address like 0x123...
        self.subscription = subscription  # Free, basic, or pro
        self.stripe_customer_id = stripe_customer_id  # For Stripe payments
        self.history = json.loads(history) if history else []  # Users query history, last 3 questions

    def get_id(self):
        return self.email  # Unique ID is the email or wallet address

@login_manager.user_loader
def load_user(email):
    # Loads a user from the database by email when Flask-Login needs them
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute("SELECT email, subscription, stripe_customer_id, history FROM users WHERE email = ?", (email,))
    user_data = c.fetchone()  # Grabs one row if it exists
    conn.close()
    if user_data:
        return User(user_data[0], user_data[1], user_data[2], user_data[3])  # Returns User object
    return None  # No user found? Return None

def save_user_history(email, history):
    # Saves the users last 3 queries to the database
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute("UPDATE users SET history = ? WHERE email = ?", (json.dumps(history[:3]), email))  # Keeps only 3 latest
    conn.commit()
    conn.close()

# Utility Functions: Helpers for our logic
def is_bitcoin_address(text):
    # Checks if text is a Bitcoin address, starts with 1, 3, or bc1, length 26 to 35
    return (text.startswith("1") or text.startswith("3") or text.startswith("bc1")) and 26 <= len(text) <= 35

def is_wallet_address(text):
    # Checks if text is an Ethereum address, starts with 0x, length 42
    return text.startswith("0x") and len(text) == 42

def is_solana_address(text):
    # Checks if text is a Solana address, length 44, specific characters
    return len(text) == 44 and all(c in "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" for c in text)

def normalize_question(text):
    # Turns user questions into standard formats for easier handling
    # Helps decide how to answer like price, analytics, or ChatGPT
    text = text.lower().strip()
    if "predict" in text or "price in" in text:
        return "price_prediction"
    if "gas" in text:
        return "gas"
    elif "solana" in text:
        if "block" in text:
            return "solana block"
        else:
            return "solana price"
    elif "bitcoin" in text or "btc" in text:
        if "block" in text:
            return "bitcoin block"
        else:
            return "bitcoin block"
    elif "eth" in text or "ethereum" in text:
        if "block" in text:
            return "ethereum block"
        else:
            return "ethereum price"
    return text

def get_crypto_price(coin):
    # Fetches current price from CoinCap API like Bitcoin or Ethereum
    url = f"https://api.coincap.io/v2/assets/{coin}"
    try:
        response = requests.get(url).json()
        price = float(response["data"]["priceUsd"])
        return f"{price:.2f}"  # Returns price formatted to 2 decimals
    except Exception as e:
        app.logger.error(f"CoinCap price fetch failed for {coin}: {str(e)}")
        return "Price unavailable"  # Fallback if API fails

def get_trending_crypto():
    # Gets top 3 trending coins by volume from CoinCap
    # Used for the home page trends section
    url = "https://api.coincap.io/v2/assets?limit=3"
    try:
        response = requests.get(url).json()
        return [{"topic": coin["name"], "snippet": f"Volume 24h: ${int(float(coin['volumeUsd24Hr'])):,}", "link": f"https://coincap.io/assets/{coin['id']}"} for coin in response["data"]]
    except Exception as e:
        app.logger.error(f"CoinCap trending fetch failed: {str(e)}")
        return [{"topic": "Error", "snippet": "Could not fetch trends", "link": "#"}]  # Fallback if API fails

def get_x_profiles():
    # Returns static list of crypto X profiles
    # Used for the home page social links
    return [{"name": "Bitcoin", "link": "https://x.com/Bitcoin"}, {"name": "Ethereum", "link": "https://x.com/ethereum"}, {"name": "Solana", "link": "https://x.com/Solana"}]

def get_news_items():
    # Fetches latest crypto news from RSS feeds
    # Used for the home page news section
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}  # Pretends to be a browser
    urls = ["https://coinjournal.net/feed/", "https://cointelegraph.com/rss"]
    for url in urls:
        for attempt in range(3):  # Retry up to 3 times per URL
            try:
                response = requests.get(url, headers=headers, timeout=30)  # Increased timeout to 30 seconds
                response.raise_for_status()  # Checks if request worked
                feed = feedparser.parse(response.content)
                if not feed.entries:
                    app.logger.warning(f"No entries found in feed: {url}")
                    continue  # Skip if no news items
                app.logger.info(f"Successfully fetched news from {url}")
                return [{"title": entry.title, "link": entry.link} for entry in feed.entries[:3]]  # Top 3 news items
            except requests.RequestException as e:
                app.logger.error(f"Attempt {attempt + 1} for {url} failed: {str(e)}")
                if attempt < 2:  # Dont sleep on the last attempt
                    time.sleep(2 ** attempt)  # Exponential backoff: 1s, then 2s
    app.logger.error("All RSS fetch attempts failed for both URLs.")
    return [{"title": "News unavailable, check back later!", "link": "#"}]  # Fallback if all feeds fail

def get_wallet_analytics(address):
    # Gets wallet stats for Bitcoin, Ethereum, or Solana
    # Used for the analytics section on the dashboard
    analytics = {}
    if is_bitcoin_address(address):
        try:
            btc_url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}/balance"
            btc_response = requests.get(btc_url).json()
            balance_btc = btc_response.get("balance", 0) / 1e8  # Converts satoshis to BTC
            tx_count = btc_response.get("n_tx", 0)
            analytics = {"chain": "Bitcoin", "balance": f"{balance_btc:.8f} BTC", "tx_count": tx_count, "gas_spent": "N/A", "top_tokens": "N/A", "hot_wallet": "Yes" if tx_count > 50 else "No"}
        except Exception as e:
            app.logger.error(f"BTC analytics failed: {str(e)}")
            return {"error": "Could not fetch Bitcoin analytics"}
    elif is_wallet_address(address):
        try:
            checksum_address = w3.to_checksum_address(address)  # Ensures address is properly formatted
            balance_wei = w3.eth.get_balance(checksum_address)
            balance_wei = int(balance_wei)  # Convert from HexBytes to int
            balance_eth = balance_wei / 1e18  # Converts Wei to ETH
            tx_count = w3.eth.get_transaction_count(checksum_address)
            top_tokens = "ETH only"  # Default for Hardhat
            if NETWORK == "mainnet":  # Only check USDT on Mainnet
                usdt_contract = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                usdt_balance = w3.eth.call({"to": usdt_contract, "data": f"0x70a08231000000000000000000000000{checksum_address[2:]}"})/ 1e6  # USDT balance call
                top_tokens = f"ETH, USDT ({usdt_balance:.2f})" if usdt_balance > 0 else "ETH only"
            analytics = {"chain": "Ethereum", "balance": f"{balance_eth:.4f} ETH", "tx_count": tx_count, "gas_spent": "N/A", "top_tokens": top_tokens, "hot_wallet": "Yes" if tx_count > 50 else "No"}
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
            balance_sol = balance_response["result"]["value"] / 1e9  # Converts lamports to SOL
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
    # Gets 30-day balance history for a wallet, not implemented yet as a future feature!
    pass

def get_top_coins():
    # Fetches top coins from CoinCap with caching
    # Used for the top coins section on the dashboard
    cache_file = "top_coins_cache.json"
    now = datetime.now(timezone.utc)
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            cached = json.load(f)
        if datetime.fromisoformat(cached["timestamp"]) > now - timedelta(minutes=15):
            return cached["data"]  # Returns cached data if less than 15 mins old
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
            json.dump({"data": coins, "timestamp": now.isoformat()}, f)  # Caches new data
        return coins
    except Exception as e:
        app.logger.error(f"CoinCap top coins failed: {str(e)}")
        return [{"id": "bitcoin", "name": "Bitcoin", "image": "https://assets.coincap.io/assets/icons/btc@2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "graph_color": "#2ecc71"},
                {"id": "ethereum", "name": "Ethereum", "image": "https://assets.coincap.io/assets/icons/eth@2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "graph_color": "#2ecc71"},
                {"id": "solana", "name": "Solana", "image": "https://assets.coincap.io/assets/icons/sol@2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "graph_color": "#2ecc71"},
                {"id": "tether", "name": "Tether", "image": "https://assets.coincap.io/assets/icons/usdt@2x.png", "price": "N/A", "market_cap": "N/A", "change": 0, "graph_color": "#2ecc71"}]

def get_coin_graph(coin_id):
    # Fetches 7-day price history for a coin
    # Used for the price graph on the dashboard
    cache_key = f"coin_graph_{coin_id}"
    if cache_key in session and session[cache_key]["timestamp"] > datetime.now(timezone.utc) - timedelta(minutes=5):
        return session[cache_key]["data"]  # Returns cached graph if less than 5 mins old
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
    # Predicts future price based on 30-day trend, not implemented yet as a future feature!
    pass

@app.route("/api/blog-posts", methods=["GET"])
def get_blog_posts():
    """API endpoint to fetch all blog posts with pagination."""
    try:
        # Get page number, default to 1, ensure it is positive
        page = max(1, int(request.args.get("page", 1)))
        per_page = 10  # Fixed number of posts per page

        # Connect to database
        conn = sqlite3.connect("users.db")
        c = conn.cursor()

        # Fetch paginated posts
        offset = (page - 1) * per_page
        c.execute(
            "SELECT title, slug, isFree, teaser FROM blog_posts ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (per_page, offset)
        )
        posts = [{"title": row[0], "slug": row[1], "isFree": bool(row[2]), "teaser": row[3]} for row in c.fetchall()]

        # Get total number of posts
        c.execute("SELECT COUNT(*) FROM blog_posts")
        total_posts = c.fetchone()[0]

        # Close connection
        conn.close()

        # Calculate hasMore: true if more posts exist beyond this page
        has_more = (page * per_page) < total_posts

        # Log for debugging (optional, can be removed in production)
        app.logger.info(f"Page {page}, fetched {len(posts)} posts, total_posts={total_posts}, hasMore={has_more}")

        return jsonify({
            "posts": posts,
            "hasMore": has_more
        })
    except Exception as e:
        app.logger.error(f"Error in get_blog_posts: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/blog-posts/<slug>", methods=["GET"])
def get_blog_post(slug):
    """API endpoint to fetch a single blog post by slug."""
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute("SELECT title, content FROM blog_posts WHERE slug = ?", (slug,))
    post = c.fetchone()
    conn.close()
    if post:
        return jsonify({"title": post[0], "content": post[1]})
    return jsonify({"title": "Not Found", "content": "Post not found."}), 404


# API Routes: Where the magic happens!
@app.route("/nonce")
def get_nonce():
    # Gives React a nonce for secure MetaMask login
    # A random ID to ensure login is legit
    nonce = str(uuid.uuid4())  # Generates a unique string
    session["nonce"] = nonce  # Stores it in the session
    app.logger.info(f"Generated nonce: {nonce}")
    return nonce  # Sends it to the frontend


@app.route("/api/register", methods=["POST"])
def register():
    # Registers a new user with email and password
    # Creates a user in our database and logs them in
    email = request.form.get("email")
    password = request.form.get("password")
    if not email or "@" not in email or "." not in email:
        return jsonify({"error": "Invalid email"}), 400  # Checks for valid email format
    if len(password) < 8:
        return jsonify({"error": "Password too short"}), 400  # Ensures password is strong
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    try:
        hashed_password = generate_password_hash(password)  # Hashes password for security
        c.execute("INSERT INTO users (email, password) VALUES (?, ?)", (email, hashed_password))
        conn.commit()
        customer = stripe.Customer.create(email=email)  # Creates a Stripe customer
        c.execute("UPDATE users SET stripe_customer_id = ? WHERE email = ?", (customer["id"], email))
        conn.commit()
        user = User(email)
        login_user(user)  # Logs them in right away
        return jsonify({"success": True, "message": "Registered!", "email": email})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email taken"}), 400  # Email already exists
    except stripe.error.StripeError as e:
        return jsonify({"error": "Stripe failed"}), 500  # Stripe issue
    finally:
        conn.close()


@app.route("/api/login", methods=["POST"])
def login():
    # Logs in a user with email and password
    # Checks credentials and sets up the session
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
    return jsonify({"error": "Wrong credentials"}), 400  # Bad email or password


@app.route("/api/logout")
@login_required
def logout():
    # Logs out the current user
    # Ends the session
    logout_user()
    return jsonify({"success": True, "message": "Logged out!"})


@app.route("/login/metamask", methods=["POST"])
def login_metamask():
    # Logs in a user with MetaMask signature
    # Verifies the wallet signature for secure login
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
                c.execute("INSERT INTO users (email, password) VALUES (?, ?)", (address, "metamask"))  # Dummy password for MetaMask users
                conn.commit()
                user = User(address)
            else:
                user = User(user_data[0], user_data[1], user_data[2], user_data[3])
            login_user(user)
            conn.close()
            return jsonify({"success": True, "address": address})
        return jsonify({"error": "Invalid signature"}), 401  # Signature doesnt match
    except Exception as e:
        return jsonify({"error": "Login failed"}), 500


@app.route("/api/create_contract", methods=["POST"])
@login_required
def create_contract():
    # Creates a smart contract based on user input
    # Deploys a recurring payment contract if the request matches like "send 1 eth to 0x..."
    contract_request = request.form.get("contract_request")
    if not contract_request:
        return jsonify({"error": "No request"}), 400
    w3_py = w3  # Use global w3 for Hardhat or Mainnet
    if not w3_py.is_connected():
        return jsonify({"error": "Blockchain not connected"}), 500
    sender_address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" if NETWORK == "hardhat" else current_user.email  # Hardhat default or user wallet
    sender_private_key = os.getenv("HARDHAT_PRIVATE_KEY") if NETWORK == "hardhat" else os.getenv("MAINNET_PRIVATE_KEY")
    if not sender_private_key:
        return jsonify({"error": f"Missing {'HARDHAT_PRIVATE_KEY' if NETWORK == 'hardhat' else 'MAINNET_PRIVATE_KEY'}"}), 500
    match = re.search(r"send (\d+) eth to (0x[a-fA-F0-9]{40})(?:\s+every\s+(\w+))?", contract_request, re.IGNORECASE)
    if match:
        amount, recipient, frequency = int(match.group(1)), match.group(2), match.group(3).lower() if match.group(3) else "once"
        contract_path = "../skillchain_contracts/artifacts/contracts/RecurringPayment.sol/RecurringPayment.json"
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


@app.route("/api/create_dao", methods=["POST"])
@login_required
def create_dao():
    dao_name = request.form.get("dao_name")
    dao_description = request.form.get("dao_description")
    if not dao_name or not dao_description:
        return jsonify({"error": "DAO name and description are required"}), 400
    try:
        app.logger.info("Loading DAO contract artifact")
        with open("../skillchain_contracts/artifacts/contracts/DAO.sol/DAO.json") as f:
            dao_artifact = json.load(f)
        DAO_ABI = dao_artifact["abi"]
        DAO_BYTECODE = dao_artifact["bytecode"]
        w3_py = w3
        app.logger.info("Checking blockchain connection")
        if not w3_py.is_connected():
            return jsonify({"error": "Blockchain not connected"}), 500
        if NETWORK == "hardhat":
            sender_address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
        else:
            sender_address = current_user.email
        if NETWORK == "hardhat":
            sender_private_key = os.getenv("HARDHAT_PRIVATE_KEY")
        else:
            sender_private_key = os.getenv("MAINNET_PRIVATE_KEY")
        if not sender_private_key:
            if NETWORK == "hardhat":
                missing_key = "HARDHAT_PRIVATE_KEY"
            else:
                missing_key = "MAINNET_PRIVATE_KEY"
            return jsonify({"error": f"Missing {missing_key}"}), 500
        app.logger.info(f"Deploying DAO with name: {dao_name}, description: {dao_description}")
        DAO = w3_py.eth.contract(abi=DAO_ABI, bytecode=DAO_BYTECODE)
        tx = DAO.constructor(dao_name, dao_description).build_transaction({
            "from": sender_address,
            "nonce": w3_py.eth.get_transaction_count(sender_address),
            "gas": 2000000,
            "gasPrice": w3_py.to_wei("50", "gwei")
        })
        app.logger.info("Signing transaction")
        signed_tx = w3_py.eth.account.sign_transaction(tx, sender_private_key)
        app.logger.info("Sending transaction")
        tx_hash = w3_py.eth.send_raw_transaction(signed_tx.raw_transaction)
        app.logger.info("Waiting for transaction receipt")
        receipt = w3_py.eth.wait_for_transaction_receipt(tx_hash)
        dao_address = receipt.contractAddress
        app.logger.info(f"DAO created: Name={dao_name}, Address={w3_py.to_checksum_address(dao_address)}")
        return jsonify({"message": f"DAO Created! Name: {dao_name}, Address={w3_py.to_checksum_address(dao_address)}"}), 201
    except FileNotFoundError:
        app.logger.error("DAO contract artifact missing")
        return jsonify({"error": "DAO contract artifact missing"}), 500
    except Exception as e:
        app.logger.error(f"DAO creation failed: {str(e)}")
        return jsonify({"error": f"DAO creation failed: {str(e)}"}), 500


@app.route("/api/join_dao", methods=["POST"])
@login_required
def join_dao():
    dao_address = request.form.get("dao_address")
    if not dao_address or not is_wallet_address(dao_address):
        return jsonify({"error": "Please give me a valid DAO address (starts with 0x, 42 characters)!"}), 400
    try:
        w3_py = w3
        if not w3_py.is_connected():
            return jsonify({"error": "Oops! The blockchain is not answering right now."}), 500
        checksum_dao_address = w3_py.to_checksum_address(dao_address)
        sender_address = w3_py.to_checksum_address(current_user.email)
        sender_private_key = os.getenv("HARDHAT_PRIVATE_KEY") if NETWORK == "hardhat" else os.getenv("MAINNET_PRIVATE_KEY")
        if not sender_private_key:
            return jsonify({"error": f"Missing {'HARDHAT_PRIVATE_KEY' if NETWORK == 'hardhat' else 'MAINNET_PRIVATE_KEY'} in our secrets file!"}), 500
        with open("../skillchain_contracts/artifacts/contracts/DAO.sol/DAO.json") as f:
            dao_artifact = json.load(f)
        DAO_ABI = dao_artifact["abi"]
        dao_contract = w3_py.eth.contract(address=checksum_dao_address, abi=DAO_ABI)
        try:
            dao_contract.functions.join().call({"from": sender_address})
            tx = dao_contract.functions.join().build_transaction({
                "from": sender_address,
                "nonce": w3_py.eth.get_transaction_count(sender_address),
                "gas": 200000,
                "gasPrice": w3_py.to_wei("50", "gwei")
            })
            signed_tx = w3_py.eth.account.sign_transaction(tx, sender_private_key)
            app.logger.info("Sending join transaction")
            tx_hash = w3_py.eth.send_raw_transaction(signed_tx.raw_transaction)
            receipt = w3_py.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.status == 1:
                app.logger.info(f"User {sender_address} joined DAO at {checksum_dao_address}")
                return jsonify({"message": f"You are in! Welcome to the DAO at {checksum_dao_address}", "status": "success"}), 200
            else:
                return jsonify({"error": "Transaction failed unexpectedly"}), 400
        except ContractLogicError as cle:
            revert_reason = str(cle).lower()
            if "already a member" in revert_reason:
                app.logger.info(f"User {sender_address} tried to join DAO {checksum_dao_address} but is already a member")
                return jsonify({"message": "You are already a member of this DAO! No need to join again.", "status": "info"}), 200
            else:
                app.logger.error(f"Join DAO failed with revert: {revert_reason}")
                return jsonify({"error": f"Could not join the DAO: {revert_reason}"}), 400
    except Exception as e:
        app.logger.error(f"Join DAO failed: {str(e)}")
        return jsonify({"error": f"Sorry, joining the DAO did not work: {str(e)}"}), 500


@app.route("/api/create_proposal", methods=["POST"])
@login_required
def create_proposal():
    dao_address = request.form.get("dao_address")
    description = request.form.get("description")
    if not dao_address or not is_wallet_address(dao_address):
        return jsonify({"error": "Valid DAO address required"}), 400
    if not description:
        return jsonify({"error": "Proposal description required"}), 400
    try:
        w3_py = w3
        if not w3_py.is_connected():
            return jsonify({"error": "Blockchain not connected"}), 500
        checksum_dao_address = w3_py.to_checksum_address(dao_address)
        sender_address = w3_py.to_checksum_address(current_user.email)
        sender_private_key = os.getenv("HARDHAT_PRIVATE_KEY") if NETWORK == "hardhat" else os.getenv("MAINNET_PRIVATE_KEY")
        if not sender_private_key:
            return jsonify({"error": f"Missing {'HARDHAT_PRIVATE_KEY' if NETWORK == 'hardhat' else 'MAINNET_PRIVATE_KEY'}"}), 500
        with open("../skillchain_contracts/artifacts/contracts/DAO.sol/DAO.json") as f:
            dao_artifact = json.load(f)
        DAO_ABI = dao_artifact["abi"]
        dao_contract = w3_py.eth.contract(address=checksum_dao_address, abi=DAO_ABI)
        tx = dao_contract.functions.createProposal(description).build_transaction({
            "from": sender_address,
            "nonce": w3_py.eth.get_transaction_count(sender_address),
            "gas": 300000,
            "gasPrice": w3_py.to_wei("50", "gwei")
        })
        signed_tx = w3_py.eth.account.sign_transaction(tx, sender_private_key)
        tx_hash = w3_py.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3_py.eth.wait_for_transaction_receipt(tx_hash)
        event = dao_contract.events.ProposalCreated().process_receipt(receipt)
        proposal_id = event[0]["args"]["proposalId"]
        app.logger.info(f"Proposal created in DAO {checksum_dao_address}: ID={proposal_id}, Description={description}")
        return jsonify({"message": f"Proposal created! ID: {proposal_id}", "proposal_id": str(proposal_id)}), 201
    except Exception as e:
        app.logger.error(f"Create proposal failed: {str(e)}")
        return jsonify({"error": f"Failed to create proposal: {str(e)}"}), 500


@app.route("/api/vote", methods=["POST"])
@login_required
def vote():
    dao_address = request.form.get("dao_address")
    proposal_id = request.form.get("proposal_id")
    vote_choice = request.form.get("vote")
    if not dao_address or not is_wallet_address(dao_address):
        return jsonify({"error": "Valid DAO address required"}), 400
    if not proposal_id or not proposal_id.isdigit():
        return jsonify({"error": "Valid proposal ID required"}), 400
    if vote_choice not in ["true", "false"]:
        return jsonify({"error": "Vote must be 'true' or 'false'"}), 400
    try:
        w3_py = w3
        if not w3_py.is_connected():
            return jsonify({"error": "Blockchain not connected"}), 500
        checksum_dao_address = w3_py.to_checksum_address(dao_address)
        sender_address = w3_py.to_checksum_address(current_user.email)
        sender_private_key = os.getenv("HARDHAT_PRIVATE_KEY") if NETWORK == "hardhat" else os.getenv("MAINNET_PRIVATE_KEY")
        if not sender_private_key:
            return jsonify({"error": f"Missing {'HARDHAT_PRIVATE_KEY' if NETWORK == 'hardhat' else 'MAINNET_PRIVATE_KEY'}"}), 500
        with open("../skillchain_contracts/artifacts/contracts/DAO.sol/DAO.json") as f:
            dao_artifact = json.load(f)
        DAO_ABI = dao_artifact["abi"]
        dao_contract = w3_py.eth.contract(address=checksum_dao_address, abi=DAO_ABI)
        tx = dao_contract.functions.vote(int(proposal_id), vote_choice == "true").build_transaction({
            "from": sender_address,
            "nonce": w3_py.eth.get_transaction_count(sender_address),
            "gas": 200000,
            "gasPrice": w3_py.to_wei("50", "gwei")
        })
        signed_tx = w3_py.eth.account.sign_transaction(tx, sender_private_key)
        tx_hash = w3_py.eth.send_raw_transaction(signed_tx.raw_transaction)
        w3_py.eth.wait_for_transaction_receipt(tx_hash)
        app.logger.info(f"Vote cast in DAO {checksum_dao_address}: Proposal={proposal_id}, Vote={vote_choice}")
        return jsonify({"message": f"Voted {'Yes' if vote_choice == 'true' else 'No'} on proposal {proposal_id}"}), 200
    except Exception as e:
        app.logger.error(f"Vote failed: {str(e)}")
        return jsonify({"error": f"Failed to vote: {str(e)}"}), 500


@app.route("/api/get_proposals", methods=["POST"])
@login_required
def get_proposals():
    dao_address = request.form.get("dao_address")
    if not dao_address or not is_wallet_address(dao_address):
        return jsonify({"error": "Valid DAO address required"}), 400
    try:
        w3_py = w3
        if not w3_py.is_connected():
            return jsonify({"error": "Blockchain not connected"}), 500
        checksum_dao_address = w3_py.to_checksum_address(dao_address)
        with open("../skillchain_contracts/artifacts/contracts/DAO.sol/DAO.json") as f:
            dao_artifact = json.load(f)
        DAO_ABI = dao_artifact["abi"]
        dao_contract = w3_py.eth.contract(address=checksum_dao_address, abi=DAO_ABI)
        proposal_count = dao_contract.functions.proposalCount().call()
        proposals = []
        for i in range(proposal_count):
            proposal = dao_contract.functions.getProposal(i).call()
            proposals.append({
                "id": i,
                "description": proposal[0],
                "proposer": proposal[1],
                "yesVotes": str(proposal[2]),
                "noVotes": str(proposal[3]),
                "active": proposal[4],
                "executed": proposal[5]
            })
        return jsonify({"proposals": proposals}), 200
    except Exception as e:
        app.logger.error(f"Get proposals failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch proposals: {str(e)}"}), 500


'''
def add_bulk_blog_posts():
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM blog_posts")
    if c.fetchone()[0] >= 50:  # Skip if already populated
        conn.close()
        return
    posts = [
        ("Bitcoin Halving 2024 Explained", "bitcoin halving 2024", 1, "What is the next halving?", "Details on Bitcoins 2024 halving...", "Crypto", "bitcoin,halving"),
        ("Ethereums Merge: One Year Later", "eth merge year later", 1, "How did it change ETH?", "A review of Ethereums PoS shift...", "Crypto", "ethereum,merge"),
        ("Web3 Gaming Revolution", "web3-gaming", 1, "Gaming on blockchain?", "Exploring Web3 gaming trends...", "Web3", "gaming,web3"),
        ("LLMs in Crypto Trading", "llm-crypto-trading", 0, "AI meets trading...", "How LLMs enhance trading bots...", "Tech,LLM", "ai,trading"),
        # Add 46 more...
    ] + [
        (f"Crypto News Update {i}", f"crypto-news-{i}", 1, f"Update #{i} on crypto...", f"Content for update #{i}...", "Crypto", "news")
        for i in range(4, 50)
    ]
    c.executemany(
        "INSERT INTO blog_posts (title, slug, isFree, teaser, content, category, tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
        posts
    )
    conn.commit()
    conn.close()
    app.logger.info("Added 50 blog posts to the database.")

add_bulk_blog_posts()  # Run once, then comment out
'''


@app.route("/api/analytics/<address>")
@login_required
def get_analytics(address):
    # Fetches wallet analytics for an address
    # Shows balance, transactions, etc., for the dashboard
    analytics = get_wallet_analytics(address)
    return jsonify(analytics) if "error" not in analytics else (jsonify({"error": analytics["error"]}), 400)


@app.route("/api/news")
def get_news_api():
    # Returns latest crypto news
    # Simple endpoint for the news section
    return jsonify(get_news_items())


@app.route("/api/query", methods=["POST"])
@login_required
def query():
    # Handles user questions about crypto
    # Answers with analytics, prices, or ChatGPT based on the question
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
    # Starts a Stripe subscription
    # Sends user to Stripe Checkout for payment
    plan = request.form.get("plan")  # Grabs basic or pro from frontend form
    price_id = {"basic": "price_1QzXTCKv6dFcpMYlxS712fan", "pro": "price_1QzXY5Kv6dFcpMYluAWw5638"}.get(plan)  # Test Price IDs, swap for live
    if not price_id:
        return jsonify({"error": "Invalid plan"}), 400  # Bad plan? Kick it back
    try:
        base_url = "http://localhost:3000" if os.getenv("APP_ENV") == "development" else "https://blockspeak.co"
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            customer=current_user.stripe_customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{base_url}/success?plan={plan}",
            cancel_url=base_url,
        )
        return jsonify({"checkout_url": checkout_session.url})  # Sends Stripe Checkout URL to frontend
    except stripe.error.StripeError as e:
        app.logger.error(f"Stripe error: {str(e)}")
        return jsonify({"error": "Subscription failed"}), 500


@app.route("/api/get_payment_address", methods=["GET"])
def get_payment_address():
    """Return the ETH payment address for subscriptions."""
    return jsonify({"eth_payment_address": ETH_PAYMENT_ADDRESS}), 200


@app.route("/api/subscription_status", methods=["GET"])
@login_required
def subscription_status():
    """
    Returns the current subscription status of the logged-in user.
    """
    try:
        conn = sqlite3.connect("users.db")
        c = conn.cursor()
        c.execute("SELECT subscription FROM users WHERE email = ?", (current_user.email,))
        subscription = c.fetchone()
        conn.close()
        app.logger.info(f"Subscription status for {current_user.email}: {subscription[0] if subscription else None}")
        return jsonify({"subscription": subscription[0] if subscription else None}), 200
    except Exception as e:
        app.logger.error(f"Error fetching subscription status for {current_user.email}: {str(e)}")
        return jsonify({"error": "Failed to fetch subscription status"}), 500


@app.route("/api/subscribe_eth", methods=["POST"])
@login_required
def subscribe_eth():
    """
    Handles ETH subscription payments by verifying an Ethereum transaction and updating the user's subscription plan.
    """
    plan = request.form.get("plan")
    tx_hash = request.form.get("tx_hash")
    if plan not in ["basic", "pro"]:
        app.logger.error(f"Invalid plan received: {plan}")
        return jsonify({"error": "Invalid plan"}), 400
    expected_amount = Decimal(str(BASIC_PLAN_ETH)) if plan == "basic" else Decimal(str(PRO_PLAN_ETH))
    app.logger.info(f"Processing {plan} plan subscription, expected amount: {expected_amount} ETH")
    try:
        tx = w3.eth.get_transaction(tx_hash)
        amount_sent = Decimal(str(w3.from_wei(tx["value"], "ether")))
        recipient = tx["to"].lower()
        sender = tx["from"].lower()
        app.logger.info(f"Transaction details - Hash: {tx_hash}, Amount: {amount_sent} ETH, To: {recipient}, From: {sender}")
        if recipient != ETH_PAYMENT_ADDRESS.lower():
            app.logger.error(f"Recipient mismatch: expected {ETH_PAYMENT_ADDRESS.lower()}, got {recipient}")
            return jsonify({"error": "Wrong recipient address"}), 400
        if sender != current_user.email.lower():
            app.logger.error(f"Sender mismatch: expected {current_user.email.lower()}, got {sender}")
            return jsonify({"error": "Sender mismatch"}), 400
        if amount_sent < expected_amount:
            app.logger.error(f"Insufficient payment: sent {amount_sent} ETH, required {expected_amount} ETH")
            return jsonify({"error": f"Insufficient payment, sent {amount_sent} ETH, need {expected_amount} ETH"}), 400
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt.status != 1:
            app.logger.error(f"Transaction failed on blockchain: hash={tx_hash}")
            return jsonify({"error": "Transaction failed on blockchain"}), 400
        app.logger.info(f"Transaction confirmed: hash={tx_hash}, block={receipt.blockNumber}")
        conn = sqlite3.connect("users.db")
        c = conn.cursor()
        c.execute("UPDATE users SET subscription = ? WHERE email = ?", (plan, current_user.email))
        conn.commit()
        conn.close()
        app.logger.info(f"ETH subscription successful for {current_user.email}, Plan: {plan}, Tx: {tx_hash}")
        return jsonify({"success": True, "plan": plan, "message": "Subscription updated"}), 200
    except Exception as e:
        app.logger.error(f"ETH subscription error for {current_user.email}: {str(e)}")
        error_details = {
            "error": "Payment verification failed",
            "details": str(e),
            "possible_causes": []
        }
        if "timeout" in str(e).lower():
            error_details["possible_causes"].append("Transaction confirmation took too long (timeout > 120s)")
        elif "transaction" in str(e).lower():
            error_details["possible_causes"].append("Invalid or missing transaction hash")
        else:
            error_details["possible_causes"].append("Unexpected error, check logs for stack trace")
        return jsonify(error_details), 500


@app.route("/api/subscription_success")
@login_required
def subscription_success():
    # Confirms a subscription after Stripe payment
    # Updates the users plan in the database
    plan = request.args.get("plan")
    if plan in ["basic", "pro"]:
        subscriptions = stripe.Subscription.list(customer=current_user.stripe_customer_id)
        if subscriptions.data and subscriptions.data[0].status == "active":
            conn = sqlite3.connect("users.db")
            c = conn.cursor()
            c.execute("UPDATE users SET subscription = ? WHERE email = ?", (plan, current_user.email))
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": "Subscription confirmed"})
    return jsonify({"error": "Subscription not confirmed"}), 500


@app.route("/api/")
def home_api():
    # Main data endpoint for the home page
    # Returns news, trends, coins, and user info
    history = current_user.history if current_user.is_authenticated else []
    subscription = current_user.subscription if current_user.is_authenticated else "free"
    return jsonify({
        "history": history, "news_items": get_news_items(), "trends": get_trending_crypto(),
        "x_profiles": get_x_profiles(), "top_coins": get_top_coins(), "stripe_key": STRIPE_PUBLISHABLE_KEY,
        "subscription": subscription
    })

@app.route("/api/coin_graph/<coin_id>")
def coin_graph(coin_id):
    # Returns 7-day price graph data for a coin
    # Used for the dashboard graph
    return jsonify(get_coin_graph(coin_id))


@app.route("/api/update_account", methods=["POST"])
@login_required
def update_account():
    # Updates the user's account in the database
    # Ensures the frontend and backend are in sync with the wallet address
    new_account = request.form.get("account")
    if new_account and not is_wallet_address(new_account) and new_account != '':
        return jsonify({"error": "Invalid wallet address"}), 400
    try:
        conn = sqlite3.connect("users.db")
        c = conn.cursor()
        c.execute("UPDATE users SET email = ? WHERE email = ?", (new_account or current_user.email, current_user.email))
        conn.commit()
        if new_account:
            user = load_user(new_account)
            if user:
                login_user(user)
        conn.close()
        return jsonify({"success": True, "message": "Account updated"}), 200
    except Exception as e:
        app.logger.error(f"Update account failed for {current_user.email}: {str(e)}")
        return jsonify({"error": "Failed to update account"}), 500


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path):
    # Redirects non-API requests to the frontend at https://blockspeak.co
    # Keeps our backend API-only
    if path.startswith("api/") or path == "nonce" or path == "login/metamask":
        return app.handle_url_build_error(None, path, None)
    return redirect("https://blockspeak.co", code=302)


@app.before_request
def start_session():
    # Ensures a session exists for each request
    # Sets up nonce for MetaMask login
    if "nonce" not in session:
        session["nonce"] = None

if __name__ == "__main__":
    # Runs the app locally for testing
    app.run(host="0.0.0.0", port=8080, debug=True)  # Listens on all interfaces, port 8080, with debug mode on
