import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
import { logger } from '../lib/logger'

dotenv.config()

// Lazily initialized so importing this module under VECTOR_PROVIDER=upstash
// doesn't hard-exit when PINECONE_API_KEY is absent.
let pinecone: Pinecone | undefined

const getPinecone = (): Pinecone => {
  if (!pinecone) {
    const pineconeApiKey = process.env.PINECONE_API_KEY
    if (!pineconeApiKey) {
      throw new Error('PINECONE_API_KEY is not set in environment variables')
    }
    pinecone = new Pinecone({ apiKey: pineconeApiKey })
  }
  return pinecone
}

/**
 * Retrieves documents from Pinecone index based on the query.
 * F-code filter is built by vector-service.ts and passed in via `filter`.
 */
export const retrieveDocuments = async (
  indexName: string,
  query: string,
  topK: number = 10,
  filter?: Record<string, unknown>
) => {
  try {
    const index = getPinecone().index(indexName).namespace('')

    const queryResponse = await index.searchRecords({
      query: {
        topK,
        inputs: { text: query },
        filter: filter && Object.keys(filter).length > 0 ? filter : undefined
      },
      fields: ['chunk_text']
    })

    const documents = queryResponse.result.hits
      .map(hit => {
        const fields = hit.fields
        if (!('chunk_text' in fields) || !fields.chunk_text || typeof fields.chunk_text !== 'string') return undefined
        return { text: fields.chunk_text }
      })
      .filter((doc): doc is { text: string } => doc !== undefined)

    return documents
  } catch (error) {
    logger.error('Error retrieving documents from Pinecone:', error)
    return []
  }
}
