// src/app/account/settings/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Alert, Avatar, Select, MenuItem } from '@mui/material';
import Cookies from 'js-cookie';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [avatar, setAvatar] = useState('F1');
  const [alert, setAlert] = useState({ message: '', severity: '' });

  const avatarOptions = [
    { value: 'F1', src: '/images/logos/F1.png' },
    { value: 'Ferrari', src: '/images/logos/Ferrari.png' },
    { value: 'Mercedes', src: '/images/logos/Mercedes.png' },
    { value: 'Red Bull', src: '/images/logos/Red Bull.png' },
  ];

  useEffect(() => {
    const userData = Cookies.get('user') ? JSON.parse(Cookies.get('user')) : null;
    setUser(userData);
    if (userData?.avatar) setAvatar(userData.avatar);
  }, []);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setAlert({ message: 'New passwords do not match', severity: 'error' });
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
      });
      const data = await res.json();
      setAlert({ message: data.message, severity: res.ok ? 'success' : 'error' });
    } catch (error) {
      setAlert({ message: 'Password reset failed', severity: 'error' });
    }
  };

  const handleChangeEmail = async () => {
    try {
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newEmail }),
      });
      const data = await res.json();
      setAlert({ message: data.message, severity: res.ok ? 'success' : 'error' });
    } catch (error) {
      setAlert({ message: 'Email change failed', severity: 'error' });
    }
  };

  const handleChangeUsername = async () => {
    try {
      const res = await fetch('/api/auth/change-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newUsername }),
      });
      const data = await res.json();
      if (res.ok) {
        Cookies.set('user', JSON.stringify({ ...user, username: newUsername }), { expires: 1 });
        setUser({ ...user, username: newUsername });
      }
      setAlert({ message: data.message, severity: res.ok ? 'success' : 'error' });
    } catch (error) {
      setAlert({ message: 'Username change failed', severity: 'error' });
    }
  };

  const handleChangeAvatar = async (event) => {
    const newAvatar = event.target.value;
    try {
      const res = await fetch('/api/auth/change-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, avatar: newAvatar }),
      });
      const data = await res.json();
      if (res.ok) {
        setAvatar(newAvatar);
        Cookies.set('user', JSON.stringify({ ...user, avatar: newAvatar }), { expires: 1 });
        setUser({ ...user, avatar: newAvatar });
      }
      setAlert({ message: data.message, severity: res.ok ? 'success' : 'error' });
    } catch (error) {
      setAlert({ message: 'Avatar change failed', severity: 'error' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account?')) return;
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        Cookies.remove('user');
        window.location.href = '/';
      }
      setAlert({ message: data.message, severity: res.ok ? 'success' : 'error' });
    } catch (error) {
      setAlert({ message: 'Account deletion failed', severity: 'error' });
    }
  };

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
        Account Settings
      </Typography>
      <Box
        sx={{
          border: '1px solid #444',
          borderRadius: 1,
          p: 3,
          width: 500,
          backgroundColor: '#0a0e27',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {alert.message && (
          <Alert
            severity={alert.severity}
            sx={{ color: 'white', backgroundColor: alert.severity === 'success' ? '#1b5e20' : '#b71c1c' }}
          >
            {alert.message}
          </Alert>
        )}

        {/* Reset Password */}
        <Typography variant="h6" sx={{ mb: 1 }}>Reset Password</Typography>
        <TextField
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          sx={{
            input: { color: 'white' },
            label: { color: 'white' },
            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } },
          }}
        />
        <TextField
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          sx={{
            input: { color: 'white' },
            label: { color: 'white' },
            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } },
          }}
        />
        <TextField
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          sx={{
            input: { color: 'white' },
            label: { color: 'white' },
            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button onClick={handleResetPassword} variant="contained" sx={{ py: 1, px: 3, backgroundColor: '#00A0F0' }}>
            Reset Password
          </Button>
        </Box>

        {/* Change Email */}
        <Typography variant="h6" sx={{ mb: 1 }}>Change Email</Typography>
        <TextField
          label="New Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          sx={{
            input: { color: 'white' },
            label: { color: 'white' },
            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button onClick={handleChangeEmail} variant="contained" sx={{ py: 1, px: 3, backgroundColor: '#00A0F0' }}>
            Change Email
          </Button>
        </Box>

        {/* Change Username */}
        <Typography variant="h6" sx={{ mb: 1 }}>Change Username</Typography>
        <TextField
          label="New Username"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          sx={{
            input: { color: 'white' },
            label: { color: 'white' },
            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' } },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button onClick={handleChangeUsername} variant="contained" sx={{ py: 1, px: 3, backgroundColor: '#00A0F0' }}>
            Change Username
          </Button>
        </Box>

        {/* Change Avatar */}
        <Typography variant="h6" sx={{ mb: 1 }}>Change Avatar</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={avatarOptions.find(opt => opt.value === avatar)?.src} sx={{ width: 40, height: 40 }} imgProps={{ style: { objectFit: 'contain' } }} />
          <Select
            value={avatar}
            onChange={handleChangeAvatar}
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00A0F0' },
              flexGrow: 1,
            }}
          >
            {avatarOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.value}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Delete Account */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button onClick={handleDeleteAccount} variant="contained" color="error" sx={{ py: 1, px: 3 }}>
            Delete Account
          </Button>
        </Box>
      </Box>
    </Box>
  );
}