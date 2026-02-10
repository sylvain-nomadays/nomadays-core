import { redirect } from 'next/navigation';

/**
 * Redirect /admin/locations to /admin/templates?tab=destinations
 *
 * Les destinations sont maintenant gérées dans l'onglet "Destinations"
 * de la page Templates pour une navigation unifiée.
 */
export default function LocationsPage() {
  redirect('/admin/templates?tab=destinations');
}
