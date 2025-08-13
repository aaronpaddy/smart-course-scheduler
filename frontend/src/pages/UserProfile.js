import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Avatar,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { userAPI } from '../services/api';

const UserProfile = () => {
  const userId = 1; // Default user ID
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loadingData, setLoadingData] = useState(true);

  // Simple test version - just show basic info
  useEffect(() => {
    console.log('UserProfile: Component mounted');
    
    // Create default user data immediately
    const defaultUser = {
      id: userId,
      username: 'Student',
      email: 'student@university.edu',
      major: 'Computer Science',
      graduation_year: 2026,
      preferences: {
        preferred_times: ['Morning', 'Afternoon'],
        preferred_departments: ['Computer Science', 'Mathematics'],
        max_credits_per_semester: 18,
        avoid_early_morning: false,
        prefer_online_courses: false,
      }
    };
    
    setUser(defaultUser);
    setFormData({
      username: defaultUser.username,
      email: defaultUser.email,
      major: defaultUser.major,
      graduation_year: defaultUser.graduation_year,
      preferred_times: defaultUser.preferences.preferred_times,
      preferred_departments: defaultUser.preferences.preferred_departments,
      max_credits_per_semester: defaultUser.preferences.max_credits_per_semester,
      avoid_early_morning: defaultUser.preferences.avoid_early_morning,
      prefer_online_courses: defaultUser.preferences.prefer_online_courses,
    });
    setLoadingData(false);
    
    // Try to load from backend in background
    const loadFromBackend = async () => {
      try {
        console.log('UserProfile: Attempting to load from backend...');
        const [userResponse, preferencesResponse] = await Promise.all([
          userAPI.getUser(userId),
          userAPI.getUserPreferences(userId)
        ]);
        
        console.log('UserProfile: Backend responses:', { userResponse, preferencesResponse });
        
        if (userResponse.data && preferencesResponse.data.preferences) {
          const backendUser = userResponse.data;
          const backendPrefs = preferencesResponse.data.preferences;
          
          const combinedUser = {
            ...backendUser,
            preferences: backendPrefs
          };
          
          setUser(combinedUser);
          setFormData({
            username: backendUser.username || 'Student',
            email: backendUser.email || 'student@university.edu',
            major: backendUser.major || 'Computer Science',
            graduation_year: backendUser.graduation_year || 2026,
            preferred_times: backendPrefs.preferred_times || ['Morning', 'Afternoon'],
            preferred_departments: backendPrefs.preferred_departments || ['Computer Science', 'Mathematics'],
            max_credits_per_semester: backendPrefs.max_credits_per_semester || 18,
            avoid_early_morning: backendPrefs.avoid_early_morning || false,
            prefer_online_courses: backendPrefs.prefer_online_courses || false,
          });
          
          // Save to localStorage
          localStorage.setItem(`user_data_${userId}`, JSON.stringify(backendUser));
          localStorage.setItem(`user_preferences_${userId}`, JSON.stringify(backendPrefs));
        }
      } catch (backendErr) {
        console.log('UserProfile: Backend load failed:', backendErr);
      }
    };
    
    loadFromBackend();
  }, [userId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Update user data
      const updatedUser = {
        ...user,
        username: formData.username,
        email: formData.email,
        major: formData.major,
        graduation_year: formData.graduation_year,
        preferences: {
          preferred_times: formData.preferred_times,
          preferred_departments: formData.preferred_departments,
          max_credits_per_semester: formData.max_credits_per_semester,
          avoid_early_morning: formData.avoid_early_morning,
          prefer_online_courses: formData.prefer_online_courses,
        },
      };

      // Save to localStorage immediately for persistence
      localStorage.setItem(`user_data_${userId}`, JSON.stringify({
        username: formData.username,
        email: formData.email,
        major: formData.major,
        graduation_year: formData.graduation_year,
      }));
      
      // Save preferences in the format expected by ScheduleGenerator
      const scheduleGeneratorPrefs = {
        completed_courses: [], // Will be populated by ScheduleGenerator
        preferred_departments: formData.preferred_departments,
        preferred_times: formData.preferred_times,
        max_credits_per_semester: formData.max_credits_per_semester,
        avoid_early_morning: formData.avoid_early_morning,
        prefer_online_courses: formData.prefer_online_courses,
        _lastModified: Date.now(),
        _source: 'userprofile'
      };
      
      localStorage.setItem(`user_preferences_${userId}`, JSON.stringify(scheduleGeneratorPrefs));

      // Save to backend
      try {
        await userAPI.updateUser(userId, updatedUser);
        await userAPI.updateUserPreferences(userId, updatedUser.preferences);
        setUser(updatedUser);
        setIsEditing(false);
        setSuccess('Profile updated successfully!');
      } catch (apiErr) {
        // If backend fails, still update local state
        setUser(updatedUser);
        setIsEditing(false);
        setSuccess('Profile updated locally! (Backend sync failed)');
        console.error('Backend update failed:', apiErr);
      }
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user.username,
      email: user.email,
      major: user.major,
      graduation_year: user.graduation_year,
      preferred_times: user.preferences.preferred_times,
      preferred_departments: user.preferences.preferred_departments,
      max_credits_per_semester: user.preferences.max_credits_per_semester,
      avoid_early_morning: user.preferences.avoid_early_morning,
      prefer_online_courses: user.preferences.prefer_online_courses,
    });
    setIsEditing(false);
  };

  const majors = [
    'Computer Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Engineering',
    'Business',
    'Psychology',
    'English',
    'History',
  ];

  const timePreferences = [
    'Early Morning (8:00-10:00)',
    'Morning (10:00-12:00)',
    'Afternoon (12:00-3:00)',
    'Late Afternoon (3:00-5:00)',
    'Evening (5:00-7:00)',
  ];

  const departments = [
    'Computer Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Engineering',
    'Business',
    'Psychology',
    'English',
    'History',
    'Philosophy',
    'Economics',
  ];

  // Show loading state while data is being loaded
  if (loadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Typography variant="h6" color="text.secondary">
          Loading user profile...
        </Typography>
      </Box>
    );
  }

  // Show error state if no user data
  if (!user) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          User Profile
        </Typography>
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load user profile. Please refresh the page or check your connection.
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry Loading
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        User Profile
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

      <Grid container spacing={3}>
        {/* Profile Overview */}
        <Grid xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                }}
              >
                <PersonIcon sx={{ fontSize: 50 }} />
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user.email}
              </Typography>
              <Chip
                label={user.major}
                color="primary"
                variant="outlined"
                sx={{ mt: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Expected Graduation: {user.graduation_year}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Details */}
        <Grid xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Personal Information
                </Typography>
                <Button
                  variant={isEditing ? "outlined" : "contained"}
                  startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
                  onClick={isEditing ? handleSave : () => setIsEditing(true)}
                  disabled={loading}
                >
                  {isEditing ? (loading ? 'Saving...' : 'Save Changes') : 'Edit Profile'}
                </Button>
              </Box>

              <Grid container spacing={3}>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={formData.username || ''}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Major</InputLabel>
                    <Select
                      value={formData.major || ''}
                      label="Major"
                      onChange={(e) => handleInputChange('major', e.target.value)}
                      disabled={!isEditing}
                    >
                      {majors.map((major) => (
                        <MenuItem key={major} value={major}>
                          {major}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Graduation Year"
                    type="number"
                    value={formData.graduation_year || ''}
                    onChange={(e) => handleInputChange('graduation_year', parseInt(e.target.value))}
                    disabled={!isEditing}
                    inputProps={{ min: 2024, max: 2030 }}
                  />
                </Grid>
              </Grid>

              {isEditing && (
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Scheduling Preferences */}
        <Grid xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Scheduling Preferences
              </Typography>

              <Grid container spacing={3}>
                <Grid xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Preferred Times</InputLabel>
                    <Select
                      multiple
                      value={formData.preferred_times || []}
                      label="Preferred Times"
                      onChange={(e) => handleInputChange('preferred_times', e.target.value)}
                      disabled={!isEditing}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {timePreferences.map((time) => (
                        <MenuItem key={time} value={time}>
                          {time}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Preferred Departments</InputLabel>
                    <Select
                      multiple
                      value={formData.preferred_departments || []}
                      label="Preferred Departments"
                      onChange={(e) => handleInputChange('preferred_departments', e.target.value)}
                      disabled={!isEditing}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {departments.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Credits per Semester"
                    type="number"
                    value={formData.max_credits_per_semester || 18}
                    onChange={(e) => handleInputChange('max_credits_per_semester', parseInt(e.target.value))}
                    disabled={!isEditing}
                    inputProps={{ min: 12, max: 24 }}
                    helperText="Recommended: 15-18 credits"
                  />
                </Grid>

                <Grid xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.avoid_early_morning || false}
                          onChange={(e) => handleInputChange('avoid_early_morning', e.target.checked)}
                          disabled={!isEditing}
                        />
                      }
                      label="Avoid Early Morning Classes (Before 9:00 AM)"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.prefer_online_courses || false}
                          onChange={(e) => handleInputChange('prefer_online_courses', e.target.checked)}
                          disabled={!isEditing}
                        />
                      }
                      label="Prefer Online Courses"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


    </Box>
  );
};

export default UserProfile; 