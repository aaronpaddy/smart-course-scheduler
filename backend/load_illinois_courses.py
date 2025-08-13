#!/usr/bin/env python3
"""
Script to load course data from University of Illinois course catalog
and import it into the Smart Course Scheduler database.
"""

import pandas as pd
import requests
import json
from datetime import datetime
import sys
import os
import argparse

# Add the current directory to Python path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Course

def load_illinois_courses():
    """Load courses from University of Illinois course catalog CSV"""
    
    url = "https://waf.cs.illinois.edu/discovery/course-catalog.csv"
    
    try:
        print(f"Loading course data from: {url}")
        
        # Load the CSV data
        df = pd.read_csv(url)
        
        print(f"Loaded {len(df)} courses from CSV")
        print(f"Columns: {list(df.columns)}")
        
        # Display first few rows to understand the structure
        print("\nFirst 5 courses:")
        print(df.head())
        
        # Display data types and info
        print("\nData types:")
        print(df.dtypes)
        
        print("\nData info:")
        print(df.info())
        
        return df
        
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return None

def filter_courses_by_department(df, department_code):
    """Filter courses by department code (e.g., 'CS' for Computer Science)"""
    
    if df is None or df.empty:
        return df
    
    filtered_df = df[df['Subject'] == department_code].copy()
    print(f"Filtered to {len(filtered_df)} {department_code} courses")
    
    return filtered_df

def transform_illinois_data(df):
    """Transform Illinois course data to match our database schema"""
    
    if df is None or df.empty:
        print("No data to transform")
        return []
    
    courses = []
    seen_course_codes = set()  # Track unique course codes
    
    for index, row in df.iterrows():
        try:
            # Create proper course code (Subject + Number)
            subject = str(row.get('Subject', ''))
            number = str(row.get('Number', ''))
            course_code = f"{subject}{number}" if subject and number else f"CS{index}"
            
            # Skip if we've already seen this course code
            if course_code in seen_course_codes:
                continue
            
            seen_course_codes.add(course_code)
            
            # Get course name
            course_name = str(row.get('Name', f'Course {index}'))
            
            # Get description
            description = str(row.get('Description', ''))
            
            # Parse credit hours (handle both numeric and string values)
            credit_hours = row.get('Credit Hours', 3)
            try:
                credits = int(float(str(credit_hours)))
            except (ValueError, TypeError):
                credits = 3
            
            # Get department/subject
            department = str(row.get('Subject', 'Computer Science'))
            
            # Parse time slots from schedule information
            time_slots = []
            start_time = str(row.get('Start Time', ''))
            end_time = str(row.get('End Time', ''))
            days = str(row.get('Days of Week', ''))
            room = str(row.get('Room', ''))
            building = str(row.get('Building', ''))
            
            if start_time and end_time and days and room:
                # Parse days (e.g., "MWF" -> ["Monday", "Wednesday", "Friday"])
                day_mapping = {
                    'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 
                    'TH': 'Thursday', 'F': 'Friday', 'S': 'Saturday', 'U': 'Sunday'
                }
                
                parsed_days = []
                i = 0
                while i < len(days):
                    if i + 1 < len(days) and days[i:i+2] == 'TH':
                        parsed_days.append(day_mapping['TH'])
                        i += 2
                    elif days[i] in day_mapping:
                        parsed_days.append(day_mapping[days[i]])
                        i += 1
                    else:
                        i += 1
                
                for day in parsed_days:
                    time_slot = {
                        "day": day,
                        "start_time": start_time,
                        "end_time": end_time,
                        "room": f"{building} {room}".strip()
                    }
                    time_slots.append(time_slot)
            
            # Map semester terms
            term = str(row.get('Term', 'Spring')).lower()
            if 'spring' in term:
                semester = 'Spring'
            elif 'fall' in term:
                semester = 'Fall'
            elif 'summer' in term:
                semester = 'Summer'
            else:
                semester = 'Both'
            
            # Get year
            year = int(row.get('Year', 2025))
            
            # Create course data
            course_data = {
                'course_code': course_code,
                'course_name': course_name,
                'description': description,
                'credits': credits,
                'department': department,
                'prerequisites': json.dumps([]),  # Could parse from description later
                'semester': semester,
                'year': year,
                'time_slots': json.dumps(time_slots),
                'max_capacity': 50,  # Default value
                'current_enrollment': 0
            }
            
            # Only add courses with valid course codes and names
            if course_data['course_code'] and course_data['course_name']:
                courses.append(course_data)
                
        except Exception as e:
            print(f"Error processing row {index}: {e}")
            continue
    
    print(f"Transformed {len(courses)} unique courses (removed duplicates)")
    return courses

def import_to_database(courses):
    """Import transformed courses to the database"""
    
    if not courses:
        print("No courses to import")
        return
    
    try:
        with app.app_context():
            # Clear existing courses first
            Course.query.delete()
            db.session.commit()
            print("Cleared existing courses")
            
            # Add new courses
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
            print(f"Successfully imported {len(courses)} courses to database")
            
            # Verify import
            total_courses = Course.query.count()
            print(f"Total courses in database: {total_courses}")
            
    except Exception as e:
        print(f"Error importing to database: {e}")
        try:
            with app.app_context():
                db.session.rollback()
        except:
            pass  # Ignore rollback errors

def export_to_csv(courses, filename=None):
    """Export transformed courses to a local CSV file"""
    
    if not courses:
        print("No courses to export")
        return
    
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"illinois_courses_{timestamp}.csv"
    
    try:
        # Convert to DataFrame for easier CSV export
        df_export = pd.DataFrame(courses)
        
        # Export to CSV
        df_export.to_csv(filename, index=False)
        print(f"Exported {len(courses)} courses to {filename}")
        
        # Show sample of exported data
        print(f"\nSample of exported data:")
        print(df_export.head())
        
    except Exception as e:
        print(f"Error exporting to CSV: {e}")

def main():
    """Main function to load and import Illinois courses"""
    
    parser = argparse.ArgumentParser(description='Load University of Illinois courses into the database')
    parser.add_argument('--department', '-d', type=str, default=None, 
                       help='Filter courses by department code (e.g., CS for Computer Science)')
    parser.add_argument('--all', '-a', action='store_true', 
                       help='Import all courses (default)')
    parser.add_argument('--sample', '-s', action='store_true', 
                       help='Import only first 100 courses as a sample')
    parser.add_argument('--export', '-e', type=str, default=None,
                       help='Export courses to CSV file (optional filename)')
    parser.add_argument('--no-import', action='store_true',
                       help='Skip importing to database (useful for just exporting)')
    
    args = parser.parse_args()
    
    print("=== University of Illinois Course Loader ===")
    print(f"Started at: {datetime.now()}")
    
    # Load the CSV data
    df = load_illinois_courses()
    
    if df is not None:
        # Apply filters if specified
        if args.department:
            df = filter_courses_by_department(df, args.department.upper())
        elif args.sample:
            df = df.head(100)
            print(f"Limited to first 100 courses as sample")
        
        # Transform the data
        courses = transform_illinois_data(df)
        
        if courses:
            # Export to CSV if requested
            if args.export is not None:
                export_to_csv(courses, args.export)
            
            # Import to database unless --no-import is specified
            if not args.no_import:
                import_to_database(courses)
            else:
                print("Skipping database import (--no-import specified)")
        else:
            print("No valid courses found after transformation")
    else:
        print("Failed to load course data")
    
    print(f"Completed at: {datetime.now()}")

if __name__ == "__main__":
    main() 