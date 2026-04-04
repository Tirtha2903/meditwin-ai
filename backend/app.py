from flask import Flask
from flask_cors import CORS
from routes.api import api_bp

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(api_bp, url_prefix='/api')
    return app

if __name__ == '__main__':
    app = create_app()
    print("🏥 MediTwin AI Backend running on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
