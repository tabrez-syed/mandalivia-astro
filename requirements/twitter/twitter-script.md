# Twitter Thread Publisher PRD

## Overview

A command-line tool for publishing Twitter and BlueSky threads from markdown files, with support for images and scheduled posting.

## Core Features

1. **Thread Parsing**

   - Parse markdown files into tweet/post-sized chunks
   - Maintain thread numbering (1/N format)
   - Validate content lengths and formatting for each platform
     - Twitter: 280 characters
     - BlueSky: 300 characters

2. **Publishing**

   - Post threads to Twitter using API v2 and/or BlueSky using AT Protocol
   - Support for preview and dry-run modes
   - Track publishing status in frontmatter
   - Platform selection via command line flag (default: both platforms)
     ```bash
     --platform=twitter    # Post only to Twitter
     --platform=bluesky   # Post only to BlueSky
     --platform=both      # Post to both (default)
     ```

3. **Error Handling**
   - Validate content before posting
   - Provide clear error messages
   - Graceful failure handling
   - Platform-specific error reporting

## Enhancement 1: Adding Images

### Overview

Support for attaching an image to the first post in a thread using YAML frontmatter.

### Input Format

Thread files support YAML frontmatter with an optional `image` property:

```markdown
---
image: src/assets/images/example.webp
---

🧵 First post content (1/N)

Second post content (2/N)
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
   - Images are attached only to the first post in the thread
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

   - Use Twitter API v2's media upload endpoint for Twitter
   - Use AT Protocol's uploadBlob endpoint for BlueSky
   - Upload image before posting first post
   - Attach media ID to first post only
   - Handle upload failures gracefully

3. **Preview & Dry Run Updates**
   - Preview mode should show image path if present
   - Show "✓ Image found and valid" when image exists
   - Dry run should validate image exists
   - No actual media upload during dry run

## Enhancement 2: Scheduled Posting

### Overview

Support for scheduling tweets/posts to post at 8am Central Standard Time (CST) on weekdays.

### Requirements

1. **API Requirements**

   - Use Twitter API v2's scheduled tweets endpoint for Twitter
   - Handle scheduling-specific API errors
   - Note: BlueSky does not currently support scheduled posts, so these will be posted immediately

2. **Scheduling Logic**

   - Schedule tweets for 8am CST on next available weekday
   - If current day is weekend, schedule for Monday
   - If current time is after 8am CST, schedule for next weekday
   - If current time is before 8am CST same day, schedule for today
   - BlueSky posts will be made immediately when scheduling time is reached

3. **Frontmatter Updates**

   ```yaml
   ---
   image: src/assets/images/example.webp
   scheduled-date: 2024-01-01T14:00:00.000Z # Track scheduled time (8am CST in UTC)
   publish-date: 2024-01-01 # Added after successful scheduling/posting
   platforms:
     twitter: scheduled # or 'published' after posting
     bluesky: published # BlueSky posts are immediate
   ---
   ```

4. **Preview & Dry Run Updates**
   - Show scheduled posting time in preview mode
   - Validate scheduling parameters in dry run
   - Display timezone-aware scheduling information
   - Indicate which platforms content will be posted to

### Error Handling

1. **Fatal Errors (Script will abort)**
   - Malformed frontmatter
   - Invalid image path format
   - Image file not found
   - Image path not under src/assets/images/
   - Insufficient API access level
   - Invalid platform selection
2. **Runtime Errors**
   - Media upload failures
   - Scheduling failures
   - Platform-specific posting failures
   - Clear error messages for each case

### Command Line Interface

```bash
# All commands work the same, with optional platform selection
node scripts/twitter-publish.js twitter/thread.md
node scripts/twitter-publish.js twitter/thread.md --platform=twitter
node scripts/twitter-publish.js twitter/thread.md --platform=bluesky
node scripts/twitter-publish.js twitter/thread.md --preview
node scripts/twitter-publish.js twitter/thread.md --dry-run
```

### Console Output

```
Found 5 posts in thread
Image: src/assets/images/example.webp
✓ Image found and valid
Selected platforms: Twitter, BlueSky

Tweet 1/5 (140 chars + image):
[tweet content]

Tweet 2/5 (180 chars):
[tweet content]
...

✓ Thread scheduled for Twitter: Tuesday, January 1, 2024 at 8:00 AM CST
✓ Thread posted to BlueSky
✓ Added publishing metadata to frontmatter
```
