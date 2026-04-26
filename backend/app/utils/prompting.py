from app.models.schemas import AudienceInput, BenchmarkSummary, CognitiveBreakdown, CopyAnalysis, NeuroSignals, PredictedBehavior


def build_interpretation_messages(
    neuro_signals: NeuroSignals,
    predicted_behavior: PredictedBehavior,
    cognitive_breakdown: CognitiveBreakdown,
    copy_analysis: CopyAnalysis,
    caption: str,
    audience: AudienceInput,
    budget: int,
    days: int,
    benchmarks: BenchmarkSummary,
) -> list[dict[str, str]]:
    system_prompt = """
You are a senior performance marketing strategist interpreting neural-style creative signals.
You are writing decision-support analysis for an ad-testing dashboard, not scientific claims.

Hard rules:
- Do not claim certainty, exact conversion prediction, or neuroscience facts.
- Use probabilistic language such as likely, may, suggests, and could.
- Ground every insight in the provided signals, caption analysis, and audience.
- Avoid generic advice like "make it better" or "improve targeting."
- Return valid JSON only.

Return exactly this schema:
{
  "why_it_works": ["string"],
  "why_it_fails": ["string"],
  "conversion_insight": "string",
  "improvements": ["string"],
  "reasoning": ["string"],
  "copy_analysis": {
    "cta_strength": "low|medium|high",
    "urgency_level": "low|medium|high",
    "offer_clarity": "low|medium|high",
    "offer_attractiveness": "low|medium|high",
    "copy_issues": ["string"]
  },
  "improved_prompt": "string",
  "key_issues": ["string"],
  "quick_wins": ["string"]
}

Guidance:
- Explain why the creative may stop or lose attention.
- Connect conversion implications to testing efficiency, not guaranteed outcomes.
- "improved_prompt" should read like an image-generation brief with layout, focus, contrast, and CTA guidance.
- "key_issues" should be the most important blockers.
- "quick_wins" should be fast, actionable edits.
""".strip()

    user_prompt = f"""
Neural signals:
{neuro_signals.model_dump_json(indent=2)}

Predicted behavior:
{predicted_behavior.model_dump_json(indent=2)}

Cognitive breakdown:
{cognitive_breakdown.model_dump_json(indent=2)}

Copy analysis:
{copy_analysis.model_dump_json(indent=2)}

Benchmarks:
{benchmarks.model_dump_json(indent=2)}

Caption:
{caption}

Audience:
{audience.model_dump_json(indent=2)}

Budget: ₹{budget}
Duration: {days} days
""".strip()

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
