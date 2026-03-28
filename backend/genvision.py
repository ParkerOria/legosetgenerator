from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/analyze-set")
async def analyze_set(file: UploadFile = File(...)):
    image_bytes = await file.read()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=file.content_type),
            (
                "This is a LEGO set box. Extract the set number only — it is the "
                "4 to 6 digit number printed on the box (usually found in a corner "
                "or near the barcode). Return ONLY the number, nothing else. "
                "If no set number is visible, return the word: unknown"
            ),
        ],
    )

    raw = response.text.strip()
    set_number = raw if raw.isdigit() else "unknown"
    return {"setNumber": set_number}
