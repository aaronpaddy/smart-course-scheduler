# Course Loading Scripts

This directory contains scripts to load course data into the Smart Course Scheduler database.

## Scripts Available

### 1. `load_illinois_courses.py` - University of Illinois Course Loader

Loads real course data from the University of Illinois course catalog CSV.

**Features:**
- Downloads course data directly from: `https://waf.cs.illinois.edu/discovery/course-catalog.csv`
- Filters by department (e.g., CS for Computer Science)
- Removes duplicate courses
- Parses time slots and schedule information
- Exports transformed data to CSV
- Imports to database

**Usage:**
```bash
# Load all courses
python load_illinois_courses.py

# Load only Computer Science courses
python load_illinois_courses.py --department CS

# Load only first 100 courses as sample
python load_illinois_courses.py --sample

# Export to CSV without importing to database
python load_illinois_courses.py --export my_courses.csv --no-import

# Load CS courses and export to CSV
python load_illinois_courses.py --department CS --export cs_courses.csv
```

**Command Line Options:**
- `--department, -d`: Filter by department code (e.g., CS, MATH, PHYS)
- `--sample, -s`: Limit to first 100 courses
- `--export, -e`: Export to CSV file
- `--no-import`: Skip database import
- `--all, -a`: Import all courses (default)

### 2. `load_sample_courses.py` - Sample Course Loader

Creates a small set of sample courses for testing purposes.

**Features:**
- Creates 6 sample courses from different departments
- Includes realistic time slots and prerequisites
- Perfect for testing the scheduler functionality

**Usage:**
```bash
python load_sample_courses.py
```

## Data Structure

The scripts transform course data to match this database schema:

```python
{
    'course_code': 'CS101',           # Unique course identifier
    'course_name': 'Course Name',     # Full course title
    'description': 'Description',     # Course description
    'credits': 3,                     # Credit hours
    'department': 'CS',               # Department code
    'prerequisites': '[]',            # JSON array of prerequisites
    'semester': 'Both',               # Spring, Fall, Summer, or Both
    'year': 2025,                     # Academic year
    'time_slots': '[...]',            # JSON array of time slots
    'max_capacity': 50,               # Maximum enrollment
    'current_enrollment': 0           # Current enrollment
}
```

## Time Slot Format

Time slots are stored as JSON arrays with this structure:

```json
[
    {
        "day": "Monday",
        "start_time": "09:00",
        "end_time": "10:30",
        "room": "Building Name Room Number"
    }
]
```

## Prerequisites Format

Prerequisites are stored as JSON arrays of course codes:

```json
["CS101", "MATH101"]
```

## Examples

### Load Computer Science Courses Only
```bash
python load_illinois_courses.py --department CS
```
This will:
1. Download the full course catalog (12,321 courses)
2. Filter to CS courses only (422 courses)
3. Remove duplicates (85 unique courses)
4. Import to database

### Export Courses for Review
```bash
python load_illinois_courses.py --department MATH --export math_courses.csv --no-import
```
This will:
1. Download and filter Math courses
2. Export to `math_courses.csv`
3. Skip database import

### Quick Testing with Sample Data
```bash
python load_sample_courses.py
```
This creates 6 diverse courses perfect for testing the scheduler.

## Requirements

Make sure you have the required packages installed:
```bash
pip install pandas requests
```

## Notes

- The Illinois course data includes detailed schedule information
- Time slots are parsed from the original data when available
- Duplicate courses (multiple sections) are automatically removed
- The database is cleared before each import to avoid conflicts
- All courses are set to 2025 academic year by default 