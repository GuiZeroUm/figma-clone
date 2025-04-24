"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { LocalMap } from "./localStore";

// Definições de tipos que refletem as do Liveblocks
type CanvasStorage = {
  canvasObjects: LocalMap<string, any>;
  get: (key: string) => LocalMap<string, any>;
};

interface LocalStoreContextType {
  storage: CanvasStorage;
  useStorage: <T>(selector: (storage: CanvasStorage) => T) => T;
  useMutation: <T, Args extends any[]>(
    callback: (context: { storage: CanvasStorage }, ...args: Args) => T,
    deps?: React.DependencyList
  ) => (...args: Args) => T;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Criar o contexto
const LocalStoreContext = createContext<LocalStoreContextType | undefined>(
  undefined
);

// History para undo/redo
type HistoryEntry = Map<string, any>;

interface LocalStoreProviderProps {
  children: ReactNode;
  initialStorage?: {
    canvasObjects?: Iterable<readonly [string, any]>;
  };
}

export function LocalStoreProvider({
  children,
  initialStorage,
}: LocalStoreProviderProps) {
  // Inicializa o armazenamento
  const canvasObjectsMap = new LocalMap<string, any>(
    initialStorage?.canvasObjects
  );

  const [storage] = useState<CanvasStorage>(() => {
    const storageObj: CanvasStorage = {
      canvasObjects: canvasObjectsMap,
      get: (key: string) => {
        if (key === "canvasObjects") {
          return canvasObjectsMap;
        }
        throw new Error(`Key ${key} not found in storage`);
      },
    };
    return storageObj;
  });

  // Para notificar atualizações no armazenamento
  const [, setUpdateTrigger] = useState(0);

  // Para histórico de undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isPendingChange, setIsPendingChange] = useState(false);

  // Subscreve a alterações no armazenamento
  useEffect(() => {
    const unsubscribe = storage.canvasObjects.subscribe(() => {
      setUpdateTrigger((val) => val + 1);
      setIsPendingChange(true);
    });

    return unsubscribe;
  }, [storage.canvasObjects]);

  // Salva alterações no histórico
  useEffect(() => {
    if (isPendingChange) {
      // Cria uma cópia do estado atual
      const currentState = new Map();
      for (const [key, value] of storage.canvasObjects.entries()) {
        currentState.set(key, JSON.parse(JSON.stringify(value)));
      }

      // Remove entradas futuras se tivermos feito undo anteriormente
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(currentState);

      // Limita o tamanho do histórico (opcional)
      if (newHistory.length > 100) {
        newHistory.shift();
      }

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setIsPendingChange(false);
    }
  }, [isPendingChange, history, historyIndex, storage.canvasObjects]);

  // Hook para selecionar dados do armazenamento
  const useStorage = useCallback(
    <T,>(selector: (storage: CanvasStorage) => T): T => {
      return selector(storage);
    },
    [storage]
  );

  // Função para criar mutações semelhantes às do Liveblocks
  const useMutation = useCallback(
    <T, Args extends any[]>(
      callback: (context: { storage: CanvasStorage }, ...args: Args) => T,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      deps: React.DependencyList = []
    ) => {
      return (...args: Args): T => {
        return callback({ storage }, ...args);
      };
    },
    [storage]
  );

  // Implementação do undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetState = history[targetIndex];

      // Limpa o armazenamento atual
      storage.canvasObjects.clear();

      // Restaura do histórico
      for (const [key, value] of targetState.entries()) {
        storage.canvasObjects.set(key, value);
      }

      setHistoryIndex(targetIndex);
    }
  }, [history, historyIndex, storage.canvasObjects]);

  // Implementação do redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetState = history[targetIndex];

      // Limpa o armazenamento atual
      storage.canvasObjects.clear();

      // Restaura do histórico
      for (const [key, value] of targetState.entries()) {
        storage.canvasObjects.set(key, value);
      }

      setHistoryIndex(targetIndex);
    }
  }, [history, historyIndex, storage.canvasObjects]);

  const value = {
    storage,
    useStorage,
    useMutation,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };

  return (
    <LocalStoreContext.Provider value={value}>
      {children}
    </LocalStoreContext.Provider>
  );
}

// Hook para acessar o contexto
export function useLocalStore() {
  const context = useContext(LocalStoreContext);
  if (!context) {
    throw new Error("useLocalStore must be used within a LocalStoreProvider");
  }
  return context;
}

// Hooks específicos para compatibilidade com o código existente
export function useRedo() {
  return useLocalStore().redo;
}

export function useUndo() {
  return useLocalStore().undo;
}

export function useCanRedo() {
  return useLocalStore().canRedo;
}

export function useCanUndo() {
  return useLocalStore().canUndo;
}

export const useStorage = <T,>(selector: (storage: CanvasStorage) => T): T => {
  return useLocalStore().useStorage(selector);
};

export const useMutation = <T, Args extends any[]>(
  callback: (context: { storage: CanvasStorage }, ...args: Args) => T,
  deps: React.DependencyList = []
) => {
  return useLocalStore().useMutation(callback, deps);
};
