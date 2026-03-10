import chalk from 'chalk';
import inquirer from 'inquirer';
import { resetConfig, configExists, getConfigPath } from '../config/config.js';

/**
 * Reset command - deletes configuration
 */
export async function resetCommand(): Promise<void> {
    if (!(await configExists())) {
        console.log(chalk.yellow('\n⚠️  No configuration found to reset.\n'));
        process.exit(0);
    }

    console.log(chalk.yellow('\n⚠️  Reset Configuration'));
    console.log(chalk.dim(`   This will delete: ${getConfigPath()}\n`));

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset the configuration?',
            default: false,
        },
    ]);

    if (!confirm) {
        console.log(chalk.blue('\n✓ Reset cancelled.\n'));
        return;
    }

    try {
        await resetConfig();
        console.log(chalk.green('\n✓ Configuration reset successfully!\n'));
        console.log(chalk.dim('   Run "notion-context init" to reconfigure.\n'));
    } catch (error) {
        console.error(chalk.red('\n✗ Error resetting configuration:'), error);
        process.exit(1);
    }
}
