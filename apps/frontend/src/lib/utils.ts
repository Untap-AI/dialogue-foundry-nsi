import { type ClassValue, clsx } from "clsx"

// Lightweight alternative to tailwind-merge - saves ~80KB!
// For most use cases, clsx is sufficient for conditional classes
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
