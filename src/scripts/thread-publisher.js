import path from 'path';
import { PLATFORMS, THREAD_CONFIG } from './config/constants.js';
import { TwitterService } from './services/twitter-service.js';
import { BlueSkyService } from './services/bluesky-service.js';
import { parseThreadFile, updateFrontmatter } from './utils/thread-utils.js';
import { displayPreview, simulatePosting, confirmPosting, displaySuccess, handleError } from './ui/ui-utils.js';

export class ThreadPublisher {
    constructor(platform = PLATFORMS.BOTH) {
        this.platform = platform;
        this.services = {};
    }

    async initialize() {
        if (this.platform === PLATFORMS.TWITTER || this.platform === PLATFORMS.BOTH) {
            this.services.twitter = new TwitterService();
            await this.services.twitter.initialize();
        }

        if (this.platform === PLATFORMS.BLUESKY || this.platform === PLATFORMS.BOTH) {
            this.services.bluesky = new BlueSkyService();
            await this.services.bluesky.initialize();
        }
    }

    async verifyCredentials() {
        const verifications = [];

        if (this.services.twitter) {
            verifications.push(this.services.twitter.verifyCredentials());
        }

        if (this.services.bluesky) {
            verifications.push(this.services.bluesky.verifyCredentials());
        }

        await Promise.all(verifications);
    }

    async uploadMedia(imagePath) {
        const mediaIds = {};

        if (this.services.twitter) {
            const twitterMedia = await this.services.twitter.uploadMedia(imagePath);
            Object.assign(mediaIds, twitterMedia);
        }

        if (this.services.bluesky) {
            const blueskyMedia = await this.services.bluesky.uploadMedia(imagePath);
            Object.assign(mediaIds, blueskyMedia);
        }

        return mediaIds;
    }

    async postThread(posts, imagePath, filePath) {
        let mediaId = null;
        if (imagePath) {
            console.log('Uploading image...');
            mediaId = await this.uploadMedia(imagePath);
            console.log('✓ Image uploaded successfully\n');
        }

        const platformStatus = {};

        // Post to Twitter
        if (this.services.twitter) {
            console.log('Posting to Twitter...');
            let lastTweetId = null;
            for (let i = 0; i < posts.length; i++) {
                console.log(`Posting tweet ${i + 1}/${posts.length}...`);
                lastTweetId = await this.services.twitter.createPost(posts[i], {
                    mediaId: i === 0 ? mediaId : null,
                    replyToId: lastTweetId
                });
                console.log('✓ Posted successfully to Twitter\n');
            }
            platformStatus.twitter = 'published';
        }

        // Post to BlueSky
        if (this.services.bluesky) {
            console.log('Posting to BlueSky...');
            let rootId = null;
            let parentId = null;
            for (let i = 0; i < posts.length; i++) {
                console.log(`Posting to BlueSky ${i + 1}/${posts.length}...`);
                const postId = await this.services.bluesky.createPost(posts[i], {
                    mediaId: i === 0 ? mediaId : null,
                    rootId: rootId,
                    parentId: parentId
                });
                if (i === 0) {
                    rootId = postId;
                }
                parentId = postId;
                console.log('✓ Posted successfully to BlueSky\n');
            }
            platformStatus.bluesky = 'published';
        }

        // Update frontmatter with publish status
        await updateFrontmatter(filePath, platformStatus);
    }

    async publish(threadPath, { preview = false, dryRun = false } = {}) {
        try {
            // Get character limit based on platform
            const charLimit = this.platform === PLATFORMS.BLUESKY ? 300 : 280;

            // Ensure file path is relative to publish/twitter directory
            const fullPath = path.join(process.cwd(), THREAD_CONFIG.PUBLISH_PATH, threadPath);

            // Parse and validate thread
            const { posts, imagePath, frontmatter } = await parseThreadFile(fullPath, charLimit);

            if (preview) {
                displayPreview(posts, imagePath, this.platform);
                return;
            }

            if (dryRun) {
                simulatePosting(posts, imagePath, this.platform);
                return;
            }

            // Initialize services and verify credentials
            await this.initialize();
            await this.verifyCredentials();

            // Get confirmation before posting
            const confirmed = await confirmPosting(posts, imagePath, this.platform);
            if (!confirmed) {
                console.log('Posting cancelled');
                return;
            }

            // Post the thread
            await this.postThread(posts, imagePath, fullPath);
            displaySuccess(this.platform);
        } catch (error) {
            handleError(error);
        }
    }
}
