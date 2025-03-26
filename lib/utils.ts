import jsPDF from "jspdf";
import { twMerge } from "tailwind-merge";
import { type ClassValue, clsx } from "clsx";

const adjectives = [
  "Feliz",
  "Criativo",
  "Energético",
  "Vivo",
  "Dinâmico",
  "Radiante",
  "Alegre",
  "Vibrante",
  "Animado",
  "Ensolarado",
  "Brilhante",
  "Luminoso",
];

const animals = [
  "Golfinho",
  "Tigre",
  "Elefante",
  "Pinguim",
  "Canguru",
  "Pantera",
  "Leão",
  "Chita",
  "Girafa",
  "Hipopótamo",
  "Macaco",
  "Panda",
  "Crocodilo",
];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRandomName(): string {
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];

  return `${randomAnimal} ${randomAdjective}`;
}

export const getShapeInfo = (shapeType: string) => {
  switch (shapeType) {
    case "rect":
      return {
        icon: "/assets/rectangle.svg",
        name: "Retângulo",
      };

    case "circle":
      return {
        icon: "/assets/circle.svg",
        name: "Círculo",
      };

    case "triangle":
      return {
        icon: "/assets/triangle.svg",
        name: "Triângulo",
      };

    case "line":
      return {
        icon: "/assets/line.svg",
        name: "Linha",
      };

    case "i-text":
      return {
        icon: "/assets/text.svg",
        name: "Texto",
      };

    case "image":
      return {
        icon: "/assets/image.svg",
        name: "Imagem",
      };

    case "freeform":
      return {
        icon: "/assets/freeform.svg",
        name: "Desenho",
      };

    default:
      return {
        icon: "/assets/rectangle.svg",
        name: shapeType,
      };
  }
};

export const exportCanvas = (format: "pdf" | "png" | "svg") => {
  const canvas = document.querySelector("canvas");

  if (!canvas) return;

  switch (format) {
    case "pdf":
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      const data = canvas.toDataURL();
      doc.addImage(data, "PNG", 0, 0, canvas.width, canvas.height);
      doc.save("canvas.pdf");
      break;

    case "png":
      const pngLink = document.createElement("a");
      pngLink.download = "canvas.png";
      pngLink.href = canvas.toDataURL("image/png");
      pngLink.click();
      break;

    case "svg":
      const svgLink = document.createElement("a");
      svgLink.download = "canvas.svg";
      svgLink.href = canvas.toDataURL("image/svg+xml");
      svgLink.click();
      break;
  }
};
