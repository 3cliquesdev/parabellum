import { useState, useCallback, useRef, useEffect } from "react";

interface UseUndoRedoOptions<T> {
  initialState: T;
  maxHistory?: number;
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T) => void;
  push: (newState: T) => void;
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

  // Sync with initial state changes (e.g., when loading from DB)
  useEffect(() => {
    if (JSON.stringify(initialState) !== JSON.stringify(historyRef.current[0])) {
      historyRef.current = [initialState];
      indexRef.current = 0;
      setStateInternal(initialState);
      forceUpdate({});
    }
  }, [initialState]);

  const push = useCallback((newState: T) => {
    // Don't push if state is the same
    if (JSON.stringify(newState) === JSON.stringify(historyRef.current[indexRef.current])) {
      return;
    }

    // Remove future states if we're in the middle of history
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
    forceUpdate({});
  }, [maxHistory]);

  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      indexRef.current--;
      setStateInternal(historyRef.current[indexRef.current]);
      forceUpdate({});
    }
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current++;
      setStateInternal(historyRef.current[indexRef.current]);
      forceUpdate({});
    }
  }, []);

  const reset = useCallback((newState: T) => {
    historyRef.current = [newState];
    indexRef.current = 0;
    setStateInternal(newState);
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
