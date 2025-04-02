import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
import { getChatConfigByCompanyId } from '../db/chat-configs'
import { cacheService } from './cache-service'

dotenv.config()

// Check for API key in environment variables
const pineconeApiKey = process.env.PINECONE_API_KEY
if (!pineconeApiKey) {
  console.error('PINECONE_API_KEY is not set in environment variables')
  process.exit(1)
}

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: pineconeApiKey
})

/**
 * Retrieves documents from Pinecone index based on the query
 * @param companyId The company ID to determine which index to use
 * @param query The user's query to find similar documents
 * @param topK Number of documents to retrieve (default: 5)
 * @param filter Optional metadata filter
 * @returns Array of retrieved documents with similarity scores
 */
export const retrieveDocuments = async (
  companyId: string,
  query: string,
  topK: number = 5,
  filter?: Record<string, unknown>
) => {
  try {
    // Try to get chat config from cache first
    let chatConfig = cacheService.getChatConfig(companyId)

    // If not in cache, fetch from database
    if (!chatConfig) {
      const dbConfig = await getChatConfigByCompanyId(companyId)

      // If found, store in cache
      if (dbConfig) {
        cacheService.setChatConfig(companyId, dbConfig)
        chatConfig = dbConfig
      }
    }

    if (!chatConfig || !chatConfig.pinecone_index_name) {
      console.warn(`No Pinecone index configured for company ID: ${companyId}`)
      return []
    }

    const indexName = chatConfig.pinecone_index_name

    // Get the index from centralized cache or initialize it
    let index = cacheService.getPineconeIndex(indexName)
    if (!index) {
      index = pinecone.index(indexName)
      cacheService.setPineconeIndex(indexName, index)
    }

    // Query the Pinecone index with the text query feature
    // This uses serverless Pinecone with auto-embedding
    const queryResponse = await index.searchRecords({
      query: {
        topK: topK ?? 5,
        inputs: { text: query },
        filter
        // TODO: Add reranking
      },
      fields: ['text']
    })

    // Extract and format the results
    const documents = queryResponse.result.hits
      .map(hit =>
        'text' in hit.fields ? hit.fields['text']?.toString() : undefined
      )
      .filter(text => text !== undefined) as string[]

    return documents
  } catch (error) {
    console.error('Error retrieving documents from Pinecone:', error)
    return []
  }
}

/**
 * Formats retrieved documents as context for the LLM
 * @param documents The retrieved documents
 * @returns Formatted context string to append to the LLM prompt
 */
export const formatDocumentsAsContext = (documents: string[]) => {
  if (!documents.length) return ''

  // Create a formatted context string from the documents
  const contextParts = documents.map((doc, index) => {
    return `[Document ${index + 1}] ${doc}`
  })

  return `
Relevant information from the knowledge base:
${contextParts.join('\n\n')}
`
}
