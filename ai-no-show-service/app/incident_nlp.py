import re
from pydantic import BaseModel
from typing import Optional

class IncidentTextRequest(BaseModel):
    text: str

class IncidentClassification(BaseModel):
    event_type: str
    location: Optional[str] = None
    severity: str
    reported_casualties: int
    confidence_score: float

def classify_incident_text(text: str) -> IncidentClassification:
    """
    Simple rule-based NLP to extract incident details from free text reports.
    """
    text_lower = text.lower()
    
    # Extract Event Type
    event_type = "unknown"
    if any(w in text_lower for w in ["fire", "blaze", "burning"]): event_type = "fire"
    elif any(w in text_lower for w in ["flood", "inundation", "overflow"]): event_type = "flood"
    elif any(w in text_lower for w in ["earthquake", "tremor", "quake"]): event_type = "earthquake"
    elif any(w in text_lower for w in ["accident", "crash", "collision"]): event_type = "traffic_accident"
    elif any(w in text_lower for w in ["storm", "hurricane", "tornado", "cyclone"]): event_type = "storm"
    elif any(w in text_lower for w in ["explosion", "blast", "bomb"]): event_type = "explosion"
    elif any(w in text_lower for w in ["chemical", "gas leak", "hazmat"]): event_type = "hazmat"
    
    # Extract Severity
    severity = "medium"
    if any(w in text_lower for w in ["critical", "mass casualty", "catastrophic", "severe"]): severity = "critical"
    elif any(w in text_lower for w in ["major", "serious", "high"]): severity = "high"
    elif any(w in text_lower for w in ["minor", "small", "low"]): severity = "low"
    
    # Extract Casualties
    casualties = 0
    cas_match = re.search(r'(\d+)\s*(?:dead|injured|casualties|people|victims|wounded)', text_lower)
    if cas_match:
        casualties = int(cas_match.group(1))
        
    # Extract Location (simple heuristic)
    location = None
    loc_match = re.search(r'(?:in|at|near)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$|and|with)', text)
    if loc_match:
        location = loc_match.group(1).strip()
        
    # Calculate Confidence Score
    conf = 0.4
    if event_type != "unknown": conf += 0.2
    if severity != "medium": conf += 0.1
    if casualties > 0: conf += 0.2
    if location: conf += 0.1
    
    return IncidentClassification(
        event_type=event_type,
        location=location,
        severity=severity,
        reported_casualties=casualties,
        confidence_score=min(1.0, round(conf, 2))
    )
