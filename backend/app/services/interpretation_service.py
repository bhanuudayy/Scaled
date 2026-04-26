import json
import re
from typing import Any

import httpx

from app.models.schemas import (
    AudienceInput,
    BenchmarkSummary,
    CognitiveBreakdown,
    CopyAnalysis,
    InterpretationResult,
    NeuroSignals,
    PredictedBehavior,
)
from app.utils.prompting import build_interpretation_messages
from app.utils.settings import settings


class InterpretationService:
    """Turns structured signals into dashboard-ready marketing insight."""

    CTA_TERMS = ("buy", "shop", "order", "start", "book", "join", "download", "sign up", "learn more", "apply")
    URGENCY_TERMS = ("today", "now", "limited", "ends", "deadline", "last chance", "only", "hurry", "closing")
    BENEFIT_TERMS = ("save", "free", "discount", "bonus", "results", "faster", "easier", "growth", "reduce")

    async def interpret(
        self,
        neuro_signals: NeuroSignals,
        predicted_behavior: PredictedBehavior,
        cognitive_breakdown: CognitiveBreakdown,
        caption: str,
        audience: AudienceInput,
        budget: int,
        days: int,
        benchmarks: BenchmarkSummary,
    ) -> InterpretationResult:
        copy_analysis = self.analyze_copy(caption)

        if settings.groq_api_key:
            result = await self._interpret_with_groq(
                neuro_signals=neuro_signals,
                predicted_behavior=predicted_behavior,
                cognitive_breakdown=cognitive_breakdown,
                copy_analysis=copy_analysis,
                caption=caption,
                audience=audience,
                budget=budget,
                days=days,
                benchmarks=benchmarks,
            )
            if result is not None:
                return result

        return self._heuristic_interpretation(
            neuro_signals=neuro_signals,
            predicted_behavior=predicted_behavior,
            cognitive_breakdown=cognitive_breakdown,
            copy_analysis=copy_analysis,
            caption=caption,
            audience=audience,
            budget=budget,
            days=days,
            benchmarks=benchmarks,
        )

    def analyze_copy(self, caption: str) -> CopyAnalysis:
        normalized = caption.lower().strip()
        words = re.findall(r"\b[\w']+\b", normalized)

        cta_hits = sum(1 for term in self.CTA_TERMS if term in normalized)
        urgency_hits = sum(1 for term in self.URGENCY_TERMS if term in normalized)
        benefit_hits = sum(1 for term in self.BENEFIT_TERMS if term in normalized)

        copy_issues: list[str] = []

        if cta_hits == 0:
            cta_strength = "low"
            copy_issues.append("Caption lacks a clear call to action.")
        elif cta_hits == 1:
            cta_strength = "medium"
        else:
            cta_strength = "high"

        if urgency_hits == 0:
            urgency_level = "low"
            copy_issues.append("Urgency is weak, so the offer may feel easy to postpone.")
        elif urgency_hits == 1:
            urgency_level = "medium"
        else:
            urgency_level = "high"

        if len(words) <= 5:
            offer_clarity = "low"
            copy_issues.append("Caption may be too short to make the offer concrete.")
        elif len(words) <= 24 and benefit_hits >= 1:
            offer_clarity = "high"
        else:
            offer_clarity = "medium"

        if benefit_hits >= 2:
            offer_attractiveness = "high"
        elif benefit_hits == 1:
            offer_attractiveness = "medium"
        else:
            offer_attractiveness = "low"
            copy_issues.append("Offer attractiveness is not yet explicit in the copy.")

        if len(words) > 32:
            copy_issues.append("Caption is long enough to risk burying the key promise.")

        return CopyAnalysis(
            cta_strength=cta_strength,
            urgency_level=urgency_level,
            offer_clarity=offer_clarity,
            offer_attractiveness=offer_attractiveness,
            copy_issues=copy_issues,
        )

    async def _interpret_with_groq(
        self,
        neuro_signals: NeuroSignals,
        predicted_behavior: PredictedBehavior,
        cognitive_breakdown: CognitiveBreakdown,
        copy_analysis: CopyAnalysis,
        caption: str,
        audience: AudienceInput,
        budget: int,
        days: int,
        benchmarks: BenchmarkSummary,
    ) -> InterpretationResult | None:
        payload: dict[str, Any] = {
            "model": settings.groq_model,
            "messages": build_interpretation_messages(
                neuro_signals=neuro_signals,
                predicted_behavior=predicted_behavior,
                cognitive_breakdown=cognitive_breakdown,
                copy_analysis=copy_analysis,
                caption=caption,
                audience=audience,
                budget=budget,
                days=days,
                benchmarks=benchmarks,
            ),
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": 900,
        }
        headers = {
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return InterpretationResult(**parsed)

    def _heuristic_interpretation(
        self,
        neuro_signals: NeuroSignals,
        predicted_behavior: PredictedBehavior,
        cognitive_breakdown: CognitiveBreakdown,
        copy_analysis: CopyAnalysis,
        caption: str,
        audience: AudienceInput,
        budget: int,
        days: int,
        benchmarks: BenchmarkSummary,
    ) -> InterpretationResult:
        audience_label = ", ".join(audience.segments) if audience.segments else "broad prospecting"
        why_it_works: list[str] = []
        why_it_fails: list[str] = []
        improvements: list[str] = []
        reasoning: list[str] = []
        key_issues: list[str] = []
        quick_wins: list[str] = []

        if neuro_signals.attention_intensity >= 0.68:
            why_it_works.append(
                "The creative is likely to earn an initial pause because contrast and focal hierarchy make the first read clearer."
            )
        else:
            why_it_fails.append(
                "Stopping power appears limited, so colder audiences may scroll before they resolve the offer."
            )
            key_issues.append("Weak first-second attention capture.")
            quick_wins.append("Increase contrast around the hero visual or headline.")

        if neuro_signals.focus_distribution == "scattered":
            why_it_fails.append(
                "Attention appears spread across too many elements, which may dilute the main selling point."
            )
            key_issues.append("Competing focal points are reducing message clarity.")
            improvements.append("Reduce secondary elements and keep one dominant visual path into the offer.")
        else:
            why_it_works.append(
                "The focal structure is organized enough that viewers may identify the main message without much scanning."
            )

        if neuro_signals.cognitive_load >= 0.62:
            why_it_fails.append(
                f"Processing friction is elevated and is likely being driven by {', '.join(cognitive_breakdown.drivers[:2])}."
            )
            key_issues.append("High cognitive load is making the creative harder to parse quickly.")
            quick_wins.append("Trim text and simplify the visual hierarchy so the key promise lands faster.")
        elif neuro_signals.cognitive_load <= 0.35:
            why_it_works.append(
                "Low cognitive load supports fast comprehension, which generally helps feed creatives convert attention into interest."
            )

        if neuro_signals.emotional_salience < 0.6:
            why_it_fails.append(
                "Emotional pull looks soft, so the ad may feel informative but not especially compelling."
            )
            improvements.append("Add a stronger transformation, consequence, or emotional payoff in the visual.")
        else:
            why_it_works.append(
                "Emotional salience is strong enough to support memory and make engagement more plausible."
            )

        if copy_analysis.cta_strength == "low":
            key_issues.append("Copy does not give users a strong next step.")
            quick_wins.append("Add a direct CTA like shop now, book a demo, or start today.")
        if copy_analysis.urgency_level == "low":
            improvements.append("Introduce time pressure or scarcity if the offer genuinely supports it.")
        if copy_analysis.offer_clarity == "low":
            improvements.append("Make the concrete offer explicit in the first line of the caption.")
        if copy_analysis.offer_attractiveness == "low":
            improvements.append("Lead with a clearer benefit, discount, or outcome to strengthen the perceived value.")

        if not quick_wins:
            quick_wins.append("Test one tighter caption and one cleaner layout variant to isolate the biggest lift opportunity.")

        if not key_issues:
            key_issues.append("No major structural blockers detected, but differentiation could still improve.")

        conversion_insight = (
            f"Given a ₹{budget} budget across {days} days, this creative looks more suitable for disciplined testing than automatic scale. "
            f"For {audience.gender or 'mixed'} audiences in {audience.age_range or 'broad age'} with {audience_label}, "
            f"the current balance of stop power, clarity, and copy strength suggests users are most likely to {predicted_behavior.likely_action} before converting at scale."
        )

        reasoning.extend(
            [
                f"Attention benchmark is {benchmarks.attention_band}, so the asset is {benchmarks.attention_vs_top_ads.lower()}",
                f"Clarity benchmark suggests {benchmarks.clarity_vs_top_ads.lower()}",
                cognitive_breakdown.reasoning,
                f"Copy signal is strongest on CTA={copy_analysis.cta_strength}, urgency={copy_analysis.urgency_level}, and offer clarity={copy_analysis.offer_clarity}.",
            ]
        )

        improved_prompt = self._build_improved_prompt(neuro_signals, copy_analysis, caption)

        return InterpretationResult(
            why_it_works=why_it_works or [
                "The creative has a workable baseline, though its advantage may not yet be strong enough to be durable at scale."
            ],
            why_it_fails=why_it_fails,
            conversion_insight=conversion_insight,
            improvements=improvements or ["Build one variant with cleaner hierarchy and a stronger offer-led caption opening."],
            reasoning=reasoning,
            copy_analysis=copy_analysis,
            improved_prompt=improved_prompt,
            key_issues=key_issues,
            quick_wins=quick_wins,
        )

    def _build_improved_prompt(self, neuro_signals: NeuroSignals, copy_analysis: CopyAnalysis, caption: str) -> str:
        prompt_parts = [
            "Simplify layout",
            "reduce text clutter" if neuro_signals.text_density_score >= 0.5 else "keep on-image text minimal",
            "use one dominant focal subject near the center",
            "increase contrast around the CTA and primary offer",
            "guide attention from hero visual to offer in a single clear path",
        ]

        if copy_analysis.urgency_level == "low":
            prompt_parts.append("add a subtle time-bound urgency cue")
        if copy_analysis.offer_clarity != "high":
            prompt_parts.append("make the offer explicit and easy to understand at a glance")
        if copy_analysis.cta_strength == "low":
            prompt_parts.append("highlight a direct CTA button or action phrase")

        caption_hint = caption.strip()[:80]
        prompt_parts.append(f"inspired by the core message: {caption_hint}")
        return ", ".join(prompt_parts)
