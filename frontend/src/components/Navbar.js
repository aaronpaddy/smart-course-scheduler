import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Storage as DatasetIcon,
} from '@mui/icons-material';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { label: 'Course Catalog', path: '/courses', icon: <SchoolIcon /> },
    { label: 'Generate Schedule', path: '/generate', icon: <ScheduleIcon /> },
    { label: 'Dataset Manager', path: '/dataset-manager', icon: <DatasetIcon /> },
  ];

  const isActive = (path) => {
    return location.pathname === path || 
           (path === '/dashboard' && location.pathname === '/');
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <Toolbar sx={{ minHeight: '64px' }}>
        <Typography
          variant="h5"
          component="div"
          sx={{ 
            flexGrow: 1, 
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: 'white',
            letterSpacing: '-0.01em',
            transition: 'all 0.2s ease',
            '&:hover': {
              opacity: 0.9,
            }
          }}
          onClick={() => navigate('/')}
        >
          <SchoolIcon sx={{ fontSize: 28, color: '#3498db' }} />
          Smart Course Scheduler
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                backgroundColor: isActive(item.path) 
                  ? 'rgba(52, 152, 219, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                borderRadius: 2,
                px: 2.5,
                py: 1,
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '0.875rem',
                letterSpacing: '0.01em',
                border: isActive(item.path) 
                  ? '1px solid rgba(52, 152, 219, 0.3)' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: isActive(item.path) 
                    ? 'rgba(52, 152, 219, 0.3)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <IconButton
          color="inherit"
          onClick={() => navigate('/profile')}
          sx={{ 
            ml: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            }
          }}
        >
          <Avatar sx={{ 
            width: 36, 
            height: 36, 
            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}>
            <PersonIcon sx={{ color: 'white', fontSize: 20 }} />
          </Avatar>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 