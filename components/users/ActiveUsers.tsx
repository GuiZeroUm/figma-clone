"use client";

import { useMemo } from "react";

import { generateRandomName } from "@/lib/utils";
import { useOthers, useSelf } from "@/lib/presenceHooks";

import Avatar from "./Avatar";

const ActiveUsers = () => {
  /**
   * useOthers agora retorna uma lista vazia após a remoção do Liveblocks
   */
  const others = useOthers();

  /**
   * useSelf agora retorna null após a remoção do Liveblocks
   */
  const currentUser = useSelf();

  // Componente simplificado após a remoção do Liveblocks
  return (
    <div className='flex items-center justify-center gap-1'>
      <Avatar name='Você' otherStyles='border-[3px] border-primary-green' />
    </div>
  );
};

export default ActiveUsers;
