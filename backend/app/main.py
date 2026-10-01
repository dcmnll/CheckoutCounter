from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.service import get_cart_by_session_id

app = FastAPI(title="Smart Cart Checkout API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/carts/{session_id}")
def get_cart(session_id: str):
    return get_cart_by_session_id(session_id)