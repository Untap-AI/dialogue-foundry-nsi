export type ContextActionResult =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }

export type SetContextResult =
  | {
      success: true
      contextId: string
    }
  | {
      success: false
      error: string
    }
