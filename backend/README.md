# Creative Analysis Engine

FastAPI backend for a pre-launch creative testing workflow. The system accepts an ad image, caption, audience metadata, and campaign context, then simulates TRIBE-style neural signals and translates them into marketing insight, score bands, and overlay-ready attention regions.

## Project Structure

```text
app/
  main.py
  routes/
    analyze.py
  services/
    tribe_service.py
    signal_extractor.py
    interpretation_service.py
    scoring_engine.py
    heatmap_service.py
  models/
    schemas.py
  utils/
    parsers.py
    prompting.py
    settings.py
requirements.txt
README.md
```

## What Each Module Does

- `app/services/tribe_service.py`: simulates TRIBE v2-style outputs from image heuristics such as contrast, focal point clarity, text density, object count, and color intensity.
- `app/services/signal_extractor.py`: normalizes the simulated outputs into stable public metrics like attention intensity, cognitive load, emotional salience, focus distribution, and optional region activity.
- `app/services/behavior_service.py`: estimates whether users are more likely to scroll, pause, or engage based on the signal mix.
- `app/services/interpretation_service.py`: uses an LLM with a strict JSON prompt when configured, otherwise falls back to a deterministic marketing interpreter with copy and offer analysis.
- `app/services/scoring_engine.py`: scores creative readiness with positive attention weighting, cognitive-load penalties, benchmark bands, and confidence.
- `app/services/heatmap_service.py`: builds primary focus, secondary focus, ignored zones, and clutter regions for frontend overlays.
- `app/routes/analyze.py`: async multipart endpoints for both `/analyze` and `/compare`, with shared pipeline logic.

## Run Locally

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Optional: enable OpenAI interpretation:

```bash
export OPENAI_API_KEY="your_api_key"
export OPENAI_MODEL="gpt-4o-mini"
export LLM_TIMEOUT_SECONDS="3.2"
```

4. Start the API:

```bash
uvicorn app.main:app --reload
```

5. Open the docs:

```text
http://127.0.0.1:8000/docs
```

## Example Request

Use multipart form data. `audience` should be a JSON string.

```bash
curl -X POST "http://127.0.0.1:8000/analyze" \
  -F "file=@/absolute/path/to/creative.jpg" \
  -F 'caption=Drop body fat without crash dieting.' \
  -F 'audience={"age_range":"25-34","gender":"female","segments":["fitness","working-professionals"]}' \
  -F "budget=50000" \
  -F "days=14"
```

## Response Shape

The `/analyze` response is designed to feel closer to a Meta Ads-style diagnostic payload:

- `creative_score` and `confidence`
- `predicted_behavior` with `scroll_probability`, `pause_probability`, and `engage_probability`
- `neuro_signals` with normalized attention, cognitive load, emotional salience, focal clarity, text density, and element count signals
- `cognitive_breakdown` explaining what is driving friction
- `copy_analysis` covering CTA strength, urgency, offer clarity, offer attractiveness, and copy issues
- `heatmap` with `primary_focus_region`, `secondary_focus`, `ignored_zones`, and `clutter_regions`
- `key_issues`, `quick_wins`, `reasoning`, `why_it_works`, and `why_it_fails`
- `benchmarks` with attention and clarity comparisons versus stronger ads
- `improved_prompt` for creative-generation follow-up workflows

## Compare Endpoint

`POST /compare` accepts two image creatives and two captions, then returns:

- `winner`
- `reasoning`
- `metric_comparison` for attention, cognitive load, and engagement potential

## Notes

- The TRIBE layer is heuristic-driven and intentionally avoids hard neuroscience claims.
- The API returns decision-support insights, not exact conversion forecasts.
- Raw activation maps stay inside the backend and are never exposed to clients.
- The LLM path is optional and bounded by a short timeout to help keep end-to-end latency under 5 seconds.
