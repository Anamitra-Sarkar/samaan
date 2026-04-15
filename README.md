# SAMAAN

SAMAAN is a full-stack government welfare platform for social justice, beneficiary support, DBT tracking, agency coordination, and village gap analysis.

The repository contains:

- `backend/` — FastAPI, SQLite, SQLAlchemy, ML helpers, HuggingFace Spaces Docker deployment
- `frontend/` — React 18 + TypeScript + Vite + Tailwind CSS, deployed to Vercel
- `.github/workflows/` — repository automation for syncing backend changes to HuggingFace Spaces

## Architecture

### Backend

- FastAPI on Python 3.11+
- SQLite with SQLAlchemy ORM for local use; PostgreSQL is supported for production via `DATABASE_URL`
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

## Production deployment guide

### 1) Hugging Face Space backend

Deploy **`backend/` only** as a **Docker Space**.

1. Create a new Space on Hugging Face.
2. Set the Space type to **Docker**.
3. Copy the contents of `backend/` into the Space repo root.
4. Make sure the root contains:
   - `Dockerfile`
   - `README.md` with HF metadata
   - `main.py`
   - `requirements.txt`
5. Add these Space secrets:
   - `SAMAAN_ENV=production`
   - `SECRET_KEY`
   - `DATABASE_URL` (PostgreSQL recommended)
   - `ALLOWED_ORIGINS` (your Vercel URL)
   - `SAMAAN_HF_MODEL_REPO` if you want the backend to download a pretrained credit model
   - `SAMAAN_AADHAAR_VERIFY_URL`, `SAMAAN_DIGILOCKER_VERIFY_URL`, `SAMAAN_CCTNS_VERIFY_URL` when real verification integrations are available
6. Keep `SAMAAN_ENABLE_SAMPLE_DATA` disabled in production.

The backend already exposes `/health` and serves uploads from `/uploads`.

### 2) Frontend deployment to Vercel

Deploy **`frontend/`** to Vercel.

1. Import the `frontend/` folder as the Vercel project root.
2. Set the environment variable:
   - `VITE_API_BASE_URL` = public Hugging Face Space URL
3. Build command: `npm run build`
4. Output directory: `dist`

`frontend/vercel.json` already handles SPA rewrites and static asset caching.

### 3) GitHub sync automation

The repo includes `.github/workflows/sync-backend-hf.yml` to mirror backend changes into the HF Space repository.

Configure these GitHub secrets:

- `HF_SPACE_REPO` — full Hugging Face Space Git URL
- `HF_TOKEN` — token with write access to the Space

### 4) Recommended production flow

1. Deploy backend to Hugging Face.
2. Deploy frontend to Vercel.
3. Set `ALLOWED_ORIGINS` on the backend to the Vercel domain.
4. If using pretrained credit scoring, set `SAMAAN_HF_MODEL_REPO`.
5. If using real verification providers, configure the verification URLs before opening the app to users.

## Handy checks

```bash
cd frontend && npm run build
cd backend && python -c "from main import app; print('backend ok')"
```

## Notes

- The favicon and sidebar logo use the same custom SAMAAN SVG mark.
- The DBT screens, credit pages, village pages, and loan pages are wired to real API calls.
- The frontend tab title updates dynamically per page.
