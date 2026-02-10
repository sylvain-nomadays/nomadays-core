'use client';

import Link from 'next/link';
import {
  Settings,
  Users,
  Bell,
  Shield,
  ChevronRight,
} from 'lucide-react';

interface SettingsCategory {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const settingsCategories: SettingsCategory[] = [
  {
    title: 'Utilisateurs',
    description: 'Gérez les comptes utilisateurs et les permissions',
    href: '/admin/settings/users',
    icon: Users,
    badge: 'À venir',
  },
  {
    title: 'Notifications',
    description: 'Configurez les alertes et rappels automatiques',
    href: '/admin/settings/notifications',
    icon: Bell,
    badge: 'À venir',
  },
  {
    title: 'Sécurité',
    description: 'Paramètres de sécurité et authentification',
    href: '/admin/settings/security',
    icon: Shield,
    badge: 'À venir',
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-slate-600" />
          Administration
        </h1>
        <p className="text-gray-500 mt-1">
          Paramètres système, utilisateurs et sécurité
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          const isDisabled = !!category.badge;

          return (
            <Link
              key={category.href}
              href={isDisabled ? '#' : category.href}
              className={`block bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-all ${
                isDisabled
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:shadow-md hover:border-slate-200'
              }`}
              onClick={(e) => isDisabled && e.preventDefault()}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${isDisabled ? 'bg-gray-100' : 'bg-slate-50'}`}>
                  <Icon className={`w-6 h-6 ${isDisabled ? 'text-gray-400' : 'text-slate-600'}`} />
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
