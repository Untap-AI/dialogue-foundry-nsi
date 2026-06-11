import { retrieveDocuments as pineconeRetrieveDocuments } from './pinecone-service'
import { retrieveDocuments as upstashRetrieveDocuments } from './upstash-service'

/**
 * Provider-agnostic vector retrieval facade.
 *
 * Dispatches to Pinecone or Upstash based on the VECTOR_PROVIDER env var
 * (default 'pinecone'). During the migration this lets us flip all companies to
 * Upstash with one env var and roll back instantly. The first argument is the
 * chat_configs.pinecone_index_name value — a Pinecone index name for Pinecone,
 * and the per-company namespace for Upstash.
 */

type RetrievedDocument = {
  text: string
  url?: string | undefined
}

const vectorProvider = process.env.VECTOR_PROVIDER || 'pinecone'

export const retrieveDocuments = async (
  indexNameOrNamespace: string,
  query: string,
  topK: number = 10,
  filter?: Record<string, unknown>
): Promise<RetrievedDocument[]> => {
  if (vectorProvider === 'upstash') {
    return upstashRetrieveDocuments(indexNameOrNamespace, query, topK)
  }

  return pineconeRetrieveDocuments(indexNameOrNamespace, query, topK, filter)
}

/**
 * Formats retrieved documents as context for the LLM. Provider-agnostic.
 * @param documents The retrieved documents
 * @returns Formatted context string to append to the LLM prompt
 */
export const formatDocumentsAsContext = (documents: RetrievedDocument[]) => {
  if (!documents.length) return ''

  const contextParts = documents.map((doc, index) => {
    return `
    [Document ${index + 1}]

    ${doc.text}`
  })

  return `Relevant information from the knowledge base. Use the following information only to answer the user's question::

  ${contextParts.join('\n\n')}`
}
