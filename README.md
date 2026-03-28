BrickGen
BrickGen is an AI-powered LEGO build generator. Upload a photo of any LEGO set box, describe what you want to build, and BrickGen will create a custom build concept — complete with a generated product image and a step-by-step illustrated instruction booklet — using only the pieces from that set.

How It Works
Upload a photo of your LEGO set box
Scan to automatically detect the set number, or type it manually
Describe what you want to build
Generate — BrickGen fetches your brick inventory from Rebrickable and uses Gemini AI to design a build concept and product image
Follow the step-by-step instruction booklet with AI-generated images for each step
Tech Stack
Frontend

React 19 + Vite
Custom CSS (no UI library)
Backend

Python + FastAPI
Google Gemini API (gemini-2.5-flash for text, gemini-3.1-flash-image-preview for images)
Rebrickable API for LEGO part inventory
Getting Started
Prerequisites
Node.js (v18+)
Python 3.10+
A Google Gemini API key
A Rebrickable API key
Backend Setup

cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
Create a .env file in the backend/ directory:


GEMINI_API_KEY=your_gemini_api_key_here
REBRICKABLE_API_KEY=your_rebrickable_api_key_here
Start the server:


uvicorn genvision:app --reload
The backend runs at http://localhost:8000.

Frontend Setup

cd frontend/lego-app
npm install
npm run dev
The frontend runs at http://localhost:5173 and proxies all /api requests to the backend.

API Endpoints
Method	Endpoint	Description
POST	/api/analyze-set	Extract set number from an uploaded box image
POST	/api/generate-build	Generate a build concept and product image
POST	/api/generate-steps	Generate step-by-step building instructions
POST	/api/generate-step-image	Generate an illustration for a single step
Project Structure

legosetgenerator/
├── backend/
│   ├── genvision.py        # FastAPI app and route handlers
│   ├── lego_ideas.py       # Gemini and Rebrickable integrations
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── lego-app/
        ├── src/
        │   ├── App.jsx     # Main React component
        │   └── App.css
        ├── vite.config.js
        └── package.json
Environment Variables
Variable	Description
GEMINI_API_KEY	Google Gemini API key for AI generation
REBRICKABLE_API_KEY	Rebrickable API key for LEGO part data
Never commit your .env file. Use .env.example as a template.
