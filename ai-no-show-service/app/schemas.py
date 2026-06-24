from enum import Enum
from pydantic import BaseModel, Field, conint, confloat


class DayOfWeek(str, Enum):
    monday = "Monday"
    tuesday = "Tuesday"
    wednesday = "Wednesday"
    thursday = "Thursday"
    friday = "Friday"
    saturday = "Saturday"
    sunday = "Sunday"


class TimeSlot(str, Enum):
    morning = "Morning"
    afternoon = "Afternoon"
    evening = "Evening"


class AppointmentType(str, Enum):
    scheduled = "scheduled"
    follow_up = "follow_up"
    walk_in = "walk_in"
    emergency = "emergency"


class NoShowPredictionRequest(BaseModel):
    age: conint(ge=0, le=120) = Field(..., description="Patient age in years")
    past_no_shows: conint(ge=0) = Field(..., description="Count of past no-show appointments")
    total_past_appointments: conint(ge=0) = Field(..., description="Total past appointments booked")
    distance_km: confloat(ge=0) = Field(..., description="Distance from patient to hospital, km")
    lead_time_days: conint(ge=0) = Field(..., description="Days between booking and scheduled date")
    day_of_week: DayOfWeek
    time_slot: TimeSlot
    department: str = Field(..., description="Department name, e.g. 'Cardiology'")
    appointment_type: AppointmentType

    class Config:
        json_schema_extra = {
            "example": {
                "age": 42,
                "past_no_shows": 2,
                "total_past_appointments": 7,
                "distance_km": 12.5,
                "lead_time_days": 5,
                "day_of_week": "Monday",
                "time_slot": "Morning",
                "department": "Cardiology",
                "appointment_type": "scheduled",
            }
        }


class NoShowPredictionResponse(BaseModel):
    will_no_show: bool
    no_show_probability: float
    risk_level: str  # "Low" | "Medium" | "High"
    recommended_action: str
    model_version: str


class BatchPredictionRequest(BaseModel):
    appointments: list[NoShowPredictionRequest]


class BatchPredictionItem(NoShowPredictionResponse):
    index: int


class BatchPredictionResponse(BaseModel):
    results: list[BatchPredictionItem]
