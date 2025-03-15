'use client'; // Mark this as a Client Component

import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, TextField, Button, Select, MenuItem } from '@mui/material';
import { useState, useEffect } from 'react';

export default function AdminRaceResultsPage({ params }) {
  const { season, race } = params;
  const [results, setResults] = useState([]);
  const [raceName, setRaceName] = useState('');
  const [error, setError] = useState(null);

  // Fetch results on mount
  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/admin/results?season=${season}&race=${race}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results);
      setRaceName(data.raceName);
      setError(null);
    } catch (err) {
      console.error('Error fetching race results:', err);
      setRaceName(race.replace(/-/g, ' '));
      setResults([]);
      setError('Failed to load results');
    }
  };

  const handlePositionChange = (id, value) => {
    setResults((prev) =>
      prev.map((result) =>
        result.id === id ? { ...result, adjusted_position: value } : result
      )
    );
  };

  const handlePenaltyChange = (id, value) => {
    setResults((prev) =>
      prev.map((result) =>
        result.id === id ? { ...result, post_race_penalty_secs: value } : result
      )
    );
  };

  const handleStatusChange = (id, value) => {
    setResults((prev) =>
      prev.map((result) =>
        result.id === id ? { ...result, status: value } : result
      )
    );
  };

  const saveChanges = async () => {
    try {
      const res = await fetch('/api/admin/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert('Changes saved successfully!');
      fetchResults(); // Refresh results after saving
    } catch (err) {
      console.error('Error saving changes:', err);
      alert('Failed to save changes');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', pb: 20, pt: 20, overflowX: 'hidden' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
        {raceName} - Season {season} (Admin)
      </Typography>

      {error ? (
        <Typography sx={{ color: 'white' }}>{error}</Typography>
      ) : (
        <Box sx={{ border: '1px solid #444', p: 1, borderRadius: 1, width: 'fit-content', maxWidth: '100%', backgroundColor: '#0a0e27', overflowX: 'auto' }}>
          <Table sx={{ color: 'white', tableLayout: 'fixed', width: '1100px' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '60px', fontWeight: 'bold' }}>Pos</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '180px', fontWeight: 'bold' }}>Driver</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '140px', fontWeight: 'bold' }}>Team</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Adjusted Pos</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Post-Race Penalty</TableCell>
                <TableCell sx={{ color: 'white', borderColor: '#444', width: '100px', fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.position}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.driver}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>{result.team}</TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                    <TextField
                      type="number"
                      value={result.adjusted_position || result.position}
                      onChange={(e) => handlePositionChange(result.id, e.target.value)}
                      size="small"
                      sx={{
                        width: '80px',
                        '& .MuiInputBase-root': {
                          color: 'white', // Text color
                        },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: '#666', // Outline color
                          },
                          '&:hover fieldset': {
                            borderColor: '#888', // Outline color on hover
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#00A0F0', // Outline color when focused
                          },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                    <TextField
                      type="number"
                      value={result.post_race_penalty_secs || 0}
                      onChange={(e) => handlePenaltyChange(result.id, e.target.value)}
                      size="small"
                      sx={{
                        width: '80px',
                        '& .MuiInputBase-root': {
                          color: 'white', // Text color
                        },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: '#666', // Outline color
                          },
                          '&:hover fieldset': {
                            borderColor: '#888', // Outline color on hover
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#00A0F0', // Outline color when focused
                          },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'white', borderColor: '#444' }}>
                    <TextField
                      value={result.status || ''}
                      onChange={(e) => handleStatusChange(result.id, e.target.value)}
                      size="small"
                      sx={{
                        width: '120px',
                        '& .MuiInputBase-root': {
                          color: 'white', // Text color
                        },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: '#666', // Outline color
                          },
                          '&:hover fieldset': {
                            borderColor: '#888', // Outline color on hover
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#00A0F0', // Outline color when focused
                          },
                        },
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Button variant="contained" onClick={saveChanges} sx={{ mt: 2 }}>
        Save Changes
      </Button>
    </Box>
  );
}