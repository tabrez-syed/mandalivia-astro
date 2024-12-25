export const PLATFORMS = {
    TWITTER: 'twitter',
    BLUESKY: 'bluesky',
    BOTH: 'both'
};

export const CHAR_LIMITS = {
    [PLATFORMS.TWITTER]: 280,
    [PLATFORMS.BLUESKY]: 300
};

export const IMAGE_CONFIG = {
    ALLOWED_PATH: 'src/assets/images/',
    ALLOWED_EXTENSION: '.webp'
};

export const THREAD_CONFIG = {
    THREAD_EMOJI: '🧵',
    PUBLISH_PATH: 'publish/twitter'
};

export const VALID_PLATFORMS = Object.values(PLATFORMS);

export const API_CONFIG = {
    BLUESKY_SERVICE: 'https://bsky.social'
};
