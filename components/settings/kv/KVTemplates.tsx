import React, { useState, useEffect } from "react";
import { fabric } from "fabric";
import { X } from "@phosphor-icons/react";
import KVModal from "./KVModal";
import KVTemplateEditor from "./KVTemplateEditor";

interface KVTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: KVTemplate) => void;
}

interface KVTemplate {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  elements: any[];
  lastUpdated?: string;
}

const KVTemplates = ({
  isOpen,
  onClose,
  onSelectTemplate,
}: KVTemplatesProps) => {
  const [templates, setTemplates] = useState<KVTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<KVTemplate | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const savedTemplates = localStorage.getItem("kvTemplates");
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    }
  }, [isOpen]);

  const handleEditTemplate = (template: KVTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(true);
  };

  const handleSaveTemplate = (updatedTemplate: KVTemplate) => {
    const updatedTemplates = templates.map((t) =>
      t.id === updatedTemplate.id ? updatedTemplate : t
    );

    localStorage.setItem("kvTemplates", JSON.stringify(updatedTemplates));
    setTemplates(updatedTemplates);
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este template?")) {
      const updatedTemplates = templates.filter((t) => t.id !== templateId);
      localStorage.setItem("kvTemplates", JSON.stringify(updatedTemplates));
      setTemplates(updatedTemplates);
    }
  };

  const handleSelectTemplate = (template: KVTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isEditing && selectedTemplate) {
    return (
      <KVTemplateEditor
        isOpen={true}
        onClose={() => setIsEditing(false)}
        template={selectedTemplate}
        onSave={handleSaveTemplate}
      />
    );
  }

  return (
    <KVModal isOpen={isOpen} onClose={onClose}>
      <div className='flex flex-col gap-4 px-5 pt-4'>
        <h1 className='text-xl font-bold text-primary-grey-300'>
          Templates Salvos
        </h1>

        <div className='flex flex-col gap-4'>
          {templates.length === 0 ? (
            <p className='text-primary-grey-300'>Nenhum template salvo.</p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className='flex items-center justify-between rounded-lg border border-primary-grey-200 bg-primary-black p-4'
              >
                <div className='flex flex-col gap-1'>
                  <h3 className='font-semibold text-primary-grey-300'>
                    {template.name}
                  </h3>
                  <p className='text-primary-grey-400 text-sm'>
                    {template.description}
                  </p>
                  <p className='text-primary-grey-400 text-xs'>
                    Criado em: {formatDate(template.createdAt)}
                  </p>
                  {template.lastUpdated && (
                    <p className='text-primary-grey-400 text-xs'>
                      Última atualização: {formatDate(template.lastUpdated)}
                    </p>
                  )}
                </div>

                <div className='flex gap-2'>
                  {/* {onSelectTemplate && (
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className='hover:bg-primary-green-dark rounded-md bg-primary-green px-3 py-1 text-sm text-primary-black'
                    >
                      Selecionar
                    </button>
                  )} */}
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className='hover:bg-primary-blue-dark rounded-md bg-blue-500 px-3 py-1 text-sm text-white'
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className='rounded-md bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600'
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </KVModal>
  );
};

export default KVTemplates;
