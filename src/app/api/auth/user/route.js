// src/app/api/auth/user/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(req) {
  const token = req.headers.get('x-token') || req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 200 });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}