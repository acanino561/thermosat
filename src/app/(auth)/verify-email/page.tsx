'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const email = params.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus('error');
          setMessage(data.error);
        } else {
          setStatus('success');
          setMessage('Your email has been verified!');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, [params]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-strong rounded-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold mb-2">Email Verified</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Button asChild variant="glow">
              <Link href="/login">Sign In</Link>
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold mb-2">Verification Failed</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Button asChild variant="outline">
              <Link href="/login">Back to Login</Link>
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
