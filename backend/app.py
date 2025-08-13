from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import json
import os
import csv
import io
import requests

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///courses.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

CORS(app)
db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    major = db.Column(db.String(100))
    graduation_year = db.Column(db.Integer)
    preferences = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    credits = db.Column(db.Integer, nullable=False)
    department = db.Column(db.String(100))
    description = db.Column(db.Text)
    prerequisites = db.Column(db.Text)  # JSON string
    semester = db.Column(db.String(20))  # Fall, Spring, Both
    year = db.Column(db.Integer)
    time_slots = db.Column(db.Text)  # JSON string
    max_capacity = db.Column(db.Integer)
    current_enrollment = db.Column(db.Integer, default=0)

class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    semester = db.Column(db.String(20), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    total_credits = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    courses = db.relationship('Course', secondary='schedule_courses')

class ScheduleCourses(db.Model):
    __tablename__ = 'schedule_courses'
    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)

# Helper functions
def check_schedule_conflicts(courses):
    """Check for time conflicts between courses"""
    conflicts = []
    
    for i, course1 in enumerate(courses):
        if not course1.time_slots:
            continue
            
        time_slots1 = json.loads(course1.time_slots)
        
        for j, course2 in enumerate(courses[i+1:], i+1):
            if not course2.time_slots:
                continue
                
            time_slots2 = json.loads(course2.time_slots)
            
            # Check for conflicts between time slots
            for slot1 in time_slots1:
                for slot2 in time_slots2:
                    if has_time_conflict(slot1, slot2):
                        conflicts.append({
                            'course1': course1.code,
                            'course2': course2.code,
                            'conflict': f"Time conflict on {slot1.get('day', 'Unknown day')}: {slot1.get('start_time', '')}-{slot1.get('end_time', '')} vs {slot2.get('start_time', '')}-{slot2.get('end_time', '')}"
                        })
    
    return conflicts

def has_time_conflict(slot1, slot2):
    """Check if two time slots conflict"""
    # Check if same day
    if slot1.get('day') != slot2.get('day'):
        return False
    
    # Get start and end times
    start1 = slot1.get('start_time', '')
    end1 = slot1.get('end_time', '')
    start2 = slot2.get('start_time', '')
    end2 = slot2.get('end_time', '')
    
    # If we don't have proper time data, assume conflict for safety
    if not start1 or not end1 or not start2 or not end2:
        return True
    
    # Convert times to minutes for comparison
    def time_to_minutes(time_str):
        try:
            # Handle formats like "9:00 AM", "09:00", "9:00"
            is_pm = 'PM' in time_str.upper()
            is_am = 'AM' in time_str.upper()
            
            # Remove AM/PM and clean up
            time_str = time_str.upper().replace(' AM', '').replace(' PM', '').strip()
            if ':' not in time_str:
                return 0
            
            hour, minute = map(int, time_str.split(':'))
            
            # Convert to 24-hour format
            if is_pm and hour != 12:
                hour += 12
            elif is_am and hour == 12:
                hour = 0
            
            return hour * 60 + minute
        except:
            return 0
    
    start1_min = time_to_minutes(start1)
    end1_min = time_to_minutes(end1)
    start2_min = time_to_minutes(start2)
    end2_min = time_to_minutes(end2)
    
    # Check for overlap: if one course starts before another ends and ends after the other starts
    return (start1_min < end2_min and end1_min > start2_min)

def safe_json_loads(json_str):
    """Safely parse JSON string, return empty list if invalid"""
    if not json_str or not isinstance(json_str, str) or not json_str.strip():
        return []
    
    try:
        return json.loads(json_str.strip())
    except (json.JSONDecodeError, TypeError):
        return []

def parse_time_slots(time_str):
    """Parse time string into structured format"""
    if not time_str:
        return []
    
    # Simple parsing - in real app, this would be more sophisticated
    slots = []
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    
    for day in days:
        if day.lower() in time_str.lower():
            slots.append({
                'day': day,
                'start_time': '09:00',
                'end_time': '10:30',
                'room': 'TBD'
            })
    
    return slots

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'message': 'Smart Course Scheduler API is running',
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/courses', methods=['GET'])
def get_courses():
    """Get all available courses"""
    courses = Course.query.all()
    return jsonify([{
        'id': course.id,
        'code': course.code,
        'name': course.name,
        'credits': course.credits,
        'department': course.department,
        'description': course.description,
        'prerequisites': safe_json_loads(course.prerequisites),
        'semester': course.semester,
        'year': course.year,
        'time_slots': safe_json_loads(course.time_slots),
        'max_capacity': course.max_capacity,
        'current_enrollment': course.current_enrollment
    } for course in courses])

@app.route('/api/courses/<int:course_id>', methods=['GET'])
def get_course_detail(course_id):
    """Get detailed information about a specific course"""
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    
    return jsonify({
        'id': course.id,
        'code': course.code,
        'name': course.name,
        'credits': course.credits,
        'department': course.department,
        'description': course.description,
        'prerequisites': safe_json_loads(course.prerequisites),
        'semester': course.semester,
        'year': course.year,
        'time_slots': safe_json_loads(course.time_slots),
        'max_capacity': course.max_capacity,
        'current_enrollment': course.current_enrollment,
        'enrollment_percentage': (course.current_enrollment / course.max_capacity * 100) if course.max_capacity > 0 else 0
    })

@app.route('/api/schedule/generate', methods=['POST'])
def generate_schedule():
    """Generate a new schedule for a user"""
    data = request.get_json()
    user_id = data.get('user_id', 1)  # Default to user 1 if not specified
    semester = data.get('semester', 'Fall')
    year = data.get('year', 2025)
    max_credits = data.get('max_credits', 18)
    
    # Get or create user
    user = db.session.get(User, user_id)
    if not user:
        # Create a default user if none exists
        user = User(
            username='default_user',
            email='default@example.com',
            major='Computer Science',
            graduation_year=2026,
            preferences=json.dumps({
                'completed_courses': ['CS101', 'MATH101', 'ENG101'],
                'preferred_departments': ['CS', 'MATH'],
                'preferred_times': ['morning', 'afternoon']
            })
        )
        db.session.add(user)
        db.session.commit()
        user_id = user.id
    
    # Check if a schedule already exists for this user, semester, and year
    existing_schedule = Schedule.query.filter_by(
        user_id=user_id,
        semester=semester,
        year=year
    ).first()
    
    if existing_schedule:
        # Update existing schedule instead of creating a new one
        # Clear existing courses by removing from the association table
        existing_schedule.courses = []
        existing_schedule.total_credits = 0
        db.session.commit()
        schedule = existing_schedule
        action = "updated"
    else:
        # Create new schedule for different term
        schedule = Schedule(
            user_id=user_id,
            semester=semester,
            year=year,
            total_credits=0
        )
        db.session.add(schedule)
        db.session.commit()
        action = "created"
    
    # Get available courses for the semester
    available_courses = Course.query.filter(
        (Course.semester == semester) | (Course.semester == 'Both')
    ).all()
    
    # If no courses found for requested semester, try to find any available courses
    if not available_courses:
        available_courses = Course.query.all()
        if available_courses:
            # Update the semester to match what's actually available
            semester = available_courses[0].semester
    
    # Sort courses by credits (lower credits first to maximize course count) and then by code
    available_courses.sort(key=lambda x: (x.credits, x.code))
    
    # Get user preferences and completed courses
    user_preferences = {}
    completed_courses = ['CS101', 'MATH101', 'ENG101']  # Default completed courses
    
    if user.preferences:
        try:
            user_preferences = json.loads(user.preferences)
            # Get completed courses from preferences if available
            if 'completed_courses' in user_preferences:
                completed_courses = user_preferences['completed_courses']
        except (json.JSONDecodeError, TypeError):
            pass  # Use default if preferences are invalid
    
    # Filter out completed courses
    eligible_courses = [course for course in available_courses 
                       if course.code not in completed_courses]
    
    # Get curriculum requirements if major is specified
    curriculum_requirements = None
    if user.major:
        try:
            import requests
            response = requests.get(f'http://localhost:5003/api/requirements/{user.major}')
            if response.status_code == 200:
                curriculum_requirements = response.json()
        except:
            pass
    
    # Apply smart course selection based on preferences and curriculum
    if user_preferences or curriculum_requirements:
        # Score courses based on multiple factors
        scored_courses = []
        for course in eligible_courses:
            score = 0
            
            # 1. Curriculum Requirements (highest priority)
            if curriculum_requirements:
                if course.code in curriculum_requirements.get('core_courses', []):
                    score += 50  # Core courses get highest priority
                elif course.code in curriculum_requirements.get('math_requirements', []):
                    score += 40  # Math requirements
                elif course.code in curriculum_requirements.get('science_requirements', []):
                    score += 35  # Science requirements
                elif course.code in curriculum_requirements.get('general_education', []):
                    score += 30  # Gen ed requirements
            
            # 2. Preferred Departments
            if 'preferred_departments' in user_preferences:
                preferred_depts = user_preferences['preferred_departments']
                if course.department in preferred_depts:
                    score += 20
            
            # 3. Course Level (lower level courses first)
            try:
                course_number = int(''.join(filter(str.isdigit, course.code)))
                if course_number < 300:  # Lower level courses
                    score += 15
                elif course_number < 400:  # Upper level courses
                    score += 10
                else:  # Graduate level
                    score += 5
            except:
                pass
            
            # 4. Time Slots Availability (high priority for courses with actual schedules)
            if course.time_slots:
                time_slots = safe_json_loads(course.time_slots)
                if time_slots and len(time_slots) > 0:
                    score += 25  # High priority for courses with actual time slots
                    
                    # Additional points for preferred times
                    if 'preferred_times' in user_preferences:
                        preferred_times = user_preferences['preferred_times']
                        for slot in time_slots:
                            start_time = slot.get('start_time', '')
                            if any(pref_time in start_time for pref_time in preferred_times):
                                score += 10
            else:
                # Penalize courses without time slots
                score -= 15
            
            scored_courses.append((course, score))
        
        # Sort by score (highest first)
        scored_courses.sort(key=lambda x: x[1], reverse=True)
        eligible_courses = [course for course, score in scored_courses]
    else:
        # Fallback to basic sorting
        eligible_courses.sort(key=lambda x: (x.credits, x.code))
    
    # Filter out non-academic courses and courses with 0 credits
    academic_courses = []
    for course in eligible_courses:
        # Skip courses with very low credits (less than 1 credit)
        if course.credits < 1:
            continue
        
        # Skip administrative/activity courses
        course_name_lower = course.name.lower()
        skip_keywords = [
            'orientation', 'study abroad', 'internship', 'seminar', 'laboratory', 
            'open seminar', 'transfer', 'leadership lab', 'undergraduate open',
            'professional internship', 'international internship'
        ]
        
        if any(keyword in course_name_lower for keyword in skip_keywords):
            continue
        
        # Skip courses with very short names (likely not real courses)
        if len(course.name.strip()) < 5:
            continue
        
        academic_courses.append(course)
    
    # Select courses up to max credits, avoiding conflicts
    selected_courses = []
    total_credits = 0
    skipped_due_to_conflicts = []
    
    for course in academic_courses:
        if total_credits + course.credits <= max_credits:
            # Check if adding this course would create conflicts
            temp_courses = selected_courses + [course]
            conflicts = check_schedule_conflicts(temp_courses)
            
            if not conflicts:
                # No conflicts, safe to add
                selected_courses.append(course)
                total_credits += course.credits
            else:
                # Skip this course due to conflicts
                skipped_due_to_conflicts.append({
                    'course': course.code,
                    'conflicts': [f"{c['course1']} vs {c['course2']}" for c in conflicts]
                })
                continue
    
    # Add courses to schedule
    for course in selected_courses:
        schedule.courses.append(course)
    
    # Update total credits
    schedule.total_credits = total_credits
    
    db.session.commit()
    
    # Generate explanation of why courses were selected
    selection_explanation = []
    for course in selected_courses:
        reasons = []
        if curriculum_requirements:
            if course.code in curriculum_requirements.get('core_courses', []):
                reasons.append("Core requirement for your major")
            elif course.code in curriculum_requirements.get('math_requirements', []):
                reasons.append("Math requirement for your major")
            elif course.code in curriculum_requirements.get('science_requirements', []):
                reasons.append("Science requirement for your major")
            elif course.code in curriculum_requirements.get('general_education', []):
                reasons.append("General education requirement")
        
        if 'preferred_departments' in user_preferences and course.department in user_preferences['preferred_departments']:
            reasons.append("Matches your preferred department")
        
        if 'preferred_times' in user_preferences and course.time_slots:
            preferred_times = user_preferences['preferred_times']
            time_slots = safe_json_loads(course.time_slots)
            for slot in time_slots:
                start_time = slot.get('start_time', '')
                if any(pref_time in start_time for pref_time in preferred_times):
                    reasons.append("Matches your preferred time")
                    break
        
        if not reasons:
            reasons.append("Fits your schedule and credit requirements")
        
        selection_explanation.append({
            'course_code': course.code,
            'course_name': course.name,
            'reasons': reasons
        })
    
    return jsonify({
        'message': f'Smart schedule {action} successfully',
        'schedule_id': schedule.id,
        'total_credits': total_credits,
        'courses_count': len(selected_courses),
        'action': action,
        'skipped_courses': skipped_due_to_conflicts,
        'skipped_count': len(skipped_due_to_conflicts),
        'selection_explanation': selection_explanation,
        'curriculum_alignment': curriculum_requirements is not None,
        'major': user.major if user.major else None
    })

@app.route('/api/schedule/<int:schedule_id>', methods=['GET'])
def get_schedule(schedule_id):
    """Get a specific schedule with courses"""
    schedule = db.session.get(Schedule, schedule_id)
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
    
    return jsonify({
        'id': schedule.id,
        'semester': schedule.semester,
        'year': schedule.year,
        'total_credits': schedule.total_credits,
        'created_at': schedule.created_at.isoformat() if schedule.created_at else None,
        'courses': [{
            'id': course.id,
            'code': course.code,
            'name': course.name,
            'credits': course.credits,
            'department': course.department,
            'description': course.description,
            'time_slots': json.loads(course.time_slots) if course.time_slots else [],
            'max_capacity': course.max_capacity,
            'current_enrollment': course.current_enrollment
        } for course in schedule.courses]
    })

@app.route('/api/schedule/<int:schedule_id>', methods=['PUT', 'DELETE'])
def update_schedule(schedule_id):
    """Update or delete an existing schedule"""
    schedule = db.session.get(Schedule, schedule_id)
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
    
    if request.method == 'DELETE':
        try:
            # Clear courses first
            schedule.courses = []
            db.session.delete(schedule)
            db.session.commit()
            return jsonify({'message': 'Schedule deleted successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    # PUT method - update schedule
    data = request.get_json()
    course_ids = data.get('course_ids', [])
    force_update = data.get('force_update', False)
    
    # Validate course IDs
    courses = []
    for course_id in course_ids:
        course = db.session.get(Course, course_id)
        if not course:
            return jsonify({'error': f'Course {course_id} not found'}), 404
        courses.append(course)
    
    # Check for scheduling conflicts
    conflicts = check_schedule_conflicts(courses)
    if conflicts and not force_update:
        return jsonify({
            'error': 'Schedule conflicts detected',
            'conflicts': conflicts,
            'message': 'Use force_update=true to save despite conflicts'
        }), 400
    
    # Update schedule
    schedule.courses = courses
    schedule.total_credits = sum(course.credits for course in courses)
    
    db.session.commit()
    
    response_data = {
        'message': 'Schedule updated successfully',
        'schedule_id': schedule.id,
        'total_credits': schedule.total_credits,
        'courses_count': len(courses)
    }
    
    if conflicts:
        response_data['conflicts'] = conflicts
        response_data['warning'] = 'Schedule saved with conflicts'
    
    return jsonify(response_data)

@app.route('/api/schedule/<int:schedule_id>/weekly', methods=['GET'])
def get_weekly_schedule(schedule_id):
    """Get weekly view of a schedule"""
    schedule = db.session.get(Schedule, schedule_id)
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
    
    weekly_schedule = {
        'Monday': [],
        'Tuesday': [],
        'Wednesday': [],
        'Thursday': [],
        'Friday': []
    }
    
    for course in schedule.courses:
        if course.time_slots:
            time_slots = json.loads(course.time_slots)
            for slot in time_slots:
                days_str = slot.get('day', 'Monday')
                
                # Handle comma-separated days (e.g., "Monday,Wednesday,Friday")
                if ',' in days_str:
                    days = [day.strip() for day in days_str.split(',')]
                else:
                    days = [days_str.strip()]
                
                # Add course to each day it meets
                for day in days:
                    if day in weekly_schedule:
                        weekly_schedule[day].append({
                            'course_code': course.code,
                            'course_name': course.name,
                            'time': f"{slot.get('start_time', '09:00')} - {slot.get('end_time', '10:30')}",
                            'room': slot.get('room', 'TBD'),
                            'credits': course.credits
                        })
    
    # Sort courses by start time within each day
    for day in weekly_schedule:
        weekly_schedule[day].sort(key=lambda x: x['time'])
    
    return jsonify(weekly_schedule)

@app.route('/api/schedule/<int:schedule_id>/export', methods=['GET'])
def export_schedule(schedule_id):
    """Export schedule as iCalendar file"""
    schedule = db.session.get(Schedule, schedule_id)
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
    
    # Simple iCalendar format
    ical_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Smart Course Scheduler//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
"""
    
    for course in schedule.courses:
        if course.time_slots:
            time_slots = json.loads(course.time_slots)
            for slot in time_slots:
                ical_content += f"""BEGIN:VEVENT
SUMMARY:{course.code} - {course.name}
DESCRIPTION:{course.description or 'No description available'}
LOCATION:{slot.get('room', 'TBD')}
DTSTART:20250901T090000Z
DTEND:20250901T103000Z
END:VEVENT
"""
    
    ical_content += "END:VCALENDAR"
    
    return ical_content, 200, {
        'Content-Type': 'text/calendar',
        'Content-Disposition': f'attachment; filename=schedule_{schedule_id}.ics'
    }

@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user"""
    data = request.get_json()
    
    try:
        new_user = User(
            username=data['username'],
            email=data['email'],
            major=data.get('major', ''),
            graduation_year=data.get('graduation_year'),
            preferences=json.dumps(data.get('preferences', {}))
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({'message': 'User created successfully', 'id': new_user.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/users/<int:user_id>/schedules', methods=['GET'])
def get_user_schedules(user_id):
    """Get all schedules for a specific user"""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    schedules = Schedule.query.filter_by(user_id=user_id).order_by(Schedule.created_at.desc()).all()
    
    return jsonify([{
        'id': schedule.id,
        'semester': schedule.semester,
        'year': schedule.year,
        'total_credits': schedule.total_credits,
        'created_at': schedule.created_at.isoformat() if schedule.created_at else None,
        'courses': [{
            'id': course.id,
            'code': course.code,
            'name': course.name,
            'credits': course.credits,
            'department': course.department
        } for course in schedule.courses]
    } for schedule in schedules])

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get user profile"""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'major': user.major,
        'graduation_year': user.graduation_year,
        'preferences': json.loads(user.preferences) if user.preferences else {}
    })

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user profile"""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    try:
        # Update user fields
        if 'username' in data:
            user.username = data['username']
        if 'email' in data:
            user.email = data['email']
        if 'major' in data:
            user.major = data['major']
        if 'graduation_year' in data:
            user.graduation_year = data['graduation_year']
        if 'preferences' in data:
            user.preferences = json.dumps(data['preferences'])
        
        db.session.commit()
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'major': user.major,
            'graduation_year': user.graduation_year,
            'preferences': json.loads(user.preferences) if user.preferences else {}
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/users/<int:user_id>/preferences', methods=['GET', 'PUT'])
def user_preferences(user_id):
    """Get or update user preferences"""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if request.method == 'GET':
        preferences = json.loads(user.preferences) if user.preferences else {}
        
        # Get curriculum requirements if major is specified
        curriculum_requirements = None
        if user.major:
            try:
                import requests
                response = requests.get(f'http://localhost:5003/api/requirements/{user.major}')
                if response.status_code == 200:
                    curriculum_requirements = response.json()
            except:
                pass
        
        return jsonify({
            'user_id': user_id,
            'preferences': preferences,
            'major': user.major,
            'graduation_year': user.graduation_year,
            'curriculum_requirements': curriculum_requirements
        })
    
    # PUT method
    data = request.get_json()
    
    if 'preferences' not in data:
        return jsonify({'error': 'Preferences data required'}), 400
    
    try:
        # Update preferences
        user.preferences = json.dumps(data['preferences'])
        db.session.commit()
        
        return jsonify({
            'message': 'Preferences updated successfully',
            'preferences': json.loads(user.preferences) if user.preferences else {}
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/requirements/<major>', methods=['GET'])
def get_degree_requirements(major):
    """Get degree requirements for a major"""
    # Illinois curriculum requirements
    requirements = {
        'Computer Science': {
            'total_credits': 128,
            'core_courses': ['CS100', 'CS101', 'CS125', 'CS173', 'CS225', 'CS233', 'CS241', 'CS357', 'CS361', 'CS421', 'CS427'],
            'math_requirements': ['MATH220', 'MATH231', 'MATH241', 'MATH285', 'MATH347', 'MATH415'],
            'science_requirements': ['PHYS211', 'PHYS212', 'CHEM102', 'CHEM103'],
            'general_education': ['RHET105', 'COMPOSITION', 'HUMANITIES', 'SOCIAL_SCIENCE', 'CULTURAL_STUDIES'],
            'electives': 15,
            'semester_breakdown': {
                'freshman_fall': ['CS100', 'MATH220', 'RHET105'],
                'freshman_spring': ['CS125', 'MATH231', 'PHYS211'],
                'sophomore_fall': ['CS173', 'CS225', 'MATH241', 'PHYS212'],
                'sophomore_spring': ['CS233', 'MATH285', 'CHEM102'],
                'junior_fall': ['CS241', 'CS357', 'MATH347'],
                'junior_spring': ['CS361', 'MATH415', 'CHEM103'],
                'senior_fall': ['CS421', 'CS427'],
                'senior_spring': ['ELECTIVES']
            }
        },
        'Mathematics': {
            'total_credits': 120,
            'core_courses': ['MATH220', 'MATH231', 'MATH241', 'MATH347', 'MATH416', 'MATH417', 'MATH418', 'MATH419'],
            'computer_science': ['CS101', 'CS125'],
            'general_education': ['RHET105', 'COMPOSITION', 'HUMANITIES', 'SOCIAL_SCIENCE'],
            'electives': 20,
            'semester_breakdown': {
                'freshman_fall': ['MATH220', 'RHET105'],
                'freshman_spring': ['MATH231', 'CS101'],
                'sophomore_fall': ['MATH241', 'MATH347'],
                'sophomore_spring': ['MATH416', 'CS125'],
                'junior_fall': ['MATH417', 'MATH418'],
                'junior_spring': ['MATH419'],
                'senior_fall': ['ELECTIVES'],
                'senior_spring': ['ELECTIVES']
            }
        },
        'Engineering': {
            'total_credits': 130,
            'core_courses': ['ENG100', 'ENG101', 'ENG110', 'ENG177', 'ENG198', 'ENG199'],
            'math_requirements': ['MATH220', 'MATH231', 'MATH241', 'MATH285', 'MATH415'],
            'science_requirements': ['PHYS211', 'PHYS212', 'CHEM102', 'CHEM103'],
            'general_education': ['RHET105', 'COMPOSITION', 'HUMANITIES', 'SOCIAL_SCIENCE'],
            'electives': 12,
            'semester_breakdown': {
                'freshman_fall': ['ENG100', 'MATH220', 'RHET105'],
                'freshman_spring': ['ENG101', 'MATH231', 'PHYS211'],
                'sophomore_fall': ['ENG110', 'MATH241', 'PHYS212'],
                'sophomore_spring': ['ENG177', 'MATH285', 'CHEM102'],
                'junior_fall': ['ENG198', 'MATH415', 'CHEM103'],
                'junior_spring': ['ENG199'],
                'senior_fall': ['ELECTIVES'],
                'senior_spring': ['ELECTIVES']
            }
        }
    }
    
    return jsonify(requirements.get(major, {}))

# Initialize database and load sample data
def init_db():
    with app.app_context():
        db.create_all()
        
        # Load sample courses if database is empty
        if Course.query.count() == 0:
            sample_courses = [
                Course(code='CS101', name='Introduction to Computer Science', credits=3, 
                       department='Computer Science', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Monday', 'start_time': '09:00', 'end_time': '10:30', 'room': 'CS101'}]),
                       max_capacity=30, current_enrollment=25),
                Course(code='CS201', name='Data Structures and Algorithms', credits=4, 
                       department='Computer Science', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Tuesday', 'start_time': '11:00', 'end_time': '12:30', 'room': 'CS201'}]),
                       max_capacity=25, current_enrollment=20),
                Course(code='MATH101', name='Calculus I', credits=4, 
                       department='Mathematics', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Wednesday', 'start_time': '14:00', 'end_time': '15:30', 'room': 'MATH101'}]),
                       max_capacity=35, current_enrollment=30),
                Course(code='MATH201', name='Calculus II', credits=4, 
                       department='Mathematics', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Thursday', 'start_time': '09:00', 'end_time': '10:30', 'room': 'MATH201'}]),
                       max_capacity=30, current_enrollment=25),
                Course(code='ENG101', name='English Composition', credits=3, 
                       department='English', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Friday', 'start_time': '11:00', 'end_time': '12:30', 'room': 'ENG101'}]),
                       max_capacity=25, current_enrollment=20),
                Course(code='PHYS101', name='Physics I', credits=4, 
                       department='Physics', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Monday', 'start_time': '14:00', 'end_time': '15:30', 'room': 'PHYS101'}]),
                       max_capacity=30, current_enrollment=25),
                Course(code='HIST101', name='World History', credits=3, 
                       department='History', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Tuesday', 'start_time': '16:00', 'end_time': '17:30', 'room': 'HIST101'}]),
                       max_capacity=40, current_enrollment=35),
                Course(code='CHEM101', name='General Chemistry', credits=4, 
                       department='Chemistry', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Wednesday', 'start_time': '09:00', 'end_time': '10:30', 'room': 'CHEM101'}]),
                       max_capacity=35, current_enrollment=30),
                Course(code='BIO101', name='Introduction to Biology', credits=4, 
                       department='Biology', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Thursday', 'start_time': '14:00', 'end_time': '15:30', 'room': 'BIO101'}]),
                       max_capacity=40, current_enrollment=35),
                Course(code='PSYCH101', name='Introduction to Psychology', credits=3, 
                       department='Psychology', semester='Fall', year=2025,
                       time_slots=json.dumps([{'day': 'Friday', 'start_time': '14:00', 'end_time': '15:30', 'room': 'PSYCH101'}]),
                       max_capacity=50, current_enrollment=45)
            ]
            
            for course in sample_courses:
                db.session.add(course)
            
            db.session.commit()

# Course Dataset Import Endpoints
@app.route('/api/courses/import', methods=['POST'])
def import_courses():
    """Import courses from CSV or JSON dataset"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file type
        if not file.filename.lower().endswith(('.csv', '.json')):
            return jsonify({'error': 'Unsupported file type. Please use CSV or JSON'}), 400
        
        # Read and parse file
        if file.filename.lower().endswith('.csv'):
            courses = parse_csv_courses(file)
        else:
            courses = parse_json_courses(file)
        
        if not courses:
            return jsonify({'error': 'No valid courses found in file'}), 400
        
        # Import courses to database
        imported_count = 0
        updated_count = 0
        errors = []
        
        for course_data in courses:
            try:
                # Check if course already exists
                existing_course = Course.query.filter_by(code=course_data['code']).first()
                
                if existing_course:
                    # Update existing course
                    existing_course.name = course_data.get('name', existing_course.name)
                    existing_course.credits = course_data.get('credits', existing_course.credits)
                    existing_course.department = course_data.get('department', existing_course.department)
                    existing_course.description = course_data.get('description', existing_course.description)
                    existing_course.prerequisites = course_data.get('prerequisites', existing_course.prerequisites)
                    existing_course.semester = course_data.get('semester', existing_course.semester)
                    existing_course.year = course_data.get('year', existing_course.year)
                    existing_course.time_slots = course_data.get('time_slots', existing_course.time_slots)
                    existing_course.max_capacity = course_data.get('max_capacity', existing_course.max_capacity)
                    existing_course.current_enrollment = course_data.get('current_enrollment', existing_course.current_enrollment)
                    updated_count += 1
                else:
                    # Create new course
                    new_course = Course(**course_data)
                    db.session.add(new_course)
                    imported_count += 1
                
            except Exception as e:
                errors.append(f"Error processing course {course_data.get('code', 'Unknown')}: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            'message': 'Course import completed',
            'imported': imported_count,
            'updated': updated_count,
            'errors': errors
        })
        
    except Exception as e:
        return jsonify({'error': f'Import failed: {str(e)}'}), 500

@app.route('/api/courses/export', methods=['GET'])
def export_courses():
    """Export all courses to CSV"""
    try:
        courses = Course.query.all()
        
        # Create CSV data
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['course_code', 'course_name', 'description', 'credits', 'department', 
                        'prerequisites', 'semester', 'year', 'time_slots', 'max_capacity', 'current_enrollment'])
        
        # Write course data
        for course in courses:
            writer.writerow([
                course.code,
                course.name,
                course.description or '',
                course.credits,
                course.department or '',
                course.prerequisites or '',
                course.semester or '',
                course.year or '',
                course.time_slots or '',
                course.max_capacity or '',
                course.current_enrollment or ''
            ])
        
        output.seek(0)
        
        from flask import send_file
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='courses_export.csv'
        )
        
    except Exception as e:
        return jsonify({'error': f'Export failed: {str(e)}'}), 500

@app.route('/api/courses/clear', methods=['DELETE'])
def clear_courses():
    """Clear all courses from database"""
    try:
        # Delete all courses
        Course.query.delete()
        db.session.commit()
        
        return jsonify({'message': 'All courses cleared successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to clear courses: {str(e)}'}), 500

def parse_csv_courses(file):
    """Parse CSV file and return list of course dictionaries"""
    try:
        content = file.read().decode('utf-8')
        print(f"CSV content length: {len(content)} characters")
        print(f"First 500 characters: {content[:500]}")
        
        csv_reader = csv.DictReader(io.StringIO(content))
        print(f"CSV headers: {csv_reader.fieldnames}")
        
        courses = []
        seen_codes = set()  # Track unique courses
        
        for i, row in enumerate(csv_reader):
            if i < 5:  # Print first 5 rows for debugging
                print(f"Row {i}: {dict(row)}")
            
            # Handle Illinois course catalog format
            if 'Subject' in row and 'Number' in row:
                # Illinois format: Subject + Number = course code
                subject = row['Subject'].strip()
                number = row['Number'].strip()
                course_code = f"{subject}{number}"
                course_name = row.get('Name', '').strip()
                
                # Skip if we've already seen this course
                if course_code in seen_codes:
                    continue
                
                # Extract credits
                credits = 0
                credit_str = row.get('Credit Hours', '0')
                try:
                    # Handle "3 hours." format
                    if 'hours' in credit_str.lower():
                        credit_str = credit_str.split()[0]
                    credits = int(float(credit_str))
                except:
                    pass
                
                # Extract time slots if available
                time_slots = []
                if (row.get('Start Time') and row.get('End Time') and 
                    row.get('Days of Week') and row.get('Room')):
                    
                    # Parse days
                    days_str = row['Days of Week']
                    days = []
                    if 'M' in days_str: days.append('Monday')
                    if 'T' in days_str: days.append('Tuesday') 
                    if 'W' in days_str: days.append('Wednesday')
                    if 'R' in days_str: days.append('Thursday')
                    if 'F' in days_str: days.append('Friday')
                    
                    if days:
                        time_slots.append({
                            'day': ','.join(days),
                            'start_time': row['Start Time'],
                            'end_time': row['End Time'],
                            'room': f"{row.get('Room', '')} {row.get('Building', '')}".strip()
                        })
                
                # Convert time slots to JSON string
                time_slots_json = json.dumps(time_slots) if time_slots else ''
                
                course = {
                    'code': course_code,
                    'name': course_name,
                    'description': row.get('Description', '').strip(),
                    'credits': credits,
                    'department': subject,
                    'prerequisites': '',
                    'semester': 'Both',
                    'year': 2025,
                    'time_slots': time_slots_json,
                    'max_capacity': 0,
                    'current_enrollment': 0
                }
                
                # Validate required fields - be more lenient
                if course['code'] and course['name'] and len(course['name']) > 2:
                    courses.append(course)
                    seen_codes.add(course_code)
                    print(f"Added course: {course_code} - {course_name}")
            
            else:
                # Handle standard format
                course = {
                    'code': row.get('course_code', '').strip(),
                    'name': row.get('course_name', '').strip(),
                    'description': row.get('description', '').strip(),
                    'credits': int(row.get('credits', 0)) if row.get('credits') else 0,
                    'department': row.get('department', '').strip(),
                    'prerequisites': row.get('prerequisites', '').strip(),
                    'semester': row.get('semester', 'Both').strip(),
                    'year': int(row.get('year', 2025)) if row.get('year') else 2025,
                    'time_slots': row.get('time_slots', ''),
                    'max_capacity': int(row.get('max_capacity', 0)) if row.get('max_capacity') else 0,
                    'current_enrollment': int(row.get('current_enrollment', 0)) if row.get('current_enrollment') else 0
                }
                
                # Validate required fields
                if course['code'] and course['name'] and course['credits'] > 0:
                    courses.append(course)
        
        print(f"Parsed {len(courses)} courses from CSV")
        return courses
        
    except Exception as e:
        print(f"Error parsing CSV: {e}")
        import traceback
        traceback.print_exc()
        return []

def parse_json_courses(file):
    """Parse JSON file and return list of course dictionaries"""
    try:
        content = file.read().decode('utf-8')
        data = json.loads(content)
        
        if isinstance(data, list):
            courses = []
            for item in data:
                course = {
                    'code': item.get('course_code', item.get('code', '')).strip(),
                    'name': item.get('course_name', item.get('name', '')).strip(),
                    'description': item.get('description', '').strip(),
                    'credits': int(item.get('credits', 0)) if item.get('credits') else 0,
                    'department': item.get('department', '').strip(),
                    'prerequisites': item.get('prerequisites', '').strip(),
                    'semester': item.get('semester', 'Both').strip(),
                    'year': int(item.get('year', 2025)) if item.get('year') else 2025,
                    'time_slots': item.get('time_slots', ''),
                    'max_capacity': int(item.get('max_capacity', 0)) if item.get('max_capacity') else 0,
                    'current_enrollment': int(item.get('current_enrollment', 0)) if item.get('current_enrollment') else 0
                }
                
                # Validate required fields
                if course['code'] and course['name'] and course['credits'] > 0:
                    courses.append(course)
            
            return courses
        else:
            return []
            
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        return []

@app.route('/api/courses/scrape', methods=['POST'])
def scrape_courses_from_url():
    """Scrape course information from a university website URL"""
    import re
    
    try:
        data = request.get_json()
        url = data.get('url')
        enhanced = data.get('enhanced', False)  # New parameter for enhanced scraping
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        print(f"Starting web scraping for URL: {url} (enhanced: {enhanced})")
        
        # Import BeautifulSoup here to avoid import issues
        try:
            from bs4 import BeautifulSoup
        except ImportError:
            return jsonify({'error': 'BeautifulSoup not installed. Please install: pip install beautifulsoup4 lxml'}), 500
        
        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            return jsonify({'error': 'Please enter a valid URL starting with http:// or https://'}), 400
        
        # Check if this is a schedule page (contains specific course)
        # Look for URL patterns that indicate a specific course schedule
        if ('schedule' in url.lower() and 
            any(term in url.lower() for term in ['/cs/', '/cse/', '/math/', '/engr/', '/ansc/', '/phys/', '/chem/', '/biol/']) and
            re.search(r'/\d{3,4}$', url)):  # Ends with course number
            # This is a schedule page, try to extract detailed course info
            courses = scrape_schedule_page(url)
        else:
            # This is a catalog page, extract course listings
            courses = scrape_catalog_page(url)
            
            # If enhanced scraping is requested, try to get schedule info for each course
            if enhanced and courses:
                print(f"Enhanced scraping: Attempting to get schedule info for {len(courses)} courses")
                enhanced_courses = []
                for course in courses[:10]:  # Limit to 10 courses to avoid too many requests
                    try:
                        # Try to construct schedule URL for this course
                        schedule_url = construct_schedule_url(url, course['code'])
                        if schedule_url:
                            print(f"Trying to get schedule for {course['code']} from {schedule_url}")
                            schedule_course = scrape_schedule_page(schedule_url)
                            if schedule_course and schedule_course[0].get('time_slots'):
                                # Merge schedule info with catalog info
                                course['time_slots'] = schedule_course[0]['time_slots']
                                course['description'] = schedule_course[0].get('description', course['description'])
                                print(f"Successfully enhanced {course['code']} with schedule info")
                            enhanced_courses.append(course)
                        else:
                            enhanced_courses.append(course)
                    except Exception as e:
                        print(f"Error enhancing course {course['code']}: {e}")
                        enhanced_courses.append(course)
                
                courses = enhanced_courses
        
        if not courses:
            return jsonify({
                'error': 'No course information found on this page. The website might not contain course listings or use a different format.',
                'suggestions': [
                    'Try a different page that specifically lists courses',
                    'Check if the URL points to a course catalog or department page',
                    'Some websites require JavaScript to load course data',
                    'Try a different university website or course catalog page'
                ]
            }), 404
        
        print(f"Successfully scraped {len(courses)} courses from {url}")
        
        # Return the scraped courses
        return jsonify({
            'message': f'Successfully scraped {len(courses)} courses',
            'courses': courses,
            'url': url,
            'total_found': len(courses)
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch URL: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Scraping failed: {str(e)}'}), 500

def construct_schedule_url(catalog_url, course_code):
    """Try to construct a schedule URL for a course based on the catalog URL"""
    try:
        # Extract department from course code
        dept = course_code[:3].upper()
        
        # Try different URL patterns for Illinois courses
        base_urls = [
            f"https://courses.illinois.edu/schedule/2025/fall/{dept}/{course_code[3:]}",
            f"https://courses.illinois.edu/schedule/2025/spring/{dept}/{course_code[3:]}",
            f"https://courses.illinois.edu/schedule/2024/fall/{dept}/{course_code[3:]}",
            f"https://courses.illinois.edu/schedule/2024/spring/{dept}/{course_code[3:]}"
        ]
        
        # Test which URL works
        for url in base_urls:
            try:
                response = requests.head(url, timeout=5)
                if response.status_code == 200:
                    return url
            except:
                continue
        
        return None
    except:
        return None

def scrape_catalog_page(url):
    """Scrape course catalog pages"""
    from bs4 import BeautifulSoup
    import re
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, 'html.parser')
    
    courses = []
    seen_codes = set()
    
    # Look for course listings in various formats
    course_selectors = [
        'table tr',  # Table rows
        '.course', '.course-item', '.course-listing',  # Common CSS classes
        '[class*="course"]',  # Classes containing "course"
        'li',  # List items
        '.program-course', '.degree-course',  # Program-specific classes
        'table tbody tr',  # More specific table rows
        '[class*="schedule"]',  # Schedule-related classes
        '[class*="section"]'  # Section-related classes
    ]
    
    for selector in course_selectors:
        elements = soup.select(selector)
        if elements:
            for element in elements[:100]:
                course_info = extract_course_info(element)
                if course_info and course_info.get('code') and course_info['code'] not in seen_codes:
                    courses.append(course_info)
                    seen_codes.add(course_info['code'])
    
    # If no courses found with specific selectors, try general text parsing
    if not courses:
        courses = extract_courses_from_text(soup.get_text())
        unique_courses = []
        seen_codes = set()
        for course in courses:
            if course['code'] not in seen_codes:
                unique_courses.append(course)
                seen_codes.add(course['code'])
        courses = unique_courses
    
    return courses

def scrape_schedule_page(url):
    """Scrape individual course schedule pages"""
    from bs4 import BeautifulSoup
    import re
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Extract course code from URL
    url_parts = url.split('/')
    course_code = None
    for part in url_parts:
        if any(dept in part.upper() for dept in ['CS', 'CSE', 'MATH', 'ENG', 'PHYS', 'ANSC', 'CHEM', 'BIOL']):
            # Find the next part which should be the course number
            try:
                idx = url_parts.index(part)
                if idx + 1 < len(url_parts):
                    course_code = f"{part.upper()}{url_parts[idx + 1]}"
                    print(f"Debug: Found course code: {course_code}")
                    break
            except:
                pass
    
    if not course_code:
        return []
    
    # Extract course information from the page
    text = soup.get_text()
    
    # Look for course name - try multiple approaches
    name = None
    
    # First, try to find the main course title
    title_elem = soup.find('h1')
    if title_elem:
        title_text = title_elem.get_text().strip()
        if course_code in title_text:
            # Extract the part after the course code
            name_match = re.search(rf'{course_code}\s*([A-Z][a-z\s&]+)', title_text)
            if name_match:
                name = name_match.group(1).strip()
    
    # If no name found, try other patterns
    if not name:
        name_patterns = [
            rf'{course_code}\s*([A-Z][a-z\s&]+)',
            r'#\s*([A-Z][a-z\s&]+)',
            r'([A-Z][a-z\s&]+)\s*Course',
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text)
            if match:
                name = match.group(1).strip()
                break
    
    # If still no name, try to find it in the page content
    if not name:
        # Look for text that might be a course name
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if (len(line) > 10 and len(line) < 100 and
                course_code in line and
                any(word in line.lower() for word in ['intro', 'survey', 'course', 'programming', 'analysis', 'sciences'])):
                # Extract the part after the course code
                name_match = re.search(rf'{course_code}\s*([A-Z][a-z\s&]+)', line)
                if name_match:
                    name = name_match.group(1).strip()
                    break
    
    if not name:
        name = f"{course_code} Course"
    
    # Extract credits
    credits = 3
    credit_patterns = [
        r'(\d+)\s*OR\s*(\d+)\s*hours?',
        r'(\d+)\s*to\s*(\d+)\s*hours?',
        r'(\d+)\s*hours?',
    ]
    
    for pattern in credit_patterns:
        match = re.search(pattern, text.lower())
        if match:
            if 'OR' in pattern or 'to' in pattern:
                credits = max(int(match.group(1)), int(match.group(2)))
            else:
                credits = int(match.group(1))
            break
    
    # Extract time slots from the page
    time_slots = []
    
    # First try to extract from JavaScript data (more reliable)
    script_tags = soup.find_all('script')
    for script in script_tags:
        if script.string and 'sectionDataObj' in script.string:
            # Extract the JavaScript object
            script_text = script.string
            match = re.search(r'var sectionDataObj = (\[.*?\]);', script_text, re.DOTALL)
            if match:
                try:
                    import json
                    # Clean up the JavaScript to make it valid JSON
                    json_str = match.group(1)
                    # Remove HTML tags and clean up
                    json_str = re.sub(r'<[^>]+>', '', json_str)
                    json_str = json_str.replace('\\/', '/')
                    
                    sections = json.loads(json_str)
                    
                    for section in sections:
                        if section.get('time') and section.get('day') and section.get('location'):
                            time_text = section['time']
                            day_text = section['day']
                            location_text = section['location']
                            
                            # Extract time
                            time_match = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))', time_text)
                            if time_match:
                                start_time = time_match.group(1)
                                end_time = time_match.group(2)
                                
                                # Convert day abbreviations
                                day_mapping = {
                                    'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 
                                    'Th': 'Thursday', 'F': 'Friday', 'S': 'Saturday', 'Su': 'Sunday',
                                    'TR': 'Tuesday,Thursday', 'MW': 'Monday,Wednesday'
                                }
                                
                                day = day_mapping.get(day_text.strip(), day_text.strip())
                                
                                # Clean location
                                room = re.sub(r'<[^>]+>', '', location_text).strip()
                                
                                time_slots.append({
                                    'day': day,
                                    'start_time': start_time,
                                    'end_time': end_time,
                                    'room': room
                                })
                except Exception as e:
                    print(f"Error parsing JavaScript data: {e}")
                    pass
    
    # Fallback: Look for time patterns in tables
    if not time_slots:
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 4:  # Need at least Time, Day, Location columns
                    row_text = ' '.join([cell.get_text().strip() for cell in cells])
                    
                    # Look for time patterns
                    time_match = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))', row_text)
                    if time_match:
                        start_time = time_match.group(1)
                        end_time = time_match.group(2)
                        
                        # Look for day and room in the same row
                        day = 'Monday'
                        room = 'TBD'
                        
                        for cell in cells:
                            cell_text = cell.get_text().strip()
                            # Check for days
                            if any(day_name in cell_text for day_name in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']):
                                day = cell_text
                            # Check for room patterns
                            elif re.search(r'[A-Z]{2,4}\s*\d{3,4}|[A-Z][a-z]+\s+(?:Hall|Building|Laboratory|Center)', cell_text):
                                room = cell_text
                        
                        time_slots.append({
                            'day': day,
                            'start_time': start_time,
                            'end_time': end_time,
                            'room': room
                        })
    
    # Try to extract course description
    description = ''
    
    # Look for description in various places
    desc_selectors = ['p', '.description', '.course-desc', '.summary']
    for selector in desc_selectors:
        desc_elem = soup.select_one(selector)
        if desc_elem:
            desc_text = desc_elem.get_text().strip()
            if (len(desc_text) > 20 and 
                course_code not in desc_text and
                'university' not in desc_text.lower() and
                'illinois' not in desc_text.lower() and
                'login' not in desc_text.lower()):  # Avoid page headers
                description = desc_text
                break
    
    # If no description found, try to extract from text around course info
    if not description:
        # Look for text that might be a course description
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if (len(line) > 30 and 
                course_code not in line and 
                'credit' not in line.lower() and
                'hour' not in line.lower()):
                description = line
                break
    
    # Convert time slots to JSON string
    time_slots_json = json.dumps(time_slots) if time_slots else ''
    
    return [{
        'code': course_code,
        'name': name,
        'description': description,
        'credits': credits,
        'department': course_code[:3],
        'prerequisites': '',
        'semester': 'Both',
        'year': 2025,
        'time_slots': time_slots_json,
        'max_capacity': 0,
        'current_enrollment': 0
    }]

def extract_course_info(element):
    """Extract course information from a DOM element"""
    try:
        # Try to find course code (usually starts with letters like CS, MATH, etc.)
        code = None
        text = element.get_text()
        
        # Look for course code patterns
        import re
        code_patterns = [
            r'\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b',  # CS 101, MATH 201A
            r'\b([A-Z]{2,4}-\d{3,4})\b',  # CS-101, MATH-201
            r'\b([A-Z]{2,4}\d{3,4})\b',   # CS101, MATH201
        ]
        
        for pattern in code_patterns:
            match = re.search(pattern, text)
            if match:
                # Clean up the code: remove spaces, dashes, and non-breaking spaces
                code = match.group(1).replace(' ', '').replace('-', '').replace('\u00a0', '').strip()
                break
        
        if not code:
            return None
        
        # Try to find course name
        name = None
        name_selectors = ['h3', 'h4', '.course-name', '.course-title', 'strong', 'b', '.title', 'h5']
        for selector in name_selectors:
            name_elem = element.select_one(selector)
            if name_elem:
                name = name_elem.get_text().strip()
                if name and len(name) > 3:  # Ensure name is meaningful
                    break
        
        if not name:
            # Try to extract name from text around the code
            code_index = text.find(code)
            if code_index != -1:
                # Look for text after the code
                after_code = text[code_index + len(code):].strip()
                if after_code:
                    # Take first line or first 100 characters, but skip if it's just punctuation
                    potential_name = after_code.split('\n')[0][:100].strip()
                    if potential_name and not potential_name.startswith((':', '-', '(', '[')):
                        # Clean up the name: remove extra whitespace and common artifacts
                        name = potential_name.replace('\u00a0', ' ').replace('\u2002', ' ').strip()
                        # If name is too short or just punctuation, try to find better text
                        if len(name) < 5 or name.startswith(('credit', 'Hour', 'Hours')):
                            # Look for text before the code
                            before_code = text[max(0, code_index - 200):code_index].strip()
                            if before_code:
                                lines = before_code.split('\n')
                                for line in reversed(lines):
                                    line = line.strip()
                                    if line and len(line) > 5 and not line.startswith(('credit', 'Hour', 'Hours')):
                                        name = line.replace('\u00a0', ' ').replace('\u2002', ' ').strip()
                                        break
                
                        # If still no good name, try to extract from the full text more intelligently
        if not name or len(name) < 5:
            # Look for text that contains the course code and looks like a course name
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                if code in line and len(line) > len(code) + 10:
                    # This line contains the code and has substantial additional text
                    # Extract the part after the code
                    code_pos = line.find(code)
                    after_code_text = line[code_pos + len(code):].strip()
                    if after_code_text and len(after_code_text) > 5:
                        # Clean up the potential name
                        name = after_code_text.replace('\u00a0', ' ').replace('\u2002', ' ').strip()
                        # Remove common artifacts
                        if name.startswith((':', '-', '(', '[')):
                            name = name[1:].strip()
                        if name.endswith((':', '-', ')', ']')):
                            name = name[:-1].strip()
                        if len(name) > 5:
                            break
            
            # If still no name, try to find any meaningful text in the element
            if not name or len(name) < 5:
                # Look for any text that might be a course name
                all_text = element.get_text()
                lines = all_text.split('\n')
                for line in lines:
                    line = line.strip()
                    # Skip if line is too short, contains the code, or is just punctuation
                    if (len(line) > 10 and 
                        code not in line and 
                        not line.startswith(('credit', 'Hour', 'Hours', '(', '[', '{')) and
                        not line.endswith((')', ']', '}', ':', '-'))):
                        # This might be a course name
                        name = line.replace('\u00a0', ' ').replace('\u2002', ' ').strip()
                        if len(name) > 5:
                            break
        
        # Try to find credits
        credits = 3  # Default
        credit_patterns = [
            r'(\d+)\s*credit',
            r'(\d+)\s*cr',
            r'(\d+)\s*unit',
            r'credit:\s*(\d+)\s*Hour',  # Illinois format: "credit: 1 Hour"
            r'credit:\s*(\d+)\s*Hours',  # Illinois format: "credit: 3 Hours"
            r'(\d+)\s*OR\s*(\d+)\s*hours?',  # Illinois format: "3 OR 4 hours"
            r'(\d+)\s*to\s*(\d+)\s*hours?'   # Range format: "3 to 4 hours"
        ]
        
        for pattern in credit_patterns:
            match = re.search(pattern, text.lower())
            if match:
                if 'OR' in pattern or 'to' in pattern:
                    # For ranges, take the higher number
                    credits = max(int(match.group(1)), int(match.group(2)))
                else:
                    credits = int(match.group(1))
                break
        
        # Try to find department
        department = code[:2] if len(code) >= 2 else 'Unknown'
        
        # Try to find description
        description = ''
        desc_selectors = ['.description', '.course-desc', 'p', '.summary']
        for selector in desc_selectors:
            desc_elem = element.select_one(selector)
            if desc_elem:
                description = desc_elem.get_text().strip()
                break
        
        # Try to extract time slots, days, and room information
        time_slots = []
        
        # Look for time patterns in the text
        time_patterns = [
            r'(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))',  # 9:00 AM - 10:30 AM
            r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})',  # 9:00 - 10:30
        ]
        
        # Look for day patterns
        day_patterns = [
            r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b',
            r'\b(M|T|W|Th|F|S|Su)\b'
        ]
        
        # Look for room/location patterns
        room_patterns = [
            r'([A-Z]{2,4}\s*\d{3,4})',  # Building codes like "DCL 1302"
            r'([A-Z][a-z]+\s+(?:Hall|Building|Laboratory|Center|Room))',  # "Digital Computer Laboratory"
            r'([A-Z][a-z]+\s+[A-Z][a-z]+)',  # "Siebel Center"
        ]
        
        # Extract time information
        for pattern in time_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                start_time = match.group(1)
                end_time = match.group(2)
                
                # Find associated day and room
                day = 'Monday'  # Default
                room = 'TBD'
                
                # Look for day in nearby text
                for day_pattern in day_patterns:
                    day_match = re.search(day_pattern, text[max(0, match.start()-100):match.end()+100])
                    if day_match:
                        day = day_match.group(1)
                        break
                
                # Look for room in nearby text
                for room_pattern in room_patterns:
                    room_match = re.search(room_pattern, text[max(0, match.start()-100):match.end()+100])
                    if room_match:
                        room = room_match.group(1)
                        break
                
                time_slots.append({
                    'day': day,
                    'start_time': start_time,
                    'end_time': end_time,
                    'room': room
                })
        
        # Convert time slots to JSON string for storage
        time_slots_json = json.dumps(time_slots) if time_slots else ''
        
        # Ensure we have a meaningful name
        if not name or len(name) < 5 or name.lower() in ['courses', 'course']:
            # Try to create a better fallback name
            if description and len(description) > 10:
                # Use first part of description as name
                desc_lines = description.split('\n')
                for line in desc_lines:
                    line = line.strip()
                    if line and len(line) > 10 and not line.startswith(('credit', 'Hour', 'Hours')):
                        name = line[:100].replace('\u00a0', ' ').replace('\u2002', ' ').strip()
                        break
            
            # If still no good name, use a generic but informative one
            if not name or len(name) < 5:
                name = f'{code} Course'
        
        return {
            'code': code,
            'name': name,
            'description': description,
            'credits': credits,
            'department': department,
            'prerequisites': '',
            'semester': 'Both',
            'year': 2025,
            'time_slots': time_slots_json,
            'max_capacity': 0,
            'current_enrollment': 0
        }
        
    except Exception as e:
        print(f"Error extracting course info: {e}")
        return None

def extract_courses_from_text(text):
    """Extract course information from plain text"""
    courses = []
    
    # Look for course patterns in text
    import re
    code_patterns = [
        r'\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b',  # CS 101, MATH 201A
        r'\b([A-Z]{2,4}-\d{3,4})\b',  # CS-101, MATH-201
        r'\b([A-Z]{2,4}\d{3,4})\b',   # CS101, MATH201
    ]
    
    for pattern in code_patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            # Clean up the code: remove spaces, dashes, and non-breaking spaces
            code = match.group(1).replace(' ', '').replace('-', '').replace('\u00a0', '').strip()
            
            # Look for text around the code
            start = max(0, match.start() - 200)
            end = min(len(text), match.end() + 200)
            context = text[start:end]
            
            # Try to extract name from context
            name = f'{code} Course'
            lines = context.split('\n')
            for line in lines:
                if code in line and len(line.strip()) > len(code) + 5:
                    name = line.strip()
                    break
            
            courses.append({
                'code': code,
                'name': name,
                'description': '',
                'credits': 3,
                'department': code[:2] if len(code) >= 2 else 'Unknown',
                'prerequisites': '',
                'semester': 'Both',
                'year': 2025,
                'time_slots': '',
                'max_capacity': 0,
                'current_enrollment': 0
            })
    
    return courses

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5003) 