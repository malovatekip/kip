"""
KIP load test — main (non-AI) endpoints, full concurrency.

Run with:
    loadtest\\venv\\Scripts\\locust -f loadtest\\locustfile_main.py --headless ^
      --users 50 --spawn-rate 1 --run-time 7m --host http://localhost:8000 ^
      --csv loadtest\\results\\main --html loadtest\\results\\main_report.html

Deliberately never calls:
  - POST /api/auth/register or /api/auth/login  (shared-IP rate limiter —
    see common.py / seed_users.py, which mint tokens directly instead)
  - POST /api/capital/match or POST /api/logs/submit  (these look like
    plain CRUD but actually call the real Anthropic API — see
    locustfile_ai_capped.py, which handles AI endpoints under a hard cap)
"""
import random

from locust import HttpUser, task, between

from common import TokenPool

_pool = TokenPool()


class KipAppUser(HttpUser):
    wait_time = between(2, 6)

    def on_start(self):
        self.token = _pool.next_token()
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def _headers(self):
        # Also exercise the language toggle under load — most requests
        # English, some Bemba, mirroring a mixed user base.
        h = dict(self.headers)
        h["X-KIP-Language"] = "bem" if random.random() < 0.3 else "en"
        return h

    @task(10)
    def dashboard(self):
        h = self._headers()
        self.client.get("/api/dashboard/stats", headers=h, name="/api/dashboard/stats")
        self.client.get("/api/dashboard/recent-ideas", headers=h, name="/api/dashboard/recent-ideas")
        self.client.get("/api/dashboard/score", headers=h, name="/api/dashboard/score")

    @task(8)
    def ideas_list(self):
        self.client.get("/api/ideas/", headers=self._headers(), name="/api/ideas/")

    @task(6)
    def news(self):
        h = self._headers()
        self.client.get("/api/news/articles", headers=h, name="/api/news/articles")
        self.client.get("/api/news/rates", headers=h, name="/api/news/rates")
        self.client.get("/api/news/alerts/count", headers=h, name="/api/news/alerts/count")

    @task(5)
    def market_intelligence(self):
        self.client.get("/api/templates/market-intelligence", headers=self._headers(),
                         name="/api/templates/market-intelligence")

    @task(4)
    def templates_list(self):
        self.client.get("/api/templates/list", headers=self._headers(), name="/api/templates/list")

    @task(3)
    def capital_static(self):
        h = self._headers()
        self.client.get("/api/capital/sources", headers=h, name="/api/capital/sources")
        self.client.get("/api/capital/letter-types", headers=h, name="/api/capital/letter-types")

    @task(3)
    def enterprise(self):
        h = self._headers()
        self.client.get("/api/enterprise/my-enterprises", headers=h, name="/api/enterprise/my-enterprises")
        self.client.get("/api/enterprise/notifications", headers=h, name="/api/enterprise/notifications")

    @task(2)
    def profile(self):
        self.client.get("/api/auth/me", headers=self._headers(), name="/api/auth/me")
