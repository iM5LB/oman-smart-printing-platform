'use client';

import { AdminShell } from '@/components/library-admin/admin-shell';

export default function LibraryAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
