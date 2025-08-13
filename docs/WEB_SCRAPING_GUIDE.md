# 🌐 Web Scraping Guide for Smart Course Scheduler

## Overview
The Smart Course Scheduler now includes a powerful web scraping feature that allows you to automatically extract course information from university websites and course catalogs.

## 🚀 How to Use

### 1. Access the Feature
- Navigate to the **Course Dataset Manager** page
- Look for the **Web Scraping** section (green icon with globe)

### 2. Enter a URL
- Enter the URL of a university course catalog or department page
- Examples of good URLs:
  - `https://catalog.illinois.edu/courses-of-instruction/cs/`
  - `https://www.mit.edu/course-catalog/courses/6/`
  - `https://registrar.berkeley.edu/course-catalog/`

### 3. Start Scraping
- Click the **"Scrape Courses from URL"** button
- The system will analyze the webpage and extract course information
- Wait for the scraping process to complete

### 4. Review Results
- A dialog will open showing all scraped courses
- Each course displays:
  - Course code (e.g., CS101)
  - Course name
  - Credits
  - Department
  - Description (if available)

### 5. Select and Import
- Use checkboxes to select which courses to import
- Use **"Select All"** to choose all courses
- Click **"Import Selected Courses"** to add them to your database

## 🎯 What Gets Scraped

### Automatically Detected:
- **Course Codes**: CS101, MATH201, PHYS101A, etc.
- **Course Names**: Introduction to Computer Science, Calculus I, etc.
- **Credits**: Usually defaults to 3, but can detect from text
- **Department**: Extracted from course code prefix
- **Descriptions**: When available in the HTML

### Default Values:
- **Semester**: Set to "Both"
- **Year**: Set to 2025
- **Time Slots**: Empty (can be filled manually later)
- **Prerequisites**: Empty (can be filled manually later)

## 🔧 Technical Details

### Supported Website Formats:
- HTML tables with course listings
- Lists with course information
- Pages with CSS classes containing "course"
- General text content with course patterns

### Course Code Patterns Detected:
- `CS 101` → `CS101`
- `MATH-201` → `MATH201`
- `PHYS101A` → `PHYS101A`

### Limitations:
- JavaScript-heavy websites may not work
- Some websites block automated access
- Complex layouts may require manual review
- Maximum of 100 courses per scraping session

## 🚨 Troubleshooting

### "No courses found" Error:
- Try a different page on the same website
- Check if the URL points to a course listing page
- Some websites require JavaScript to load content
- Try a different university website

### "Failed to fetch URL" Error:
- Check if the URL is accessible
- Ensure the URL starts with `http://` or `https://`
- Some websites block automated requests

### Poor Quality Results:
- Try a different page on the same website
- Look for pages specifically designed to list courses
- Department pages often work better than general university pages

## 💡 Best Practices

### Choose Good URLs:
✅ **Good URLs:**
- Course catalog pages
- Department course listings
- Program requirement pages
- Academic calendar pages

❌ **Avoid:**
- Home pages
- News pages
- Student portal pages
- Pages requiring login

### Review Before Importing:
- Always review scraped courses before importing
- Check that course codes make sense
- Verify course names are meaningful
- Remove any obviously incorrect entries

### Start Small:
- Begin with a small department or program
- Test with 10-20 courses first
- Gradually expand to larger catalogs

## 🔒 Privacy and Ethics

### Respectful Scraping:
- Only scrape publicly accessible course information
- Don't overwhelm websites with requests
- Respect robots.txt files when possible
- Use reasonable delays between requests

### Data Usage:
- Scraped data is for personal use only
- Don't redistribute scraped course information
- Respect copyright and terms of service
- Use responsibly and ethically

## 🆘 Getting Help

If you encounter issues:
1. Check the error message for specific details
2. Try a different URL or website
3. Ensure your backend is running and updated
4. Check that required packages are installed
5. Review the troubleshooting section above

## 📝 Example URLs to Try

Here are some example URLs you can test with:

- **University of Illinois**: `https://catalog.illinois.edu/courses-of-instruction/cs/`
- **MIT**: `https://catalog.mit.edu/subjects/6/`
- **Stanford**: `https://explorecourses.stanford.edu/search?view=catalog&filter-coursestatus-Active=on&q=CS`
- **UC Berkeley**: `https://classes.berkeley.edu/search/class`

## 🎉 Success Tips

- Start with well-known university course catalogs
- Look for pages that list courses in a structured format
- Department pages often work better than general catalogs
- Be patient - some websites take time to load
- Don't hesitate to try multiple URLs from the same website

---

**Happy Course Scraping! 🎓✨**
