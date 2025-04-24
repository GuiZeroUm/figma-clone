import { useMemo } from "react";

import { useThreads } from "@/lib/presenceHooks";

// Retorna um z-index padrão para novos threads
export const useMaxZIndex = () => {
  // Como não temos mais threads do Liveblocks, retornamos um valor fixo
  return 1;
};
