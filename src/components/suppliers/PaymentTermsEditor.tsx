'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  DollarSign,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Star,
} from 'lucide-react';
import type {
  PaymentTerms,
  PaymentInstallment,
  PaymentDueDateReference,
  CreatePaymentTermsDTO,
  CreatePaymentInstallmentDTO,
} from '@/lib/api/types';
import { PAYMENT_TERMS_PRESETS } from '@/lib/api/types';

// ============================================================================
// Types
// ============================================================================

interface PaymentTermsEditorProps {
  supplierId: number;
  paymentTerms: PaymentTerms[];
  defaultPaymentTermsId?: number;
  onSave: (terms: CreatePaymentTermsDTO) => Promise<void>;
  onUpdate: (id: number, terms: Partial<PaymentTerms>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onSetDefault: (id: number) => Promise<void>;
  loading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const REFERENCE_OPTIONS: { value: PaymentDueDateReference; label: string; description: string }[] = [
  { value: 'confirmation', label: 'Confirmation', description: 'À la confirmation du dossier' },
  { value: 'departure', label: 'Départ', description: 'Par rapport à la date de départ' },
  { value: 'service', label: 'Service', description: 'Par rapport à la date de la prestation' },
  { value: 'return', label: 'Retour', description: 'Par rapport à la date de retour' },
  { value: 'invoice', label: 'Facture', description: 'Par rapport à la date de facture' },
];

const REFERENCE_LABELS: Record<PaymentDueDateReference, string> = {
  confirmation: 'confirmation',
  departure: 'départ',
  service: 'prestation',
  return: 'retour',
  invoice: 'facture',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatInstallment(installment: PaymentInstallment): string {
  const { percentage, reference, days_offset } = installment;
  const refLabel = REFERENCE_LABELS[reference];

  if (days_offset === 0) {
    return `${percentage}% à la ${refLabel}`;
  } else if (days_offset < 0) {
    return `${percentage}% ${Math.abs(days_offset)}j avant ${refLabel}`;
  } else {
    return `${percentage}% ${days_offset}j après ${refLabel}`;
  }
}

function validateInstallments(installments: CreatePaymentInstallmentDTO[]): string | null {
  if (installments.length === 0) {
    return 'Au moins une échéance est requise';
  }

  const totalPercentage = installments.reduce((sum, i) => sum + i.percentage, 0);
  if (totalPercentage !== 100) {
    return `Le total des pourcentages doit être 100% (actuellement ${totalPercentage}%)`;
  }

  for (const installment of installments) {
    if (installment.percentage <= 0 || installment.percentage > 100) {
      return 'Chaque pourcentage doit être entre 1% et 100%';
    }
  }

  return null;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface InstallmentRowProps {
  installment: CreatePaymentInstallmentDTO;
  index: number;
  onChange: (index: number, installment: CreatePaymentInstallmentDTO) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function InstallmentRow({ installment, index, onChange, onRemove, canRemove }: InstallmentRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>

      {/* Percentage */}
      <div className="w-24">
        <div className="relative">
          <input
            type="number"
            min="1"
            max="100"
            value={installment.percentage}
            onChange={(e) => onChange(index, { ...installment, percentage: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
        </div>
      </div>

      {/* Days offset */}
      <div className="w-24">
        <input
          type="number"
          value={installment.days_offset}
          onChange={(e) => onChange(index, { ...installment, days_offset: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Jours"
        />
      </div>

      <span className="text-gray-500 text-sm">jours</span>

      {/* Reference selector */}
      <div className="flex-1">
        <select
          value={installment.reference}
          onChange={(e) => onChange(index, { ...installment, reference: e.target.value as PaymentDueDateReference })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {REFERENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {installment.days_offset < 0 ? 'avant' : installment.days_offset > 0 ? 'après' : 'à'} {opt.label.toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Label */}
      <div className="w-40">
        <input
          type="text"
          value={installment.label || ''}
          onChange={(e) => onChange(index, { ...installment, label: e.target.value })}
          placeholder="Libellé (optionnel)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface PaymentTermsCardProps {
  terms: PaymentTerms;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

function PaymentTermsCard({ terms, isDefault, onEdit, onDelete, onSetDefault }: PaymentTermsCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-lg p-4 ${isDefault ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900">{terms.name}</h4>
            {isDefault && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                <Star className="w-3 h-3" />
                Par défaut
              </span>
            )}
          </div>
          {terms.description && (
            <p className="text-sm text-gray-500 mb-2">{terms.description}</p>
          )}

          {/* Summary */}
          <div className="flex flex-wrap gap-2">
            {terms.installments.map((installment, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {formatInstallment(installment)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-4">
          {!isDefault && (
            <button
              onClick={onSetDefault}
              title="Définir par défaut"
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left pb-2">Échéance</th>
                <th className="text-right pb-2">Pourcentage</th>
                <th className="text-left pb-2 pl-4">Référence</th>
                <th className="text-right pb-2">Délai</th>
              </tr>
            </thead>
            <tbody>
              {terms.installments.map((installment, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="py-2 font-medium text-gray-900">
                    {installment.label || `Échéance ${idx + 1}`}
                  </td>
                  <td className="py-2 text-right text-gray-700">
                    {installment.percentage}%
                  </td>
                  <td className="py-2 pl-4 text-gray-600">
                    {REFERENCE_LABELS[installment.reference]}
                  </td>
                  <td className="py-2 text-right text-gray-600">
                    {installment.days_offset === 0
                      ? 'le jour même'
                      : installment.days_offset < 0
                        ? `J${installment.days_offset}`
                        : `J+${installment.days_offset}`
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function PaymentTermsEditor({
  supplierId,
  paymentTerms,
  defaultPaymentTermsId,
  onSave,
  onUpdate,
  onDelete,
  onSetDefault,
  loading = false,
}: PaymentTermsEditorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formInstallments, setFormInstallments] = useState<CreatePaymentInstallmentDTO[]>([
    { percentage: 100, reference: 'confirmation', days_offset: 0, label: 'Paiement intégral' }
  ]);

  const validationError = useMemo(() => validateInstallments(formInstallments), [formInstallments]);
  const totalPercentage = useMemo(() =>
    formInstallments.reduce((sum, i) => sum + i.percentage, 0),
    [formInstallments]
  );

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormInstallments([
      { percentage: 100, reference: 'confirmation', days_offset: 0, label: 'Paiement intégral' }
    ]);
    setIsCreating(false);
    setEditingId(null);
    setShowPresets(false);
  };

  // Load preset
  const loadPreset = (presetKey: string) => {
    const preset = PAYMENT_TERMS_PRESETS[presetKey];
    if (preset) {
      setFormName(preset.name);
      setFormDescription(preset.description);
      setFormInstallments([...preset.installments]);
      setShowPresets(false);
    }
  };

  // Start editing
  const startEdit = (terms: PaymentTerms) => {
    setEditingId(terms.id || null);
    setFormName(terms.name);
    setFormDescription(terms.description || '');
    setFormInstallments(terms.installments.map(i => ({
      percentage: i.percentage,
      reference: i.reference,
      days_offset: i.days_offset,
      label: i.label,
    })));
    setIsCreating(true);
  };

  // Handle installment change
  const handleInstallmentChange = (index: number, installment: CreatePaymentInstallmentDTO) => {
    const newInstallments = [...formInstallments];
    newInstallments[index] = installment;
    setFormInstallments(newInstallments);
  };

  // Add installment
  const addInstallment = () => {
    const remaining = 100 - totalPercentage;
    setFormInstallments([
      ...formInstallments,
      { percentage: Math.max(remaining, 0), reference: 'departure', days_offset: -14, label: '' }
    ]);
  };

  // Remove installment
  const removeInstallment = (index: number) => {
    setFormInstallments(formInstallments.filter((_, i) => i !== index));
  };

  // Save
  const handleSave = async () => {
    if (validationError) return;

    const data: CreatePaymentTermsDTO = {
      supplier_id: supplierId,
      name: formName,
      description: formDescription || undefined,
      installments: formInstallments,
      is_default: paymentTerms.length === 0, // First one is default
    };

    if (editingId) {
      await onUpdate(editingId, {
        name: formName,
        description: formDescription || undefined,
        installments: formInstallments as PaymentInstallment[],
      });
    } else {
      await onSave(data);
    }

    resetForm();
  };

  // Confirm delete
  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ces conditions de paiement ?')) {
      await onDelete(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Conditions de paiement</h3>
          <p className="text-sm text-gray-500">
            Définissez les échéances de paiement pour ce fournisseur
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        )}
      </div>

      {/* Existing payment terms */}
      {paymentTerms.length > 0 && !isCreating && (
        <div className="space-y-3">
          {paymentTerms.map((terms) => (
            <PaymentTermsCard
              key={terms.id}
              terms={terms}
              isDefault={terms.id === defaultPaymentTermsId}
              onEdit={() => startEdit(terms)}
              onDelete={() => terms.id && handleDelete(terms.id)}
              onSetDefault={() => terms.id && onSetDefault(terms.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {paymentTerms.length === 0 && !isCreating && (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-gray-900 font-medium mb-1">Aucune condition de paiement</h4>
          <p className="text-sm text-gray-500 mb-4">
            Ajoutez des conditions de paiement pour suivre les échéances
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer des conditions
          </button>
        </div>
      )}

      {/* Creation/Edit form */}
      {isCreating && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              {editingId ? 'Modifier les conditions' : 'Nouvelles conditions de paiement'}
            </h4>
            <div className="flex items-center gap-2">
              {/* Presets dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Modèles
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showPresets && (
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
                        Modèles prédéfinis
                      </div>
                      {Object.entries(PAYMENT_TERMS_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => loadPreset(key)}
                          className="w-full text-left px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <div className="font-medium text-gray-900 text-sm">{preset.name}</div>
                          <div className="text-xs text-gray-500">{preset.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Standard 30/70"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description courte (optionnel)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Installments */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Échéances
              </label>
              <div className={`text-sm font-medium ${totalPercentage === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                Total: {totalPercentage}%
              </div>
            </div>

            <div className="space-y-2">
              {formInstallments.map((installment, index) => (
                <InstallmentRow
                  key={index}
                  installment={installment}
                  index={index}
                  onChange={handleInstallmentChange}
                  onRemove={removeInstallment}
                  canRemove={formInstallments.length > 1}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addInstallment}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter une échéance
            </button>
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{validationError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!formName || !!validationError || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-4 h-4" />
              {editingId ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
