import json
import os
from typing import Any

import httpx

from app.utils.settings import settings

API_KEY = os.getenv("GROQ_API_KEY")

SYSTEM_PROMPT = """You are a senior performance marketing analyst.

You are reviewing structured ad analysis output.

Your job:
- improve clarity
- sharpen reasoning
- make recommendations more actionable

STRICT RULES:
- do NOT change scores or numbers
- do NOT invent new signals
- do NOT contradict existing analysis

Focus on:
- attention -> behavior -> conversion logic
- clear, decisive language

Return JSON with:
{
  "summary": "...",
  "improved_reasoning": [...],
  "improved_recommendations": [...]
}
"""


def audit_response(data: dict[str, Any]) -> dict[str, Any]:
    fallback = {
        "summary": "Creative shows moderate attention but lacks clarity in execution.",
        "improved_reasoning": data.get("reasoning", []),
        "improved_recommendations": data.get("recommendations", []),
    }

    if not API_KEY:
        return fallback

    payload = {
        "model": settings.ai_auditor_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(data)},
        ],
        "temperature": 0.3,
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
            response = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return {
                "summary": parsed["summary"],
                "improved_reasoning": parsed["improved_reasoning"],
                "improved_recommendations": parsed["improved_recommendations"],
            }
    except Exception:
        return fallback
