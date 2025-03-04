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
    payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
    response = requests.post(url, json=payload).json()
    block_number = int(response['result'], 16)
    prompt = f"User asked: '{user_question}'. Latest Ethereum block number is {block_number}. Answer simply."
    ai_response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    answer = ai_response.choices[0].message.content
    return render_template('index.html', answer=answer, question=user_question)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)