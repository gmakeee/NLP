from nlp.rules.base import BaseRule
from natasha import Doc

class Rule002(BaseRule):
    rule_id = "RULE_002"
    weight = 1.5 # Slightly more complex rule

    def evaluate(self, doc: Doc) -> list[dict]:
        matches = []
        
        for sent in doc.sents:
            if not getattr(sent, "syntax", None):
                continue
                
            token_map = {t.id: t for t in sent.tokens}

            for token in sent.tokens:
                # 'acl' often represents a clausal modifier of noun, which in Russian covers participial clauses
                # Alternatively, check 'amod' + pos == 'VERB' (which natasha might use for participles depending on dict)
                # Or check verb form == 'Part'
                if token.pos == "VERB" and token.feats and token.feats.get("VerbForm") == "Part":
                    participle = token
                    head_noun = token_map.get(participle.head_id)
                    
                    if head_noun and head_noun.pos in ("NOUN", "PRON"):
                        # Check agreement: Participle must agree in Case, Number, and Gender with modified Noun
                        p_case = participle.feats.get("Case")
                        n_case = head_noun.feats.get("Case") if head_noun.feats else None
                        
                        p_num = participle.feats.get("Number")
                        n_num = head_noun.feats.get("Number") if head_noun.feats else None

                        p_gen = participle.feats.get("Gender")
                        n_gen = head_noun.feats.get("Gender") if head_noun.feats else None
                        
                        is_correct = True
                        error_note = None
                        
                        # Simplified case check for MVP
                        if p_case and n_case and p_case != n_case:
                            is_correct = False
                            error_note = f"Несогласование в падеже: существительное ({n_case}), причастие ({p_case})"
                        elif p_num and n_num and p_num != n_num:
                            is_correct = False
                            error_note = f"Несогласование в числе: существительное ({n_num}), причастие ({p_num})"
                        elif p_num == "Sing" and p_gen and n_gen and p_gen != n_gen:
                            is_correct = False
                            error_note = f"Несогласование в роде: существительное ({n_gen}), причастие ({p_gen})"
                            
                        # Grab a rough window for the fragment
                        p_idx = sent.tokens.index(participle)
                        fragment = " ".join([t.text for t in sent.tokens[max(0, p_idx-1):p_idx+2]])
                            
                        matches.append({
                            "rule_id": self.rule_id,
                            "is_correct": is_correct,
                            "fragment": fragment,
                            "error_note": error_note,
                            "weight": self.weight
                        })
                        
        return matches
