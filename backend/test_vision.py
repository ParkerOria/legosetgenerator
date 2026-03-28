import sys
import os
import mimetypes
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()


def test(image_path: str):
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        sys.exit(1)

    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type or not mime_type.startswith("image/"):
        mime_type = "image/jpeg"

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            (
                "This is a LEGO set box. Extract the set number only — it is the "
                "4 to 6 digit number printed on the box (usually found in a corner "
                "or near the barcode). Return ONLY the number, nothing else. "
                "If no set number is visible, return the word: unknown"
            ),
        ],
    )

    raw = response.text.strip()
    parsed = raw if raw.isdigit() else "unknown"

    print(f"Raw Gemini response : '{raw}'")
    print(f"Parsed set number   : {parsed}")
    print()
    if parsed != "unknown":
        print(f"PASS — Set #{parsed} detected")
    else:
        print("FAIL — Could not extract a set number")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_vision.py <path_to_image>")
        sys.exit(1)
    test(sys.argv[1])
