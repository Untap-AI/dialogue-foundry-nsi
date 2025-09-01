import { type ClassValue, clsx } from 'clsx';

// Use the same lightweight cn function as the main utils
export const cn = (...inputs: ClassValue[]) => clsx(inputs);
