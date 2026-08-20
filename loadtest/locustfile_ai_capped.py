"""
KIP load test — AI-backed endpoints, HARD-CAPPED volume.

These endpoints call the real Anthropic API per request and cost real
money, so this file intentionally does NOT scale with concurrency. A
shared, lock-guarded counter (AiCallBudget) enforces a total call ceiling
across all virtual users combined regardless of --users; once exhausted a
VU stops itself. Defense in depth: small --users, long wait_time, short
--run-time, AND the hard counter.

Only endpoints usable by a fresh seeded user with no pre-existing data are
included. Two other AI-backed endpoints found during planning —
POST /api/business-chat/chat and POST /api/logs/submit — both require an
existing business plan_id that seeded users don't have (creating one is
itself a multi-step AI-generated flow), so they're out of scope here to
keep this file simple; add them later against users seeded with a plan if
you want to also exercise that path.

Run with (PowerShell):
    $env:LOADTEST_AI_BUDGET = 8
    loadtest\\venv\\Scripts\\locust -f loadtest\\locustfile_ai_capped.py --headless ^
      --users 3 --spawn-rate 1 --run-time 90s --host http://localhost:8000 ^
      --csv loadtest\\results\\ai
"""
from locust import HttpUser, task, between
from locust.exception import StopUser

from common import TokenPool, AiCallBudget, get_ai_budget

_pool = TokenPool()
_budget = AiCallBudget(get_ai_budget())

_CHAT_MESSAGES = [
    "I have K3,000 and I'm in Kabwe. What business can I start?",
    "What's the best way to price my products against competitors?",
    "How do I register my business with PACRA?",
]

_STARTUP_MESSAGES = [
    "What business structure should I choose in Zambia?",
    "How long does PACRA registration take?",
    "Do I need to register for VAT as a new business?",
]

_CAPITAL_MATCH_PAYLOADS = [
    {
        "business_name": "Load Test Grocery",
        "business_sector": "retail",
        "location": "Lusaka",
        "capital_needed": 20000,
        "months_operating": 3,
        "purpose": "Stock purchase",
    },
    {
        "business_name": "Load Test Salon",
        "business_sector": "services",
        "location": "Ndola",
        "capital_needed": 15000,
        "months_operating": 6,
        "purpose": "Equipment",
    },
]


class KipAiUser(HttpUser):
    wait_time = between(15, 30)

    def on_start(self):
        self.token = _pool.next_token()
        self.headers = {"Authorization": f"Bearer {self.token}", "X-KIP-Language": "en"}
        print(f"[ai-capped] budget remaining: {_budget.remaining}/{_budget.budget}")

    def _spend_or_stop(self):
        if not _budget.try_consume():
            print("[ai-capped] AI call budget exhausted — stopping this virtual user.")
            raise StopUser()

    @task(1)
    def chat_send(self):
        self._spend_or_stop()
        import random
        self.client.post(
            "/api/chat/send",
            json={"message": random.choice(_CHAT_MESSAGES)},
            headers=self.headers,
            name="/api/chat/send [AI]",
        )

    @task(1)
    def startup_chat_send(self):
        self._spend_or_stop()
        import random
        self.client.post(
            "/api/startup-chat/send",
            json={"message": random.choice(_STARTUP_MESSAGES)},
            headers=self.headers,
            name="/api/startup-chat/send [AI]",
        )

    @task(1)
    def capital_match(self):
        self._spend_or_stop()
        import random
        self.client.post(
            "/api/capital/match",
            json=random.choice(_CAPITAL_MATCH_PAYLOADS),
            headers=self.headers,
            name="/api/capital/match [AI]",
        )
