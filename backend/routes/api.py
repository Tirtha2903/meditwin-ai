from flask import Blueprint, request, jsonify, Response
from services.twin_service import twin_service
from google import genai
import requests as req

api_bp = Blueprint('api', __name__)

GEMINI_KEY = 'AIzaSyA63WJBx6Vvug0AFmhMSetxYYjtccs5LbU'
ELEVENLABS_KEY = 'sk_08c0de3515ab66d6b6651ff161fb1a4ba2a2947134ef3e9b'
VOICE_ID = 'sB7vwSCyX0tQmU24cW2C'
REQUIRED = ['age','heart_rate','systolic_bp','diastolic_bp','bmi','cholesterol','glucose','smoking','diabetes','family_history']

gemini_client = genai.Client(api_key=GEMINI_KEY)


@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'MediTwin AI running'})


@api_bp.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        parsed = {k: float(data[k]) for k in REQUIRED}
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({'error': f'Missing or invalid field: {e}'}), 400
    result = twin_service.create_twin_and_predict(parsed)
    return jsonify(result), 200


@api_bp.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '')
    context = data.get('context', '')
    try:
        prompt = f"{context}\n\nUser question: {message}\n\nAnswer in under 100 words. Be direct and helpful."
        response = gemini_client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        return jsonify({'reply': response.text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/speak', methods=['POST'])
def speak():
    data = request.get_json()
    text = data.get('text', '')
    try:
        response = req.post(
            f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}',
            headers={
                'xi-api-key': ELEVENLABS_KEY,
                'Content-Type': 'application/json'
            },
            json={
                'text': text,
                'model_id': 'eleven_turbo_v2_5',
                'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75}
            }
        )
        return Response(response.content, mimetype='audio/mpeg')
    except Exception as e:
        return jsonify({'error': str(e)}), 500