import requests
from google import genai
import os
from PIL import Image
from io import BytesIO

REBRICKABLE_API_KEY = "ad15c1553a6ef42bf5641f7bde25c2cd"
NANO_BANANA_API_KEY = "AIzaSyCNKvkOwWkYare4I8FndAzry5upYg1AbVk"

client = genai.Client(api_key=NANO_BANANA_API_KEY)


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

    lines = [f"- {v['qty']}x {name} {v['img_url'] or 'No image'}" for name, v in sorted(summary.items(), key=lambda x: -x[1]["qty"])]
    return "\n".join(lines[:50])  # cap at 50 unique parts for prompt size


def generate_ideas(set_num: str, parts_summary: str) -> str:
    """Use Gemini to generate LEGO set ideas from the parts."""
    prompt = f"""I have the following LEGO pieces from set {set_num}:

{parts_summary}

Based on these pieces, suggest 1 creative alternative LEGO sets or MOCs (My Own Creations) I could build.
For each idea include:
- A name
- A description
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt
    )
    return response.text

def generate_idea_instructions(ideas, summary) -> str:
    """Use Gemini to generate LEGO set ideas from the parts."""
    prompt = f"""
Act as a LEGO Master Builder. Design a cohesive LEGO model based on this concept: {ideas}.
Constraints:
Inventory: You must strictly use the parts listed in {summary}.
Visual Fidelity: Reference the shapes, colors, and dimensions described by the part names and their associated URLs in {summary} to ensure the model looks physically buildable.
Quantity: Do not exceed the specific piece counts listed for each part.
Style: The output should look like an official LEGO set product photo—clean lighting, plastic textures, and visible studs. 
Critical Instruction: If the parts in {summary} are insufficient or incompatible with the concept in {ideas}, do not attempt the build. Instead, generate the text "FAILED" and try again.
Write out specific instructions including the piece id numbers for each piece in each step. 
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite", #change to nano
        contents=prompt
    )
    return response.text

def generate_idea_images(ideas, summary) -> str:
    """Use Gemini to generate LEGO set ideas from the parts."""
    prompt = f"""
Act as a LEGO Master Builder. Design a cohesive LEGO model based on this concept: {ideas}.
Constraints:
Inventory: You must strictly use the parts listed in {summary}.
Visual Fidelity: Reference the shapes, colors, and dimensions described by the part names and their associated URLs in {summary} to ensure the model looks physically buildable.
Quantity: Do not exceed the specific piece counts listed for each part.
Style: The output should look like an official LEGO set product photo—clean lighting, plastic textures, and visible studs. 
Critical Instruction: If the parts in {summary} are insufficient or incompatible with the concept in {ideas}, do not attempt the build. Instead, generate a solid black image.
"""
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview", #change to nano
        contents=prompt
    )
    image_data = None
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            image_data = part.inline_data.data
            break

    if image_data:
        # Decode the Base64 data and open it as a PIL Image
        image = Image.open(BytesIO(image_data))
        # You can now save the image or display it
        image.save("generated_image.png")
        print("Image saved as generated_image.png")
    else:
        print("No image data found in the response.")
    return

def main():
    set_num = input("Enter a LEGO set number (e.g. 75192-1): ").strip()
    if "-" not in set_num:
        set_num += "-1"  # Rebrickable requires the version suffix

    print(f"\nFetching parts for set {set_num}...")
    try:
        parts = get_lego_parts(set_num)
    except requests.HTTPError as e:
        print(f"Error fetching set: {e}")
        return

    print(f"Found {len(parts)} parts. Generating ideas...\n")
    summary = summarize_parts(parts)
    # for part in parts:
    #     print(f"{part}")
    #     print()
    # print(summary)
    # print (parts)
    ideas = generate_ideas(set_num, summary)
    # print(parts)

    print("=" * 60)
    print(f"LEGO Ideas for set {set_num}")
    print("=" * 60)
    # print(ideas)
    print(generate_idea_instructions(ideas, summary))


if __name__ == "__main__":
    main()
