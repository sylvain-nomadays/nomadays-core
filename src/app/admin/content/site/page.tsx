import { Layout, Construction } from 'lucide-react';

export default function SitePagesPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="h-16 w-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6">
        <Layout className="h-8 w-8 text-purple-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Gestion du site</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        Construisez et personnalisez le site internet de votre DMC. Pages, blocs, templates et SEO.
      </p>
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-full">
        <Construction className="h-4 w-4" />
        À venir prochainement
      </div>
    </div>
  );
}
