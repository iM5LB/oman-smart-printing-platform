'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe } from '@/lib/api';
import { getLibraryToken } from '@/lib/session';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getLibraryToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    fetchMe()
      .then((me) => {
        router.replace(me.onboarding_complete ? '/dashboard' : '/onboarding');
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="shell flex min-h-dvh items-center justify-center text-sm text-text-muted">
      جاري التحميل…
    </div>
  );
}
