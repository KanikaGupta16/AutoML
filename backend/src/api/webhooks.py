"""
Webhook Routes
==============
Handle webhooks from external services (Firecrawl, etc.)
"""

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from ..config import config


router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class WebhookResponse(BaseModel):
    """Standard webhook response."""
    success: bool
    message: str


@router.post("/firecrawl", response_model=WebhookResponse)
async def firecrawl_webhook(request: Request):
    """Handle Firecrawl webhook callbacks."""
    try:
        # Verify webhook signature if configured
        if config.firecrawl_webhook_secret:
            signature = request.headers.get("x-firecrawl-signature")
            if not signature:
                print("Webhook received without signature")
                # For now, just warn - in production you'd reject

        payload = await request.json()
        print(f"Firecrawl webhook received: url={payload.get('url')}, status={payload.get('status')}")

        # The validation job handles scraping synchronously now
        # This webhook is for async notifications if needed

        return WebhookResponse(
            success=True,
            message="Webhook received",
        )
    except Exception as e:
        print(f"Error processing Firecrawl webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))
