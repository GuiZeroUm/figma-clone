import React from "react";
import { X } from "@phosphor-icons/react";

interface KVModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const KVModal = ({ isOpen, onClose, children }: KVModalProps) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black bg-opacity-50'>
      <div className='relative max-h-[90vh] w-[90vw] max-w-6xl overflow-y-auto rounded-lg bg-primary-black p-6'>
        <button
          onClick={onClose}
          className='absolute right-4 top-4 z-10 text-primary-grey-300 hover:text-primary-grey-100'
        >
          <X size={24} />
        </button>
        {children}
      </div>
    </div>
  );
};

export default KVModal;
