'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Admin functionality has moved to the root page (/)
// This page redirects for backward compatibility
export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null; // No need to render anything during redirect
}
