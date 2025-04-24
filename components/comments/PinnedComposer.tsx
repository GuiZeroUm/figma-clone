"use client";

import Image from "next/image";

type Props = {
  onComposerSubmit?: any;
};

const PinnedComposer = ({ onComposerSubmit, ...props }: Props) => {
  return (
    <div className='absolute flex gap-4' {...props}>
      <div className='relative flex h-9 w-9 select-none items-center justify-center rounded-bl-full rounded-br-full rounded-tl-md rounded-tr-full bg-white shadow'>
        <Image
          src='/placeholder-avatar.png'
          alt='Usuário'
          width={28}
          height={28}
          className='rounded-full'
        />
      </div>
      <div className='flex min-w-96 flex-col overflow-hidden rounded-lg bg-white p-2 text-sm shadow'>
        {/* Componente simplificado sem Liveblocks */}
        <div className='rounded border p-2'>Comentários desativados</div>
      </div>
    </div>
  );
};

export default PinnedComposer;
