import chalk from 'chalk';
import { loadConfig, getConfigPath, configExists } from '../config/config.js';

/**
 * Status command - shows current configuration status
 */
export async function statusCommand(): Promise<void> {
    console.log(chalk.cyan('\n📊 notion-context Status\n'));

    if (!(await configExists())) {
        console.log(chalk.yellow('⚠️  Not initialized'));
        console.log(chalk.dim('   Run "notion-context init" to get started.\n'));
        process.exit(0);
    }

    const config = await loadConfig();

    if (!config) {
        console.log(chalk.red('✗ Configuration file is invalid\n'));
        process.exit(1);
    }

    console.log(chalk.white('Configuration:'));
    console.log(chalk.dim(`   Location: ${getConfigPath()}`));
    console.log(chalk.dim(`   Token: ${config.notionToken ? '✓ Set' : '✗ Not set'}`));
    console.log(chalk.dim(`   Tracked Pages: ${config.trackedPages.length}`));
    console.log(chalk.dim(`   Tracked Databases: ${config.trackedDatabases.length}`));
    console.log(chalk.dim(`   Last Sync: ${config.lastSync || 'Never'}\n`));
}
