import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config/config.js';
import { getNotionClient, fetchAvailableItems, fetchPageBlocks, fetchDatabaseEntries } from '../notion/client.js';
import { normalizePage, NormalizedItem } from '../normalize/normalize.js';
import { generateContext } from '../context/generate.js';
import inquirer from 'inquirer';

/**
 * Sync command - fetches Notion data and generates context files
 */
export async function syncCommand(): Promise<void> {
    try {
        const config = await loadConfig();

        if (!config || !config.notionToken) {
            console.log(chalk.red('\n✗ Notion token not found.'));
            console.log(chalk.yellow('  Run "notion-context init" first.\n'));
            process.exit(1);
        }

        const client = getNotionClient(config.notionToken);

        // If no items are tracked, let's look for them
        if (config.trackedPages.length === 0 && config.trackedDatabases.length === 0) {
            console.log(chalk.cyan('\n🔍 No items currently tracked. Searching your Notion workspace...'));

            const { pages, databases } = await fetchAvailableItems(client);

            if (pages.length === 0 && databases.length === 0) {
                console.log(chalk.yellow('\n⚠️  No pages or databases found!'));
                console.log(chalk.dim('   Make sure you have shared items with your integration.\n'));
                return;
            }

            const choices = [
                ...pages.map((p: any) => ({
                    name: `📄 Page: ${p.properties?.title?.title?.[0]?.plain_text || 'Untitled'}`,
                    value: { id: p.id, type: 'page' },
                })),
                ...databases.map((d: any) => ({
                    name: `🗂️  DB: ${d.title?.[0]?.plain_text || 'Untitled'}`,
                    value: { id: d.id, type: 'database' },
                })),
            ];

            const { selected } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selected',
                    message: 'Select items to track and sync:',
                    choices,
                    validate: (input) => input.length > 0 || 'Select at least one item.',
                },
            ]);

            for (const item of selected) {
                if (item.type === 'page') config.trackedPages.push(item.id);
                if (item.type === 'database') config.trackedDatabases.push(item.id);
            }

            await saveConfig(config);
            console.log(chalk.green(`\n✓ Added ${selected.length} items to tracking.\n`));
        }

        console.log(chalk.cyan('\n🔄 Syncing context...'));
        const allNormalizedItems: NormalizedItem[] = [];

        // Sync Pages
        for (const pageId of config.trackedPages) {
            try {
                console.log(chalk.dim(`   Fetching page: ${pageId}...`));
                const page = await client.pages.retrieve({ page_id: pageId });
                const blocks = await fetchPageBlocks(client, pageId);
                // Pass user-defined classification config
                const items = normalizePage(page, blocks, undefined, config.classification); // Now returns array
                allNormalizedItems.push(...items); // Flatten into main array
            } catch (err: any) {
                if (err.code === 'object_not_found') {
                    console.error(chalk.yellow(`   ⚠ Page ${pageId} no longer exists (skipping)`));
                } else if (err.code === 'restricted_resource') {
                    console.error(chalk.yellow(`   ⚠ No access to page ${pageId} (check sharing)`));
                } else {
                    console.error(chalk.red(`   ✗ Failed to sync page ${pageId}:`), err.message);
                }
            }
        }

        // Sync Databases
        for (const dbId of config.trackedDatabases) {
            try {
                console.log(chalk.dim(`   Fetching database: ${dbId}...`));

                // Fetch DB details to get title for context signals
                const db: any = await client.databases.retrieve({ database_id: dbId });
                const dbTitle = db.title?.[0]?.plain_text || '';

                const entries = await fetchDatabaseEntries(client, dbId);

                for (const entry of entries) {
                    const blocks = await fetchPageBlocks(client, entry.id);
                    // Pass DB title as parent context to help classification
                    // Also pass user-defined classification config
                    const items = normalizePage(entry, blocks, dbTitle, config.classification);
                    allNormalizedItems.push(...items);
                }
            } catch (err: any) {
                if (err.code === 'object_not_found') {
                    console.error(chalk.yellow(`   ⚠ Database ${dbId} no longer exists (skipping)`));
                } else if (err.code === 'restricted_resource') {
                    console.error(chalk.yellow(`   ⚠ No access to database ${dbId} (check sharing)`));
                } else {
                    console.error(chalk.red(`   ✗ Failed to sync database ${dbId}:`), err.message);
                }
            }
        }

        if (allNormalizedItems.length === 0) {
            console.log(chalk.yellow('\n⚠️  No content fetched. Check your Notion sharing settings.\n'));
            return;
        }

        // Generate files
        console.log(chalk.dim('   Generating files...'));
        const { contextPath, metadata } = await generateContext(allNormalizedItems);

        // Update config
        config.lastSync = new Date().toISOString();
        await saveConfig(config);

        console.log(chalk.green('\n✨ Sync complete!\n'));
        console.log(chalk.white(`   Items: ${metadata.totalItems} (${metadata.taskCount} tasks, ${metadata.noteCount} notes)`));
        console.log(chalk.white(`   Location: ${contextPath}\n`));
        console.log(chalk.blue('💡 Tip: Your AI assistant can now use .project-context/context.md for project knowledge.\n'));

    } catch (error: any) {
        console.error(chalk.red('\n✗ Sync failed\n'));

        // Handle specific error codes
        if (error.code === 'unauthorized') {
            console.log(chalk.yellow('Your Notion token is invalid or expired.'));
            console.log(chalk.dim('→ Run "notion-context init" to update your token.\n'));
        } else if (error.code === 'restricted_resource') {
            console.log(chalk.yellow('Access denied to one or more resources.'));
            console.log(chalk.dim('→ Make sure you\'ve shared pages with your integration.'));
            console.log(chalk.dim('→ In Notion, click "..." → "Add connections" → Select your integration.\n'));
        } else if (error.code === 'object_not_found') {
            console.log(chalk.yellow('One of the tracked items was deleted or is no longer accessible.'));
            console.log(chalk.dim('→ Run "notion-context reset" to clear tracking and start fresh.\n'));
        } else if (error.code === 'rate_limited') {
            console.log(chalk.yellow('Notion API rate limit reached.'));
            console.log(chalk.dim('→ Wait a few minutes and try again.\n'));
        } else if (error.code === 'service_unavailable') {
            console.log(chalk.yellow('Notion API is temporarily unavailable.'));
            console.log(chalk.dim('→ Try again in a few minutes.\n'));
        } else if (error.message) {
            console.log(chalk.yellow(`Error: ${error.message}`));
            console.log(chalk.dim('\n→ Run "notion-context doctor" to diagnose issues.\n'));
        } else {
            console.log(chalk.yellow('An unexpected error occurred.'));
            console.log(chalk.dim('→ Run "notion-context doctor" to check your setup.\n'));
        }

        process.exit(1);
    }
}
