'use client';

import { useEffect, useState } from 'react';

interface LicenseInfo {
  licensed: boolean;
  org?: string;
  expiresAt?: string;
  error?: string;
}

export default function LicenseErrorPage() {
  const [info, setInfo] = useState<LicenseInfo | null>(null);

  useEffect(() => {
    fetch('/api/license')
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ licensed: false, error: 'Unable to check license status' }));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            className="h-8 w-8 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          License Issue
        </h1>

        <p className="text-gray-600 dark:text-gray-400">
          {info?.error === 'License has expired'
            ? 'Your Verixos license has expired.'
            : 'Your Verixos license key is invalid.'}
        </p>

        {info?.org && (
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Organization: <span className="font-medium">{info.org}</span>
          </p>
        )}

        {info?.expiresAt && (
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Expiry: <span className="font-medium">{new Date(info.expiresAt).toLocaleDateString()}</span>
          </p>
        )}

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Contact{' '}
            <a
              href="mailto:support@verixos.com"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              support@verixos.com
            </a>{' '}
            to renew your license.
          </p>
        </div>
      </div>
    </div>
  );
}
