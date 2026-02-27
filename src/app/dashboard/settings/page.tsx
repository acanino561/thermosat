'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { User, Settings, Key, Shield, Trash2, Download, Loader2, Github, Link2, Unlink } from 'lucide-react';
import { signIn } from 'next-auth/react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  organization: string | null;
  roleTitle: string | null;
  unitsPref: 'si' | 'imperial' | null;
  tempUnit: 'K' | 'C' | 'F' | null;
}

interface ProviderInfo {
  providers: { provider: string; providerAccountId: string }[];
  hasPassword: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [providers, setProviders] = useState<ProviderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [unitsPref, setUnitsPref] = useState<'si' | 'imperial'>('si');
  const [tempUnit, setTempUnit] = useState<'K' | 'C' | 'F'>('K');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete dialog
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/user/profile').then((r) => r.json()),
      fetch('/api/user/providers').then((r) => r.json()),
    ]).then(([profileData, providerData]) => {
      setProfile(profileData);
      setProviders(providerData);
      setName(profileData.name ?? '');
      setOrganization(profileData.organization ?? '');
      setRoleTitle(profileData.roleTitle ?? '');
      setUnitsPref(profileData.unitsPref ?? 'si');
      setTempUnit(profileData.tempUnit ?? 'K');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organization, roleTitle, unitsPref, tempUnit }),
      });
      const data = await res.json();
      if (!res.ok) showMsg('error', data.error);
      else showMsg('success', 'Profile saved');
    } catch {
      showMsg('error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg('error', 'Passwords do not match');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) showMsg('error', data.error);
      else {
        showMsg('success', 'Password changed');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      showMsg('error', 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const unlinkProvider = async (provider: string) => {
    try {
      const res = await fetch('/api/user/providers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) showMsg('error', data.error);
      else {
        showMsg('success', `${provider} unlinked`);
        // Refresh providers
        const updated = await fetch('/api/user/providers').then((r) => r.json());
        setProviders(updated);
      }
    } catch {
      showMsg('error', 'Failed to unlink');
    }
  };

  const deleteAccount = async () => {
    try {
      const res = await fetch('/api/user/delete-account', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) showMsg('error', data.error);
      else {
        showMsg('success', data.message);
        setDeleteOpen(false);
      }
    } catch {
      showMsg('error', 'Failed to delete account');
    }
  };

  const exportData = () => {
    window.open('/api/user/export-data', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const initials = (name || profile?.email || '??')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8 max-w-3xl">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <h1 className="font-heading text-3xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and account.
        </p>
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {/* Profile Section */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <CardTitle className="font-heading">Profile</CardTitle>
            </div>
            <CardDescription>Your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-2 border-blue-500/30">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile?.email}</p>
                <p className="text-xs text-muted-foreground">
                  Member since {profile?.id ? new Date().getFullYear() : ''}
                </p>
              </div>
            </div>
            <Separator className="bg-white/10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={profile?.email ?? ''}
                  disabled
                  className="bg-white/5 border-white/10 opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org">Organization</Label>
                <Input
                  id="org"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g., NASA JPL"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role / Title</Label>
                <Input
                  id="role"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g., Thermal Engineer"
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Profile
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preferences Section */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }}>
        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-cyan-400" />
              <CardTitle className="font-heading">Preferences</CardTitle>
            </div>
            <CardDescription>Display units and defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Unit System</Label>
                <p className="text-xs text-muted-foreground">
                  SI (metric) or Imperial.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${unitsPref === 'si' ? 'text-blue-400' : 'text-muted-foreground'}`}>SI</span>
                <Switch
                  checked={unitsPref === 'imperial'}
                  onCheckedChange={(checked) => setUnitsPref(checked ? 'imperial' : 'si')}
                />
                <span className={`text-sm ${unitsPref === 'imperial' ? 'text-blue-400' : 'text-muted-foreground'}`}>Imperial</span>
              </div>
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-2">
              <Label>Temperature Unit</Label>
              <Select value={tempUnit} onValueChange={(v) => setTempUnit(v as 'K' | 'C' | 'F')}>
                <SelectTrigger className="bg-white/5 border-white/10 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="K">Kelvin (K)</SelectItem>
                  <SelectItem value="C">Celsius (°C)</SelectItem>
                  <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Connected Accounts */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.25 }}>
        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-purple-400" />
              <CardTitle className="font-heading">Connected Accounts</CardTitle>
            </div>
            <CardDescription>Link or unlink OAuth providers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['github', 'google'] as const).map((provider) => {
              const linked = providers?.providers.find((p) => p.provider === provider);
              return (
                <div key={provider} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3">
                    {provider === 'github' ? <Github className="h-5 w-5" /> : <span className="text-lg">G</span>}
                    <span className="font-medium capitalize">{provider}</span>
                    {linked && <span className="text-xs text-muted-foreground">Connected</span>}
                  </div>
                  {linked ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => unlinkProvider(provider)}
                    >
                      <Unlink className="h-4 w-4 mr-1" /> Unlink
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/10"
                      onClick={() => signIn(provider, { callbackUrl: '/dashboard/settings' })}
                    >
                      <Link2 className="h-4 w-4 mr-1" /> Link
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Password */}
      {providers?.hasPassword && (
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-400" />
                <CardTitle className="font-heading">Change Password</CardTitle>
              </div>
              <CardDescription>Update your account password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="current-pw">Current Password</Label>
                  <Input
                    id="current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pw">New Password</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw">Confirm New Password</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <Button type="submit" disabled={passwordSaving} className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                  {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Danger Zone */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.35 }}>
        <Card className="bg-white/[0.03] border-red-500/20 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" />
              <CardTitle className="font-heading text-red-400">Danger Zone</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export Data</p>
                <p className="text-xs text-muted-foreground">Download all your personal data as JSON (GDPR).</p>
              </div>
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10" onClick={exportData}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
            <Separator className="bg-white/10" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-400">Delete Account</p>
                <p className="text-xs text-muted-foreground">30-day grace period. Sign in within 30 days to recover.</p>
              </div>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Account</DialogTitle>
                    <DialogDescription>
                      Type &quot;DELETE&quot; to confirm. Your account will be recoverable for 30 days.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder='Type "DELETE"'
                  />
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button
                      variant="destructive"
                      disabled={deleteConfirm !== 'DELETE'}
                      onClick={deleteAccount}
                    >
                      Delete My Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
