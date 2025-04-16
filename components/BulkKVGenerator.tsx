import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "./ProductSearch";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface KVTemplate {
  id: string;
  name: string;
  elements: {
    type: string;
    id?: string;
    text?: string;
    src?: string;
    left: number;
    top: number;
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
    isBackground?: boolean;
    originX?: string;
    originY?: string;
    scaleX?: number;
    scaleY?: number;
  }[];
}

interface BulkKVGeneratorProps {
  selectedProducts: Product[];
  onClose: () => void;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

const BulkKVGenerator = ({
  selectedProducts,
  onClose,
}: BulkKVGeneratorProps) => {
  const [templates, setTemplates] = useState<KVTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState<number>(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{
    id: string;
    type: string;
    left: number;
    top: number;
    scale: number;
  } | null>(null);

  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem("kvTemplates");
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates);
        console.log("Templates carregados:", parsed);
        setTemplates(parsed);
      }
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      setError("Erro ao carregar templates");
    }
  }, []);

  const waitForImageLoad = (img: HTMLImageElement): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (img.complete) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error(`Failed to load image: ${img.src}`));
      }
    });
  };

  const getImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    if (url.includes("cdn-cosmos.bluesoft.com.br")) {
      return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&n=1`;
    }
    return url;
  };

  const handleRemoveBackground = async (imageUrl: string): Promise<string> => {
    try {
      setIsRemovingBackground(true);

      // Convert image to base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(",")[1]);
        };
        reader.readAsDataURL(blob);
      });

      // Send to background removal API
      const removeBgResponse = await fetch(
        "http://0.0.0.0:8000/remover-fundo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64Data,
          }),
        }
      );

      if (!removeBgResponse.ok) {
        throw new Error("Falha ao remover o fundo");
      }

      const data = await removeBgResponse.json();
      return data.processedImage;
    } catch (error) {
      console.error("Erro ao remover fundo:", error);
      throw error;
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const handleElementClick = (element: any) => {
    setSelectedElement({
      id: element.id || "",
      type: element.type,
      left: element.left,
      top: element.top,
      scale: element.scaleX || 1,
    });
  };

  const handleElementChange = (property: string, value: number) => {
    if (!selectedElement) return;

    setSelectedElement((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [property]: value,
      };
    });

    // Update the template
    setTemplates((prev) => {
      return prev.map((template) => {
        if (template.id === selectedTemplate) {
          return {
            ...template,
            elements: template.elements.map((el) => {
              if (el.id === selectedElement.id) {
                return {
                  ...el,
                  [property]: value,
                };
              }
              return el;
            }),
          };
        }
        return template;
      });
    });
  };

  const generatePreview = async (template: KVTemplate, product: Product) => {
    console.log("Iniciando geração de preview...");
    console.log("Template:", template);
    console.log("Produto:", product);

    setError(null);
    setIsGenerating(true);

    try {
      const container = document.createElement("div");
      container.style.width = `${CANVAS_WIDTH}px`;
      container.style.height = `${CANVAS_HEIGHT}px`;
      container.style.position = "relative";
      container.style.backgroundColor = "white";
      container.style.overflow = "hidden";
      document.body.appendChild(container);

      const imageLoadPromises: Promise<void>[] = [];

      // Process background
      const backgroundElement = template.elements.find(
        (obj) => obj.isBackground
      );
      if (backgroundElement?.src) {
        console.log("Processando background:", backgroundElement);
        const bgImg = document.createElement("img");
        bgImg.crossOrigin = "anonymous";
        bgImg.src = getImageUrl(backgroundElement.src);
        bgImg.style.position = "absolute";
        bgImg.style.left = "0";
        bgImg.style.top = "0";
        bgImg.style.width = "100%";
        bgImg.style.height = "100%";
        bgImg.style.objectFit = "cover";
        container.appendChild(bgImg);
        imageLoadPromises.push(waitForImageLoad(bgImg));
      }

      // Process normal elements
      const normalElements = template.elements.filter(
        (obj) => !obj.isBackground
      );

      // Process texts
      const textElements = normalElements.filter((obj) => obj.type === "text");
      textElements.forEach((element) => {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.left = `${element.left}px`;
        div.style.top = `${element.top}px`;
        div.style.fontSize = element.fontSize
          ? `${element.fontSize}px`
          : "16px";
        div.style.fontFamily = element.fontFamily || "Arial";
        div.style.color = element.fill || "black";
        div.style.transform = "translate(-50%, -50%)";
        div.style.whiteSpace = "nowrap";
        div.style.textAlign = "center";

        let text = element.text || "";
        if (element.id === "description") {
          text = product.descricao;
        } else if (element.id === "price") {
          text = product.vl_oferta.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
        }
        div.textContent = text;
        container.appendChild(div);
      });

      // Process images
      const imageElements = normalElements.filter(
        (obj) => obj.type === "image"
      );

      for (const element of imageElements) {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.left = `${element.left}px`;
        div.style.top = `${element.top}px`;
        div.style.transform = "translate(-50%, -50%)";

        const img = document.createElement("img");
        img.crossOrigin = "anonymous";

        let imageUrl =
          element.id === "productImage"
            ? getImageUrl(product.link_imagem)
            : getImageUrl(element.src || "");

        // Apply background removal if enabled
        if (element.id === "productImage" && isRemovingBackground) {
          try {
            imageUrl = await handleRemoveBackground(imageUrl);
          } catch (error) {
            console.error("Erro ao remover fundo:", error);
          }
        }

        img.src = imageUrl;

        if (element.width && element.height) {
          const width = element.scaleX
            ? element.width * element.scaleX
            : element.width;
          const height = element.scaleY
            ? element.height * element.scaleY
            : element.height;
          img.style.width = `${width}px`;
          img.style.height = `${height}px`;
        }

        img.style.objectFit = "contain";
        div.appendChild(img);
        container.appendChild(div);
        imageLoadPromises.push(waitForImageLoad(img));
      }

      await Promise.all(imageLoadPromises);
      const canvas = await html2canvas(container, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: true,
      });

      const dataUrl = canvas.toDataURL("image/png", 1.0);
      setPreviewImage(dataUrl);
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
      setError("Erro ao gerar preview");
    } finally {
      setIsGenerating(false);
      const container = document.querySelector(
        `div[style*="width: ${CANVAS_WIDTH}px"]`
      );
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        generatePreview(template, selectedProducts[currentProductIndex]);
      }
    }
  }, [selectedTemplate, currentProductIndex, isRemovingBackground]);

  const handleProductClick = (index: number) => {
    setCurrentProductIndex(index);
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        generatePreview(template, selectedProducts[index]);
      }
    }
  };

  const handleGenerateClick = async () => {
    if (!previewImage) return;

    setIsGenerating(true);
    try {
      const product = selectedProducts[currentProductIndex];
      const link = document.createElement("a");
      link.href = previewImage;
      link.download = `kv_${product.codauxiliar}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
      setError("Erro ao baixar imagem");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className='border-primary-grey-600 bg-[#1c1c1c] text-primary-grey-300 sm:max-w-[800px]'>
        <DialogHeader>
          <DialogTitle>Gerar KVs em Massa</DialogTitle>
          <DialogDescription className='text-primary-grey-400'>
            Selecione um template e clique nos produtos para visualizar o
            preview
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className='rounded-md bg-red-500/20 p-3 text-sm text-red-500'>
            {error}
          </div>
        )}

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-4'>
            <Card className='border-primary-grey-600 bg-[#2c2c2c]'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-medium'>Template</CardTitle>
                <CardDescription className='text-primary-grey-400 text-xs'>
                  Escolha o template que será usado para gerar os KVs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger className='border-primary-grey-600 w-full bg-[#363636]'>
                    <SelectValue placeholder='Selecione um template' />
                  </SelectTrigger>
                  <SelectContent className='border-primary-grey-600 bg-[#363636]'>
                    {templates.map((template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id}
                        className='text-primary-grey-300 focus:bg-[#2c2c2c] focus:text-primary-grey-100'
                      >
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className='border-primary-grey-600 bg-[#2c2c2c]'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-medium'>
                  Produtos Selecionados
                </CardTitle>
                <CardDescription className='text-primary-grey-400 text-xs'>
                  Clique em um produto para visualizar o preview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className='border-primary-grey-600 h-[200px] rounded-md border bg-[#363636] p-4'>
                  <div className='space-y-2'>
                    {selectedProducts.map((product, index) => (
                      <div
                        key={product.codprod}
                        onClick={() => handleProductClick(index)}
                        className={`cursor-pointer rounded-md p-3 text-sm transition-colors hover:bg-primary-green/10 ${
                          index === currentProductIndex
                            ? "border border-primary-green bg-primary-green/20"
                            : "bg-[#2c2c2c]"
                        }`}
                      >
                        <div className='font-medium'>{product.descricao}</div>
                        <div className='text-primary-grey-400 mt-1 text-xs'>
                          Código: {product.codauxiliar}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className='border-primary-grey-600 bg-[#2c2c2c]'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-medium'>
                  Configurações
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={isRemovingBackground}
                    onChange={(e) => setIsRemovingBackground(e.target.checked)}
                    className='h-4 w-4'
                  />
                  <label className='text-sm text-primary-grey-300'>
                    Remover Fundo
                  </label>
                </div>

                {selectedElement && (
                  <div className='space-y-4'>
                    <div className='flex flex-col gap-2'>
                      <label className='text-sm text-primary-grey-300'>
                        Posição X
                      </label>
                      <input
                        type='range'
                        min='0'
                        max={CANVAS_WIDTH}
                        value={selectedElement.left}
                        onChange={(e) =>
                          handleElementChange("left", Number(e.target.value))
                        }
                        className='w-full'
                      />
                    </div>

                    <div className='flex flex-col gap-2'>
                      <label className='text-sm text-primary-grey-300'>
                        Posição Y
                      </label>
                      <input
                        type='range'
                        min='0'
                        max={CANVAS_HEIGHT}
                        value={selectedElement.top}
                        onChange={(e) =>
                          handleElementChange("top", Number(e.target.value))
                        }
                        className='w-full'
                      />
                    </div>

                    <div className='flex flex-col gap-2'>
                      <label className='text-sm text-primary-grey-300'>
                        Escala
                      </label>
                      <input
                        type='range'
                        min='0.1'
                        max='3'
                        step='0.1'
                        value={selectedElement.scale}
                        onChange={(e) =>
                          handleElementChange("scale", Number(e.target.value))
                        }
                        className='w-full'
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className='border-primary-grey-600 rounded-lg border bg-[#2c2c2c] p-4'>
            {previewImage ? (
              <div className='relative aspect-[9/16] w-full overflow-hidden rounded-md'>
                <img
                  src={previewImage}
                  alt='Preview'
                  className='h-full w-full object-contain'
                />
              </div>
            ) : (
              <div className='border-primary-grey-600 flex aspect-[9/16] w-full items-center justify-center rounded-md border border-dashed'>
                <span className='text-primary-grey-400'>
                  {isGenerating
                    ? "Gerando preview..."
                    : selectedTemplate
                      ? "Carregando template..."
                      : "Selecione um template para visualizar o preview"}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className='flex w-full items-center justify-between'>
            <Button
              variant='outline'
              onClick={onClose}
              className='border-primary-grey-600 text-primary-grey-300 hover:bg-[#2c2c2c]'
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateClick}
              disabled={!selectedTemplate || !previewImage || isGenerating}
              className='bg-primary-green text-primary-black hover:bg-primary-green/90 disabled:opacity-50'
            >
              {isGenerating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Baixando...
                </>
              ) : (
                "Baixar KV"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkKVGenerator;
