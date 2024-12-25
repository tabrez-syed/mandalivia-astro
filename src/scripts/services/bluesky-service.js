import { BskyAgent, RichText } from '@atproto/api';
import fs from 'fs/promises';
import { BaseService } from './base-service.js';
import { PLATFORMS, CHAR_LIMITS, API_CONFIG } from '../config/constants.js';
import { getBlueskyCredentials } from '../config/env.js';

export class BlueSkyService extends BaseService {
    constructor() {
        super(PLATFORMS.BLUESKY);
        this.agent = null;
        this.handle = null;
    }

    async initialize() {
        this.agent = new BskyAgent({
            service: API_CONFIG.BLUESKY_SERVICE
        });

        const credentials = getBlueskyCredentials();
        try {
            const response = await this.agent.login(credentials);
            this.handle = response.data.handle;
        } catch (error) {
            console.error('Error logging into BlueSky:', error.message);
            throw new Error('Failed to authenticate with BlueSky');
        }
    }

    async verifyCredentials() {
        try {
            if (!this.handle) {
                throw new Error('BlueSky handle not set. Did you call initialize()?');
            }
            const profile = await this.agent.getProfile({ actor: this.handle });
            console.log(`✓ Authenticated as @${profile.data.handle}\n`);
            return true;
        } catch (error) {
            console.error('Error verifying BlueSky credentials:', error.message);
            throw new Error('Failed to verify BlueSky credentials');
        }
    }

    async uploadMedia(imagePath) {
        try {
            const imageData = await fs.readFile(imagePath);
            const response = await this.agent.uploadBlob(imageData, { encoding: 'image/webp' });
            return { bluesky: response.data.blob }; // Just return the blob object
        } catch (error) {
            console.error('Error uploading media to BlueSky:', error.message);
            throw new Error('Failed to upload image to BlueSky');
        }
    }

    async createPost(post, { mediaId, replyToId } = {}) {
        try {
            // Create rich text object for proper text formatting
            const rt = new RichText({ text: post });
            await rt.detectFacets(this.agent); // Detect mentions, links, etc.

            const postData = {
                text: rt.text,
                facets: rt.facets,
                ...(replyToId && {
                    reply: {
                        root: { uri: replyToId.uri, cid: replyToId.cid },
                        parent: { uri: replyToId.uri, cid: replyToId.cid }
                    }
                })
            };

            // Add image if provided
            if (mediaId?.bluesky) {
                postData.embed = {
                    $type: 'app.bsky.embed.images',
                    images: [
                        {
                            alt: 'Thread image',
                            image: mediaId.bluesky // This should now be the blob object directly
                        }
                    ]
                };
            }

            const response = await this.agent.post(postData);
            return { uri: response.uri, cid: response.cid };
        } catch (error) {
            console.error('Error posting to BlueSky:', error.message);
            throw error;
        }
    }

    getCharacterLimit() {
        return CHAR_LIMITS[PLATFORMS.BLUESKY];
    }
}
