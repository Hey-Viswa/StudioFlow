import { useState, useCallback } from 'react';

export default function useUndoRedo(initialState = []) {
  const [history, setHistory] = useState([initialState]);
  const [pointer, setPointer] = useState(0);

  const set = useCallback((newState) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, pointer + 1);
      newHistory.push(newState);
      return newHistory;
    });
    setPointer((prev) => prev + 1);
  }, [pointer]);

  const undo = useCallback(() => {
    if (pointer > 0) {
      setPointer((prev) => prev - 1);
      return history[pointer - 1];
    }
    return undefined; // No more undo
  }, [pointer, history]);

  const redo = useCallback(() => {
    if (pointer < history.length - 1) {
      setPointer((prev) => prev + 1);
      return history[pointer + 1];
    }
    return undefined;
  }, [pointer, history]);

  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  return { set, undo, redo, canUndo, canRedo, current: history[pointer] };
}
