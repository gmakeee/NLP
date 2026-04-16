from nlp.rules.rule_001 import Rule001
from nlp.rules.rule_002 import Rule002
from nlp.rules.rule_003 import Rule003
from natasha import (
    Segmenter, MorphVocab,
    NewsEmbedding, NewsMorphTagger, NewsSyntaxParser,
    Doc
)

class RuleEngine:
    def __init__(self):
        print("Initializing Natasha Models...")
        self.segmenter = Segmenter()
        self.morph_vocab = MorphVocab()
        self.emb = NewsEmbedding()
        self.morph_tagger = NewsMorphTagger(self.emb)
        self.syntax_parser = NewsSyntaxParser(self.emb)
        
        # Registry mapping
        self.registry = [
            Rule001(),
            Rule002(),
            Rule003()
        ]
        print("Natasha Engine Ready.")

    def process(self, text: str) -> list[dict]:
        doc = Doc(text)
        doc.segment(self.segmenter)
        doc.tag_morph(self.morph_tagger)
        
        for token in doc.tokens:
            token.lemmatize(self.morph_vocab)
            
        try:
            doc.parse_syntax(self.syntax_parser)
        except Exception as e:
            print(f"Syntax parsing encountered an error: {e}")
            # Continue even if syntax parsing fails, though rules will likely yield nothing
            
        all_matches = []
        for rule in self.registry:
            matches = rule.evaluate(doc)
            all_matches.extend(matches)
            
        return all_matches
