# 🎓 Smart Course Scheduler

A full-stack web application that intelligently generates conflict-free course schedules for university students based on their major requirements, preferences, and completed courses.

## ✨ Features

### 🧠 Smart Scheduling
- **Intelligent Course Selection**: Multi-factor scoring algorithm prioritizes courses based on:
  - Curriculum requirements (core courses, math/science, general education)
  - Preferred departments and time preferences
  - Course levels (lower-level courses prioritized)
  - Available time slots
- **Conflict Detection**: Advanced time conflict detection prevents overlapping schedules
- **Curriculum Alignment**: Automatically maps courses to degree requirements for Computer Science, Mathematics, and Engineering

### 📚 Course Management
- **Web Scraping**: Automatically extract course information from university websites
- **Data Import/Export**: Support for CSV and JSON course data
- **Enhanced Scraping**: Get detailed schedule information including times, days, and room locations
- **Course Catalog**: Browse and search available courses with full details

### 🗓️ Schedule Management
- **Weekly View**: Visual weekly schedule with real-time conflict detection
- **Schedule Generation**: Create new schedules or update existing ones for different terms
- **User Preferences**: Store and apply user preferences for departments, times, and completed courses
- **Export Options**: Export schedules in various formats

### 👤 User Experience
- **Responsive Design**: Material-UI components for optimal cross-device experience
- **User Profiles**: Manage personal information, major, graduation year, and preferences
- **Dashboard**: Overview of all schedules and user statistics
- **Real-time Updates**: Immediate feedback on schedule changes and conflicts

## 🏗️ Architecture

### Frontend
- **React.js** with modern hooks and functional components
- **Material-UI** for professional, responsive design
- **React Router** for navigation and routing
- **Axios** for API communication
- **Local Storage** for data persistence

### Backend
- **Flask** Python web framework
- **SQLAlchemy** ORM with SQLite database
- **RESTful APIs** for all operations
- **BeautifulSoup4** for web scraping
- **Advanced algorithms** for course selection and conflict detection

### Database Models
- **User**: Profile information, preferences, major, graduation year
- **Course**: Course details, time slots, department, credits
- **Schedule**: User schedules with course associations
- **Relationships**: Many-to-many between users, schedules, and courses

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 app.py
```

The backend will run on `http://localhost:5003`

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

The frontend will run on `http://localhost:3000`

## 📖 Usage

### 1. User Profile Setup
- Set your major (Computer Science, Mathematics, Engineering)
- Add completed courses
- Set preferred departments and times

### 2. Course Import
- **Web Scraping**: Enter university course catalog URLs
- **Enhanced Scraping**: Get detailed schedule information
- **CSV/JSON Import**: Upload course data files

### 3. Schedule Generation
- Select semester and year
- Set target credits
- Generate intelligent schedule based on preferences
- Review and modify as needed

### 4. Schedule Management
- View weekly schedule layout
- Check for time conflicts
- Export schedules
- Delete or update existing schedules

## 🔧 API Endpoints

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/<id>` - Get course details
- `POST /api/courses/import` - Import courses from file
- `POST /api/courses/scrape` - Scrape courses from URL
- `GET /api/courses/export` - Export courses to CSV
- `DELETE /api/courses/clear` - Clear all courses

### Schedules
- `POST /api/schedule/generate` - Generate new schedule
- `GET /api/schedule/<id>` - Get schedule details
- `PUT /api/schedule/<id>` - Update schedule
- `DELETE /api/schedule/<id>` - Delete schedule
- `GET /api/schedule/<id>/weekly` - Get weekly view

### Users
- `POST /api/users` - Create user
- `GET /api/users/<id>` - Get user profile
- `PUT /api/users/<id>` - Update user
- `GET /api/users/<id>/preferences` - Get/update preferences

### Requirements
- `GET /api/requirements/<major>` - Get degree requirements

## 🧮 Smart Algorithm Details

### Course Scoring System
1. **Curriculum Requirements** (Highest Priority)
   - Core courses: +50 points
   - Math requirements: +40 points
   - Science requirements: +35 points
   - General education: +30 points

2. **User Preferences**
   - Preferred departments: +20 points
   - Preferred times: +10 points

3. **Course Characteristics**
   - Lower level (100-299): +15 points
   - Upper level (300-399): +10 points
   - Graduate level (400+): +5 points

4. **Schedule Quality**
   - Has time slots: +25 points
   - No time slots: -15 points

### Conflict Detection
- **Time Parsing**: Converts time strings to minutes for accurate comparison
- **Overlap Detection**: Checks for time conflicts between courses
- **Day Matching**: Handles single and multiple day schedules
- **Room Conflicts**: Identifies potential room scheduling issues

## 🌟 Advanced Features

### Web Scraping Capabilities
- **Catalog Pages**: Extract multiple courses from department listings
- **Schedule Pages**: Get detailed time slot information
- **Enhanced Mode**: Combine catalog and schedule data for complete course information
- **Multiple Formats**: Support for various university website structures

### Data Management
- **Duplicate Prevention**: Smart handling of duplicate courses
- **Data Validation**: Ensures course data integrity
- **Flexible Import**: Support for multiple data formats and structures
- **Export Options**: Multiple export formats for different use cases

## 🛠️ Development

### Project Structure
```
smart-course-scheduler/
├── backend/           # Flask backend
│   ├── app.py        # Main application
│   ├── requirements.txt
│   └── venv/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── database/          # Database files
└── docs/             # Documentation
```

### Key Components
- **CourseDatasetManager**: Import/export and web scraping interface
- **ScheduleGenerator**: Smart schedule generation with preferences
- **ScheduleViewer**: Weekly schedule display and management
- **UserProfile**: User preferences and profile management
- **Dashboard**: Overview and navigation hub

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🎯 Future Enhancements

- **Machine Learning**: Predictive course recommendations
- **Calendar Integration**: Google Calendar, Outlook sync
- **Mobile App**: React Native or Flutter mobile application
- **Advanced Analytics**: Schedule optimization suggestions
- **Multi-University Support**: Expand beyond Illinois curriculum
- **Real-time Updates**: Live course availability and waitlist management

## 📞 Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Built with ❤️ for students who want smarter course scheduling**
