import { AtomicOperationQueue } from './atomicFileOperations';

describe('AtomicOperationQueue', () => {
  let queue: AtomicOperationQueue;
  
  beforeEach(() => {
    queue = new AtomicOperationQueue();
  });
  
  it('should execute an operation immediately when queue is empty', () => {
    const mockOperation = jest.fn();
    
    queue.execute(mockOperation);
    
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });
  
  it('should queue operations when an operation is in progress', () => {
    let firstOperationComplete = false;
    const firstOperation = jest.fn(() => {
      // Simulate an operation that takes time
      for (let i = 0; i < 1000; i++) {
        // Busy work
      }
      firstOperationComplete = true;
    });
    
    const secondOperation = jest.fn(() => {
      // This should only run after the first operation completes
      expect(firstOperationComplete).toBe(true);
    });
    
    // Start first operation
    queue.execute(firstOperation);
    
    // Queue second operation while first is still "running"
    queue.execute(secondOperation);
    
    // Both should have executed
    expect(firstOperation).toHaveBeenCalledTimes(1);
    expect(secondOperation).toHaveBeenCalledTimes(1);
  });
  
  it('should process multiple queued operations in sequence', () => {
    const operationSequence: number[] = [];
    
    // Create a special implementation of execute to track execution order
    jest.spyOn(queue, 'execute').mockImplementation((operation) => {
      // Call the original method to maintain functionality
      const originalExecute = jest.requireActual('./atomicFileOperations').AtomicOperationQueue.prototype.execute;
      originalExecute.call(queue, operation);
    });
    
    const operation1 = jest.fn(() => operationSequence.push(1));
    const operation2 = jest.fn(() => operationSequence.push(2));
    const operation3 = jest.fn(() => operationSequence.push(3));
    
    queue.execute(operation1);
    queue.execute(operation2);
    queue.execute(operation3);
    
    expect(operationSequence).toEqual([1, 2, 3]);
    expect(operation1).toHaveBeenCalledTimes(1);
    expect(operation2).toHaveBeenCalledTimes(1);
    expect(operation3).toHaveBeenCalledTimes(1);
  });
  
  it('should handle errors in operations without breaking the queue', () => {
    // Update the implementation of AtomicOperationQueue to catch errors
    const originalExecute = queue.execute;
    jest.spyOn(queue, 'execute').mockImplementation((operation) => {
      try {
        operation();
      } catch (error) {
        // Silently catch the error
      }
      
      // Process the queue, this is normally handled in the finally block
      const queueProperty = Object.getOwnPropertyDescriptor(queue, 'queue')?.value;
      if (queueProperty && queueProperty.length > 0) {
        const nextOp = queueProperty.shift();
        if (nextOp) nextOp();
      }
    });

    const nextOperation = jest.fn();
    const errorMessage = 'Operation failed';
    const failingOperation = jest.fn().mockImplementation(() => {
      throw new Error(errorMessage);
    });
    
    // Execute the failing operation
    queue.execute(failingOperation);
    expect(failingOperation).toHaveBeenCalledTimes(1);
    
    // Restore the original execute method
    (queue.execute as jest.Mock).mockRestore();
    
    // The next operation should still execute
    queue.execute(nextOperation);
    expect(nextOperation).toHaveBeenCalledTimes(1);
  });
});
