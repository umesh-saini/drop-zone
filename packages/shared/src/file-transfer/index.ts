export { TransferManager } from './TransferManager';
export {
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  calculateOptimalChunkSize,
  calculateTotalChunks,
  getChunkOffset,
  getChunkSize,
  validateChunk,
  generateFileId,
} from './chunker';
export type {
  FileAdapter,
  FileChunk,
  FileMetadata,
  FileOffer,
  FilePickerOptions,
  PickedFile,
  TransferDirection,
  TransferEventHandlers,
  TransferProgress,
  TransferState,
  TransferStatus,
} from './types';
