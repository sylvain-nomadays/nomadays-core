'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, ChevronRight, ArrowRight, RefreshCw, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useTripTranslations, TranslationInfo } from '@/hooks/useTranslation';

// Flag emojis for languages
const FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  nl: '🇳🇱',
  ru: '🇷🇺',
  zh: '🇨🇳',
  ja: '🇯🇵',
};

interface TranslationVersionsNavProps {
  tripId: number;
  currentLanguage: string;
  onPushTranslation?: (targetIds: number[]) => Promise<void>;
  isPushing?: boolean;
}

/**
 * Navigation bar showing all translated versions of a circuit.
 * Allows quick navigation between versions and pushing updates.
 */
export function TranslationVersionsNav({
  tripId,
  currentLanguage,
  onPushTranslation,
  isPushing = false,
}: TranslationVersionsNavProps) {
  const router = useRouter();
  const { data: translationsData, loading } = useTripTranslations(tripId);
  const [showPushModal, setShowPushModal] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<number[]>([]);

  if (loading || !translationsData || translationsData.translations.length <= 1) {
    return null;
  }

  const translations = translationsData.translations;
  const currentTranslation = translations.find(t => t.language === currentLanguage);
  const otherTranslations = translations.filter(t => t.language !== currentLanguage);

  const handleNavigate = (translation: TranslationInfo) => {
    router.push(`/admin/circuits/${translation.id}`);
  };

  const handleToggleTarget = (id: number) => {
    setSelectedTargets(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTargets.length === otherTranslations.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(otherTranslations.map(t => t.id));
    }
  };

  const handlePush = async () => {
    if (onPushTranslation && selectedTargets.length > 0) {
      await onPushTranslation(selectedTargets);
      setShowPushModal(false);
      setSelectedTargets([]);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">
              Versions traduites
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Current version badge */}
            <Badge
              variant="default"
              className="bg-purple-600 hover:bg-purple-600 cursor-default"
            >
              {FLAGS[currentLanguage] || '🌐'} {currentLanguage.toUpperCase()}
              <Check className="h-3 w-3 ml-1" />
            </Badge>

            {/* Other versions */}
            {otherTranslations.map((translation) => (
              <Button
                key={translation.id}
                variant="outline"
                size="sm"
                onClick={() => handleNavigate(translation)}
                className="gap-1 border-purple-200 hover:bg-purple-100 hover:border-purple-300"
              >
                {FLAGS[translation.language] || '🌐'}
                {translation.language.toUpperCase()}
                <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            ))}

            {/* Push translation button */}
            {otherTranslations.length > 0 && onPushTranslation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPushModal(true)}
                disabled={isPushing}
                className="gap-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 ml-2"
              >
                {isPushing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Push traduction
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Push Translation Modal */}
      <Dialog open={showPushModal} onOpenChange={setShowPushModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-amber-600" />
              Pousser les modifications
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les versions vers lesquelles pousser les modifications
              du contenu actuel ({FLAGS[currentLanguage]} {currentLanguage.toUpperCase()}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">
                {selectedTargets.length} version(s) sélectionnée(s)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedTargets.length === otherTranslations.length
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </Button>
            </div>

            <div className="space-y-2">
              {otherTranslations.map((translation) => (
                <label
                  key={translation.id}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedTargets.includes(translation.id)}
                    onCheckedChange={() => handleToggleTarget(translation.id)}
                  />
                  <span className="text-xl">{FLAGS[translation.language]}</span>
                  <div className="flex-1">
                    <div className="font-medium">{translation.name}</div>
                    <div className="text-sm text-gray-500">
                      {translation.language_name}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <strong>Attention :</strong> Les textes des versions cibles seront
                  re-traduits à partir du contenu actuel. Les modifications manuelles
                  sur ces versions seront écrasées.
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPushModal(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePush}
              disabled={selectedTargets.length === 0 || isPushing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isPushing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  En cours...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Pousser vers {selectedTargets.length} version(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
