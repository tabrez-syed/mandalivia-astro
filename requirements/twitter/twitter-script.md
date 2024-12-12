# Twitter Thread Publisher PRD

## Overview

A command-line tool for publishing Twitter threads from markdown files, with support for images and scheduled posting.

## Core Features

1. **Thread Parsing**

   - Parse markdown files into tweet-sized chunks
   - Maintain thread numbering (1/N format)
   - Validate tweet lengths and formatting

2. **Publishing**

   - Post threads to Twitter using API v2
   - Support for preview and dry-run modes
   - Track publishing status in frontmatter

3. **Error Handling**
   - Validate content before posting
   - Provide clear error messages
   - Graceful failure handling

## Enhancement 1: Adding Images

### Overview

Support for attaching an image to the first tweet in a thread using YAML frontmatter.

### Input Format

Thread files support YAML frontmatter with an optional `image` property:

```markdown
---
image: src/assets/images/example.webp
---

🧵 First tweet content (1/N)

Second tweet content (2/N)
...
```

### Image Requirements

1. **File Format**

   - WebP images only
   - Path must be in format: src/assets/images/[image name].webp
   - No other path formats are supported

2. **Path Resolution**

   - Image paths must be under src/assets/images/
   - Example: `src/assets/images/example.webp`
   - Paths outside this directory are not allowed

3. **Attachment Rules**
   - Images are attached only to the first tweet in the thread
   - One image per thread
   - Image property in frontmatter is optional

### Implementation Requirements

1. **Frontmatter Processing**

   - Parse YAML frontmatter using gray-matter package
   - Extract image path if present
   - Validate image path exists and matches required format
   - Abort if frontmatter is malformed
   - Abort if image path is invalid or file is missing

2. **Media Upload**

   - Use Twitter API v2's media upload endpoint
   - Upload image before posting first tweet
   - Attach media ID to first tweet only
   - Handle upload failures gracefully

3. **Preview & Dry Run Updates**
   - Preview mode should show image path if present
   - Show "✓ Image found and valid" when image exists
   - Dry run should validate image exists
   - No actual media upload during dry run

## Enhancement 2: Scheduled Posting

### Overview

Support for scheduling tweets to post at 8am Central Standard Time (CST) on weekdays.

### Requirements

1. **API Requirements**

   - Use Twitter API v2's scheduled tweets endpoint
   - Handle scheduling-specific API errors

2. **Scheduling Logic**

   - Schedule tweets for 8am CST on next available weekday
   - If current day is weekend, schedule for Monday
   - If current time is after 8am CST, schedule for next weekday
   - If current time is before 8am CST same day, schedule for today

3. **Frontmatter Updates**

   ```yaml
   ---
   image: src/assets/images/example.webp
   scheduled-date: 2024-01-01T14:00:00.000Z # Track scheduled time (8am CST in UTC)
   publish-date: 2024-01-01 # Added after successful scheduling
   ---
   ```

4. **Preview & Dry Run Updates**
   - Show scheduled posting time in preview mode
   - Validate scheduling parameters in dry run
   - Display timezone-aware scheduling information

### Error Handling

1. **Fatal Errors (Script will abort)**
   - Malformed frontmatter
   - Invalid image path format
   - Image file not found
   - Image path not under src/assets/images/
   - Insufficient API access level
2. **Runtime Errors**
   - Media upload failures
   - Scheduling failures
   - Clear error messages for each case

### Command Line Interface

```bash
# All commands work the same, now with scheduling
node scripts/twitter-publish.js twitter/thread.md
node scripts/twitter-publish.js twitter/thread.md --preview
node scripts/twitter-publish.js twitter/thread.md --dry-run
```

### Console Output

```
Found 5 tweets in thread
Image: src/assets/images/example.webp
✓ Image found and valid

Tweet 1/5 (140 chars + image):
[tweet content]

Tweet 2/5 (180 chars):
[tweet content]
...

✓ Thread scheduled for Tuesday, January 1, 2024 at 8:00 AM CST
✓ Added scheduling metadata to frontmatter
```
