import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import DashboardClient from './DashboardClient';

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

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect('/account');
  }
  return <DashboardClient user={user} />;
}