import React, { useState, useRef } from "react";
import { fabric } from "fabric";
import { v4 as uuidv4 } from "uuid";
import { Plus, Columns, Grid, Rows, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import KVModal from "./KVModal";
import KVElementEditor from "./KVElementEditor";
import KVCanvas from "./KVCanvas";
import {
  ElementStyles,
  ExtendedFabricObject,
  FormData,
} from "../../../types/kv";

// CSS para a animação
const fadeInAnimation = {
  "@keyframes fadeIn": {
    "0%": { opacity: 0 },
    "100%": { opacity: 1 },
  },
  animation: "fadeIn 0.3s ease-in-out",
};

interface KVGridSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GridCell extends fabric.Rect {
  cellId?: string;
  productData?: {
    description: string;
    price: string;
    imageUrl?: string;
  };
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const DEFAULT_PRODUCT_IMAGE =
  "https://thumb.ac-illust.com/b1/b170870007dfa419295d949814474ab2_t.jpeg";

// Grid layout presets
const GRID_LAYOUTS = {
  twoByTwo: { cols: 2, rows: 2 },
  threeByThree: { cols: 3, rows: 3 },
  twoByOne: { cols: 2, rows: 1 },
  oneByTwo: { cols: 1, rows: 2 },
  threeByOne: { cols: 3, rows: 1 },
  oneByThree: { cols: 1, rows: 3 },
};

const KVGridSystem = ({ isOpen, onClose }: KVGridSystemProps) => {
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [editorCanvas, setEditorCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedElement, setSelectedElement] = useState<fabric.Object | null>(
    null
  );
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridGap, setGridGap] = useState(10);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [currentLayout, setCurrentLayout] = useState<{
    cols: number;
    rows: number;
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [searchCode, setSearchCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Adicionar estados para controle de grid personalizada
  const [customRows, setCustomRows] = useState<number>(2);
  const [customCols, setCustomCols] = useState<number>(2);
  // Estado para controlar a remoção de fundo
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  // Estado para armazenar a imagem selecionada para remoção de fundo
  const [selectedProductImage, setSelectedProductImage] =
    useState<fabric.Image | null>(null);

  const [formData, setFormData] = useState<FormData>({
    description: "",
    price: "",
  });

  const [elementStyles, setElementStyles] = useState<ElementStyles>({
    fontSize: 42,
    fill: "#ffffff",
    left: CANVAS_WIDTH / 2,
    top: CANVAS_HEIGHT * 0.8,
    scale: 1,
    stroke: "",
    strokeWidth: 0,
    shadow: {
      color: "rgba(0,0,0,0)",
      blur: 0,
      offsetX: 0,
      offsetY: 0,
    },
  });

  // Adicionar novo estado para background
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);

  // Adicionar novo estado para escala da grid
  const [gridScale, setGridScale] = useState<number>(1);

  const handleCanvasReady = (canvas: fabric.Canvas) => {
    setEditorCanvas(canvas);

    console.log("Canvas inicializado");

    // Adicionar logger para eventos do canvas e detecção aprimorada de células
    canvas.on("mouse:down", (e) => {
      const target = e.target as fabric.Object;
      console.log("Mouse down no canvas", target);

      if (target) {
        console.log("Propriedades do objeto clicado:", {
          isGridCell: (target as any).isGridCell,
          cellId: (target as any).cellId,
          type: target.type,
        });

        // Verificar se o objeto clicado é uma célula de grid
        if ((target as any).cellId || (target as any).isGridCell) {
          console.log(
            "Célula detectada por mouse:down com ID:",
            (target as any).cellId
          );

          // Atualizar estado sem aplicar destaque visual
          setSelectedCell(target as GridCell);
          setSelectedElement(target);
          setShowProductSearch(true);
        } else {
          // Se clicar em outro lugar que não seja célula
          setSelectedCell(null);
          setShowProductSearch(false);
        }
      } else if (e.pointer) {
        // Quando clica em área vazia do canvas
        // Verificar se há uma célula sob o ponteiro
        const pointer = e.pointer as fabric.Point;
        const objects = canvas
          .getObjects()
          .filter((obj) => (obj as any).isGridCell);

        for (const obj of objects) {
          if (obj.containsPoint(pointer)) {
            console.log(
              "Célula encontrada por coordenada:",
              (obj as any).cellId
            );

            // Atualizar estado sem aplicar destaque visual
            setSelectedCell(obj as GridCell);
            setSelectedElement(obj);
            setShowProductSearch(true);
            break;
          }
        }
      }
    });

    canvas.on("object:selected", (e) => {
      const target = e.target as fabric.Object;
      console.log("Objeto selecionado:", target);
      console.log("Propriedades:", {
        isGridCell: (target as any).isGridCell,
        cellId: (target as any).cellId,
        elementType: (target as any).elementType,
        type: target.type,
      });

      setSelectedElement(target);

      // Check if the selected object is a grid cell
      if (target && (target as any).isGridCell) {
        console.log("Célula selecionada via object:selected:", target);
        setSelectedCell(target as GridCell);
        setShowProductSearch(true);
      } else if (target && (target as any).cellId) {
        // É um elemento dentro de uma célula (imagem, texto, etc.)
        console.log(
          "Elemento de uma célula selecionado:",
          (target as any).elementType
        );

        // Encontrar a célula pai para este elemento
        const cellId = (target as any).cellId;
        const parentCell = canvas
          .getObjects()
          .find(
            (obj) => (obj as any).isGridCell && (obj as any).cellId === cellId
          ) as GridCell;

        if (parentCell) {
          setSelectedCell(parentCell);
        }
      } else {
        console.log("Outro tipo de objeto selecionado:", target);
        setSelectedCell(null);
        setShowProductSearch(false);
      }

      if (target) {
        // Configurar os estilos com base no elemento selecionado
        const fontSize = (target as any).fontSize || 42;
        const fill = String((target as any).fill || "#ffffff");
        const shadow = target.shadow as fabric.Shadow | undefined;

        setElementStyles({
          fontSize,
          fill,
          left: target.left || 0,
          top: target.top || 0,
          scale: target.scaleX || 1,
          stroke: String((target as any).stroke || ""),
          strokeWidth: Number((target as any).strokeWidth || 0),
          shadow: shadow
            ? {
                color: String(shadow.color || "rgba(0,0,0,0)"),
                blur: Number(shadow.blur || 0),
                offsetX: Number(shadow.offsetX || 0),
                offsetY: Number(shadow.offsetY || 0),
              }
            : {
                color: "rgba(0,0,0,0)",
                blur: 0,
                offsetX: 0,
                offsetY: 0,
              },
        });
      }
    });

    canvas.on("object:modified", (e) => {
      const target = e.target as fabric.Object;
      if (target) {
        const fontSize = (target as any).fontSize || 42;
        const fill = String((target as any).fill || "#ffffff");
        const shadow = target.shadow as fabric.Shadow | undefined;

        setElementStyles({
          fontSize,
          fill,
          left: target.left || 0,
          top: target.top || 0,
          scale: target.scaleX || 1,
          stroke: String((target as any).stroke || ""),
          strokeWidth: Number((target as any).strokeWidth || 0),
          shadow: shadow
            ? {
                color: String(shadow.color || "rgba(0,0,0,0)"),
                blur: Number(shadow.blur || 0),
                offsetX: Number(shadow.offsetX || 0),
                offsetY: Number(shadow.offsetY || 0),
              }
            : {
                color: "rgba(0,0,0,0)",
                blur: 0,
                offsetX: 0,
                offsetY: 0,
              },
        });
      }
    });

    canvas.on("selection:cleared", () => {
      console.log("Selection cleared event");
      setSelectedElement(null);
      setSelectedCell(null);
      setShowProductSearch(false);
    });

    // Remover o listener after:render que estava causando problemas de seleção persistente
    // e substituir por uma abordagem mais simples

    // Snap to grid functionality
    if (snapToGrid) {
      canvas.on("object:moving", (e) => {
        const target = e.target as fabric.Object;
        if (!target) return;

        const gridSize = 20; // Size of grid cells for snapping
        if (target.left && target.top) {
          target.set({
            left: Math.round(target.left / gridSize) * gridSize,
            top: Math.round(target.top / gridSize) * gridSize,
          });
        }
      });
    }

    // Adicionar um listener para redimensionamento da janela
    window.addEventListener("resize", () => {
      if (canvas) {
        setTimeout(() => {
          canvas.renderAll();
        }, 100);
      }
    });
  };

  // Função auxiliar para restaurar a aparência original da célula - não é mais necessária
  // mas mantida para compatibilidade com código existente
  const restoreCellAppearance = (cell: GridCell, canvas: fabric.Canvas) => {
    // Esta função não faz mais nada, pois não estamos mais aplicando destaques visuais
    return;
  };

  const handleStyleChange = (property: string, value: number | string) => {
    if (!selectedElement || !editorCanvas) return;

    setElementStyles((prev) => ({
      ...prev,
      [property]: property.startsWith("shadow.")
        ? {
            ...prev.shadow,
            [property.split(".")[1]]: value,
          }
        : value,
    }));

    // Verificar se o elemento selecionado é um elemento da célula do grid
    // ou um produto adicionado à célula
    const isGridCell = (selectedElement as any).isGridCell;

    if (isGridCell) {
      // Se estiver editando a célula do grid em si, aplicar estilos apenas à borda/preenchimento
      if (property === "fill" || property === "stroke") {
        selectedElement.set(property, String(value));
      } else if (property === "strokeWidth") {
        selectedElement.set(property, Number(value));
      }
    } else {
      // Edição de elementos dentro das células (imagem, descrição, preço)
      if (property === "fontSize" && selectedElement.type === "text") {
        (selectedElement as any).set("fontSize", Number(value));
      } else if (property === "fill" || property === "stroke") {
        (selectedElement as any).set(property, String(value));
      } else if (property === "scale") {
        const numValue = Number(value);
        selectedElement.set("scaleX", numValue);
        selectedElement.set("scaleY", numValue);
      } else if (property === "strokeWidth") {
        selectedElement.set(property, Number(value));
      } else if (property.startsWith("shadow.")) {
        const shadowProp = property.split(".")[1];
        const currentShadow =
          (selectedElement.shadow as fabric.Shadow) || new fabric.Shadow();

        if (shadowProp === "color") {
          currentShadow.color = String(value);
        } else if (shadowProp === "blur") {
          currentShadow.blur = Number(value);
        } else if (shadowProp === "offsetX") {
          currentShadow.offsetX = Number(value);
        } else if (shadowProp === "offsetY") {
          currentShadow.offsetY = Number(value);
        }

        selectedElement.set("shadow", currentShadow);
      } else {
        selectedElement.set(property as any, Number(value));
      }
    }

    editorCanvas.renderAll();
  };

  const handleAddGridCell = () => {
    if (!editorCanvas) return;

    // Criar uma célula da grid (retângulo)
    const cell = new fabric.Rect({
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      width: CANVAS_WIDTH / 3,
      height: CANVAS_WIDTH / 3,
      fill: "rgba(200, 200, 200, 0.5)",
      stroke: "#ffffff",
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
    }) as GridCell;

    // Add a unique ID to identify it as a grid cell
    const cellId = uuidv4();
    cell.cellId = cellId;
    (cell as any).type = "rect";

    // Adicionar uma propriedade explícita que podemos verificar facilmente
    (cell as any).isGridCell = true;

    console.log("Célula criada com ID:", cellId);

    editorCanvas.add(cell);
    editorCanvas.setActiveObject(cell);
    editorCanvas.renderAll();
  };

  const proxyImage = (url: string) => {
    // Usar um serviço de proxy de imagem para evitar problemas de CORS
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&n=1`;
  };

  // Função para carregar imagem com fallback para imagem padrão
  const loadProductImage = (
    imageUrl: string,
    onSuccess: (img: fabric.Image) => void,
    cellId: string,
    cellInfo: {
      maxWidth: number;
      maxHeight: number;
      left: number;
      top: number;
    }
  ) => {
    if (!editorCanvas) return;

    const handleImageError = () => {
      console.log("Error loading image, using default image instead");

      // Fallback to default image when there's an error
      fabric.Image.fromURL(
        DEFAULT_PRODUCT_IMAGE,
        (img) => {
          if (!editorCanvas) return;

          const scale = Math.min(
            cellInfo.maxWidth / img.width!,
            cellInfo.maxHeight / img.height!
          );

          // Salvar cellId e outros dados no elemento de imagem
          (img as any).cellId = cellId;
          (img as any).elementType = "productImage";

          img.set({
            left: cellInfo.left,
            top: cellInfo.top,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: true,
          });

          onSuccess(img);
        },
        { crossOrigin: "anonymous" }
      );
    };

    // Try to load the proxied image with error handling
    const img = new Image();
    img.onload = () => {
      fabric.Image.fromURL(
        imageUrl,
        (fabricImg) => {
          if (!editorCanvas) return;

          const scale = Math.min(
            cellInfo.maxWidth / fabricImg.width!,
            cellInfo.maxHeight / fabricImg.height!
          );

          // Salvar cellId e outros dados no elemento de imagem
          (fabricImg as any).cellId = cellId;
          (fabricImg as any).elementType = "productImage";

          fabricImg.set({
            left: cellInfo.left,
            top: cellInfo.top,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: true,
          });

          onSuccess(fabricImg);
        },
        { crossOrigin: "anonymous" }
      );
    };
    img.onerror = handleImageError;
    img.src = imageUrl;
  };

  const handleExportGrid = () => {
    if (!editorCanvas) return;

    try {
      // Não é mais necessário limpar destaques visuais, pois eles não são mais aplicados
      editorCanvas.discardActiveObject();
      editorCanvas.renderAll();

      // Calcular as dimensões e limites reais do conteúdo
      const objects = editorCanvas.getObjects().filter((obj) => {
        // Verificar se não é uma linha guia e tem conteúdo relevante
        return (
          (obj as any)._guideType !== "line" &&
          ((obj as any).cellId || (obj as any).elementType)
        );
      });

      if (objects.length === 0) {
        alert(
          "Não há conteúdo para exportar. Adicione itens à grade primeiro."
        );
        return;
      }

      // Salvar zoom e dimensões originais
      const originalZoom = editorCanvas.getZoom();
      const originalWidth = editorCanvas.getWidth();
      const originalHeight = editorCanvas.getHeight();

      // Definir zoom para 1 para exportação no tamanho real
      editorCanvas.setZoom(1);
      editorCanvas.setWidth(CANVAS_WIDTH);
      editorCanvas.setHeight(CANVAS_HEIGHT);

      // Temporariamente esconder as linhas guia para exportação
      const guideLines = editorCanvas
        .getObjects()
        .filter((obj) => (obj as any)._guideType === "line");

      // Esconder guias
      guideLines.forEach((line) => line.set({ visible: false }));

      // Hide grid cells (make them fully transparent while keeping content)
      const gridCells = editorCanvas
        .getObjects()
        .filter((obj) => (obj as any).isGridCell);

      // Make cells transparent
      gridCells.forEach((cell) => {
        // Não precisamos mais tratar destaque verde, apenas tornar células transparentes para exportação
        cell.set({
          fill: "rgba(0,0,0,0)",
          stroke: "rgba(0,0,0,0)",
          strokeWidth: 0,
        });
      });

      // Forçar uma nova renderização
      editorCanvas.renderAll();

      // Definir a cor de fundo do canvas para preto
      const originalBgColor = editorCanvas.backgroundColor || "transparent";
      editorCanvas.setBackgroundColor(
        "#000000",
        editorCanvas.renderAll.bind(editorCanvas)
      );

      // Pequeno delay para garantir que a renderização foi concluída
      setTimeout(() => {
        const dataUrl = editorCanvas.toDataURL({
          format: "png",
          quality: 1,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          enableRetinaScaling: true,
        });

        // Restore visibility of guias
        if (showGuidelines) {
          guideLines.forEach((line) => line.set({ visible: true }));
        }

        // Restaurar cor de fundo original
        editorCanvas.setBackgroundColor(
          originalBgColor,
          editorCanvas.renderAll.bind(editorCanvas)
        );

        // Restaurar zoom e dimensões originais
        editorCanvas.setZoom(originalZoom);
        editorCanvas.setWidth(originalWidth);
        editorCanvas.setHeight(originalHeight);
        editorCanvas.renderAll();

        // Criar link para download
        const link = document.createElement("a");
        link.download = "grid-kv.png";
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 100);
    } catch (err) {
      console.error("Erro ao exportar grid:", err);
      alert("Não foi possível exportar a grid. Por favor, tente novamente.");
    }
  };

  const clearCanvas = () => {
    if (!editorCanvas) return;

    // Limpar seleções
    setSelectedCell(null);
    setSelectedElement(null);
    setShowProductSearch(false);

    editorCanvas.discardActiveObject();

    // Remover todos os objetos exceto guias
    const objects = editorCanvas
      .getObjects()
      .filter((obj) => (obj as any)._guideType !== "line");

    objects.forEach((obj) => editorCanvas.remove(obj));
    editorCanvas.renderAll();
  };

  const toggleGuidelines = () => {
    if (!editorCanvas) return;

    setShowGuidelines(!showGuidelines);

    const guideLines = editorCanvas
      .getObjects()
      .filter((obj) => (obj as any)._guideType === "line");

    guideLines.forEach((line) => line.set({ visible: !showGuidelines }));
    editorCanvas.renderAll();
  };

  const createGridLayout = (layout: { cols: number; rows: number }) => {
    if (!editorCanvas) return;

    // Guardar o layout atual
    setCurrentLayout(layout);

    // Limpar qualquer seleção antes de limpar o canvas
    setSelectedCell(null);
    setSelectedElement(null);
    setShowProductSearch(false);

    editorCanvas.discardActiveObject();

    // Armazenar produtos e elementos existentes antes de limpar o canvas
    const existingCells = editorCanvas
      .getObjects()
      .filter((obj) => (obj as any).isGridCell) as GridCell[];

    // Mapeamento de produtos e textos por cellId
    const contentByCell: Record<
      string,
      {
        productImage?: fabric.Image;
        description?: fabric.Text;
        price?: fabric.Text;
        productData?: any;
      }
    > = {};

    // Armazenar os conteúdos de cada célula
    existingCells.forEach((cell) => {
      if (!cell.cellId) return;

      contentByCell[cell.cellId!] = {
        productData: cell.productData,
      };

      // Encontrar elementos relacionados a esta célula
      editorCanvas.getObjects().forEach((obj) => {
        if ((obj as any).cellId === cell.cellId) {
          const type = (obj as any).elementType;
          if (type === "productImage" && obj instanceof fabric.Image) {
            contentByCell[cell.cellId!].productImage = obj;
          } else if (
            type === "productDescription" &&
            obj instanceof fabric.Text
          ) {
            contentByCell[cell.cellId!].description = obj;
          } else if (type === "productPrice" && obj instanceof fabric.Text) {
            contentByCell[cell.cellId!].price = obj;
          }
        }
      });
    });

    // Remover todos os elementos existentes exceto as linhas guia
    const elementsToRemove = editorCanvas
      .getObjects()
      .filter((obj) => (obj as any)._guideType !== "line");
    elementsToRemove.forEach((obj) => editorCanvas.remove(obj));

    // Remover guias existentes
    const existingGuides = editorCanvas
      .getObjects()
      .filter((obj) => (obj as any)._guideType === "line");
    existingGuides.forEach((guide) => editorCanvas.remove(guide));

    // Calcular dimensões das células, considerando a escala
    const scaledWidth = CANVAS_WIDTH * gridScale;
    const scaledHeight = CANVAS_HEIGHT * gridScale;
    const cellWidth = scaledWidth / layout.cols;
    const cellHeight = scaledHeight / layout.rows;

    // Calcular o posicionamento central
    const offsetX = (CANVAS_WIDTH - scaledWidth) / 2;
    const offsetY = (CANVAS_HEIGHT - scaledHeight) / 2;

    // Criar células da grid e mapeamento de posições antigas para novas
    const cellPositionMap: Record<
      string,
      {
        oldId: string;
        newId: string;
        left: number;
        top: number;
        width: number;
        height: number;
      }
    > = {};

    // Criar células da grid
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const cellLeft = offsetX + col * cellWidth + cellWidth / 2;
        const cellTop = offsetY + row * cellHeight + cellHeight / 2;

        const cell = new fabric.Rect({
          left: cellLeft,
          top: cellTop,
          width: cellWidth - gridGap,
          height: cellHeight - gridGap,
          fill: "rgba(200, 200, 200, 0.5)",
          stroke: "#ffffff",
          strokeWidth: 2,
          originX: "center",
          originY: "center",
          selectable: true,
          hasControls: true,
        }) as GridCell;

        // Add a unique ID to identify it as a grid cell
        const cellId = uuidv4();
        cell.cellId = cellId;
        (cell as any).type = "rect";
        (cell as any).isGridCell = true;

        // Mapear índice de célula para posição
        const cellIndex = row * layout.cols + col;
        if (
          cellIndex < existingCells.length &&
          existingCells[cellIndex].cellId
        ) {
          const oldCellId = existingCells[cellIndex].cellId!;
          cellPositionMap[oldCellId] = {
            oldId: oldCellId,
            newId: cellId,
            left: cellLeft,
            top: cellTop,
            width: cellWidth - gridGap,
            height: cellHeight - gridGap,
          };

          // Transferir dados do produto para a nova célula
          if (
            contentByCell[oldCellId] &&
            contentByCell[oldCellId].productData
          ) {
            cell.productData = contentByCell[oldCellId].productData;
          }
        }

        console.log(`Célula de grid criada [${row},${col}] com ID: ${cellId}`);
        editorCanvas.add(cell);
      }
    }

    // Adicionar linhas guia para colunas, considerando a escala
    for (let col = 0; col <= layout.cols; col++) {
      const x = offsetX + col * cellWidth;
      const line = new fabric.Line([x, offsetY, x, offsetY + scaledHeight], {
        stroke: "#ff0000",
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        visible: showGuidelines,
      });
      (line as any)._guideType = "line";
      editorCanvas.add(line);
    }

    // Adicionar linhas guia para linhas, considerando a escala
    for (let row = 0; row <= layout.rows; row++) {
      const y = offsetY + row * cellHeight;
      const line = new fabric.Line([offsetX, y, offsetX + scaledWidth, y], {
        stroke: "#ff0000",
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        visible: showGuidelines,
      });
      (line as any)._guideType = "line";
      editorCanvas.add(line);
    }

    // Restaurar conteúdo de produtos nas novas células
    Object.keys(cellPositionMap).forEach((oldCellId) => {
      const mappedCell = cellPositionMap[oldCellId];
      const content = contentByCell[oldCellId];

      if (!content) return;

      const newCellLeft = mappedCell.left;
      const newCellTop = mappedCell.top;
      const newCellWidth = mappedCell.width;
      const newCellHeight = mappedCell.height;

      // Definir as regiões para cada elemento
      const imageRegionHeight = newCellHeight * 0.6; // 60% para imagem
      const descRegionHeight = newCellHeight * 0.25; // 25% para descrição
      const priceRegionHeight = newCellHeight * 0.15; // 15% para preço

      // Calcular posições verticais
      const cellTopEdge = newCellTop - newCellHeight / 2;
      const imageTop = cellTopEdge + imageRegionHeight / 2;
      const descTop = cellTopEdge + imageRegionHeight + descRegionHeight / 2;
      const priceTop =
        cellTopEdge +
        imageRegionHeight +
        descRegionHeight +
        priceRegionHeight / 2;

      // Restaurar imagem, se existir
      if (content.productImage) {
        fabric.Image.fromURL(
          content.productImage.getSrc(),
          (newImg) => {
            if (!editorCanvas) return;

            // Calcular nova escala para caber na célula
            const maxWidth = newCellWidth * 0.9;
            const maxHeight = imageRegionHeight * 0.9;
            const scale = Math.min(
              maxWidth / content.productImage!.width!,
              maxHeight / content.productImage!.height!
            );

            // Configurar a nova imagem
            (newImg as any).cellId = mappedCell.newId;
            (newImg as any).elementType = "productImage";

            newImg.set({
              left: newCellLeft,
              top: imageTop,
              originX: "center",
              originY: "center",
              scaleX: scale,
              scaleY: scale,
              selectable: true,
            });

            editorCanvas.add(newImg);

            // Atualizar a referência da imagem selecionada se aplicável
            if (
              selectedProductImage &&
              (selectedProductImage as any).cellId === oldCellId
            ) {
              setSelectedProductImage(newImg);
            }
          },
          { crossOrigin: "anonymous" }
        );
      }

      // Restaurar descrição, se existir
      if (content.description) {
        const maxLineWidth = newCellWidth * 0.85;
        const fontSize = Math.min(24, descRegionHeight * 0.4);

        // Obter o texto original
        const originalText = content.description.text || "";

        // Configurar descrição para ajustar automaticamente ao tamanho da célula
        const newDesc = new fabric.Textbox(originalText, {
          left: newCellLeft,
          top: descTop,
          fontSize: fontSize,
          fill:
            content.description.get && content.description.get("fill")
              ? content.description.get("fill")
              : "#ffffff",
          fontFamily:
            content.description.get && content.description.get("fontFamily")
              ? content.description.get("fontFamily")
              : "Arial",
          fontWeight:
            content.description.get && content.description.get("fontWeight")
              ? content.description.get("fontWeight")
              : "700",
          originX: "center",
          originY: "center",
          textAlign: "center",
          width: maxLineWidth,
        });

        // Salvar cellId e outros dados no elemento de texto
        (newDesc as any).cellId = mappedCell.newId;
        (newDesc as any).elementType = "productDescription";

        editorCanvas.add(newDesc);
      }

      // Restaurar preço, se existir
      if (content.price) {
        const priceText = content.price.text || "";
        const priceFill =
          content.price.get && content.price.get("fill")
            ? content.price.get("fill")
            : "#ffffff";
        const priceFontFamily =
          content.price.get && content.price.get("fontFamily")
            ? content.price.get("fontFamily")
            : "Arial";
        const priceFontWeight =
          content.price.get && content.price.get("fontWeight")
            ? content.price.get("fontWeight")
            : "700";

        const newPrice = new fabric.Text(priceText, {
          left: newCellLeft,
          top: priceTop,
          fontSize: Math.min(28, priceRegionHeight * 0.6),
          fill: priceFill,
          fontFamily: priceFontFamily,
          fontWeight: priceFontWeight,
          originX: "center",
          originY: "center",
        });

        (newPrice as any).cellId = mappedCell.newId;
        (newPrice as any).elementType = "productPrice";

        editorCanvas.add(newPrice);
      }
    });

    editorCanvas.renderAll();
  };

  const applyGridLayout = (layoutName: string) => {
    const layout = GRID_LAYOUTS[layoutName as keyof typeof GRID_LAYOUTS];
    if (!layout) return;

    // Limpar seleção antes de aplicar o novo layout
    setSelectedCell(null);
    setSelectedElement(null);
    setShowProductSearch(false);

    if (editorCanvas) {
      editorCanvas.discardActiveObject();
    }

    setSelectedLayout(layoutName);
    createGridLayout(layout);
  };

  // Função para aplicar grid personalizada
  const applyCustomGridLayout = () => {
    // Validar valores mínimos e máximos
    const rows = Math.min(Math.max(customRows, 1), 10); // Limitar entre 1 e 10
    const cols = Math.min(Math.max(customCols, 1), 10); // Limitar entre 1 e 10

    // Limpar seleção antes de aplicar o novo layout
    setSelectedCell(null);
    setSelectedElement(null);
    setShowProductSearch(false);

    if (editorCanvas) {
      editorCanvas.discardActiveObject();
    }

    setSelectedLayout("custom");
    createGridLayout({ rows, cols });

    // Mostrar mensagem de sucesso
    setSuccessMessage(`Grid personalizada ${cols}x${rows} criada com sucesso`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleGridGapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newGap = parseInt(e.target.value, 10);
    setGridGap(newGap);

    // Recriar a grid com o novo espaçamento se houver um layout atual
    if (currentLayout) {
      createGridLayout(currentLayout);
    }
  };

  const handleGridScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value);
    setGridScale(newScale);

    // Recriar a grade se tiver um layout atual
    if (currentLayout) {
      createGridLayout(currentLayout);
    }
  };

  const handleSearchProduct = async () => {
    if (!searchCode || !editorCanvas || !selectedCell) return;

    try {
      setIsSearching(true);
      const response = await fetch(
        `http://172.16.23.35:8000/produtos/${searchCode}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch product data");
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const product = data[0];
        const cellId = selectedCell.cellId;

        // Store product data in the cell
        selectedCell.productData = {
          description: product.descricao,
          price:
            product.vl_oferta > 0 ? `R$ ${product.vl_oferta.toFixed(2)}` : "",
          imageUrl: product.link_imagem,
        };

        // Remover objetos existentes que possam pertencer à célula
        const cellLeft = selectedCell.left || 0;
        const cellTop = selectedCell.top || 0;
        const cellWidth = selectedCell.getScaledWidth
          ? selectedCell.getScaledWidth()
          : selectedCell.width || 0;
        const cellHeight = selectedCell.getScaledHeight
          ? selectedCell.getScaledHeight()
          : selectedCell.height || 0;

        // Procurar e remover elementos existentes associados a esta célula
        const existingObjects = editorCanvas.getObjects().filter((obj) => {
          // Verificar se o objeto está associado a esta célula pelo cellId
          if (obj === selectedCell) return false; // Não remover a própria célula
          if ((obj as any).cellId === cellId) return true;

          // Verificar posicionamento como fallback
          const objLeft = obj.left || 0;
          const objTop = obj.top || 0;

          return (
            Math.abs(objLeft - cellLeft) < cellWidth / 2 + 20 &&
            Math.abs(objTop - cellTop) < cellHeight / 2 + 20
          );
        });

        existingObjects.forEach((obj) => {
          editorCanvas.remove(obj);
        });

        // Calcular posições relativas à célula para um layout vertical centralizado
        // Definir as regiões para cada elemento (imagem, descrição, preço)
        const imageRegionHeight = cellHeight * 0.6; // 60% do espaço para a imagem
        const descRegionHeight = cellHeight * 0.25; // 25% para a descrição
        const priceRegionHeight = cellHeight * 0.15; // 15% para o preço

        // Posicionar verticalmente a partir do topo da célula
        // Considerar o originY=center para a célula
        const cellTopEdge = cellTop - cellHeight / 2;

        const imageTop = cellTopEdge + imageRegionHeight / 2;
        const descTop = cellTopEdge + imageRegionHeight + descRegionHeight / 2;
        const priceTop =
          cellTopEdge +
          imageRegionHeight +
          descRegionHeight +
          priceRegionHeight / 2;

        // Add product image
        const proxiedImageUrl = proxyImage(product.link_imagem);

        // Usar o novo método loadProductImage para garantir fallback para imagem padrão
        loadProductImage(
          proxiedImageUrl,
          (img) => {
            if (!editorCanvas) return;

            // Salvar a imagem para uso posterior no botão de remover fundo
            setSelectedProductImage(img);

            // Add to canvas
            editorCanvas.add(img);

            // Adicionar descrição do produto com quebra de texto automática
            // Calcular o texto com quebras de linha apropriadas
            const maxLineWidth = cellWidth * 0.85; // Um pouco menor que a largura total da célula
            const fontSize = Math.min(24, descRegionHeight * 0.4); // Tamanho adaptável

            // Criar um texto temporário para calcular a largura
            const tempText = new fabric.Text(product.descricao.toUpperCase(), {
              fontSize: fontSize,
              fontFamily: "Arial",
              fontWeight: "700",
            });

            let formattedText = product.descricao.toUpperCase();
            // Se o texto é muito longo, quebrar em múltiplas linhas
            if (tempText.width && tempText.width > maxLineWidth) {
              const words = formattedText.split(" ");
              let lines: string[] = [];
              let currentLine = "";

              words.forEach((word: string) => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testTextObj = new fabric.Text(testLine, {
                  fontSize: fontSize,
                  fontFamily: "Arial",
                  fontWeight: "700",
                });

                if (testTextObj.width && testTextObj.width > maxLineWidth) {
                  // Se adicionar a palavra excede a largura, começar nova linha
                  lines.push(currentLine);
                  currentLine = word;
                } else {
                  // Caso contrário, continuar na mesma linha
                  currentLine = testLine;
                }
              });

              // Adicionar a última linha
              if (currentLine) {
                lines.push(currentLine);
              }

              // Juntar linhas com quebras de linha
              formattedText = lines.join("\n");
            }

            // Criar o texto com quebras de linha - usar Text em vez de Textbox para evitar erro de tipo
            const descriptionText = new fabric.Textbox(formattedText, {
              left: cellLeft,
              top: descTop,
              fontSize: fontSize,
              fill: "#ffffff",
              fontFamily: "Arial",
              fontWeight: "700",
              originX: "center",
              originY: "center",
              textAlign: "center",
              width: maxLineWidth,
            });

            // Salvar cellId e outros dados no elemento de texto
            (descriptionText as any).cellId = cellId;
            (descriptionText as any).elementType = "productDescription";

            editorCanvas.add(descriptionText);

            // Add product price if available
            if (product.vl_oferta > 0) {
              const priceText = new fabric.Text(
                `R$ ${product.vl_oferta.toFixed(2)}`,
                {
                  left: cellLeft,
                  top: priceTop,
                  fontSize: Math.min(28, priceRegionHeight * 0.6), // Tamanho adaptável
                  fill: "#ffffff",
                  fontFamily: "Arial",
                  fontWeight: "700",
                  originX: "center",
                  originY: "center",
                }
              );

              // Salvar cellId e outros dados no elemento de preço
              (priceText as any).cellId = cellId;
              (priceText as any).elementType = "productPrice";

              editorCanvas.add(priceText);
            }

            editorCanvas.renderAll();
            setSearchCode("");

            // Mostrar mensagem de sucesso e limpar após alguns segundos
            setSuccessMessage(
              `Produto "${product.descricao.substring(0, 20)}..." adicionado com sucesso`
            );
            setTimeout(() => {
              setSuccessMessage(null);
            }, 3000);
          },
          cellId!,
          {
            maxWidth: cellWidth * 0.9,
            maxHeight: imageRegionHeight * 0.9,
            left: cellLeft,
            top: imageTop,
          }
        );
      } else {
        alert("Nenhum produto encontrado com este código.");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      alert("Erro ao buscar produto. Por favor, tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  // Implementação da funcionalidade de remoção de fundo
  const handleRemoveBackgroundImage = async () => {
    if (!editorCanvas) return;

    // Verificar se temos uma imagem selecionada ou encontrar a imagem do produto na célula selecionada
    let productImage = selectedProductImage;

    if (!productImage && selectedCell && selectedCell.cellId) {
      // Procurar pela imagem na célula selecionada
      productImage =
        (editorCanvas
          .getObjects()
          .find(
            (obj) =>
              obj instanceof fabric.Image &&
              (obj as any).cellId === selectedCell.cellId &&
              (obj as any).elementType === "productImage"
          ) as fabric.Image) || null;
    }

    if (!productImage) {
      alert(
        "Nenhuma imagem de produto encontrada. Selecione uma célula com produto."
      );
      return;
    }

    try {
      setIsRemovingBackground(true);

      // Obter a imagem atual como base64
      const dataURL = productImage.toDataURL({
        format: "png",
        quality: 1,
      });

      // Extrair a parte base64 da dataURL
      const base64Data = dataURL.split(",")[1];

      // Enviar para a API local
      const response = await fetch("http://172.16.23.35:8000/remover-fundo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Data,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao remover o fundo");
      }

      const data = await response.json();

      // Criar uma nova imagem com o fundo removido
      fabric.Image.fromURL(data.processedImage, (newImg) => {
        if (!editorCanvas) return;

        // Preservar as propriedades da imagem original
        newImg.set({
          left: productImage!.left,
          top: productImage!.top,
          scaleX: productImage!.scaleX,
          scaleY: productImage!.scaleY,
          angle: productImage!.angle,
          flipX: productImage!.flipX,
          flipY: productImage!.flipY,
          skewX: productImage!.skewX,
          skewY: productImage!.skewY,
          originX: productImage!.originX,
          originY: productImage!.originY,
          selectable: true,
        });

        // Copiar os metadados (cellId e elementType)
        (newImg as any).cellId = (productImage as any).cellId;
        (newImg as any).elementType = "productImage";

        // Substituir a imagem antiga pela nova
        editorCanvas.remove(productImage!);
        editorCanvas.add(newImg);
        editorCanvas.renderAll();

        // Atualizar a referência à imagem selecionada
        setSelectedProductImage(newImg);

        // Mostrar mensagem de sucesso
        setSuccessMessage("Fundo da imagem removido com sucesso!");
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);

        setIsRemovingBackground(false);
      });
    } catch (error) {
      console.error("Erro ao remover fundo:", error);
      alert(
        "Não foi possível remover o fundo da imagem. Por favor, tente novamente."
      );
      setIsRemovingBackground(false);
    }
  };

  // Função para manipular a seleção de background
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editorCanvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result || !editorCanvas) return;

      const imgUrl = event.target.result.toString();
      fabric.Image.fromURL(imgUrl, (img) => {
        // Calcular a escala para cobrir todo o canvas mantendo a proporção
        const scaleToFit = Math.max(
          CANVAS_WIDTH / img.width!,
          CANVAS_HEIGHT / img.height!
        );

        // Aplicar a escala e centralizar
        img.set({
          scaleX: scaleToFit,
          scaleY: scaleToFit,
          left: CANVAS_WIDTH / 2,
          top: CANVAS_HEIGHT / 2,
          originX: "center",
          originY: "center",
          selectable: false, // Background não será selecionável
        });

        // Definir como background
        editorCanvas.setBackgroundImage(
          img,
          editorCanvas.renderAll.bind(editorCanvas)
        );

        // Armazenar no estado
        setBackgroundImage(file);

        // Mostrar mensagem de sucesso
        setSuccessMessage("Background adicionado com sucesso");
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      });
    };
    reader.readAsDataURL(file);
  };

  // Função para remover o background
  const handleRemoveBackground = () => {
    if (!editorCanvas) return;

    // Limpar o background usando undefined
    editorCanvas.backgroundImage = undefined;
    editorCanvas.renderAll();
    setBackgroundImage(null);

    // Mostrar mensagem de sucesso
    setSuccessMessage("Background removido com sucesso");
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  return (
    <KVModal isOpen={isOpen} onClose={onClose}>
      <div className='flex flex-col gap-6 px-5 py-5'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-bold text-primary-grey-300'>
            Gerador de Grid KV
          </h1>
          <button
            onClick={handleExportGrid}
            className='flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'></path>
              <polyline points='7 10 12 15 17 10'></polyline>
              <line x1='12' y1='15' x2='12' y2='3'></line>
            </svg>
            Exportar Grid
          </button>
        </div>

        <div className='flex gap-6'>
          {/* Left sidebar with controls */}
          <div className='flex max-h-[80vh] w-[350px] flex-col gap-5 overflow-y-auto pr-2'>
            {/* Background Section */}
            <div className='rounded-lg border border-gray-800 bg-primary-black p-4 shadow-md'>
              <h3 className='mb-3 flex items-center gap-2 text-base font-semibold text-primary-grey-300'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect>
                  <circle cx='8.5' cy='8.5' r='1.5'></circle>
                  <polyline points='21 15 16 10 5 21'></polyline>
                </svg>
                Plano de Fundo
              </h3>

              <div className='flex flex-col gap-3'>
                <div className='flex flex-col gap-2'>
                  <label
                    htmlFor='background-upload'
                    className='flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700'
                  >
                    <Plus size={16} />
                    {backgroundImage
                      ? "Trocar Background"
                      : "Adicionar Background"}
                  </label>
                  <input
                    id='background-upload'
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleBackgroundUpload}
                  />
                </div>

                {backgroundImage && (
                  <button
                    onClick={handleRemoveBackground}
                    className='flex items-center justify-center gap-2 rounded-md border border-red-500 bg-transparent px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d='M3 6h18'></path>
                      <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'></path>
                      <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'></path>
                    </svg>
                    Remover Background
                  </button>
                )}
              </div>
            </div>

            {/* Grid Layout Section */}
            <div className='rounded-lg border border-gray-800 bg-primary-black p-4 shadow-md'>
              <h3 className='mb-3 flex items-center gap-2 text-base font-semibold text-primary-grey-300'>
                <Grid size={18} />
                Layout da Grid
              </h3>

              <div className='space-y-4'>
                <div>
                  <p className='text-primary-grey-400 mb-2 text-xs font-medium'>
                    Layouts pré-definidos
                  </p>
                  <div className='grid grid-cols-3 gap-2'>
                    <button
                      onClick={() => applyGridLayout("twoByTwo")}
                      className={`flex flex-col items-center justify-center rounded-md p-2 text-xs transition-colors ${selectedLayout === "twoByTwo" ? "bg-primary-green text-primary-black" : "bg-primary-grey-800 hover:bg-primary-grey-700 text-white"}`}
                    >
                      <Grid size={20} />
                      <span>2x2</span>
                    </button>

                    <button
                      onClick={() => applyGridLayout("threeByThree")}
                      className={`flex flex-col items-center justify-center rounded-md p-2 text-xs transition-colors ${selectedLayout === "threeByThree" ? "bg-primary-green text-primary-black" : "bg-primary-grey-800 hover:bg-primary-grey-700 text-white"}`}
                    >
                      <Grid size={20} />
                      <span>3x3</span>
                    </button>

                    <button
                      onClick={() => applyGridLayout("twoByOne")}
                      className={`flex flex-col items-center justify-center rounded-md p-2 text-xs transition-colors ${selectedLayout === "twoByOne" ? "bg-primary-green text-primary-black" : "bg-primary-grey-800 hover:bg-primary-grey-700 text-white"}`}
                    >
                      <Columns size={20} />
                      <span>2x1</span>
                    </button>

                    <button
                      onClick={() => applyGridLayout("oneByTwo")}
                      className={`flex flex-col items-center justify-center rounded-md p-2 text-xs transition-colors ${selectedLayout === "oneByTwo" ? "bg-primary-green text-primary-black" : "bg-primary-grey-800 hover:bg-primary-grey-700 text-white"}`}
                    >
                      <Rows size={20} />
                      <span>1x2</span>
                    </button>

                    <button
                      onClick={() => applyGridLayout("threeByOne")}
                      className={`flex flex-col items-center justify-center rounded-md p-2 text-xs transition-colors ${selectedLayout === "threeByOne" ? "bg-primary-green text-primary-black" : "bg-primary-grey-800 hover:bg-primary-grey-700 text-white"}`}
                    >
                      <Columns size={20} />
                      <span>3x1</span>
                    </button>

                    <button
                      onClick={() => applyGridLayout("oneByThree")}
                      className={`flex flex-col items-center justify-center rounded-md p-2 text-xs transition-colors ${selectedLayout === "oneByThree" ? "bg-primary-green text-primary-black" : "bg-primary-grey-800 hover:bg-primary-grey-700 text-white"}`}
                    >
                      <Rows size={20} />
                      <span>1x3</span>
                    </button>
                  </div>
                </div>

                <div className='mt-3 border-t border-gray-800 pt-4'>
                  <p className='text-primary-grey-400 mb-3 text-xs font-medium'>
                    Grid personalizada
                  </p>
                  <div className='mb-3 flex gap-3'>
                    <div className='flex flex-1 flex-col'>
                      <label className='mb-1 text-xs text-primary-grey-300'>
                        Colunas
                      </label>
                      <div className='flex items-center'>
                        <input
                          type='number'
                          min='1'
                          max='10'
                          value={customCols}
                          onChange={(e) =>
                            setCustomCols(parseInt(e.target.value) || 1)
                          }
                          className='bg-primary-grey-800 w-full rounded-md border border-gray-700 px-3 py-1.5 text-sm text-primary-grey-300 focus:border-blue-500 focus:outline-none'
                        />
                      </div>
                    </div>

                    <div className='flex flex-1 flex-col'>
                      <label className='mb-1 text-xs text-primary-grey-300'>
                        Linhas
                      </label>
                      <div className='flex items-center'>
                        <input
                          type='number'
                          min='1'
                          max='10'
                          value={customRows}
                          onChange={(e) =>
                            setCustomRows(parseInt(e.target.value) || 1)
                          }
                          className='bg-primary-grey-800 w-full rounded-md border border-gray-700 px-3 py-1.5 text-sm text-primary-grey-300 focus:border-blue-500 focus:outline-none'
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={applyCustomGridLayout}
                    className={`flex w-full items-center justify-center rounded-md p-2 text-sm transition-colors ${selectedLayout === "custom" ? "bg-primary-green text-primary-black" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    <Grid size={16} className='mr-2' />
                    <span>
                      Criar Grid {customCols}x{customRows}
                    </span>
                  </button>
                </div>

                <div className='mt-4 border-t border-gray-800 pt-4'>
                  <p className='text-primary-grey-400 mb-2 text-xs font-medium'>
                    Ajustes da Grid
                  </p>

                  <div className='mb-4'>
                    <div className='mb-1 flex justify-between'>
                      <label className='text-xs text-primary-grey-300'>
                        Espaçamento ({gridGap}px)
                      </label>
                      <span className='text-primary-grey-400 text-xs'>
                        {gridGap}px
                      </span>
                    </div>
                    <input
                      type='range'
                      min='0'
                      max='50'
                      value={gridGap}
                      onChange={handleGridGapChange}
                      className='w-full accent-blue-500'
                    />
                  </div>

                  <div className='mb-2'>
                    <div className='mb-1 flex justify-between'>
                      <label className='text-xs text-primary-grey-300'>
                        Escala da grid
                      </label>
                      <span className='text-primary-grey-400 text-xs'>
                        {Math.round(gridScale * 100)}%
                      </span>
                    </div>
                    <input
                      type='range'
                      min='0.5'
                      max='1'
                      step='0.05'
                      value={gridScale}
                      onChange={handleGridScaleChange}
                      className='w-full accent-blue-500'
                    />
                  </div>

                  <div className='mt-3 space-y-2'>
                    <div className='flex items-center'>
                      <input
                        type='checkbox'
                        id='showGuidelines'
                        checked={showGuidelines}
                        onChange={toggleGuidelines}
                        className='h-4 w-4 rounded border-gray-400 accent-blue-500'
                      />
                      <label
                        htmlFor='showGuidelines'
                        className='ml-2 text-sm text-primary-grey-300'
                      >
                        Mostrar linhas guia
                      </label>
                    </div>

                    <div className='flex items-center'>
                      <input
                        type='checkbox'
                        id='snapToGrid'
                        checked={snapToGrid}
                        onChange={(e) => setSnapToGrid(e.target.checked)}
                        className='h-4 w-4 rounded border-gray-400 accent-blue-500'
                      />
                      <label
                        htmlFor='snapToGrid'
                        className='ml-2 text-sm text-primary-grey-300'
                      >
                        Ativar snap to grid
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Search Section */}
            {showProductSearch ? (
              <div className='rounded-lg border border-gray-800 bg-primary-black p-4 shadow-md'>
                <h3 className='mb-3 flex items-center gap-2 text-base font-semibold text-primary-grey-300'>
                  <Search size={18} />
                  Pesquisar Produto
                </h3>

                <div className='space-y-3'>
                  <div className='flex gap-2'>
                    <Input
                      type='text'
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      placeholder='Código do produto'
                      className='bg-primary-grey-800 flex-grow rounded-md border border-gray-700 px-3 py-1.5 text-sm text-primary-grey-300 focus:border-blue-500 focus:outline-none'
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearchProduct();
                      }}
                    />
                    <Button
                      onClick={handleSearchProduct}
                      disabled={isSearching}
                      className='min-w-[40px] rounded-md bg-primary-green text-primary-black hover:bg-primary-green/90 disabled:opacity-50'
                    >
                      {isSearching ? (
                        <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-black border-t-transparent'></div>
                      ) : (
                        <Search size={16} />
                      )}
                    </Button>
                  </div>

                  {/* Botão para remover fundo da imagem */}
                  {selectedProductImage && (
                    <button
                      onClick={handleRemoveBackgroundImage}
                      disabled={isRemovingBackground}
                      className='flex w-full items-center justify-center gap-2 rounded-md bg-primary-green px-3 py-2 text-sm text-primary-black transition-colors hover:bg-primary-green/90 disabled:opacity-50'
                    >
                      {isRemovingBackground ? (
                        <>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-black border-t-transparent'></div>
                          <span>Removendo fundo...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='16'
                            height='16'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          >
                            <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path>
                            <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path>
                          </svg>
                          <span>Remover Fundo da Imagem</span>
                        </>
                      )}
                    </button>
                  )}

                  {successMessage && (
                    <div
                      className='rounded-md bg-green-500/20 p-2 text-sm text-green-500'
                      style={{ animation: "fadeIn 0.3s ease-in-out" }}
                    >
                      {successMessage}
                    </div>
                  )}

                  <div className='bg-primary-grey-800/50 rounded-md p-3'>
                    <p className='mb-2 text-xs text-primary-grey-300'>
                      <span className='font-semibold'>Célula selecionada:</span>{" "}
                      {selectedCell
                        ? `#${selectedCell.cellId?.substring(0, 8)}...`
                        : "Nenhuma"}
                    </p>
                    <p className='text-primary-grey-400 text-xs'>
                      Digite o código do produto e clique em pesquisar para
                      adicionar à célula selecionada.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className='rounded-lg border border-dashed border-gray-800 bg-primary-black p-4 shadow-md'>
                <h3 className='mb-3 flex items-center gap-2 text-base font-semibold text-primary-grey-300'>
                  <Search size={18} />
                  Adicionar Produtos
                </h3>
                <div className='flex flex-col items-center justify-center py-6 text-center'>
                  <div className='bg-primary-grey-800 mb-3 rounded-full p-3'>
                    <Search size={24} className='text-primary-grey-300' />
                  </div>
                  <p className='mb-2 text-sm text-primary-grey-300'>
                    Clique em uma célula da grid para pesquisar e adicionar
                    produtos
                  </p>
                  <p className='text-primary-grey-400 text-xs'>
                    Cada célula pode conter uma imagem, descrição e preço de
                    produto
                  </p>
                </div>
              </div>
            )}

            {/* Element Editor Section (only when element is selected) */}
            {selectedElement && (
              <div className='rounded-lg border border-gray-800 bg-primary-black p-4 shadow-md'>
                <h3 className='mb-3 flex items-center gap-2 text-base font-semibold text-primary-grey-300'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='18'
                    height='18'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path>
                    <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path>
                  </svg>
                  Editar Elemento
                </h3>

                <KVElementEditor
                  selectedElement={selectedElement}
                  elementStyles={elementStyles}
                  onStyleChange={handleStyleChange}
                />
              </div>
            )}

            {/* Add cell button */}
            <button
              onClick={handleAddGridCell}
              className='mt-1 flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700'
            >
              <Plus size={16} />
              Adicionar célula manualmente
            </button>

            <button
              onClick={clearCanvas}
              className='mb-2 flex items-center justify-center gap-2 rounded-md border border-red-500 bg-transparent px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M3 6h18'></path>
                <path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'></path>
                <path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'></path>
                <path d='M10 11v6'></path>
                <path d='M14 11v6'></path>
              </svg>
              Limpar tudo
            </button>
          </div>

          {/* Canvas Area */}
          <div className='sticky top-0 flex-grow'>
            <KVCanvas
              editorCanvasRef={editorCanvasRef}
              onCanvasReady={handleCanvasReady}
            />
          </div>
        </div>
      </div>
    </KVModal>
  );
};

export default KVGridSystem;
