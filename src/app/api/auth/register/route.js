import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { serialize } from 'cookie';
import { NextResponse } from 'next/server';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Use env vars
    pass: process.env.EMAIL_PASS, // 16-char app password
  },
});

transporter.verify((error, success) => {
  if (error) console.error('SMTP Error:', error);
  else console.log('SMTP Ready');
});

export async function POST(req) {
  const { username, email, password, captchaToken } = await req.json();

  if (!username || !email || !password || !captchaToken) {
    return NextResponse.json({ message: 'Missing required fields or CAPTCHA' }, { status: 400 });
  }
  if (!email.includes('@') || !email.includes('.') || email.length < 5) {
    return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
  }

  // Verify CAPTCHA
  const captchaRes = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
    { method: 'POST' }
  );
  const { success, score } = await captchaRes.json();
  if (!success || score < 0.5) {
    return NextResponse.json({ message: 'CAPTCHA verification failed' }, { status: 400 });
  }

  //console.log('CAPTCHA Response:', { success, score });

  try {
    const checkRes = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (checkRes.rows.length > 0) {
      return NextResponse.json({ message: 'Email or username already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const res = await pool.query(
      'INSERT INTO users (username, email, password, role, verification_token, is_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [username, email, hashedPassword, email === 'hxrry27' ? 'admin' : 'user', verificationToken, false]
    );

    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify?token=${verificationToken}`;
    await transporter.sendMail({
      from: '"MGL F1" <info@mglf1.co.uk>',
      to: email,
      subject: 'Verify Your MGL F1 Account',
      html: `
        <p>Hi ${username},</p>
        <p>Thanks for signing up to MGL F1. Please verify your email:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #00A0F0; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>The MGL F1 Team</p>
      `,
    });

    return NextResponse.json({ message: 'Registration successful—please verify your email' }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Registration failed due to server error' }, { status: 500 });
  }
}