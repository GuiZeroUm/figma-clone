import React, { useState, useEffect } from "react";
import { fabric } from "fabric";
import KVModal from "./KVModal";
import KVCanvas from "./KVCanvas";

interface KVTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
  onSave: (updatedTemplate: any) => void;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

const KVTemplateEditor = ({
  isOpen,
  onClose,
  template,
  onSave,
}: KVTemplateEditorProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [productCode, setProductCode] = useState("");
  const editorCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const [editorCanvas, setEditorCanvas] = useState<fabric.Canvas | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [productShadow, setProductShadow] = useState({
    enabled: false,
    blur: 15,
    offsetY: 15,
    opacity: 0.5,
  });
  const [templateName, setTemplateName] = useState(
    template?.name || "Template sem nome"
  );
  const [templateDescription, setTemplateDescription] = useState(
    template?.description || ""
  );

  const loadCanvasElements = async (canvas: fabric.Canvas) => {
    if (!template?.elements) return;

    // Limpar o canvas
    canvas.clear();

    try {
      // Primeiro, vamos carregar o background
      const backgroundElement = template.elements.find(
        (obj: any) => obj.isBackground
      );
      if (backgroundElement?.src) {
        await new Promise<void>((resolve) => {
          fabric.Image.fromURL(
            backgroundElement.src,
            (img) => {
              img.set({
                ...backgroundElement,
                left: CANVAS_WIDTH / 2,
                top: CANVAS_HEIGHT / 2,
                originX: "center",
                originY: "center",
                selectable: false,
              });

              canvas.setBackgroundImage(img, () => {
                canvas.renderAll();
                resolve();
              });
            },
            { crossOrigin: "anonymous" }
          );
        });
      }

      // Agora, vamos carregar os elementos normais
      const normalElements = template.elements.filter(
        (obj: any) => !obj.isBackground
      );

      // Carregar textos primeiro
      const textElements = normalElements.filter(
        (obj: any) => obj.type === "text"
      );
      textElements.forEach((textElement: any) => {
        const text = new fabric.Text(textElement.text, {
          ...textElement,
          left: textElement.left,
          top: textElement.top,
          fontSize: textElement.fontSize,
          fill: textElement.fill,
          fontFamily: textElement.fontFamily || "Arial",
          originX: textElement.originX || "center",
          originY: textElement.originY || "center",
          selectable: true,
        });

        // Ensure text elements have the correct IDs
        if (textElement.id) {
          (text as any).id = textElement.id;
        } else {
          // If no ID is provided, try to guess based on the text content
          const textContent = textElement.text.toLowerCase();
          if (
            textContent.includes("r$") ||
            textContent.includes("preço") ||
            textContent.includes("valor")
          ) {
            (text as any).id = "price";
            console.log(
              "Assigned 'price' ID to text element:",
              textElement.text
            );
          } else {
            (text as any).id = "description";
            console.log(
              "Assigned 'description' ID to text element:",
              textElement.text
            );
          }
        }

        canvas.add(text);
      });

      // Depois carregar imagens
      const imageElements = normalElements.filter(
        (obj: any) => obj.type === "image"
      );
      for (const imageElement of imageElements) {
        await new Promise<void>((resolve) => {
          fabric.Image.fromURL(
            imageElement.src,
            (img) => {
              img.set({
                ...imageElement,
                left: imageElement.left,
                top: imageElement.top,
                scaleX: imageElement.scaleX,
                scaleY: imageElement.scaleY,
                originX: imageElement.originX || "center",
                originY: imageElement.originY || "center",
                selectable: true,
              });

              // Ensure image elements have the correct IDs
              if (imageElement.id) {
                (img as any).id = imageElement.id;
              } else {
                // If no ID is provided, assume it's the product image
                (img as any).id = "productImage";
                console.log("Assigned 'productImage' ID to image element");
              }

              canvas.add(img);
              resolve();
            },
            { crossOrigin: "anonymous" }
          );
        });
      }

      canvas.renderAll();
    } catch (error) {
      console.error("Erro ao carregar elementos:", error);
    }
  };

  const handleCanvasReady = (canvas: fabric.Canvas) => {
    setEditorCanvas(canvas);
    loadCanvasElements(canvas);
  };

  // Function to ensure elements have the correct IDs
  const ensureElementIds = () => {
    let hasDescription = false;
    let hasPrice = false;
    let hasProductImage = false;

    if (editorCanvas) {
      const objects = editorCanvas.getObjects();
      console.log("Checking canvas for existing objects:", objects.length);

      objects.forEach((obj) => {
        if (obj.type === "text") {
          const textContent = (obj as any).text?.toLowerCase() || "";
          console.log("Found text element:", textContent);

          if (
            !hasDescription &&
            (textContent.includes("descrição") ||
              textContent.includes("nome") ||
              textContent.length > 10)
          ) {
            (obj as any).id = "description";
            hasDescription = true;
            console.log(
              "Assigned 'description' ID to text element:",
              textContent
            );
          } else if (
            !hasPrice &&
            (textContent.includes("r$") ||
              textContent.includes("preço") ||
              textContent.includes("valor"))
          ) {
            (obj as any).id = "price";
            hasPrice = true;
            console.log("Assigned 'price' ID to text element:", textContent);
          }
        } else if (obj.type === "image" && !hasProductImage) {
          (obj as any).id = "productImage";
          hasProductImage = true;
          console.log("Assigned 'productImage' ID to image element");
        }
      });
    }
  };

  const handleBackgroundUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !editorCanvas) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/background", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload background");
      }

      const data = await response.json();

      // Load the image into the canvas
      fabric.Image.fromURL(
        data.filePath,
        (img) => {
          img.set({
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2,
            originX: "center",
            originY: "center",
            selectable: false,
          });

          editorCanvas.setBackgroundImage(img, () => {
            editorCanvas.renderAll();
          });
        },
        { crossOrigin: "anonymous" }
      );
    } catch (error) {
      console.error("Error uploading background:", error);
      alert("Erro ao fazer upload do background. Tente novamente.");
    }
  };

  const handleSearchProduct = async () => {
    if (!editorCanvas || !productCode) return;

    try {
      setIsSearching(true);
      console.log("Searching for product:", productCode);

      // Ensure elements have the correct IDs before searching
      ensureElementIds();

      const response = await fetch(
        `http://0.0.0.0:8000/produtos/${productCode}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch product data");
      }

      const data = await response.json();
      console.log("Product data:", data);

      if (data && data.length > 0) {
        const product = data[0];
        console.log("Product to update:", product);

        // Store the current background image to preserve it
        const currentBackground = editorCanvas.backgroundImage;

        // Atualizar elementos existentes
        const objects = editorCanvas.getObjects();
        console.log("Canvas objects:", objects);

        // Primeiro atualizar textos
        let descriptionUpdated = false;
        let priceUpdated = false;

        objects.forEach((obj) => {
          if (obj instanceof fabric.Text) {
            console.log("Text object:", obj);
            if ((obj as any).id === "description") {
              console.log(
                "Updating description from",
                obj.text,
                "to",
                product.descricao.toUpperCase()
              );
              obj.set("text", product.descricao.toUpperCase());
              descriptionUpdated = true;
            } else if ((obj as any).id === "price") {
              console.log(
                "Updating price from",
                obj.text,
                "to",
                `R$ ${product.vl_oferta.toFixed(2)}`
              );
              obj.set("text", `R$ ${product.vl_oferta.toFixed(2)}`);
              priceUpdated = true;
            }
          }
        });

        console.log("Description updated:", descriptionUpdated);
        console.log("Price updated:", priceUpdated);

        // Depois atualizar a imagem do produto
        const productImage = objects.find(
          (obj) =>
            obj instanceof fabric.Image && (obj as any).id === "productImage"
        );

        console.log("Product image found:", !!productImage);

        if (productImage) {
          const currentProps = {
            left: productImage.left,
            top: productImage.top,
            scaleX: productImage.scaleX,
            scaleY: productImage.scaleY,
            angle: productImage.angle,
            originX: productImage.originX || "center",
            originY: productImage.originY || "center",
            selectable: true,
          };

          console.log("Current image properties:", currentProps);

          await new Promise<void>((resolve) => {
            fabric.Image.fromURL(
              `https://images.weserv.nl/?url=${encodeURIComponent(product.link_imagem)}&n=1`,
              (img) => {
                img.set(currentProps);
                (img as any).id = "productImage";
                editorCanvas.remove(productImage);
                editorCanvas.add(img);
                editorCanvas.renderAll();
                resolve();
              },
              { crossOrigin: "anonymous" }
            );
          });
        }

        // Ensure the background is preserved
        if (currentBackground) {
          editorCanvas.setBackgroundImage(currentBackground, () => {
            editorCanvas.renderAll();
          });
        }

        editorCanvas.renderAll();
      } else {
        console.log("No product found with code:", productCode);
        alert("Produto não encontrado. Verifique o código e tente novamente.");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      alert("Erro ao buscar produto. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = () => {
    if (!editorCanvas) return;

    const updatedTemplate = {
      ...template,
      name: templateName,
      description: templateDescription,
      elements: [
        // Background
        ...(editorCanvas.backgroundImage
          ? [
              {
                ...(editorCanvas.backgroundImage as fabric.Image).toObject([
                  "id",
                ]),
                isBackground: true,
                src: (editorCanvas.backgroundImage as fabric.Image).getSrc(),
              },
            ]
          : []),
        // Outros elementos
        ...editorCanvas.getObjects().map((obj) => {
          const objData = obj.toObject(["id"]);
          if (obj instanceof fabric.Image) {
            objData.src = (obj as fabric.Image).getSrc();
          }
          return objData;
        }),
      ],
      lastUpdated: new Date().toISOString(),
    };

    onSave(updatedTemplate);
    onClose();
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
      } catch (error) {
        console.error("Erro ao exportar canvas:", error);
        alert("Não foi possível baixar a imagem. Por favor, tente novamente.");
      }
    } catch (err) {
      console.error("Erro ao baixar imagem:", err);
      alert("Não foi possível baixar a imagem. Por favor, tente novamente.");
    }
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
      .find(
        (obj) =>
          obj instanceof fabric.Image && (obj as any).id === "productImage"
      );

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
          productImage.set(
            "shadow",
            new fabric.Shadow({
              color: `rgba(0,0,0,${property === "opacity" ? (value as number) : productShadow.opacity})`,
              blur:
                property === "blur" ? (value as number) : productShadow.blur,
              offsetX: 0,
              offsetY:
                property === "offsetY"
                  ? (value as number)
                  : productShadow.offsetY,
            })
          );
        }
      }
      editorCanvas.renderAll();
    }
  };

  const handleRemoveBackground = async () => {
    if (!editorCanvas) return;

    const productImage = editorCanvas
      .getObjects()
      .find(
        (obj) =>
          obj instanceof fabric.Image && (obj as any).id === "productImage"
      );

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
      const response = await fetch("http://0.0.0.0:8000/remover-fundo", {
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

        // Manter o ID da imagem
        (newImg as any).id = "productImage";

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

  return (
    <KVModal isOpen={isOpen} onClose={onClose}>
      <div className='flex flex-col gap-4 px-5 pt-4'>
        <h1 className='text-xl font-bold text-primary-grey-300'>
          Editar Template
        </h1>

        <div className='flex gap-8'>
          <div className='flex w-[300px] flex-col gap-4'>
            {/* Informações do template */}
            <div className='flex flex-col gap-2 rounded-lg bg-primary-black p-4'>
              <h3 className='text-lg font-semibold text-primary-grey-300'>
                Informações do Template
              </h3>

              <div className='flex flex-col gap-2'>
                <label className='text-sm text-primary-grey-300'>
                  Nome do Template
                </label>
                <input
                  type='text'
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className='rounded-md border border-primary-grey-200 bg-primary-black px-3 py-2 text-sm text-primary-grey-300'
                  placeholder='Digite o nome do template'
                />
              </div>

              <div className='flex flex-col gap-2'>
                <label className='text-sm text-primary-grey-300'>
                  Descrição
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className='rounded-md border border-primary-grey-200 bg-primary-black px-3 py-2 text-sm text-primary-grey-300'
                  placeholder='Digite a descrição do template'
                  rows={3}
                />
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <label className='text-sm text-primary-grey-300'>
                Background
              </label>
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleBackgroundUpload}
                accept='image/*'
                className='hidden'
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className='hover:bg-primary-green-dark rounded-md bg-primary-green px-3 py-2 text-sm text-primary-black'
              >
                Upload Background
              </button>
            </div>

            <div className='flex flex-col gap-2'>
              <label className='text-sm text-primary-grey-300'>
                Código do Produto
              </label>
              <div className='flex gap-2'>
                <input
                  type='text'
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className='flex-1 rounded-md border border-primary-grey-200 bg-primary-black px-3 py-2 text-sm text-primary-grey-300'
                  placeholder='Digite o código'
                />
                <button
                  onClick={handleSearchProduct}
                  disabled={isSearching}
                  className='hover:bg-primary-green-dark rounded-md bg-primary-green px-3 py-2 text-sm text-primary-black disabled:opacity-50'
                >
                  {isSearching ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>

            {/* Opções de imagem do produto */}
            {editorCanvas
              ?.getObjects()
              .some(
                (obj) =>
                  obj instanceof fabric.Image &&
                  (obj as any).id === "productImage"
              ) && (
              <div className='flex flex-col gap-4 rounded-lg bg-primary-black p-4'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold text-primary-grey-300'>
                    Imagem do Produto
                  </h3>
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBackground}
                    className='hover:bg-primary-green-dark rounded-md bg-primary-green px-3 py-1 text-sm text-primary-black disabled:opacity-50'
                  >
                    {isRemovingBackground ? "Removendo..." : "Remover Fundo"}
                  </button>
                </div>

                <div className='space-y-4'>
                  <div className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={productShadow.enabled}
                      onChange={(e) =>
                        handleProductShadowChange("enabled", e.target.checked)
                      }
                      className='h-4 w-4'
                    />
                    <label className='text-sm text-primary-grey-300'>
                      Ativar Sombra
                    </label>
                  </div>

                  {productShadow.enabled && (
                    <>
                      <div className='flex flex-col gap-2'>
                        <label className='text-sm text-primary-grey-300'>
                          Desfoque
                        </label>
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
                          className='w-full'
                        />
                      </div>

                      <div className='flex flex-col gap-2'>
                        <label className='text-sm text-primary-grey-300'>
                          Distância
                        </label>
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
                          className='w-full'
                        />
                      </div>

                      <div className='flex flex-col gap-2'>
                        <label className='text-sm text-primary-grey-300'>
                          Opacidade
                        </label>
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
                          className='w-full'
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className='flex gap-2'>
              <button
                onClick={handleSave}
                className='hover:bg-primary-blue-dark bg-primary-blue mt-4 flex-1 rounded-md px-4 py-2 text-sm text-white'
              >
                Salvar Alterações
              </button>
              <button
                onClick={handleDownload}
                className='hover:bg-primary-green-dark mt-4 flex-1 rounded-md bg-primary-green px-4 py-2 text-sm text-primary-black'
              >
                Baixar Imagem
              </button>
            </div>
          </div>

          <div className='sticky top-0'>
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

export default KVTemplateEditor;
