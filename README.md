🚗 AutoVision AI – Car Recognition & Specifications System
A hackathon‑winning, state‑of‑the‑art web interface for AI‑powered car recognition with real‑time engine specifications.

✨ Features
🎨 Stunning Visual Design
Dark‑mode glassmorphism – frosted‑glass cards with subtle blur.
Dynamic gradient background – animated floating orbs for an immersive feel.
Micro‑animations – smooth transitions on every interaction.
3‑D hover effects – cards react to mouse movement.
Responsive layout – looks great on desktop, tablet, and mobile.
🚀 Advanced Functionality
Drag & drop upload – intuitive file selection with visual feedback.
Real‑time AI analysis – connects to the FastAPI backend for instant predictions.
Confidence visualisation – progress bars show model & year certainty.
Dynamic spec cards – animated display of engine specs (displacement, bhp, torque, …).
Smart data sources – clearly marks verified vs. AI‑inferred data.
Persistent stats – tracks scans via localStorage.
🛠️ Tech Stack
Pure HTML5, CSS3, vanilla JavaScript – no heavy frameworks, lightning‑fast.
Custom design system – CSS variables for colours, spacing, typography.
Google Fonts – Inter for body text, Orbitron for headings.
📦 Setup Instructions

1️⃣ Start the FastAPI backend
bash
~~~
cd d:\CompCars\CARS_CNN
python app.py
The server will listen on http://localhost:8000.
~~~
2️⃣ Serve the frontend
You can use any static server; the simplest is Python’s built‑in server:

bash
~~~
# From the same folder
python -m http.server 8000
(Or use VS Code Live Server, npm i -g http-server, etc.)
~~~

3️⃣ Open the app
~~~
Navigate to:

http://localhost:8000
~~~
🎮 How to Use
Upload an image – click the upload area or drag a car picture onto it (JPG/PNG/WEBP supported).
Analyze – press “Start Analysis”. The UI shows a loading spinner while the AI processes the image.
View results – the recognized make/model/year appear, confidence bars fill, and a grid of spec cards animates into view.
🎨 Design System (CSS Variables)
All colours, fonts, and spacing live in static/style.css
~~~
css
:root {
  /* Palette */
  --color-primary:   #667eea;   /* Indigo gradient start */
  --color-secondary: #764ba2;   /* Indigo gradient end */
  --color-accent:    #4facfe;   /* Cyan */
  --color-success:   #10b981;   /* Emerald */
  --color-bg:        #0a0e27;   /* Dark navy */
  --color-glassass:     rgba(255,255,255,0.05);
  /* Typography */
  --font-display:    'Orbitron', sans-serif;
  --font-body:       'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  /* Spacing */
  --space-xs: .5rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 3rem;
  /* Radii & transitions */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --transition: .2s ease;
}
~~~
Feel free to tweak any of these values to match your branding.

📊 API Contract
The frontend expects a JSON response from /predict:
~~~
json
{
  "car": "Audi_A4_Sedan",
  "year": "2012",
  "confidence": {
    "model": 0.95,
    "year": 0.87
  },
  "engine": {
    "displacement_l": {
      "value": 2.0,
      "source": "CompCars",
      "confidence": 1.0
    },
    "bhp": {
      "value": 180,
      "source": "Gemma",
      "confidence": 0.85
    },
    "torque_nm": { ... },
    "cylinders": { ... },
    "acceleration": { ... },
    "drive_type": { ... }
    // … other specs
  }
}
~~~
📁 Project Structure
~~~
CARS_CNN/
├─ index.html      # Main page
├─ style.css       # Design system & layout
├─ script.js       # UI logic & API calls
~~~
├─ app.py          # FastAPI backend
└─ README.md       # This file
