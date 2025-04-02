import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
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
  indexName: string,
  query: string,
  topK: number = 5,
  filter?: Record<string, unknown>
) => {
  try {
    // Get the index from centralized cache or initialize it
    let index = cacheService.getPineconeIndex(indexName)
    if (!index) {
      // TODO: Remove this once we have a namespace for each company
      index = pinecone.index(indexName).namespace('default')
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
      fields: ['chunk_text']
    })

    // Extract and format the results
    const documents = queryResponse.result.hits
      .map(hit =>
        'chunk_text' in hit.fields
          ? hit.fields['chunk_text']?.toString()
          : undefined
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
