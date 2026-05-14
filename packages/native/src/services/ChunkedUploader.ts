import { ChunkedUploadConfig, ChunkMetadata, sleep, UPLOAD_CHUNK_SIZE, UploadProgress, type Book } from '@roam/shared';
import { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { BASE_URL } from './config';

export class ChunkedUploader {
  private uri: string;
  private fileName: string;
  private fileSize: number;
  private fileType: string;
  private config: Required<ChunkedUploadConfig>;
  private uploadedChunks: Set<number> = new Set();
  private uploadId: string | null = null;
  private abortController: AbortController | null = null;
  private startTime: number = 0;
  private uploadedBytes: number = 0;
  private totalChunks: number = 0;

  constructor(asset: DocumentPickerAsset, config: Partial<ChunkedUploadConfig> = {}) {
    this.uri = asset.uri;
    this.fileName = asset.name;
    this.fileSize = asset.size ?? 0;
    this.fileType = asset.mimeType ?? 'text/plain';
    this.config = {
      chunkSize: UPLOAD_CHUNK_SIZE,
      maxParallel: 2, // Lower for mobile to avoid memory pressure
      maxRetries: 3,
      onProgress: () => {},
      onChunkComplete: () => {},
      onError: () => {},
      ...config,
    };
    this.totalChunks = Math.ceil(this.fileSize / this.config.chunkSize);
  }

  cancel = () => {
    this.abortController?.abort();
  };

  /**
   * Start the upload process
   */
  upload = async (): Promise<Book> => {
    this.abortController = new AbortController();
    this.startTime = Date.now();
    this.uploadedBytes = 0;

    try {
      // Step 1: Initialize upload session
      this.uploadId = await this.initializeUpload();

      // Step 2: Upload all chunks
      await this.uploadAllChunks();

      // Step 3: Finalize upload and create book
      return this.finalizeUpload();
    } catch (error) {
      this.config.onError(error as Error);
      throw error;
    }
  };

  /**
   * Initialize upload session on server
   */
  private initializeUpload = async (): Promise<string> => {
    const response = await fetch(`${BASE_URL}/api/upload/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: this.fileName,
        fileSize: this.fileSize,
        fileType: this.fileType,
        totalChunks: this.totalChunks,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.message || 'Failed to initialize upload');
    }

    const { uploadId } = await response.json();
    return uploadId;
  };

  /**
   * Upload all chunks (with parallel processing)
   */
  private uploadAllChunks = async (): Promise<void> => {
    const chunks = this.createChunkMetadata();
    const chunksToUpload = chunks.filter((chunk) => !this.uploadedChunks.has(chunk.index));

    // Upload in batches (parallel)
    for (let i = 0; i < chunksToUpload.length; i += this.config.maxParallel) {
      const batch = chunksToUpload.slice(i, i + this.config.maxParallel);

      await Promise.all(batch.map((chunk) => this.uploadChunkWithRetry(chunk)));
    }
  };

  /**
   * Upload a single chunk with retry logic
   */
  private uploadChunkWithRetry = async (chunk: ChunkMetadata): Promise<void> => {
    while (chunk.retries <= this.config.maxRetries) {
      try {
        await this.uploadChunk(chunk);
        return;
      } catch (error) {
        chunk.retries++;

        if (chunk.retries > this.config.maxRetries) {
          throw new Error((error as Error).message || `Failed to upload chunk ${chunk.index} after ${this.config.maxRetries} retries`);
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, chunk.retries - 1), 10000);
        await sleep(delay);
      }
    }
  };

  /**
   * Upload a single chunk
   */
  private uploadChunk = async (chunk: ChunkMetadata): Promise<void> => {
    // Read the specific byte range from the phone's disk
    const base64Chunk = await FileSystem.readAsStringAsync(this.uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: chunk.start,
      length: chunk.size,
    });
    const formData = new FormData();

    formData.append('uploadId', this.uploadId!);
    formData.append('chunkIndex', chunk.index.toString());
    formData.append('totalChunks', this.totalChunks.toString());
    formData.append('chunk', {
      uri: `data:application/octet-stream;base64,${base64Chunk}`,
      name: `chunk-${chunk.index}`,
      type: 'application/octet-stream',
    } as unknown as Blob);

    const response = await fetch(`${BASE_URL}/api/upload/chunk`, {
      method: 'POST',
      body: formData,
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.message || 'Chunk upload failed');
    }

    // Mark chunk as uploaded
    this.uploadedChunks.add(chunk.index);
    this.uploadedBytes += chunk.size;

    // Notify progress
    this.notifyProgress();
    this.config.onChunkComplete(chunk.index, this.totalChunks);
  };

  /**
   * Finalize upload and create book record
   */
  private finalizeUpload = async (): Promise<Book> => {
    const response = await fetch(`${BASE_URL}/api/upload/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: this.uploadId }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.message);
    }

    const result = await response.json();
    return result;
  };

  /**
   * Get upload status from server (for resume)
   */
  private getUploadStatus = async (uploadId: string): Promise<{ uploadedChunks: number[] }> => {
    const response = await fetch(`${BASE_URL}/api/upload/status/${uploadId}`);

    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.message);
    }

    return response.json();
  };

  /**
   * Create chunk metadata for all chunks
   */
  private createChunkMetadata = (): ChunkMetadata[] => {
    const chunks: ChunkMetadata[] = [];

    for (let i = 0; i < this.totalChunks; i++) {
      const start = i * this.config.chunkSize;
      const end = Math.min(start + this.config.chunkSize, this.fileSize);

      chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        retries: 0,
      });
    }

    return chunks;
  };

  /**
   * Calculate and notify upload progress
   */
  private notifyProgress = (): void => {
    const elapsedTime = (Date.now() - this.startTime) / 1000; // seconds
    const speed = elapsedTime > 0 ? this.uploadedBytes / elapsedTime : 0;
    const remainingBytes = this.fileSize - this.uploadedBytes;
    const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;

    const progress: UploadProgress = {
      uploadedBytes: this.uploadedBytes,
      totalBytes: this.fileSize,
      percentage: (this.uploadedBytes / this.fileSize) * 100,
      currentChunk: this.uploadedChunks.size,
      totalChunks: this.totalChunks,
      speed,
      estimatedTimeRemaining,
    };

    this.config.onProgress(progress);
  };
}
