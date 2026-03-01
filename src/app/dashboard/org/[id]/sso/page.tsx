'use client';

import { use } from 'react';
import { SsoConfigForm } from '@/components/dashboard/sso-config-form';

export default function SsoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="container mx-auto max-w-5xl py-8">
      <h1 className="mb-6 text-2xl font-bold">Single Sign-On</h1>
      <SsoConfigForm orgId={id} />
    </div>
  );
}
