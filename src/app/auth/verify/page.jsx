'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`/api/auth/verify?token=${token}`)
        .then(res => res.json())
        .then(data => {
          setMessage(data.message);
          setSeverity(data.message.includes('failed') ? 'error' : 'success');
          setLoading(false);
        })
        .catch(error => {
          console.error('Verification fetch error:', error);
          setMessage('Verification failed due to server error');
          setSeverity('error');
          setLoading(false);
        });
    }
  }, [token]);

  return (
    <Box
      sx={{
        border: '1px solid #444',
        borderRadius: 1,
        p: 3,
        width: 'fit-content',
        maxWidth: '400px',
        backgroundColor: '#0a0e27',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100px',
      }}
    >
      {loading ? (
        <CircularProgress sx={{ color: '#00A0F0' }} />
      ) : (
        <Alert
          severity={severity}
          sx={{ color: 'white', backgroundColor: severity === 'success' ? '#1b5e20' : '#b71c1c' }}
        >
          {message}
        </Alert>
      )}
    </Box>
  );
}

export default function VerifyPage() {
  return (
    <Box
      sx={{
        pt: 15,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: 'white',
        minHeight: '100vh',
        backgroundColor: '#0a0e27',
      }}
    >
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Verify Your Account
      </Typography>
      <Suspense fallback={<CircularProgress sx={{ color: '#00A0F0' }} />}>
        <VerifyContent />
      </Suspense>
    </Box>
  );
}