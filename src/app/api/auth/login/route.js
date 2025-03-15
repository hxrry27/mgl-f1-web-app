import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { NextResponse } from 'next/server';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

export async function POST(req) {
  const { identifier, password } = await req.json();
  if (!identifier || !password) {
    return NextResponse.json({ message: 'Missing identifier or password' }, { status: 400 });
  }

  try {
    const res = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [identifier]);
    const user = res.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }
    if (!user.is_verified) {
      return NextResponse.json({ message: 'Please verify your email before logging in' }, { status: 403 });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const cookie = serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400,
      path: '/',
      sameSite: 'strict',
    });

    //console.log('Setting token cookie'); // No token logged for security

    return NextResponse.json(
      { message: 'Login successful', userId: user.id, username: user.username, role: user.role },
      { status: 200, headers: { 'Set-Cookie': cookie } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}