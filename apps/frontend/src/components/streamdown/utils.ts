import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Use the same lightweight cn function as the main utils
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
