"""Run:  uvicorn app.main:app --reload --port 8000   (from the backend/ folder)
Docs: http://localhost:8000/docs"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routes import dataset, environment
from .sources import register_all

register_all()

app = FastAPI(title="Maia backend", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=config.FRONTEND_ORIGINS, allow_methods=["*"], allow_headers=["*"])

app.include_router(dataset.router)
app.include_router(environment.router)


@app.get("/api/health")
async def health():
    return {"ok": True, "offline": config.OFFLINE}
