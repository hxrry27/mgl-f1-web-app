import { redirect } from 'next/navigation';

export default function StandingsRedirect() {
  redirect('/seasons/overall');
}