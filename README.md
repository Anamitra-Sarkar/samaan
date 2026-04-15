# SAMAAN

SAMAAN is a full-stack government welfare platform for social justice, beneficiary support, DBT tracking, agency coordination, and village gap analysis.

The repository contains:

- `backend/` — FastAPI, SQLite, SQLAlchemy, ML helpers, HuggingFace Spaces Docker deployment
- `frontend/` — React 18 + TypeScript + Vite + Tailwind CSS, deployed to Vercel
- `.github/workflows/` — repository automation for syncing backend changes to HuggingFace Spaces

## Architecture

### Backend

- FastAPI on Python 3.11+
- SQLite with SQLAlchemy ORM
- JWT auth with bcrypt password hashing
- ML stack with scikit-learn, XGBoost, SHAP, OpenCV, Pillow, and Ultralytics
- Static uploads served from `/uploads`
- Designed to run in HuggingFace Spaces as a Docker app on port `7860`

### Frontend

- React 18 + TypeScript + Vite
- Tailwind CSS v3
- React Router v6
- Zustand for state
- Axios for API calls
- Leaflet + Recharts + React Hook Form + Zod

## Local development

### 1) Backend

```bash
cd backend
pip install -r requirements.txt
python -c "from main import app; print('backend ok')"
uvicorn main:app --host 0.0.0.0 --port 7860
```

Useful backend environment variables:

- `SAMAAN_UPLOADS_DIR` — overrides the upload directory if needed
- `SAMAAN_HF_MODEL_REPO` — optional HuggingFace model repo for downloading the credit model at startup
- `DATABASE_URL` — PostgreSQL URL for production deployments
- `SECRET_KEY` — required for JWT signing in production
- `ALLOWED_ORIGINS` — comma-separated frontend origins for CORS
- `SAMAAN_AADHAAR_VERIFY_URL`, `SAMAAN_DIGILOCKER_VERIFY_URL`, `SAMAAN_CCTNS_VERIFY_URL` — optional real verification endpoints
- `SAMAAN_ENV=production` — enables production-safe config checks
- `SAMAAN_ENABLE_SAMPLE_DATA` — keep unset/false in production

### 2) Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

For local API access, set:

```bash
export VITE_API_BASE_URL=http://localhost:7860
```

Then restart the Vite dev server.

## Development guide

### Frontend env

Create `frontend/.env.local` for local development:

```bash
VITE_API_BASE_URL=http://localhost:7860
```

For Vercel deployments, set `VITE_API_BASE_URL` in the project environment settings to the public HuggingFace Space URL.

Recommended frontend production envs:

- `VITE_API_BASE_URL` — public backend URL

### HuggingFace model workflow

The credit model can be trained once and uploaded to HuggingFace Hub with:

```bash
cd backend
HF_TOKEN=your_token python ml/train_and_push.py --repo Arko007/samaan-credit-model
```

At runtime, the backend can download the model from the Hub if `SAMAAN_HF_MODEL_REPO` is set.

## Deployment

### Backend deployment to HuggingFace Spaces

Deploy the `backend/` directory as a Docker Space.

Requirements already included in the repo:

- `backend/Dockerfile` exposes port `7860`
- `backend/requirements.txt` includes all runtime dependencies
- `README.md` includes Docker-compatible deployment guidance

Recommended HuggingFace Spaces secrets:

- `SAMAAN_HF_MODEL_REPO` — your model repo, for example `Arko007/samaan-credit-model`
- `HF_TOKEN` — only if your backend workflow or manual operations need Hub access

If you upload the backend through a GitHub sync workflow, make sure the GitHub repository secrets are configured first.

### Frontend deployment to Vercel

Deploy `frontend/` to Vercel.

Set this environment variable in Vercel:

- `VITE_API_BASE_URL` — the public URL of the deployed HuggingFace Space backend

## GitHub secrets and automation

The repository includes `.github/workflows/sync-backend-hf.yml`, which mirrors backend changes into a HuggingFace Space repository.

Configure these GitHub repository secrets:

- `HF_SPACE_REPO` — the full HuggingFace Space Git URL
- `HF_TOKEN` — a HuggingFace token with permission to push to the Space

Without both secrets, the workflow exits early by design.

## Handy checks

```bash
cd frontend && npm run build
cd backend && python -c "from main import app; print('backend ok')"
```

## Notes

- The favicon and sidebar logo use the same custom SAMAAN SVG mark.
- The DBT screens, credit pages, village pages, and loan pages are wired to real API calls.
- The frontend tab title updates dynamically per page.
