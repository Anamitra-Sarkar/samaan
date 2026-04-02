from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine, SessionLocal
from models import user, loan, credit, village, agency, dbt  # noqa: F401 - register models
from routers import auth, loan_tracking, credit_scoring, village_gaps, agency_mapping, dbt as dbt_router, activity
from ml.credit_model import get_credit_model
from seed_data import seed_if_empty

app = FastAPI(title="SAMAAN API", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router, prefix="/auth")
app.include_router(loan_tracking.router, prefix="/loan")
app.include_router(credit_scoring.router, prefix="/credit")
app.include_router(village_gaps.router, prefix="/village")
app.include_router(agency_mapping.router, prefix="/agency")
app.include_router(dbt_router.router, prefix="/dbt")
app.include_router(activity.router, prefix="/activity")

@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    seed_if_empty()
    get_credit_model()
