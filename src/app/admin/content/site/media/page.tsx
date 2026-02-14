import { Image, Construction } from 'lucide-react';

export default function SiteMediaPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="h-16 w-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6">
        <Image className="h-8 w-8 text-purple-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Médiathèque</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        Gérez vos images, photos et fichiers médias pour votre site et vos contenus.
      </p>
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-full">
        <Construction className="h-4 w-4" />
        À venir prochainement
      </div>
    </div>
  );
}
