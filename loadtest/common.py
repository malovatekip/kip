"""
Shared helpers for the KIP locustfiles.
"""
import itertools
import json
import os
import threading
from pathlib import Path

TOKENS_FILE = Path(__file__).resolve().parent / "tokens.json"


class TokenPool:
    """Round-robins pre-seeded JWTs across virtual users so each VU acts as
    a distinct logged-in user instead of everyone sharing one token."""

    def __init__(self, path: Path = TOKENS_FILE):
        if not path.exists():
            raise FileNotFoundError(
                f"{path} not found — run seed_users.py first "
                f"(backend\\venv\\Scripts\\python.exe loadtest\\seed_users.py --count 60)"
            )
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if not data:
            raise ValueError(f"{path} is empty — run seed_users.py first")
        self._tokens = [v["token"] for v in data.values()]
        self._cycle = itertools.cycle(self._tokens)
        self._lock = threading.Lock()

    def next_token(self) -> str:
        with self._lock:
            return next(self._cycle)


class AiCallBudget:
    """Hard global cap on how many real Anthropic-backed requests the
    AI-capped locustfile is allowed to make in a single run, so 'many
    concurrent users' testing never turns into an open-ended API bill.
    Checked BEFORE every AI-endpoint request; once exhausted, the calling
    task should raise locust.exception.StopUser().
    """

    def __init__(self, budget: int):
        self.budget = budget
        self._count = 0
        self._lock = threading.Lock()

    def try_consume(self) -> bool:
        """Returns True (and decrements budget) if a call is still allowed."""
        with self._lock:
            if self._count >= self.budget:
                return False
            self._count += 1
            return True

    @property
    def remaining(self) -> int:
        with self._lock:
            return self.budget - self._count


def get_ai_budget() -> int:
    return int(os.environ.get("LOADTEST_AI_BUDGET", "8"))
