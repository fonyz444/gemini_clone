from flask import Blueprint, jsonify, request
import os
import google.generativeai as genai

chat_bp = Blueprint("chat_bp", __name__)

# IMPORTANT: API key should be set as an environment variable GEMINI_API_KEY
API_KEY = os.environ.get("GEMINI_API_KEY")

model = None # Initialize model as None

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
    except Exception as e:
        print(f"Error configuring Gemini API: {e}. Please ensure GEMINI_API_KEY is set correctly.")
        # model remains None, will be handled in the route
else:
    print("GEMINI_API_KEY environment variable not found. The application will not be able to connect to Gemini API.")

@chat_bp.route("/chat", methods=["POST"])
def handle_chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    bot_reply = ""
    reply_type = "text"

    if not API_KEY or not model:
        bot_reply = "Извините, Gemini API не настроен. Пожалуйста, убедитесь, что переменная окружения GEMINI_API_KEY установлена правильно и содержит действующий ключ."
        return jsonify({"reply": bot_reply, "type": reply_type})

    if not user_message:
        bot_reply = "Пожалуйста, введите сообщение."
        return jsonify({"reply": bot_reply, "type": reply_type})

    try:
        response = model.generate_content(user_message)
        
        full_response_text = []
        for part in response.parts:
            if hasattr(part, 'text') and part.text:
                full_response_text.append(part.text)
        
        bot_reply = "\n".join(full_response_text)

        if "```" in bot_reply: 
            reply_type = "code_block"
        else:
            reply_type = "text"

        if not bot_reply:
             bot_reply = "Извините, я не смог сгенерировать ответ. Попробуйте переформулировать ваш запрос."
             reply_type = "text"

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        bot_reply = f"Извините, произошла ошибка при обращении к Gemini API: {str(e)}"
        reply_type = "text"
        
    return jsonify({"reply": bot_reply, "type": reply_type})

