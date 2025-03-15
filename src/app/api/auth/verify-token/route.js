import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    //console.log('Verified user:', user);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}