'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/rank');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
      <div className="text-white">Redirecting to /rank...</div>
    </div>
  );
}
