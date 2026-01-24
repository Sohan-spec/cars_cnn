import json
import torch
import torch.nn as nn
from torchvision.models import resnet50
import torchvision.transforms as T
from PIL import Image
import io
import requests
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")

MODEL_PATH = "saved_models/resnet50_compcars_20260111_154612.pth"
YEAR_MODEL_PATH = "saved_models/multitask_car_net.pth"
CLASS_MAP_PATH = "saved_models/class_to_idx_20260111_154612.json"
ENGINE_DB_PATH = "engine_specs.json"
GEMMA_MODEL = "gemma3:4b-it-q4_K_M"


with open(CLASS_MAP_PATH) as f:
    class_to_idx = json.load(f)

idx_to_class = {int(v): k for k, v in class_to_idx.items()}
NUM_CLASSES = len(class_to_idx)

with open(ENGINE_DB_PATH) as f:
    engine_db = json.load(f)


transform = T.Compose([
    T.Resize((224,224)),
    T.ToTensor()
])


ckpt = torch.load(YEAR_MODEL_PATH, map_location=DEVICE)

NUM_YEARS = len(ckpt["year_to_idx"])


backbone = resnet50(weights=None)
backbone.fc = nn.Identity()


class ModelHead(nn.Module):
    def __init__(self, n):
        super().__init__()
        self.net = nn.Sequential(
            nn.BatchNorm1d(2048),
            nn.Dropout(0.5),
            nn.Linear(2048, n)
        )
    def forward(self, x):
        return self.net(x)

model_head = ModelHead(NUM_CLASSES)
year_head  = nn.Linear(2048, NUM_YEARS)

backbone.load_state_dict(ckpt["backbone"])
model_head.load_state_dict(ckpt["model_head"])
year_head.load_state_dict(ckpt["year_head"])

backbone = backbone.to(DEVICE).eval()
model_head = model_head.to(DEVICE).eval()
year_head = year_head.to(DEVICE).eval()

year_to_idx = ckpt["year_to_idx"]
idx_to_year = ckpt["idx_to_year"]

def ask_gemma(prompt):
    r = requests.post(
        OLLAMA_URL,
        json={
            "model": GEMMA_MODEL,
            "prompt": prompt,
            "stream": False
        },
        timeout=60
    )
    return r.json()["response"]

def build_prompt(car, year):
    key = f"{car}_{year}"

    if key in engine_db:
        specs = engine_db[key]
        return f"""
You are an automotive engine specification database.

Car: {car.replace("_"," ")}
Year: {year}

Verified data:
displacement_l = {specs["displacement"]}
top_speed_kmh = {specs["max_speed"]}
doors = {specs["doors"]}
seats = {specs["seats"]}

Using ONLY the verified values above and real engine physics,
infer the remaining engine fields.

Return ONLY valid JSON in this exact format:

{{
  "bhp":          {{ "value": number, "confidence": 0.0–1.0 }},
  "torque_nm":    {{ "value": number, "confidence": 0.0–1.0 }},
  "cylinders":    {{ "value": number, "confidence": 0.0–1.0 }},
  "aspiration":   {{ "value": string, "confidence": 0.0–1.0 }},
  "gearbox":      {{ "value": string, "confidence": 0.0–1.0 }},
  "fuel":         {{ "value": string, "confidence": 0.0–1.0 }},
  "acceleration": {{ "value": number, "confidence": 0.0–1.0, "unit": "s (0-100)" }},
  "drive_type":   {{ "value": string, "confidence": 0.0–1.0, "options": ["FWD", "RWD", "AWD"] }}
}}

Confidence rules:
- If strongly constrained by displacement or physics → confidence > 0.80
- If estimated but plausible → confidence ≈ 0.60–0.80
- If uncertain → confidence < 0.60

Return JSON only. No text. No explanation.
"""
    else:
        return f"""
You are an automotive engine specification database.

Car: {car.replace("_"," ")}
Year: {year}

No verified data exists.
Estimate realistic PETROL engine specs.

Return ONLY valid JSON in this exact format:

{{
  "displacement": {{ "value": number, "confidence": 0.0–1.0 }},
  "max_speed":    {{ "value": number, "confidence": 0.0–1.0 }},
  "doors":        {{ "value": number, "confidence": 0.0–1.0 }},
  "seats":        {{ "value": number, "confidence": 0.0–1.0 }},
  "bhp":          {{ "value": number, "confidence": 0.0–1.0 }},
  "torque_nm":    {{ "value": number, "confidence": 0.0–1.0 }},
  "cylinders":    {{ "value": number, "confidence": 0.0–1.0 }},
  "aspiration":   {{ "value": string, "confidence": 0.0–1.0 }},
  "gearbox":      {{ "value": string, "confidence": 0.0–1.0 }},
  "fuel":         {{ "value": string, "confidence": 0.0–1.0 }},
  "acceleration": {{ "value": number, "confidence": 0.0–1.0, "unit": "s (0-100)" }},
  "drive_type":   {{ "value": string, "confidence": 0.0–1.0, "options": ["FWD", "RWD", "AWD"] }}
}}

Confidence rules:
- If based on typical petrol engines → confidence ≈ 0.60–0.75
- If weakly supported → confidence < 0.60

Return JSON only. No text. No explanation.
"""

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse(os.path.join("static", "index.html"))

@app.get("/random_test_car")
def get_random_test_car():
    test_cars_dir = os.path.join("static", "test_cars")
    if not os.path.exists(test_cars_dir):
        return {"error": "Test directory not found"}
        
    images = [f for f in os.listdir(test_cars_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not images:
        return {"error": "No images found"}
    
    import random
    selected_image = random.choice(images)
    # Return absolute URL path
    image_url = f"/static/test_cars/{selected_image}"
    return {"url": image_url}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        img_bytes = await file.read()
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        tensor = transform(image).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            import torch.nn.functional as F

            feats = backbone(tensor)

            model_logits = model_head(feats)
            year_logits  = year_head(feats)

            model_probs = F.softmax(model_logits, dim=1)
            year_probs  = F.softmax(year_logits, dim=1)

            model_conf, model_idx = model_probs.max(1)
            year_conf,  year_idx  = year_probs.max(1)

            car  = idx_to_class[model_idx.item()]
            year = idx_to_year[year_idx.item()]

            model_confidence = float(model_conf.item())
            year_confidence  = float(year_conf.item())

        key = f"{car}_{year}"

        output = {
            "car": car,
            "year": year,
            "confidence": {
                "model": model_confidence,
                "year": year_confidence
            },
            "engine": {}
        }

        if key in engine_db:
            for k, v in engine_db[key].items():
                output["engine"][k] = {
                    "value": v,
                    "source": "CompCars",
                    "confidence": 1.0
                }

        prompt = build_prompt(car, year)
        
        try:
            gemma_out = ask_gemma(prompt)
            gemma_out = gemma_out.strip().strip("`").replace("json", "", 1).strip()
            
            inferred = json.loads(gemma_out)

            for k, obj in inferred.items():
                output["engine"][k] = {
                    "value": obj["value"],
                    "source": "Gemma",
                    "confidence": float(obj["confidence"])
                }
        except Exception as e:
            print(f"LLM Error: {e}")
            output["llm error"] = str(e)

        return output

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

