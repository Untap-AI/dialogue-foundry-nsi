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
 * Retrieves documents from Pinecone index based on the query
 * @param companyId The company ID to determine which index to use
 * @param query The user's query to find similar documents
 * @param topK Number of documents to retrieve (default: 5)
 * @param filter Optional metadata filter
 * @returns Array of retrieved documents with similarity scores
 */
export const retrieveDocuments = async (
  indexName: string,
  query: string,
  topK: number = 10,
  filter?: Record<string, unknown>
) => {
  try {
    // Get the index directly without caching
    const index = getPinecone().index(indexName).namespace('')

    // Query the Pinecone index with the text query feature
    // This uses serverless Pinecone with auto-embedding
    const queryResponse = await index.searchRecords({
      query: {
        topK,
        inputs: { text: query },
        filter
        // TODO: Add reranking
      },
      fields: ['chunk_text'] // Only request chunk_text and url
    })

    // Extract and format the results with URL
    const documents = queryResponse.result.hits
      .map(hit => {
        const fields = hit.fields
        if (!('chunk_text' in fields) || !fields.chunk_text || typeof fields.chunk_text !== 'string') return undefined

        return {
          text: fields.chunk_text,
        }
      })
      .filter((doc): doc is { text: string } => doc !== undefined)

    return documents
  } catch (error) {
    logger.error('Error retrieving documents from Pinecone:', error)
    return []
  }
}
