def classify_age_group(age):
    if age < 18: return "Minor"
    if age < 35: return "Young Adult"
    if age < 50: return "Middle-Aged"
    if age < 65: return "Senior"
    return "Elderly"

def classify_heart_rate(hr):
    if hr < 60: return "Bradycardia (Low)"
    if hr <= 100: return "Normal"
    if hr <= 130: return "Elevated"
    return "Tachycardia (High)"

def classify_bp(systolic, diastolic):
    if systolic < 120 and diastolic < 80: return "Normal"
    if systolic < 130: return "Elevated"
    if systolic < 140: return "High Stage 1"
    return "High Stage 2"

def classify_bmi(bmi):
    if bmi < 18.5: return "Underweight"
    if bmi < 25: return "Normal"
    if bmi < 30: return "Overweight"
    return "Obese"

def calculate_health_score(data):
    score = 100
    age = data['age']
    hr = data['heart_rate']
    sbp = data['systolic_bp']
    bmi = data['bmi']
    chol = data['cholesterol']
    gluc = data['glucose']

    if age > 60: score -= 20
    elif age > 45: score -= 10
    elif age > 35: score -= 5

    if hr < 50 or hr > 130: score -= 20
    elif hr < 60 or hr > 100: score -= 10

    if sbp >= 140: score -= 20
    elif sbp >= 130: score -= 10

    if bmi >= 30: score -= 15
    elif bmi >= 25: score -= 7

    if chol >= 240: score -= 15
    elif chol >= 200: score -= 7

    if gluc >= 126: score -= 15
    elif gluc >= 100: score -= 7

    if data['smoking'] == 1: score -= 10
    if data['diabetes'] == 1: score -= 10
    if data['family_history'] == 1: score -= 5

    return max(score, 0)

def generate_future_message(risk_label, probability):
    if risk_label == "HIGH":
        if probability > 80:
            return "Critical Alert: Extremely high cardiovascular risk. Immediate medical consultation recommended within 7 days."
        elif probability > 65:
            return "High Risk: Significant cardiovascular stress predicted. Please schedule a doctor visit this week."
        return "Moderate-High Risk: Elevated risk factors detected. Consult a physician this week."
    else:
        if probability < 20:
            return "Excellent: Very low cardiovascular risk for the next 7 days. Keep it up!"
            return "Low Risk: Minor risk indicators present. Maintain healthy habits."

def generate_explanation(top_factors, risk_label):
    factor_labels = {
        'age': 'Age',
        'heart_rate': 'Heart Rate',
        'systolic_bp': 'Systolic BP',
        'diastolic_bp': 'Diastolic BP',
        'bmi': 'BMI',
        'cholesterol': 'Cholesterol',
        'glucose': 'Blood Glucose',
        'smoking': 'Smoking',
        'diabetes': 'Diabetes',
        'family_history': 'Family History'
    }
    named = [factor_labels[f] for f in top_factors if f in factor_labels]
    factors_str = ', '.join(named)
    if risk_label == 'HIGH':
        return f"Your top risk drivers are: {factors_str}. These factors are pushing your cardiovascular risk above safe thresholds."
    return f"Your vitals look mostly healthy. Monitor: {factors_str} for best long-term outcomes."