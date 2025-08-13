import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5003/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service objects
export const healthAPI = {
  checkHealth: () => {
    return api.get('/health');
  },
  checkBackendStatus: () => {
    return api.get('/courses').catch(() => {
      throw new Error('Backend not responding');
    });
  },
};

export const courseAPI = {
  getCourses: () => {
    return api.get('/courses');
  },

  importCourses: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/courses/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  scrapeCourses: (url, enhanced = false) => {
    return api.post('/courses/scrape', { url, enhanced });
  },

  exportCourses: () => {
    return api.get('/courses/export', {
      responseType: 'blob'
    });
  },

  clearCourses: () => {
    return api.delete('/courses/clear');
  },
};

export const scheduleAPI = {
  generateSchedule: (data) => {
    return api.post('/schedule/generate', data);
  },

  getSchedule: (scheduleId) => {
    return api.get(`/schedule/${scheduleId}`);
  },

  updateSchedule: (scheduleId, courseIds, forceUpdate = false) => {
    return api.put(`/schedule/${scheduleId}`, { 
      course_ids: courseIds,
      force_update: forceUpdate
    });
  },

  getWeeklySchedule: (scheduleId) => {
    return api.get(`/schedule/${scheduleId}/weekly`);
  },

  exportSchedule: (scheduleId) => {
    return api.get(`/schedule/${scheduleId}/export`, {
      responseType: 'blob'
    });
  },

  deleteSchedule: (scheduleId) => {
    return api.delete(`/schedule/${scheduleId}`);
  },
};

export const userAPI = {
  createUser: (userData) => {
    return api.post('/users', userData);
  },

  getUser: (userId) => {
    return api.get(`/users/${userId}`);
  },

  updateUser: (userId, userData) => {
    return api.put(`/users/${userId}`, userData);
  },

  getUserSchedules: (userId) => {
    return api.get(`/users/${userId}/schedules`);
  },
  
  getUserPreferences: (userId) => {
    return api.get(`/users/${userId}/preferences`);
  },
  
  updateUserPreferences: (userId, preferences) => {
    return api.put(`/users/${userId}/preferences`, { preferences });
  },
};

export const requirementsAPI = {
  getRequirements: (major) => {
    return api.get(`/requirements/${major}`);
  },
};

export default api; 