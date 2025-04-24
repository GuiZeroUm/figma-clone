"use client";

import { useState } from "react";

// Hook para substituir useMyPresence com funcionalidade vazia
export function useMyPresence() {
  const [presence, setPresence] = useState({
    cursor: null,
    cursorColor: null,
    editingText: null,
  });

  const updatePresence = (newPresence: any) => {
    setPresence((prev) => ({ ...prev, ...newPresence }));
  };

  return [presence, updatePresence];
}

// Hook para substituir useOthers com funcionalidade vazia
export function useOthers() {
  return [];
}

// Hook para substituir useSelf
export function useSelf() {
  return null;
}

// Hook para substituir useBroadcastEvent
export function useBroadcastEvent() {
  return (event: any) => {
    // Implementação vazia, mas aceita um argumento
    console.log("Broadcast event simulado (desativado):", event);
  };
}

// Hook para substituir useEventListener
export function useEventListener(callback: any) {
  // Implementação vazia
}

// Hook para substituir useThreads
export function useThreads() {
  return { threads: [] };
}

// Hook para substituir useUser
export function useUser() {
  return { user: null };
}

// Hook para substituir useCreateThread
export function useCreateThread() {
  return () => Promise.resolve();
}

// Hook para substituir useEditThreadMetadata
export function useEditThreadMetadata() {
  return () => Promise.resolve();
}
