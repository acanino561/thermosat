import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { users, passwordResetTokens, sessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { sendPasswordResetEmail } from '@/lib/email';

// POST /api/auth/reset-password — request a reset
const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (user) {
      const token = uuid();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResetTokens).values({
        identifier: email,
        token,
        expires,
      });

      sendPasswordResetEmail(email, token).catch(console.error);
    }

    return NextResponse.json({
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/auth/reset-password — confirm reset with token + new password
const confirmSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { email, token, password } = parsed.data;

    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.identifier, email),
          eq(passwordResetTokens.token, token),
        ),
      );

    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Get user ID for session invalidation
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.email, email));

    // Delete all reset tokens for this email
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.identifier, email));

    // Invalidate all existing sessions for this user
    if (user) {
      await db.delete(sessions).where(eq(sessions.userId, user.id));
    }

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
