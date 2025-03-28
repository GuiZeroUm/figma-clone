"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Folder, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

import { getShapeInfo } from "@/lib/utils";
import ProductSearch from "./ProductSearch";

// Define types for better organization
type ShapeItem = [string, any]; // [key, value] pair from your Map
type FolderType = {
  id: string;
  name: string;
  isOpen: boolean;
  items: ShapeItem[];
};

// Define product type
export type Product = {
  codprod: number;
  descricao: string;
  codauxiliar: string;
  link_imagem: string;
};

const LeftSidebar = ({
  allShapes,
  onReorderShapes,
}: {
  allShapes: Array<any>;
  onReorderShapes: (reorderedShapes: Array<any>) => void;
}) => {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [draggedFromFolder, setDraggedFromFolder] = useState<string | null>(
    null
  );
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dropIndicatorPos, setDropIndicatorPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"layers" | "products">("layers");

  // Get shapes that are not in folders
  const shapesNotInFolders = useMemo(() => {
    const folderItemIds = folders.flatMap((folder) =>
      folder.items.map((item) => item[0])
    );
    return allShapes.filter((shape) => !folderItemIds.includes(shape[0]));
  }, [allShapes, folders]);

  // Handle product search

  const handleDragStart = (index: number, folderId: string | null = null) => {
    setDraggedItem(index);
    setDraggedFromFolder(folderId);
    setDraggedFolder(null);
    setDropIndicatorPos(null);
  };

  const handleFolderDragStart = (folderId: string, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedFolder(folderId);
    setDraggedItem(null);
    setDraggedFromFolder(null);
    setDropIndicatorPos(null);
  };

  const handleDragOver = (
    e: React.DragEvent,
    index?: number,
    folderId?: string
  ) => {
    e.preventDefault();
    if (index !== undefined) {
      setDragOverItem(index);
      // Calculate position for drop indicator
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;

      // If cursor is in the top half, show indicator at the top, otherwise at the bottom
      const isTop = y < rect.height / 2;

      setDropIndicatorPos({
        top: isTop ? 0 : rect.height,
        left: 0,
        width: rect.width,
      });
    }

    if (folderId) {
      setDragOverFolder(folderId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
    setDragOverFolder(null);
    setDropIndicatorPos(null);
  };

  // Update z-order of all shapes according to the folder hierarchy
  const updateShapeOrder = () => {
    // Start with shapes not in folders
    let newShapeList: ShapeItem[] = [...shapesNotInFolders];

    // Add shapes from each folder in order
    folders.forEach((folder) => {
      folder.items.forEach((item) => {
        newShapeList.push(item);
      });
    });

    // Update all shapes with new order
    onReorderShapes(newShapeList);
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedItem !== null) {
      // Handle item drag and drop
      if (draggedFromFolder === null) {
        if (draggedItem === dropIndex) return;

        const reorderedShapes = [...shapesNotInFolders];
        const draggedShape = reorderedShapes[draggedItem];

        // Remove dragged item
        reorderedShapes.splice(draggedItem, 1);
        // Insert at new position
        reorderedShapes.splice(dropIndex, 0, draggedShape);

        // Reconstruct full shape list with folders
        const newShapeList = [...reorderedShapes];
        folders.forEach((folder) => {
          folder.items.forEach((item) => {
            newShapeList.push(item);
          });
        });

        // Call the parent function to update shapes
        onReorderShapes(newShapeList);
      } else {
        // Handle dragging from folder to main list
        const sourceFolder = folders.find((f) => f.id === draggedFromFolder);
        if (!sourceFolder) return;

        const updatedFolders = [...folders];
        const folderIndex = updatedFolders.findIndex(
          (f) => f.id === draggedFromFolder
        );

        // Get the dragged shape
        const draggedShape = sourceFolder.items[draggedItem];

        // Remove from folder
        updatedFolders[folderIndex].items.splice(draggedItem, 1);

        // Add to main list at drop position
        const newShapeList = [...shapesNotInFolders];
        newShapeList.splice(dropIndex, 0, draggedShape);

        // Reconstruct full shape list with updated folders
        updatedFolders.forEach((folder) => {
          folder.items.forEach((item) => {
            newShapeList.push(item);
          });
        });

        setFolders(updatedFolders);
        onReorderShapes(newShapeList);
      }
    } else if (draggedFolder !== null) {
      // Handle folder drop in the main list area
      const folderIndex = folders.findIndex((f) => f.id === draggedFolder);
      if (folderIndex === -1) return;

      // Calculate the insertion point
      // This places the folder between items in the main list
      const updatedFolders = [...folders];
      const draggedFolderObj = updatedFolders[folderIndex];

      // Remove folder from current position
      updatedFolders.splice(folderIndex, 1);

      // Find insertion point
      // If dropIndex is 0, folder goes before all items
      // If dropIndex is greater, folder goes after that item
      const insertAt = Math.min(dropIndex, updatedFolders.length);
      updatedFolders.splice(insertAt, 0, draggedFolderObj);

      setFolders(updatedFolders);
      updateShapeOrder();
    }

    setDraggedItem(null);
    setDraggedFromFolder(null);
    setDraggedFolder(null);
    setDragOverItem(null);
    setDragOverFolder(null);
    setDropIndicatorPos(null);
  };

  const handleFolderDrop = (targetFolderId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If we're dragging a folder onto another folder
    if (draggedFolder !== null && draggedFolder !== targetFolderId) {
      const draggedFolderIndex = folders.findIndex(
        (f) => f.id === draggedFolder
      );
      const targetFolderIndex = folders.findIndex(
        (f) => f.id === targetFolderId
      );

      if (draggedFolderIndex === -1 || targetFolderIndex === -1) return;

      // We want to place the dragged folder after the target folder
      const updatedFolders = [...folders];
      const draggedFolderObj = updatedFolders[draggedFolderIndex];

      // Remove from current position
      updatedFolders.splice(draggedFolderIndex, 1);

      // Insert after target folder
      updatedFolders.splice(
        targetFolderIndex + (draggedFolderIndex < targetFolderIndex ? 0 : 1),
        0,
        draggedFolderObj
      );

      setFolders(updatedFolders);
      updateShapeOrder();
    }
    // Handle regular item drop on folder
    else if (draggedItem !== null) {
      handleDropOnFolder(targetFolderId);
    }

    setDraggedItem(null);
    setDraggedFromFolder(null);
    setDraggedFolder(null);
    setDragOverItem(null);
    setDragOverFolder(null);
    setDropIndicatorPos(null);
  };

  const handleDropOnFolder = (folderId: string) => {
    if (draggedItem === null) return;

    const updatedFolders = [...folders];
    const targetFolderIndex = updatedFolders.findIndex(
      (f) => f.id === folderId
    );

    if (targetFolderIndex === -1) return;

    // If dragging from main list to folder
    if (draggedFromFolder === null) {
      const draggedShape = shapesNotInFolders[draggedItem];

      // Add to target folder
      updatedFolders[targetFolderIndex].items.push(draggedShape);

      // Reconstruct full shape list without this item
      const newShapeList = [...shapesNotInFolders];
      newShapeList.splice(draggedItem, 1);

      // Add all folder items back
      updatedFolders.forEach((folder) => {
        folder.items.forEach((item) => {
          newShapeList.push(item);
        });
      });

      setFolders(updatedFolders);
      onReorderShapes(newShapeList);
    } else if (draggedFromFolder !== folderId) {
      // Dragging from one folder to another
      const sourceFolderIndex = updatedFolders.findIndex(
        (f) => f.id === draggedFromFolder
      );
      if (sourceFolderIndex === -1) return;

      // Get dragged shape
      const draggedShape = updatedFolders[sourceFolderIndex].items[draggedItem];

      // Remove from source folder
      updatedFolders[sourceFolderIndex].items.splice(draggedItem, 1);

      // Add to target folder
      updatedFolders[targetFolderIndex].items.push(draggedShape);

      setFolders(updatedFolders);
      updateShapeOrder();
    }

    setDraggedItem(null);
    setDraggedFromFolder(null);
    setDragOverItem(null);
    setDragOverFolder(null);
    setDropIndicatorPos(null);
  };

  // Function to handle reordering within a folder
  const handleReorderInFolder = (
    folderId: string,
    sourceIndex: number,
    targetIndex: number
  ) => {
    const updatedFolders = [...folders];
    const folderIndex = updatedFolders.findIndex((f) => f.id === folderId);

    if (folderIndex === -1) return;

    const folderItems = [...updatedFolders[folderIndex].items];
    const itemToMove = folderItems[sourceIndex];

    // Remove from original position
    folderItems.splice(sourceIndex, 1);
    // Add to new position
    folderItems.splice(targetIndex, 0, itemToMove);

    updatedFolders[folderIndex].items = folderItems;
    setFolders(updatedFolders);
    updateShapeOrder();
  };

  // Drop handler for item within folder
  const handleDropInFolder = (
    folderId: string,
    targetIndex: number,
    e: React.DragEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // If dropping from the same folder, reorder
    if (draggedFromFolder === folderId && draggedItem !== null) {
      handleReorderInFolder(folderId, draggedItem, targetIndex);
    }
    // If dropping from different folder or main list
    else if (draggedItem !== null) {
      let itemToMove;

      // Get the item being moved
      if (draggedFromFolder === null) {
        itemToMove = shapesNotInFolders[draggedItem];

        // Remove from main list
        const newShapeList = [...shapesNotInFolders];
        newShapeList.splice(draggedItem, 1);

        // Add to folder at specific position
        const updatedFolders = [...folders];
        const folderIndex = updatedFolders.findIndex((f) => f.id === folderId);

        if (folderIndex !== -1) {
          updatedFolders[folderIndex].items.splice(targetIndex, 0, itemToMove);

          // Reconstruct full shape list
          const combinedShapeList = [...newShapeList];
          updatedFolders.forEach((folder) => {
            folder.items.forEach((item) => {
              combinedShapeList.push(item);
            });
          });

          setFolders(updatedFolders);
          onReorderShapes(combinedShapeList);
        }
      } else {
        // Moving from one folder to another
        const updatedFolders = [...folders];
        const sourceIndex = updatedFolders.findIndex(
          (f) => f.id === draggedFromFolder
        );
        const targetFolderIndex = updatedFolders.findIndex(
          (f) => f.id === folderId
        );

        if (sourceIndex !== -1 && targetFolderIndex !== -1) {
          // Get the item
          itemToMove = updatedFolders[sourceIndex].items[draggedItem];

          // Remove from source
          updatedFolders[sourceIndex].items.splice(draggedItem, 1);

          // Add to target at specific position
          updatedFolders[targetFolderIndex].items.splice(
            targetIndex,
            0,
            itemToMove
          );

          setFolders(updatedFolders);
          updateShapeOrder();
        }
      }
    }

    setDraggedItem(null);
    setDraggedFromFolder(null);
    setDraggedFolder(null);
    setDragOverItem(null);
    setDragOverFolder(null);
    setDropIndicatorPos(null);
  };

  const handleToggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the folder drag when clicking the toggle
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === folderId ? { ...folder, isOpen: !folder.isOpen } : folder
      )
    );
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim() === "") return;

    const newFolder: FolderType = {
      id: `folder_${Date.now()}`,
      name: newFolderName,
      isOpen: true,
      items: [],
    };

    setFolders((prev) => [...prev, newFolder]);
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const folderToDelete = folders.find((f) => f.id === folderId);
    if (!folderToDelete) return;

    // Move all items from the folder back to the main list
    const updatedFolders = folders.filter((f) => f.id !== folderId);

    // Create a new shape list that includes the folder items back in main list
    const newShapeList = [...shapesNotInFolders];
    folderToDelete.items.forEach((item) => {
      newShapeList.push(item);
    });

    // Add remaining folders' items
    updatedFolders.forEach((folder) => {
      folder.items.forEach((item) => {
        newShapeList.push(item);
      });
    });

    setFolders(updatedFolders);
    onReorderShapes(newShapeList);
  };

  // memoize the layers section
  const layersSection = useMemo(
    () => (
      <div className='flex flex-col'>
        {/* Folders First */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`relative mb-1 ${
              dragOverFolder === folder.id ? "bg-primary-grey-700" : ""
            }`}
            draggable
            onDragStart={(e) => handleFolderDragStart(folder.id, e)}
            onDragOver={(e) => handleDragOver(e, undefined, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleFolderDrop(folder.id, e)}
            style={{
              opacity: draggedFolder === folder.id ? 0.5 : 1,
              boxShadow:
                dragOverFolder === folder.id ? "0 0 0 2px #4caf50" : "none",
            }}
          >
            <div className='hover:bg-primary-grey-800 flex cursor-pointer items-center justify-between gap-1 px-3 py-2'>
              <div className='flex items-center gap-1'>
                <button onClick={(e) => handleToggleFolder(folder.id, e)}>
                  {folder.isOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                <Folder size={16} className='text-primary-grey-300' />
                <span className='text-sm'>{folder.name}</span>
              </div>
              <button
                onClick={(e) => handleDeleteFolder(folder.id, e)}
                className='text-red-500 opacity-0 hover:text-red-400 hover:opacity-100 group-hover:opacity-100'
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Folder contents */}
            {folder.isOpen && (
              <div className='ml-6'>
                {folder.items.map((shape, index) => {
                  const info = getShapeInfo(shape[1]?.type);
                  return (
                    <div
                      key={shape[1]?.objectId}
                      className={`group relative my-1 flex items-center gap-2 px-3 py-2 hover:cursor-pointer hover:bg-primary-green hover:text-primary-black ${
                        draggedItem === index && draggedFromFolder === folder.id
                          ? "opacity-50"
                          : ""
                      } ${dragOverItem === index ? "bg-primary-grey-700" : ""}`}
                      draggable
                      onDragStart={() => handleDragStart(index, folder.id)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropInFolder(folder.id, index, e)}
                    >
                      {dropIndicatorPos && dragOverItem === index && (
                        <div
                          className='absolute bg-primary-green'
                          style={{
                            top: `${dropIndicatorPos.top}px`,
                            left: `${dropIndicatorPos.left}px`,
                            width: `${dropIndicatorPos.width}px`,
                            height: "2px",
                          }}
                        />
                      )}
                      <Image
                        src={info?.icon}
                        alt='Layer'
                        width={16}
                        height={16}
                        className='group-hover:invert'
                      />
                      <h3 className='text-sm font-semibold capitalize'>
                        {info.name}
                      </h3>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Non-Folder Items */}
        {[...shapesNotInFolders].reverse().map((shape: any, index: number) => {
          const info = getShapeInfo(shape[1]?.type);

          // Adjust the index for drag operations to account for reversal
          const actualIndex = shapesNotInFolders.length - 1 - index;

          return (
            <div
              key={shape[1]?.objectId}
              className={`group relative my-1 flex items-center gap-2 px-5 py-2.5 hover:cursor-pointer hover:bg-primary-green hover:text-primary-black ${
                draggedItem === actualIndex && draggedFromFolder === null
                  ? "opacity-50"
                  : ""
              } ${dragOverItem === actualIndex ? "bg-primary-grey-700" : ""}`}
              draggable
              onDragStart={() => handleDragStart(actualIndex)}
              onDragOver={(e) => handleDragOver(e, actualIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(actualIndex);
              }}
            >
              {dropIndicatorPos && dragOverItem === actualIndex && (
                <div
                  className='absolute bg-primary-green'
                  style={{
                    top: `${dropIndicatorPos.top}px`,
                    left: `${dropIndicatorPos.left}px`,
                    width: `${dropIndicatorPos.width}px`,
                    height: "2px",
                  }}
                />
              )}
              <Image
                src={info?.icon}
                alt='Layer'
                width={16}
                height={16}
                className='group-hover:invert'
              />
              <h3 className='text-sm font-semibold capitalize'>{info.name}</h3>
            </div>
          );
        })}
      </div>
    ),
    [
      folders,
      draggedItem,
      draggedFromFolder,
      draggedFolder,
      shapesNotInFolders,
      dragOverItem,
      dragOverFolder,
      dropIndicatorPos,
    ]
  );

  // memoize the product search section for better performance
  const productSearchSection = useMemo(() => <ProductSearch />, []);

  return (
    <section className='sticky left-0 flex h-full min-w-[227px] select-none flex-col overflow-y-auto border-t border-primary-grey-200 bg-primary-black pb-20 text-primary-grey-300 max-sm:hidden'>
      <div className='flex border border-primary-grey-200'>
        <button
          className={`flex-1 py-4 text-xs uppercase ${activeTab === "layers" ? "bg-primary-grey-800" : ""}`}
          onClick={() => setActiveTab("layers")}
        >
          Camadas
        </button>
        <button
          className={`flex-1 py-4 text-xs uppercase ${activeTab === "products" ? "bg-primary-grey-800" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          Produtos
        </button>
      </div>

      {activeTab === "layers" && (
        <>
          <div className='flex items-center justify-between border-x border-b border-primary-grey-200 px-5 py-4'>
            <h3 className='text-xs uppercase'>Camadas</h3>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className='flex h-5 w-5 items-center justify-center rounded hover:bg-primary-green hover:text-primary-black'
            >
              <Plus size={14} />
            </button>
          </div>

          {isCreatingFolder && (
            <div className='flex gap-2 px-5 py-2'>
              <input
                type='text'
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder='Nome da pasta'
                className='bg-primary-grey-800 flex-1 px-2 py-1 text-sm text-primary-grey-300'
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") setIsCreatingFolder(false);
                }}
              />
              <button
                onClick={handleCreateFolder}
                className='bg-primary-green px-2 py-1 text-xs text-primary-black'
              >
                Criar
              </button>
            </div>
          )}

          {layersSection}
        </>
      )}

      {activeTab === "products" && productSearchSection}
    </section>
  );
};

export default LeftSidebar;
