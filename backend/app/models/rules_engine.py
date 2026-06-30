"""
Hybrid Rules Engine: Evaluates user-defined rules alongside the ML models.
"""
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text


def evaluate_rules(transaction: Dict[str, Any], db: Session) -> Optional[Dict[str, Any]]:
    """
    Evaluate transaction against active custom rules from SQLite.
    Returns override action details if a rule is triggered, else None.
    """
    try:
        rows = db.execute(text("""
            SELECT name, field, operator, value, action
            FROM rules
            WHERE is_active = 1
        """)).fetchall()
    except Exception as e:
        print(f"Error fetching rules: {e}")
        return None

    if not rows:
        return None

    # Extraction helpers
    device = transaction.get("device", {})
    location = transaction.get("location", {})

    variables = {
        "amount": float(transaction.get("amount") or 0),
        "vpn_detected": bool(device.get("vpn") or False),
        "tor_detected": bool(device.get("tor") or False),
        "country": str(location.get("country") or "").upper(),
        "city": str(location.get("city") or "").upper(),
    }

    triggered_rule = None

    for name, field, operator, val_str, action in rows:
        if field not in variables:
            continue

        val = variables[field]
        matched = False

        # Convert rule value string to correct type
        try:
            if isinstance(val, bool):
                rule_val = val_str.lower() in ("true", "1", "yes")
            elif isinstance(val, (int, float)):
                rule_val = float(val_str)
            else:
                rule_val = str(val_str).upper()
        except Exception:
            continue

        # Evaluate operators
        if operator == ">":
            matched = val > rule_val
        elif operator == "<":
            matched = val < rule_val
        elif operator == "==":
            matched = val == rule_val
        elif operator == "!=":
            matched = val != rule_val
        elif operator == "contains":
            matched = rule_val in str(val)

        if matched:
            # Prioritize BLOCK actions over HOLD
            if triggered_rule is None or (action == "BLOCK" and triggered_rule["action"] == "HOLD"):
                triggered_rule = {
                    "rule_name": name,
                    "action": action,
                    "field": field,
                    "operator": operator,
                    "value": val_str,
                }

    return triggered_rule
