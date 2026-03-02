'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface LicenseInfo {
  valid: boolean;
  org?: string;
  seats?: number;
  tier?: string;
  expiresAt?: string;
  daysRemaining?: number;
  expired?: boolean;
  source?: string;
  error?: string;
}

export default function LicenseAdminPage() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/license/status');
      const data = await res.json();
      setLicense(data);
    } catch {
      setLicense({ valid: false, error: 'Failed to fetch license status' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/license/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setUploadResult({ success: true, message: data.message || 'License uploaded successfully' });
        await fetchStatus();
      } else {
        setUploadResult({ success: false, message: data.error || 'Upload failed' });
      }
    } catch {
      setUploadResult({ success: false, message: 'Network error during upload' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadRenewal = async () => {
    try {
      const res = await fetch('/api/admin/license/renewal-request');
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to generate renewal request');
        return;
      }
      const disposition = res.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || 'renewal-request.vxlr';

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download renewal request');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-400">Loading license information...</div>
      </div>
    );
  }

  const isExpiringSoon = license?.valid && (license.daysRemaining ?? 999) <= 30;
  const isExpired = license?.expired;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">License Management</h1>

      {/* Status Card */}
      <div
        className={`rounded-lg border p-6 mb-6 ${
          isExpired
            ? 'border-red-500/50 bg-red-950/20'
            : isExpiringSoon
              ? 'border-yellow-500/50 bg-yellow-950/20'
              : license?.valid
                ? 'border-green-500/50 bg-green-950/20'
                : 'border-gray-600 bg-gray-900/50'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Current License</h2>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isExpired
                ? 'bg-red-500/20 text-red-400'
                : isExpiringSoon
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : license?.valid
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : license?.valid ? 'Active' : 'No License'}
          </span>
        </div>

        {license?.valid || license?.expired ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Organization</span>
              <span className="text-white">{license.org}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tier</span>
              <span className="text-white capitalize">{license.tier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Seats</span>
              <span className="text-white">{license.seats}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expires</span>
              <span className="text-white">
                {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Days Remaining</span>
              <span className={isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-white'}>
                {isExpired ? 'Expired' : `${license.daysRemaining} days`}
              </span>
            </div>
            {license.source && (
              <div className="flex justify-between">
                <span className="text-gray-400">Source</span>
                <span className="text-gray-300 text-xs">{license.source}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">{license?.error || 'No valid license found.'}</p>
        )}
      </div>

      {/* Expiring Soon Warning */}
      {isExpiringSoon && !isExpired && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-950/20 p-4 mb-6">
          <h3 className="text-yellow-400 font-medium mb-2">⚠️ License Expiring Soon</h3>
          <p className="text-yellow-200/70 text-sm mb-3">
            Your license expires in {license?.daysRemaining} days. Download a renewal request and send it to
            licensing@verixos.com to receive a new license file.
          </p>
          <button
            onClick={handleDownloadRenewal}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm transition-colors"
          >
            Download Renewal Request (.vxlr)
          </button>
        </div>
      )}

      {/* Expired Warning */}
      {isExpired && (
        <div className="rounded-lg border border-red-500/50 bg-red-950/20 p-4 mb-6">
          <h3 className="text-red-400 font-medium mb-2">🚫 License Expired</h3>
          <p className="text-red-200/70 text-sm mb-3">
            Your license has expired. Download a renewal request and send it to licensing@verixos.com, or upload a new
            license file below.
          </p>
          <button
            onClick={handleDownloadRenewal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
          >
            Download Renewal Request (.vxlr)
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-4">
        {/* Upload License */}
        <div className="rounded-lg border border-gray-700 p-4">
          <h3 className="text-white font-medium mb-2">Upload New License</h3>
          <p className="text-gray-400 text-sm mb-3">
            Upload a <code className="text-gray-300">.vxlic</code> license file. The license will be active until the
            next server restart. For persistence, set <code className="text-gray-300">VERIXOS_LICENSE_KEY</code> in your{' '}
            <code className="text-gray-300">.env</code> file.
          </p>
          <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm cursor-pointer transition-colors">
            {uploading ? 'Uploading...' : 'Choose .vxlic File'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".vxlic"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div
            className={`rounded-lg border p-4 ${
              uploadResult.success ? 'border-green-500/50 bg-green-950/20' : 'border-red-500/50 bg-red-950/20'
            }`}
          >
            <p className={uploadResult.success ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
              {uploadResult.message}
            </p>
          </div>
        )}

        {/* Download Renewal Request */}
        <div className="rounded-lg border border-gray-700 p-4">
          <h3 className="text-white font-medium mb-2">Renewal Request</h3>
          <p className="text-gray-400 text-sm mb-3">
            Generate a renewal request file to send to Aurora for a new license.
          </p>
          <button
            onClick={handleDownloadRenewal}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
          >
            Download Renewal Request (.vxlr)
          </button>
        </div>
      </div>
    </div>
  );
}
