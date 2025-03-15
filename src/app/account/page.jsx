import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import AccountClient from './AccountClient';

async function getUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export default async function AccountPage() {
  const user = await getUser();
  if (user) {
    redirect('/dashboard');
  }
  return <AccountClient />;
}