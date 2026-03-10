import chalk from 'chalk';
import inquirer from 'inquirer';
import { configExists, saveConfig, getConfigPath } from '../config/config.js';
import { createDefaultConfig } from '../types.js';

/**
 * Initialize notion-context configuration
 */
export async function initCommand(): Promise<void> {
    try {
        // Check if config already exists
        if (await configExists()) {
            console.log(chalk.yellow('\n⚠️  Configuration already exists!'));
            console.log(chalk.dim(`   Location: ${getConfigPath()}\n`));

            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Do you want to overwrite the existing configuration?',
                    default: false,
                },
            ]);

            if (!overwrite) {
                console.log(chalk.blue('\n✓ Keeping existing configuration.\n'));
                return;
            }
        }

        // Display instructions
        console.log(chalk.bold.cyan('\n🚀 notion-context Setup\n'));
        console.log(chalk.white('This tool fetches data from Notion and generates context files for AI assistants.\n'));
        console.log(chalk.yellow('📋 What you need:'));
        console.log(chalk.dim('   1. A Notion integration token'));
        console.log(chalk.dim('   2. Share your Notion pages/databases with the integration\n'));
        console.log(chalk.blue('💡 How to get your token:'));
        console.log(chalk.dim('   1. Go to https://www.notion.so/my-integrations'));
        console.log(chalk.dim('   2. Click "New integration"'));
        console.log(chalk.dim('   3. Give it a name and select capabilities'));
        console.log(chalk.dim('   4. Copy the "Internal Integration Token"\n'));

        // Prompt for token
        const answers = await inquirer.prompt([
            {
                type: 'password',
                name: 'token',
                message: 'Enter your Notion integration token:',
                mask: '*',
                validate: (input: string) => {
                    if (!input || input.trim().length === 0) {
                        return 'Token cannot be empty';
                    }
                    return true;
                },
            },
        ]);

        // Create and save config
        const config = createDefaultConfig();
        config.notionToken = answers.token.trim();

        await saveConfig(config);

        // Success message
        console.log(chalk.green('\n✓ Configuration saved successfully!\n'));
        console.log(chalk.dim(`   Location: ${getConfigPath()}\n`));
        console.log(chalk.yellow('📌 Next steps:'));
        console.log(chalk.dim('   1. Go to notion>connections>[your integration name]>three dots>Manage page access, select pages'));
        console.log(chalk.dim('   2. Run "notion-context sync" to fetch data'));
        console.log(chalk.dim('   3. Check .project-context/ for generated files\n'));

    } catch (error) {
        console.error(chalk.red('\n✗ Error during initialization:'), error);
        process.exit(1);
    }
}
