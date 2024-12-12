#!/usr/bin/env node

import { Command } from 'commander';
import { TwitterApi } from 'twitter-api-v2';
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

// Validate environment variables
const requiredEnvVars = ['TWITTER_APP_KEY', 'TWITTER_APP_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET'];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Error: Missing required environment variable ${envVar}`);
        process.exit(1);
    }
}

// Initialize Twitter client
const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET
});

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

// Upload media to Twitter
async function uploadMedia(imagePath) {
    try {
        const mediaId = await twitterClient.v1.uploadMedia(imagePath);
        return mediaId;
    } catch (error) {
        console.error('Error uploading media:');
        console.error('Status:', error.code);
        console.error('Message:', error.data?.detail || error.message);
        if (error.data?.errors) {
            console.error('API Errors:', JSON.stringify(error.data.errors, null, 2));
        }
        throw new Error('Failed to upload image to Twitter');
    }
}

// Validation functions
function validateTweet(tweet, index, total) {
    // Check length
    if (tweet.length > 280) {
        throw new Error(`Tweet ${index + 1} exceeds 280 characters`);
    }

    // Check thread numbering
    const threadNumbering = `(${index + 1}/${total})`;
    if (!tweet.includes(threadNumbering)) {
        throw new Error(`Tweet ${index + 1} missing correct thread numbering ${threadNumbering}`);
    }

    // Check first tweet starts with 🧵
    if (index === 0 && !tweet.startsWith('🧵')) {
        throw new Error('First tweet must start with 🧵');
    }

    // Check for URLs (basic check)
    if (tweet.match(/https?:\/\/[^\s]+/)) {
        throw new Error(`Tweet ${index + 1} contains URLs which are not supported`);
    }
}

// Parse thread file
async function parseThreadFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Parse frontmatter
        let parsedContent;
        try {
            parsedContent = matter(content);
        } catch (error) {
            throw new Error('Invalid frontmatter format');
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
        const tweets = [];
        let currentTweet = '';

        for (const section of sections) {
            if (currentTweet && hasThreadNumbering(section)) {
                // If we have accumulated content and find a section with numbering,
                // combine them and add to tweets
                tweets.push(`${currentTweet} ${section}`);
                currentTweet = '';
            } else if (hasThreadNumbering(section)) {
                // If this section has numbering but no accumulated content,
                // add it directly
                tweets.push(section);
            } else {
                // If this section has no numbering, accumulate it
                currentTweet = currentTweet ? `${currentTweet} ${section}` : section;
            }
        }

        // Add any remaining content
        if (currentTweet) {
            tweets.push(currentTweet);
        }

        // Validate each tweet
        tweets.forEach((tweet, index) => validateTweet(tweet, index, tweets.length));

        return { tweets, imagePath: validatedImagePath };
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error('Thread file not found');
        }
        throw error;
    }
}

// Display preview
function displayPreview(tweets, imagePath) {
    console.log(`Found ${tweets.length} tweets in thread\n`);

    if (imagePath) {
        console.log(`Image: ${imagePath}`);
        console.log('✓ Image found and valid\n');
    }

    tweets.forEach((tweet, index) => {
        const imageInfo = index === 0 && imagePath ? ' + image' : '';
        console.log(`Tweet ${index + 1}/${tweets.length} (${tweet.length} chars${imageInfo}):`);
        console.log(tweet);
        console.log('---\n');
    });
}

// Simulate posting (dry run)
function simulatePosting(tweets, imagePath) {
    console.log('DRY RUN - No tweets will be posted\n');
    displayPreview(tweets, imagePath);
}

// Prompt for confirmation
function confirmPosting(tweets, imagePath) {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\nReady to post the following thread:');
        displayPreview(tweets, imagePath);

        rl.question('Do you want to proceed with posting? (y/N) ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// Post thread
async function postThread(tweets, imagePath) {
    const tweetIds = [];

    try {
        // First, verify credentials
        console.log('Verifying Twitter credentials...');
        try {
            const verifyResponse = await twitterClient.v2.me();
            console.log(`✓ Authenticated as @${verifyResponse.data.username}\n`);
        } catch (verifyError) {
            console.error('Error verifying credentials:');
            console.error('Status:', verifyError.code);
            console.error('Message:', verifyError.data?.detail || verifyError.message);
            if (verifyError.data?.errors) {
                console.error('API Errors:', JSON.stringify(verifyError.data.errors, null, 2));
            }
            throw new Error('Failed to verify Twitter credentials');
        }

        // Upload image if present
        let mediaId = null;
        if (imagePath) {
            console.log('Uploading image...');
            mediaId = await uploadMedia(imagePath);
            console.log('✓ Image uploaded successfully\n');
        }

        for (let i = 0; i < tweets.length; i++) {
            const tweet = tweets[i];
            const tweetData = {
                text: tweet,
                // If not first tweet, reply to previous tweet
                ...(i > 0 && { reply: { in_reply_to_tweet_id: tweetIds[i - 1] } }),
                // If first tweet and we have an image, include media
                ...(i === 0 && mediaId && { media: { media_ids: [mediaId] } })
            };

            console.log(`Posting tweet ${i + 1}/${tweets.length}...`);
            try {
                const response = await twitterClient.v2.tweet(tweetData);
                tweetIds.push(response.data.id);
                console.log('✓ Posted successfully\n');
            } catch (tweetError) {
                console.error('Error details:');
                console.error('Status:', tweetError.code);
                console.error('Message:', tweetError.data?.detail || tweetError.message);
                if (tweetError.data?.errors) {
                    console.error('API Errors:', JSON.stringify(tweetError.data.errors, null, 2));
                }
                throw tweetError;
            }
        }

        return tweetIds;
    } catch (error) {
        console.error('Error posting tweet:', error.message);
        throw error;
    }
}

// Main function
async function main() {
    const program = new Command();

    program
        .name('twitter-publish')
        .description('Publish a Twitter thread from a markdown file')
        .argument('<file>', 'Thread markdown file path')
        .option('--dry-run', 'Validate and preview without posting')
        .option('--preview', 'Preview the thread without posting')
        .parse(process.argv);

    const options = program.opts();
    const [filePath] = program.args;

    try {
        // Ensure file path is relative to publish/twitter directory
        const fullPath = path.join(process.cwd(), 'publish', 'twitter', filePath);
        const { tweets, imagePath } = await parseThreadFile(fullPath);

        if (options.preview) {
            displayPreview(tweets, imagePath);
            return;
        }

        if (options.dryRun) {
            simulatePosting(tweets, imagePath);
            return;
        }

        // Get confirmation before posting
        const confirmed = await confirmPosting(tweets, imagePath);
        if (!confirmed) {
            console.log('Posting cancelled');
            return;
        }

        // Post the thread
        await postThread(tweets, imagePath);
        console.log('Thread posted successfully! 🎉');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
