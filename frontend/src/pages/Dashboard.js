import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Paper,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Book as BookIcon,
  Star as StarIcon,
  Launch as LaunchIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Storage as DatasetIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { userAPI, scheduleAPI } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const userId = 1; // Default user for now
  const [recentSchedules, setRecentSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
      const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user data
      try {
        // First try to load from localStorage
        const savedUserData = localStorage.getItem(`user_data_${userId}`);
        if (savedUserData) {
          setUserData(JSON.parse(savedUserData));
        }
        
        // Then try to load from backend (this will override localStorage if backend has newer data)
        const userResponse = await userAPI.getUser(userId);
        if (userResponse.data) {
          setUserData(userResponse.data);
          // Save to localStorage
          localStorage.setItem(`user_data_${userId}`, JSON.stringify(userResponse.data));
        }
      } catch (err) {
        console.error('Failed to load user data:', err);
        // Try to load from localStorage as fallback
        const savedUserData = localStorage.getItem(`user_data_${userId}`);
        if (savedUserData) {
          setUserData(JSON.parse(savedUserData));
        }
      }
      
      try {
          const schedulesResponse = await userAPI.getUserSchedules(userId);
          
          if (schedulesResponse.data && schedulesResponse.data.length > 0) {
            const schedulesWithDetails = await Promise.all(
              schedulesResponse.data.map(async (schedule) => {
                try {
                  const scheduleDetails = await scheduleAPI.getSchedule(schedule.id);
                  return scheduleDetails.data;
                } catch (err) {
                  console.error(`Error fetching schedule ${schedule.id}:`, err);
                  return schedule;
                }
              })
            );
            setRecentSchedules(schedulesWithDetails);
          }
        } catch (err) {
          console.error('Dashboard error:', err);
          // Don't set error, just show empty state
          setRecentSchedules([]);
        }
      } catch (err) {
        console.error('Dashboard error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    
    try {
      setDeleting(true);
      await scheduleAPI.deleteSchedule(scheduleToDelete.id);
      
      // Remove the deleted schedule from the local state
      setRecentSchedules(prev => prev.filter(s => s.id !== scheduleToDelete.id));
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch (err) {
      alert('Failed to delete schedule');
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (schedule) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const updateUserData = (newUserData) => {
    setUserData(newUserData);
    localStorage.setItem(`user_data_${userId}`, JSON.stringify(newUserData));
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Typography variant="h6" color="text.secondary">Loading dashboard...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Typography variant="h6" color="error">Error loading dashboard. Please refresh the page.</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* User Info Section */}
      {userData && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            mb: 5, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white', 
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.8,
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 70, 
                    height: 70, 
                    bgcolor: 'rgba(255,255,255,0.15)',
                    border: '3px solid rgba(255,255,255,0.3)',
                    mr: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                >
                  <PersonIcon sx={{ fontSize: 35, color: 'white' }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="700" gutterBottom sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    {userData.username || 'User'}
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 500, mb: 1 }}>
                    {userData.major || 'Major not set'}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9, fontWeight: 400 }}>
                    Graduation Year: {userData.graduation_year || 'Not set'}
                  </Typography>
                </Box>
              </Box>
              
              {userData.preferences && userData.preferences.preferred_departments && userData.preferences.preferred_departments.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Preferred Departments
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {userData.preferences.preferred_departments.map((dept, index) => (
                      <Chip
                        key={index}
                        label={dept}
                        sx={{
                          backgroundColor: 'white !important',
                          color: '#4a5568 !important',
                          border: '1px solid #e2e8f0 !important',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          '& .MuiChip-label': {
                            color: '#4a5568 !important',
                          },
                          '&:hover': {
                            backgroundColor: '#f7fafc !important',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                p: 3,
                bgcolor: 'rgba(255,255,255,0.12)',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.25)',
                minWidth: 140,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.18)',
                  transform: 'scale(1.02)',
                }
              }}>
                <ScheduleIcon sx={{ fontSize: 28, opacity: 0.9, mb: 1 }} />
                <Typography variant="h4" sx={{ opacity: 0.95, fontWeight: 700, lineHeight: 1 }}>
                  {recentSchedules.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, textAlign: 'center', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Active Schedules
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Hero Section */}
      <Paper 
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          color: 'white',
          p: 5,
          mb: 5,
          borderRadius: 3,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.5,
          }
        }}
      >
        <Typography variant="h3" fontWeight="600" gutterBottom sx={{ position: 'relative', zIndex: 1 }}>
          Welcome to Smart Course Scheduler
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 2, position: 'relative', zIndex: 1 }}>
          Your intelligent academic planning companion
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.8, maxWidth: '600px', mx: 'auto', position: 'relative', zIndex: 1 }}>
          Plan your academic journey with smart course recommendations, conflict-free scheduling, and personalized insights.
        </Typography>
        

      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.1)',
              zIndex: 1,
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon sx={{ fontSize: 32, mr: 2, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h3" fontWeight="600" sx={{ lineHeight: 1 }}>
                    {recentSchedules.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Active Schedules
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.1)',
              zIndex: 1,
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BookIcon sx={{ fontSize: 32, mr: 2, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h3" fontWeight="600" sx={{ lineHeight: 1 }}>
                    {recentSchedules.reduce((total, schedule) => total + (schedule.courses?.length || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Enrolled Courses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.1)',
              zIndex: 1,
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 32, mr: 2, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h3" fontWeight="600" sx={{ lineHeight: 1 }}>
                    {recentSchedules.reduce((total, schedule) => total + (schedule.total_credits || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Credits
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.1)',
              zIndex: 1,
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ fontSize: 32, mr: 2, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h3" fontWeight="600" sx={{ lineHeight: 1 }}>
                    1
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Active User
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress Section */}
      <Card sx={{ mb: 5, background: 'linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrendingUpIcon sx={{ mr: 2, fontSize: 28, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight="600" color="primary.main">
              Degree Progress
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress towards graduation
              </Typography>
              <Typography variant="body2" fontWeight="500" color="primary.main">
                {Math.min(100, Math.round((recentSchedules.reduce((total, schedule) => total + (schedule.total_credits || 0), 0) / 120) * 100))}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(100, Math.round((recentSchedules.reduce((total, schedule) => total + (schedule.total_credits || 0), 0) / 120) * 100))}
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)',
                  borderRadius: 4,
                }
              }} 
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {recentSchedules.reduce((total, schedule) => total + (schedule.total_credits || 0), 0)} of 120 credits completed
          </Typography>
        </CardContent>
      </Card>

      {/* My Schedules Section */}
      <Card sx={{ mb: 5, border: '1px solid', borderColor: 'grey.200' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarIcon sx={{ mr: 2, fontSize: 28, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight="600" color="primary.main">
                My Schedules
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => navigate('/generate')}
              sx={{
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 16px rgba(52, 152, 219, 0.4)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Generate New Schedule
            </Button>
          </Box>

          {recentSchedules.length > 0 ? (
            <Grid container spacing={3}>
              {recentSchedules.map((schedule) => (
                <Grid item xs={12} md={4} key={schedule.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" fontWeight="600" gutterBottom>
                            {schedule.semester} {schedule.year}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {schedule.total_credits} credits
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Schedule">
                            <IconButton 
                              size="small" 
                              onClick={() => navigate(`/schedule/${schedule.id}`)}
                              sx={{ color: 'primary.main' }}
                            >
                              <LaunchIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Schedule">
                            <IconButton 
                              size="small" 
                              onClick={() => openDeleteDialog(schedule)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mb: 2, flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Courses:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {schedule.courses?.slice(0, 3).map((course, index) => (
                            <Chip
                              key={index}
                              label={course.code}
                              size="small"
                              variant="filled"
                              sx={{
                                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                                color: '#2980b9',
                                border: '1px solid rgba(52, 152, 219, 0.2)',
                                fontSize: '0.75rem',
                              }}
                            />
                          ))}
                          {schedule.courses?.length > 3 && (
                            <Chip
                              label={`+${schedule.courses.length - 3} more`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                      
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={() => navigate(`/schedule/${schedule.id}`)}
                        sx={{ mt: 'auto' }}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper 
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                border: '2px dashed',
                borderColor: 'grey.300',
                borderRadius: 2,
                py: 6,
                textAlign: 'center',
              }}
            >
              <SchoolIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No schedules yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '400px', mx: 'auto' }}>
                Create your first schedule to start planning your academic journey
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => navigate('/generate')}
                sx={{
                  background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                  boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(52, 152, 219, 0.4)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Create Your First Schedule
              </Button>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Section */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.05)',
              zIndex: 1,
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <StarIcon sx={{ mr: 2, fontSize: 32, color: '#f39c12' }} />
                <Typography variant="h5" fontWeight="600">
                  Quick Actions
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/generate')}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Generate New Schedule
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<DatasetIcon />}
                  onClick={() => navigate('/dataset-manager')}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Manage Course Dataset
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<BookIcon />}
                  onClick={() => navigate('/courses')}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Browse Course Catalog
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.05)',
              zIndex: 1,
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TrendingUpIcon sx={{ mr: 2, fontSize: 32, color: '#f1c40f' }} />
                <Typography variant="h5" fontWeight="600">
                  Recent Activity
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentSchedules.slice(0, 3).map((schedule, index) => (
                  <Box 
                    key={schedule.id}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 2, 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 1,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        transform: 'translateX(4px)',
                      }
                    }}
                  >
                    <CheckCircleIcon sx={{ mr: 2, fontSize: 20, color: '#f1c40f' }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight="500">
                        {schedule.semester} {schedule.year} schedule created
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {schedule.total_credits} credits • {schedule.courses?.length || 0} courses
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {recentSchedules.length === 0 && (
                  <Typography variant="body2" sx={{ opacity: 0.8, textAlign: 'center', py: 2 }}>
                    No recent activity
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Schedule</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete this schedule? This action cannot be undone.
          </Typography>
          {scheduleToDelete && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Schedule: {scheduleToDelete.semester} {scheduleToDelete.year} ({scheduleToDelete.courses?.length || 0} courses, {scheduleToDelete.total_credits} credits)
            </Typography>
          )}
        </DialogContent>
        <Box sx={{ display: 'flex', gap: 2, p: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSchedule}
            disabled={deleting}
            startIcon={deleting ? <LinearProgress size={20} /> : null}
          >
            {deleting ? 'Deleting...' : 'Delete Schedule'}
          </Button>
        </Box>
      </Dialog>
    </Container>
  );
};

export default Dashboard; 