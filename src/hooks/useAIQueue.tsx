import { useRef, useCallback } from 'react';

interface QueueItem {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export function useAIQueue() {
  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift();
      if (!item) break;

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }

      // Delay entre requisições para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    processingRef.current = false;
  }, []);

  const enqueue = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      queueRef.current.push({
        fn,
        resolve,
        reject
      });
      processQueue();
    });
  }, [processQueue]);

  return { enqueue };
}
