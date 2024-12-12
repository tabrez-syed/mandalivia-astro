# Twitter Thread Publisher PRD

[Previous content remains unchanged until Enhancement 1 section]

## Enhancement 1: Adding Images

### Overview
Add support for attaching an image to the first tweet in a thread using YAML frontmatter in the markdown file.

### Input Format

Thread files now support YAML frontmatter with an optional `image` property:

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
   - Must be in 16:9 aspect ratio
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

### Error Handling

1. **Fatal Errors (Script will abort)**
   - Malformed frontmatter
   - Invalid image path format
   - Image file not found
   - Image path not under src/assets/images/
   
2. **Runtime Errors**
   - Media upload failures
   - Clear error messages for each case

### Example Usage

```markdown
---
image: src/assets/images/2024-11-20-hummingbird.webp
---

🧵 Here's a puzzle nature had to solve: How do you design a bird that needs to hover in front of flowers but can't have big wings?

The answer changed everything we knew about flight. (1/5)
...
```

### Command Line Interface

No changes to existing CLI commands. Image handling is automatic when present in frontmatter:

```bash
# All existing commands work the same
node scripts/twitter-publish.js twitter/thread.md
node scripts/twitter-publish.js twitter/thread.md --preview
node scripts/twitter-publish.js twitter/thread.md --dry-run
```

### Console Output Updates

Preview and dry-run modes now show image information:

```
Found 5 tweets in thread
Image: src/assets/images/example.webp
✓ Image found and valid

Tweet 1/5 (140 chars + image):
[tweet content]

Tweet 2/5 (180 chars):
[tweet content]
...
```

[Rest of the original content remains unchanged]
---
image: src/assets/images/2024-11-20-hummingbird.webp
---

🧵 Here's a puzzle nature had to solve: How do you design a bird that needs to hover in front of flowers but can't have big wings?

The answer changed everything we knew about flight. (1/5)
...
```

### Command Line Interface

No changes to existing CLI commands. Image handling is automatic when present in frontmatter:

```bash
# All existing commands work the same
node scripts/twitter-publish.js twitter/thread.md
node scripts/twitter-publish.js twitter/thread.md --preview
node scripts/twitter-publish.js twitter/thread.md --dry-run
```

### Console Output Updates

Preview and dry-run modes now show image information:

```
Found 5 tweets in thread
Image: src/assets/images/example.webp

Tweet 1/5 (140 chars + image):
[tweet content]
✓ Image found and valid

Tweet 2/5 (180 chars):
[tweet content]
...
```

[Rest of the original content remains unchanged]
