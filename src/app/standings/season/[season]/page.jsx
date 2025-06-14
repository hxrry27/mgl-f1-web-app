import { redirect } from 'next/navigation';

export default function SeasonStandingsRedirect({ params }) {
  const { season } = params;
  redirect(`/seasons/${season}`);
}