"""
MongoDB Connection Manager
==========================
Handles MongoDB connections, collections, and indexes for the discovery pipeline.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from typing import Optional

from ..config import config


class MongoDB:
    """MongoDB connection manager using Motor for async operations."""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None

    async def connect(self) -> None:
        """Connect to MongoDB."""
        try:
            self.client = AsyncIOMotorClient(config.mongodb_uri)
            self.db = self.client[config.mongodb_database]

            # Test connection
            await self.client.admin.command("ping")
            print(f"Connected to MongoDB (database: {config.mongodb_database})")

            # Create indexes
            await self._create_indexes()
        except Exception as e:
            print(f"MongoDB connection error: {e}")
            raise

    async def _create_indexes(self) -> None:
        """Create database indexes."""
        if self.db is None:
            return

        # Discovery projects indexes
        projects = self.db["discovery_projects"]
        await projects.create_index("project_id")
        await projects.create_index("sources.url")
        await projects.create_index("sources.status")
        await projects.create_index([("discovery_chain.discovery_date", -1)])

        # Relevance cache indexes
        cache = self.db["relevance_cache"]
        await cache.create_index("url", unique=True)
        await cache.create_index("expires_at", expireAfterSeconds=0)

        print("MongoDB indexes created")

    async def disconnect(self) -> None:
        """Disconnect from MongoDB."""
        if self.client:
            self.client.close()
            print("Disconnected from MongoDB")

    def get_db(self) -> AsyncIOMotorDatabase:
        """Get the database instance."""
        if self.db is None:
            raise RuntimeError("Database not initialized. Call connect() first.")
        return self.db

    def get_collection(self, name: str) -> AsyncIOMotorCollection:
        """Get a collection by name."""
        return self.get_db()[name]

    @property
    def discovery_projects(self) -> AsyncIOMotorCollection:
        """Get the discovery_projects collection."""
        return self.get_collection("discovery_projects")

    @property
    def relevance_cache(self) -> AsyncIOMotorCollection:
        """Get the relevance_cache collection."""
        return self.get_collection("relevance_cache")

    @property
    def kaggle_datasets(self) -> AsyncIOMotorCollection:
        """Get the kaggle_datasets collection for vector search."""
        return self.get_collection("kaggle_datasets")


# Global MongoDB instance
mongodb = MongoDB()
