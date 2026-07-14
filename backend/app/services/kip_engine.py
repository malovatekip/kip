"""
K-BIG-1 — KIP Business Idea Generation Engine
Web search tool enabled — KIP can now fetch live data from the internet
when the user asks about things not in the knowledge base.
"""

import os
import re
from typing import Tuple
import anthropic

from app.services.kip_prompt import build_system_prompt
from app.services.knowledge_base import get_knowledge_base
from app.data.town_profiles import get_town_profile
from app.services.map_service import get_map_context
from app.routes.language_support import language_instruction


# ── Strict idea detection ──────────────────────────────────────────────────
IDEA_HEADER = "## 🏢 KIP BUSINESS RECOMMENDATION"

IDEA_VERIFICATION_KEYWORDS = [
    "capital breakdown",
    "💰",
    "total required",
    "monthly net profit",
    "financial projection",
    "break-even",
]


def is_business_idea(text: str) -> bool:
    if not text or len(text) < 400:
        return False
    if IDEA_HEADER.lower() not in text.lower():
        return False
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in IDEA_VERIFICATION_KEYWORDS)


def _extract_idea_name(reply: str) -> str:
    lines = reply.split('\n')
    header_idx = None
    for i, line in enumerate(lines):
        if IDEA_HEADER.lower() in line.lower():
            header_idx = i
            break
    if header_idx is None:
        return ""
    for i in range(header_idx + 1, min(header_idx + 6, len(lines))):
        line = lines[i].strip()
        if not line or line.startswith('---') or line.startswith('#'):
            continue
        line = re.sub(r'\*+', '', line).strip()
        if len(line) < 5:
            continue
        name = re.split(r'\s*[—–]\s*|\s+-\s+', line)[0].strip()
        name = re.sub(r'[#*`_>]', '', name).strip()
        if 4 < len(name) < 120 and name.lower() not in (
            'kip business recommendation', 'business recommendation',
            'recommendation', 'here is', 'based on'
        ):
            print(f"[KIP] Extracted idea name: '{name}'")
            return name
    return ""


def _extract_location(text: str) -> str:
    try:
        from app.data.town_coordinates import TOWN_COORDS
        text_lower = text.lower()
        matches = sorted(
            [key for key in TOWN_COORDS if key in text_lower],
            key=len, reverse=True
        )
        return matches[0] if matches else ""
    except Exception:
        return ""


def _extract_capital(text: str):
    match = re.search(r'[Kk]\s*([\d,]+(?:\.\d+)?)', text)
    if match:
        try:
            return float(match.group(1).replace(',', ''))
        except ValueError:
            pass
    return None


def _extract_factors(messages: list, user_message: str) -> dict:
    full_text = user_message
    for m in messages[-6:]:
        if hasattr(m, 'content'):
            full_text += " " + m.content
    return {
        "location": _extract_location(full_text),
        "capital":  _extract_capital(user_message),
    }


def _extract_text_from_response(response) -> str:
    """
    Extract final text from a Claude response that may include
    tool use blocks (web search results).
    Concatenates all text blocks in order.
    """
    text_parts = []
    for block in response.content:
        if hasattr(block, 'type'):
            if block.type == 'text':
                text_parts.append(block.text)
    return "\n".join(text_parts).strip()


async def generate_kip_response(
    user_message: str,
    history: list,
    user,
    db=None,
    lang: str = "en"
) -> Tuple[str, bool]:
    """
    The K-BIG-1 engine with web search enabled.

    KIP will automatically search the internet when:
    - Asked about current government officials or positions
    - Asked about live exchange rates or commodity prices
    - Asked about recent policy changes or news
    - Asked about anything not in its training or knowledge base

    Returns: (reply_text, idea_was_detected)
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")

    if not api_key or api_key == "your-anthropic-api-key-here":
        return (
            f"Hello {user.full_name.split()[0]}! I'm KIP — your AI business intelligence advisor.\n\n"
            "Set your `ANTHROPIC_API_KEY` in `backend/.env` and restart to activate K-BIG-1.\n\n"
            f"You asked: *{user_message}*",
            False
        )

    factors = _extract_factors(history, user_message)

    # Retrieve knowledge from ChromaDB
    kb = get_knowledge_base()
    retrieved_knowledge = kb.search(user_message, top_k=4)

    # Location context
    town_profile = ""
    map_context  = ""
    if factors["location"]:
        town_profile = get_town_profile(factors["location"])
        map_context  = get_map_context(factors["location"])
    combined_location = "\n\n".join(filter(None, [town_profile, map_context]))

    # Previous ideas (so KIP doesn't repeat)
    idea_history = ""
    if db:
        try:
            from app.models.business_idea import BusinessIdea
            past = db.query(BusinessIdea).filter(
                BusinessIdea.user_id == user.id
            ).order_by(BusinessIdea.created_at.desc()).limit(10).all()
            if past:
                idea_history = "Previously generated ideas (do NOT repeat):\n"
                for idea in past:
                    idea_history += f"  • {idea.idea_name} ({idea.location or 'no location'})\n"
        except Exception:
            pass

    system_prompt = build_system_prompt(
        retrieved_knowledge=retrieved_knowledge,
        town_profile=combined_location,
        user_idea_history=idea_history
    ) + language_instruction(lang)

    # Build message list
    messages = []
    for msg in history[-12:]:
        if hasattr(msg, 'role') and hasattr(msg, 'content'):
            messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_message})

    # ── Web search tool definition ────────────────────────────────────────
    tools = [
        {
            "type": "web_search_20250305",
            "name": "web_search",
        }
    ]

    client = anthropic.Anthropic(api_key=api_key)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=system_prompt,
            tools=tools,
            messages=messages
        )
    except anthropic.BadRequestError as e:
        # Web search tool not available on this account tier — fall back gracefully
        if "web_search" in str(e).lower() or "tool" in str(e).lower():
            print(f"[KIP] Web search not available, falling back: {e}")
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=system_prompt,
                messages=messages
            )
        else:
            raise

    # Extract the final text reply (works whether or not web search was used)
    reply = _extract_text_from_response(response)

    # If stop_reason is tool_use, Claude used web search and we need to
    # handle the tool result loop. The SDK handles this automatically when
    # using the streaming API, but for the standard API we check if the
    # response already contains the final text after search.
    if response.stop_reason == "tool_use" and not reply:
        # Build the tool result and continue the conversation
        tool_results = []
        for block in response.content:
            if hasattr(block, 'type') and block.type == "tool_use":
                # The web search tool returns results automatically —
                # we just pass the response back as an assistant message
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": "Search completed."
                })

        if tool_results:
            # Continue conversation with tool results
            messages_with_tool = messages + [
                {"role": "assistant", "content": response.content},
                {"role": "user",      "content": tool_results},
            ]
            followup = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=system_prompt,
                tools=tools,
                messages=messages_with_tool
            )
            reply = _extract_text_from_response(followup)

    # Final fallback
    if not reply:
        reply = "I wasn't able to retrieve a response. Please try again."

    # Detect and save idea
    idea_detected = is_business_idea(reply)
    if idea_detected and db:
        try:
            _save_idea(reply, user_message, user, factors, db)
        except Exception as e:
            print(f"[KIP] Save error: {e}")

    return reply, idea_detected


def _save_idea(reply: str, user_message: str, user, factors: dict, db):
    from app.models.business_idea import BusinessIdea
    from sqlalchemy import inspect as sa_inspect

    idea_name = _extract_idea_name(reply)
    if not idea_name:
        header_pos = reply.lower().find(IDEA_HEADER.lower())
        if header_pos >= 0:
            snippet = reply[header_pos:header_pos + 300]
            bold_match = re.search(r'\*\*([^*]+)\*\*', snippet)
            if bold_match:
                idea_name = bold_match.group(1).strip()[:100]
    if not idea_name:
        idea_name = f"Business Idea {user.id}"

    existing = db.query(BusinessIdea).filter(
        BusinessIdea.user_id == user.id,
        BusinessIdea.idea_name == idea_name
    ).first()
    if existing:
        print(f"[KIP] Duplicate skipped: '{idea_name}'")
        return

    try:
        mapper  = sa_inspect(BusinessIdea)
        db_cols = {col.key for col in mapper.attrs}
    except Exception:
        db_cols = set()

    capital = factors.get("capital") or _extract_capital(user_message)
    summary = reply[:500] + "..." if len(reply) > 500 else reply

    kwargs = {
        "user_id":   user.id,
        "idea_name": idea_name,
        "location":  factors.get("location", "") or "",
    }
    optional = {
        "idea_summary":     summary,
        "capital_amount":   capital,
        "full_response":    reply,
        "generated_by_kip": True,
        "accepted":         None,
    }
    for col, val in optional.items():
        if col in db_cols:
            kwargs[col] = val

    idea = BusinessIdea(**kwargs)
    db.add(idea)
    db.commit()
    print(f"[KIP] ✓ Saved idea: '{idea_name}'")
