import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  SmartToy as SmartToyIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { scheduleAPI, userAPI } from '../services/api';

const ScheduleGenerator = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    semester: 'Spring',
    year: 2025,
    max_credits: 18,
    user_id: 1, // Default user ID
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  // Load user preferences on component mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        setLoadingPreferences(true);
        
        // Test localStorage functionality first
        const testKey = 'test_localStorage';
        try {
          localStorage.setItem(testKey, 'test_value');
          const testValue = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          console.log('localStorage test:', testValue === 'test_value' ? '✅ Working' : '❌ Failed');
        } catch (localStorageErr) {
          console.error('localStorage not available:', localStorageErr);
        }
        
        // First try to load from localStorage
        const savedPreferences = localStorage.getItem(`user_preferences_${formData.user_id}`);
        console.log('Loading from localStorage:', savedPreferences);
        if (savedPreferences) {
          try {
            const parsed = JSON.parse(savedPreferences);
            console.log('Parsed localStorage preferences:', parsed);
            setUserPreferences(parsed);
          } catch (parseErr) {
            console.error('Failed to parse localStorage preferences:', parseErr);
            localStorage.removeItem(`user_preferences_${formData.user_id}`);
          }
        }
        
        // Then try to load from backend, but don't override if we have local changes
        try {
          const response = await userAPI.getUserPreferences(formData.user_id);
          if (response.data.preferences) {
            const backendPreferences = response.data.preferences;
            console.log('Backend preferences:', backendPreferences);
            
            // Only update if we don't have local preferences or if they're identical
            const localPreferences = localStorage.getItem(`user_preferences_${formData.user_id}`);
            if (!localPreferences || localPreferences === JSON.stringify(backendPreferences)) {
              console.log('Updating with backend preferences');
              setUserPreferences(backendPreferences);
              localStorage.setItem(`user_preferences_${formData.user_id}`, JSON.stringify(backendPreferences));
            } else {
              console.log('Keeping local preferences, backend has different data');
              console.log('Local:', localPreferences);
              console.log('Backend:', JSON.stringify(backendPreferences));
            }
          }
        } catch (backendErr) {
          console.log('Backend preferences load failed, keeping local data:', backendErr);
        }
      } catch (err) {
        console.error('Failed to load user preferences:', err);
        // Try to load from localStorage as fallback
        const savedPreferences = localStorage.getItem(`user_preferences_${formData.user_id}`);
        if (savedPreferences) {
          try {
            setUserPreferences(JSON.parse(savedPreferences));
          } catch (parseErr) {
            console.error('Failed to parse fallback preferences:', parseErr);
          }
        } else {
          // Set default preferences if none exist anywhere
          const defaultPreferences = {
            completed_courses: ['CS101', 'MATH101', 'ENG101'],
            preferred_departments: ['CS', 'MATH'],
            preferred_times: ['morning', 'afternoon']
          };
          setUserPreferences(defaultPreferences);
          try {
            localStorage.setItem(`user_preferences_${formData.user_id}`, JSON.stringify(defaultPreferences));
          } catch (localStorageErr) {
            console.error('Failed to save default preferences to localStorage:', localStorageErr);
          }
        }
      } finally {
        setLoadingPreferences(false);
      }
    };

    loadUserPreferences();
  }, [formData.user_id]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferenceChange = async (field, value) => {
    if (!userPreferences) return;
    
    const updatedPreferences = {
      ...userPreferences,
      [field]: value,
      _lastModified: Date.now(),
      _source: 'local'
    };
    
    console.log('Updating preferences:', field, value);
    console.log('New preferences:', updatedPreferences);
    
    // Update local state and localStorage immediately for better UX
    setUserPreferences(updatedPreferences);
    localStorage.setItem(`user_preferences_${formData.user_id}`, JSON.stringify(updatedPreferences));
    
    console.log('Saved to localStorage:', localStorage.getItem(`user_preferences_${formData.user_id}`));
    
    try {
      await userAPI.updateUserPreferences(formData.user_id, updatedPreferences);
      console.log('Successfully updated preferences on backend');
    } catch (err) {
      console.error('Failed to update preferences on backend:', err);
      // Don't revert - keep local changes even if backend fails
      console.log('Keeping local changes despite backend failure');
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await scheduleAPI.generateSchedule(formData);
      
      const action = response.data.action || 'generated';
      setSuccess(`Schedule ${action} successfully! Schedule ID: ${response.data.schedule_id}`);
      
      // Navigate to the schedule after a short delay
      setTimeout(() => {
        navigate(`/schedule/${response.data.schedule_id}`);
      }, 2000);
      
    } catch (err) {
      setError('Failed to generate schedule. Please try again.');
      console.error('Schedule generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Generate New Schedule
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Card sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SmartToyIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Typography variant="h5" fontWeight="bold">
              Smart Schedule Generation
            </Typography>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Our AI will analyze your preferences and degree requirements to create an optimal course schedule for you.
          </Typography>

          <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Current User: User ID {formData.user_id}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your preferences and completed courses will be considered when generating the schedule.
            </Typography>
            
            {loadingPreferences ? (
              <LinearProgress sx={{ mb: 2 }} />
            ) : userPreferences ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Completed Courses:
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={userPreferences.completed_courses?.join(', ') || ''}
                    onChange={(e) => handlePreferenceChange('completed_courses', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                    placeholder="CS101, MATH101, ENG101"
                    helperText="Enter course codes separated by commas"
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Preferred Departments:
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={userPreferences.preferred_departments?.join(', ') || ''}
                    onChange={(e) => handlePreferenceChange('preferred_departments', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                    placeholder="CS, MATH, ENG"
                    helperText="Enter department codes separated by commas"
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Preferred Times:
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={userPreferences.preferred_times?.join(', ') || ''}
                    onChange={(e) => handlePreferenceChange('preferred_times', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                    placeholder="morning, afternoon, evening"
                    helperText="Enter time preferences separated by commas"
                  />
                </Box>
                
                <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="success.contrastText">
                    💡 Your preferences are automatically saved as you type and will be considered when generating schedules!
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        localStorage.removeItem(`user_preferences_${formData.user_id}`);
                        window.location.reload();
                      }}
                    >
                      Reset to Default
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={async () => {
                        try {
                          const response = await userAPI.getUserPreferences(formData.user_id);
                          if (response.data.preferences) {
                            const backendPrefs = response.data.preferences;
                            backendPrefs._source = 'backend';
                            backendPrefs._lastModified = Date.now();
                            setUserPreferences(backendPrefs);
                            localStorage.setItem(`user_preferences_${formData.user_id}`, JSON.stringify(backendPrefs));
                            console.log('Synced with backend preferences');
                          }
                        } catch (err) {
                          console.error('Failed to sync with backend:', err);
                        }
                      }}
                    >
                      Sync with Backend
                    </Button>
                  </Box>
                </Box>
                

              </Box>
            ) : (
              <Typography variant="body2" color="error">
                Failed to load user preferences
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Semester</InputLabel>
              <Select
                value={formData.semester}
                label="Semester"
                onChange={(e) => handleInputChange('semester', e.target.value)}
              >
                <MenuItem value="Fall">Fall</MenuItem>
                <MenuItem value="Spring">Spring</MenuItem>
                <MenuItem value="Summer">Summer</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Year"
              type="number"
              value={formData.year}
              onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
              inputProps={{ min: 2024, max: 2030 }}
            />

            <TextField
              fullWidth
              label="Maximum Credits"
              type="number"
              value={formData.max_credits}
              onChange={(e) => handleInputChange('max_credits', parseInt(e.target.value))}
              inputProps={{ min: 12, max: 24 }}
              helperText="Recommended: 15-18 credits per semester"
            />
          </Box>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SmartToyIcon />}
              onClick={handleGenerate}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Generating...' : 'Generate Schedule'}
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<SchoolIcon />}
              onClick={() => navigate('/courses')}
              fullWidth
            >
              Browse Courses
            </Button>
          </Box>

          {loading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Analyzing course availability and your preferences...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            How It Works
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Analyzes your degree requirements and completed courses
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Checks course availability and prerequisites
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Avoids scheduling conflicts and optimizes for your preferences
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Ensures you stay on track for graduation
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ScheduleGenerator; 