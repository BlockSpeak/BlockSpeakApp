import os
from flask import Flask, request, render_template, session, jsonify
from markupsafe import Markup
import requests
from openai import OpenAI
import logging

app = Flask(__name__)
app.secret_key = "supersecretkey"

# Set up logging
logging.basicConfig(level=logging.INFO)

ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

@app.route("/")
def home():
    return render_template("index.html", message="Welcome to BlockSpeak!")

@app.route("/query", methods=["POST"])
def query():
    user_question = request.form["question"].strip()
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": f"Answer this about crypto: {user_question}"}],
            max_tokens=100
        )
        answer = response.choices[0].message.content
    except Exception as e:
        answer = f"Sorry, I had trouble answering that: {str(e)}"
    return render_template("index.html", answer=answer, question=user_question, message="Welcome to BlockSpeak!")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)