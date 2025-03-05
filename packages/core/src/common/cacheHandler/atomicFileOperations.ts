/**
 * Manages a queue of operations to ensure atomic file access
 */
export class AtomicOperationQueue {
  private isExecuting = false;
  private queue: Array<() => void> = [];

  /**
   * Execute an operation atomically or queue it if another operation is in progress
   */
  execute(operation: () => void): void {
    if (this.isExecuting) {
      this.queue.push(operation);
      return;
    }

    this.isExecuting = true;

    try {
      operation();
      this.processQueue();
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Process the next operation in the queue
   */
  private processQueue(): void {
    const nextOperation = this.queue.shift();
    if (nextOperation) {
      this.execute(nextOperation);
    }
  }
}
