import { fabric } from "fabric";

export interface FormData {
  background: File | null;
  productImage: File | null;
  description: string;
  price: string;
}

export interface ElementStyles {
  fontSize: number;
  fill: string;
  left: number;
  top: number;
  scale: number;
  stroke: string;
  strokeWidth: number;
  shadow: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface ExtendedFabricObject extends fabric.Object {
  objectId?: string;
}

export interface ExtendedFabricText extends fabric.Text {
  id?: string;
}
