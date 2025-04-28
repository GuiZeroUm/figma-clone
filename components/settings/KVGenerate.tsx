import React, { useState, useEffect, useRef } from "react";
import { fabric } from "fabric";
import { v4 as uuidv4 } from "uuid";
import { toPng } from "html-to-image";
import { removeBackgroundFromImageFile } from "remove.bg";
import { Plus } from "lucide-react";

import KVModal from "./kv/KVModal";
import KVForm from "./kv/KVForm";
import KVCanvas from "./kv/KVCanvas";
import KVElementEditor from "./kv/KVElementEditor";
import KVGridButton from "./kv/KVGridButton";
import KVGridSystem from "./kv/KVGridSystem";
import {
  FormData,
  ElementStyles,
  ExtendedFabricObject,
  ExtendedFabricText,
} from "../../types/kv";
import KVTemplates from "./kv/KVTemplates";

interface KVGenerateProps {
  fabricRef: React.MutableRefObject<fabric.Canvas>;
  syncShapeInStorage: (shape: fabric.Object) => void;
}

interface KVFormData {
  productName: string;
  productDescription: string;
  productPrice: string;
  productImage: File | null;
  validity: string;
  legalText: string;
}

interface KVTemplate {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  elements: fabric.Object[];
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const PRICE_BOX_HEIGHT = 140;
const DISCLAIMER_BOX_HEIGHT = 100;
const DEFAULT_PRODUCT_IMAGE =
  "https://thumb.ac-illust.com/b1/b170870007dfa419295d949814474ab2_t.jpeg";

const KVGenerate = ({ fabricRef, syncShapeInStorage }: KVGenerateProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [editorCanvas, setEditorCanvas] = useState<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);

  const [formData, setFormData] = useState<KVFormData>({
    productName: "",
    productDescription: "",
    productPrice: "",
    productImage: null,
    validity: "",
    legalText: "",
  });

  const [selectedElement, setSelectedElement] = useState<fabric.Object | null>(
    null
  );
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

  const [productShadow, setProductShadow] = useState({
    enabled: false,
    blur: 15,
    offsetY: 15,
    opacity: 0.5,
  });

  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleCanvasReady = (canvas: fabric.Canvas) => {
    setEditorCanvas(canvas);

    canvas.on("object:selected", (e) => {
      const target = e.target as fabric.Object;
      console.log("Selected object:", target);
      setSelectedElement(target);

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
      console.log("Selection cleared");
      setSelectedElement(null);
    });

    // Make elements selectable when added to canvas
    canvas.on("object:added", (e) => {
      const obj = e.target;
      if (obj) {
        obj.set({
          selectable: true,
          hasControls: true,
          hasBorders: true,
        });
      }
    });

    // Ensure text objects are clickable/interactive
    canvas.on("mouse:down", (e) => {
      if (e.target && (e.target.type === "text" || e.target.type === "image")) {
        canvas.setActiveObject(e.target);
        canvas.renderAll();
      }
    });

    // Configurar o canvas para garantir que a imagem de background seja exibida corretamente
    canvas.on("after:render", () => {
      // Verificar se há uma imagem de background e garantir que ela seja exibida corretamente
      if (canvas.backgroundImage) {
        const bgImage = canvas.backgroundImage as fabric.Image;
        if (bgImage && bgImage.width && bgImage.height) {
          // Verificar se a imagem está sendo cortada
          const scale = Math.max(
            CANVAS_WIDTH / bgImage.width,
            CANVAS_HEIGHT / bgImage.height
          );

          // Se a escala atual for diferente da escala calculada, atualizar
          if (Math.abs(bgImage.scaleX! - scale) > 0.01) {
            bgImage.set({
              scaleX: scale,
              scaleY: scale,
              left: CANVAS_WIDTH / 2,
              top: CANVAS_HEIGHT / 2,
              originX: "center",
              originY: "center",
            });
            canvas.renderAll();
          }
        }
      }
    });

    // Adicionar um listener para redimensionamento da janela
    window.addEventListener("resize", () => {
      if (canvas) {
        // Forçar uma renderização completa após o redimensionamento
        setTimeout(() => {
          canvas.renderAll();
        }, 100);
      }
    });
  };

  const handleProductShadowChange = (
    property: string,
    value: number | boolean
  ) => {
    if (!editorCanvas) return;

    setProductShadow((prev) => ({
      ...prev,
      [property]: value,
    }));

    const productImage = editorCanvas
      .getObjects()
      .find((obj) => obj instanceof fabric.Image);

    if (productImage) {
      if (property === "enabled") {
        if (value) {
          productImage.set(
            "shadow",
            new fabric.Shadow({
              color: `rgba(0,0,0,${productShadow.opacity})`,
              blur: productShadow.blur,
              offsetX: 0,
              offsetY: productShadow.offsetY,
            })
          );
        } else {
          productImage.set("shadow", undefined);
        }
      } else {
        if (productShadow.enabled) {
          const numValue = typeof value === "boolean" ? (value ? 1 : 0) : value;
          productImage.set(
            "shadow",
            new fabric.Shadow({
              color: `rgba(0,0,0,${property === "opacity" ? numValue : productShadow.opacity})`,
              blur: property === "blur" ? Number(numValue) : productShadow.blur,
              offsetX: 0,
              offsetY:
                property === "offsetY"
                  ? Number(numValue)
                  : productShadow.offsetY,
            })
          );
        }
      }
      editorCanvas.renderAll();
    }
  };

  const proxyImage = (url: string) => {
    // Usar um serviço de proxy de imagem para evitar problemas de CORS
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&n=1`;
  };

  const loadProductImage = (
    imageUrl: string,
    onSuccess: (img: fabric.Image) => void
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
            (CANVAS_WIDTH * 0.7) / img.width!,
            (CANVAS_HEIGHT * 0.4) / img.height!
          );

          img.set({
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT * 0.45,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: true,
          });

          if (productShadow.enabled) {
            img.set(
              "shadow",
              new fabric.Shadow({
                color: `rgba(0,0,0,${productShadow.opacity})`,
                blur: productShadow.blur,
                offsetX: 0,
                offsetY: productShadow.offsetY,
              })
            );
          }

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
            (CANVAS_WIDTH * 0.7) / fabricImg.width!,
            (CANVAS_HEIGHT * 0.4) / fabricImg.height!
          );

          fabricImg.set({
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT * 0.45,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: true,
          });

          if (productShadow.enabled) {
            fabricImg.set(
              "shadow",
              new fabric.Shadow({
                color: `rgba(0,0,0,${productShadow.opacity})`,
                blur: productShadow.blur,
                offsetX: 0,
                offsetY: productShadow.offsetY,
              })
            );
          }

          onSuccess(fabricImg);
        },
        { crossOrigin: "anonymous" }
      );
    };
    img.onerror = handleImageError;
    img.src = imageUrl;
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "background" | "productImage"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editorCanvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result || !editorCanvas) return;

      const imgUrl = event.target.result.toString();

      if (type === "background") {
        fabric.Image.fromURL(imgUrl, (img) => {
          if (!editorCanvas) return;

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
            selectable: true,
          });

          // Definir como background
          editorCanvas.setBackgroundImage(
            img,
            editorCanvas.renderAll.bind(editorCanvas)
          );
        });
      } else {
        // Lógica para imagem do produto
        fabric.Image.fromURL(imgUrl, (img) => {
          if (!editorCanvas) return;

          const scale = Math.min(
            (CANVAS_WIDTH * 0.7) / img.width!,
            (CANVAS_HEIGHT * 0.4) / img.height!
          );

          const extendedImg = img as ExtendedFabricObject;
          extendedImg.set({
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT * 0.45,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: true,
          });
          extendedImg.id = "productImage";

          if (productShadow.enabled) {
            extendedImg.set(
              "shadow",
              new fabric.Shadow({
                color: `rgba(0,0,0,${productShadow.opacity})`,
                blur: productShadow.blur,
                offsetX: 0,
                offsetY: productShadow.offsetY,
              })
            );
          }

          // Remover imagem anterior do produto, se existir
          const existingProductImage = editorCanvas
            .getObjects()
            .find((obj) => obj instanceof fabric.Image);
          if (existingProductImage) {
            editorCanvas.remove(existingProductImage);
          }

          editorCanvas.add(extendedImg);
        });
      }
      editorCanvas.renderAll();
    };
    reader.readAsDataURL(file);

    setFormData((prev) => ({
      ...prev,
      [type]: file,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (!editorCanvas) return;

    // Comportamento normal para todos os campos
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    const objects = editorCanvas.getObjects() as ExtendedFabricText[];
    const textObject = objects.find((obj) => obj.id === name);

    if (textObject) {
      (textObject as fabric.Text).set({
        text: name === "price" ? value.toUpperCase() : value,
      });
      editorCanvas.renderAll();
    } else {
      let top = elementStyles.top;
      let fontSize = elementStyles.fontSize;

      // Posicionar a vigência no topo
      if (name === "validity") {
        top = CANVAS_HEIGHT * 0.05;
        fontSize = 32;
      }
      // Posicionar o texto legal na parte inferior
      else if (name === "legalText") {
        top = CANVAS_HEIGHT * 0.95;
        fontSize = 24;
      }
      // Posicionar o preço abaixo da descrição
      else if (name === "price") {
        top = elementStyles.top + 60;
      }

      const newText = new fabric.Text(
        name === "price" ? value.toUpperCase() : value,
        {
          left: elementStyles.left,
          top: top,
          fontSize: fontSize,
          fill: elementStyles.fill,
          fontFamily: "Arial",
          fontWeight: "700",
          originX: "center",
          originY: "center",
          stroke: elementStyles.stroke,
          strokeWidth: elementStyles.strokeWidth,
          shadow: new fabric.Shadow({
            color: elementStyles.shadow.color,
            blur: elementStyles.shadow.blur,
            offsetX: elementStyles.shadow.offsetX,
            offsetY: elementStyles.shadow.offsetY,
          }),
          selectable: true,
          hasControls: true,
          hasBorders: true,
        }
      ) as ExtendedFabricText;
      newText.id = name;

      editorCanvas.add(newText);
      editorCanvas.setActiveObject(newText);
      setSelectedElement(newText);
      editorCanvas.renderAll();
    }
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

    editorCanvas.renderAll();
  };

  const handleSearchProduct = async (code: string) => {
    if (!code || !editorCanvas) return;

    try {
      setIsSearching(true);
      const response = await fetch(`http://172.16.23.35:8000/produtos/${code}`);

      if (!response.ok) {
        throw new Error("Failed to fetch product data");
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const product = data[0];

        setFormData((prev) => ({
          ...prev,
          description: product.descricao,
          price:
            product.vl_oferta > 0 ? `R$ ${product.vl_oferta.toFixed(2)}` : "",
        }));

        // Usar o proxy para a imagem do produto
        const proxiedImageUrl = proxyImage(product.link_imagem);

        // Load the product image with error handling
        loadProductImage(proxiedImageUrl, (img) => {
          if (!editorCanvas) return;

          // Remover imagem anterior do produto, se existir
          const existingProductImage = editorCanvas
            .getObjects()
            .find((obj) => obj instanceof fabric.Image);
          if (existingProductImage) {
            editorCanvas.remove(existingProductImage);
          }

          // Make the image selectable
          img.set({
            selectable: true,
            hasControls: true,
            hasBorders: true,
          });

          editorCanvas.add(img);
          editorCanvas.renderAll();

          // Criar ou atualizar textos
          const objects = editorCanvas.getObjects() as ExtendedFabricText[];

          // Atualizar descrição
          const descriptionText = objects.find(
            (obj) => obj.id === "description"
          );
          if (descriptionText) {
            (descriptionText as fabric.Text).set({
              text: product.descricao.toUpperCase(),
            });
          } else {
            const newText = new fabric.Text(product.descricao.toUpperCase(), {
              left: elementStyles.left,
              top: elementStyles.top,
              fontSize: elementStyles.fontSize,
              fill: elementStyles.fill,
              fontFamily: "Arial",
              fontWeight: "700",
              originX: "center",
              originY: "center",
              stroke: elementStyles.stroke,
              strokeWidth: elementStyles.strokeWidth,
              shadow: new fabric.Shadow({
                color: elementStyles.shadow.color,
                blur: elementStyles.shadow.blur,
                offsetX: elementStyles.shadow.offsetX,
                offsetY: elementStyles.shadow.offsetY,
              }),
              selectable: true,
              hasControls: true,
              hasBorders: true,
            }) as ExtendedFabricText;
            newText.id = "description";
            editorCanvas.add(newText);
          }

          // Atualizar preço
          if (product.vl_oferta > 0) {
            const priceText = objects.find((obj) => obj.id === "price");
            const priceValue = `R$ ${product.vl_oferta.toFixed(2)}`;
            if (priceText) {
              (priceText as fabric.Text).set({
                text: priceValue,
              });
            } else {
              const newText = new fabric.Text(priceValue, {
                left: elementStyles.left,
                top: elementStyles.top + 60,
                fontSize: elementStyles.fontSize,
                fill: elementStyles.fill,
                fontFamily: "Arial",
                fontWeight: "700",
                originX: "center",
                originY: "center",
                stroke: elementStyles.stroke,
                strokeWidth: elementStyles.strokeWidth,
                shadow: new fabric.Shadow({
                  color: elementStyles.shadow.color,
                  blur: elementStyles.shadow.blur,
                  offsetX: elementStyles.shadow.offsetX,
                  offsetY: elementStyles.shadow.offsetY,
                }),
                selectable: true,
                hasControls: true,
                hasBorders: true,
              }) as ExtendedFabricText;
              newText.id = "price";
              editorCanvas.add(newText);
            }
          }

          editorCanvas.renderAll();
        });
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportToCanvas = async () => {
    if (!editorCanvas) return;

    try {
      // Criar uma cópia temporária dos objetos atuais
      const currentObjects = editorCanvas.getObjects();
      const currentBackground = editorCanvas.backgroundImage;
      const currentZoom = editorCanvas.getZoom();

      // Temporariamente definir zoom para 1 para exportar em tamanho real
      editorCanvas.setZoom(1);
      editorCanvas.setWidth(CANVAS_WIDTH);
      editorCanvas.setHeight(CANVAS_HEIGHT);

      // Forçar uma renderização
      editorCanvas.renderAll();

      // Pequeno delay para garantir que a renderização foi completada
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataURL = editorCanvas.toDataURL({
        format: "png",
        quality: 1,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      });

      // Restaurar o zoom original
      editorCanvas.setZoom(currentZoom);
      editorCanvas.setWidth(CANVAS_WIDTH * currentZoom);
      editorCanvas.setHeight(CANVAS_HEIGHT * currentZoom);
      editorCanvas.renderAll();

      // Criar a nova imagem no canvas principal
      await new Promise<void>((resolve, reject) => {
        fabric.Image.fromURL(dataURL, (img) => {
          try {
            const extendedImg = img as ExtendedFabricObject;
            extendedImg.set({
              left: 0,
              top: 0,
              selectable: true,
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
            });
            extendedImg.objectId = uuidv4();

            // Verificar se fabricRef existe antes de usá-lo
            if (fabricRef && fabricRef.current) {
              fabricRef.current.add(extendedImg);
              fabricRef.current.renderAll();

              if (syncShapeInStorage) {
                syncShapeInStorage(extendedImg);
              }
            }

            setIsModalOpen(false);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (err) {
      console.error("Erro ao importar para o canvas:", err);
    }
  };

  const handleDownload = async () => {
    if (!editorCanvas) return;

    try {
      const currentZoom = editorCanvas.getZoom();

      // Definir dimensões reais
      editorCanvas.setZoom(1);
      editorCanvas.setWidth(CANVAS_WIDTH);
      editorCanvas.setHeight(CANVAS_HEIGHT);

      // Forçar uma renderização e aguardar todas as imagens carregarem
      editorCanvas.renderAll();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        // Tentar primeiro método: toDataURL direto
        const dataUrl = editorCanvas.toDataURL({
          format: "png",
          quality: 1,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          enableRetinaScaling: true,
        });

        // Restaurar zoom
        editorCanvas.setZoom(currentZoom);
        editorCanvas.setWidth(CANVAS_WIDTH * currentZoom);
        editorCanvas.setHeight(CANVAS_HEIGHT * currentZoom);
        editorCanvas.renderAll();

        // Download
        const link = document.createElement("a");
        link.download = "kv-mercale.png";
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (exportError) {
        console.error("Erro ao exportar canvas:", exportError);

        // Segundo método: Converter canvas para blob
        try {
          const canvasElement = editorCanvas.getElement();
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvasElement.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("Failed to create blob"));
                }
              },
              "image/png",
              1
            );
          });

          // Criar URL do blob e fazer download
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = "kv-mercale.png";
          link.href = blobUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch (blobError) {
          console.error("Erro ao criar blob:", blobError);
          throw blobError;
        }
      }
    } catch (err) {
      console.error("Erro ao baixar imagem:", err);
      alert("Não foi possível baixar a imagem. Por favor, tente novamente.");
    }
  };

  const handleRemoveBackground = async () => {
    if (!editorCanvas) return;

    const productImage = editorCanvas
      .getObjects()
      .find((obj) => obj instanceof fabric.Image);

    if (!productImage) {
      alert("Nenhuma imagem de produto encontrada");
      return;
    }

    try {
      setIsRemovingBackground(true);

      // Obter a imagem atual como base64
      const image = productImage as fabric.Image;
      const dataURL = image.toDataURL({
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

        // Manter as mesmas propriedades da imagem original
        newImg.set({
          left: image.left,
          top: image.top,
          scaleX: image.scaleX,
          scaleY: image.scaleY,
          angle: image.angle,
          flipX: image.flipX,
          flipY: image.flipY,
          skewX: image.skewX,
          skewY: image.skewY,
          originX: image.originX,
          originY: image.originY,
          selectable: true,
          crossOrigin: "anonymous",
        });

        // Manter a sombra se estiver habilitada
        if (productShadow.enabled) {
          newImg.set(
            "shadow",
            new fabric.Shadow({
              color: `rgba(0,0,0,${productShadow.opacity})`,
              blur: productShadow.blur,
              offsetX: 0,
              offsetY: productShadow.offsetY,
            })
          );
        }

        // Substituir a imagem antiga pela nova
        editorCanvas.remove(image);
        editorCanvas.add(newImg);
        editorCanvas.renderAll();

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

  const handleSaveTemplate = () => {
    if (!editorCanvas) return;

    // Capturar o background atual
    const backgroundImage = editorCanvas.backgroundImage as fabric.Image;

    const template: KVTemplate = {
      id: Date.now().toString(),
      name: formData.productName || "Template sem nome",
      description: formData.productDescription || "Sem descrição",
      createdAt: new Date().toISOString(),
      elements: [
        // Salvar o background como primeiro elemento com flag especial
        ...(backgroundImage
          ? [
              {
                ...backgroundImage.toObject(["id"]),
                type: "image",
                isBackground: true,
                src: backgroundImage.getSrc(),
              },
            ]
          : []),
        // Salvar outros elementos
        ...editorCanvas.getObjects().map((obj) => {
          const objData = obj.toObject(["id"]);
          if (obj instanceof fabric.Image) {
            return {
              ...objData,
              type: "image",
              src: (obj as fabric.Image).getSrc(),
            };
          }
          return {
            ...objData,
            type: obj.type,
          };
        }),
      ],
    };

    try {
      const savedTemplates = localStorage.getItem("kvTemplates");
      const templates: KVTemplate[] = savedTemplates
        ? JSON.parse(savedTemplates)
        : [];
      templates.push(template);
      localStorage.setItem("kvTemplates", JSON.stringify(templates));
      alert("Template salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      alert("Erro ao salvar template. Tente novamente.");
    }
  };

  const handleSelectTemplate = (template: KVTemplate) => {
    if (!editorCanvas) return;

    // Limpar o canvas atual
    editorCanvas.clear();

    // Processar os elementos do template
    template.elements.forEach(async (element: any) => {
      if (element.isBackground) {
        // Carregar o background
        await new Promise<void>((resolve) => {
          fabric.Image.fromURL(
            element.src,
            (img) => {
              img.set({
                ...element,
                left: CANVAS_WIDTH / 2,
                top: CANVAS_HEIGHT / 2,
                originX: "center",
                originY: "center",
                selectable: false,
              });

              editorCanvas.setBackgroundImage(img, () => {
                editorCanvas.renderAll();
                resolve();
              });
            },
            { crossOrigin: "anonymous" }
          );
        });
      } else if (element.type === "image") {
        // Carregar imagens normais
        await new Promise<void>((resolve) => {
          fabric.Image.fromURL(
            element.src,
            (img) => {
              img.set({
                ...element,
                selectable: true,
              });
              editorCanvas.add(img);
              editorCanvas.renderAll();
              resolve();
            },
            { crossOrigin: "anonymous" }
          );
        });
      } else {
        // Recriar outros elementos (textos, etc)
        let obj;
        if (element.type === "text") {
          obj = new fabric.Text(element.text || "", {
            ...element,
            selectable: true,
          });
        }

        if (obj) {
          editorCanvas.add(obj);
        }
      }
    });

    editorCanvas.renderAll();
  };

  const handleShadowChange = (property: string, value: number) => {
    if (!editorCanvas) return;

    const productImage = editorCanvas
      .getObjects()
      .find((obj) => obj.type === "image") as fabric.Image;

    if (productImage && productImage.shadow) {
      const shadow = productImage.shadow as fabric.Shadow;
      switch (property) {
        case "blur":
          shadow.blur = value;
          break;
        case "distance":
          shadow.offsetX = value;
          shadow.offsetY = value;
          break;
        case "opacity":
          // Use a different approach since opacity is not directly supported
          const currentColor = shadow.color?.toString() || "rgba(0,0,0,1)";
          const rgbaMatch = currentColor.match(
            /rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/
          );

          if (rgbaMatch) {
            const newColor = `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${value / 100})`;
            shadow.color = newColor;
          }
          break;
      }
      editorCanvas.renderAll();
    }
  };

  const handleCreateGridKV = () => {
    setIsGridModalOpen(true);
  };

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='flex flex-wrap gap-3'>
        <button
          onClick={() => setIsModalOpen(true)}
          className='flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700'
        >
          <Plus size={16} />
          Criar NOVO KV
        </button>
        <KVGridButton onClick={handleCreateGridKV} />

        <button
          onClick={() => setShowTemplates(true)}
          className='flex items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700'
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
            <rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect>
            <line x1='3' y1='9' x2='21' y2='9'></line>
            <line x1='9' y1='21' x2='9' y2='9'></line>
          </svg>
          Editar KV Existente
        </button>
      </div>

      <KVModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className='flex flex-col gap-6 px-5 py-5'>
          <div className='flex items-center justify-between'>
            <h1 className='text-xl font-bold text-primary-grey-300'>
              Gerador de KV
            </h1>
            <div className='flex gap-2'>
              <button
                onClick={handleSaveTemplate}
                className='flex items-center justify-center gap-2 rounded-md bg-primary-green px-4 py-2 text-sm font-medium text-primary-black transition-colors hover:bg-primary-green/90'
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
                  <path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'></path>
                  <polyline points='17 21 17 13 7 13 7 21'></polyline>
                  <polyline points='7 3 7 8 15 8'></polyline>
                </svg>
                Salvar Template
              </button>
              <button
                onClick={handleDownload}
                className='flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700'
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
                Baixar Imagem
              </button>
              {/* <button
                onClick={handleImportToCanvas}
                className='flex items-center justify-center gap-2 rounded-md border border-blue-500 bg-transparent px-4 py-2 text-sm font-medium text-blue-500 transition-colors hover:bg-blue-500/10'
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
                  <polyline points='17 8 12 3 7 8'></polyline>
                  <line x1='12' y1='3' x2='12' y2='15'></line>
                </svg>
                Importar para Canvas
              </button> */}
            </div>
          </div>

          <div className='flex gap-6'>
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
                    <rect
                      x='3'
                      y='3'
                      width='18'
                      height='18'
                      rx='2'
                      ry='2'
                    ></rect>
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
                      Adicionar Background
                    </label>
                    <input
                      id='background-upload'
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={(e) => handleFileChange(e, "background")}
                    />
                  </div>
                </div>
              </div>

              {/* Product Information Section */}
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
                  Informações do Produto
                </h3>
                <KVForm
                  formData={formData}
                  onFileChange={handleFileChange}
                  onInputChange={handleInputChange}
                  onSearchProduct={handleSearchProduct}
                  isSearching={isSearching}
                />
              </div>

              {/* Product Image Settings */}
              {editorCanvas
                ?.getObjects()
                .some((obj) => obj instanceof fabric.Image) && (
                <div className='rounded-lg border border-gray-800 bg-primary-black p-4 shadow-md'>
                  <div className='mb-3 flex items-center justify-between'>
                    <h3 className='flex items-center gap-2 text-base font-semibold text-primary-grey-300'>
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
                        <rect
                          x='3'
                          y='3'
                          width='18'
                          height='18'
                          rx='2'
                          ry='2'
                        ></rect>
                        <circle cx='8.5' cy='8.5' r='1.5'></circle>
                        <polyline points='21 15 16 10 5 21'></polyline>
                      </svg>
                      Imagem do Produto
                    </h3>
                  </div>

                  <div className='space-y-4'>
                    <button
                      onClick={handleRemoveBackground}
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

                    <div className='mt-4 border-t border-gray-800 pt-4'>
                      <div className='flex items-center'>
                        <input
                          type='checkbox'
                          id='shadowToggle'
                          checked={productShadow.enabled}
                          onChange={(e) =>
                            handleProductShadowChange(
                              "enabled",
                              e.target.checked
                            )
                          }
                          className='h-4 w-4 rounded border-gray-400 accent-blue-500'
                        />
                        <label
                          htmlFor='shadowToggle'
                          className='ml-2 text-sm text-primary-grey-300'
                        >
                          Ativar Sombra
                        </label>
                      </div>

                      {productShadow.enabled && (
                        <div className='mt-3 space-y-3'>
                          <div className='flex flex-col gap-1'>
                            <div className='mb-1 flex justify-between'>
                              <label className='text-xs text-primary-grey-300'>
                                Desfoque ({productShadow.blur}px)
                              </label>
                            </div>
                            <input
                              type='range'
                              min='0'
                              max='50'
                              value={productShadow.blur}
                              onChange={(e) =>
                                handleProductShadowChange(
                                  "blur",
                                  Number(e.target.value)
                                )
                              }
                              className='w-full accent-blue-500'
                            />
                          </div>

                          <div className='flex flex-col gap-1'>
                            <div className='mb-1 flex justify-between'>
                              <label className='text-xs text-primary-grey-300'>
                                Distância ({productShadow.offsetY}px)
                              </label>
                            </div>
                            <input
                              type='range'
                              min='0'
                              max='50'
                              value={productShadow.offsetY}
                              onChange={(e) =>
                                handleProductShadowChange(
                                  "offsetY",
                                  Number(e.target.value)
                                )
                              }
                              className='w-full accent-blue-500'
                            />
                          </div>

                          <div className='flex flex-col gap-1'>
                            <div className='mb-1 flex justify-between'>
                              <label className='text-xs text-primary-grey-300'>
                                Opacidade ({productShadow.opacity})
                              </label>
                            </div>
                            <input
                              type='range'
                              min='0'
                              max='1'
                              step='0.1'
                              value={productShadow.opacity}
                              onChange={(e) =>
                                handleProductShadowChange(
                                  "opacity",
                                  Number(e.target.value)
                                )
                              }
                              className='w-full accent-blue-500'
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Personalização Section */}
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
                    <circle cx='12' cy='12' r='3'></circle>
                    <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'></path>
                  </svg>
                  Personalização
                </h3>

                <div className='space-y-4'>
                  <div className='mt-2 space-y-3'>
                    <p className='text-primary-grey-400 mb-2 text-xs font-medium'>
                      Posicionamento do KV
                    </p>

                    <div className='flex flex-col gap-1'>
                      <div className='mb-1 flex justify-between'>
                        <label className='text-xs text-primary-grey-300'>
                          Posição do Texto
                        </label>
                      </div>
                      <div className='grid grid-cols-3 gap-2'>
                        <button
                          className='bg-primary-grey-800 hover:bg-primary-grey-700 flex flex-col items-center justify-center rounded-md p-2 text-xs text-white transition-colors'
                          onClick={() => {
                            const descriptionText = editorCanvas
                              ?.getObjects()
                              .find((obj) => (obj as any).id === "description");
                            const priceText = editorCanvas
                              ?.getObjects()
                              .find((obj) => (obj as any).id === "price");

                            if (descriptionText) {
                              descriptionText.set({
                                top: CANVAS_HEIGHT * 0.7,
                                left: CANVAS_WIDTH / 2,
                              });
                            }

                            if (priceText) {
                              priceText.set({
                                top: CANVAS_HEIGHT * 0.8,
                                left: CANVAS_WIDTH / 2,
                              });
                            }

                            editorCanvas?.renderAll();
                          }}
                        >
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='20'
                            height='20'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          >
                            <rect
                              x='3'
                              y='3'
                              width='18'
                              height='18'
                              rx='2'
                              ry='2'
                            ></rect>
                            <line x1='3' y1='15' x2='21' y2='15'></line>
                          </svg>
                          <span>Abaixo</span>
                        </button>

                        <button
                          className='bg-primary-grey-800 hover:bg-primary-grey-700 flex flex-col items-center justify-center rounded-md p-2 text-xs text-white transition-colors'
                          onClick={() => {
                            const descriptionText = editorCanvas
                              ?.getObjects()
                              .find((obj) => (obj as any).id === "description");
                            const priceText = editorCanvas
                              ?.getObjects()
                              .find((obj) => (obj as any).id === "price");

                            if (descriptionText) {
                              descriptionText.set({
                                top: CANVAS_HEIGHT * 0.3,
                                left: CANVAS_WIDTH / 2,
                              });
                            }

                            if (priceText) {
                              priceText.set({
                                top: CANVAS_HEIGHT * 0.4,
                                left: CANVAS_WIDTH / 2,
                              });
                            }

                            editorCanvas?.renderAll();
                          }}
                        >
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='20'
                            height='20'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          >
                            <rect
                              x='3'
                              y='3'
                              width='18'
                              height='18'
                              rx='2'
                              ry='2'
                            ></rect>
                            <line x1='3' y1='9' x2='21' y2='9'></line>
                          </svg>
                          <span>Acima</span>
                        </button>

                        <button
                          className='bg-primary-grey-800 hover:bg-primary-grey-700 flex flex-col items-center justify-center rounded-md p-2 text-xs text-white transition-colors'
                          onClick={() => {
                            const descriptionText = editorCanvas
                              ?.getObjects()
                              .find((obj) => (obj as any).id === "description");
                            const priceText = editorCanvas
                              ?.getObjects()
                              .find((obj) => (obj as any).id === "price");

                            if (descriptionText) {
                              descriptionText.set({
                                top: CANVAS_HEIGHT * 0.5,
                                left: CANVAS_WIDTH / 2,
                              });
                            }

                            if (priceText) {
                              priceText.set({
                                top: CANVAS_HEIGHT * 0.6,
                                left: CANVAS_WIDTH / 2,
                              });
                            }

                            editorCanvas?.renderAll();
                          }}
                        >
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='20'
                            height='20'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          >
                            <rect
                              x='3'
                              y='3'
                              width='18'
                              height='18'
                              rx='2'
                              ry='2'
                            ></rect>
                            <line x1='12' y1='3' x2='12' y2='21'></line>
                          </svg>
                          <span>Centro</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className='mt-4 border-t border-gray-800 pt-4'>
                    <p className='text-primary-grey-400 mb-2 text-xs font-medium'>
                      Estilos Rápidos
                    </p>

                    <div className='grid grid-cols-2 gap-2'>
                      <button
                        className='bg-primary-grey-800 hover:bg-primary-grey-700 flex items-center justify-center gap-2 rounded-md p-2 text-xs text-white transition-colors'
                        onClick={() => {
                          // Estilo promocional
                          const descriptionText = editorCanvas
                            ?.getObjects()
                            .find(
                              (obj) => (obj as any).id === "description"
                            ) as any;
                          const priceText = editorCanvas
                            ?.getObjects()
                            .find((obj) => (obj as any).id === "price") as any;

                          if (descriptionText) {
                            descriptionText.set({
                              fill: "#FFFFFF",
                              fontSize: 42,
                              fontWeight: "700",
                              shadow: new fabric.Shadow({
                                color: "rgba(0, 0, 0, 0.5)",
                                blur: 20,
                                offsetX: 0,
                                offsetY: 5,
                              }),
                            });
                          }

                          if (priceText) {
                            priceText.set({
                              fill: "#FF0000",
                              fontSize: 60,
                              fontWeight: "900",
                              shadow: new fabric.Shadow({
                                color: "rgba(0, 0, 0, 0.5)",
                                blur: 15,
                                offsetX: 0,
                                offsetY: 5,
                              }),
                            });
                          }

                          editorCanvas?.renderAll();
                        }}
                      >
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
                          <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'></polygon>
                        </svg>
                        <span>Promocional</span>
                      </button>

                      <button
                        className='bg-primary-grey-800 hover:bg-primary-grey-700 flex items-center justify-center gap-2 rounded-md p-2 text-xs text-white transition-colors'
                        onClick={() => {
                          // Estilo minimalista
                          const descriptionText = editorCanvas
                            ?.getObjects()
                            .find(
                              (obj) => (obj as any).id === "description"
                            ) as any;
                          const priceText = editorCanvas
                            ?.getObjects()
                            .find((obj) => (obj as any).id === "price") as any;

                          if (descriptionText) {
                            descriptionText.set({
                              fill: "#FFFFFF",
                              fontSize: 36,
                              fontWeight: "400",
                              shadow: null,
                              fontFamily: "Arial",
                            });
                          }

                          if (priceText) {
                            priceText.set({
                              fill: "#FFFFFF",
                              fontSize: 36,
                              fontWeight: "400",
                              shadow: null,
                              fontFamily: "Arial",
                            });
                          }

                          editorCanvas?.renderAll();
                        }}
                      >
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
                          <circle cx='12' cy='12' r='10'></circle>
                          <line x1='12' y1='8' x2='12' y2='16'></line>
                          <line x1='8' y1='12' x2='16' y2='12'></line>
                        </svg>
                        <span>Minimalista</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Element Editor */}
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
      <KVTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleSelectTemplate}
      />
      <KVGridSystem
        isOpen={isGridModalOpen}
        onClose={() => setIsGridModalOpen(false)}
      />
    </div>
  );
};

export default KVGenerate;
