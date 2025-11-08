/**
 * Fetch wrapper with retry logic and timeout support
 * Handles transient network failures with exponential backoff
 */

interface RetryConfig {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  timeoutMs?: number
  backoffMultiplier?: number
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  timeoutMs: 10000, // 10 second timeout
  backoffMultiplier: 2
}

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Calculate delay for exponential backoff
 */
const calculateDelay = (
  attempt: number,
  config: Required<RetryConfig>
): number => {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  return Math.min(delay, config.maxDelayMs)
}

/**
 * Check if an error is retryable
 */
const isRetryableError = (error: any): boolean => {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch failed')) {
    return true
  }
  
  // Timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return true
  }
  
  // HTTP status codes that should be retried
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504]
    return retryableStatuses.includes(error.status)
  }
  
  return false
}

/**
 * Fetch with timeout support
 */
const fetchWithTimeout = async (
  url: string | URL | Request,
  options: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch with automatic retry logic
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param config - Retry configuration
 */
export const fetchWithRetry = async (
  url: string | URL | Request,
  options?: RequestInit,
  config: RetryConfig = {}
): Promise<Response> => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | undefined
  
  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, fullConfig.timeoutMs)
      
      // If response is ok or non-retryable status, return it
      if (response.ok || !isRetryableError({ status: response.status })) {
        return response
      }
      
      // Clone response for retry logic (response can only be read once)
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
      Object.assign(lastError, { status: response.status })
      
    } catch (error) {
      lastError = error as Error
      
      // If not retryable or last attempt, throw
      if (!isRetryableError(error) || attempt === fullConfig.maxRetries) {
        console.error(`Fetch failed after ${attempt + 1} attempts:`, {
          url: typeof url === 'string' ? url : url.toString(),
          error: lastError.message,
          attempts: attempt + 1
        })
        throw error
      }
    }
    
    // Wait before retry with exponential backoff
    if (attempt < fullConfig.maxRetries) {
      const delay = calculateDelay(attempt, fullConfig)
      console.warn(`Retrying fetch (attempt ${attempt + 1}/${fullConfig.maxRetries}) after ${delay}ms:`, {
        url: typeof url === 'string' ? url : url.toString(),
        error: lastError?.message
      })
      await sleep(delay)
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Fetch failed after all retries')
}

/**
 * Create a custom fetch function with predefined retry config
 * Useful for passing to libraries like Supabase
 */
export const createFetchWithRetry = (config?: RetryConfig) => {
  return (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
    return fetchWithRetry(url, options, config)
  }
}

