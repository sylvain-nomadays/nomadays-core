'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface PhotoUploaderProps {
  accommodationId: number;
  roomCategoryId?: number;
  onUploadComplete: () => void;
  maxFiles?: number;
  disabled?: boolean;
}

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// Component
// ============================================================================

export default function PhotoUploader({
  accommodationId,
  roomCategoryId,
  onUploadComplete,
  maxFiles = 10,
  disabled = false,
}: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID for each file
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Format non supporté. Utilisez JPG, PNG, WebP, AVIF ou GIF.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Fichier trop volumineux. Maximum ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }
    return null;
  };

  // Handle file selection
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, maxFiles);

      // Create uploading file entries with previews
      const newUploadingFiles: UploadingFile[] = fileArray.map((file) => ({
        id: generateId(),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
        progress: 0,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Upload each file
      for (const uploadingFile of newUploadingFiles) {
        await uploadFile(uploadingFile);
      }
    },
    [accommodationId, roomCategoryId, maxFiles]
  );

  // Upload a single file
  const uploadFile = async (uploadingFile: UploadingFile) => {
    // Validate first
    const error = validateFile(uploadingFile.file);
    if (error) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id
            ? { ...f, status: 'error' as const, error }
            : f
        )
      );
      return;
    }

    // Set uploading status
    setUploadingFiles((prev) =>
      prev.map((f) =>
        f.id === uploadingFile.id
          ? { ...f, status: 'uploading' as const, progress: 10 }
          : f
      )
    );

    try {
      const formData = new FormData();
      formData.append('file', uploadingFile.file);
      if (roomCategoryId) {
        formData.append('room_category_id', roomCategoryId.toString());
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadingFile.id && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 200);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/accommodations/${accommodationId}/photos`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erreur lors de l\'upload');
      }

      // Success
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id
            ? { ...f, status: 'success' as const, progress: 100 }
            : f
        )
      );

      // Notify parent
      onUploadComplete();

      // Remove from list after a delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadingFile.id));
        URL.revokeObjectURL(uploadingFile.preview);
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id
            ? {
                ...f,
                status: 'error' as const,
                error: err instanceof Error ? err.message : 'Erreur inconnue',
              }
            : f
        )
      );
    }
  };

  // Drag handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  // Click to select files
  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file from queue
  const removeFile = (id: string) => {
    setUploadingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`
              w-14 h-14 rounded-full flex items-center justify-center
              ${isDragging ? 'bg-emerald-100' : 'bg-gray-100'}
            `}
          >
            <Upload
              className={`w-7 h-7 ${isDragging ? 'text-emerald-600' : 'text-gray-400'}`}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">
              {isDragging
                ? 'Déposez les photos ici'
                : 'Glissez-déposez vos photos ici'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ou cliquez pour sélectionner • JPG, PNG, WebP, AVIF • Max 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg border
                ${
                  file.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : file.status === 'success'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-gray-200'
                }
              `}
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.file.size / 1024 / 1024).toFixed(2)} MB
                </p>

                {/* Progress bar */}
                {file.status === 'uploading' && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Error message */}
                {file.status === 'error' && file.error && (
                  <p className="text-xs text-red-600 mt-1">{file.error}</p>
                )}
              </div>

              {/* Status icon / Actions */}
              <div className="flex-shrink-0">
                {file.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                )}
                {file.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                )}
                {file.status === 'error' && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-red-100 rounded-full"
                  >
                    <X className="w-5 h-5 text-red-500" />
                  </button>
                )}
                {file.status === 'pending' && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
