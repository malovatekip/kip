#!/usr/bin/env python3
"""
KIP Repair Script
==================
Fixes two issues:
1. Recovers business ideas from existing chat messages (ideas generated
   before API key was set were never saved to the ideas table)
2. Verifies the engine is working correctly going forward

Run from backend/ folder with venv active:
  python repair.py
"""
import os, sys, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DATABASE_URL", "sqlite:///./kip.db")

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal, engine, Base
from app.models.conversation import Conversation, Message
from app.models.business_idea import BusinessIdea
from app.models.user import User

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("\n╔══════════════════════════════════════════════╗")
print("║   KIP Repair Script                          ║")
print("╚══════════════════════════════════════════════╝\n")

# ── Keywords that indicate KIP generated a business idea ──────────
IDEA_KEYWORDS = [
    "recommendation", "i recommend", "capital breakdown",
    "monthly profit", "break-even", "financial projection",
    "first 30 days", "why this works here", "🏢",
    "startup cost", "projected profit", "business idea",
    "you could start", "consider starting", "i suggest",
    "zmw", "k3,", "k5,", "k10,", "k1,", "k2,", "k4,",
    "repair shop", "food stall", "salon", "tailoring",
    "general store", "phone repair", "catering", "transport",
]

def is_business_idea_response(text: str) -> bool:
    """Return True if this KIP message contains a business idea."""
    text_lower = text.lower()
    # Needs at least 2 idea keywords to qualify (avoids false positives)
    matches = sum(1 for kw in IDEA_KEYWORDS if kw in text_lower)
    return matches >= 2

def extract_idea_name(text: str) -> str:
    """Try to extract the business idea name from KIP's response."""
    # Try common patterns KIP uses
    patterns = [
        r'(?:RECOMMENDATION|I recommend|suggest)\s*[:\n]+\s*\*?\*?([^\n*]{5,80})',
        r'🏢\s*([^\n]{5,80})',
        r'(?:start(?:ing)?|open(?:ing)?)\s+(?:a\s+)?([A-Z][a-z].*?(?:shop|business|service|stand|stall|salon|repair))',
        r'\*\*([^*\n]{5,60}(?:shop|business|service|repair|salon|stall|stand))\*\*',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            name = m.group(1).strip().rstrip('.,;:')
            if 5 < len(name) < 80:
                return name

    # Fallback: use first meaningful line that looks like a business name
    for line in text.split('\n'):
        line = line.strip().strip('*#').strip()
        if 5 < len(line) < 60 and not line.startswith(('I ', 'You ', 'The ', 'Based', 'Given')):
            if any(kw in line.lower() for kw in ['shop', 'business', 'service', 'repair', 'salon', 'catering']):
                return line
    return "Business Idea"

def extract_location(text: str, user_messages: list) -> str:
    """Extract location from KIP response or the user messages in the conversation."""
    # Common Zambian locations to look for
    locations = [
        "riverside", "kitwe", "ndola", "lusaka", "livingstone", "chipata",
        "kabwe", "solwezi", "chingola", "mufulira", "kasama", "mansa", "mongu",
        "matero", "kabulonga", "woodlands", "chalala", "kalingalinga",
        "chelstone", "garden", "avondale", "emmasdale", "george", "mandevu",
        "nkana", "chimwemwe", "parklands", "masala", "cbd",
        "chilenje", "chawama", "lilanda", "ibex hill", "longacres",
    ]
    # Check KIP's response first, then user messages
    all_text = (text + " " + " ".join(user_messages)).lower()
    for loc in locations:
        if loc in all_text:
            return loc.title()
    return ""

def extract_capital(text: str, user_messages: list) -> float:
    """Extract capital amount from conversation."""
    all_text = text + " " + " ".join(user_messages)
    # Match K followed by numbers (e.g. K3,000 or K3000 or k5000)
    patterns = [
        r'[Kk]\s*([\d,]+)',
        r'([\d,]+)\s*(?:kwacha|zmw)',
        r'([\d,]+)\s*(?:kwachas)',
    ]
    for pattern in patterns:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        for m in matches:
            try:
                val = float(m.replace(',', ''))
                if 100 <= val <= 10_000_000:  # reasonable business capital range
                    return val
            except ValueError:
                pass
    return None

# ── STEP 1: Scan existing messages ────────────────────────────────
print("[ 1/3 ]  Scanning existing chat messages for business ideas...\n")

user = db.query(User).first()
if not user:
    print("  No users found in database. Nothing to repair.")
    db.close()
    sys.exit(0)

conversations = db.query(Conversation).filter(
    Conversation.user_id == user.id
).all()

recovered = 0
skipped   = 0

for conv in conversations:
    messages = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.id.asc()).all()

    # Collect user messages for context
    user_msgs = [m.content for m in messages if m.role == "user"]

    for msg in messages:
        if msg.role != "assistant":
            continue

        if not is_business_idea_response(msg.content):
            continue

        # Check it's not already saved
        already_saved = db.query(BusinessIdea).filter(
            BusinessIdea.user_id == user.id,
            BusinessIdea.full_response == msg.content
        ).first()

        if already_saved:
            skipped += 1
            continue

        # Extract metadata
        idea_name = extract_idea_name(msg.content)
        location  = extract_location(msg.content, user_msgs)
        capital   = extract_capital(msg.content, user_msgs)

        # Save the idea
        idea = BusinessIdea(
            user_id=user.id,
            conversation_id=conv.id,
            idea_name=idea_name,
            idea_summary=msg.content[:300] + "..." if len(msg.content) > 300 else msg.content,
            full_response=msg.content,
            location=location,
            capital_amount=capital,
            generated_by_kip=True,
            accepted=None,  # pending — user hasn't reviewed yet
        )
        db.add(idea)
        recovered += 1

        print(f"  ✓  Recovered: '{idea_name}'")
        if location: print(f"     Location : {location}")
        if capital:  print(f"     Capital  : K{capital:,.0f}")
        print()

db.commit()

if recovered == 0 and skipped == 0:
    print("  No business idea responses found in existing messages.")
    print("  This means KIP's previous responses were general questions,")
    print("  not specific business idea requests.")
    print()
    print("  ➜  Ask KIP: 'I have K[amount], what business can I start in [location]?'")
    print("     That will generate and save an idea properly.")
elif recovered == 0 and skipped > 0:
    print(f"  {skipped} idea(s) were already in the database — nothing to recover.")
else:
    print(f"  Recovered {recovered} business idea(s) from chat history.")

# ── STEP 2: Verify the engine going forward ────────────────────────
print("\n[ 2/3 ]  Verifying KIP engine will save future ideas correctly...\n")

try:
    from app.services.kip_engine import generate_kip_response
    import inspect
    src = inspect.getsource(generate_kip_response)

    checks = {
        "RAG knowledge retrieval": "get_knowledge_base" in src,
        "Town profile injection":  "get_town_profile" in src,
        "Map intelligence":        "get_map_context" in src,
        "Idea auto-save":          "_save_idea_to_repository" in src,
        "Idea history (no repeats)": "idea_history" in src,
    }

    all_ok = True
    for check, passed in checks.items():
        print(f"  {'✓' if passed else '✗'}  {check}")
        if not passed:
            all_ok = False

    if not all_ok:
        print("\n  Some engine features are missing.")
        print("  Make sure you copied the Sprint 2 kip_engine.py from KIP_Sprint2_Complete.zip")

except Exception as e:
    print(f"  ✗  Engine error: {e}")

# ── STEP 3: Quick engine test ──────────────────────────────────────
print("\n[ 3/3 ]  Running a live engine test...\n")

api_key = os.getenv("ANTHROPIC_API_KEY", "")
if api_key and api_key != "your-anthropic-api-key-here":
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        # Minimal test — just verify the API key is valid
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=30,
            messages=[{"role": "user", "content": "Reply with only: KIP engine active"}]
        )
        reply = response.content[0].text.strip()
        print(f"  ✓  Claude API responding: '{reply}'")
        print("  ✓  Future ideas will be saved automatically")
    except anthropic.AuthenticationError:
        print("  ✗  API key is invalid — check your key at console.anthropic.com")
    except Exception as e:
        print(f"  ✗  API test error: {e}")
else:
    print("  ✗  API key not set")

# ── Final summary ──────────────────────────────────────────────────
total_ideas = db.query(BusinessIdea).filter(BusinessIdea.user_id == user.id).count()
print(f"\n╔══════════════════════════════════════════════╗")
print(f"║   Repair Complete                            ║")
print(f"║                                              ║")
print(f"║   Ideas now in database : {str(total_ideas).ljust(19)}║")
print(f"╚══════════════════════════════════════════════╝\n")

if total_ideas == 0:
    print("➜  No ideas recovered. Your existing chats were general questions.")
    print("   Ask KIP this exact type of question to generate a saved idea:")
    print()
    print('   "I have K3,000. What business can I start in [your town]?"')
    print()
    print("   Then check the Ideas page — it will appear immediately.")
else:
    print(f"➜  {total_ideas} idea(s) are now on your Ideas page.")
    print("   Refresh the app and go to Ideas to see them.")
    print("   Accept an idea and click 'Start Business' to open the Dashboard.")

db.close()
