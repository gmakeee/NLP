from nlp.rules.base import BaseRule
from natasha import Doc

class Rule001(BaseRule):
    rule_id = "RULE_001"
    weight = 1.0

    def evaluate(self, doc: Doc) -> list[dict]:
        matches = []
        
        for sent in doc.sents:
            if not getattr(sent, "syntax", None):
                continue
                
            token_map = {t.id: t for t in sent.tokens}

            for token in sent.tokens:
                # Look for verbs
                if token.pos == "VERB":
                    verb = token
                    # Find subjects pointing to this verb
                    subjects = [t for t in sent.tokens if t.head_id == verb.id and t.rel == "nsubj"]
                    # If syntax parser failed to mark nsubj, try finding a Nominative noun before it
                    if not subjects:
                        for prev_t in sent.tokens:
                            if prev_t.id == verb.id:
                                break
                            if prev_t.pos in ("NOUN", "PRON") and prev_t.feats and prev_t.feats.get("Case") == "Nom":
                                subjects = [prev_t]
                                break
                    
                    if subjects:
                        subject = subjects[0]
                        # Check agreement
                        subj_gender = subject.feats.get("Gender") if subject.feats else None
                        verb_gender = verb.feats.get("Gender") if verb.feats else None
                        
                        subj_number = subject.feats.get("Number") if subject.feats else None
                        verb_number = verb.feats.get("Number") if verb.feats else None
                        verb_tense = verb.feats.get("Tense") if verb.feats else None
                        
                        is_correct = True
                        error_note = None
                        
                        if verb_tense == "Past":
                            if subj_number == "Sing" and verb_number == "Sing":
                                if subj_gender and verb_gender and subj_gender != verb_gender:
                                    is_correct = False
                                    error_note = f"Несогласование в роде: подлежащее ({subj_gender}), глагол ({verb_gender})"
                            elif subj_number and verb_number and subj_number != verb_number:
                                is_correct = False
                                error_note = f"Несогласование в числе: подлежащее ({subj_number}), глагол ({verb_number})"
                        else:
                            if subj_number and verb_number and subj_number != verb_number:
                                is_correct = False
                                error_note = f"Несогласование в числе: подлежащее ({subj_number}), глагол ({verb_number})"
                                
                        matches.append({
                            "rule_id": self.rule_id,
                            "is_correct": is_correct,
                            "fragment": f"{subject.text} {verb.text}",
                            "error_note": error_note,
                            "weight": self.weight
                        })
                        
        return matches
