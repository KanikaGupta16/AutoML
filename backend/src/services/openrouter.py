"""
OpenRouter Service
==================
Handles LLM interactions via OpenRouter API for:
- Intent parsing
- Relevance scoring
- Schema detection
- Architecture selection
"""

import json
import httpx
from dataclasses import dataclass
from typing import Optional

from ..config import config


@dataclass
class ChatResponse:
    """Chat response from the AI."""
    message: str
    suggestions: list[str]
    should_start_discovery: bool = False
    task_description: str = ""


@dataclass
class ParsedIntent:
    """Parsed user intent."""
    target_variable: str
    feature_requirements: list[str]
    search_queries: list[str]


@dataclass
class RelevanceScoreResult:
    """Relevance scoring result."""
    relevance_score: int
    source_type: str


@dataclass
class SchemaDetectionResult:
    """Schema detection result."""
    features_found: list[str]
    quality_rating: Optional[int] = None


class OpenRouterService:
    """Service for interacting with OpenRouter API."""

    def __init__(self):
        self.base_url = "https://openrouter.ai/api/v1"
        self.headers = {
            "Authorization": f"Bearer {config.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": config.base_url,
            "X-Title": "AutoML Discovery Pipeline",
        }

    async def _chat_completion(self, model: str, messages: list[dict], json_response: bool = True) -> str:
        """Make a chat completion request."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            payload = {
                "model": model,
                "messages": messages,
            }
            if json_response:
                payload["response_format"] = {"type": "json_object"}

            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            )

            # Log response status for debugging
            if response.status_code != 200:
                print(f"OpenRouter error {response.status_code}: {response.text[:500]}")
                response.raise_for_status()

            data = response.json()

            # Check for API errors in response
            if "error" in data:
                error_msg = data["error"].get("message", str(data["error"]))
                raise RuntimeError(f"OpenRouter API error: {error_msg}")

            # Validate response structure
            if "choices" not in data or not data["choices"]:
                print(f"OpenRouter unexpected response: {data}")
                raise RuntimeError("No choices in OpenRouter response")

            content = data["choices"][0]["message"]["content"]
            if not content:
                raise RuntimeError("Empty content in OpenRouter response")

            return content

    async def chat(self, user_message: str, conversation_history: list[dict] = None) -> ChatResponse:
        """Have a conversation about ML tasks and data needs."""
        system_prompt = """You are an AutoML assistant helping users build machine learning models. Your job is to:
1. Understand what the user wants to predict or classify
2. Ask clarifying questions if needed
3. Guide them toward starting the data discovery process

Keep responses SHORT (1-2 sentences). Be conversational and helpful.

Return ONLY valid JSON:
{
  "message": "your response to the user",
  "suggestions": ["2-4 quick action buttons for the user"],
  "should_start_discovery": true/false,
  "task_description": "if should_start_discovery is true, describe the ML task clearly"
}

Set should_start_discovery to true when:
- User explicitly says "start", "find data", "search", "connect", "let's go", "begin"
- User has clearly described what they want to predict AND wants to proceed

Suggestion examples: "Find datasets", "Start discovery", "Tell me more", "Image classification", "Text analysis"
"""

        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": user_message})

        try:
            content = await self._chat_completion(
                model=config.openrouter_model_intent,
                messages=messages,
            )

            parsed = json.loads(content)
            return ChatResponse(
                message=parsed.get("message", "I understand. How can I help you build your model?"),
                suggestions=parsed.get("suggestions", ["Find datasets", "Tell me more"]),
                should_start_discovery=parsed.get("should_start_discovery", False),
                task_description=parsed.get("task_description", ""),
            )
        except Exception as e:
            print(f"OpenRouter chat error: {e}")
            # Return a fallback response
            return ChatResponse(
                message="I understand! Let me help you set up the right ML pipeline for this.",
                suggestions=["Find datasets", "Start discovery", "Configure"],
                should_start_discovery=False,
                task_description="",
            )

    async def parse_intent(self, user_prompt: str) -> ParsedIntent:
        """Parse user intent to extract target variable, features, and search queries."""
        system_prompt = """You are an expert data discovery assistant. Extract structured information from the user's request.

Return ONLY valid JSON with this exact structure:
{
  "target_variable": "what the user wants to predict/analyze",
  "feature_requirements": ["list", "of", "required", "data", "points"],
  "search_queries": ["3-5", "specific", "search", "queries", "to", "find", "this", "data"]
}

Generate search queries that target:
- Government APIs and datasets
- Academic/research databases
- Open data portals
- Kaggle datasets
- GitHub repositories with relevant data

Be specific and use terms like "API", "dataset", "CSV", "open data" in queries."""

        try:
            content = await self._chat_completion(
                model=config.openrouter_model_intent,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )

            parsed = json.loads(content)
            return ParsedIntent(
                target_variable=parsed.get("target_variable", ""),
                feature_requirements=parsed.get("feature_requirements", []),
                search_queries=parsed.get("search_queries", []),
            )
        except Exception as e:
            print(f"OpenRouter parseIntent error: {e}")
            raise RuntimeError(f"Failed to parse intent: {e}")

    async def score_relevance(
        self,
        target: str,
        features: list[str],
        title: str,
        snippet: str,
    ) -> RelevanceScoreResult:
        """Score the relevance of a discovered URL."""
        system_prompt = f"""You are a data source evaluator. Rate how relevant this source is for the user's data needs.

User needs:
- Target: {target}
- Required features: {', '.join(features)}

Return ONLY valid JSON:
{{
  "relevance_score": <number 0-100>,
  "source_type": "<API|Dataset|Article|Irrelevant>"
}}

Score guidelines:
- 90-100: Perfect match with target and features
- 70-89: Good match, has most required data
- 40-69: Partial match, missing some features
- 0-39: Poor match or irrelevant"""

        try:
            content = await self._chat_completion(
                model=config.openrouter_model_score,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Title: {title}\n\nSnippet: {snippet[:1000]}"},
                ],
            )

            parsed = json.loads(content)
            return RelevanceScoreResult(
                relevance_score=parsed.get("relevance_score", 0),
                source_type=parsed.get("source_type", "Irrelevant"),
            )
        except Exception as e:
            print(f"OpenRouter scoreRelevance error: {e}")
            raise RuntimeError(f"Failed to score relevance: {e}")

    async def detect_schema(
        self,
        target: str,
        features: list[str],
        scraped_sample: str,
    ) -> SchemaDetectionResult:
        """Detect schema and features from scraped data sample."""
        system_prompt = f"""You are a data schema analyzer. Determine if this scraped content contains the required features.

User needs:
- Target: {target}
- Required features: {', '.join(features)}

Analyze the sample and return ONLY valid JSON:
{{
  "features_found": ["list", "of", "matching", "features"],
  "quality_rating": <number 0-100>
}}

Quality rating guidelines:
- 90-100: Complete, clean, well-structured data
- 70-89: Good data with minor issues
- 40-69: Usable but requires significant cleaning
- 0-39: Poor quality or incomplete"""

        try:
            content = await self._chat_completion(
                model=config.openrouter_model_score,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Analyze this data sample:\n\n{scraped_sample[:2000]}"},
                ],
            )

            parsed = json.loads(content)
            return SchemaDetectionResult(
                features_found=parsed.get("features_found", []),
                quality_rating=parsed.get("quality_rating"),
            )
        except Exception as e:
            print(f"OpenRouter detectSchema error: {e}")
            raise RuntimeError(f"Failed to detect schema: {e}")


# Global service instance
openrouter_service = OpenRouterService()
