// src/app/account/AccountClient.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, TextField, Button, Tabs, Tab, Alert } from '@mui/material';

export default function AccountClient() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [alert, setAlert] = useState({ message: '', severity: '' });

  useEffect(() => {
    const loadRecaptcha = () => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        window.grecaptcha.ready(() => {
          if (tabValue === 1) {
            window.grecaptcha
              .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'register' })
              .then((token) => {
                setCaptchaToken(token);
                //console.log('reCAPTCHA Token:', token);
              });
          }
        });
      };
    };
    loadRecaptcha();
  }, [tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setAlert({ message: '', severity: '' });
    setCaptchaToken(null);
    if (newValue === 1) {
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'register' })
          .then((token) => setCaptchaToken(token));
      });
    }
  };

  const handleRegister = async () => {
    if (tabValue === 1 && !captchaToken) {
      setAlert({ message: 'reCAPTCHA not ready—please wait', severity: 'error' });
      return;
    }
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, captchaToken }),
    });
    const data = await res.json();
    setAlert({ message: data.message, severity: res.ok ? 'success' : 'error' });
    if (res.ok) setTimeout(() => router.push('/account'), 2000);
  };

  const handleLogin = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: username || email, password }),
    });
    const data = await res.json();
    //console.log('Login response:', data);
    setAlert({ message: data.message, severity: res.ok ? 'success' : 'error' });
    if (res.ok) {
      router.push('/dashboard');
    }
  };

  return (
    <Box sx={{ pt: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', minHeight: '100vh', backgroundColor: '#0a0e27' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Account</Typography>
      <Box sx={{ border: '1px solid #444', borderRadius: 1, p: 3, width: 'fit-content', maxWidth: '400px', backgroundColor: '#0a0e27', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2, '& .MuiTabs-indicator': { backgroundColor: '#00A0F0' }, '& .MuiTab-root': { color: 'white' }, '& .Mui-selected': { color: '#00A0F0' } }}>
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>
        {tabValue === 1 && (
          <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ input: { color: 'white' }, label: { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } } }} />
        )}
        <TextField label={tabValue === 0 ? 'Username or Email' : 'Email'} value={email} onChange={(e) => setEmail(e.target.value)} sx={{ input: { color: 'white' }, label: { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } } }} />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ input: { color: 'white' }, label: { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } } }} />
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button onClick={tabValue === 0 ? handleLogin : handleRegister} variant="contained" sx={{ py: 1, px: 3, backgroundColor: '#00A0F0' }} disabled={tabValue === 1 && !captchaToken}>
            {tabValue === 0 ? 'Login' : 'Register'}
          </Button>
        </Box>
        {alert.message && (
          <Alert severity={alert.severity} sx={{ color: 'white', backgroundColor: alert.severity === 'success' ? '#1b5e20' : '#b71c1c' }}>
            {alert.message}
          </Alert>
        )}
      </Box>
    </Box>
  );
}