'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/shared/logo';
import { Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const email = params.get('email');

  // If no token, show "request reset" form; otherwise show "set new password" form
  const hasToken = !!(token && email);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success && !hasToken) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto">
        <div className="glass-strong rounded-2xl p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Check Your Email</h1>
          <p className="text-muted-foreground">If an account exists, we&apos;ve sent a reset link.</p>
        </div>
      </motion.div>
    );
  }

  if (success && hasToken) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto">
        <div className="glass-strong rounded-2xl p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Password Reset</h1>
          <p className="text-muted-foreground mb-6">Your password has been updated.</p>
          <Button asChild variant="glow">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto">
      <div className="glass-strong rounded-2xl p-8">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <h1 className="font-heading text-2xl font-bold text-center mb-2">
          {hasToken ? 'Set New Password' : 'Reset Password'}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {hasToken
            ? 'Enter your new password below.'
            : 'Enter your email and we\'ll send you a reset link.'}
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {hasToken ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="bg-white/5"
              />
            </div>
            <Button variant="glow" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reset Password
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                required
                className="bg-white/5"
              />
            </div>
            <Button variant="glow" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Reset Link
            </Button>
          </form>
        )}

        <p className="text-sm text-muted-foreground text-center mt-6">
          <Link href="/login" className="text-accent-blue hover:text-accent-cyan transition-colors">
            Back to login
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
