'use client';

import Link from 'next/link';
import {
  SlidersHorizontal,
  Building2,
  Palette,
  Globe,
  DollarSign,
  FileText,
  Users,
  ChevronRight,
  Landmark,
  Tag,
} from 'lucide-react';

interface ConfigCategory {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const configCategories: ConfigCategory[] = [
  {
    title: 'Informations entreprise',
    description: 'Raison sociale, adresse, numéros légaux — apparaissent sur toutes vos factures',
    href: '/admin/configuration/company',
    icon: Landmark,
  },
  {
    title: 'Agences partenaires',
    description: 'Gérez vos partenaires B2B et leur branding white-label',
    href: '/admin/configuration/partner-agencies',
    icon: Building2,
  },
  {
    title: 'Catégories de voyageurs',
    description: 'Touristes (adulte, enfant...), équipe (guide, chauffeur...) et Tour Leader — définit qui compte dans le prix par personne',
    href: '/admin/configuration/pax-categories',
    icon: Users,
  },
  {
    title: 'Conditions',
    description: 'Conditions globales (langue guide, cuisinier...) et leurs options pour filtrer les formules dans la cotation',
    href: '/admin/configuration/conditions',
    icon: SlidersHorizontal,
  },
  {
    title: 'Thématiques de voyage',
    description: '12 thématiques prédéfinies pour catégoriser vos circuits (max 3 par circuit)',
    href: '/admin/configuration/themes',
    icon: Palette,
  },
  {
    title: 'Templates par pays',
    description: 'Définissez les inclus/exclus et formalités par destination',
    href: '/admin/configuration/country-templates',
    icon: Globe,
    badge: 'À venir',
  },
  {
    title: 'Codes promo',
    description: 'Gérez les codes promo et bons de réduction pour vos clients',
    href: '/admin/configuration/promo-codes',
    icon: Tag,
  },
  {
    title: 'Taux de TVA',
    description: 'Configurez les taux de TVA par pays et catégorie de service',
    href: '/admin/configuration/vat-rates',
    icon: DollarSign,
  },
  {
    title: 'Conditions de vente',
    description: 'Texte des conditions particulières de vente présentées aux clients avant paiement',
    href: '/admin/configuration/sales-conditions',
    icon: FileText,
  },
];

export default function ConfigurationPage() {
  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <SlidersHorizontal className="w-7 h-7 text-primary-500" />
          Configuration
        </h1>
        <p className="text-gray-500 mt-1">
          Paramètres métier pour la cotation et la confection de voyages
        </p>
      </div>

      {/* Config Grid */}
      <div className="grid gap-4">
        {configCategories.map((category) => {
          const Icon = category.icon;
          const isDisabled = !!category.badge;

          return (
            <Link
              key={category.href}
              href={isDisabled ? '#' : category.href}
              className={`block bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-all ${
                isDisabled
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:shadow-md hover:border-primary-200'
              }`}
              onClick={(e) => isDisabled && e.preventDefault()}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${isDisabled ? 'bg-gray-100' : 'bg-primary-50'}`}>
                  <Icon className={`w-6 h-6 ${isDisabled ? 'text-gray-400' : 'text-primary-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{category.title}</h3>
                    {category.badge && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                        {category.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${isDisabled ? 'text-gray-300' : 'text-gray-400'}`} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
