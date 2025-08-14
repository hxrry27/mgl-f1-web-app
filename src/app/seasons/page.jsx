import { redirect } from 'next/navigation';
import pool from '@/lib/db';

async function getMostRecentSeason() {
  try {
    const seasonsRes = await pool.query('SELECT season FROM seasons ORDER BY CAST(season AS INTEGER) DESC LIMIT 1');
    return seasonsRes.rows[0]?.season || '11';
  } catch (error) {
    console.error('Error fetching most recent season:', error);
    return '11'; // Fallback to season 11
  }
}

export default async function SeasonsIndexPage() {
  const mostRecentSeason = await getMostRecentSeason();
  redirect(`/seasons/${mostRecentSeason}`);
}