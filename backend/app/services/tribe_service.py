import asyncio
import io
from collections import deque

import numpy as np
from PIL import Image, UnidentifiedImageError

from app.models.schemas import TribeInferenceResult


class TribeService:
    """Simulates TRIBE-style neural outputs from image-derived heuristics."""

    async def run_inference(self, image_bytes: bytes) -> TribeInferenceResult:
        return await asyncio.to_thread(self._simulate_tribe_v2, image_bytes)

    def _simulate_tribe_v2(self, image_bytes: bytes) -> TribeInferenceResult:
        with Image.open(io.BytesIO(image_bytes)) as image:
            rgb_image = image.convert("RGB")

        grayscale = rgb_image.convert("L")
        gray_small = np.asarray(grayscale.resize((24, 24)), dtype=np.float32) / 255.0
        rgb_small = np.asarray(rgb_image.resize((24, 24)), dtype=np.float32) / 255.0

        contrast = self._clamp(np.std(gray_small) * 3.2)
        gradients = self._gradient_map(gray_small)
        saliency = self._normalize((0.55 * gradients) + (0.45 * gray_small))
        center_weight = self._center_weight_map(*gray_small.shape)
        weighted_saliency = saliency * center_weight

        focal_point_clarity = self._estimate_focal_point_clarity(weighted_saliency)
        text_density = self._estimate_text_density(gradients)
        object_count = self._estimate_object_count(saliency)
        object_count_norm = self._clamp((object_count - 1) / 5.0)
        color_intensity = self._clamp(np.mean(np.max(rgb_small, axis=2) - np.min(rgb_small, axis=2)) * 2.2)

        attention_intensity = self._clamp(
            (0.38 * contrast) + (0.42 * focal_point_clarity) + (0.20 * color_intensity)
        )
        cognitive_load = self._clamp(
            (0.46 * text_density) + (0.34 * object_count_norm) + (0.20 * (1.0 - focal_point_clarity))
        )
        emotional_salience = self._clamp(
            (0.35 * contrast) + (0.25 * color_intensity) + (0.40 * focal_point_clarity)
        )

        focus_distribution = self._classify_focus_distribution(
            focal_point_clarity=focal_point_clarity,
            object_count=object_count,
            text_density=text_density,
        )

        region_activity = {
            "amygdala": self._band_label((emotional_salience * 0.7) + (contrast * 0.3)),
            "prefrontal_cortex": self._band_label((1.0 - cognitive_load) * 0.55 + text_density * 0.45),
            "ventral_attention_network": self._band_label((attention_intensity * 0.7) + (focal_point_clarity * 0.3)),
        }

        heuristics = {
            "contrast": round(contrast, 3),
            "focal_point_clarity": round(focal_point_clarity, 3),
            "text_density": round(text_density, 3),
            "object_count": float(object_count),
            "object_count_norm": round(object_count_norm, 3),
            "color_intensity": round(color_intensity, 3),
            "visual_complexity": round(self._clamp((text_density * 0.5) + (object_count_norm * 0.5)), 3),
        }

        raw_signals = {
            "attention_intensity": round(attention_intensity, 3),
            "cognitive_load": round(cognitive_load, 3),
            "emotional_salience": round(emotional_salience, 3),
            "focus_distribution": focus_distribution,
            "region_activity": region_activity,
        }

        activation_map = self._normalize((0.7 * saliency) + (0.3 * center_weight))

        return TribeInferenceResult(
            activation_map=activation_map,
            heuristics=heuristics,
            raw_signals=raw_signals,
        )

    def _gradient_map(self, gray_map: np.ndarray) -> np.ndarray:
        gy = np.abs(np.diff(gray_map, axis=0, prepend=gray_map[:1, :]))
        gx = np.abs(np.diff(gray_map, axis=1, prepend=gray_map[:, :1]))
        return self._normalize(gx + gy)

    def _center_weight_map(self, height: int, width: int) -> np.ndarray:
        y_axis, x_axis = np.ogrid[:height, :width]
        center_y = (height - 1) / 2
        center_x = (width - 1) / 2
        distance = np.sqrt(((y_axis - center_y) / height) ** 2 + ((x_axis - center_x) / width) ** 2)
        return self._normalize(1.0 - distance)

    def _estimate_focal_point_clarity(self, weighted_saliency: np.ndarray) -> float:
        flattened = np.sort(weighted_saliency.flatten())
        top_mean = float(np.mean(flattened[-10:]))
        baseline = float(np.mean(flattened))
        clarity = (top_mean - baseline) / max(top_mean, 1e-6)
        return self._clamp(clarity * 1.7)

    def _estimate_text_density(self, gradient_map: np.ndarray) -> float:
        threshold = float(np.quantile(gradient_map, 0.78))
        dense_pixels = gradient_map >= threshold
        row_activity = np.mean(dense_pixels, axis=1)
        active_rows = np.mean(row_activity > 0.32)
        overall_density = float(np.mean(dense_pixels))
        return self._clamp((0.6 * overall_density) + (0.4 * active_rows))

    def _estimate_object_count(self, saliency: np.ndarray) -> int:
        threshold = float(np.quantile(saliency, 0.82))
        mask = saliency >= threshold
        visited = np.zeros_like(mask, dtype=bool)
        components = 0

        for y in range(mask.shape[0]):
            for x in range(mask.shape[1]):
                if not mask[y, x] or visited[y, x]:
                    continue
                size = self._component_size(mask, visited, y, x)
                if size >= 5:
                    components += 1

        return max(1, min(components, 6))

    def _component_size(self, mask: np.ndarray, visited: np.ndarray, start_y: int, start_x: int) -> int:
        queue: deque[tuple[int, int]] = deque([(start_y, start_x)])
        visited[start_y, start_x] = True
        size = 0

        while queue:
            y, x = queue.popleft()
            size += 1

            for delta_y, delta_x in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                new_y = y + delta_y
                new_x = x + delta_x
                if (
                    0 <= new_y < mask.shape[0]
                    and 0 <= new_x < mask.shape[1]
                    and mask[new_y, new_x]
                    and not visited[new_y, new_x]
                ):
                    visited[new_y, new_x] = True
                    queue.append((new_y, new_x))

        return size

    def _classify_focus_distribution(self, focal_point_clarity: float, object_count: int, text_density: float) -> str:
        if focal_point_clarity >= 0.62 and object_count <= 2 and text_density <= 0.45:
            return "focused"
        if focal_point_clarity >= 0.42 and object_count <= 4:
            return "balanced"
        return "scattered"

    def _band_label(self, value: float) -> str:
        if value < 0.34:
            return "low"
        if value < 0.67:
            return "medium"
        return "high"

    def _normalize(self, array: np.ndarray) -> np.ndarray:
        min_value = float(np.min(array))
        max_value = float(np.max(array))
        spread = max(max_value - min_value, 1e-6)
        return (array - min_value) / spread

    def _clamp(self, value: float) -> float:
        return float(max(0.0, min(value, 1.0)))
