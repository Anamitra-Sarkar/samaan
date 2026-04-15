from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from models import user, loan, credit, village, agency, dbt, notification  # noqa: F401 - register models
from routers import auth, loan_tracking, credit_scoring, village_gaps, agency_mapping, dbt as dbt_router, activity, notifications
from ml.credit_model import get_credit_model
from seed_data import seed_sample_data
from utils.file_utils import ensure_upload_root
from utils.runtime import env_flag, get_cors_origins, get_cors_origin_regex

app = FastAPI(title="SAMAAN API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=get_cors_origin_regex(),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(loan_tracking.router, prefix="/loan")
app.include_router(credit_scoring.router, prefix="/credit")
app.include_router(village_gaps.router, prefix="/village")
app.include_router(agency_mapping.router, prefix="/agency")
app.include_router(dbt_router.router, prefix="/dbt")
app.include_router(activity.router, prefix="/activity")
app.include_router(notifications.router, prefix="/notifications")

uploads_dir = ensure_upload_root()
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    if env_flag("SAMAAN_ENABLE_SAMPLE_DATA"):
        seed_sample_data()
    get_credit_model()
