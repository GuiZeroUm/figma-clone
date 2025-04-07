import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormData } from "../../../types/kv";

interface KVFormProps {
  formData: FormData;
  onFileChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "background" | "productImage"
  ) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchProduct: (code: string) => void;
  isSearching?: boolean;
}

const KVForm = ({
  formData,
  onFileChange,
  onInputChange,
  onSearchProduct,
  isSearching = false,
}: KVFormProps) => {
  const [searchCode, setSearchCode] = React.useState("");

  const handleSearch = () => {
    if (searchCode) {
      onSearchProduct(searchCode);
    }
  };

  return (
    <div className='space-y-4 rounded-lg bg-primary-black p-4'>
      <div className='flex gap-2'>
        <Input
          type='text'
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          placeholder='Código do produto'
          className='bg-primary-grey-800 border-primary-grey-600 text-primary-grey-300'
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className='bg-primary-green text-primary-black hover:bg-primary-green/90'
        >
          <Search size={16} />
        </Button>
      </div>

      <div className='space-y-4'>
        <div>
          <label className='mb-2 block text-sm text-primary-grey-300'>
            Background
          </label>
          <input
            type='file'
            onChange={(e) => onFileChange(e, "background")}
            accept='image/*'
            className='border-primary-grey-600 bg-primary-grey-800 w-full cursor-pointer rounded-md border p-2 text-sm text-primary-grey-300'
          />
        </div>

        <div>
          <label className='mb-2 block text-sm text-primary-grey-300'>
            Imagem do Produto
          </label>
          <input
            type='file'
            onChange={(e) => onFileChange(e, "productImage")}
            accept='image/*'
            className='border-primary-grey-600 bg-primary-grey-800 w-full cursor-pointer rounded-md border p-2 text-sm text-primary-grey-300'
          />
        </div>

        <div>
          <label className='mb-2 block text-sm text-primary-grey-300'>
            Descrição
          </label>
          <Input
            type='text'
            name='description'
            value={formData.description}
            onChange={onInputChange}
            className='bg-primary-grey-800 border-primary-grey-600 text-primary-grey-300'
          />
        </div>

        <div>
          <label className='mb-2 block text-sm text-primary-grey-300'>
            Preço
          </label>
          <Input
            type='text'
            name='price'
            value={formData.price}
            onChange={onInputChange}
            className='bg-primary-grey-800 border-primary-grey-600 text-primary-grey-300'
          />
        </div>
      </div>
    </div>
  );
};

export default KVForm;
