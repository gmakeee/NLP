from nlp.rules.base import BaseRule
from natasha import Doc

class Rule003(BaseRule):
    rule_id = "RULE_003"
    weight = 1.5

    def evaluate(self, doc: Doc) -> list[dict]:
        matches = []
        
        for sent in doc.sents:
            if not getattr(sent, "syntax", None):
                continue

            for token in sent.tokens:
                # Gerund (деепричастие) in Russian is represented as VERB with VerbForm=Conv (Converb)
                if token.pos == "VERB" and token.feats and token.feats.get("VerbForm") == "Conv":
                    # Gerunds are immutable and just identify the presence of the clause in MVP
                    p_idx = sent.tokens.index(token)
                    fragment = " ".join([t.text for t in sent.tokens[max(0, p_idx-1):p_idx+2]])
                    
                    matches.append({
                        "rule_id": self.rule_id,
                        "is_correct": True, # In MVP, just detecting it
                        "fragment": fragment,
                        "error_note": None,
                        "weight": self.weight
                    })
                        
        return matches
