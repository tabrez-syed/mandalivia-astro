#!/usr/bin/env node

import { Command } from 'commander';
import { TwitterApi } from 'twitter-api-v2';
import { BskyAgent } from '@atproto/api';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import matter from 'gray-matter';

// Setup dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Validate environment variables based on platform
function validateEnvVars(platform) {
    const twitterVars = ['TWITTER_APP_KEY', 'TWITTER_APP_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET'];
    const blueskyVars = ['BLUESKY_USERNAME', 'BLUESKY_PASSWORD'];

    let requiredVars = [];
    if (platform === 'twitter' || platform === 'both') {
        requiredVars = [...requiredVars, ...twitterVars];
    }
    if (platform === 'bluesky' || platform === 'both') {
        requiredVars = [...requiredVars, ...blueskyVars];
    }

    for (const envVar of requiredVars) {
        if (!process.env[envVar]) {
            console.error(`Error: Missing required environment variable ${envVar}`);
            process.exit(1);
        }
    }
}

// Initialize clients based on platform
async function initializeClients(platform) {
    const clients = {};

    if (platform === 'twitter' || platform === 'both') {
        clients.twitter = new TwitterApi({
            appKey: process.env.TWITTER_APP_KEY,
            appSecret: process.env.TWITTER_APP_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_SECRET
        });
    }

    if (platform === 'bluesky' || platform === 'both') {
        const agent = new BskyAgent({
            service: 'https://bsky.social'
        });
        try {
            await agent.login({
                identifier: process.env.BLUESKY_USERNAME,
                password: process.env.BLUESKY_PASSWORD
            });
            clients.bluesky = agent;
        } catch (error) {
            console.error('Error logging into BlueSky:', error.message);
            throw new Error('Failed to authenticate with BlueSky');
        }
    }

    return clients;
}

// Helper to check if text contains thread numbering
function hasThreadNumbering(text) {
    return /\(\d+\/\d+\)/.test(text);
}

// Validate image path
async function validateImage(imagePath) {
    if (!imagePath) return null;

    // Validate path format
    if (!imagePath.startsWith('src/assets/images/') || !imagePath.endsWith('.webp')) {
        throw new Error('Image path must be in format: src/assets/images/[name].webp');
    }

    // Check if file exists
    try {
        await fs.access(imagePath);
        return imagePath;
    } catch (error) {
        throw new Error(`Image file not found: ${imagePath}`);
    }
}

// Upload media to platform
async function uploadMedia(imagePath, platform, clients) {
    if (platform === 'twitter') {
        try {
            const mediaId = await clients.twitter.v1.uploadMedia(imagePath);
            return { twitter: mediaId };
        } catch (error) {
            console.error('Error uploading media to Twitter:', error.message);
            throw new Error('Failed to upload image to Twitter');
        }
    } else if (platform === 'bluesky') {
        try {
            const imageData = await fs.readFile(imagePath);
            const response = await clients.bluesky.uploadBlob(imageData, { encoding: 'image/webp' });
            return { bluesky: response };
        } catch (error) {
            console.error('Error uploading media to BlueSky:', error.message);
            throw new Error('Failed to upload image to BlueSky');
        }
    } else if (platform === 'both') {
        const [twitterMedia, blueskyMedia] = await Promise.all([uploadMedia(imagePath, 'twitter', clients), uploadMedia(imagePath, 'bluesky', clients)]);
        return { ...twitterMedia, ...blueskyMedia };
    }
}

// Validation functions
function validatePost(post, index, total, platform) {
    const charLimit = platform === 'bluesky' ? 300 : 280;

    // Check length
    if (post.length > charLimit) {
        throw new Error(`Post ${index + 1} exceeds ${charLimit} characters for ${platform}`);
    }

    // Check thread numbering
    const threadNumbering = `(${index + 1}/${total})`;
    if (!post.includes(threadNumbering)) {
        throw new Error(`Post ${index + 1} missing correct thread numbering ${threadNumbering}`);
    }

    // Check first post starts with 🧵
    if (index === 0 && !post.startsWith('🧵')) {
        throw new Error('First post must start with 🧵');
    }

    // Check for URLs (basic check)
    if (post.match(/https?:\/\/[^\s]+/)) {
        throw new Error(`Post ${index + 1} contains URLs which are not supported`);
    }
}

// Parse thread file
async function parseThreadFile(filePath, platform) {
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

        // Validate each post for the specified platform(s)
        if (platform === 'both') {
            posts.forEach((post, index) => {
                validatePost(post, index, posts.length, 'twitter');
                validatePost(post, index, posts.length, 'bluesky');
            });
        } else {
            posts.forEach((post, index) => validatePost(post, index, posts.length, platform));
        }

        return { posts, imagePath: validatedImagePath };
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`Thread file not found: ${filePath}`);
        }
        throw error;
    }
}

// Display preview
function displayPreview(posts, imagePath, platform) {
    console.log(`Found ${posts.length} posts in thread\n`);

    if (imagePath) {
        console.log(`Image: ${imagePath}`);
        console.log('✓ Image found and valid\n');
    }

    if (platform === 'both') {
        console.log('Twitter Preview:');
    }

    posts.forEach((post, index) => {
        const imageInfo = index === 0 && imagePath ? ' + image' : '';
        const platformName = platform === 'both' ? 'Tweet' : platform === 'twitter' ? 'Tweet' : 'Post';
        console.log(`${platformName} ${index + 1}/${posts.length} (${post.length} chars${imageInfo}):`);
        console.log(post);
        console.log('---\n');
    });

    if (platform === 'both') {
        console.log('\nBlueSky Preview:');
        posts.forEach((post, index) => {
            const imageInfo = index === 0 && imagePath ? ' + image' : '';
            console.log(`Post ${index + 1}/${posts.length} (${post.length} chars${imageInfo}):`);
            console.log(post);
            console.log('---\n');
        });
    }
}

// Simulate posting (dry run)
function simulatePosting(posts, imagePath, platform) {
    console.log(`DRY RUN - No posts will be published to ${platform}\n`);
    displayPreview(posts, imagePath, platform);
}

// Prompt for confirmation
function confirmPosting(posts, imagePath, platform) {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\nReady to post the following thread:');
        displayPreview(posts, imagePath, platform);

        const platformText = platform === 'both' ? 'Twitter and BlueSky' : platform;
        rl.question(`Do you want to proceed with posting to ${platformText}? (y/N) `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// Update frontmatter with publish date
async function updatePublishDate(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsedContent = matter(content);

        // Get current date in YYYY-MM-DD format
        const today = new Date();
        const publishDate = today.toISOString().split('T')[0];

        // Add publish-date to frontmatter
        parsedContent.data['publish-date'] = publishDate;

        // Convert back to string with frontmatter
        const updatedContent = matter.stringify(parsedContent.content, parsedContent.data);

        // Write back to file
        await fs.writeFile(filePath, updatedContent);
        console.log('✓ Added publish date to frontmatter\n');
    } catch (error) {
        console.error('Error updating publish date:', error.message);
        // Don't throw error as this is not critical to the posting process
    }
}

// Post to BlueSky
async function postBlueSkyThread(posts, imagePath, mediaId, agent) {
    const postIds = [];

    try {
        console.log('Verifying BlueSky credentials...');
        const profile = await agent.getProfile();
        console.log(`✓ Authenticated as @${profile.data.handle}\n`);

        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            console.log(`Posting to BlueSky ${i + 1}/${posts.length}...`);

            const postData = {
                text: post,
                ...(i > 0 && { reply: { parent: { uri: postIds[i - 1].uri, cid: postIds[i - 1].cid } } }),
                ...(i === 0 &&
                    mediaId && {
                        embed: {
                            $type: 'app.bsky.embed.images',
                            images: [{ image: mediaId.bluesky.data, alt: 'Thread image' }]
                        }
                    })
            };

            try {
                const response = await agent.post(postData);
                postIds.push({ uri: response.uri, cid: response.cid });
                console.log('✓ Posted successfully to BlueSky\n');
            } catch (error) {
                console.error('Error posting to BlueSky:', error.message);
                throw error;
            }
        }

        return postIds;
    } catch (error) {
        console.error('Error posting to BlueSky:', error.message);
        throw error;
    }
}

// Post to Twitter
async function postTwitterThread(posts, imagePath, mediaId, client) {
    const tweetIds = [];

    try {
        console.log('Verifying Twitter credentials...');
        try {
            const verifyResponse = await client.v2.me();
            console.log(`✓ Authenticated as @${verifyResponse.data.username}\n`);
        } catch (verifyError) {
            console.error('Error verifying Twitter credentials:', verifyError.message);
            throw new Error('Failed to verify Twitter credentials');
        }

        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const tweetData = {
                text: post,
                ...(i > 0 && { reply: { in_reply_to_tweet_id: tweetIds[i - 1] } }),
                ...(i === 0 && mediaId && { media: { media_ids: [mediaId.twitter] } })
            };

            console.log(`Posting tweet ${i + 1}/${posts.length}...`);
            try {
                const response = await client.v2.tweet(tweetData);
                tweetIds.push(response.data.id);
                console.log('✓ Posted successfully to Twitter\n');
            } catch (error) {
                console.error('Error posting to Twitter:', error.message);
                throw error;
            }
        }

        return tweetIds;
    } catch (error) {
        console.error('Error posting to Twitter:', error.message);
        throw error;
    }
}

// Post thread to selected platform(s)
async function postThread(posts, imagePath, filePath, platform, clients) {
    try {
        let mediaId = null;
        if (imagePath) {
            console.log('Uploading image...');
            mediaId = await uploadMedia(imagePath, platform, clients);
            console.log('✓ Image uploaded successfully\n');
        }

        if (platform === 'twitter' || platform === 'both') {
            await postTwitterThread(posts, imagePath, mediaId, clients.twitter);
        }

        if (platform === 'bluesky' || platform === 'both') {
            await postBlueSkyThread(posts, imagePath, mediaId, clients.bluesky);
        }

        // Update frontmatter with publish date after successful posting
        await updatePublishDate(filePath);

        return true;
    } catch (error) {
        console.error('Error posting thread:', error.message);
        throw error;
    }
}

// Main function
async function main() {
    const program = new Command();

    program
        .name('twitter-publish')
        .description('Publish a thread to Twitter and/or BlueSky from a markdown file')
        .argument('<file>', 'Thread markdown file path')
        .option('--platform <platform>', 'Platform to post to (twitter, bluesky, or both)', 'twitter')
        .option('--dry-run', 'Validate and preview without posting')
        .option('--preview', 'Preview the thread without posting')
        .parse(process.argv);

    const options = program.opts();
    const [filePath] = program.args;

    // Validate platform option
    const validPlatforms = ['twitter', 'bluesky', 'both'];
    if (!validPlatforms.includes(options.platform)) {
        console.error('Error: Invalid platform. Must be one of: twitter, bluesky, both');
        process.exit(1);
    }

    try {
        // Validate environment variables for selected platform
        validateEnvVars(options.platform);

        // Initialize clients if needed
        const clients = options.preview || options.dryRun ? null : await initializeClients(options.platform);

        // Ensure file path is relative to publish/twitter directory
        const fullPath = path.join(process.cwd(), 'publish', 'twitter', filePath);
        const { posts, imagePath } = await parseThreadFile(fullPath, options.platform);

        if (options.preview) {
            displayPreview(posts, imagePath, options.platform);
            return;
        }

        if (options.dryRun) {
            simulatePosting(posts, imagePath, options.platform);
            return;
        }

        // Get confirmation before posting
        const confirmed = await confirmPosting(posts, imagePath, options.platform);
        if (!confirmed) {
            console.log('Posting cancelled');
            return;
        }

        // Post the thread
        await postThread(posts, imagePath, fullPath, options.platform, clients);
        console.log(`Thread posted successfully to ${options.platform}! 🎉`);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
