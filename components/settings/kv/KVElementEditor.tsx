import React from "react";
import { ElementStyles } from "../../../types/kv";
import { fabric } from "fabric";

interface KVElementEditorProps {
  selectedElement: fabric.Object | null;
  elementStyles: ElementStyles;
  onStyleChange: (property: string, value: number | string) => void;
}

const KVElementEditor = ({
  selectedElement,
  elementStyles,
  onStyleChange,
}: KVElementEditorProps) => {
  if (!selectedElement) return null;

  return (
    <div className='flex flex-col gap-4 rounded-lg bg-primary-black p-4'>
      <h3 className='text-lg font-semibold text-primary-grey-300'>
        Editar Elemento
      </h3>

      {/* Controles básicos */}
      <div className='space-y-4'>
        <div className='flex flex-col gap-2'>
          <label className='text-sm text-primary-grey-300'>
            Tamanho da Fonte
          </label>
          <input
            type='range'
            min='12'
            max='120'
            value={elementStyles.fontSize}
            onChange={(e) => onStyleChange("fontSize", e.target.value)}
            className='w-full'
          />
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-sm text-primary-grey-300'>Cor do Texto</label>
          <input
            type='color'
            value={elementStyles.fill}
            onChange={(e) => onStyleChange("fill", e.target.value)}
            className='h-10 w-full'
          />
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-sm text-primary-grey-300'>Contorno</label>
          <div className='flex gap-2'>
            <input
              type='color'
              value={elementStyles.stroke}
              onChange={(e) => onStyleChange("stroke", e.target.value)}
              className='h-10 w-1/2'
            />
            <input
              type='range'
              min='0'
              max='10'
              value={elementStyles.strokeWidth}
              onChange={(e) => onStyleChange("strokeWidth", e.target.value)}
              className='w-1/2'
            />
          </div>
        </div>

        {/* Controles de sombra */}
        <div className='space-y-2'>
          <label className='text-sm text-primary-grey-300'>Sombra</label>

          <div className='flex gap-2'>
            <input
              type='color'
              value={elementStyles.shadow.color}
              onChange={(e) => onStyleChange("shadow.color", e.target.value)}
              className='h-10 w-1/3'
            />
            <input
              type='range'
              min='0'
              max='50'
              value={elementStyles.shadow.blur}
              onChange={(e) => onStyleChange("shadow.blur", e.target.value)}
              className='w-2/3'
              title='Desfoque da sombra'
            />
          </div>

          <div className='flex gap-2'>
            <div className='w-1/2'>
              <input
                type='range'
                min='-50'
                max='50'
                value={elementStyles.shadow.offsetX}
                onChange={(e) =>
                  onStyleChange("shadow.offsetX", e.target.value)
                }
                className='w-full'
                title='Deslocamento X da sombra'
              />
            </div>
            <div className='w-1/2'>
              <input
                type='range'
                min='-50'
                max='50'
                value={elementStyles.shadow.offsetY}
                onChange={(e) =>
                  onStyleChange("shadow.offsetY", e.target.value)
                }
                className='w-full'
                title='Deslocamento Y da sombra'
              />
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-sm text-primary-grey-300'>Escala</label>
          <input
            type='range'
            min='0.1'
            max='3'
            step='0.1'
            value={elementStyles.scale}
            onChange={(e) => onStyleChange("scale", e.target.value)}
            className='w-full'
          />
        </div>
      </div>
    </div>
  );
};

export default KVElementEditor;
