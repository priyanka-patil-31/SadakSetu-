from ai_service.evaluation.prepare_dataset import _convert_row


def test_converts_pothole_bbox_to_single_class() -> None:
    converted, reason = _convert_row("6 0.5 0.5 0.25 0.2")

    assert reason == "box"
    assert converted == "0 0.5000000000 0.5000000000 0.2500000000 0.2000000000"


def test_converts_pothole_polygon_to_tight_bbox() -> None:
    converted, reason = _convert_row("6 0.1 0.2 0.5 0.2 0.4 0.8 0.1 0.8")

    assert reason == "polygon"
    assert converted == "0 0.3000000000 0.5000000000 0.4000000000 0.6000000000"


def test_excludes_non_pothole_rows() -> None:
    converted, reason = _convert_row("0 0.5 0.5 0.25 0.2")

    assert converted is None
    assert reason == "non_pothole"


def test_rejects_invalid_polygon() -> None:
    converted, reason = _convert_row("6 0.1 0.2 1.4 0.2 0.4")

    assert converted is None
    assert reason == "invalid_polygon"
