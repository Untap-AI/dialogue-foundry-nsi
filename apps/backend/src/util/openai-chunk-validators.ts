import { z } from 'zod'

// Base schema for all OpenAI response chunks (doesn't include type field, which will be specified in each variant)
const openAIResponseChunkBaseSchema = z.object({
  item_id: z.string().optional(),
  output_index: z.number().optional(),
  content_index: z.number().optional()
})

// Response created schema
const openAIResponseCreatedSchema = openAIResponseChunkBaseSchema.extend({
  type: z.literal('response.created'),
  response: z
    .object({
      id: z.string(),
      status: z.string()
    })
    .catchall(z.unknown()) // For other potential fields
})

// Response in progress schema
const openAIResponseInProgressSchema = openAIResponseChunkBaseSchema.extend({
  type: z.literal('response.in_progress'),
  response: z
    .object({
      id: z.string(),
      status: z.string()
    })
    .catchall(z.unknown()) // For other potential fields
})

// Response delta schema
const openAIResponseDeltaSchema = openAIResponseChunkBaseSchema.extend({
  type: z.literal('response.output_text.delta'),
  delta: z.string()
})

// Response done schema
const openAIResponseDoneSchema = openAIResponseChunkBaseSchema.extend({
  type: z.literal('response.output_text.done'),
  text: z.string()
})

// Response output item added schema
const openAIResponseOutputItemAddedSchema =
  openAIResponseChunkBaseSchema.extend({
    type: z.literal('response.output_item.added'),
    output_index: z.number(),
    item: z.object({
      type: z.string(),
      id: z.string(),
      status: z.string(),
      role: z.string(),
      content: z.array(z.unknown()) // Replacing any[] with array of unknown
    })
  })

// Response content part added schema
const openAIResponseContentPartAddedSchema =
  openAIResponseChunkBaseSchema.extend({
    type: z.literal('response.content_part.added'),
    item_id: z.string(),
    output_index: z.number(),
    content_index: z.number(),
    part: z.object({
      type: z.string(),
      text: z.string(),
      annotations: z.array(z.unknown()) // Replacing any[] with array of unknown
    })
  })

// Response content part done schema
const openAIResponseContentPartDoneSchema =
  openAIResponseChunkBaseSchema.extend({
    type: z.literal('response.content_part.done'),
    item_id: z.string(),
    output_index: z.number(),
    content_index: z.number(),
    part: z.object({
      type: z.string(),
      text: z.string(),
      annotations: z.array(z.unknown()) // Replacing any[] with array of unknown
    })
  })

// Response output item done schema
const openAIResponseOutputItemDoneSchema = openAIResponseChunkBaseSchema.extend(
  {
    type: z.literal('response.output_item.done'),
    output_index: z.number(),
    item: z.object({
      type: z.string(),
      id: z.string(),
      status: z.string(),
      role: z.string(),
      content: z.array(z.unknown()) // Replacing any[] with array of unknown
    })
  }
)

// Response completed schema
const openAIResponseCompletedSchema = openAIResponseChunkBaseSchema.extend({
  type: z.literal('response.completed'),
  response: z
    .object({
      id: z.string(),
      status: z.string(),
      output: z.array(z.unknown()) // Replacing any[] with array of unknown
    })
    .catchall(z.unknown()) // For other potential fields
})

// Union schema for all possible chunk types - removing the base schema from union
export const openAIResponseChunkSchema = z.discriminatedUnion('type', [
  openAIResponseDeltaSchema,
  openAIResponseDoneSchema,
  openAIResponseCreatedSchema,
  openAIResponseInProgressSchema,
  openAIResponseOutputItemAddedSchema,
  openAIResponseContentPartAddedSchema,
  openAIResponseContentPartDoneSchema,
  openAIResponseOutputItemDoneSchema,
  openAIResponseCompletedSchema
])

// Define types based on the schemas
export type OpenAIResponseChunkBase = z.infer<
  typeof openAIResponseChunkBaseSchema
>
export type OpenAIResponseCreatedChunk = z.infer<
  typeof openAIResponseCreatedSchema
>
export type OpenAIResponseInProgressChunk = z.infer<
  typeof openAIResponseInProgressSchema
>
export type OpenAIResponseDeltaChunk = z.infer<typeof openAIResponseDeltaSchema>
export type OpenAIResponseDoneChunk = z.infer<typeof openAIResponseDoneSchema>
export type OpenAIResponseOutputItemAddedChunk = z.infer<
  typeof openAIResponseOutputItemAddedSchema
>
export type OpenAIResponseContentPartAddedChunk = z.infer<
  typeof openAIResponseContentPartAddedSchema
>
export type OpenAIResponseContentPartDoneChunk = z.infer<
  typeof openAIResponseContentPartDoneSchema
>
export type OpenAIResponseOutputItemDoneChunk = z.infer<
  typeof openAIResponseOutputItemDoneSchema
>
export type OpenAIResponseCompletedChunk = z.infer<
  typeof openAIResponseCompletedSchema
>
export type OpenAIResponseChunk = z.infer<typeof openAIResponseChunkSchema>

// Type guard functions for each chunk type
export const isOpenAIResponseCreatedChunk = (
  chunk: unknown
): chunk is OpenAIResponseCreatedChunk => {
  return openAIResponseCreatedSchema.safeParse(chunk).success
}

export const isOpenAIResponseInProgressChunk = (
  chunk: unknown
): chunk is OpenAIResponseInProgressChunk => {
  return openAIResponseInProgressSchema.safeParse(chunk).success
}

export const isOpenAIResponseDeltaChunk = (
  chunk: unknown
): chunk is OpenAIResponseDeltaChunk => {
  return openAIResponseDeltaSchema.safeParse(chunk).success
}

export const isOpenAIResponseDoneChunk = (
  chunk: unknown
): chunk is OpenAIResponseDoneChunk => {
  return openAIResponseDoneSchema.safeParse(chunk).success
}

export const isOpenAIResponseOutputItemAddedChunk = (
  chunk: unknown
): chunk is OpenAIResponseOutputItemAddedChunk => {
  return openAIResponseOutputItemAddedSchema.safeParse(chunk).success
}

export const isOpenAIResponseContentPartAddedChunk = (
  chunk: unknown
): chunk is OpenAIResponseContentPartAddedChunk => {
  return openAIResponseContentPartAddedSchema.safeParse(chunk).success
}

export const isOpenAIResponseContentPartDoneChunk = (
  chunk: unknown
): chunk is OpenAIResponseContentPartDoneChunk => {
  return openAIResponseContentPartDoneSchema.safeParse(chunk).success
}

export const isOpenAIResponseOutputItemDoneChunk = (
  chunk: unknown
): chunk is OpenAIResponseOutputItemDoneChunk => {
  return openAIResponseOutputItemDoneSchema.safeParse(chunk).success
}

export const isOpenAIResponseCompletedChunk = (
  chunk: unknown
): chunk is OpenAIResponseCompletedChunk => {
  return openAIResponseCompletedSchema.safeParse(chunk).success
}

export const validateOpenAIResponseChunk = (
  chunk: unknown
): OpenAIResponseChunk => {
  const result = openAIResponseChunkSchema.safeParse(chunk)
  if (!result.success) {
    throw new Error(`Invalid OpenAI response chunk: ${result.error.message}`)
  }
  return result.data
}
