import { useState } from "react";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportTabloideProps {
  onProductsFound: (products: any[]) => void;
}

interface TableProduct {
  barcode: string;
  preco_tabloide?: string;
}

const ImportTabloide = ({ onProductsFound }: ImportTabloideProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const DEFAULT_IMAGE =
    "https://thumb.ac-illust.com/b1/b170870007dfa419295d949814474ab2_t.jpeg";

  const checkImageExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
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

        const possibleBarcodeColumns = [
          "cód.barra",
          "cod.barra",
          "codbarra",
          "código de barras",
          "código",
          "barcode",
          "ean",
          "cód. barra",
          "cód. barras",
          "CODBARRAS",
        ];

        let headerRowIndex = -1;
        let barcodeColumnIndex = -1;
        let priceColumnIndex = -1;

        // Search through the first 10 rows to find headers
        for (
          let rowIndex = 0;
          rowIndex < Math.min(10, jsonData.length);
          rowIndex++
        ) {
          const row = jsonData[rowIndex];
          if (!Array.isArray(row)) continue;

          // Check each cell in the row
          for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cell = row[colIndex];
            if (!cell) continue;

            const normalizedCell = cell.toString().trim().toUpperCase();

            if (
              possibleBarcodeColumns.some((col) =>
                normalizedCell.includes(col.toUpperCase())
              )
            ) {
              headerRowIndex = rowIndex;
              barcodeColumnIndex = colIndex;
              console.log(
                `Coluna de código de barras encontrada: "${cell}" (Índice: ${colIndex})`
              );
            }

            // Check for price column
            if (
              normalizedCell === "PRECOOFERTA" ||
              normalizedCell === "PREÇO OFERTA" ||
              normalizedCell === "VALOR FINAL" ||
              normalizedCell === "PRECO OFERTA" ||
              normalizedCell === "OFERTA"
            ) {
              priceColumnIndex = colIndex;
              console.log(
                `Coluna de preço de oferta encontrada: "${cell}" (Índice: ${colIndex})`
              );
            }

            // If we found both columns, we can stop searching
            if (barcodeColumnIndex !== -1 && priceColumnIndex !== -1) {
              break;
            }
          }
          if (barcodeColumnIndex !== -1 && priceColumnIndex !== -1) break;
        }

        if (headerRowIndex === -1 || barcodeColumnIndex === -1) {
          console.error("Coluna de código de barras não encontrada.");
          setImportStatus("Erro: Coluna de código de barras não encontrada");
          return;
        }

        if (priceColumnIndex === -1) {
          console.warn("Coluna PRECOOFERTA não encontrada.");
        }

        // Extract barcodes and prices starting from the row after headers
        const productsData: TableProduct[] = jsonData
          .slice(headerRowIndex + 1)
          .map((row: unknown): TableProduct | null => {
            if (!Array.isArray(row) || !row[barcodeColumnIndex]) return null;

            return {
              barcode: row[barcodeColumnIndex].toString().trim(),
              preco_tabloide:
                priceColumnIndex !== -1
                  ? row[priceColumnIndex]?.toString().replace("R$", "").trim()
                  : undefined,
            };
          })
          .filter((item): item is TableProduct => item !== null);

        console.log(
          `Encontrados ${productsData.length} produtos para buscar:`,
          productsData.slice(0, 5)
        );
        setImportStatus(
          `Encontrados ${productsData.length} produtos. Buscando produtos...`
        );

        // Fetch products in batches
        if (productsData.length > 0) {
          await fetchProductsByBarcodes(productsData);
        } else {
          setImportStatus("Nenhum produto encontrado no arquivo");
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

  const fetchProductsByBarcodes = async (productsData: TableProduct[]) => {
    if (productsData.length === 0) return;

    try {
      setIsSearching(true);

      // Extract just the barcodes for the API request
      const barcodes = productsData.map((p) => p.barcode);

      console.log(
        `Enviando ${barcodes.length} códigos para API:`,
        barcodes.slice(0, 5)
      );

      // Format the request body correctly with the 'codigos' property
      const response = await fetch("http://172.16.23.35:8000/produtos/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigos: barcodes }),
      });

      console.log("Status da resposta:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na API:", response.status, errorText);
        setImportStatus(
          `Erro na requisição: ${response.status} - ${errorText.substring(0, 100)}${errorText.length > 100 ? "..." : ""}`
        );
        onProductsFound([]);
        return;
      }

      const data = await response.json();
      console.log(`Retornados ${data.length} produtos da API`);

      // Merge API data with tabloide prices and handle default images
      const productsWithPricesAndImages = data.map((product: any) => {
        const tabloidData = productsData.find(
          (p) => p.barcode === product.codauxiliar
        );

        return {
          ...product,
          preco_tabloide: tabloidData?.preco_tabloide,
          link_imagem: product.link_imagem || DEFAULT_IMAGE,
        };
      });

      onProductsFound(productsWithPricesAndImages);
      setImportStatus(
        productsWithPricesAndImages.length > 0
          ? `Importação concluída: ${productsWithPricesAndImages.length} produtos encontrados`
          : "Nenhum produto encontrado para os códigos fornecidos"
      );
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      setImportStatus(
        `Falha na busca: ${error instanceof Error ? error.message : "Erro desconhecido"}`
      );
      onProductsFound([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
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
  );
};

export default ImportTabloide;
