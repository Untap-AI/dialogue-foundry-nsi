import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from 'dotenv'
import { logger } from '../lib/logger'

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

type RetrievedDocument = {
  text: string
  url?: string | undefined
}

/**
 * Extracts f-codes from a query string
 * F-codes are the letter 'f' followed by 5-7 digits
 * @param query The query string to search for f-codes
 * @returns Array of unique f-codes found in the query
 */
const extractFCodes = (query: string): string[] => {
  const fCodeRegex = /f\d{5,7}/gi
  const matches = query.match(fCodeRegex)
  if (!matches) return []
  
  // Return unique f-codes in lowercase for consistent matching
  return [...new Set(matches.map(code => code.toLowerCase()))]
}

/**
 * Retrieves documents from Pinecone index based on the query
 * Automatically detects f-codes in the query and adds them as metadata filters
 * @param companyId The company ID to determine which index to use
 * @param query The user's query to find similar documents
 * @param topK Number of documents to retrieve (default: 5)
 * @param filter Optional metadata filter (will be merged with auto-detected f-code filters)
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
    const index = pinecone.index(indexName).namespace('')

    // Extract f-codes from the query
    const fCodes = extractFCodes(query)
    
    // Build the complete filter by merging existing filter with f-code filters
    let completeFilter = filter || {}
    
    if (fCodes.length > 0) {
      logger.info(`Detected f-codes in query: ${fCodes.join(', ')}`)
      
      // If multiple f-codes are found, use $or to match any of them
      if (fCodes.length === 1) {
        completeFilter = {
          ...completeFilter,
          f_code: fCodes[0]
        }
      } else {
        completeFilter = {
          ...completeFilter,
          $or: fCodes.map(code => ({ f_code: code }))
        }
      }
    }

    console.log('completeFilter', completeFilter)
    console.log('fCodes', fCodes)

    // Query the Pinecone index with the text query feature
    // This uses serverless Pinecone with auto-embedding
    const queryResponse = await index.searchRecords({
      query: {
        topK,
        inputs: { text: query },
        filter: Object.keys(completeFilter).length > 0 ? completeFilter : undefined
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
      .filter((doc) => doc !== undefined)

    console.log('documents', documents)

    return documents
  } catch (error) {
    logger.error('Error retrieving documents from Pinecone:', error)
    return []
  }
}

/**
 * Formats retrieved documents as context for the LLM
 * @param documents The retrieved documents with URLs
 * @returns Formatted context string to append to the LLM prompt
 */
export const formatDocumentsAsContext = (documents: RetrievedDocument[]) => {
  if (!documents.length) return ''

  // Create a formatted context string from the documents
  const contextParts = documents.map((doc, index) => {
    return `
    [Document ${index + 1}]

    ${doc.text}`
  })

  return `Relevant information from the knowledge base. Use the following information only to answer the user's question::
  
  ${contextParts.join('\n\n')}`
}
