import { v4 as uuidv4 } from 'uuid';

// Helper function to generate UUIDs that works across browsers
export function generateUUID(): string {
  // Use native crypto.randomUUID() if available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback to uuid library if native method is not available
  return uuidv4();
} 