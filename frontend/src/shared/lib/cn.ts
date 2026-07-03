import { clsx, type ClassValue } from 'clsx';

/**
 * Merge conditional class names.
 * Thin wrapper over clsx so call sites can stay terse: cn('a', cond && 'b').
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
