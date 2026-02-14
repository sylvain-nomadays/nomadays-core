import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Info,
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  BookOpen,
  Star,
  Mountain,
} from 'lucide-react';
import type { ContinentTheme } from '../continent-theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InclusionItem {
  text: string;
  is_default?: boolean;
}

interface TripInfoSectionProps {
  infoGeneralHtml?: string | null;
  infoFormalitiesHtml?: string | null;
  infoBookingConditionsHtml?: string | null;
  infoCancellationPolicyHtml?: string | null;
  infoAdditionalHtml?: string | null;
  inclusions?: InclusionItem[] | null;
  exclusions?: InclusionItem[] | null;
  comfortLevel?: number | null;
  difficultyLevel?: number | null;
  continentTheme: ContinentTheme;
}

// ─── Section config ──────────────────────────────────────────────────────────

interface InfoSection {
  key: string;
  label: string;
  icon: typeof Info;
  type: 'html' | 'list';
}

const INFO_SECTIONS: InfoSection[] = [
  { key: 'general', label: 'Informations g\u00e9n\u00e9rales', icon: Info, type: 'html' },
  { key: 'formalities', label: 'Formalit\u00e9s (visa, sant\u00e9)', icon: Shield, type: 'html' },
  { key: 'inclusions', label: 'Le prix comprend', icon: CheckCircle, type: 'list' },
  { key: 'exclusions', label: 'Le prix ne comprend pas', icon: XCircle, type: 'list' },
  { key: 'booking', label: 'Conditions de r\u00e9servation', icon: FileText, type: 'html' },
  { key: 'cancellation', label: "Conditions d'annulation", icon: AlertTriangle, type: 'html' },
  { key: 'additional', label: 'Informations compl\u00e9mentaires', icon: BookOpen, type: 'html' },
];

// ─── Level indicator ─────────────────────────────────────────────────────────

function LevelIndicator({
  level,
  maxLevel,
  icon: Icon,
  label,
  color,
}: {
  level: number;
  maxLevel: number;
  icon: typeof Star;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxLevel }, (_, i) => (
          <Icon
            key={i}
            className="h-4 w-4"
            style={{
              color: i < level ? color : '#e5e5e5',
            }}
            fill={i < level ? color : 'none'}
          />
        ))}
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TripInfoSection({
  infoGeneralHtml,
  infoFormalitiesHtml,
  infoBookingConditionsHtml,
  infoCancellationPolicyHtml,
  infoAdditionalHtml,
  inclusions,
  exclusions,
  comfortLevel,
  difficultyLevel,
  continentTheme,
}: TripInfoSectionProps) {
  // Map keys to content
  const contentMap: Record<string, string | null | undefined> = {
    general: infoGeneralHtml,
    formalities: infoFormalitiesHtml,
    booking: infoBookingConditionsHtml,
    cancellation: infoCancellationPolicyHtml,
    additional: infoAdditionalHtml,
  };

  const listMap: Record<string, InclusionItem[] | null | undefined> = {
    inclusions: inclusions,
    exclusions: exclusions,
  };

  // Filter sections that have content
  const activeSections = INFO_SECTIONS.filter((section) => {
    if (section.type === 'html') {
      const content = contentMap[section.key];
      return content && content.trim().length > 0;
    }
    if (section.type === 'list') {
      const items = listMap[section.key];
      return items && items.length > 0;
    }
    return false;
  });

  const hasLevels = (comfortLevel && comfortLevel > 0) || (difficultyLevel && difficultyLevel > 0);
  const hasContent = activeSections.length > 0 || hasLevels;

  if (!hasContent) {
    return (
      <div className="text-center py-16">
        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Info className="h-6 w-6 text-gray-300" />
        </div>
        <p className="text-sm text-gray-500">
          Ces informations seront complétées par votre hôte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comfort & Difficulty levels */}
      {hasLevels && (
        <div className="flex flex-wrap gap-6 p-4 rounded-xl bg-white border border-gray-100">
          {comfortLevel && comfortLevel > 0 && (
            <LevelIndicator
              level={comfortLevel}
              maxLevel={5}
              icon={Star}
              label="Niveau de confort"
              color={continentTheme.accent}
            />
          )}
          {difficultyLevel && difficultyLevel > 0 && (
            <LevelIndicator
              level={difficultyLevel}
              maxLevel={5}
              icon={Mountain}
              label="Niveau de difficult\u00e9"
              color={continentTheme.primary}
            />
          )}
        </div>
      )}

      {/* Accordion sections */}
      {activeSections.length > 0 && (
        <Accordion type="multiple" defaultValue={activeSections[0] ? [activeSections[0].key] : []} className="space-y-2">
          {activeSections.map((section) => {
            const Icon = section.icon;

            return (
              <AccordionItem
                key={section.key}
                value={section.key}
                className="border border-gray-100 rounded-xl px-4 bg-white overflow-hidden data-[state=open]:border-gray-200"
              >
                <AccordionTrigger className="text-sm font-medium text-gray-800 hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${continentTheme.primary}10` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: continentTheme.primary }} />
                    </div>
                    {section.label}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  {section.type === 'html' && contentMap[section.key] && (
                    <div
                      className="prose prose-sm max-w-none text-gray-600 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                      dangerouslySetInnerHTML={{ __html: contentMap[section.key]! }}
                    />
                  )}
                  {section.type === 'list' && listMap[section.key] && (
                    <ul className="space-y-2">
                      {listMap[section.key]!.map((item, idx) => {
                        const isInclusion = section.key === 'inclusions';
                        return (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600">
                            {isInclusion ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            )}
                            <span>{item.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
