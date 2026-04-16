import re
from pydantic import BaseModel, root_validator
from fastapi import FastAPI, HTTPException
from nlp.engine import RuleEngine
from nlp.metrics import calculate_metrics

app = FastAPI(title="Linguistic Core Engine")

# Pre-load Natasha and registry to avoid latency per request
engine = RuleEngine()

class AnalyzeRequest(BaseModel):
    text: str

class RuleMatch(BaseModel):
    rule_id: str
    is_correct: bool
    fragment: str
    error_note: str | None = None

class AnalyzeResponse(BaseModel):
    text: str
    rds: float
    car: float
    gci: float
    matches: list[RuleMatch]

def is_cyrillic(text: str) -> bool:
    # Remove whitespace and punctuation, then check if remaining characters are Cyrillic
    clean_text = re.sub(r'[\s\W_0-9]', '', text)
    if not clean_text:
        return False
    # Cyrillic Unicode block: 0x0400 - 0x04FF, plus yo
    return all('\u0400' <= char <= '\u04FF' or char in 'ёЁ' for char in clean_text)

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(req: AnalyzeRequest):
    text = req.text.strip()
    
    if len(text) > 10000:
        raise HTTPException(status_code=400, detail="Text exceeds the 10,000 characters limit.")
        
    if not is_cyrillic(text):
        raise HTTPException(status_code=400, detail="Only Russian text is supported")
        
    # Process text using Natasha engine
    try:
        matches = engine.process(text)
    except Exception as e:
        print(f"Error processing text: {e}")
        # MVP: Return empty matches if the whole parsing severely crashes
        matches = []
        
    # Calculate metrics
    rds, car, gci = calculate_metrics(matches)
    
    return AnalyzeResponse(
        text=text,
        rds=rds,
        car=car,
        gci=gci,
        matches=matches
    )
