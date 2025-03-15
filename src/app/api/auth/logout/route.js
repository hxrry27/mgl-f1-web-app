// src/app/api/auth/logout/route.js
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST(req) {
  const cookie = serialize('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: -1, // Expire immediately
    path: '/',
    sameSite: 'strict',
  });
  return NextResponse.json({ message: 'Logged out' }, { status: 200, headers: { 'Set-Cookie': cookie } });
}