#!/usr/bin/env node

import { Command } from 'commander';
import { validateEnvVars } from './config/env.js';
import { VALID_PLATFORMS } from './config/constants.js';
import { ThreadPublisher } from './thread-publisher.js';
import { handleError } from './ui/ui-utils.js';

async function main() {
    const program = new Command();

    program
        .name('twitter-publish')
        .description('Publish a thread to Twitter and/or BlueSky from a markdown file')
        .argument('<file>', 'Thread markdown file path')
        .option('--platform <platform>', 'Platform to post to (twitter, bluesky, or both)', 'both')
        .option('--dry-run', 'Validate and preview without posting')
        .option('--preview', 'Preview the thread without posting')
        .parse(process.argv);

    const options = program.opts();
    const [filePath] = program.args;

    try {
        // Validate platform option
        if (!VALID_PLATFORMS.includes(options.platform)) {
            throw new Error('Invalid platform. Must be one of: twitter, bluesky, both');
        }

        // Validate environment variables for selected platform
        validateEnvVars(options.platform);

        // Create and run publisher
        const publisher = new ThreadPublisher(options.platform);
        await publisher.publish(filePath, {
            preview: options.preview,
            dryRun: options.dryRun
        });
    } catch (error) {
        handleError(error);
    }
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
