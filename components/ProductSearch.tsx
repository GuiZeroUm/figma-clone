"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImportTabloide from "./ImportTabloide";
import BulkKVGenerator from "./BulkKVGenerator";

// Define product type
export interface Product {
  codprod: number;
  descricao: string;
  codauxiliar: string;
  link_imagem: string;
  vl_oferta: number;
  preco_tabloide?: string;
}

const ProductSearch = () => {
  const [productCode, setProductCode] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);
  const [imageCache] = useState<Set<string>>(new Set());

  // Usando uma imagem local para evitar problemas de CORS
  const DEFAULT_IMAGE =
    "https://thumb.ac-illust.com/b1/b170870007dfa419295d949814474ab2_t.jpeg";

  const handleImageError = (productId: string) => {
    if (!imageCache.has(productId)) {
      imageCache.add(productId);
      return true;
    }
    return false;
  };

  const checkImageExists = async (url: string): Promise<boolean> => {
    if (!url) return false;
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  };

  const handleSearchProduct = async () => {
    if (!productCode) return;

    try {
      setIsSearching(true);
      const response = await fetch(
        `http://172.16.23.35:8000/produtos/${productCode}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch product data");
      }
      const data = await response.json();

      // Verificar cada imagem antes de adicionar ao resultado
      const productsWithValidImages = await Promise.all(
        data.map(async (product: Product) => {
          const hasValidImage = await checkImageExists(product.link_imagem);
          return {
            ...product,
            link_imagem: hasValidImage ? product.link_imagem : DEFAULT_IMAGE,
          };
        })
      );

      setSearchResults(productsWithValidImages);
    } catch (error) {
      console.error("Error fetching product:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleProductSelection = (product: Product) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.codprod === product.codprod);
      if (isSelected) {
        return prev.filter((p) => p.codprod !== product.codprod);
      } else {
        return [...prev, product];
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    console.log("Drag started with product:", product);

    if (!product.link_imagem) {
      console.error("Product has no image URL");
      return;
    }

    console.log("Image URL being used for drag:", product.link_imagem);

    const data = {
      type: "product-image",
      data: product,
    };

    e.dataTransfer.setData("application/json", JSON.stringify(data));
    e.dataTransfer.setData("text/plain", product.link_imagem);
    e.dataTransfer.effectAllowed = "copyMove";

    const preloadImg = new window.Image();
    preloadImg.onload = () => {
      console.log("Image preloaded successfully:", product.link_imagem);
    };
    preloadImg.onerror = () => {
      console.error("Failed to preload image:", product.link_imagem);
    };
    preloadImg.src = product.link_imagem;

    const img = new window.Image();
    img.src = product.link_imagem;
    img.onload = () => {
      try {
        e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
      } catch (error) {
        console.error("Error setting drag image:", error);
      }
    };

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

  const handleProductsFound = (products: Product[]) => {
    setSearchResults(products);
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

      {selectedProducts.length > 0 && (
        <div className='bg-primary-grey-800 flex flex-col items-center gap-2 rounded-md p-2'>
          <span className='text-sm text-primary-grey-300'>
            {selectedProducts.length} produto(s) selecionado(s)
          </span>
          <Button
            onClick={() => setShowBulkGenerator(true)}
            className='bg-primary-green text-primary-black hover:bg-primary-green/90'
          >
            Gerar em Massa
          </Button>
        </div>
      )}

      <ImportTabloide onProductsFound={handleProductsFound} />

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
                    className={`bg-primary-grey-800 rounded-md border p-4 transition-all duration-200 ${
                      selectedProducts.some(
                        (p) => p.codprod === product.codprod
                      )
                        ? "border-primary-green/30 shadow-lg shadow-primary-green/20"
                        : "border-transparent hover:border-primary-green/30 hover:shadow-lg hover:shadow-primary-green/20"
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, product)}
                    title='Arraste para a tela para adicionar'
                  >
                    <div className='mb-3 flex h-32 w-full items-center justify-center overflow-hidden rounded-md bg-white/5 p-2'>
                      <div className='group relative h-full w-full cursor-move'>
                        <div className='relative h-full w-full'>
                          <Image
                            src={product.link_imagem || DEFAULT_IMAGE}
                            alt={product.descricao}
                            fill
                            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                            className='object-contain transition-transform duration-200 group-hover:scale-105'
                            onError={(e) => {
                              e.preventDefault();
                              const target = e.target as HTMLImageElement;
                              if (target.src !== DEFAULT_IMAGE) {
                                target.src = DEFAULT_IMAGE;
                              }
                              target.onerror = null;
                            }}
                          />
                        </div>
                        <div className='absolute inset-0 flex items-center justify-center rounded-md bg-primary-green/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
                          <Button
                            onClick={() => toggleProductSelection(product)}
                            className='rounded-md bg-primary-black/70 px-2 py-1 text-xs font-medium text-primary-green hover:bg-primary-black/90'
                          >
                            {selectedProducts.some(
                              (p) => p.codprod === product.codprod
                            )
                              ? "Selecionado"
                              : "Selecionar"}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <h3 className='text-primary-grey-500 line-clamp-2 min-h-[40px] text-sm font-semibold'>
                      {product.descricao}
                    </h3>
                    <div className='mt-2 flex flex-col gap-2'>
                      <span className='rounded-full bg-primary-green/20 px-2 py-0.5 text-xs font-medium text-primary-green'>
                        Cód: {product.codauxiliar}
                      </span>
                      <div className='flex flex-col gap-1'>
                        <span className='bg-primary-blue/20 text-primary-blue rounded-md px-2 py-0.5 text-sm font-semibold'>
                          Preço Sistema:{" "}
                          {product.vl_oferta.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        {product.preco_tabloide && (
                          <span className='rounded-md bg-yellow-500/20 px-2 py-0.5 text-sm font-semibold text-yellow-500'>
                            Preço Tabloide: R$ {product.preco_tabloide}
                          </span>
                        )}
                        {!product.preco_tabloide && (
                          <span className='rounded-md bg-red-500/20 px-2 py-0.5 text-sm font-semibold text-red-500'>
                            Sem preço tabloide
                          </span>
                        )}
                      </div>
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

      {showBulkGenerator && (
        <BulkKVGenerator
          selectedProducts={selectedProducts}
          onClose={() => setShowBulkGenerator(false)}
        />
      )}
    </div>
  );
};

export default ProductSearch;
