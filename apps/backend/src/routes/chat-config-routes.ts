import express from 'express'
import { authenticateAdmin } from '../middleware/auth-middleware'
import {
  getAllChatConfigs,
  getChatConfigByCompanyId,
  createChatConfig,
  updateChatConfig,
  deleteChatConfig
} from '../db/chat-configs'
import { cacheService } from '../services/cache-service'
import type { CustomRequest } from '../middleware/auth-middleware'

const router = express.Router()

// Get all chat configs (requires admin authentication)
router.get('/', authenticateAdmin, async (req: CustomRequest, res) => {
  try {
    const chatConfigs = await getAllChatConfigs()
    return res.json({
      configs: chatConfigs,
      requestedBy: req.user?.userId
    })
  } catch (error) {
    console.error('Error fetching chat configs:', error)
    return res
      .status(500)
      .json({ error: 'Failed to fetch chat configurations' })
  }
})

// Get chat config by company ID (public endpoint)
// This endpoint is public because it's needed by the chat interface
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Try to get from cache first
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

    if (!chatConfig) {
      return res.status(404).json({ error: 'Chat configuration not found' })
    }

    return res.json(chatConfig)
  } catch (error) {
    console.error(
      `Error fetching chat config for company ID ${req.params.companyId}:`,
      error
    )
    return res.status(500).json({ error: 'Failed to fetch chat configuration' })
  }
})

// Create a new chat config (requires admin authentication)
router.post('/', authenticateAdmin, async (req: CustomRequest, res) => {
  try {
    const { company_id, system_prompt, pinecone_index_name } = req.body

    if (!company_id || !system_prompt) {
      return res
        .status(400)
        .json({ error: 'Company ID and system prompt are required' })
    }

    // Check if company ID already exists
    const existingConfig = await getChatConfigByCompanyId(company_id)
    if (existingConfig) {
      return res
        .status(409)
        .json({ error: 'A configuration for this company ID already exists' })
    }

    const newChatConfig = await createChatConfig({
      company_id,
      system_prompt,
      pinecone_index_name: pinecone_index_name || undefined
    })

    // Store in cache
    cacheService.setChatConfig(company_id, newChatConfig)

    return res.status(201).json({
      ...newChatConfig,
      requestedBy: req.user?.userId
    })
  } catch (error) {
    console.error('Error creating chat config:', error)
    return res
      .status(500)
      .json({ error: 'Failed to create chat configuration' })
  }
})

// Update a chat config (requires admin authentication)
router.put(
  '/:companyId',
  authenticateAdmin,
  async (req: CustomRequest, res) => {
    try {
      const { companyId } = req.params
      const { system_prompt, pinecone_index_name } = req.body

      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' })
      }

      // Check if at least one field to update is provided
      if (!system_prompt && pinecone_index_name === undefined) {
        return res
          .status(400)
          .json({ error: 'At least one field to update is required' })
      }

      // Check if company ID exists
      const existingConfig = await getChatConfigByCompanyId(companyId)
      if (!existingConfig) {
        return res.status(404).json({ error: 'Chat configuration not found' })
      }

      const updates: {
        system_prompt?: string
        pinecone_index_name?: string | null
      } = {}

      if (system_prompt) {
        updates.system_prompt = system_prompt
      }

      if (pinecone_index_name !== undefined) {
        updates.pinecone_index_name = pinecone_index_name
      }

      const updatedChatConfig = await updateChatConfig(companyId, updates)

      // Update cache
      cacheService.setChatConfig(companyId, updatedChatConfig)

      return res.json({
        ...updatedChatConfig,
        requestedBy: req.user?.userId
      })
    } catch (error) {
      console.error(
        `Error updating chat config for company ID ${req.params.companyId}:`,
        error
      )
      return res
        .status(500)
        .json({ error: 'Failed to update chat configuration' })
    }
  }
)

// Delete a chat config (requires admin authentication)
router.delete(
  '/:companyId',
  authenticateAdmin,
  async (req: CustomRequest, res) => {
    try {
      const { companyId } = req.params

      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' })
      }

      // Prevent deletion of the default config
      if (companyId === 'default') {
        return res
          .status(403)
          .json({ error: 'Cannot delete the default configuration' })
      }

      // Check if company ID exists
      const existingConfig = await getChatConfigByCompanyId(companyId)
      if (!existingConfig) {
        return res.status(404).json({ error: 'Chat configuration not found' })
      }

      await deleteChatConfig(companyId)

      // Remove from cache
      cacheService.deleteChatConfig(companyId)

      return res.json({
        success: true,
        message: 'Chat configuration deleted successfully',
        requestedBy: req.user?.userId
      })
    } catch (error) {
      console.error(
        `Error deleting chat config for company ID ${req.params.companyId}:`,
        error
      )
      return res
        .status(500)
        .json({ error: 'Failed to delete chat configuration' })
    }
  }
)

export default router
