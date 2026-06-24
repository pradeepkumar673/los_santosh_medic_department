import json
from pathlib import Path
import joblib

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "no_show_model.pkl"
METADATA_PATH = MODEL_DIR / "model_metadata.json"

_pipeline = None
_metadata = {}


def load_model():
    """Loads the trained pipeline + metadata once at startup, cached in-process."""
    global _pipeline, _metadata
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. Run `python train_model.py` first."
        )
    _pipeline = joblib.load(MODEL_PATH)
    if METADATA_PATH.exists():
        _metadata = json.loads(METADATA_PATH.read_text())
    return _pipeline, _metadata


def get_model():
    if _pipeline is None:
        load_model()
    return _pipeline, _metadata
