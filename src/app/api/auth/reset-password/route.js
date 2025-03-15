import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

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
  const { userId, currentPassword, newPassword } = await req.json();

  try {
    const res = await pool.query('SELECT username, email, password FROM users WHERE id = $1', [userId]);
    const user = res.rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return new Response(JSON.stringify({ message: 'Invalid current password' }), { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    await transporter.sendMail({
      from: '"MGL F1" <info@mglf1.co.uk>',
      to: user.email,
      subject: 'Password Changed - MGL F1',
      html: `
        <p>Hi ${user.username},</p>
        <p>Your password has been changed. If this wasn’t you, please contact the MGL F1 Team.</p>
        <p>The MGL F1 Team</p>
      `,
    });

    return new Response(JSON.stringify({ message: 'Password reset successful' }), { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(JSON.stringify({ message: 'Password reset failed' }), { status: 500 });
  }
}