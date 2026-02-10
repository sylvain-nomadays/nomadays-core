'use client';

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  Heading,
  Type,
  Target,
  Clock,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { apiClient } from '@/lib/api/client';
import type { SupportedLanguage } from '@/lib/api/types';

// Types matching backend SEO analysis
interface SEOAlert {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  location?: string;
}

interface SEOSectionAnalysis {
  section_type: string;
  content_preview: string;
  score: number;
  issues: SEOAlert[];
  suggestions: string[];
}

interface SEOStructureCheck {
  has_hook_intro: boolean;
  has_practical_info: boolean;
  has_subheadings: boolean;
  has_cta_blocks: boolean;
  has_internal_links: boolean;
  missing_sections: string[];
}

interface SEOAnalysisResult {
  entity_id: string;
  language_code: string;
  overall_score: number;
  sections: SEOSectionAnalysis[];
  structure_check: SEOStructureCheck;
  word_count: number;
  reading_time_minutes: number;
  keyword_suggestions: string[];
  alerts: SEOAlert[];
}

interface ContentSEOPanelProps {
  entityId: string;
  language: SupportedLanguage;
  onApplySuggestion?: (section: string, newValue: string) => void;
}

// Score color helper
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 60) return 'bg-amber-100';
  return 'bg-red-100';
}

// Alert icon helper
function AlertIcon({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  if (severity === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-blue-500" />;
}

// Section icon helper
function SectionIcon({ type }: { type: string }) {
  switch (type) {
    case 'meta_title':
      return <Type className="h-4 w-4" />;
    case 'meta_description':
      return <FileText className="h-4 w-4" />;
    case 'content':
      return <FileText className="h-4 w-4" />;
    case 'structure':
      return <Heading className="h-4 w-4" />;
    case 'links':
      return <Link2 className="h-4 w-4" />;
    default:
      return <Target className="h-4 w-4" />;
  }
}

export function ContentSEOPanel({ entityId, language, onApplySuggestion }: ContentSEOPanelProps) {
  const [analysis, setAnalysis] = useState<SEOAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['meta_title', 'meta_description']);

  // Fetch SEO analysis
  const fetchAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.post<SEOAnalysisResult>(
        `/content/entities/${entityId}/analyze-seo?language_code=${language}`
      );
      setAnalysis(result);
    } catch (err: any) {
      setError(err.detail || err.message || 'Erreur lors de l\'analyse SEO');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (entityId && language) {
      fetchAnalysis();
    }
  }, [entityId, language]);

  const toggleSection = (sectionType: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionType)
        ? prev.filter((s) => s !== sectionType)
        : [...prev, sectionType]
    );
  };

  // Count alerts by severity
  const errorCount = analysis?.alerts.filter((a) => a.severity === 'error').length || 0;
  const warningCount = analysis?.alerts.filter((a) => a.severity === 'warning').length || 0;

  return (
    <div className="bg-gray-50 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Analyse SEO</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAnalysis}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading && !analysis && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Analyse en cours...</span>
          </div>
        )}

        {/* Score Card */}
        {analysis && (
          <div className={`p-4 rounded-lg ${getScoreBgColor(analysis.overall_score)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`text-3xl font-bold ${getScoreColor(analysis.overall_score)}`}>
                  {analysis.overall_score}
                </div>
                <span className="text-sm text-gray-500">/100</span>
              </div>
              <BarChart3 className={`h-6 w-6 ${getScoreColor(analysis.overall_score)}`} />
            </div>
            <Progress value={analysis.overall_score} className="mt-2 h-2" />
            <div className="flex gap-3 mt-3 text-xs">
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errorCount} erreur{errorCount > 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  {warningCount} avertissement{warningCount > 1 ? 's' : ''}
                </span>
              )}
              {errorCount === 0 && warningCount === 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="h-3 w-3" />
                  Aucun probleme detecte
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {analysis && (
        <div className="flex-1 p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <FileText className="h-3 w-3" />
                Mots
              </div>
              <p className="font-semibold mt-1">{analysis.word_count}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="h-3 w-3" />
                Lecture
              </div>
              <p className="font-semibold mt-1">{analysis.reading_time_minutes} min</p>
            </div>
          </div>

          {/* Section Analysis */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Analyse par section</h4>
            {analysis.sections.map((section) => (
              <Collapsible
                key={section.section_type}
                open={expandedSections.includes(section.section_type)}
                onOpenChange={() => toggleSection(section.section_type)}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full bg-white p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SectionIcon type={section.section_type} />
                        <span className="font-medium text-sm capitalize">
                          {section.section_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getScoreColor(section.score)}`}
                        >
                          {section.score}%
                        </Badge>
                        {expandedSections.includes(section.section_type) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-2 bg-white border-x border-b rounded-b-lg space-y-2">
                    {/* Content preview */}
                    {section.content_preview && (
                      <p className="text-xs text-muted-foreground italic truncate">
                        "{section.content_preview}..."
                      </p>
                    )}
                    {/* Issues */}
                    {section.issues.length > 0 ? (
                      <div className="space-y-1">
                        {section.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={`text-xs p-2 rounded flex items-start gap-2 ${
                              issue.severity === 'error'
                                ? 'bg-red-50 text-red-800'
                                : issue.severity === 'warning'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            <AlertIcon severity={issue.severity} />
                            <div>
                              <p className="font-medium">{issue.message}</p>
                              {issue.suggestion && (
                                <p className="opacity-80 mt-0.5">{issue.suggestion}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Cette section est optimisee
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {/* Structure Check */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium text-sm mb-3">Structure du contenu</h4>
            <div className="space-y-2">
              <StructureItem
                label="Introduction accrocheuse"
                checked={analysis.structure_check.has_hook_intro}
              />
              <StructureItem
                label="Infos pratiques"
                checked={analysis.structure_check.has_practical_info}
              />
              <StructureItem
                label="Sous-titres (H2/H3)"
                checked={analysis.structure_check.has_subheadings}
              />
              <StructureItem
                label="Appels a l'action (CTA)"
                checked={analysis.structure_check.has_cta_blocks}
              />
              <StructureItem
                label="Liens internes"
                checked={analysis.structure_check.has_internal_links}
              />
            </div>

            {/* Missing sections */}
            {analysis.structure_check.missing_sections.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Sections manquantes :</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.structure_check.missing_sections.map((section, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs text-amber-600">
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Keyword Suggestions */}
          {analysis.keyword_suggestions.length > 0 && (
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-sm mb-3">Mots-cles suggeres</h4>
              <div className="flex flex-wrap gap-1">
                {analysis.keyword_suggestions.map((keyword, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for structure check items
function StructureItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-400" />
      )}
      <span className={checked ? 'text-gray-700' : 'text-amber-700'}>{label}</span>
    </div>
  );
}
