import { redirect } from 'next/navigation';

export default async function SeasonStandingsRedirect({ params }) {
  const { season } = await params;
  redirect(`/seasons/${season}`);
}