import type {
  DirectoryListing,
  FilePreview,
  RemoteAccessRequest,
  RemoteAccessResponse,
  SandboxRoot,
} from './types';

/**
 * RemoteAccessClient runs on the BROWSING device (the one accessing remote files).
 *
 * It sends requests to the source device via WebSocket and handles responses.
 * Provides a clean async API for the UI to interact with.
 */
export class RemoteAccessClient {
  private sendRequestFn: ((request: RemoteAccessRequest) => void) | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (response: RemoteAccessResponse) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private requestTimeout: number;

  constructor(requestTimeout: number = 15000) {
    this.requestTimeout = requestTimeout;
  }

  /**
   * Set the function used to send requests to the source device.
   */
  setSendFunction(fn: (request: RemoteAccessRequest) => void): void {
    this.sendRequestFn = fn;
  }

  /**
   * Handle a response from the source device.
   */
  handleResponse(response: RemoteAccessResponse): void {
    const pending = this.pendingRequests.get(response.requestId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.requestId);
    pending.resolve(response);
  }

  /**
   * Get the sandbox roots available on the source device.
   */
  async getSandboxRoots(): Promise<SandboxRoot[]> {
    const response = await this.sendRequest({ type: 'get_sandbox_roots' });
    if (!response.success) throw new Error(response.error || 'Failed to get roots');
    return (response.data as SandboxRoot[]) || [];
  }

  /**
   * List a directory on the source device.
   */
  async listDirectory(rootIndex: number, path: string = ''): Promise<DirectoryListing> {
    const response = await this.sendRequest({
      type: 'list_directory',
      rootIndex,
      path,
    });
    if (!response.success) throw new Error(response.error || 'Failed to list directory');
    return response.data as DirectoryListing;
  }

  /**
   * Get a file preview from the source device.
   */
  async getPreview(rootIndex: number, path: string): Promise<FilePreview> {
    const response = await this.sendRequest({
      type: 'get_preview',
      rootIndex,
      path,
    });
    if (!response.success) throw new Error(response.error || 'Failed to get preview');
    return response.data as FilePreview;
  }

  /**
   * Request a file download from the source device.
   * This initiates the file transfer protocol (file:offer → file:chunk flow).
   */
  async requestDownload(rootIndex: number, path: string): Promise<void> {
    const response = await this.sendRequest({
      type: 'download_file',
      rootIndex,
      path,
    });
    if (!response.success) throw new Error(response.error || 'Failed to request download');
    // File transfer will be handled by TransferManager via file:offer event
  }

  /**
   * Send a request and wait for response.
   */
  private sendRequest(
    partial: Omit<RemoteAccessRequest, 'requestId'>
  ): Promise<RemoteAccessResponse> {
    if (!this.sendRequestFn) {
      return Promise.reject(new Error('Not connected'));
    }

    const requestId = generateRequestId();
    const request: RemoteAccessRequest = { ...partial, requestId };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timed out'));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      this.sendRequestFn!(request);
    });
  }

  /**
   * Cancel all pending requests (e.g., on disconnect).
   */
  cancelAll(): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Cancelled'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Number of pending requests.
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
