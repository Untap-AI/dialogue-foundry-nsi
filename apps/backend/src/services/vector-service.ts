import { retrieveDocuments as pineconeRetrieveDocuments } from './pinecone-service'
import { retrieveDocuments as upstashRetrieveDocuments } from './upstash-service'

/**
 * Provider-agnostic vector retrieval facade — NSI fork.
 *
 * Dispatches to Pinecone or Upstash based on the VECTOR_PROVIDER env var
 * (default 'pinecone'). NSI: f-code extraction lives here so both providers
 * get the same metadata filter built from the user's query automatically.
 */

type RetrievedDocument = {
  text: string
  url?: string | undefined
}

const vectorProvider = process.env.VECTOR_PROVIDER || 'pinecone'

const extractFCodes = (query: string): string[] => {
  const fCodeRegex = /f\d{5,7}/gi
  const matches = query.match(fCodeRegex)
  if (!matches) return []
  return [...new Set(matches.map(code => code.toLowerCase()))]
}

const buildPineconeFilter = (fCodes: string[]): Record<string, unknown> | undefined => {
  if (fCodes.length === 0) return undefined
  if (fCodes.length === 1) return { f_code: fCodes[0] }
  return { $or: fCodes.map(code => ({ f_code: code })) }
}

const buildUpstashFilter = (fCodes: string[]): string | undefined => {
  if (fCodes.length === 0) return undefined
  if (fCodes.length === 1) return `f_code = '${fCodes[0]}'`
  return `(${fCodes.map(code => `f_code = '${code}'`).join(' OR ')})`
}

export const retrieveDocuments = async (
  indexNameOrNamespace: string,
  query: string,
  topK: number = 10
): Promise<RetrievedDocument[]> => {
  const fCodes = extractFCodes(query)

  if (vectorProvider === 'upstash') {
    return upstashRetrieveDocuments(indexNameOrNamespace, query, topK, buildUpstashFilter(fCodes))
  }

  return pineconeRetrieveDocuments(indexNameOrNamespace, query, topK, buildPineconeFilter(fCodes))
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
