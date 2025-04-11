import React, { useState, useRef, useEffect } from "react";
import { fabric } from "fabric";
import KVModal from "./KVModal";
import KVCanvas from "./KVCanvas";

interface KVGridSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GridCell {
  id: string;
  row: number;
  col: number;
  content: any;
}

const GRID_ROWS = 3;
const GRID_COLS = 3;
const CELL_WIDTH = 360;
const CELL_HEIGHT = 640;

const KVGridSystem = ({ isOpen, onClose }: KVGridSystemProps) => {
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);

  // Inicializar o grid
  useEffect(() => {
    const initialGrid: GridCell[][] = [];
    for (let i = 0; i < GRID_ROWS; i++) {
      const row: GridCell[] = [];
      for (let j = 0; j < GRID_COLS; j++) {
        row.push({
          id: `cell-${i}-${j}`,
          row: i,
          col: j,
          content: null,
        });
      }
      initialGrid.push(row);
    }
    setGrid(initialGrid);
  }, []);

  // Inicializar o canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: CELL_WIDTH * GRID_COLS,
      height: CELL_HEIGHT * GRID_ROWS,
      backgroundColor: "#1a1a1a",
    });

    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  // Desenhar o grid no canvas
  useEffect(() => {
    if (!canvas) return;

    // Limpar o canvas
    canvas.clear();

    // Desenhar as células do grid
    grid.forEach((row, i) => {
      row.forEach((cell, j) => {
        const rect = new fabric.Rect({
          left: j * CELL_WIDTH,
          top: i * CELL_HEIGHT,
          width: CELL_WIDTH,
          height: CELL_HEIGHT,
          fill: "transparent",
          stroke: "#333",
          strokeWidth: 1,
        });

        canvas.add(rect);

        // Se a célula tiver conteúdo, adicionar ao canvas
        if (cell.content) {
          // Implementar a lógica para adicionar o conteúdo da célula
        }
      });
    });

    canvas.renderAll();
  }, [canvas, grid]);

  const handleCellClick = (cell: GridCell) => {
    setSelectedCell(cell);
    // Implementar a lógica para editar a célula
  };

  return (
    <KVModal isOpen={isOpen} onClose={onClose}>
      <div className='flex flex-col gap-4 p-4'>
        <h2 className='text-xl font-bold text-primary-grey-300'>Grid KV</h2>
        <div className='relative'>
          <canvas ref={canvasRef} />
          {selectedCell && (
            <div className='absolute right-4 top-4 w-64 rounded-lg bg-primary-black p-4 shadow-lg'>
              <h3 className='mb-2 text-lg font-semibold text-primary-grey-300'>
                Célula {selectedCell.row + 1}x{selectedCell.col + 1}
              </h3>
              {/* Adicionar controles para editar a célula */}
            </div>
          )}
        </div>
      </div>
    </KVModal>
  );
};

export default KVGridSystem;
