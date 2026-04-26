import numpy as np

from app.models.schemas import HeatmapOverlay, HeatmapRegion, NeuroSignals, TribeInferenceResult


class HeatmapService:
    """Builds overlay-ready focus and clutter regions from the activation map."""

    def generate(self, tribe_result: TribeInferenceResult, neuro_signals: NeuroSignals) -> HeatmapOverlay:
        activation_map = tribe_result.activation_map
        height, width = activation_map.shape
        grid_size = 4
        cell_height = height // grid_size
        cell_width = width // grid_size
        mean_activation = float(np.mean(activation_map))

        focus_candidates: list[HeatmapRegion] = []
        secondary_focus: list[HeatmapRegion] = []
        ignored_zones: list[HeatmapRegion] = []
        clutter_regions: list[HeatmapRegion] = []

        for grid_y in range(grid_size):
            for grid_x in range(grid_size):
                y_start = grid_y * cell_height
                x_start = grid_x * cell_width
                y_end = height if grid_y == grid_size - 1 else (grid_y + 1) * cell_height
                x_end = width if grid_x == grid_size - 1 else (grid_x + 1) * cell_width

                cell = activation_map[y_start:y_end, x_start:x_end]
                score = float(np.mean(cell))
                deviation = score - mean_activation

                base_region = HeatmapRegion(
                    x=round(x_start / width, 3),
                    y=round(y_start / height, 3),
                    width=round((x_end - x_start) / width, 3),
                    height=round((y_end - y_start) / height, 3),
                    intensity=round(max(0.0, min(score, 1.0)), 3),
                    label="secondary_focus",
                    reason="",
                )

                if deviation >= 0.18:
                    focus_candidates.append(
                        base_region.model_copy(
                            update={
                                "label": "primary_focus_region",
                                "reason": "This zone appears to carry the dominant visual hook and will likely attract the first fixation.",
                            }
                        )
                    )
                elif deviation >= 0.06:
                    secondary_focus.append(
                        base_region.model_copy(
                            update={
                                "label": "secondary_focus",
                                "reason": "This area draws supporting attention and may compete with the hero focal point.",
                            }
                        )
                    )
                elif deviation <= -0.16:
                    ignored_zones.append(
                        base_region.model_copy(
                            update={
                                "label": "ignored_zone",
                                "reason": "This area is likely to be overlooked because it carries relatively little visual pull.",
                            }
                        )
                    )
                elif deviation <= -0.09 and neuro_signals.cognitive_load >= 0.45:
                    clutter_regions.append(
                        base_region.model_copy(
                            update={
                                "label": "clutter",
                                "reason": "This region may add complexity without helping users resolve the core message.",
                            }
                        )
                    )

        focus_candidates.sort(key=lambda region: region.intensity, reverse=True)
        secondary_focus.sort(key=lambda region: region.intensity, reverse=True)
        ignored_zones.sort(key=lambda region: region.intensity)
        clutter_regions.sort(key=lambda region: region.intensity)

        return HeatmapOverlay(
            primary_focus_region=focus_candidates[0] if focus_candidates else None,
            secondary_focus=secondary_focus[:3],
            ignored_zones=ignored_zones[:3],
            clutter_regions=clutter_regions[:3],
        )
