"""Regression tests for the MIAA scoreboard's unresolved-game lifecycle."""
import importlib.util
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

script = Path(__file__).resolve().parents[1] / "scripts" / "sync_live.py"
spec = importlib.util.spec_from_file_location("sync_live", script)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def fixture(day="2026-10-31"):
    return [day, "Team A", "Team B", "11:00"]


def final(day="2026-10-31"):
    return [day, "Team A", "Team B", 2, 1, 0]


def data(results=None, upcoming=None, canceled=None, postponed=None, cutoff="2026-10-30"):
    return {"asOf": cutoff, "results": results or [], "upcoming": upcoming or [],
            "canceled": canceled or [], "postponed": postponed or []}


class SyncPendingTests(unittest.TestCase):
    today = date(2026, 11, 1)

    def reconcile(self, fresh, previous=None, ledger=None):
        return sync.reconcile_live(fresh, previous, ledger or [], self.today)

    def test_past_unscored_game_remains_pending(self):
        r = self.reconcile(data(upcoming=[fixture()]))
        self.assertEqual(r["upcoming"], [fixture()])
        self.assertEqual(r["overdue"], [fixture()])

    def test_missing_from_api_does_not_delete_unresolved_game(self):
        r = self.reconcile(data(), {"upcoming": [fixture()]})
        self.assertEqual(r["upcoming"], [fixture()])
        self.assertEqual(r["unverified"], [fixture()])

    def test_new_final_removes_pending_game(self):
        r = self.reconcile(data(results=[final()]), {"upcoming": [fixture()]})
        self.assertEqual(r["upcoming"], [])

    def test_official_ledger_final_removes_pending_game(self):
        r = self.reconcile(data(), {"upcoming": [fixture()]}, [final()])
        self.assertEqual(r["upcoming"], [])

    def test_cancelled_game_is_removed_and_stays_removed(self):
        c = ["2026-10-31", "Team A", "Team B", "Canceled"]
        a = self.reconcile(data(canceled=[c]), {"upcoming": [fixture()]})
        self.assertEqual(a["upcoming"], [])
        b = self.reconcile(data(), a)
        self.assertEqual(b["canceled"], [c])
        self.assertEqual(b["upcoming"], [])

    def test_postponed_is_pending_but_not_overdue(self):
        r = self.reconcile(data(upcoming=[fixture()], postponed=[fixture()]))
        self.assertEqual(r["upcoming"], [fixture()])
        self.assertEqual(r["overdue"], [])

    def test_short_date_move_does_not_duplicate(self):
        r = self.reconcile(data(upcoming=[fixture("2026-11-01")]),
                           {"upcoming": [fixture()]})
        self.assertEqual(r["upcoming"], [fixture("2026-11-01")])

    def test_games_a_week_apart_are_distinct(self):
        r = self.reconcile(data(upcoming=[fixture("2026-11-10")]),
                           {"upcoming": [fixture()]})
        self.assertEqual(len(r["upcoming"]), 2)

    def test_previous_final_not_lost_when_api_temporarily_omits_it(self):
        r = self.reconcile(data(), {"results": [final()]})
        self.assertEqual(r["results"], [final()])

    def test_sport_ingest_retains_yesterday_unscored_game(self):
        team_a = {"schoolId": 1, "schoolName": "Team A", "teamName": "Team A", "score": None}
        team_b = {"schoolId": 2, "schoolName": "Team B", "teamName": "Team B", "score": None}
        row = {"fromDate": "2026-10-31T11:00:00", "uniqueGameId": "game-1",
               "teams": [team_a, team_b], "status": "Normal"}
        with patch.object(sync, "official", return_value=("2026-10-30", {"Team A": 1, "Team B": 1}, [])), \
             patch.object(sync, "fetch", return_value=[row]), \
             patch.object(sync, "learn_names", return_value=({1: "Team A", 2: "Team B"}, {})):
            result = sync.sport_live("field-hockey", self.today)
        self.assertEqual(result["upcoming"], [fixture()])
        self.assertEqual(result["overdue"], [fixture()])


if __name__ == "__main__":
    unittest.main()
