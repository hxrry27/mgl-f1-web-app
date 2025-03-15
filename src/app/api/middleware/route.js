import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export function authMiddleware(handler) {
  return async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1] || Cookies.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return handler(req);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
}