import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  ListItemButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Remove as RemoveIcon,
  ViewWeek as ViewWeekIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { scheduleAPI, courseAPI } from '../services/api';

const ScheduleViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [weeklySchedule, setWeeklySchedule] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSchedule();
    fetchWeeklySchedule();
  }, [id]);

  const fetchSchedule = async () => {
    try {
      const response = await scheduleAPI.getSchedule(id);
      setSchedule(response.data);
      setSelectedCourses(response.data.courses.map(c => c.id));
    } catch (err) {
      setError('Failed to load schedule');
      console.error('Schedule fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklySchedule = async () => {
    try {
      const response = await scheduleAPI.getWeeklySchedule(id);
      setWeeklySchedule(response.data);
    } catch (err) {
      console.error('Weekly schedule fetch error:', err);
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      const response = await courseAPI.getCourses();
      setAvailableCourses(response.data);
    } catch (err) {
      console.error('Available courses fetch error:', err);
    }
  };

  const handleEditSchedule = () => {
    fetchAvailableCourses();
    setEditDialogOpen(true);
  };

  const handleAddCourse = (courseId) => {
    const course = availableCourses.find(c => c.id === courseId);
    if (!course) return;

    // Check for conflicts
    const conflicts = checkForConflicts([...selectedCourses, courseId]);
    if (conflicts.length > 0) {
      alert(`Conflict detected: ${conflicts.map(c => c.conflict).join(', ')}`);
      return;
    }

    setSelectedCourses(prev => [...prev, courseId]);
  };

  const handleRemoveCourse = (courseId) => {
    setSelectedCourses(prev => prev.filter(id => id !== courseId));
  };

  const checkForConflicts = (courseIds) => {
    const courses = availableCourses.filter(c => courseIds.includes(c.id));
    const conflicts = [];
    
    for (let i = 0; i < courses.length; i++) {
      for (let j = i + 1; j < courses.length; j++) {
        const course1 = courses[i];
        const course2 = courses[j];
        
        if (course1.time_slots && course2.time_slots) {
          for (const slot1 of course1.time_slots) {
            for (const slot2 of course2.time_slots) {
              if (slot1.day === slot2.day) {
                conflicts.push({
                  course1: course1.code,
                  course2: course2.code,
                  conflict: `Time conflict on ${slot1.day}`
                });
              }
            }
          }
        }
      }
    }
    
    return conflicts;
  };

  const hasTimeConflict = (slot1, slot2) => {
    return slot1.day === slot2.day;
  };

  const handleUpdateSchedule = async () => {
    try {
      setUpdating(true);
      await scheduleAPI.updateSchedule(id, selectedCourses);
      setEditDialogOpen(false);
      fetchSchedule();
      fetchWeeklySchedule();
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.conflicts) {
        const conflicts = err.response.data.conflicts;
        const conflictCount = conflicts.length;
        const conflictCourses = conflicts.map(c => `${c.course1} vs ${c.course2}`).join('\n');
        alert(`Schedule conflicts detected: ${conflictCount} time conflict${conflictCount > 1 ? 's' : ''} found:\n\n${conflictCourses}\n\nThese courses overlap and you couldn't attend them all. Use "Force Update" to save despite conflicts.`);
      } else {
        alert('Failed to update schedule');
      }
      console.error('Update schedule error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveCourseFromSchedule = async (courseId) => {
    const updatedCourseIds = selectedCourses.filter(id => id !== courseId);
    
    try {
      await scheduleAPI.updateSchedule(id, updatedCourseIds);
      fetchSchedule();
      fetchWeeklySchedule();
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.conflicts) {
        const conflicts = err.response.data.conflicts;
        const conflictCount = conflicts.length;
        const conflictCourses = conflicts.map(c => `${c.course1} vs ${c.course2}`).join('\n');
        const shouldForce = window.confirm(
          `Removing this course would create ${conflictCount} time conflict${conflictCount > 1 ? 's' : ''} in your schedule:\n\n${conflictCourses}\n\nThis means these courses overlap and you couldn't attend them all.\n\nDo you want to proceed anyway?`
        );
        
        if (shouldForce) {
          try {
            await scheduleAPI.updateSchedule(id, updatedCourseIds, true);
            fetchSchedule();
            fetchWeeklySchedule();
          } catch (forceErr) {
            alert('Failed to update schedule even with force update');
          }
        }
      } else {
        alert('Failed to remove course');
      }
    }
  };

  const handleExportSchedule = async () => {
    try {
      const response = await scheduleAPI.exportSchedule(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schedule_${id}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export schedule');
      console.error('Export error:', err);
    }
  };

  const handleDeleteSchedule = async () => {
    try {
      setDeleting(true);
      await scheduleAPI.deleteSchedule(id);
      setDeleteDialogOpen(false);
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to delete schedule');
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !schedule) {
    return (
      <Alert severity="error">
        {error || 'Schedule not found'}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">
          {schedule.semester} {schedule.year} Schedule
        </Typography>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={handleEditSchedule}
        >
          Edit Schedule
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportSchedule}
        >
          Export to Calendar
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<RemoveIcon />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete Schedule
        </Button>
      </Box>

      {/* Schedule Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Credits
              </Typography>
              <Typography variant="h3" color="primary">
                {schedule.total_credits}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Courses
              </Typography>
              <Typography variant="h3" color="secondary">
                {schedule.courses.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Created
              </Typography>
              <Typography variant="body1">
                {new Date(schedule.created_at).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Enrolled Courses */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Enrolled Courses
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Course Code</TableCell>
                  <TableCell>Course Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Credits</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedule.courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {course.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.department}</TableCell>
                    <TableCell>{course.credits}</TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveCourseFromSchedule(course.id)}
                      >
                        <RemoveIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            <ViewWeekIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Weekly Schedule
          </Typography>
          <Grid container spacing={2}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
              const courses = weeklySchedule[day] || [];
              return (
                <Grid xs={12} md={2.4} key={day}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {day}
                      </Typography>
                      {courses.length > 0 ? (
                        courses.map((course, index) => (
                          <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {course.course_code}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {course.time}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {course.room}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No classes
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Schedule</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select courses to include in your schedule. Conflicts will be highlighted.
          </Typography>
          
          <List>
            {availableCourses.map((course) => (
              <ListItem key={course.id} disablePadding>
                <ListItemButton>
                  <Checkbox
                    edge="start"
                    checked={selectedCourses.includes(course.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleAddCourse(course.id);
                      } else {
                        handleRemoveCourse(course.id);
                      }
                    }}
                  />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {course.code}
                        </Typography>
                        <Chip label={`${course.credits} credits`} size="small" />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">{course.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {course.department}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleUpdateSchedule}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Save Changes'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Schedule: {schedule.semester} {schedule.year} ({schedule.courses.length} courses, {schedule.total_credits} credits)
          </Typography>
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
    </Box>
  );
};

export default ScheduleViewer; 