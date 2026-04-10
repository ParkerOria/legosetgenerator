import requests
import json
import re
import base64
import os
from google import genai
from dotenv import load_dotenv
import asyncio

load_dotenv()

REBRICKABLE_API_KEY = os.getenv("REBRICKABLE_API_KEY")
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def get_lego_parts(set_num: str) -> list[dict]:
    """Fetch parts list for a LEGO set from Rebrickable."""
    url = f"https://rebrickable.com/api/v3/lego/sets/{set_num}/parts/"
    headers = {"Authorization": f"key {REBRICKABLE_API_KEY}"}
    parts = []
    params = {"page_size": 100, "page": 1}

    while True:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        parts.extend(data.get("results", []))
        if not data.get("next"):
            break
        params["page"] += 1

    return parts


def summarize_parts(parts: list[dict]) -> str:
    """Build a readable summary of parts for the prompt."""
    summary = {}
    for item in parts:
        part = item.get("part", {})
        name = part.get("name", "Unknown")
        color = item.get("color", {}).get("name", "Unknown color")
        quantity = item.get("quantity", 1)
        img_url = part.get("part_img_url")
        key = f"{name} ({color})"
        summary[key] = {"qty": summary.get(key, {}).get("qty", 0) + quantity, "img_url": img_url}

    lines = [
        f"- {v['qty']}x {name} {v['img_url'] or 'No image'}"
        for name, v in sorted(summary.items(), key=lambda x: -x[1]["qty"])
    ]
    return "\n".join(lines[:50])


def generate_ideas(set_num: str, parts_summary: str, user_prompt: str = "") -> str:
    """Use Gemini to generate a single LEGO build idea from the parts and user prompt."""
    prompt = f"""I have the following LEGO pieces from set {set_num}:

{parts_summary}

{"The user wants to build: " + user_prompt if user_prompt else "Suggest a creative build."}

Based strictly on these pieces, suggest 1 creative LEGO build (MOC) I could make.
Return ONLY a JSON object with this exact structure, no markdown:
{{"name": "Build Name", "description": "A 1-2 sentence description of the build."}}
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text.strip()


def generate_idea_instructions(ideas: str, summary: str) -> list[dict]:
    """Use Gemini to generate structured step-by-step build instructions."""
    prompt = f"""Act as a LEGO Master Builder. Design 5-8 clear step-by-step building instructions for this LEGO concept: {ideas}

Use parts from this inventory where possible: {summary}

Return ONLY a valid JSON array of steps, no markdown, no explanation. Example format:
[
  {{"step": 1, "title": "Build the Base", "description": "Place 2x 4x8 grey plates side by side as the foundation."}},
  {{"step": 2, "title": "Add the Walls", "description": "Stack 2x4 red bricks around the perimeter, 3 layers high."}}
]
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    raw = response.text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw).strip()
    try:
        result = json.loads(raw)
        if isinstance(result, list):
            return result
        # Gemini sometimes wraps the array in an object
        if isinstance(result, dict):
            for v in result.values():
                if isinstance(v, list):
                    return v
        return []
    except json.JSONDecodeError as e:
        print(f"Failed to parse instructions JSON: {e}\nRaw response:\n{raw[:500]}")
        return []


IMAGE_MODEL = "gemini-3.1-flash-image-preview"


def _extract_image_base64(response) -> str | None:
    """Pull inline image data out of a Gemini response and return as base64 string."""
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            data = part.inline_data.data
            if isinstance(data, bytes):
                return base64.b64encode(data).decode("utf-8")
            return data
    return None


def generate_idea_images(ideas: str, summary: str) -> str | None:
    """Generate a finished-build overview image and return as base64."""
    from google.genai import types as _types
    prompt = (
        f"Generate a photorealistic LEGO product photo of a completed model based on: {ideas}. "
        f"Use only these parts: {summary}. "
        "Style: official LEGO set photo, clean white background, bright lighting, visible studs."
    )
    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=prompt,
        config=_types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"]
        ),
    )
    return _extract_image_base64(response)


def generate_step_image(
    step_num: int,
    step_title: str,
    step_description: str,
    summary: str,
    overview_image_base64: str | None = None,
    prev_image_base64: str | None = None,
) -> str | None:
    """Generate an image illustrating a single build step and return as base64."""
    from google.genai import types as _types

    prompt = (
        f"Generate a clear LEGO instruction manual image for Step {step_num}: {step_title}. "
        f"What to do: {step_description}. "
        "Style: LEGO instruction booklet illustration, white background, showing exactly which "
        "pieces are added in this step. Keep style and scale consistent with any reference images."
    )

    contents = []
    if overview_image_base64:
        contents.append(_types.Part.from_bytes(
            data=base64.b64decode(overview_image_base64), mime_type="image/png"
        ))
        contents.append("Reference: this is the finished model.")
    if prev_image_base64:
        contents.append(_types.Part.from_bytes(
            data=base64.b64decode(prev_image_base64), mime_type="image/png"
        ))
        contents.append("Reference: this is what the build looks like after the previous step — continue from this state.")
    contents.append(prompt)

    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=contents,
        config=_types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"]
        ),
    )
    return _extract_image_base64(response)


async def generate_step_images_batch(steps, summary, overview_image_base64):
    """Generate ALL step images in parallel with consistent constraints."""
    tasks = []

    for step in steps:
        tasks.append(asyncio.to_thread(
            generate_step_image_consistent,
            step["step"],
            step.get("title", ""),
            step.get("description", ""),
            summary,
            overview_image_base64,
        ))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    images = []
    for r in results:
        if isinstance(r, Exception):
            print(f"Step image failed: {r}")
            images.append(None)
        else:
            images.append(r)

    return images

def generate_step_image_consistent(
    step_num,
    step_title,
    step_description,
    summary,
    overview_image_base64,
):
    from google.genai import types as _types

    prompt = f"""
You are generating LEGO instruction booklet images.

REFERENCE IMAGE:
This is the FINAL completed LEGO model.

Step {step_num}: {step_title}
Instruction: {step_description}

STRICT RULES:
- The final model MUST remain identical to the reference
- DO NOT change structure, colors, or proportions
- ONLY show pieces added in THIS step
- Keep camera angle EXACTLY the same across all steps
- Clean white background
- LEGO instruction manual style (simple, clear, minimal)

Output: a clean LEGO instruction diagram
"""

    contents = []

    if overview_image_base64:
        contents.append(_types.Part.from_bytes(
            data=base64.b64decode(overview_image_base64),
            mime_type="image/png"
        ))
        contents.append("This is the FINAL model reference. Do not deviate from it.")

    contents.append(prompt)

    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=contents,
        config=_types.GenerateContentConfig(
            response_modalities=["IMAGE"]
        ),
    )

    return _extract_image_base64(response)


