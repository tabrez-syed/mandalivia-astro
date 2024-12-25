import { createInterface } from 'readline';
import { PLATFORMS } from '../config/constants.js';

// Display preview of posts
export function displayPreview(posts, imagePath, platform) {
    console.log(`Found ${posts.length} posts in thread\n`);

    if (imagePath) {
        console.log(`Image: ${imagePath}`);
        console.log('✓ Image found and valid\n');
    }

    const showTwitter = platform === PLATFORMS.TWITTER || platform === PLATFORMS.BOTH;
    const showBluesky = platform === PLATFORMS.BLUESKY || platform === PLATFORMS.BOTH;

    if (showTwitter) {
        console.log('Twitter Preview:');
        posts.forEach((post, index) => {
            const imageInfo = index === 0 && imagePath ? ' + image' : '';
            console.log(`Tweet ${index + 1}/${posts.length} (${post.length} chars${imageInfo}):`);
            console.log(post);
            console.log('---\n');
        });
    }

    if (showBluesky) {
        if (showTwitter) console.log('\n');
        console.log('BlueSky Preview:');
        posts.forEach((post, index) => {
            const imageInfo = index === 0 && imagePath ? ' + image' : '';
            console.log(`Post ${index + 1}/${posts.length} (${post.length} chars${imageInfo}):`);
            console.log(post);
            console.log('---\n');
        });
    }
}

// Simulate posting (dry run)
export function simulatePosting(posts, imagePath, platform) {
    const platformText = platform === PLATFORMS.BOTH ? 'Twitter and BlueSky' : platform;
    console.log(`DRY RUN - No posts will be published to ${platformText}\n`);
    displayPreview(posts, imagePath, platform);
}

// Prompt for confirmation
export function confirmPosting(posts, imagePath, platform) {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\nReady to post the following thread:');
        displayPreview(posts, imagePath, platform);

        const platformText = platform === PLATFORMS.BOTH ? 'Twitter and BlueSky' : platform;
        rl.question(`Do you want to proceed with posting to ${platformText}? (y/N) `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// Display success message
export function displaySuccess(platform) {
    const platformText = platform === PLATFORMS.BOTH ? 'Twitter and BlueSky' : platform;
    console.log(`\nThread posted successfully to ${platformText}! 🎉`);
}

// Display error message and exit
export function handleError(error) {
    console.error('Error:', error.message);
    process.exit(1);
}
