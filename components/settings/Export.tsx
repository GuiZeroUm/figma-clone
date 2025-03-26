import { exportCanvas } from "@/lib/utils";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const Export = () => {
  const [format, setFormat] = useState<"pdf" | "png" | "svg">("png");

  return (
    <div className='flex flex-col gap-3 px-5 py-3'>
      <h3 className='text-[10px] uppercase'>Exportar</h3>
      <div className='flex flex-col gap-2'>
        <Select
          value={format}
          onValueChange={(value: "pdf" | "png" | "svg") => setFormat(value)}
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Selecione um formato' />
          </SelectTrigger>
          <SelectContent className='border-primary-grey-200 bg-primary-black text-white'>
            <SelectItem value='pdf' className='cursor-pointer'>
              PDF
            </SelectItem>
            <SelectItem value='png' className='cursor-pointer'>
              PNG
            </SelectItem>
            <SelectItem value='svg' className='cursor-pointer'>
              SVG
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant='outline'
          className='w-full border border-primary-grey-100 hover:bg-primary-green hover:text-primary-black'
          onClick={() => exportCanvas(format)}
        >
          Exportar
        </Button>
      </div>
    </div>
  );
};

export default Export;
