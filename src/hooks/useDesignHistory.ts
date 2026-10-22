import { useState, useCallback } from 'react';
import { MotifCustomization, PlainTileCadence } from '../types';

export interface DesignCompositionState {
  repeatX: number;
  repeatY: number;
  patternUnitX?: number;
  patternUnitY?: number;
  spacingX: number;
  spacingY: number;
  staggered: boolean;
  plainTileCadence: PlainTileCadence;
  cellOverrides: Record<string, boolean | string>;
  cellRotations: Record<string, number>;
  showPlainBackground: boolean;
  secondaryMotifId: string | null;
  combineRatio: 'alternate' | 'single';
}

export interface DesignSnapshot {
  motifId: string;
  customization: MotifCustomization;
  composition: DesignCompositionState;
}

interface HistoryState {
  past: DesignSnapshot[];
  present: DesignSnapshot;
  future: DesignSnapshot[];
}

export function useDesignHistory(initialPresent: DesignSnapshot, maxHistory = 40) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialPresent,
    future: []
  });

  const pushSnapshot = useCallback((
    newSnapshot: DesignSnapshot | ((prev: DesignSnapshot) => DesignSnapshot)
  ) => {
    setHistory(current => {
      const nextValue = typeof newSnapshot === 'function'
        ? (newSnapshot as (prev: DesignSnapshot) => DesignSnapshot)(current.present)
        : newSnapshot;

      // Deep compare to avoid redundant identical history steps
      if (JSON.stringify(current.present) === JSON.stringify(nextValue)) {
        return current;
      }

      return {
        past: [...current.past.slice(-maxHistory), current.present],
        present: nextValue,
        future: []
      };
    });
  }, [maxHistory]);

  const undo = useCallback((): DesignSnapshot | null => {
    let restored: DesignSnapshot | null = null;
    setHistory(current => {
      if (current.past.length === 0) return current;

      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, current.past.length - 1);
      restored = previous;

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future]
      };
    });
    return restored;
  }, []);

  const redo = useCallback((): DesignSnapshot | null => {
    let restored: DesignSnapshot | null = null;
    setHistory(current => {
      if (current.future.length === 0) return current;

      const next = current.future[0];
      const newFuture = current.future.slice(1);
      restored = next;

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture
      };
    });
    return restored;
  }, []);

  const reset = useCallback((newPresent: DesignSnapshot) => {
    setHistory({
      past: [],
      present: newPresent,
      future: []
    });
  }, []);

  return {
    snapshot: history.present,
    customization: history.present.customization,
    compositionDesign: history.present.composition,
    pushSnapshot,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    reset
  };
}
