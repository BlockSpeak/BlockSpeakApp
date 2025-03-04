import os
from flask import Flask, request, render_template
import requests
from openai import OpenAI

app = Flask(__name__)

ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/query', methods=['POST'])
def query():
    user_question = request.form['question']
    url = f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
    if "gas" in user_question.lower():
        payload = {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 1}
    else:
        payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
    try:
        response = requests.post(url, json=payload).json()
        app.logger.info(f"Alchemy Response: {response}")
        if 'result' in response:
            if "gas" in user_question.lower():
                gas_price = int(response['result'], 16) / 1e9
                prompt = f"User asked: '{user_question}'. Current Ethereum gas price is {gas_price} Gwei. Answer simply."
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
        return render_template('index.html', answer=answer, question=user_question)
    except Exception as e:
        app.logger.error(f"Query failed: {str(e)}")
        return render_template('index.html', answer="Something went wrong - try again later!", question=user_question)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)