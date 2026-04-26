import asyncio
import time
import traceback

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.models.schemas import AIAudit, AnalyzeResponse, CompareResponse, ComparisonMetric
from app.services.ai_auditor import audit_response
from app.services.behavior_service import BehaviorService
from app.services.heatmap_service import HeatmapService
from app.services.interpretation_service import InterpretationService
from app.services.scoring_engine import ScoringEngine
from app.services.signal_extractor import SignalExtractor
from app.services.tribe_service import TribeService
from app.utils.parsers import parse_audience_payload

router = APIRouter(tags=["analysis"])

tribe_service = TribeService()
signal_extractor = SignalExtractor()
behavior_service = BehaviorService()
interpretation_service = InterpretationService()
scoring_engine = ScoringEngine()
heatmap_service = HeatmapService()


async def _build_analysis_result(
    image_bytes: bytes,
    caption: str,
    audience_payload: str,
    budget: int,
    days: int,
) -> AnalyzeResponse:
    print("START STEP 2")
    audience_profile = parse_audience_payload(audience_payload)
    started_at = time.perf_counter()

    print("START STEP 3")
    tribe_result = await tribe_service.run_inference(image_bytes=image_bytes)
    if tribe_result is None:
        raise ValueError("tribe_service.run_inference returned None.")
    if tribe_result.activation_map is None:
        raise ValueError("Decoded image activation map is None.")
    print("STEP 2 COMPLETE")

    if tribe_result.raw_signals is None:
        raise ValueError("TRIBE raw signals are None.")
    expected_signal_keys = {
        "attention_intensity",
        "cognitive_load",
        "emotional_salience",
        "focus_distribution",
        "region_activity",
    }
    missing_signal_keys = expected_signal_keys - set(tribe_result.raw_signals.keys())
    if missing_signal_keys:
        raise KeyError(f"Missing expected signal keys from TRIBE output: {sorted(missing_signal_keys)}")

    print("START STEP 4")
    neuro_signals = signal_extractor.extract(tribe_result)
    if neuro_signals is None:
        raise ValueError("signal_extractor.extract returned None.")
    required_neuro_fields = (
        "attention_intensity",
        "cognitive_load",
        "emotional_salience",
        "focus_clarity",
    )
    for field_name in required_neuro_fields:
        if not hasattr(neuro_signals, field_name):
            raise KeyError(f"Missing expected neuro signal field: {field_name}")

    print("START STEP 5")
    cognitive_breakdown = signal_extractor.cognitive_breakdown(neuro_signals)
    if cognitive_breakdown is None:
        raise ValueError("signal_extractor.cognitive_breakdown returned None.")
    benchmark_snapshot = scoring_engine.benchmarks_for(neuro_signals)
    print("STEP 3 COMPLETE")

    print("START STEP 6")
    score_task = asyncio.to_thread(scoring_engine.score, neuro_signals)
    behavior_task = asyncio.to_thread(behavior_service.predict, neuro_signals)
    heatmap_task = asyncio.to_thread(heatmap_service.generate, tribe_result, neuro_signals)

    score_result, predicted_behavior, heatmap = await asyncio.gather(
        score_task,
        behavior_task,
        heatmap_task,
    )
    if score_result is None:
        raise ValueError("scoring_engine.score returned None.")
    if predicted_behavior is None:
        raise ValueError("behavior_service.predict returned None.")
    print("STEP 4 COMPLETE")
    if heatmap is None:
        raise ValueError("heatmap_service.generate returned None.")
    print("STEP 5 COMPLETE")

    print("START STEP 7")
    print("STEP 6 COMPLETE")
    interpretation = await interpretation_service.interpret(
        neuro_signals=neuro_signals,
        predicted_behavior=predicted_behavior,
        cognitive_breakdown=cognitive_breakdown,
        caption=caption,
        audience=audience_profile,
        budget=budget,
        days=days,
        benchmarks=benchmark_snapshot,
    )
    if interpretation is None:
        raise ValueError("interpretation_service.interpret returned None.")

    latency_ms = round((time.perf_counter() - started_at) * 1000)

    return AnalyzeResponse(
        creative_score=score_result.creative_score,
        confidence=score_result.confidence,
        predicted_behavior=predicted_behavior,
        neuro_signals=neuro_signals,
        cognitive_breakdown=cognitive_breakdown,
        copy_analysis=interpretation.copy_analysis,
        heatmap=heatmap,
        key_issues=interpretation.key_issues,
        quick_wins=interpretation.quick_wins,
        benchmarks=score_result.benchmarks,
        conversion_insight=interpretation.conversion_insight,
        reasoning=interpretation.reasoning,
        why_it_works=interpretation.why_it_works,
        why_it_fails=interpretation.why_it_fails,
        recommendations=interpretation.improvements,
        improved_prompt=interpretation.improved_prompt,
        analysis_latency_ms=latency_ms,
        improved_creative_url=None,
    )


def _validate_analyze_inputs(file: UploadFile, caption: str, budget: int, days: int) -> None:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    if budget <= 0 or days <= 0:
        raise HTTPException(status_code=400, detail="Budget and days must be positive integers.")
    if not caption.strip():
        raise HTTPException(status_code=400, detail="Caption must not be empty.")


@router.post("/analyze", response_model=AnalyzeResponse, status_code=status.HTTP_200_OK)
async def analyze_creative(
    file: UploadFile = File(...),
    caption: str = Form(...),
    audience: str = Form(...),
    budget: int = Form(...),
    days: int = Form(...),
) -> AnalyzeResponse:
    try:
        print("START STEP 1")
        _validate_analyze_inputs(file, caption, budget, days)

        image_bytes = await file.read()
        print("STEP 1 COMPLETE")
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        result = await _build_analysis_result(image_bytes, caption, audience, budget, days)
        try:
            audit = await asyncio.to_thread(audit_response, result.model_dump())
            result.ai_audit = AIAudit(**audit)
        except Exception as exc:
            print("AI audit failed:", exc)

        return result
    except Exception as exc:
        print(f"ANALYZE ERROR: {exc}")
        traceback.print_exc()
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/compare", response_model=CompareResponse, status_code=status.HTTP_200_OK)
async def compare_creatives(
    file_a: UploadFile = File(...),
    caption_a: str = Form(...),
    file_b: UploadFile = File(...),
    caption_b: str = Form(...),
    audience: str = Form(...),
    budget: int = Form(...),
    days: int = Form(...),
) -> CompareResponse:
    _validate_analyze_inputs(file_a, caption_a, budget, days)
    _validate_analyze_inputs(file_b, caption_b, budget, days)

    image_bytes_a, image_bytes_b = await asyncio.gather(file_a.read(), file_b.read())
    if not image_bytes_a or not image_bytes_b:
        raise HTTPException(status_code=400, detail="Both uploaded files must be non-empty images.")

    try:
        result_a, result_b = await asyncio.gather(
            _build_analysis_result(image_bytes_a, caption_a, audience, budget, days),
            _build_analysis_result(image_bytes_b, caption_b, audience, budget, days),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to compare creatives.") from exc

    winner = "creative_a" if result_a.creative_score >= result_b.creative_score else "creative_b"
    reasoning = [
        f"{winner} wins on overall creative score and is more likely to sustain attention efficiently.",
        (
            "Creative A has stronger stopping power."
            if result_a.neuro_signals.attention_intensity >= result_b.neuro_signals.attention_intensity
            else "Creative B has stronger stopping power."
        ),
        (
            "Creative A has lower cognitive friction."
            if result_a.neuro_signals.cognitive_load <= result_b.neuro_signals.cognitive_load
            else "Creative B has lower cognitive friction."
        ),
        (
            "Creative A shows better engagement potential."
            if result_a.predicted_behavior.engage_probability >= result_b.predicted_behavior.engage_probability
            else "Creative B shows better engagement potential."
        ),
    ]

    return CompareResponse(
        winner=winner,
        reasoning=reasoning,
        metric_comparison={
            "attention": ComparisonMetric(
                creative_a=result_a.neuro_signals.attention_intensity,
                creative_b=result_b.neuro_signals.attention_intensity,
            ),
            "cognitive_load": ComparisonMetric(
                creative_a=result_a.neuro_signals.cognitive_load,
                creative_b=result_b.neuro_signals.cognitive_load,
            ),
            "engagement": ComparisonMetric(
                creative_a=result_a.predicted_behavior.engage_probability,
                creative_b=result_b.predicted_behavior.engage_probability,
            ),
        },
    )
