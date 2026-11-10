from fastapi.testclient import TestClient


def test_openapi_contract_has_versioned_core_resources(client: TestClient) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    document = response.json()
    paths = document["paths"]
    for path in (
        "/api/v1/auth/login",
        "/api/v1/complaints",
        "/api/v1/complaints/{complaint_id}/images",
        "/api/v1/ai/images/{image_id}/detect",
        "/api/v1/teams",
        "/api/v1/assignments/complaints/{complaint_id}",
        "/api/v1/notifications",
        "/api/v1/reports/summary",
    ):
        assert path in paths


def test_validation_errors_use_the_stable_error_contract(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        headers={"X-Request-ID": "contract-test-422"},
        json={"email": "not-an-email", "password": ""},
    )
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert response.json()["request_id"] == "contract-test-422"
