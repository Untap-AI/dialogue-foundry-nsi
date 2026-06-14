import { Index } from '@upstash/vector'
import dotenv from 'dotenv'
import { logger } from '../lib/logger'

dotenv.config()

// Lazily initialized so importing this module doesn't require Upstash credentials
// at startup if they are not yet set.
let index: Index | undefined

const getIndex = (): Index => {
  if (!index) {
    const url = process.env.UPSTASH_VECTOR_REST_URL
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN
    if (!url || !token) {
      throw new Error(
        'UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set in environment variables'
      )
    }
    index = new Index({ url, token })
  }
  return index
}

/**
 * Retrieves documents from the company's Upstash namespace based on the query.
 * Uses Upstash's built-in embedding model (raw text via the `data` field).
 * @param namespace The company's namespace
 * @param query The user's query to find similar documents
 * @param topK Number of documents to retrieve (default: 10)
 * @returns Array of retrieved documents
 */
export const retrieveDocuments = async (
  namespace: string,
  query: string,
  topK: number = 10,
  filter?: string
) => {
  try {
    const results = await getIndex().query(
      {
        data: query,
        topK,
        includeMetadata: true,
        includeData: true,
        ...(filter ? { filter } : {})
      },
      { namespace }
    )

    const documents = results
      .map(hit => {
        const text = typeof hit.data === 'string' ? hit.data : undefined
        if (!text) return undefined

        const url =
          hit.metadata && typeof hit.metadata.url === 'string'
            ? hit.metadata.url
            : undefined

        return { text, url }
      })
      .filter(
        (doc): doc is { text: string; url: string | undefined } =>
          doc !== undefined
      )

    return documents
  } catch (error) {
    logger.error('Error retrieving documents from Upstash:', error)
    return []
  }
}
