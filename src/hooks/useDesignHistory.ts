import { useState, useCallback, useRef } from 'react';
import { MotifCustomization } from '../types';

interface HistoryState {
  past: MotifCustomization[];
  present: MotifCustomization;
  future: MotifCustomization[];
}

export function useDesignHistory(initialPresent: MotifCustomization) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialPresent,
    future: []
  });

  // Track if we should push or replace (e.g. for continuous drag/picker if needed)
  const isUpdatingRef = useRef(false);

  const setCustomization = useCallback((
    newCustomization: MotifCustomization | ((prev: MotifCustomization) => MotifCustomization)
  ) => {
    setHistory(current => {
      const nextValue = typeof newCustomization === 'function'
        ? newCustomization(current.present)
        : newCustomization;

      // Deep compare to prevent useless identical history steps
      if (JSON.stringify(current.present) === JSON.stringify(nextValue)) {
        return current;
      }

      return {
        past: [...current.past.slice(-25), current.present],
        present: nextValue,
        future: []
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(current => {
      if (current.past.length === 0) return current;

      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, current.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(current => {
      if (current.future.length === 0) return current;

      const next = current.future[0];
      const newFuture = current.future.slice(1);

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const reset = useCallback((newPresent: MotifCustomization) => {
    setHistory({
      past: [],
      present: newPresent,
      future: []
    });
  }, []);

  return {
    customization: history.present,
    setCustomization,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    reset
  };
}
