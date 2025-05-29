type ContextItemDataType =
  | number
  | string
  | boolean
  | null
  | ContextObject
  | ContextItemDataType[]

type ContextObject = {
  [key: string]: ContextItemDataType
}

type ContextItem = {
  value: ContextItemDataType
  description: string
}

export type ContextItems = Record<string, ContextItem>

type ContextTask = {
  description: string
  paramDescriptions: string[]
}

export type ContextTasks = Record<string, ContextTask>
