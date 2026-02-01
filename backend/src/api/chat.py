"""
Chat API Routes
===============
Endpoint for AI-powered conversation about ML tasks.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.openrouter import openrouter_service


router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatMessage(BaseModel):
    """A single chat message."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request for chat endpoint."""
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    message: str
    suggestions: list[str]
    should_start_discovery: bool
    task_description: str


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Have a conversation with the AI assistant about ML tasks."""
    try:
        # Convert history to the format expected by OpenRouter
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.history
        ]

        response = await openrouter_service.chat(
            user_message=request.message,
            conversation_history=conversation_history,
        )

        return ChatResponse(
            message=response.message,
            suggestions=response.suggestions,
            should_start_discovery=response.should_start_discovery,
            task_description=response.task_description,
        )
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
