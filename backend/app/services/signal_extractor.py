from app.models.schemas import CognitiveBreakdown, NeuroSignals, RegionActivity, TribeInferenceResult


class SignalExtractor:
    """Normalizes TRIBE-style heuristics into stable product-facing metrics."""

    def extract(self, tribe_result: TribeInferenceResult) -> NeuroSignals:
        heuristics = tribe_result.heuristics
        raw_signals = tribe_result.raw_signals

        attention_intensity = self._normalize_metric(
            (raw_signals["attention_intensity"] * 0.7) + (heuristics["contrast"] * 0.3)
        )
        cognitive_load = self._normalize_metric(
            (raw_signals["cognitive_load"] * 0.65)
            + (heuristics["text_density"] * 0.2)
            + (heuristics["object_count_norm"] * 0.15)
        )
        emotional_salience = self._normalize_metric(
            (raw_signals["emotional_salience"] * 0.75) + (heuristics["color_intensity"] * 0.25)
        )
        focus_clarity = self._normalize_metric(heuristics["focal_point_clarity"])
        text_density = self._normalize_metric(heuristics["text_density"])
        visual_complexity = self._normalize_metric(heuristics["visual_complexity"])
        element_count_estimate = max(1, int(round(heuristics["object_count"])))

        return NeuroSignals(
            attention_intensity=round(attention_intensity, 3),
            cognitive_load=round(cognitive_load, 3),
            cognitive_load_band=self._band_label(cognitive_load),
            emotional_salience=round(emotional_salience, 3),
            focus_distribution=raw_signals["focus_distribution"],
            focus_clarity=round(focus_clarity, 3),
            text_density=round(text_density, 3),
            visual_complexity=round(visual_complexity, 3),
            text_density_score=round(text_density, 3),
            visual_complexity_score=round(visual_complexity, 3),
            element_count_estimate=element_count_estimate,
            region_activity=RegionActivity(**raw_signals["region_activity"]),
        )

    def cognitive_breakdown(self, neuro_signals: NeuroSignals) -> CognitiveBreakdown:
        drivers: list[str] = []

        if neuro_signals.text_density_score >= 0.55:
            drivers.append("dense text")
        if neuro_signals.visual_complexity_score >= 0.55:
            drivers.append("multiple competing elements")
        if neuro_signals.element_count_estimate >= 4:
            drivers.append("high element count")
        if neuro_signals.focus_distribution == "scattered":
            drivers.append("weak focal hierarchy")

        reasoning = self._build_reasoning(neuro_signals, drivers)

        return CognitiveBreakdown(
            overall_load=neuro_signals.cognitive_load,
            load_band=neuro_signals.cognitive_load_band,
            text_density_score=neuro_signals.text_density_score,
            visual_complexity_score=neuro_signals.visual_complexity_score,
            element_count_estimate=neuro_signals.element_count_estimate,
            drivers=drivers or ["no major friction drivers detected"],
            reasoning=reasoning,
        )

    def _normalize_metric(self, value: float) -> float:
        return max(0.0, min(float(value), 1.0))

    def _band_label(self, value: float) -> str:
        if value < 0.34:
            return "low"
        if value < 0.67:
            return "medium"
        return "high"

    def _build_reasoning(self, neuro_signals: NeuroSignals, drivers: list[str]) -> str:
        if not drivers:
            return "Cognitive load appears controlled, so the creative should be relatively easy to process quickly."

        if len(drivers) == 1:
            return f"Elevated cognitive load appears to be driven mainly by {drivers[0]}."

        if len(drivers) == 2:
            return f"High cognitive load is likely driven by {drivers[0]} and {drivers[1]}."

        return (
            f"High cognitive load is likely driven by {drivers[0]}, {drivers[1]}, "
            f"and {drivers[2]}."
        )
