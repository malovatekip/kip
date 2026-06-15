"""
KIP Language Support
Shared helper for adding Bemba language instructions to Claude prompts
across K-BIG-1 chat, BizSim, and KIP Learn.

Usage:
    from app.routes.language_support import get_language_from_request, language_instruction

    @router.post("/some-ai-endpoint")
    async def my_endpoint(request: Request, ...):
        lang = get_language_from_request(request)
        system_prompt = base_prompt + language_instruction(lang)
"""
from fastapi import Request


SUPPORTED_LANGUAGES = {"en", "bem"}


def get_language_from_request(request: Request) -> str:
    """
    Reads the X-KIP-Language header sent by the frontend.
    Defaults to English if missing or unrecognised.
    """
    lang = (request.headers.get("X-KIP-Language") or "en").lower().strip()
    return lang if lang in SUPPORTED_LANGUAGES else "en"


def language_instruction(lang: str) -> str:
    """
    Returns a string to append to any Claude system prompt.
    Empty string for English (no change to existing behaviour).
    """
    if lang != "bem":
        return ""

    return (
        "\n\nIMPORTANT LANGUAGE INSTRUCTION: Respond in Bemba, the way Zambians "
        "naturally speak in everyday conversation — mixing Bemba with English "
        "business and financial terms (this is normal code-switching, not a mistake). "
        "For example: 'Mukwai, umutengo wa K85 e tubomfya bwino bwino pa stock yenu, "
        "lelo kwena pa profit, mwingafwaya ukulundako fye small.' "
        "Keep all numbers, prices (K for Kwacha), and amounts exactly as they "
        "would appear in English. Keep the same meaning, structure, and level "
        "of detail as you would in English — just express it naturally in "
        "Bemba-English. Do not translate word-for-word; speak as a real "
        "Zambian business person, supplier, or customer would."
    )


def get_language_label(lang: str) -> str:
    """Human-readable label for a language code."""
    return {"en": "English", "bem": "Bemba"}.get(lang, "English")
