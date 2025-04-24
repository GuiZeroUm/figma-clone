"use client";

import { useState } from "react";
import { NewThread } from "./NewThread";

export const CommentsOverlay = () => {
  // Componente simplificado sem Liveblocks
  return (
    <div className='absolute left-0 top-0 h-full w-full'>
      <NewThread>
        <div className='pointer-events-none absolute left-0 top-0 h-full w-full' />
      </NewThread>
    </div>
  );
};
