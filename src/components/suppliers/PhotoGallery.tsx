'use client';

import { useState, useCallback } from 'react';
import {
  Star,
  Trash2,
  GripVertical,
  MoreVertical,
  Pencil,
  Eye,
  ImageOff,
  X,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AccommodationPhoto, UpdateAccommodationPhotoDTO } from '@/lib/api/types';
import OptimizedImage from '@/components/common/OptimizedImage';

// ============================================================================
// Types
// ============================================================================

interface PhotoGalleryProps {
  photos: AccommodationPhoto[];
  accommodationId: number;
  roomCategoryId?: number;
  onSetMain: (photoId: number) => Promise<void>;
  onDelete: (photoId: number) => Promise<void>;
  onUpdate: (photoId: number, data: UpdateAccommodationPhotoDTO) => Promise<void>;
  onReorder: (photoIds: number[]) => Promise<void>;
  loading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function PhotoGallery({
  photos,
  accommodationId,
  roomCategoryId,
  onSetMain,
  onDelete,
  onUpdate,
  onReorder,
  loading = false,
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<AccommodationPhoto | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<AccommodationPhoto | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editAltText, setEditAltText] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filter photos for this context (hotel level or room category)
  const filteredPhotos = photos.filter((photo) => {
    if (roomCategoryId !== undefined) {
      return photo.room_category_id === roomCategoryId;
    }
    return !photo.room_category_id;
  });

  // Sort by sort_order
  const sortedPhotos = [...filteredPhotos].sort((a, b) => a.sort_order - b.sort_order);

  // Handle actions
  const handleSetMain = async (photo: AccommodationPhoto) => {
    if (photo.is_main) return;
    setActionLoading(photo.id);
    try {
      await onSetMain(photo.id);
    } finally {
      setActionLoading(null);
      setMenuOpen(null);
    }
  };

  const handleDelete = async (photo: AccommodationPhoto) => {
    if (!confirm('Supprimer cette photo ?')) return;
    setActionLoading(photo.id);
    try {
      await onDelete(photo.id);
    } finally {
      setActionLoading(null);
      setMenuOpen(null);
    }
  };

  const handleStartEdit = (photo: AccommodationPhoto) => {
    setEditingPhoto(photo);
    setEditCaption(photo.caption || '');
    setEditAltText(photo.alt_text || '');
    setMenuOpen(null);
  };

  const handleSaveEdit = async () => {
    if (!editingPhoto) return;
    setActionLoading(editingPhoto.id);
    try {
      await onUpdate(editingPhoto.id, {
        caption: editCaption || undefined,
        alt_text: editAltText || undefined,
      });
      setEditingPhoto(null);
    } finally {
      setActionLoading(null);
    }
  };

  // Lightbox navigation
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;
    const newIndex =
      direction === 'prev'
        ? (lightboxIndex - 1 + sortedPhotos.length) % sortedPhotos.length
        : (lightboxIndex + 1) % sortedPhotos.length;
    setLightboxIndex(newIndex);
  };

  // Empty state
  if (sortedPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <ImageOff className="w-12 h-12 mb-3" />
        <p className="text-sm">Aucune photo</p>
        <p className="text-xs mt-1">
          {roomCategoryId
            ? 'Ajoutez des photos pour cette catégorie de chambre'
            : "Ajoutez des photos de l'hébergement"}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {sortedPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className={`
              group relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100
              ${photo.is_main ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
              ${actionLoading === photo.id ? 'opacity-50' : ''}
            `}
          >
            {/* Image */}
            <div
              className="w-full h-full cursor-pointer"
              onClick={() => openLightbox(index)}
            >
              <OptimizedImage
                photo={photo}
                alt={photo.alt_text || photo.caption || 'Photo'}
                sizeHint="thumbnail"
                className="w-full h-full"
                imageClassName="w-full h-full"
                showPlaceholder={true}
              />
            </div>

            {/* Main badge */}
            {photo.is_main && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Principale
              </div>
            )}

            {/* Loading overlay */}
            {actionLoading === photo.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openLightbox(index)}
                  className="p-2 bg-white/90 hover:bg-white rounded-full text-gray-700"
                  title="Voir"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStartEdit(photo)}
                  className="p-2 bg-white/90 hover:bg-white rounded-full text-gray-700"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {!photo.is_main && (
                  <button
                    onClick={() => handleSetMain(photo)}
                    className="p-2 bg-white/90 hover:bg-white rounded-full text-gray-700"
                    title="Définir comme principale"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(photo)}
                  className="p-2 bg-white/90 hover:bg-white rounded-full text-red-600"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Caption */}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-white text-xs truncate">
                {photo.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Modifier la photo</h3>
              <button
                onClick={() => setEditingPhoto(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Preview */}
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={editingPhoto.url}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Légende
                </label>
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: Vue depuis le balcon"
                />
              </div>

              {/* Alt text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texte alternatif (SEO)
                </label>
                <input
                  type="text"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Description pour l'accessibilité"
                />
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-500 space-y-1">
                {editingPhoto.original_filename && (
                  <p>Fichier: {editingPhoto.original_filename}</p>
                )}
                {editingPhoto.file_size && (
                  <p>Taille: {(editingPhoto.file_size / 1024 / 1024).toFixed(2)} MB</p>
                )}
                {editingPhoto.width && editingPhoto.height && (
                  <p>
                    Dimensions: {editingPhoto.width} × {editingPhoto.height} px
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setEditingPhoto(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading === editingPhoto.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === editingPhoto.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && sortedPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation */}
          {sortedPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('prev');
                }}
                className="absolute left-4 p-2 text-white/80 hover:text-white"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('next');
                }}
                className="absolute right-4 p-2 text-white/80 hover:text-white"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <OptimizedImage
              photo={sortedPhotos[lightboxIndex]}
              alt={
                sortedPhotos[lightboxIndex].alt_text ||
                sortedPhotos[lightboxIndex].caption ||
                'Photo'
              }
              sizeHint="large"
              objectFit="contain"
              className="max-w-[90vw] max-h-[90vh]"
              showPlaceholder={true}
              priority={true}
            />
          </div>

          {/* Caption */}
          {sortedPhotos[lightboxIndex].caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 text-white text-sm rounded-lg">
              {sortedPhotos[lightboxIndex].caption}
            </div>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 text-white text-sm rounded-full">
            {lightboxIndex + 1} / {sortedPhotos.length}
          </div>
        </div>
      )}
    </>
  );
}
