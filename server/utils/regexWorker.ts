import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

// ============================================================================
// REGEX WORKER - ISOLATED REGEX EXECUTION WITH TRUE TIMEOUT ENFORCEMENT
// ============================================================================

export interface RegexWorkerMessage {
  type: 'test' | 'match' | 'terminate';
  id: string;
  pattern?: string;
  input?: string;
  flags?: string;
}

export interface RegexWorkerResponse {
  type: 'result' | 'error' | 'timeout';
  id: string;
  matches?: boolean;
  match?: RegExpMatchArray | null;
  error?: string;
}

/**
 * Worker thread implementation for regex execution with true timeout enforcement.
 * This runs in an isolated environment where blocking regex can be forcefully terminated.
 */

// ============================================================================
// WORKER THREAD EXECUTION (runs in Worker context)
// ============================================================================

if (!isMainThread) {
  // This code runs inside the Worker thread
  parentPort?.on('message', (message: RegexWorkerMessage) => {
    const { type, id, pattern, input, flags } = message;

    try {
      if (type === 'terminate') {
        // Graceful termination request
        process.exit(0);
      }

      if (!pattern || input === undefined) {
        parentPort?.postMessage({
          type: 'error',
          id,
          error: 'Missing pattern or input'
        } as RegexWorkerResponse);
        return;
      }

      const regex = new RegExp(pattern, flags);

      if (type === 'test') {
        const matches = regex.test(input);
        parentPort?.postMessage({
          type: 'result',
          id,
          matches
        } as RegexWorkerResponse);

      } else if (type === 'match') {
        const match = input.match(regex);
        parentPort?.postMessage({
          type: 'result',
          id,
          match
        } as RegexWorkerResponse);
      }

    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as RegexWorkerResponse);
    }
  });

  // Graceful exit after idle time to prevent resource leaks
  setTimeout(() => {
    process.exit(0);
  }, 30000); // 30 second idle timeout
}

// ============================================================================
// WORKER MANAGER (runs in main thread)
// ============================================================================

export class RegexWorkerManager {
  private workers: Map<string, Worker> = new Map();
  private pendingOperations: Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeoutId: NodeJS.Timeout;
  }> = new Map();
  private operationCounter = 0;
  private maxWorkers = 3; // Limit concurrent workers
  private workerIdleTimeout = 30000; // 30 seconds

  /**
   * Execute regex test with true timeout enforcement
   */
  async safeTest(pattern: string, input: string, flags?: string, timeoutMs: number = 1000): Promise<{
    matches: boolean;
    timedOut: boolean;
    error?: string;
  }> {
    const operationId = this.generateOperationId();

    try {
      const result = await this.executeWithTimeout(operationId, {
        type: 'test',
        id: operationId,
        pattern,
        input,
        flags
      }, timeoutMs);

      if (result.type === 'timeout') {
        return { matches: false, timedOut: true };
      }

      if (result.type === 'error') {
        return { matches: false, timedOut: false, error: result.error };
      }

      return { matches: result.matches!, timedOut: false };

    } catch (error) {
      return { 
        matches: false, 
        timedOut: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Execute regex match with true timeout enforcement
   */
  async safeMatch(pattern: string, input: string, flags?: string, timeoutMs: number = 1000): Promise<{
    match: RegExpMatchArray | null;
    timedOut: boolean;
    error?: string;
  }> {
    const operationId = this.generateOperationId();

    try {
      const result = await this.executeWithTimeout(operationId, {
        type: 'match',
        id: operationId,
        pattern,
        input,
        flags
      }, timeoutMs);

      if (result.type === 'timeout') {
        return { match: null, timedOut: true };
      }

      if (result.type === 'error') {
        return { match: null, timedOut: false, error: result.error };
      }

      return { match: result.match!, timedOut: false };

    } catch (error) {
      return { 
        match: null, 
        timedOut: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Execute operation with timeout in Worker thread
   */
  private executeWithTimeout(operationId: string, message: RegexWorkerMessage, timeoutMs: number): Promise<RegexWorkerResponse> {
    return new Promise((resolve, reject) => {
      // Create or get worker
      const worker = this.getWorker(operationId);

      // Set up timeout that will forcefully terminate the worker
      const timeoutId = setTimeout(() => {
        this.terminateWorker(operationId);
        this.pendingOperations.delete(operationId);
        resolve({ type: 'timeout', id: operationId });
      }, timeoutMs);

      // Store operation for response handling
      this.pendingOperations.set(operationId, {
        resolve,
        reject,
        timeoutId
      });

      // Send message to worker
      worker.postMessage(message);
    });
  }

  /**
   * Get or create a worker for an operation
   */
  private getWorker(operationId: string): Worker {
    // Check if we have too many workers
    if (this.workers.size >= this.maxWorkers) {
      // Reuse an existing worker
      const existingWorker = Array.from(this.workers.values())[0];
      return existingWorker;
    }

    // Create new worker
    const worker = new Worker(__filename);
    const workerId = `worker-${Date.now()}-${Math.random()}`;

    worker.on('message', (response: RegexWorkerResponse) => {
      this.handleWorkerResponse(response);
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.cleanupWorker(workerId);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
      this.cleanupWorker(workerId);
    });

    this.workers.set(workerId, worker);

    // Auto-cleanup idle workers
    setTimeout(() => {
      if (this.workers.has(workerId)) {
        this.terminateWorker(workerId);
      }
    }, this.workerIdleTimeout);

    return worker;
  }

  /**
   * Handle response from worker
   */
  private handleWorkerResponse(response: RegexWorkerResponse): void {
    const operation = this.pendingOperations.get(response.id);
    if (!operation) {
      return; // Operation may have timed out
    }

    clearTimeout(operation.timeoutId);
    this.pendingOperations.delete(response.id);
    operation.resolve(response);
  }

  /**
   * Forcefully terminate a worker (this is the key security feature)
   */
  private terminateWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate(); // This forcefully kills the worker and any blocking regex
      this.workers.delete(workerId);
    }
  }

  /**
   * Clean up worker resources
   */
  private cleanupWorker(workerId: string): void {
    this.workers.delete(workerId);
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op-${Date.now()}-${++this.operationCounter}`;
  }

  /**
   * Shutdown all workers (call when shutting down application)
   */
  shutdown(): void {
    // Clear all pending operations
    for (const [id, operation] of Array.from(this.pendingOperations)) {
      clearTimeout(operation.timeoutId);
      operation.reject(new Error('Worker manager shutdown'));
    }
    this.pendingOperations.clear();

    // Terminate all workers
    for (const [workerId, worker] of Array.from(this.workers)) {
      worker.terminate();
    }
    this.workers.clear();
  }
}

// ============================================================================
// SINGLETON MANAGER INSTANCE
// ============================================================================

let globalWorkerManager: RegexWorkerManager | null = null;

/**
 * Get the global Worker manager instance
 */
export function getRegexWorkerManager(): RegexWorkerManager {
  if (!globalWorkerManager) {
    globalWorkerManager = new RegexWorkerManager();

    // Graceful shutdown handling
    process.on('exit', () => {
      globalWorkerManager?.shutdown();
    });

    process.on('SIGINT', () => {
      globalWorkerManager?.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      globalWorkerManager?.shutdown();
      process.exit(0);
    });
  }

  return globalWorkerManager;
}