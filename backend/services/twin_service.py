from models.predictor import predictor
from utils.helper import (
    classify_age_group, classify_heart_rate, classify_bp,
    classify_bmi, calculate_health_score,
    generate_future_message, generate_explanation,
    classify_stress, classify_focus, classify_emotion, classify_posture
)


class DigitalTwinService:
    def create_twin_and_predict(self, data: dict):
        twin = {
            'age':          data['age'],
            'heart_rate':   data['heart_rate'],
            'systolic_bp':  data['systolic_bp'],
            'diastolic_bp': data['diastolic_bp'],
            'bmi':          data['bmi'],
            'cholesterol':  data['cholesterol'],
            'glucose':      data['glucose'],
            'age_group':    classify_age_group(data['age']),
            'hr_status':    classify_heart_rate(data['heart_rate']),
            'bp_status':    classify_bp(data['systolic_bp'], data['diastolic_bp']),
            'bmi_status':   classify_bmi(data['bmi']),
            'health_score': calculate_health_score(data),
            'twin_id':      f"TWIN-{int(data['age'])}-{int(data['heart_rate'])}"
        }

        presage_extras = {}

        if data.get('breathing_rate') is not None:
            presage_extras['breathing_rate'] = data['breathing_rate']

        if data.get('stress_score') is not None:
            presage_extras['stress_score'] = data['stress_score']
            presage_extras['stress_status'] = classify_stress(data['stress_score'])

        if data.get('focus_score') is not None:
            presage_extras['focus_score'] = data['focus_score']
            presage_extras['focus_status'] = classify_focus(data['focus_score'])

        if data.get('excitement_score') is not None:
            presage_extras['excitement_score'] = data['excitement_score']

        if data.get('emotion') is not None:
            presage_extras['emotion'] = data['emotion']
            presage_extras['emotion_label'] = classify_emotion(data['emotion'])

        if data.get('micro_expressions') is not None:
            presage_extras['micro_expressions'] = data['micro_expressions']

        if data.get('posture') is not None:
            presage_extras['posture'] = data['posture']
            presage_extras['posture_status'] = classify_posture(data['posture'])

        if data.get('activity_level') is not None:
            presage_extras['activity_level'] = data['activity_level']

        if presage_extras:
            twin['presage'] = presage_extras

        prediction = predictor.predict(data)

        return {
            'digital_twin': twin,
            'prediction':   prediction,
            'future_risk':  generate_future_message(
                                prediction['risk_label'],
                                prediction['probability']
                            ),
            'explanation': {
                'top_factors': prediction['top_factors'],
                'summary':     generate_explanation(
                                   prediction['top_factors'],
                                   prediction['risk_label']
                               )
            },
            'status': 'success'
        }


twin_service = DigitalTwinService()
