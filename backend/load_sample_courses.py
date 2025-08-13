#!/usr/bin/env python3
"""
Script to load a sample of courses from multiple departments
for testing the Smart Course Scheduler.
"""

import pandas as pd
import json
from datetime import datetime
import sys
import os

# Add the current directory to Python path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Course

def create_sample_courses():
    """Create a sample set of courses from multiple departments"""
    
    sample_courses = [
        # Computer Science
        {
            'course_code': 'CS101',
            'course_name': 'Introduction to Computer Science',
            'description': 'Fundamental concepts of programming and computer science',
            'credits': 3,
            'department': 'CS',
            'prerequisites': json.dumps([]),
            'semester': 'Both',
            'year': 2025,
            'time_slots': json.dumps([
                {"day": "Monday", "start_time": "09:00", "end_time": "10:30", "room": "CS Building 101"},
                {"day": "Wednesday", "start_time": "09:00", "end_time": "10:30", "room": "CS Building 101"}
            ]),
            'max_capacity': 30,
            'current_enrollment': 25
        },
        {
            'course_code': 'CS201',
            'course_name': 'Data Structures and Algorithms',
            'description': 'Advanced programming concepts and algorithm design',
            'credits': 4,
            'department': 'CS',
            'prerequisites': json.dumps(['CS101']),
            'semester': 'Both',
            'year': 2025,
            'time_slots': json.dumps([
                {"day": "Tuesday", "start_time": "14:00", "end_time": "15:30", "room": "CS Building 201"},
                {"day": "Thursday", "start_time": "14:00", "end_time": "15:30", "room": "CS Building 201"}
            ]),
            'max_capacity': 25,
            'current_enrollment': 20
        },
        # Mathematics
        {
            'course_code': 'MATH101',
            'course_name': 'Calculus I',
            'description': 'Limits, derivatives, and applications',
            'credits': 4,
            'department': 'MATH',
            'prerequisites': json.dumps([]),
            'semester': 'Both',
            'year': 2025,
            'time_slots': json.dumps([
                {"day": "Monday", "start_time": "11:00", "end_time": "12:30", "room": "Math Building 101"},
                {"day": "Wednesday", "start_time": "11:00", "end_time": "12:30", "room": "Math Building 101"},
                {"day": "Friday", "start_time": "11:00", "end_time": "12:30", "room": "Math Building 101"}
            ]),
            'max_capacity': 35,
            'current_enrollment': 30
        },
        # Physics
        {
            'course_code': 'PHYS101',
            'course_name': 'Physics for Scientists and Engineers',
            'description': 'Mechanics, thermodynamics, and wave motion',
            'credits': 4,
            'department': 'PHYS',
            'prerequisites': json.dumps(['MATH101']),
            'semester': 'Both',
            'year': 2025,
            'time_slots': json.dumps([
                {"day": "Tuesday", "start_time": "10:00", "end_time": "11:30", "room": "Physics Building 101"},
                {"day": "Thursday", "start_time": "10:00", "end_time": "11:30", "room": "Physics Building 101"}
            ]),
            'max_capacity': 40,
            'current_enrollment': 35
        },
        # English
        {
            'course_code': 'ENG101',
            'course_name': 'Composition and Rhetoric',
            'description': 'Writing and critical thinking skills',
            'credits': 3,
            'department': 'ENG',
            'prerequisites': json.dumps([]),
            'semester': 'Both',
            'year': 2025,
            'time_slots': json.dumps([
                {"day": "Monday", "start_time": "13:00", "end_time": "14:30", "room": "English Building 101"},
                {"day": "Wednesday", "start_time": "13:00", "end_time": "14:30", "room": "English Building 101"}
            ]),
            'max_capacity': 25,
            'current_enrollment': 20
        },
        # Chemistry
        {
            'course_code': 'CHEM101',
            'course_name': 'General Chemistry',
            'description': 'Fundamental principles of chemistry',
            'credits': 4,
            'department': 'CHEM',
            'prerequisites': json.dumps([]),
            'semester': 'Both',
            'year': 2025,
            'time_slots': json.dumps([
                {"day": "Tuesday", "start_time": "13:00", "end_time": "14:30", "room": "Chemistry Building 101"},
                {"day": "Thursday", "start_time": "13:00", "end_time": "14:30", "room": "Chemistry Building 101"}
            ]),
            'max_capacity': 45,
            'current_enrollment': 40
        }
    ]
    
    return sample_courses

def import_sample_courses():
    """Import sample courses to the database"""
    
    courses = create_sample_courses()
    
    try:
        with app.app_context():
            # Clear existing courses first
            Course.query.delete()
            db.session.commit()
            print("Cleared existing courses")
            
            # Add sample courses
            for course_data in courses:
                course = Course(
                    code=course_data['course_code'],
                    name=course_data['course_name'],
                    description=course_data['description'],
                    credits=course_data['credits'],
                    department=course_data['department'],
                    prerequisites=course_data['prerequisites'],
                    semester=course_data['semester'],
                    year=course_data['year'],
                    time_slots=course_data['time_slots'],
                    max_capacity=course_data['max_capacity'],
                    current_enrollment=course_data['current_enrollment']
                )
                db.session.add(course)
            
            db.session.commit()
            print(f"Successfully imported {len(courses)} sample courses to database")
            
            # Verify import
            total_courses = Course.query.count()
            print(f"Total courses in database: {total_courses}")
            
            # Show imported courses
            print("\nImported courses:")
            for course in Course.query.all():
                print(f"  {course.code}: {course.name} ({course.department})")
            
    except Exception as e:
        print(f"Error importing sample courses: {e}")
        try:
            with app.app_context():
                db.session.rollback()
        except:
            pass

def main():
    """Main function to load sample courses"""
    
    print("=== Sample Course Loader ===")
    print(f"Started at: {datetime.now()}")
    
    # Import sample courses
    import_sample_courses()
    
    print(f"Completed at: {datetime.now()}")

if __name__ == "__main__":
    main() 