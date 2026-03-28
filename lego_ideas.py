import requests
from google import genai

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
        key = f"{name} ({color})"
        summary[key] = summary.get(key, 0) + quantity

    lines = [f"- {qty}x {name}" for name, qty in sorted(summary.items(), key=lambda x: -x[1])]
    return "\n".join(lines[:50])  # cap at 50 unique parts for prompt size


def generate_ideas(set_num: str, parts_summary: str) -> str:
    """Use Gemini to generate LEGO set ideas from the parts."""
    prompt = f"""I have the following LEGO pieces from set {set_num}:

{parts_summary}

Based on these pieces, suggest 5 creative alternative LEGO sets or MOCs (My Own Creations) I could build.
For each idea include:
- A name
- A brief description
- Which key pieces make it possible
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt
    )
    return response.text


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
    ideas = generate_ideas(set_num, summary)

    print("=" * 60)
    print(f"LEGO Ideas for set {set_num}")
    print("=" * 60)
    print(ideas)


if __name__ == "__main__":
    main()
