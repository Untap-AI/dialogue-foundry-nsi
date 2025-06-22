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

type ContextItems = Record<string, ContextItem>

type ContextTask = {
  description: string
  paramDescriptions: string[]
}
