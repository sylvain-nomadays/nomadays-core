import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NotificationsBell } from '@/components/notifications/notifications-bell';
import { AdminSidebar } from '@/components/navigation/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar avec navigation par sections */}
      <AdminSidebar userEmail={user.email ?? 'Utilisateur'} userRole="Admin" />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header with notifications */}
        <header className="h-14 border-b bg-background flex items-center justify-end px-6 gap-4">
          <NotificationsBell />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{user.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
