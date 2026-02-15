import {
  LayoutDashboard,
  FolderKanban,
  Map,
  MapPin,
  Users,
  Building2,
  Settings,
  HelpCircle,
  Plane,
  Truck,
  LayoutTemplate,
  FileText,
  Globe,
  Image,
  Search,
  CreditCard,
  Receipt,
  TrendingUp,
  Wallet,
  BarChart3,
  PieChart,
  Target,
  Key,
  UserCog,
  ClipboardList,
  Bell,
  SlidersHorizontal,
  BookOpen,
  Layout,
  UserCircle,
  MessageSquare,
  Palette,
  Mail,
  Calendar,
  Compass,
  type LucideIcon,
} from 'lucide-react';

/**
 * Sections principales de l'application
 */
export type AppSection =
  | 'commercial'
  | 'logistics'
  | 'cms'
  | 'accounting'
  | 'analytics'
  | 'admin';

/**
 * Configuration d'une section
 */
export interface SectionConfig {
  id: AppSection;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string; // Tailwind color class
  description: string;
  basePath: string;
}

/**
 * Configuration d'un item de navigation
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: AppSection;
  badge?: string; // Pour afficher un compteur
}

/**
 * Groupe de navigation (sous-section avec label)
 */
export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Items de navigation : peut être un item simple ou un groupe
 */
export type SectionNavItems = (NavItem | NavGroup)[];

/**
 * Type guard : vérifie si un élément est un NavGroup
 */
export function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return 'items' in item;
}

/**
 * Définition des 6 sections principales
 */
export const sections: Record<AppSection, SectionConfig> = {
  commercial: {
    id: 'commercial',
    label: 'Commercial',
    shortLabel: 'Ventes',
    icon: FolderKanban,
    color: 'text-blue-600 bg-blue-50',
    description: 'Dossiers, circuits et confection de voyages',
    basePath: '/admin',
  },
  logistics: {
    id: 'logistics',
    label: 'Logistique',
    shortLabel: 'Ops',
    icon: Truck,
    color: 'text-emerald-600 bg-emerald-50',
    description: 'Opérations, réservations et fournisseurs',
    basePath: '/admin/logistics',
  },
  cms: {
    id: 'cms',
    label: 'CMS',
    shortLabel: 'Site',
    icon: Globe,
    color: 'text-purple-600 bg-purple-50',
    description: 'Contenus et gestion du site internet',
    basePath: '/admin/cms',
  },
  accounting: {
    id: 'accounting',
    label: 'Comptabilité',
    shortLabel: 'Compta',
    icon: CreditCard,
    color: 'text-amber-600 bg-amber-50',
    description: 'Factures, paiements et flux financiers',
    basePath: '/admin/accounting',
  },
  analytics: {
    id: 'analytics',
    label: 'Analytics',
    shortLabel: 'Stats',
    icon: BarChart3,
    color: 'text-cyan-600 bg-cyan-50',
    description: 'Tableaux de bord et analyse des performances',
    basePath: '/admin/analytics',
  },
  admin: {
    id: 'admin',
    label: 'Administration',
    shortLabel: 'Admin',
    icon: Settings,
    color: 'text-slate-600 bg-slate-50',
    description: 'Paramètres, utilisateurs et configuration',
    basePath: '/admin/settings',
  },
};

/**
 * Items de navigation par section
 * Les sections avec NavGroup utilisent navItemsBySectionGrouped
 * Les sections plates utilisent navItemsBySection
 */
export const navItemsBySection: Record<AppSection, NavItem[]> = {
  commercial: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'commercial' },
    { href: '/admin/dossiers', label: 'Dossiers', icon: FolderKanban, section: 'commercial' },
    { href: '/admin/invoices', label: 'Factures', icon: Receipt, section: 'commercial' },
    { href: '/admin/circuits', label: 'Circuits', icon: Map, section: 'commercial' },
    { href: '/admin/templates', label: 'Templates', icon: LayoutTemplate, section: 'commercial' },
    { href: '/admin/participants', label: 'Participants', icon: Users, section: 'commercial' },
    { href: '/admin/configuration', label: 'Configuration', icon: SlidersHorizontal, section: 'commercial' },
  ],
  logistics: [
    { href: '/admin/calendar', label: 'Calendrier A/D', icon: Plane, section: 'logistics' },
    { href: '/admin/suppliers', label: 'Fournisseurs', icon: Truck, section: 'logistics' },
    { href: '/admin/reservations', label: 'Réservations', icon: ClipboardList, section: 'logistics' },
    { href: '/admin/tasks', label: 'Tâches', icon: Bell, section: 'logistics' },
  ],
  cms: [
    { href: '/admin/content/guide', label: 'Contenus', icon: FileText, section: 'cms' },
    { href: '/admin/content/site', label: 'Pages', icon: Globe, section: 'cms' },
    { href: '/admin/content/site/media', label: 'Médias', icon: Image, section: 'cms' },
    { href: '/admin/content/client/faq', label: 'FAQ', icon: HelpCircle, section: 'cms' },
  ],
  accounting: [
    { href: '/admin/invoices', label: 'Factures clients', icon: Receipt, section: 'accounting' },
    { href: '/admin/payments', label: 'Paiements reçus', icon: CreditCard, section: 'accounting' },
    { href: '/admin/cashflow', label: 'Flux financiers', icon: TrendingUp, section: 'accounting' },
    { href: '/admin/aging', label: 'Ageings', icon: Wallet, section: 'accounting' },
  ],
  analytics: [
    { href: '/admin/analytics/dashboard', label: 'Dashboard', icon: BarChart3, section: 'analytics' },
    { href: '/admin/analytics/reports', label: 'Rapports', icon: PieChart, section: 'analytics' },
    { href: '/admin/analytics/kpis', label: 'KPIs', icon: Target, section: 'analytics' },
  ],
  admin: [
    { href: '/admin/tenants', label: 'Sites / DMC', icon: Building2, section: 'admin' },
    { href: '/admin/users', label: 'Utilisateurs', icon: UserCog, section: 'admin' },
    { href: '/admin/settings/availability', label: 'Disponibilités', icon: Calendar, section: 'admin' },
    { href: '/admin/api-keys', label: 'Clés API', icon: Key, section: 'admin' },
    { href: '/admin/settings', label: 'Paramètres', icon: Settings, section: 'admin' },
  ],
};

/**
 * Navigation groupée pour les sections qui ont des sous-sections
 * Utilisé par AdminSidebar pour rendre des groupes avec labels
 */
export const navGroupedBySection: Partial<Record<AppSection, SectionNavItems>> = {
  cms: [
    {
      label: 'Guide de voyage',
      items: [
        { href: '/admin/content/guide', label: 'Contenus', icon: BookOpen, section: 'cms' },
      ],
    },
    {
      label: 'Le site',
      items: [
        { href: '/admin/content/site', label: 'Pages', icon: Layout, section: 'cms', badge: 'À venir' },
        { href: '/admin/content/site/design', label: 'Design', icon: Palette, section: 'cms', badge: 'À venir' },
        { href: '/admin/content/site/media', label: 'Médias', icon: Image, section: 'cms', badge: 'À venir' },
      ],
    },
    {
      label: 'Espace client',
      items: [
        { href: '/admin/content/client/faq', label: 'FAQ', icon: HelpCircle, section: 'cms' },
        { href: '/admin/content/client/widgets', label: 'Widgets & textes', icon: MessageSquare, section: 'cms' },
        { href: '/admin/content/client/travel-info', label: 'Carnets pratiques', icon: Compass, section: 'cms' },
        { href: '/admin/content/client/emails', label: 'Emails', icon: Mail, section: 'cms', badge: 'À venir' },
      ],
    },
  ],
};

/**
 * Ordre d'affichage des sections
 */
export const sectionOrder: AppSection[] = [
  'commercial',
  'logistics',
  'cms',
  'accounting',
  'analytics',
  'admin',
];

/**
 * Récupère la section à partir d'un chemin
 */
export function getSectionFromPath(pathname: string): AppSection {
  // Mapping des chemins vers les sections
  const pathMappings: { pattern: RegExp; section: AppSection }[] = [
    { pattern: /^\/admin\/(dashboard|dossiers|circuits|templates|locations|participants|configuration|invoices)/, section: 'commercial' },
    { pattern: /^\/admin\/(calendar|suppliers|reservations|tasks)/, section: 'logistics' },
    { pattern: /^\/admin\/content/, section: 'cms' },
    { pattern: /^\/admin\/(payments|cashflow|aging)/, section: 'accounting' },
    { pattern: /^\/admin\/analytics/, section: 'analytics' },
    { pattern: /^\/admin\/(tenants|users|api-keys|settings)/, section: 'admin' },
  ];

  for (const { pattern, section } of pathMappings) {
    if (pattern.test(pathname)) {
      return section;
    }
  }

  // Par défaut : commercial
  return 'commercial';
}

/**
 * Bottom navigation items (communs à toutes les sections)
 */
export const bottomNavItems: NavItem[] = [
  { href: '/admin/help', label: 'Aide', icon: HelpCircle, section: 'commercial' },
];
