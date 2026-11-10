from fastapi.testclient import TestClient


def test_root_health_check(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "SadakSetu API",
        "environment": "development",
        "version": "0.1.0",
    }


def test_versioned_health_check(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_cors_allows_configured_frontend_origin(client: TestClient) -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_security_headers_are_present(client: TestClient) -> None:
    response = client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"


def test_unknown_route_returns_not_found_without_debug_details(client: TestClient) -> None:
    response = client.get("/not-a-real-sadaksetu-route", headers={"X-Request-ID": "contract-test-404"})

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Not Found",
        "message": "Not Found",
        "code": "http_404",
        "request_id": "contract-test-404",
        "details": None,
    }
    assert response.headers["x-request-id"] == "contract-test-404"
