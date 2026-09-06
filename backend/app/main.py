import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router

app = FastAPI(
    title="EPOCH - AI Landslide Early-Warning & Decision Support API",
    description="Geospatial Early Warning & Disaster Decision Support Platform for India's North Eastern Region (SIH PS SIH26001)",
    version="2.5.0"
)

cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ]

# If CORS_ALLOW_ALL is explicitly set in development
if os.getenv("CORS_ALLOW_ALL", "false").lower() in ["true", "1", "yes"]:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True if allowed_origins != ["*"] else False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root_status():
    return {
        "status": "ONLINE",
        "system": "EPOCH Geospatial Command Intelligence",
        "region": "All 8 North Eastern States (Assam, Sikkim, Meghalaya, Arunachal Pradesh, Manipur, Mizoram, Nagaland, Tripura)",
        "api_docs": "/docs",
        "endpoints": "/api/v1/risk/summary"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
