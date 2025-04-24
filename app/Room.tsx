"use client";

import { LocalMap } from "@/lib/localStore";
import { LocalStoreProvider } from "@/lib/localStore.context";
import Loader from "@/components/Loader";
import { Suspense } from "react";

const Room = ({ children }: { children: React.ReactNode }) => {
  return (
    <LocalStoreProvider
      initialStorage={{
        canvasObjects: new Map(),
      }}
    >
      <Suspense fallback={<Loader />}>{children}</Suspense>
    </LocalStoreProvider>
  );
};

export default Room;
