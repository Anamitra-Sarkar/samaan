# Entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
#from database import create_all_tables, seed_if_empty
#from ml.credit_model import load_or_train_credit_model
from routers import auth, loan_tracking, credit_scoring, village_gaps, agency_mapping, dbt

app = FastAPI(title="SAMAAN API", version="1.0.0")

# CORS: allow all origins (for Vercel frontend)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Mount all routers with prefixes
app.include_router(auth.router, prefix="/auth")
app.include_router(loan_tracking.router, prefix="/loan")
app.include_router(credit_scoring.router, prefix="/credit")
app.include_router(village_gaps.router, prefix="/village")
#app.include_router(agency_router, prefix="/agency")
#app.include_router(dbt_router, prefix="/dbt")

# On startup: create all DB tables, seed data if empty, train/load ML model
@app.on_event("startup")
async def startup():
    #create_all_tables()
    #seed_if_empty()
    #load_or_train_credit_model()
    pass