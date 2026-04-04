const BASE_URL = 'http://localhost:5000/api'

export async function predictHealth(form) {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      age: Number(form.age),
      heart_rate: Number(form.heart_rate),
      systolic_bp: Number(form.systolic_bp),
      diastolic_bp: Number(form.diastolic_bp),
      bmi: Number(form.bmi),
      cholesterol: Number(form.cholesterol),
      glucose: Number(form.glucose),
      smoking: Number(form.smoking),
      diabetes: Number(form.diabetes),
      family_history: Number(form.family_history)
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Backend error')
  return data
}