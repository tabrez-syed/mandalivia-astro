export class BaseService {
    constructor(platform) {
        this.platform = platform;
    }

    async initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }

    async verifyCredentials() {
        throw new Error('verifyCredentials() must be implemented by subclass');
    }

    async uploadMedia(imagePath) {
        throw new Error('uploadMedia() must be implemented by subclass');
    }

    async createPost(post, { mediaId, replyToId } = {}) {
        throw new Error('createPost() must be implemented by subclass');
    }

    getCharacterLimit() {
        throw new Error('getCharacterLimit() must be implemented by subclass');
    }
}
