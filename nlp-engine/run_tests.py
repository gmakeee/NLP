from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("Running test 1: Valid Russian text...")
resp1 = client.post("/analyze", json={"text": "Мама мыла раму."})
print(resp1.status_code, resp1.json())

print("\nRunning test 2: Broken participle clause...")
resp2 = client.post("/analyze", json={"text": "Я видел кошка, сидящий на окне."})
print(resp2.status_code, resp2.json())

print("\nRunning test 3: Non-Cyrillic English text...")
resp3 = client.post("/analyze", json={"text": "Hello world!"})
print(resp3.status_code, resp3.json())
