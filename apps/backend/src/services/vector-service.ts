import { retrieveDocuments as upstashRetrieveDocuments } from './upstash-service'

type RetrievedDocument = {
  text: string
  url?: string | undefined
}

export const retrieveDocuments = async (
  namespace: string,
  query: string,
  topK: number = 10,
): Promise<RetrievedDocument[]> => {
  return upstashRetrieveDocuments(namespace, query, topK)
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
