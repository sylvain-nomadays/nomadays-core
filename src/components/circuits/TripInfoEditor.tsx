'use client';

import * as React from 'react';
import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/editor';

interface TripInfoField {
  key: string;
  htmlKey: string; // Rich text HTML field key
  label: string;
  placeholder: string;
  description?: string;
  required?: boolean;
}

const INFO_FIELDS: TripInfoField[] = [
  {
    key: 'info_general',
    htmlKey: 'info_general_html',
    label: 'Informations générales',
    placeholder: 'Décrivez les informations générales sur le voyage...',
    description: 'Informations pratiques sur le voyage',
  },
  {
    key: 'info_formalities',
    htmlKey: 'info_formalities_html',
    label: 'Formalités administratives',
    placeholder: 'Passeport, visa, vaccinations...',
    description: 'Conditions d\'entrée et santé',
  },
  {
    key: 'info_booking_conditions',
    htmlKey: 'info_booking_conditions_html',
    label: 'Conditions de réservation',
    placeholder: 'Modalités de réservation et de paiement...',
    description: 'Acompte, solde, délais',
  },
  {
    key: 'info_cancellation_policy',
    htmlKey: 'info_cancellation_policy_html',
    label: 'Conditions d\'annulation',
    placeholder: 'Politique d\'annulation et remboursement...',
    description: 'Frais et délais d\'annulation',
  },
  {
    key: 'info_additional',
    htmlKey: 'info_additional_html',
    label: 'Informations supplémentaires',
    placeholder: 'Autres informations importantes...',
    description: 'Optionnel',
    required: false,
  },
];

interface TripInfoData {
  info_general?: string;
  info_formalities?: string;
  info_booking_conditions?: string;
  info_cancellation_policy?: string;
  info_additional?: string;
  // Rich text HTML versions
  info_general_html?: string;
  info_formalities_html?: string;
  info_booking_conditions_html?: string;
  info_cancellation_policy_html?: string;
  info_additional_html?: string;
}

interface TripInfoEditorProps {
  data: TripInfoData;
  onChange: (data: TripInfoData) => void;
  onLoadDefaults?: () => void;
  isLoadingDefaults?: boolean;
  className?: string;
}

/**
 * Trip Information Editor component.
 * Accordion-style editor for the 5 information fields.
 * Uses RichTextEditor (Tiptap) in compact mode.
 */
export function TripInfoEditor({
  data = {},
  onChange,
  onLoadDefaults,
  isLoadingDefaults = false,
  className,
}: TripInfoEditorProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set(['info_general']));

  const toggleField = (key: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleFieldHtmlChange = (htmlKey: string, html: string) => {
    onChange({ ...data, [htmlKey]: html });
  };

  const expandAll = () => {
    setExpandedFields(new Set(INFO_FIELDS.map((f) => f.key)));
  };

  const collapseAll = () => {
    setExpandedFields(new Set());
  };

  const getFieldValue = (key: string): string => {
    return (data as Record<string, string>)[key] || '';
  };

  const getHtmlFieldValue = (htmlKey: string, fallbackKey: string): string => {
    return (data as Record<string, string>)[htmlKey] || (data as Record<string, string>)[fallbackKey] || '';
  };

  // Count based on HTML fields having content, with fallback to plain text
  const filledCount = INFO_FIELDS.filter(
    (field) => {
      const html = getFieldValue(field.htmlKey);
      const plain = getFieldValue(field.key);
      return (html && html.trim().length > 0 && html !== '<p></p>') || (plain && plain.trim().length > 0);
    }
  ).length;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-emerald-600" />
              Informations complémentaires
            </CardTitle>
            <span className="text-sm text-gray-500">
              {filledCount}/{INFO_FIELDS.length} renseignés
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onLoadDefaults && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadDefaults}
                disabled={isLoadingDefaults}
              >
                {isLoadingDefaults ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Charger templates
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={expandedFields.size > 0 ? collapseAll : expandAll}
            >
              {expandedFields.size > 0 ? 'Tout réduire' : 'Tout développer'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {INFO_FIELDS.map((field) => {
          const isExpanded = expandedFields.has(field.key);
          const htmlValue = getFieldValue(field.htmlKey);
          const plainValue = getFieldValue(field.key);
          const hasContent = (htmlValue && htmlValue.trim().length > 0 && htmlValue !== '<p></p>') || (plainValue && plainValue.trim().length > 0);

          return (
            <div
              key={field.key}
              className={cn(
                'border rounded-lg transition-all',
                isExpanded ? 'border-gray-300' : 'border-gray-200'
              )}
            >
              {/* Header */}
              <button
                type="button"
                onClick={() => toggleField(field.key)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      hasContent ? 'bg-emerald-500' : 'bg-gray-300'
                    )}
                  />
                  <div className="text-left">
                    <div className="font-medium text-sm text-gray-700">
                      {field.label}
                      {field.required !== false && !hasContent && (
                        <span className="text-red-400 ml-1">*</span>
                      )}
                    </div>
                    {!isExpanded && hasContent && (
                      <div className="text-xs text-gray-500 truncate max-w-md">
                        {(plainValue || '').slice(0, 80)}...
                      </div>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {/* Content — Rich Text Editor (compact) */}
              {isExpanded && (
                <div className="px-3 pb-3">
                  {field.description && (
                    <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                  )}
                  <RichTextEditor
                    content={getHtmlFieldValue(field.htmlKey, field.key)}
                    onChange={(html) => handleFieldHtmlChange(field.htmlKey, html)}
                    placeholder={field.placeholder}
                    compact
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default TripInfoEditor;
