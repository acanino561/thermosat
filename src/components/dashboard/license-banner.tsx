'use client';

import { useEffect, useState } from 'react';

export function LicenseBanner() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/license')
      .then((r) => r.json())
      .then((data) => {
        // Cloud mode or no expiry concern
        if (data.mode === 'cloud' || !data.licensed) return;
        if (data.daysUntilExpiry !== undefined && data.daysUntilExpiry <= 30) {
          setDaysRemaining(data.daysUntilExpiry);
        }
      })
      .catch(() => {});
  }, []);

  if (daysRemaining === null) return null;

  const critical = daysRemaining <= 7;

  return (
    <div
      className={`px-4 py-2 text-center text-sm font-medium ${
        critical
          ? 'bg-red-600 text-white'
          : 'bg-yellow-400 text-yellow-900'
      }`}
    >
      Your Verixos license expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
      Contact{' '}
      <a href="mailto:support@verixos.com" className="underline">
        support@verixos.com
      </a>{' '}
      to renew.
    </div>
  );
}
