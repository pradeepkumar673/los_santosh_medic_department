import urllib.request
import json
from pydantic import BaseModel

class WeatherRiskRequest(BaseModel):
    latitude: float
    longitude: float

class WeatherRiskResponse(BaseModel):
    temperature: float
    precipitation: float
    wind_speed: float
    weather_code: int
    disasterRiskScore: int
    riskLevel: str

def fetch_weather_risk(latitude: float, longitude: float) -> WeatherRiskResponse:
    """
    Calls Open-Meteo free API to fetch current weather data and calculates a disaster risk score.
    """
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude}&longitude={longitude}"
        f"&current=temperature_2m,precipitation,weather_code,wind_speed_10m"
        f"&wind_speed_unit=kmh"
    )
    
    req = urllib.request.Request(url, headers={'User-Agent': 'MediQueueAI-EmergencyFlow/1.0'})
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode())
    
    current = data.get("current", {})
    temp = current.get("temperature_2m", 20.0)
    precip = current.get("precipitation", 0.0)
    wind = current.get("wind_speed_10m", 0.0)
    code = current.get("weather_code", 0)
    
    score = 0
    
    # Precipitation scoring
    if precip > 20: score += 50
    elif precip > 10: score += 30
    elif precip > 5: score += 15
    
    # Wind scoring
    if wind > 60: score += 35
    elif wind > 40: score += 20
    elif wind > 25: score += 10
    
    # Severe weather codes (storms, heavy snow, freezing rain)
    severe_codes = [56, 57, 66, 67, 71, 73, 75, 77, 85, 86, 95, 96, 99]
    if code in severe_codes: score += 25
    
    # Extreme temperature scoring
    if temp < -10 or temp > 45: score += 15
    elif temp < 0 or temp > 38: score += 5
    
    score = min(100, score)
    
    if score < 25: level = "low"
    elif score < 50: level = "moderate"
    elif score < 75: level = "high"
    elif score < 90: level = "very_high"
    else: level = "critical"
    
    return WeatherRiskResponse(
        temperature=temp,
        precipitation=precip,
        wind_speed=wind,
        weather_code=code,
        disasterRiskScore=score,
        riskLevel=level
    )
