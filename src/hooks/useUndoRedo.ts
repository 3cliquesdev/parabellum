import { useState, useCallback, useRef, useEffect } from "react";

interface UseUndoRedoOptions<T> {
  initialState: T;
  maxHistory?: number;
}

interface PushOptions {
  merge?: boolean;
  mergeKey?: string;
  mergeWindowMs?: number;
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T, options?: PushOptions) => void;
  push: (newState: T, options?: PushOptions) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (newState: T) => void;
}

export function useUndoRedo<T>({ 
  initialState, 
  maxHistory = 50 
}: UseUndoRedoOptions<T>): UseUndoRedoReturn<T> {
  const [state, setStateInternal] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const indexRef = useRef(0);
  const [, forceUpdate] = useState({});
  
  // Merge tracking refs
  const lastPushAtRef = useRef<number>(0);
  const lastMergeKeyRef = useRef<string | null>(null);

  // Sync with initial state changes (e.g., when loading from DB)
  useEffect(() => {
    if (JSON.stringify(initialState) !== JSON.stringify(historyRef.current[0])) {
      historyRef.current = [initialState];
      indexRef.current = 0;
      setStateInternal(initialState);
      forceUpdate({});
    }
  }, [initialState]);

  const push = useCallback((newState: T, options?: PushOptions) => {
    const { merge = false, mergeKey, mergeWindowMs = 800 } = options || {};
    
    // Don't push if state is the same
    if (JSON.stringify(newState) === JSON.stringify(historyRef.current[indexRef.current])) {
      return;
    }

    const now = Date.now();
    const timeSinceLastPush = now - lastPushAtRef.current;
    const shouldMerge = merge && 
                        mergeKey && 
                        mergeKey === lastMergeKeyRef.current && 
                        timeSinceLastPush < mergeWindowMs;

    if (shouldMerge) {
      // Replace current state instead of adding new entry
      historyRef.current[indexRef.current] = newState;
      setStateInternal(newState);
      lastPushAtRef.current = now;
      forceUpdate({});
      return;
    }

    // Normal push: remove future states if we're in the middle of history
    const newHistory = historyRef.current.slice(0, indexRef.current + 1);
    newHistory.push(newState);
    
    // Limit history size
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    } else {
      indexRef.current++;
    }
    
    historyRef.current = newHistory;
    setStateInternal(newState);
    
    // Update merge tracking
    lastPushAtRef.current = now;
    lastMergeKeyRef.current = mergeKey || null;
    
    forceUpdate({});
  }, [maxHistory]);

  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      indexRef.current--;
      setStateInternal(historyRef.current[indexRef.current]);
      // Reset merge tracking on undo
      lastMergeKeyRef.current = null;
      forceUpdate({});
    }
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current++;
      setStateInternal(historyRef.current[indexRef.current]);
      // Reset merge tracking on redo
      lastMergeKeyRef.current = null;
      forceUpdate({});
    }
  }, []);

  const reset = useCallback((newState: T) => {
    historyRef.current = [newState];
    indexRef.current = 0;
    setStateInternal(newState);
    lastMergeKeyRef.current = null;
    forceUpdate({});
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  return { 
    state, 
    setState: push,
    push, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    reset
  };
}
