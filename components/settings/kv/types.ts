import { fabric } from "fabric";

export interface FormData {
  background?: File | null;
  productName?: string;
  productDescription?: string;
  productPrice?: string;
  productImage?: File | null;
  description?: string;
  price?: string;
  validity?: string;
  legalText?: string;
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
  id?: string;
  objectId?: string;
}

export interface ExtendedFabricText extends fabric.Text {
  id?: string;
}
