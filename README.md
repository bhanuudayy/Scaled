# Scaled Ad Analyzer (Neuro-Signal Marketing MVP)

A full-stack, AI-powered ad creative analyzer that simulates predictive neuro-signals (attention, cognitive load, and focal hierarchy) and provides deep, actionable marketing insights using **Groq (Llama 3.3)**.

## 🚀 Architecture

This is a modern Monorepo containing:
- **Frontend:** Next.js 15 (App Router), TailwindCSS, TypeScript, Framer Motion
- **Backend:** FastAPI, Python, HTTPX, python-dotenv

## ✨ Features

- **Neuro-Signal Simulation:** Extracts predictive focal points, cognitive load, and clutter regions from static ad creatives.
- **Interactive Heatmap:** An overlaid visual UI where you can explore primary focus areas and predictive eye-paths.
- **Deep LLM Insights (Groq):** Powered by ultra-fast inference to translate neuro-signals into human-readable conversion strategies.
- **Side-by-Side Comparison (UI):** Compare two variations of an ad and get a decisive "Winner" call based on clarity and attention.

---

## 💻 Running it Locally

### 1. Start the Backend (FastAPI)
Navigate to the `backend` folder and set up your environment:
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder with your Groq API key:
```env
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

Start the API on port 8001:
```bash
uvicorn app.main:app --reload --port 8001
```

### 2. Start the Frontend (Next.js)
Open a new terminal, navigate to the `frontend` folder:
```bash
cd frontend
npm install
```

Make sure your `.env.local` points to the backend:
```env
BACKEND_URL=http://127.0.0.1:8001
```

Start the development server:
```bash
npm run dev
```

---

## 🚀 Deployment (Hosting)

**Frontend (Vercel)**
1. Connect this GitHub repository to Vercel.
2. Set the "Root Directory" to `frontend`.
3. Add the `BACKEND_URL` environment variable (pointing to your live Render backend URL).
4. Deploy!

**Backend (Render / Railway)**
1. Connect this GitHub repository to Render/Railway.
2. Set the "Root Directory" to `backend`.
3. Set the start command to `uvicorn app.main:app --host 0.0.0.0 --port 10000`.
4. Add your `GROQ_API_KEY` to the environment variables.
5. Deploy!
