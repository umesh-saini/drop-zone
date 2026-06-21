/**
 * File chunking utilities.
 *
 * Splits files into chunks for transfer and reassembles them on the other end.
 * Default chunk size: 64KB (good balance between overhead and progress granularity).
 * Max chunk size: 256KB (to stay within WebSocket message limits).
 */

/** Default chunk size: 64512 bytes (multiple of 3) */
export const DEFAULT_CHUNK_SIZE = 3 * 1024 * 21;

/** Maximum chunk size: 261120 bytes (multiple of 3) */
export const MAX_CHUNK_SIZE = 3 * 1024 * 85;

/** Minimum chunk size: 15360 bytes (multiple of 3) */
export const MIN_CHUNK_SIZE = 3 * 1024 * 5;

/**
 * Calculate the number of chunks for a given file size.
 */
export function calculateTotalChunks(
  fileSize: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): number {
  return Math.ceil(fileSize / chunkSize);
}

/**
 * Calculate optimal chunk size based on file size.
 * - Small files (< 256KB): single chunk
 * - Medium files (< 10MB): 64KB chunks
 * - Large files (> 10MB): 128KB chunks
 * - Very large files (> 100MB): 256KB chunks
 */
export function calculateOptimalChunkSize(fileSize: number): number {
  if (fileSize <= MAX_CHUNK_SIZE) {
    return fileSize; // Single chunk for small files
  }
  if (fileSize <= 10 * 1024 * 1024) {
    return DEFAULT_CHUNK_SIZE; // ~64KB
  }
  if (fileSize <= 100 * 1024 * 1024) {
    return 3 * 1024 * 42; // 129024 bytes (~128KB, multiple of 3)
  }
  return MAX_CHUNK_SIZE; // ~256KB
}

/**
 * Get the byte offset for a given chunk index.
 */
export function getChunkOffset(chunkIndex: number, chunkSize: number): number {
  return chunkIndex * chunkSize;
}

/**
 * Get the actual size of a specific chunk (last chunk may be smaller).
 */
export function getChunkSize(
  chunkIndex: number,
  totalChunks: number,
  fileSize: number,
  chunkSize: number
): number {
  if (chunkIndex === totalChunks - 1) {
    // Last chunk may be smaller
    const remaining = fileSize - chunkIndex * chunkSize;
    return remaining > 0 ? remaining : chunkSize;
  }
  return chunkSize;
}

/**
 * Validate a received chunk.
 */
export function validateChunk(
  chunkIndex: number,
  totalChunks: number,
  dataSize: number,
  expectedSize: number
): { valid: boolean; error?: string } {
  if (chunkIndex < 0 || chunkIndex >= totalChunks) {
    return { valid: false, error: `Invalid chunk index: ${chunkIndex}` };
  }
  if (dataSize === 0) {
    return { valid: false, error: 'Empty chunk data' };
  }
  if (dataSize > MAX_CHUNK_SIZE * 2) {
    // Allow some overhead for encryption
    return { valid: false, error: `Chunk too large: ${dataSize} bytes` };
  }
  return { valid: true };
}

/**
 * Generate a unique file transfer ID.
 */
export function generateFileId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${random}`;
}
