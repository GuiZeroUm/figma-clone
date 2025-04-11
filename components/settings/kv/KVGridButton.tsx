import React from "react";
import { Plus } from "lucide-react";

interface KVGridButtonProps {
  onClick: () => void;
}

const KVGridButton = ({ onClick }: KVGridButtonProps) => {
  return (
    <button
      onClick={onClick}
      className='flex items-center justify-center gap-2 rounded-md bg-primary-green px-4 py-2 text-sm font-medium text-primary-black hover:bg-primary-green/90'
    >
      <Plus size={16} />
      Criar nova grid KV
    </button>
  );
};

export default KVGridButton;
