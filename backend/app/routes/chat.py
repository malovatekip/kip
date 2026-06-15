from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.schemas import ChatMessage, ChatResponse, ConversationOut
from app.security import get_current_user
from app.services.kip_engine import generate_kip_response
from app.routes.language_support import get_language_from_request

router = APIRouter()


@router.post("/send", response_model=ChatResponse)
async def send_message(
    payload: ChatMessage,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lang = get_language_from_request(request)
    # Get or create conversation
    if payload.conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found.")
    else:
        title = payload.message[:60] + "..." if len(payload.message) > 60 else payload.message
        conv  = Conversation(user_id=current_user.id, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Save user message
    user_msg = Message(conversation_id=conv.id, role="user", content=payload.message)
    db.add(user_msg)
    db.commit()

    # Load recent history
    history = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.id.desc()).limit(12).all()
    history = list(reversed(history))

    # Call K-BIG-1
    reply, idea_detected = await generate_kip_response(
        user_message=payload.message,
        history=history[:-1],
        user=current_user,
        db=db,
        lang=lang
    )

    # Save KIP reply
    kip_msg = Message(conversation_id=conv.id, role="assistant", content=reply)
    db.add(kip_msg)

    # Update conversation timestamp so it sorts to top
    conv.updated_at = datetime.utcnow()
    db.commit()

    return ChatResponse(
        conversation_id=conv.id,
        reply=reply,
        idea_saved=idea_detected
    )


@router.get("/conversations", response_model=List[ConversationOut])
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Conversations sorted most recent first."""
    return db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()


@router.get("/conversations/{conv_id}", response_model=ConversationOut)
def get_conversation(
    conv_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id,
        Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv
