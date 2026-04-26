from app.models.schemas import BenchmarkSummary, NeuroSignals, ScoreResult


class ScoringEngine:
    """Produces a creative score from attention, friction, and emotional pull."""

    def score(self, neuro_signals: NeuroSignals) -> ScoreResult:
        attention_component = neuro_signals.attention_intensity * 46
        emotion_component = neuro_signals.emotional_salience * 26
        focus_component = neuro_signals.focus_clarity * 14
        load_penalty = neuro_signals.cognitive_load * 24
        complexity_penalty = neuro_signals.visual_complexity * 8

        raw_score = 18 + attention_component + emotion_component + focus_component - load_penalty - complexity_penalty
        creative_score = max(0, min(round(raw_score), 100))

        signal_spread = max(
            neuro_signals.attention_intensity,
            neuro_signals.emotional_salience,
            neuro_signals.focus_clarity,
        ) - min(
            neuro_signals.attention_intensity,
            neuro_signals.emotional_salience,
            neuro_signals.focus_clarity,
        )

        if creative_score >= 75 and neuro_signals.cognitive_load <= 0.55:
            confidence = "high"
        elif creative_score >= 50 and signal_spread <= 0.42:
            confidence = "medium"
        else:
            confidence = "low"

        return ScoreResult(
            creative_score=creative_score,
            confidence=confidence,
            benchmarks=self.benchmarks_for(neuro_signals),
        )

    def benchmarks_for(self, neuro_signals: NeuroSignals) -> BenchmarkSummary:
        if neuro_signals.attention_intensity >= 0.68:
            attention_band = "above average"
        elif neuro_signals.attention_intensity >= 0.48:
            attention_band = "average"
        else:
            attention_band = "below average"

        if neuro_signals.cognitive_load <= 0.35:
            cognitive_band = "efficient"
        elif neuro_signals.cognitive_load <= 0.62:
            cognitive_band = "mixed"
        else:
            cognitive_band = "friction-heavy"

        if neuro_signals.emotional_salience >= 0.68:
            emotional_band = "strong"
        elif neuro_signals.emotional_salience >= 0.45:
            emotional_band = "balanced"
        else:
            emotional_band = "soft"

        if attention_band == "above average" and cognitive_band == "efficient":
            positioning = "This asset is structurally strong for first-pass testing."
        elif cognitive_band == "friction-heavy":
            positioning = "The creative likely needs simplification before scaling spend."
        else:
            positioning = "The creative is testable, but performance may hinge on sharper message hierarchy."

        return BenchmarkSummary(
            attention_band=attention_band,
            cognitive_load_band=cognitive_band,
            emotional_band=emotional_band,
            positioning=positioning,
            attention_vs_top_ads=self._attention_vs_top_ads(neuro_signals.attention_intensity),
            clarity_vs_top_ads=self._clarity_vs_top_ads(neuro_signals.cognitive_load, neuro_signals.focus_clarity),
        )

    def _attention_vs_top_ads(self, attention_intensity: float) -> str:
        if attention_intensity >= 0.72:
            return "Close to stronger top-performing ads on first-second stopping power."
        if attention_intensity >= 0.5:
            return "Competitive with average top ads, but not yet a standout scroll stopper."
        return "Below stronger top ads on stopping power and likely needs a sharper hook."

    def _clarity_vs_top_ads(self, cognitive_load: float, focus_clarity: float) -> str:
        clarity_signal = (focus_clarity * 0.6) + ((1.0 - cognitive_load) * 0.4)
        if clarity_signal >= 0.7:
            return "Message clarity is approaching stronger top ads with relatively efficient visual hierarchy."
        if clarity_signal >= 0.5:
            return "Clarity is serviceable, but stronger top ads usually resolve the message faster."
        return "Clarity trails stronger top ads and likely needs simplification."
