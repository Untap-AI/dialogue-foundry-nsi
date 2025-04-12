import NodeCache from 'node-cache'
import type { Database } from '../types/database'
import type { Index, RecordMetadata } from '@pinecone-database/pinecone'

// Define types for cache items
export type ChatType = Database['public']['Tables']['chats']['Row']
export type ChatConfigType = Database['public']['Tables']['chat_configs']['Row']

// Default TTL values in seconds
export const DEFAULT_TTL = {
  CHAT_CONFIG: 300, // 5 minutes
  CHAT: 60, // 1 minute
  PINECONE_INDEX: 1800 // 30 minutes
}

/**
 * CacheService - Centralized cache management for the application
 *
 * This service provides a single point of access for all caches:
 * - chatConfigCache: stores company-specific chat configurations (TTL: 5 minutes)
 * - chatCache: stores chat objects (TTL: 1 minute)
 * - pineconeIndexCache: stores Pinecone index instances (TTL: 30 minutes)
 *
 * Note: Caching is disabled in development and smokebox environments
 */
class CacheService {
  // Environment check
  private isCachingEnabled: boolean

  // Chat configuration cache (longer TTL since these rarely change)
  private chatConfigCache = new NodeCache({
    stdTTL: DEFAULT_TTL.CHAT_CONFIG,
    checkperiod: 60
  })

  // Chat data cache (shorter TTL since these change more frequently)
  private chatCache = new NodeCache({
    stdTTL: DEFAULT_TTL.CHAT,
    checkperiod: 30
  })

  // Pinecone index cache (long TTL since these are expensive to initialize and rarely change)
  private pineconeIndexCache = new NodeCache({
    stdTTL: DEFAULT_TTL.PINECONE_INDEX,
    checkperiod: 300
  })

  constructor() {
    // Disable caching in development and smokebox environments
    const env = process.env.DEPLOYMENT_ENV || 'development'
    this.isCachingEnabled = !['development', 'smokebox'].includes(env)

    if (!this.isCachingEnabled) {
      console.log(`Caching disabled in ${env} environment`)
    }
  }

  // Chat Config Cache Methods
  getChatConfig(companyId: string): ChatConfigType | undefined {
    if (!this.isCachingEnabled) return undefined
    return this.chatConfigCache.get<ChatConfigType>(companyId)
  }

  // Overloaded method: with or without TTL
  setChatConfig(companyId: string, config: ChatConfigType): void
  setChatConfig(companyId: string, config: ChatConfigType, ttl: number): void
  setChatConfig(companyId: string, config: ChatConfigType, ttl?: number): void {
    if (!this.isCachingEnabled) return

    if (ttl !== undefined) {
      this.chatConfigCache.set(companyId, config, ttl)
    } else {
      this.chatConfigCache.set(companyId, config)
    }
  }

  deleteChatConfig(companyId: string): void {
    if (!this.isCachingEnabled) return
    this.chatConfigCache.del(companyId)
  }

  // Chat Cache Methods
  getChat(chatId: string): ChatType | undefined {
    if (!this.isCachingEnabled) return undefined
    return this.chatCache.get<ChatType>(chatId)
  }

  // Overloaded method: with or without TTL
  setChat(chatId: string, chat: ChatType): void
  setChat(chatId: string, chat: ChatType, ttl: number): void
  setChat(chatId: string, chat: ChatType, ttl?: number): void {
    if (!this.isCachingEnabled) return

    if (ttl !== undefined) {
      this.chatCache.set(chatId, chat, ttl)
    } else {
      this.chatCache.set(chatId, chat)
    }
  }

  deleteChat(chatId: string): void {
    if (!this.isCachingEnabled) return
    this.chatCache.del(chatId)
  }

  // Pinecone Index Cache Methods
  getPineconeIndex(indexName: string): Index<RecordMetadata> | undefined {
    if (!this.isCachingEnabled) return undefined
    return this.pineconeIndexCache.get<Index<RecordMetadata>>(indexName)
  }

  // Overloaded method: with or without TTL
  setPineconeIndex(indexName: string, index: Index<RecordMetadata>): void
  setPineconeIndex(
    indexName: string,
    index: Index<RecordMetadata>,
    ttl: number
  ): void
  setPineconeIndex(
    indexName: string,
    index: Index<RecordMetadata>,
    ttl?: number
  ): void {
    if (!this.isCachingEnabled) return

    if (ttl !== undefined) {
      this.pineconeIndexCache.set(indexName, index, ttl)
    } else {
      this.pineconeIndexCache.set(indexName, index)
    }
  }

  deletePineconeIndex(indexName: string): void {
    if (!this.isCachingEnabled) return
    this.pineconeIndexCache.del(indexName)
  }

  // Utility methods
  flushAll(): void {
    if (!this.isCachingEnabled) return
    this.chatConfigCache.flushAll()
    this.chatCache.flushAll()
    this.pineconeIndexCache.flushAll()
  }

  flushCache(cacheName: 'chatConfig' | 'chat' | 'pineconeIndex'): void {
    if (!this.isCachingEnabled) return

    switch (cacheName) {
      case 'chatConfig':
        this.chatConfigCache.flushAll()
        break
      case 'chat':
        this.chatCache.flushAll()
        break
      case 'pineconeIndex':
        this.pineconeIndexCache.flushAll()
        break
    }
  }

  stats(): Record<string, NodeCache.Stats> {
    return {
      chatConfig: this.chatConfigCache.getStats(),
      chat: this.chatCache.getStats(),
      pineconeIndex: this.pineconeIndexCache.getStats()
    }
  }

  // Helper method to check if caching is enabled
  isEnabled(): boolean {
    return this.isCachingEnabled
  }
}

// Export a singleton instance
export const cacheService = new CacheService()
