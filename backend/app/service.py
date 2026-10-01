from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List
from fastapi import HTTPException
from app.adapter import CartAdapter

def round_money(val: float) -> float:
    return float(Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

def get_cart_by_session_id(session_id: str) -> Dict[str, Any]:
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="Session ID must not be empty")

    clean_session_id = session_id.strip()
    raw_cart = CartAdapter.fetch_raw_cart(clean_session_id)

    if not raw_cart or raw_cart.get("status") == "NOT_FOUND" or raw_cart.get("cart_id") is None:
        raise HTTPException(status_code=404, detail=f"Cart session '{clean_session_id}' not found")

    items: List[Dict[str, Any]] = raw_cart.get("items", [])
    calculated_subtotal = Decimal("0.00")
    normalized_items = []

    for item in items:
        qty = item.get("quantity")
        unit_price = item.get("unit_price")

        if not isinstance(qty, int) or qty <= 0:
            raise HTTPException(
                status_code=422, 
                detail=f"Invalid quantity for product {item.get('product_id')}: must be positive integer"
            )

        calc_line_total = Decimal(str(qty)) * Decimal(str(unit_price))
        calculated_subtotal += calc_line_total

        normalized_items.append({
            "product_id": str(item.get("product_id")),
            "name": str(item.get("name")),
            "quantity": qty,
            "unit_price": round_money(unit_price),
            "line_total": float(calc_line_total.quantize(Decimal("0.01")))
        })

    calculated_subtotal_float = float(calculated_subtotal.quantize(Decimal("0.01")))
    calculated_total_float = calculated_subtotal_float

    supplied_total = raw_cart.get("total")
    supplied_subtotal = raw_cart.get("subtotal")

    if round_money(supplied_total) != calculated_total_float or round_money(supplied_subtotal) != calculated_subtotal_float:
        raise HTTPException(
            status_code=409, 
            detail=f"Total mismatch! Calculated: {calculated_total_float}, Supplied: {supplied_total}"
        )

    return {
        "cart_id": raw_cart["cart_id"],
        "session_id": raw_cart["session_id"],
        "items": normalized_items,
        "subtotal": calculated_subtotal_float,
        "total": calculated_total_float,
        "currency": "DEMO"
    }