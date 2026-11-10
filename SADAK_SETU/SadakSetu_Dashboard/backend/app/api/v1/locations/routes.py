from fastapi import APIRouter, Depends
from geoalchemy2 import Geography
from sqlalchemy import cast, func, select
from sqlalchemy.orm import Session as DBSession

from app.database.dependencies import get_db
from app.dependencies.auth import get_current_auth
from app.models import Complaint, Location
from app.schemas.locations import LocationSearchQuery, NearbyLocationResponse
from app.services.auth import AuthenticatedSession

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/nearby", response_model=list[NearbyLocationResponse])
def nearby_locations(
    query: LocationSearchQuery = Depends(),
    _: AuthenticatedSession = Depends(get_current_auth),
    db: DBSession = Depends(get_db),
) -> list[NearbyLocationResponse]:
    origin = func.ST_SetSRID(func.ST_MakePoint(query.longitude, query.latitude), 4326)
    distance = func.ST_Distance(Location.point, cast(origin, Geography(geometry_type="POINT", srid=4326)))
    rows = db.execute(
        select(Location, distance.label("distance_meters"))
        .join(Complaint, Complaint.location_id == Location.id)
        .where(
            func.ST_DWithin(
                Location.point, cast(origin, Geography(geometry_type="POINT", srid=4326)), query.radius_meters
            )
        )
        .distinct()
        .order_by(distance)
    ).all()
    return [
        NearbyLocationResponse(location=location, distance_meters=float(distance_meters))
        for location, distance_meters in rows
    ]
