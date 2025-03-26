// Export components
export { ChatInterface } from './components/ChatInterface'
export type { ChatInterfaceProps } from './components/ChatInterface'

// Export services
export { ChatApiService } from '../../../apps/frontend/src/services/api'
export { ChatStreamingService } from '../../../apps/frontend/src/services/streaming'
export type {
  ChatConfig,
  ChatInit,
  Message,
  MessageResponse
} from '../../../apps/frontend/src/services/api'
export type { StreamingConfig } from '../../../apps/frontend/src/services/streaming'

// Export styles
import './styles.css'
