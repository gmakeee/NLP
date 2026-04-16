TOTAL_SYSTEM_RULES = 25

def calculate_metrics(matches: list[dict]) -> tuple[float, float, float]:
    """
    Calculates RDS, CAR, GCI based on Matches.
    Match structure: { rule_id, is_correct, fragment, error_note, weight }
    """
    if not matches:
        return 0.0, 0.0, 0.0
        
    unique_rules_applied = len(set(m["rule_id"] for m in matches))
    rds = unique_rules_applied / TOTAL_SYSTEM_RULES
    
    correct_applications = sum(1 for m in matches if m["is_correct"])
    car = correct_applications / len(matches)
    
    # GCI calculation logic (simplified average of weights for correct features)
    total_weight = sum(m.get("weight", 1.0) for m in matches)
    gci = total_weight / len(matches) # Simple proxy for Grammatical Complexity Index
    
    return round(rds, 3), round(car, 3), round(gci, 3)
