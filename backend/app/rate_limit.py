"""Shared slowapi Limiter instance.

Lives in its own module (rather than main.py or a route file) so both
main.py (to register it on the app) and individual routers (to decorate
endpoints with @limiter.limit(...)) can import it without a circular import.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
