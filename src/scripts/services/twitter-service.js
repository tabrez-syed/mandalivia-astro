import { TwitterApi } from 'twitter-api-v2';
import { BaseService } from './base-service.js';
import { PLATFORMS, CHAR_LIMITS } from '../config/constants.js';
import { getTwitterCredentials } from '../config/env.js';

export class TwitterService extends BaseService {
    constructor() {
        super(PLATFORMS.TWITTER);
        this.client = null;
    }

    async initialize() {
        const credentials = getTwitterCredentials();
        this.client = new TwitterApi({
            appKey: credentials.appKey,
            appSecret: credentials.appSecret,
            accessToken: credentials.accessToken,
            accessSecret: credentials.accessSecret
        });
    }

    async verifyCredentials() {
        try {
            const response = await this.client.v2.me();
            console.log(`✓ Authenticated as @${response.data.username}\n`);
            return true;
        } catch (error) {
            console.error('Error verifying Twitter credentials:', error.message);
            throw new Error('Failed to verify Twitter credentials');
        }
    }

    async uploadMedia(imagePath) {
        try {
            const mediaId = await this.client.v1.uploadMedia(imagePath);
            return { twitter: mediaId };
        } catch (error) {
            console.error('Error uploading media to Twitter:', error.message);
            throw new Error('Failed to upload image to Twitter');
        }
    }

    async createPost(post, { mediaId, replyToId } = {}) {
        const tweetData = {
            text: post,
            ...(replyToId && { reply: { in_reply_to_tweet_id: replyToId } }),
            ...(mediaId && { media: { media_ids: [mediaId.twitter] } })
        };

        try {
            const response = await this.client.v2.tweet(tweetData);
            return response.data.id;
        } catch (error) {
            console.error('Error posting to Twitter:', error.message);
            throw error;
        }
    }

    getCharacterLimit() {
        return CHAR_LIMITS[PLATFORMS.TWITTER];
    }
}
