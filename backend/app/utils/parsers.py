import json

from fastapi import HTTPException
from pydantic import ValidationError

from app.models.schemas import AudienceInput


def parse_audience_payload(audience_payload: str) -> AudienceInput:
    try:
        parsed = json.loads(audience_payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="Audience must be valid JSON, for example: "
            '{"age_range":"25-34","gender":"female","segments":["fitness"]}',
        ) from exc

    try:
        return AudienceInput(**parsed)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail="Audience JSON does not match the expected schema.") from exc
