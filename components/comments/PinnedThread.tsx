"use client";

import Image from "next/image";

type Props = {
  onFocus?: (threadId: string) => void;
};

export const PinnedThread = ({ onFocus, ...props }: Props) => {
  // Componente simplificado sem Liveblocks
  return (
    <div className='absolute flex cursor-pointer gap-4' {...props}>
      <div className='relative flex h-9 w-9 select-none items-center justify-center rounded-bl-full rounded-br-full rounded-tl-md rounded-tr-full bg-white shadow'>
        <Image
          src='/placeholder-avatar.png'
          alt='Usuário'
          width={28}
          height={28}
          draggable={false}
          className='rounded-full'
        />
      </div>
    </div>
  );
};
