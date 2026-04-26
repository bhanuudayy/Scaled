from fastapi import FastAPI

from app.routes.analyze import router as analyze_router


app = FastAPI(
    debug=True,
    title="Creative Analysis Engine",
    version="0.1.0",
    description=(
        "MVP backend for pre-launch creative testing. "
        "It translates neural-style signals into marketing insight and does "
        "not claim exact conversion prediction."
    ),
)


@app.get("/health", tags=["system"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(analyze_router)
