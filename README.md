# SAMAAN

SAMAAN is a full-stack government welfare platform with a FastAPI backend and a React + Vite frontend.

## Repository layout

- `backend/` — FastAPI, SQLite, ML helpers, Docker Space deployment
- `frontend/` — React + TypeScript + Vite, deployed to Vercel

## Local development

Install backend dependencies and run the API:

```bash
cd backend
pip install -r requirements.txt
python -c "from main import app"
uvicorn main:app --host 0.0.0.0 --port 7860
```

Install frontend dependencies and run the UI:

```bash
cd frontend
npm install
npm run dev
```

## Deployment

Backend:
- Deploy the `backend/` folder as a HuggingFace Spaces Docker app.
- The backend README includes the required Spaces frontmatter.
- The GitHub Actions workflow `.github/workflows/sync-backend-hf.yml` mirrors backend changes to the HF Space repo.

Frontend:
- Deploy `frontend/` to Vercel.
- Set `VITE_API_BASE_URL` to the HuggingFace Space URL.

