'use client';

import { useState } from 'react';
import { Plus, Globe, FileUp } from 'lucide-react';
import { ContentBrowser } from '@/components/content';
import { ContentImporter } from '@/components/content/ContentImporter';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ContentPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportSuccess = (entityId: string) => {
    // Refresh the content browser
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contenus Guide</h1>
            <p className="text-muted-foreground mt-1">
              Gerez vos fiches descriptives multi-langues (attractions, destinations, activites...)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Import from URL button */}
            <Button variant="outline" onClick={() => setShowImporter(true)}>
              <Globe className="h-4 w-4 mr-2" />
              Importer depuis URL
            </Button>
          </div>
        </div>
      </div>

      {/* Content Browser */}
      <div className="flex-1 overflow-hidden" key={refreshKey}>
        <ContentBrowser
          onCreate={() => setShowCreateDialog(true)}
        />
      </div>

      {/* Create Dialog (placeholder) */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau contenu</DialogTitle>
            <DialogDescription>
              Creez une nouvelle fiche descriptive pour une attraction, destination, activite ou hebergement.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => {
                setShowCreateDialog(false);
                setShowImporter(true);
              }}
            >
              <Globe className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <p className="font-medium">Importer depuis une URL</p>
                <p className="text-sm text-muted-foreground">
                  Extraire automatiquement le contenu d'une page web existante
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              disabled
            >
              <Plus className="h-5 w-5 mr-3 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium text-muted-foreground">Creer manuellement</p>
                <p className="text-sm text-muted-foreground">
                  Bientot disponible
                </p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content Importer */}
      <ContentImporter
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
