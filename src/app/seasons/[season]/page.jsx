import * as React from 'react';
import { Container, Typography } from '@mui/material';

export default async function SeasonPage({ params }) {
  
  const { season } = params;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Season {season}
      </Typography>
      <Typography variant="body1">
        This is placeholder content for Season {season}. Data such as the race calendar, race results, lineups, standings, and penalties for Season {season} will be displayed here.
      </Typography>
    </Container>
  );
}
