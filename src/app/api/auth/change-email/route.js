import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });

const transporter = nodemailer.createTransport({
  service: 'gmail', // Simplified Gmail setup
  auth: {
    user: 'info.mglf1@gmail.com', // Replace with your Gmail
    pass: 'lyihusemiamptbel ',  // Replace with the 16-character app password (no spaces)
  },
});

export async function POST(req) {
  const { userId, newEmail } = await req.json();

  try {
    const res = await pool.query('SELECT username, email FROM users WHERE id = $1', [userId]);
    const user = res.rows[0];
    const token = crypto.randomBytes(32).toString('hex');

    await pool.query('UPDATE users SET verification_token = $1 WHERE id = $2', [token, userId]);
    const verificationUrl = `http://localhost:3000/auth/verify-email?token=${token}&email=${newEmail}`;

    await transporter.sendMail({
      from: '"MGL F1" <info@mglf1.co.uk>',
      to: user.email,
      subject: 'Verify Your New Email - MGL F1',
      html: `
        <p>Hi ${user.username},</p>
        <p>Please verify your new email (${newEmail}) by clicking below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #00A0F0; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>The MGL F1 Team</p>
      `,
    });

    return new Response(JSON.stringify({ message: 'Verification email sent—check your inbox' }), { status: 200 });
  } catch (error) {
    console.error('Change email error:', error);
    return new Response(JSON.stringify({ message: 'Email change failed' }), { status: 500 });
  }
}