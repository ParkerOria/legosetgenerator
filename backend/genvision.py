import asyncio
import json
import re
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

from lego_ideas import (
    get_lego_parts,
    summarize_parts,
    generate_ideas,
    generate_idea_instructions,
    generate_idea_images,
    generate_step_image,
)

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── /api/analyze-set ─────────────────────────────────────────

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


# ── /api/generate-build ──────────────────────────────────────

class BuildRequest(BaseModel):
    setNumber: str
    prompt: str


@app.post("/api/generate-build")
async def generate_build(req: BuildRequest):
    set_num = req.setNumber
    if "-" not in set_num:
        set_num += "-1"  # Rebrickable requires version suffix

    try:
        # 1. Fetch brick inventory from Rebrickable
        parts = get_lego_parts(set_num)
        summary = summarize_parts(parts)

        # 2. Generate a build concept steered by the user's prompt
        ideas_raw = generate_ideas(set_num, summary, req.prompt)

        # 3. Parse the concept JSON from Gemini response
        clean = ideas_raw.strip()
        if clean.startswith("```"):
            clean = re.sub(r"^```[a-z]*\n?", "", clean)
            clean = clean.rstrip("`").strip()
        try:
            idea = json.loads(clean)
        except json.JSONDecodeError:
            idea = {"name": "Custom Build", "description": clean}

        title = idea.get("name", "Custom Build")
        description = idea.get("description", "")

        # 4. Generate product image only — steps are fetched separately in the background
        try:
            image_base64 = await asyncio.to_thread(generate_idea_images, ideas_raw, summary)
        except Exception as e:
            print(f"Image generation failed: {e}")
            image_base64 = None

        return {
            "title": title,
            "description": description,
            "imageBase64": image_base64,
            "summary": summary,
            "ideas": ideas_raw,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── /api/generate-steps ──────────────────────────────────────

class StepsRequest(BaseModel):
    ideas: str
    summary: str


@app.post("/api/generate-steps")
async def generate_steps_endpoint(req: StepsRequest):
    try:
        steps = await asyncio.to_thread(generate_idea_instructions, req.ideas, req.summary)
        return {"steps": steps}
    except Exception as e:
        print(f"Steps generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── /api/generate-step-image ─────────────────────────────────

class StepImageRequest(BaseModel):
    stepNum: int
    title: str
    description: str
    summary: str


@app.post("/api/generate-step-image")
async def generate_step_image_endpoint(req: StepImageRequest):
    try:
        image_base64 = await asyncio.to_thread(
            generate_step_image,
            req.stepNum,
            req.title,
            req.description,
            req.summary,
        )
        return {"imageBase64": image_base64}
    except Exception as e:
        print(f"Step image generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
