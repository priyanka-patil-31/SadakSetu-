from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MonthlyTrend(BaseModel):
    month: str
    total: int
    resolved: int


class AreaReport(BaseModel):
    area: str
    total: int
    critical: int
    resolved: int = 0


class TeamPerformance(BaseModel):
    team_id: str
    team_name: str
    assigned: int
    resolved: int
    open: int


class ReportSummary(BaseModel):
    generated_at: datetime
    start_date: datetime | None
    end_date: datetime | None
    total_complaints: int
    pending_complaints: int
    resolved_complaints: int
    rejected_complaints: int
    severity_distribution: dict[str, int]
    severity_resolved_distribution: dict[str, int] = Field(default_factory=dict)
    monthly_trends: list[MonthlyTrend]
    area_distribution: list[AreaReport]
    team_performance: list[TeamPerformance]
    ai_detection_statistics: dict[str, Any]
