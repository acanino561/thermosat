import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/client';
import { users, verificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { sendVerificationEmail } from '@/lib/email';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    // Check if user exists — return same response regardless to prevent enumeration
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existing) {
      // Silently notify the existing user that someone tried to register with their email
      sendVerificationEmail(email, '__account_exists__').catch(console.error);
      return NextResponse.json(
        { message: 'Account created. Please check your email to verify.' },
        { status: 201 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
      })
      .returning({ id: users.id });

    // Create verification token (24h expiry)
    const token = uuid();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expires,
    });

    // Send verification email (don't block response on failure)
    sendVerificationEmail(email, token).catch(console.error);

    return NextResponse.json(
      { message: 'Account created. Please check your email to verify.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
