from typing import Any

class BaseRule:
    rule_id: str
    weight: float = 1.0

    def evaluate(self, doc: Any) -> list[dict]:
        """
        Processes a Natasha doc and returns a list of matched instances.
        Each match: { "rule_id": str, "is_correct": bool, "fragment": str, "error_note": str | None, "weight": float }
        """
        raise NotImplementedError
