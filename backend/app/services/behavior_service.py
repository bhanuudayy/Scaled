from app.models.schemas import NeuroSignals, PredictedBehavior


class BehaviorService:
    """Estimates likely in-feed behavior from the normalized signal stack."""

    def predict(self, neuro_signals: NeuroSignals) -> PredictedBehavior:
        # High cognitive load pushes users toward scrolling, while clear focus
        # tends to earn a pause and emotional salience increases deeper engagement.
        scroll = self._clamp(
            0.38
            + (neuro_signals.cognitive_load * 0.38)
            + (neuro_signals.visual_complexity_score * 0.12)
            - (neuro_signals.attention_intensity * 0.16)
            - (neuro_signals.focus_clarity * 0.10)
        )
        pause = self._clamp(
            0.18
            + (neuro_signals.attention_intensity * 0.32)
            + (neuro_signals.focus_clarity * 0.28)
            - (neuro_signals.cognitive_load * 0.14)
            + (neuro_signals.emotional_salience * 0.08)
        )
        engage = self._clamp(
            0.10
            + (neuro_signals.emotional_salience * 0.34)
            + (neuro_signals.attention_intensity * 0.18)
            + ((1.0 - neuro_signals.cognitive_load) * 0.16)
            + (neuro_signals.focus_clarity * 0.10)
        )

        total = max(scroll + pause + engage, 1e-6)
        scroll_probability = round(scroll / total, 3)
        pause_probability = round(pause / total, 3)
        engage_probability = round(engage / total, 3)

        probabilities = {
            "scroll": scroll_probability,
            "pause": pause_probability,
            "engage": engage_probability,
        }
        likely_action = max(probabilities, key=probabilities.get)

        rationale = {
            "scroll": "Friction appears high relative to stopping power, so many viewers may keep moving before the offer resolves.",
            "pause": "The creative likely earns attention, but some message friction may keep that pause from becoming strong intent.",
            "engage": "The balance of salience, clarity, and emotional pull suggests a better chance of active interest after the initial stop.",
        }[likely_action]

        return PredictedBehavior(
            likely_action=likely_action,
            scroll_probability=scroll_probability,
            pause_probability=pause_probability,
            engage_probability=engage_probability,
            rationale=rationale,
        )

    def _clamp(self, value: float) -> float:
        return max(0.0, min(float(value), 1.0))
