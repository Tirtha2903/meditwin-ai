from models.predictor import predictor
from utils.helper import (
    classify_age_group, classify_heart_rate, classify_bp,
    classify_bmi, calculate_health_score,
    generate_future_message, generate_explanation
)

class DigitalTwinService:
    def create_twin_and_predict(self, data: dict) -> dict:
        twin = {
            'age': data['age'],
            'heart_rate': data['heart_rate'],
            'systolic_bp': data['systolic_bp'],
            'diastolic_bp': data['diastolic_bp'],
            'bmi': data['bmi'],
            'cholesterol': data['cholesterol'],
            'glucose': data['glucose'],
            'age_group': classify_age_group(data['age']),
            'hr_status': classify_heart_rate(data['heart_rate']),
            'bp_status': classify_bp(data['systolic_bp'], data['diastolic_bp']),
            'bmi_status': classify_bmi(data['bmi']),
            'health_score': calculate_health_score(data),
            'twin_id': f"TWIN-{data['age']}-{data['heart_rate']}"
        }
        prediction = predictor.predict(data)
        return {
    'digital_twin': twin,
    'prediction': prediction,
    'future_risk': generate_future_message(prediction['risk_label'], prediction['probability']),
    'explanation': {
        'top_factors': prediction['top_factors'],
        'summary': generate_explanation(prediction['top_factors'], prediction['risk_label'])
    },
    'status': 'success'
}

twin_service = DigitalTwinService()