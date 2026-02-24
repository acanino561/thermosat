'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Settings, Key, Copy, Eye, EyeOff } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const [units, setUnits] = useState('si');
  const [showKey, setShowKey] = useState(false);
  const [name, setName] = useState('Dr. Sarah Chen');
  const [email, setEmail] = useState('s.chen@spacecraft-thermal.io');

  return (
    <div className="space-y-8 max-w-3xl">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <h1 className="font-heading text-3xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and API access.
        </p>
      </motion.div>

      {/* Profile Section */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <CardTitle className="font-heading">Profile</CardTitle>
            </div>
            <CardDescription>Your personal information and avatar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-2 border-blue-500/30">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xl font-bold">
                  SC
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10">
                Change Avatar
              </Button>
            </div>
            <Separator className="bg-white/10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
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
            <CardDescription>Default simulation parameters and display units.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Unit System</Label>
                <p className="text-xs text-muted-foreground">
                  Switch between SI (Kelvin, Watts) and Imperial (°F, BTU/hr).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${units === 'si' ? 'text-blue-400' : 'text-muted-foreground'}`}>SI</span>
                <Switch
                  checked={units === 'imperial'}
                  onCheckedChange={(checked) => setUnits(checked ? 'imperial' : 'si')}
                />
                <span className={`text-sm ${units === 'imperial' ? 'text-blue-400' : 'text-muted-foreground'}`}>Imperial</span>
              </div>
            </div>
            <Separator className="bg-white/10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Solver</Label>
                <Select defaultValue="crank-nicolson">
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crank-nicolson">Crank-Nicolson</SelectItem>
                    <SelectItem value="forward-euler">Forward Euler</SelectItem>
                    <SelectItem value="backward-euler">Backward Euler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Time Step (s)</Label>
                <Input defaultValue="1.0" type="number" step="0.1" className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Default Sim Duration (s)</Label>
                <Input defaultValue="5400" type="number" className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Convergence Tolerance</Label>
                <Input defaultValue="0.001" type="number" step="0.0001" className="bg-white/5 border-white/10" />
              </div>
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* API Keys Section */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }}>
        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-400" />
              <CardTitle className="font-heading">API Keys</CardTitle>
            </div>
            <CardDescription>Manage API keys for programmatic access to simulations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Production Key</span>
                <span className="text-xs text-muted-foreground">Created Feb 15, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-black/30 px-3 py-2 text-xs font-mono text-muted-foreground">
                  {showKey ? 'sta_prod_k8x92mNvPqR7wZt4aB6cD' : '•••••••••••••••••••••••••'}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="outline" className="bg-white/5 border-white/10">
              Generate New Key
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
