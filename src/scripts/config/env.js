import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple possible locations for .env file
const possiblePaths = [
    path.join(process.cwd(), 'src/scripts/.env'), // When run from project root
    path.join(__dirname, '../.env'), // Relative to config directory
    path.join(process.cwd(), '.env') // Project root
];

let envLoaded = false;

for (const envPath of possiblePaths) {
    console.log('Attempting to load .env from:', envPath);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
        console.log('Successfully loaded .env from:', envPath);
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    console.error('Failed to load .env file from any of these locations:', possiblePaths);
}

// Environment variable validation
export function validateEnvVars(platform) {
    const twitterVars = ['TWITTER_APP_KEY', 'TWITTER_APP_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET'];
    const blueskyVars = ['BLUESKY_USERNAME', 'BLUESKY_PASSWORD'];

    let requiredVars = [];
    if (platform === 'twitter' || platform === 'both') {
        requiredVars = [...requiredVars, ...twitterVars];
    }
    if (platform === 'bluesky' || platform === 'both') {
        requiredVars = [...requiredVars, ...blueskyVars];
    }

    console.log('Validating environment variables:', requiredVars);
    for (const envVar of requiredVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable ${envVar}`);
        }
    }
    console.log('All required environment variables are present');
}

// Environment variable getters
export function getTwitterCredentials() {
    return {
        appKey: process.env.TWITTER_APP_KEY,
        appSecret: process.env.TWITTER_APP_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET
    };
}

export function getBlueskyCredentials() {
    return {
        identifier: process.env.BLUESKY_USERNAME,
        password: process.env.BLUESKY_PASSWORD
    };
}
