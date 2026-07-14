from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.startup_chat import StartupConversation, StartupMessage
from app.schemas import StartupChatMessage, StartupChatResponse, StartupConversationOut
from app.security import get_current_user
from app.services.kip_engine import generate_kip_response
from app.routes.language_support import get_language_from_request

router = APIRouter()


@router.post("/send", response_model=StartupChatResponse)
async def send_startup_message(
    payload: StartupChatMessage,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lang = get_language_from_request(request)

    if payload.conversation_id:
        conv = db.query(StartupConversation).filter(
            StartupConversation.id == payload.conversation_id,
            StartupConversation.user_id == current_user.id
        ).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found.")
    else:
        title = payload.message[:60] + "..." if len(payload.message) > 60 else payload.message
        conv  = StartupConversation(user_id=current_user.id, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Save user message
    db.add(StartupMessage(conversation_id=conv.id, role="user", content=payload.message))
    db.commit()

    # Load recent history
    history = db.query(StartupMessage).filter(
        StartupMessage.conversation_id == conv.id
    ).order_by(StartupMessage.id.desc()).limit(12).all()
    history = list(reversed(history))

    # Seed the step context (registration step details) ahead of the question,
    # same way it's on the first message only — the frontend only sends it once.
    engine_message = payload.message
    if payload.step_context:
        engine_message = f"{payload.step_context}\n\nFounder's question: {payload.message}"

    reply, _ = await generate_kip_response(
        user_message=engine_message,
        history=history[:-1],
        user=current_user,
        db=db,
        lang=lang
    )

    # Save KIP reply
    db.add(StartupMessage(conversation_id=conv.id, role="assistant", content=reply))

    conv.updated_at = datetime.utcnow()
    db.commit()

    return StartupChatResponse(conversation_id=conv.id, reply=reply)


@router.get("/conversations", response_model=List[StartupConversationOut])
def get_startup_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Conversations sorted most recent first."""
    return db.query(StartupConversation).filter(
        StartupConversation.user_id == current_user.id
    ).order_by(StartupConversation.updated_at.desc()).all()


@router.get("/conversations/{conv_id}", response_model=StartupConversationOut)
def get_startup_conversation(
    conv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(StartupConversation).filter(
        StartupConversation.id == conv_id,
        StartupConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv


@router.delete("/conversations/{conv_id}")
def delete_startup_conversation(
    conv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(StartupConversation).filter(
        StartupConversation.id == conv_id,
        StartupConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    db.delete(conv)
    db.commit()
    return {"status": "deleted"}
