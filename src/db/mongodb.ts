import { MongoClient, Db, Collection, Document } from 'mongodb';
import { config } from '../config';
import { DiscoveryProject, RelevanceCache } from './schemas';

class MongoDB {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(config.MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db(config.MONGODB_DATABASE);
      
      console.log(`✅ Connected to MongoDB (database: ${config.MONGODB_DATABASE})`);
      
      // Create indexes
      await this.createIndexes();
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    const projectsCollection = this.db.collection<DiscoveryProject>('discovery_projects');
    const cacheCollection = this.db.collection<RelevanceCache>('relevance_cache');

    // Discovery projects indexes
    await projectsCollection.createIndex({ project_id: 1 });
    await projectsCollection.createIndex({ 'sources.url': 1 });
    await projectsCollection.createIndex({ 'sources.status': 1 });
    await projectsCollection.createIndex({ 'discovery_chain.discovery_date': -1 });

    // Relevance cache indexes
    await cacheCollection.createIndex({ url: 1 }, { unique: true });
    await cacheCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    console.log('✅ MongoDB indexes created');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('👋 Disconnected from MongoDB');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.db;
  }

  getCollection<T extends Document = Document>(name: string): Collection<T> {
    return this.getDb().collection<T>(name);
  }

  get discoveryProjects(): Collection<DiscoveryProject> {
    return this.getCollection<DiscoveryProject>('discovery_projects');
  }

  get relevanceCache(): Collection<RelevanceCache> {
    return this.getCollection<RelevanceCache>('relevance_cache');
  }
}

export const mongodb = new MongoDB();
