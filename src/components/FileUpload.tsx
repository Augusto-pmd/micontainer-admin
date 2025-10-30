import { useState, useRef } from "react";
import { Upload, X, Download, FileIcon, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { showError, showSuccess, showApiError } from "@/utils/alerts";

interface FileUploadProps {
  files: string[];
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (fileUrl: string) => Promise<void>;
  onDownload?: (fileUrl: string, fileName: string) => Promise<void>;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number; // en MB
  disabled?: boolean;
  title?: string;
  description?: string;
}

export const FileUpload = ({
  files = [],
  onUpload,
  onDelete,
  onDownload,
  acceptedTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".svg"],
  maxFiles = 10,
  maxFileSize = 10,
  disabled = false,
  title = "Archivos Adjuntos",
  description = "Sube archivos relacionados (PDF, DOC, imágenes)",
}: FileUploadProps) => {
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      return decodeURIComponent(fileName);
    } catch {
      return 'archivo';
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'svg', 'gif', 'webp'];
    
    if (imageExtensions.includes(extension || '')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <FileIcon className="h-4 w-4 text-gray-500" />;
  };

  const validateFiles = (selectedFiles: FileList): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    if (files.length + selectedFiles.length > maxFiles) {
      errors.push(`No puedes subir más de ${maxFiles} archivos en total`);
    }

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // Validar tamaño
      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name}: El archivo es muy grande (máximo ${maxFileSize}MB)`);
        continue;
      }

      // Validar tipo
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(fileExtension)) {
        errors.push(`${file.name}: Tipo de archivo no permitido`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      showError(errors.join('\n'));
    }

    return validFiles;
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const validFiles = validateFiles(selectedFiles);
    if (validFiles.length === 0) return;

    handleUpload(validFiles);
  };

  const handleUpload = async (filesToUpload: File[]) => {
    setUploadingFiles(true);
    try {
      await onUpload(filesToUpload);
      showSuccess(`${filesToUpload.length} archivo(s) subido(s) exitosamente`);
    } catch (error) {
      console.error("Error uploading files:", error);
      showApiError(error, "Error al subir archivos");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDelete = async (fileUrl: string) => {
    const fileName = getFileNameFromUrl(fileUrl);
    if (!confirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`)) {
      return;
    }

    setDeletingFile(fileUrl);
    try {
      await onDelete(fileUrl);
      showSuccess("Archivo eliminado exitosamente");
    } catch (error) {
      console.error("Error deleting file:", error);
      showApiError(error, "Error al eliminar archivo");
    } finally {
      setDeletingFile(null);
    }
  };

  const handleDownload = async (fileUrl: string) => {
    if (!onDownload) return;

    const fileName = getFileNameFromUrl(fileUrl);
    setDownloadingFile(fileUrl);
    try {
      await onDownload(fileUrl, fileName);
    } catch (error) {
      console.error("Error downloading file:", error);
      showApiError(error, "Error al descargar archivo");
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploadingFiles) return;

    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Zona de subida */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploadingFiles && fileInputRef.current?.click()}
      >
        <CardContent className="p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(",")}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={disabled || uploadingFiles}
          />

          {uploadingFiles ? (
            <div className="flex flex-col items-center space-y-2">
              <Spinner className="h-8 w-8 text-blue-500" />
              <p className="text-sm text-gray-600">Subiendo archivos...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium">
                  Haz clic para seleccionar archivos o arrastra y suelta
                </p>
                <p className="text-xs text-gray-500">
                  Tipos permitidos: {acceptedTypes.join(", ")}
                </p>
                <p className="text-xs text-gray-500">
                  Máximo {maxFiles} archivos, {maxFileSize}MB cada uno
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Archivos subidos ({files.length})
          </h4>
          <div className="space-y-2">
            {files.map((fileUrl, index) => {
              const fileName = getFileNameFromUrl(fileUrl);
              const isDeleting = deletingFile === fileUrl;
              const isDownloading = downloadingFile === fileUrl;

              return (
                <Card key={index} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(fileName)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={fileName}>
                          {fileName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {onDownload && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(fileUrl)}
                          disabled={isDownloading || disabled}
                          className="h-8 w-8 p-0"
                        >
                          {isDownloading ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(fileUrl)}
                        disabled={isDeleting || disabled}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        {isDeleting ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};