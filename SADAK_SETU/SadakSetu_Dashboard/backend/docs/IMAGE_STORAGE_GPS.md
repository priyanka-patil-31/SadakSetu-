# SadakSetu Image Storage and GPS

- Images are validated by declared MIME type, decoded content, and Pillow format sniffing.
- JPEG, PNG, and WEBP are supported by configuration; the default maximum size is 10 MiB.
- Files are stored under `backend/uploads/<complaint-id>/` and are not exposed as a static directory.
- PostgreSQL stores only image metadata, storage key, media type, byte size, checksum, and timestamps.
- Image listing and download require the complaint owner or an administrator.
- Complaint GPS values are validated at the Pydantic and database layers and stored as `geography(Point, 4326)`.
- `/api/v1/locations/nearby` uses PostGIS distance filtering and requires authentication.
