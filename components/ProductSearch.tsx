"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

// Define product type
type Product = {
  codprod: number;
  descricao: string;
  codauxiliar: string;
  link_imagem: string;
};

const ProductSearch = () => {
  const [productCode, setProductCode] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string>("");

  const handleSearchProduct = async () => {
    if (!productCode) return;

    try {
      setIsSearching(true);
      const response = await fetch(
        `http://0.0.0.0:8000/produtos/${productCode}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch product data");
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error fetching product:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportStatus(`Processando arquivo: ${uploadedFile.name}`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result) return;

      try {
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log("Extracted data:", jsonData);

        if (!jsonData.length || !Array.isArray(jsonData[0])) {
          setImportStatus("Erro: Formato de arquivo inválido");
          return;
        }

        // Look for barcode column using various possible names
        const headers = jsonData.find(
          (row) => row.includes("Cód.Barra") || row.includes("Código de Barras")
        ) as string[];
        console.log("Headers found:", headers);

        const possibleBarcodeColumns = [
          "cód.barra",
          "cod.barra",
          "codbarra",
          "código de barras",
          "código",
          "barcode",
          "ean",
          "cód. barra",
        ];

        let barcodeIndex = -1;

        headers.forEach((header, index) => {
          const normalizedHeader = header.toString().trim().toLowerCase();
          if (
            possibleBarcodeColumns.some((col) => normalizedHeader.includes(col))
          ) {
            barcodeIndex = index;
            console.log(
              `Coluna de código de barras encontrada: "${header}" (Índice: ${index})`
            );
          }
        });

        if (barcodeIndex === -1) {
          console.error("Coluna de código de barras não encontrada.");
          setImportStatus("Erro: Coluna de código de barras não encontrada");
          return;
        }

        // Extract barcodes, filtering out empty values and converting to string
        const barcodes = jsonData
          .slice(1)
          .map((row: any) => row[barcodeIndex])
          .filter(Boolean)
          .map((code) => code.toString().trim());

        console.log(
          `Encontrados ${barcodes.length} códigos para buscar:`,
          barcodes.slice(0, 5)
        );
        setImportStatus(
          `Encontrados ${barcodes.length} códigos. Buscando produtos...`
        );

        // Fetch products in batches
        if (barcodes.length > 0) {
          await fetchProductsByBarcodes(barcodes);
        } else {
          setImportStatus("Nenhum código de barras encontrado no arquivo");
        }
      } catch (error) {
        console.error("Erro ao processar arquivo XLSX:", error);
        setImportStatus(
          `Erro ao processar arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`
        );
      }
    };

    reader.onerror = (error) => {
      console.error("Erro na leitura do arquivo:", error);
      setImportStatus("Erro na leitura do arquivo");
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const fetchProductsByBarcodes = async (barcodes: string[]) => {
    if (barcodes.length === 0) return;

    try {
      setIsSearching(true);

      // Remove the header if it's in the array
      const cleanedBarcodes = barcodes.filter(
        (code) =>
          !code.toLowerCase().includes("cód.barra") &&
          !code.toLowerCase().includes("código") &&
          code.trim() !== ""
      );

      console.log(
        `Enviando ${cleanedBarcodes.length} códigos para API:`,
        cleanedBarcodes.slice(0, 5)
      );

      // Format the request body correctly with the 'codigos' property
      const response = await fetch("http://0.0.0.0:8000/produtos/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigos: cleanedBarcodes }),
      });

      console.log("Status da resposta:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na API:", response.status, errorText);
        setImportStatus(
          `Erro na requisição: ${response.status} - ${errorText.substring(0, 100)}${errorText.length > 100 ? "..." : ""}`
        );
        setSearchResults([]);
        return;
      }

      const data = await response.json();
      console.log(`Retornados ${data.length} produtos da API`);

      setSearchResults(data);
      setImportStatus(
        data.length > 0
          ? `Importação concluída: ${data.length} produtos encontrados`
          : "Nenhum produto encontrado para os códigos fornecidos"
      );
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      setImportStatus(
        `Falha na busca: ${error instanceof Error ? error.message : "Erro desconhecido"}`
      );
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    console.log("Drag started with product:", product);

    // Check if the image URL is valid
    if (!product.link_imagem) {
      console.error("Product has no image URL");
      return;
    }

    // Log the exact URL for debugging
    console.log("Image URL being used for drag:", product.link_imagem);

    // Store the product image data in multiple formats for compatibility
    const data = {
      type: "product-image",
      data: product,
    };

    // Set data in application/json format
    e.dataTransfer.setData("application/json", JSON.stringify(data));

    // Also set as text for fallback
    e.dataTransfer.setData("text/plain", product.link_imagem);

    // Set effectAllowed to all common operations
    e.dataTransfer.effectAllowed = "copyMove";

    // Preload the image to verify it loads correctly
    const preloadImg = new window.Image();
    preloadImg.onload = () => {
      console.log("Image preloaded successfully:", product.link_imagem);
    };
    preloadImg.onerror = () => {
      console.error("Failed to preload image:", product.link_imagem);
    };
    preloadImg.src = product.link_imagem;

    // Use window.Image to create the drag image
    const img = new window.Image();
    img.src = product.link_imagem;
    img.onload = () => {
      // Only set drag image after it's loaded
      try {
        e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
      } catch (error) {
        console.error("Error setting drag image:", error);
      }
    };

    // Set a default drag image while the actual image loads
    const div = document.createElement("div");
    div.textContent = "Arrastando produto...";
    div.style.padding = "10px";
    div.style.background = "#333";
    div.style.color = "white";
    div.style.borderRadius = "4px";
    document.body.appendChild(div);
    e.dataTransfer.setDragImage(div, 0, 0);
    setTimeout(() => document.body.removeChild(div), 0);
  };

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='flex gap-2'>
        <Input
          type='number'
          value={productCode}
          onChange={(e) => setProductCode(e.target.value)}
          placeholder='Código do produto'
          className='bg-primary-grey-800 border-primary-grey-600 rounded-md border text-primary-grey-300 transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary-green'
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearchProduct();
          }}
        />
        <Button
          onClick={handleSearchProduct}
          disabled={isSearching}
          className='bg-primary-green text-primary-black shadow-md transition-shadow duration-200 hover:bg-primary-green/90'
        >
          <Search size={16} />
        </Button>
      </div>

      <div className='flex flex-col gap-2'>
        <input
          type='file'
          accept='.xlsx,.xls'
          onChange={handleFileUpload}
          className='hidden'
          id='fileInput'
        />
        <label
          htmlFor='fileInput'
          className='bg-primary-blue hover:bg-primary-blue/90 flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-white shadow-md transition-shadow duration-200'
        >
          <Upload size={16} />
          Importar tabloide
        </label>

        {importStatus && (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              importStatus.includes("Erro")
                ? "bg-red-900/20 text-red-400"
                : importStatus.includes("concluída")
                  ? "bg-green-900/20 text-green-400"
                  : "bg-blue-900/20 text-blue-400"
            }`}
          >
            {importStatus}
          </div>
        )}
      </div>

      <div className='mt-4'>
        {isSearching ? (
          <p className='animate-pulse text-sm text-primary-grey-300'>
            Buscando produtos...
          </p>
        ) : (
          <>
            {searchResults.length > 0 ? (
              <div className='space-y-4'>
                {searchResults.map((product) => (
                  <div
                    key={product.codprod}
                    className='bg-primary-grey-800 hover:bg-primary-grey-700 rounded-md border border-transparent p-4 transition-all duration-200 hover:border-primary-green/30 hover:shadow-lg hover:shadow-primary-green/20'
                    draggable
                    onDragStart={(e) => handleDragStart(e, product)}
                    title='Arraste para a tela para adicionar'
                  >
                    <div className='mb-3 flex h-32 items-center justify-center rounded-md bg-white/5 p-2'>
                      <div className='group relative cursor-move'>
                        <Image
                          src={product.link_imagem}
                          alt={product.descricao}
                          width={120}
                          height={120}
                          className='object-contain transition-transform duration-200 group-hover:scale-105'
                        />
                        <div className='absolute inset-0 flex items-center justify-center rounded-md bg-primary-green/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
                          <span className='rounded-md bg-primary-black/70 px-2 py-1 text-xs font-medium text-primary-green'>
                            Arraste-me
                          </span>
                        </div>
                      </div>
                    </div>
                    <h3 className='text-primary-grey-500 line-clamp-2 min-h-[40px] text-sm font-semibold'>
                      {product.descricao}
                    </h3>
                    <div className='mt-2 flex items-center'>
                      <span className='rounded-full bg-primary-green/20 px-2 py-0.5 text-xs font-medium text-primary-green'>
                        Cód: {product.codauxiliar}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              productCode && (
                <p className='text-primary-grey-400 text-sm'>
                  Nenhum produto encontrado
                </p>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductSearch;
