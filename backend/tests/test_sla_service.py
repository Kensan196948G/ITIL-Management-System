from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock


from app.models.incident import IncidentPriority, IncidentStatus
from app.services.sla_service import SLAService, _DEFAULT_RESOLUTION_MINUTES


def make_incident(status=IncidentStatus.NEW, sla_due_at=None):
    inc = MagicMock()
    inc.status = status
    inc.sla_due_at = sla_due_at
    return inc


class TestComputeDueAt:
    def test_uses_default_when_no_policy(self):
        base = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
        due = SLAService.compute_due_at(IncidentPriority.P1_CRITICAL, base_time=base)
        expected_minutes = _DEFAULT_RESOLUTION_MINUTES[IncidentPriority.P1_CRITICAL]
        assert due == base + timedelta(minutes=expected_minutes)

    def test_uses_policy_when_active(self):
        base = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
        policy = MagicMock()
        policy.is_active = True
        policy.resolution_time_minutes = 120
        due = SLAService.compute_due_at(
            IncidentPriority.P2_HIGH, policy=policy, base_time=base
        )
        assert due == base + timedelta(minutes=120)

    def test_ignores_inactive_policy(self):
        base = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
        policy = MagicMock()
        policy.is_active = False
        policy.resolution_time_minutes = 1
        due = SLAService.compute_due_at(
            IncidentPriority.P3_MEDIUM, policy=policy, base_time=base
        )
        expected = base + timedelta(minutes=_DEFAULT_RESOLUTION_MINUTES[IncidentPriority.P3_MEDIUM])
        assert due == expected

    def test_all_priorities_have_defaults(self):
        base = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
        for priority in IncidentPriority:
            due = SLAService.compute_due_at(priority, base_time=base)
            assert due > base

    def test_p1_is_shorter_than_p4(self):
        base = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
        p1_due = SLAService.compute_due_at(IncidentPriority.P1_CRITICAL, base_time=base)
        p4_due = SLAService.compute_due_at(IncidentPriority.P4_LOW, base_time=base)
        assert p1_due < p4_due


class TestIsOverdue:
    def test_returns_false_when_no_sla_due(self):
        incident = make_incident(sla_due_at=None)
        assert not SLAService.is_overdue(incident)

    def test_returns_false_for_resolved(self):
        past = datetime(2020, 1, 1, tzinfo=timezone.utc)
        incident = make_incident(status=IncidentStatus.RESOLVED, sla_due_at=past)
        assert not SLAService.is_overdue(incident)

    def test_returns_false_for_closed(self):
        past = datetime(2020, 1, 1, tzinfo=timezone.utc)
        incident = make_incident(status=IncidentStatus.CLOSED, sla_due_at=past)
        assert not SLAService.is_overdue(incident)

    def test_returns_false_for_cancelled(self):
        past = datetime(2020, 1, 1, tzinfo=timezone.utc)
        incident = make_incident(status=IncidentStatus.CANCELLED, sla_due_at=past)
        assert not SLAService.is_overdue(incident)

    def test_returns_true_when_past_due(self):
        now = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
        past_due = datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc)
        incident = make_incident(status=IncidentStatus.IN_PROGRESS, sla_due_at=past_due)
        assert SLAService.is_overdue(incident, now=now)

    def test_returns_false_when_not_yet_due(self):
        now = datetime(2026, 6, 1, 9, 0, tzinfo=timezone.utc)
        future_due = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
        incident = make_incident(status=IncidentStatus.IN_PROGRESS, sla_due_at=future_due)
        assert not SLAService.is_overdue(incident, now=now)

    def test_handles_naive_datetime(self):
        now = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
        naive_past = datetime(2026, 6, 1, 10, 0)  # no tzinfo
        incident = make_incident(status=IncidentStatus.NEW, sla_due_at=naive_past)
        assert SLAService.is_overdue(incident, now=now)


class TestRemainingMinutes:
    def test_returns_none_when_no_sla_due(self):
        incident = make_incident(sla_due_at=None)
        assert SLAService.remaining_minutes(incident) is None

    def test_returns_positive_when_not_overdue(self):
        now = datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc)
        due = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
        incident = make_incident(sla_due_at=due)
        result = SLAService.remaining_minutes(incident, now=now)
        assert result == 120

    def test_returns_negative_when_overdue(self):
        now = datetime(2026, 6, 1, 14, 0, tzinfo=timezone.utc)
        due = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
        incident = make_incident(sla_due_at=due)
        result = SLAService.remaining_minutes(incident, now=now)
        assert result == -120
