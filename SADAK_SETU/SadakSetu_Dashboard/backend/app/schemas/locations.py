
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.complaints import LocationResponse


class NearbyLocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    location: LocationResponse
    distance_meters: float


class LocationSearchQuery(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_meters: float = Field(default=5_000, gt=0, le=100_000)
