import os
from flask import Flask, request, render_template, session
import requests
from openai import OpenAI

app = Flask(__name__)
app.secret_key = "supersecretkey"  # For session - keep this safe later!

ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

@app.route('/')
def home():
    last_query = session.get('last_query', None)  # Get last question/answer
    return render_template('index.html', last_query=last_query)

@app.route('/query', methods=['POST'])
def query():
    user_question = request.form['question']
    url = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
    if "gas" in user_question.lower():
        payload = {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 1}
    elif "transactions" in user_question.lower() or "many" in user_question.lower():
        # Get latest block first
        block_payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
        block_response = requests.post(url, json=block_payload).json()
        if 'result' in block_response:
            latest_block = block_response['result']
            payload = {"jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": [latest_block, False], "id": 1}
        else:
            return render_template('index.html', answer="Oops! Couldn’t fetch block data.", question=user_question)
    else:
        payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
    
    try:
        response = requests.post(url, json=payload).json()
        app.logger.info(f"Alchemy Response: {response}")
        if 'result' in response:
            if "gas" in user_question.lower():
                gas_price = int(response['result'], 16) / 1e9
                prompt = f"User asked: '{user_question}'. Current Ethereum gas price is {gas_price} Gwei. Answer simply."
            elif "transactions" in user_question.lower() or "many" in user_question.lower():
                tx_count = len(response['result']['transactions'])
                prompt = f"User asked: '{user_question}'. The latest Ethereum block has {tx_count} transactions. Answer simply."
            else:
                block_number = int(response['result'], 16)
                prompt = f"User asked: '{user_question}'. Latest Ethereum block number is {block_number}. Answer simply."
        else:
            app.logger.error(f"No 'result' in response: {response}")
            return render_template('index.html', answer="Oops! Blockchain data unavailable - try again.", question=user_question)
        ai_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        answer = ai_response.choices[0].message.content
        # Store last query in session
        session['last_query'] = {'question': user_question, 'answer': answer}
        return render_template('index.html', answer=answer, question=user_question, last_query=session['last_query'])
    except Exception as e:
        app.logger.error(f"Query failed: {str(e)}")
        return render_template('index.html', answer="Something went wrong - try again later!", question=user_question)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)