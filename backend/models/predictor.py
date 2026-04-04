import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

FEATURES = ['age','heart_rate','systolic_bp','diastolic_bp','bmi','cholesterol','glucose','smoking','diabetes','family_history']

class HealthPredictor:
    def __init__(self):
        self.model = LogisticRegression(random_state=42, max_iter=1000)
        self.scaler = StandardScaler()
        self._train()

    def _train(self):
        np.random.seed(42)
        n = 500

        # Low risk patients
        low = np.column_stack([
            np.random.normal(35, 8, n),    # age
            np.random.normal(72, 8, n),    # heart_rate
            np.random.normal(115, 10, n),  # systolic_bp
            np.random.normal(75, 8, n),    # diastolic_bp
            np.random.normal(23, 3, n),    # bmi
            np.random.normal(180, 20, n),  # cholesterol
            np.random.normal(85, 10, n),   # glucose
            np.random.binomial(1, 0.1, n), # smoking
            np.random.binomial(1, 0.05, n),# diabetes
            np.random.binomial(1, 0.1, n), # family_history
        ])

        # High risk patients
        high = np.column_stack([
            np.random.normal(60, 10, n),
            np.random.normal(95, 15, n),
            np.random.normal(145, 15, n),
            np.random.normal(95, 10, n),
            np.random.normal(30, 4, n),
            np.random.normal(240, 30, n),
            np.random.normal(130, 25, n),
            np.random.binomial(1, 0.6, n),
            np.random.binomial(1, 0.4, n),
            np.random.binomial(1, 0.5, n),
        ])

        X = np.vstack([low, high])
        y = np.array([0]*n + [1]*n)
        self.model.fit(self.scaler.fit_transform(X), y)

    def predict(self, inputs: dict) -> dict:
        X = np.array([[inputs[f] for f in FEATURES]])
        X_scaled = self.scaler.transform(X)
        pred = self.model.predict(X_scaled)[0]
        probs = self.model.predict_proba(X_scaled)[0]

        # Feature importance — which vitals push risk up
        coeffs = self.model.coef_[0]
        scaled_vals = X_scaled[0]
        contributions = {FEATURES[i]: float(coeffs[i] * scaled_vals[i]) for i in range(len(FEATURES))}
        top_factors = sorted(contributions, key=lambda k: abs(contributions[k]), reverse=True)[:3]

        return {
    'risk_label': 'HIGH' if pred == 1 else 'LOW',
    'probability': round(float(probs[1]) * 100, 1),
    'confidence': round(float(max(probs)) * 100, 1),
    'top_factors': top_factors,
    'contributions': contributions
}

predictor = HealthPredictor()