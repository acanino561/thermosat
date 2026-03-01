'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SsoConfigData {
  entityId: string;
  ssoUrl: string;
  certificate: string;
  metadataUrl: string | null;
  domainEnforced: boolean;
  enabled: boolean;
}

export function SsoConfigForm({ orgId }: { orgId: string }) {
  const [config, setConfig] = useState<SsoConfigData>({
    entityId: '',
    ssoUrl: '',
    certificate: '',
    metadataUrl: null,
    domainEnforced: false,
    enabled: false,
  });
  const [metadataXml, setMetadataXml] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const spEntityId = `${baseUrl}/api/saml/${orgId}/metadata`;
  const spAcsUrl = `${baseUrl}/api/saml/${orgId}/acs`;

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/sso`);
      const json = await res.json();
      if (json.data) {
        setConfig({
          entityId: json.data.entityId ?? '',
          ssoUrl: json.data.ssoUrl ?? '',
          certificate: json.data.certificate ?? '',
          metadataUrl: json.data.metadataUrl ?? null,
          domainEnforced: json.data.domainEnforced ?? false,
          enabled: json.data.enabled ?? false,
        });
      }
    } catch {
      // No config yet
    }
  }, [orgId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleParseMetadata() {
    try {
      const res = await fetch(`/api/organizations/${orgId}/sso/parse-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadataXml }),
      });
      const json = await res.json();
      if (json.data) {
        setConfig((prev) => ({
          ...prev,
          entityId: json.data.entityId,
          ssoUrl: json.data.ssoUrl,
          certificate: json.data.certificate,
        }));
        setMessage('Metadata parsed successfully');
      } else {
        setMessage(json.error ?? 'Failed to parse metadata');
      }
    } catch {
      setMessage('Failed to parse metadata');
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/organizations/${orgId}/sso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage('Configuration saved');
      } else {
        const json = await res.json();
        setMessage(json.error ? JSON.stringify(json.error) : 'Failed to save');
      }
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    try {
      const res = await fetch(`/api/organizations/${orgId}/sso/test`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.data?.testUrl) {
        window.location.href = json.data.testUrl;
      } else {
        setMessage(json.error ?? 'Failed to get test URL');
      }
    } catch {
      setMessage('Failed to test connection');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard');
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Left: IdP Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Identity Provider Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>IdP Metadata XML</Label>
            <Textarea
              value={metadataXml}
              onChange={(e) => setMetadataXml(e.target.value)}
              placeholder="Paste your IdP metadata XML here..."
              rows={6}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleParseMetadata}
              disabled={!metadataXml}
            >
              Parse Metadata
            </Button>
          </div>

          <div>
            <Label htmlFor="entityId">Entity ID</Label>
            <Input
              id="entityId"
              value={config.entityId}
              onChange={(e) => setConfig({ ...config, entityId: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="ssoUrl">SSO URL</Label>
            <Input
              id="ssoUrl"
              value={config.ssoUrl}
              onChange={(e) => setConfig({ ...config, ssoUrl: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="certificate">Certificate</Label>
            <Textarea
              id="certificate"
              value={config.certificate}
              onChange={(e) => setConfig({ ...config, certificate: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
            <Label>Enable SSO</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={config.domainEnforced}
              onCheckedChange={(checked) =>
                setConfig({ ...config, domainEnforced: checked })
              }
            />
            <Label>Enforce SSO for all domain users</Label>
          </div>
        </CardContent>
      </Card>

      {/* Right: SP Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Service Provider Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Entity ID</Label>
            <div className="flex gap-2">
              <Input value={spEntityId} readOnly />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(spEntityId)}>
                Copy
              </Button>
            </div>
          </div>

          <div>
            <Label>ACS URL</Label>
            <div className="flex gap-2">
              <Input value={spAcsUrl} readOnly />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(spAcsUrl)}>
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="md:col-span-2 flex gap-4 items-center">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
        <Button variant="outline" onClick={handleTest}>
          Test Connection
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
