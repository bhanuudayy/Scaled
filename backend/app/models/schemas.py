from dataclasses import dataclass
from typing import Any, Literal

import numpy as np
from pydantic import BaseModel, Field


class AudienceInput(BaseModel):
    age_range: str | None = Field(default=None, description="Example: 18-24")
    gender: str | None = Field(default=None, description="Example: female")
    segments: list[str] = Field(default_factory=list, description="Optional targeting segments")


class RegionActivity(BaseModel):
    amygdala: Literal["low", "medium", "high"]
    prefrontal_cortex: Literal["low", "medium", "high"]
    ventral_attention_network: Literal["low", "medium", "high"]


class NeuroSignals(BaseModel):
    attention_intensity: float = Field(ge=0.0, le=1.0)
    cognitive_load: float = Field(ge=0.0, le=1.0, description="Higher means harder to process quickly.")
    cognitive_load_band: Literal["low", "medium", "high"]
    emotional_salience: float = Field(ge=0.0, le=1.0)
    focus_distribution: Literal["focused", "balanced", "scattered"]
    focus_clarity: float = Field(ge=0.0, le=1.0)
    text_density: float = Field(ge=0.0, le=1.0)
    visual_complexity: float = Field(ge=0.0, le=1.0)
    text_density_score: float = Field(ge=0.0, le=1.0)
    visual_complexity_score: float = Field(ge=0.0, le=1.0)
    element_count_estimate: int = Field(ge=1)
    region_activity: RegionActivity | None = None


class CognitiveBreakdown(BaseModel):
    overall_load: float = Field(ge=0.0, le=1.0)
    load_band: Literal["low", "medium", "high"]
    text_density_score: float = Field(ge=0.0, le=1.0)
    visual_complexity_score: float = Field(ge=0.0, le=1.0)
    element_count_estimate: int = Field(ge=1)
    drivers: list[str]
    reasoning: str


class CopyAnalysis(BaseModel):
    cta_strength: Literal["low", "medium", "high"]
    urgency_level: Literal["low", "medium", "high"]
    offer_clarity: Literal["low", "medium", "high"]
    offer_attractiveness: Literal["low", "medium", "high"]
    copy_issues: list[str]


class BenchmarkSummary(BaseModel):
    attention_band: Literal["below average", "average", "above average"]
    cognitive_load_band: Literal["efficient", "mixed", "friction-heavy"]
    emotional_band: Literal["soft", "balanced", "strong"]
    positioning: str
    attention_vs_top_ads: str
    clarity_vs_top_ads: str


class PredictedBehavior(BaseModel):
    likely_action: Literal["scroll", "pause", "engage"]
    scroll_probability: float = Field(ge=0.0, le=1.0)
    pause_probability: float = Field(ge=0.0, le=1.0)
    engage_probability: float = Field(ge=0.0, le=1.0)
    rationale: str


class InterpretationResult(BaseModel):
    why_it_works: list[str]
    why_it_fails: list[str]
    conversion_insight: str
    improvements: list[str]
    reasoning: list[str]
    copy_analysis: CopyAnalysis
    improved_prompt: str
    key_issues: list[str]
    quick_wins: list[str]


class ScoreResult(BaseModel):
    creative_score: int = Field(ge=0, le=100)
    confidence: Literal["low", "medium", "high"]
    benchmarks: BenchmarkSummary


class HeatmapRegion(BaseModel):
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    width: float = Field(gt=0.0, le=1.0)
    height: float = Field(gt=0.0, le=1.0)
    intensity: float = Field(ge=0.0, le=1.0)
    label: Literal["primary_focus_region", "secondary_focus", "ignored_zone", "clutter"]
    reason: str


class HeatmapOverlay(BaseModel):
    primary_focus_region: HeatmapRegion | None = None
    secondary_focus: list[HeatmapRegion]
    ignored_zones: list[HeatmapRegion]
    clutter_regions: list[HeatmapRegion]


class AIAudit(BaseModel):
    summary: str
    improved_reasoning: list[str]
    improved_recommendations: list[str]


class AnalyzeResponse(BaseModel):
    creative_score: int
    confidence: Literal["low", "medium", "high"]
    predicted_behavior: PredictedBehavior
    neuro_signals: NeuroSignals
    cognitive_breakdown: CognitiveBreakdown
    copy_analysis: CopyAnalysis
    heatmap: HeatmapOverlay
    key_issues: list[str]
    quick_wins: list[str]
    benchmarks: BenchmarkSummary
    conversion_insight: str
    reasoning: list[str]
    why_it_works: list[str]
    why_it_fails: list[str]
    recommendations: list[str]
    improved_prompt: str
    analysis_latency_ms: int = Field(ge=0)
    ai_audit: AIAudit | None = None
    improved_creative_url: str | None = None


class ComparisonMetric(BaseModel):
    creative_a: float
    creative_b: float


class CompareResponse(BaseModel):
    winner: Literal["creative_a", "creative_b"]
    reasoning: list[str]
    metric_comparison: dict[Literal["attention", "cognitive_load", "engagement"], ComparisonMetric]


@dataclass(frozen=True)
class TribeInferenceResult:
    activation_map: np.ndarray
    heuristics: dict[str, float]
    raw_signals: dict[str, Any]
