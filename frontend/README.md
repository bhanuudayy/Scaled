# Creative Analysis Frontend

Next.js + Tailwind frontend for the FastAPI creative analysis backend.

## Run locally

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Create a local env file:

```bash
cp .env.example .env.local
```

3. Make sure your FastAPI backend is running on `http://127.0.0.1:8000`, or update `BACKEND_URL` in `.env.local`.

4. Start the frontend:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Notes

- The app sends form submissions to its own Next.js route at `/api/analyze`.
- That route proxies the request to your FastAPI backend using `BACKEND_URL`, so you do not need to change backend CORS settings for local frontend development.
