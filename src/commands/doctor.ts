import chalk from 'chalk';
import { loadConfig, configExists, getConfigPath } from '../config/config.js';
import { getNotionClient } from '../notion/client.js';

/**
 * Doctor command - diagnoses the health of notion-context setup
 */
export async function doctorCommand(): Promise<void> {
    console.log(chalk.cyan('\n🏥 notion-context Health Check\n'));

    let hasErrors = false;

    // Check 1: Config file exists
    console.log(chalk.white('1. Checking configuration file...'));
    if (!(await configExists())) {
        console.log(chalk.red('   ✗ Config file not found'));
        console.log(chalk.yellow('   → Run "notion-context init" to set up\n'));
        hasErrors = true;
    } else {
        console.log(chalk.green('   ✓ Config file exists'));
        console.log(chalk.dim(`     Location: ${getConfigPath()}\n`));
    }

    // Check 2: Load and validate config
    let config;
    try {
        console.log(chalk.white('2. Validating configuration...'));
        config = await loadConfig();

        if (!config) {
            console.log(chalk.red('   ✗ Config is invalid or corrupted'));
            console.log(chalk.yellow('   → Run "notion-context reset" then "notion-context init"\n'));
            hasErrors = true;
        } else {
            console.log(chalk.green('   ✓ Config is valid'));

            if (!config.notionToken) {
                console.log(chalk.red('   ✗ Notion token not set'));
                console.log(chalk.yellow('   → Run "notion-context init" to add your token\n'));
                hasErrors = true;
            } else {
                console.log(chalk.green('   ✓ Notion token is set\n'));
            }
        }
    } catch (error) {
        console.log(chalk.red('   ✗ Error loading config:', (error as Error).message));
        hasErrors = true;
    }

    // Check 3: Test Notion API connection
    if (config && config.notionToken) {
        console.log(chalk.white('3. Testing Notion API connection...'));

        try {
            const client = getNotionClient(config.notionToken);
            // Make a lightweight API call to test the token
            await client.search({ page_size: 1 });

            console.log(chalk.green('   ✓ Successfully connected to Notion API'));
            console.log(chalk.dim('     Token is valid and has proper permissions\n'));
        } catch (error: any) {
            console.log(chalk.red('   ✗ Failed to connect to Notion API'));

            if (error.code === 'unauthorized') {
                console.log(chalk.yellow('   → Token is invalid or expired'));
                console.log(chalk.yellow('   → Run "notion-context init" to update your token\n'));
            } else if (error.code === 'service_unavailable') {
                console.log(chalk.yellow('   → Notion API is currently unavailable'));
                console.log(chalk.yellow('   → Try again in a few minutes\n'));
            } else {
                console.log(chalk.yellow(`   → Error: ${error.message}\n`));
            }

            hasErrors = true;
        }
    } else {
        console.log(chalk.yellow('3. Skipping Notion API test (no token configured)\n'));
    }

    // Check 4: Verify project context directory can be written
    console.log(chalk.white('4. Checking file system permissions...'));

    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const testDir = path.join(process.cwd(), '.project-context-test');

        await fs.mkdir(testDir, { recursive: true });
        await fs.writeFile(path.join(testDir, 'test.txt'), 'test');
        await fs.rm(testDir, { recursive: true });

        console.log(chalk.green('   ✓ Can write to current directory'));
        console.log(chalk.dim(`     Project context will be created at: ${process.cwd()}/.project-context\n`));
    } catch (error) {
        console.log(chalk.red('   ✗ Cannot write to current directory'));
        console.log(chalk.yellow('   → Check folder permissions\n'));
        hasErrors = true;
    }

    // Check 5: Tracked items status
    if (config) {
        console.log(chalk.white('5. Checking tracked items...'));

        const totalTracked = config.trackedPages.length + config.trackedDatabases.length;

        if (totalTracked === 0) {
            console.log(chalk.yellow('   ⚠ No items are currently tracked'));
            console.log(chalk.dim('     Run "notion-context sync" to select items\n'));
        } else {
            console.log(chalk.green(`   ✓ Tracking ${totalTracked} item(s)`));
            console.log(chalk.dim(`     Pages: ${config.trackedPages.length}`));
            console.log(chalk.dim(`     Databases: ${config.trackedDatabases.length}`));

            if (config.lastSync) {
                const lastSyncDate = new Date(config.lastSync);
                const timeSince = Math.floor((Date.now() - lastSyncDate.getTime()) / 1000 / 60);
                console.log(chalk.dim(`     Last sync: ${timeSince < 60 ? timeSince + ' minutes' : Math.floor(timeSince / 60) + ' hours'} ago\n`));
            } else {
                console.log(chalk.dim('     Last sync: Never\n'));
            }
        }
    }

    // Final summary
    console.log(chalk.white('─'.repeat(50)));

    if (hasErrors) {
        console.log(chalk.red('\n⚠️  Some issues detected. Please fix the errors above.\n'));
        process.exit(1);
    } else {
        console.log(chalk.green('\n✨ Everything looks good! Ready to sync.\n'));
    }
}
