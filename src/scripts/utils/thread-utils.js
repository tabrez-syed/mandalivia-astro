import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { THREAD_CONFIG, IMAGE_CONFIG } from '../config/constants.js';

// Helper to check if text contains thread numbering
function hasThreadNumbering(text) {
    return /\(\d+\/\d+\)/.test(text);
}

// Validate image path and existence
export async function validateImage(imagePath) {
    if (!imagePath) return null;

    // Validate path format
    if (!imagePath.startsWith(IMAGE_CONFIG.ALLOWED_PATH) || !imagePath.endsWith(IMAGE_CONFIG.ALLOWED_EXTENSION)) {
        throw new Error(`Image path must be in format: ${IMAGE_CONFIG.ALLOWED_PATH}[name]${IMAGE_CONFIG.ALLOWED_EXTENSION}`);
    }

    // Check if file exists
    try {
        await fs.access(imagePath);
        return imagePath;
    } catch (error) {
        throw new Error(`Image file not found: ${imagePath}`);
    }
}

// Validate individual post
export function validatePost(post, index, total, charLimit) {
    // Check length
    if (post.length > charLimit) {
        throw new Error(`Post ${index + 1} exceeds ${charLimit} characters`);
    }

    // Check thread numbering
    const threadNumbering = `(${index + 1}/${total})`;
    if (!post.includes(threadNumbering)) {
        throw new Error(`Post ${index + 1} missing correct thread numbering ${threadNumbering}`);
    }

    // Check first post starts with thread emoji
    if (index === 0 && !post.startsWith(THREAD_CONFIG.THREAD_EMOJI)) {
        throw new Error(`First post must start with ${THREAD_CONFIG.THREAD_EMOJI}`);
    }

    // Check for URLs (basic check)
    if (post.match(/https?:\/\/[^\s]+/)) {
        throw new Error(`Post ${index + 1} contains URLs which are not supported`);
    }
}

// Parse thread file
export async function parseThreadFile(filePath, charLimit) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Parse frontmatter
        let parsedContent;
        try {
            parsedContent = matter(content);
        } catch (error) {
            throw new Error('Invalid frontmatter format');
        }

        // Check if thread was already published
        if (parsedContent.data['publish-date']) {
            throw new Error(`Thread was already published on ${parsedContent.data['publish-date']}`);
        }

        // Validate image if present
        const imagePath = parsedContent.data.image;
        const validatedImagePath = await validateImage(imagePath);

        // Split content on double newlines and process each section
        let sections = parsedContent.content
            .split('\n\n')
            .map((section) => section.replace(/\n/g, ' ').trim())
            .filter((section) => section);

        // Combine sections that don't have thread numbering with the next section
        const posts = [];
        let currentPost = '';

        for (const section of sections) {
            if (currentPost && hasThreadNumbering(section)) {
                posts.push(`${currentPost} ${section}`);
                currentPost = '';
            } else if (hasThreadNumbering(section)) {
                posts.push(section);
            } else {
                currentPost = currentPost ? `${currentPost} ${section}` : section;
            }
        }

        // Add any remaining content
        if (currentPost) {
            posts.push(currentPost);
        }

        // Validate each post
        posts.forEach((post, index) => validatePost(post, index, posts.length, charLimit));

        return {
            posts,
            imagePath: validatedImagePath,
            frontmatter: parsedContent.data
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`Thread file not found: ${filePath}`);
        }
        throw error;
    }
}

// Update frontmatter with publish date and platform status
export async function updateFrontmatter(filePath, platforms) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsedContent = matter(content);

        // Get current date in YYYY-MM-DD format
        const today = new Date();
        const publishDate = today.toISOString().split('T')[0];

        // Update frontmatter
        parsedContent.data['publish-date'] = publishDate;
        parsedContent.data.platforms = platforms;

        // Convert back to string with frontmatter
        const updatedContent = matter.stringify(parsedContent.content, parsedContent.data);

        // Write back to file
        await fs.writeFile(filePath, updatedContent);
        console.log('✓ Added publishing metadata to frontmatter\n');
    } catch (error) {
        console.error('Error updating frontmatter:', error.message);
        // Don't throw error as this is not critical to the posting process
    }
}
