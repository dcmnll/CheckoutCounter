import json
from pathlib import Path
from typing import Optional, Dict, Any

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

class CartAdapter:
    @staticmethod
    def fetch_raw_cart(session_id: str) -> Optional[Dict[str, Any]]:
        fixture_map = {
            "SHOP-20260928-0007": "cart_sessions.json",
            "SHOP-20260928-0008": "cart_mismatch.json",
            "SHOP-UNKNOWN-9999": "cart_unknown.json",
        }
        
        filename = fixture_map.get(session_id)
        if not filename:
            return None
        
        file_path = FIXTURES_DIR / filename
        if not file_path.exists():
            return None

        with open(file_path, "r", encoding="utf-8-sig") as f:
            return json.load(f)
