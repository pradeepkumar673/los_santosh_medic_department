import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    NoShowPredictionRequest,
    NoShowPredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    BatchPredictionItem,
)
from app.model_loader import load_model, get_model

ALL_FEATURES = [
    "age", "past_no_shows", "total_past_appointments", "distance_km",
    "lead_time_days", "day_of_week", "time_slot", "department", "appointment_type",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model once when the service boots, not on every request.
    load_model()
    yield


app = FastAPI(
    title="MediQueue AI — No-Show Prediction Service",
    version="1.0.0",
    lifespan=lifespan,
)

# Restrict this to your Node API's origin in production via env var.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _risk_band(probability: float) -> tuple[str, str]:
    if probability < 0.3:
        return "Low", "No action needed."
    if probability < 0.6:
        return "Medium", "Send a reminder SMS/email 24 hours before the appointment."
    return "High", "Send a reminder + confirmation call; consider overbooking the slot."


def _predict_one(payload: NoShowPredictionRequest, pipeline, metadata) -> NoShowPredictionResponse:
    row = pd.DataFrame([{
        "age": payload.age,
        "past_no_shows": payload.past_no_shows,
        "total_past_appointments": payload.total_past_appointments,
        "distance_km": payload.distance_km,
        "lead_time_days": payload.lead_time_days,
        "day_of_week": payload.day_of_week.value,
        "time_slot": payload.time_slot.value,
        "department": payload.department,
        "appointment_type": payload.appointment_type.value,
    }])[ALL_FEATURES]

    probability = float(pipeline.predict_proba(row)[0, 1])
    risk_level, action = _risk_band(probability)

    return NoShowPredictionResponse(
        will_no_show=probability >= 0.5,
        no_show_probability=round(probability, 4),
        risk_level=risk_level,
        recommended_action=action,
        model_version=metadata.get("trained_at", "unknown"),
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/model-info")
def model_info():
    _, metadata = get_model()
    return metadata


@app.post("/predict-no-show", response_model=NoShowPredictionResponse)
def predict_no_show(payload: NoShowPredictionRequest):
    try:
        pipeline, metadata = get_model()
        return _predict_one(payload, pipeline, metadata)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


@app.post("/predict-no-show/batch", response_model=BatchPredictionResponse)
def predict_no_show_batch(payload: BatchPredictionRequest):
    """
    Useful for the Node backend to score a whole day's appointment list
    in one call instead of N round trips.
    """
    pipeline, metadata = get_model()
    results = []
    for idx, appt in enumerate(payload.appointments):
        single = _predict_one(appt, pipeline, metadata)
        results.append(BatchPredictionItem(index=idx, **single.model_dump()))
    return BatchPredictionResponse(results=results)
