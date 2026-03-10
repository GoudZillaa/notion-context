#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { statusCommand } from './commands/status.js';
import { resetCommand } from './commands/reset.js';
import { doctorCommand } from './commands/doctor.js';

const program = new Command();

program
    .name('notion-context')
    .description('A CLI tool to fetch Notion data and generate local context files for AI assistants')
    .version('0.1.0');

// Init command
program
    .command('init')
    .description('Initialize notion-context configuration')
    .action(async () => {
        await initCommand();
    });

// Sync command
program
    .command('sync')
    .description('Fetch Notion data and generate context files')
    .action(async () => {
        await syncCommand();
    });

// Status command
program
    .command('status')
    .description('Show current configuration and sync status')
    .action(async () => {
        await statusCommand();
    });

// Doctor command
program
    .command('doctor')
    .description('Run health checks on your notion-context setup')
    .action(async () => {
        await doctorCommand();
    });

// Reset command
program
    .command('reset')
    .description('Reset configuration (delete config file)')
    .action(async () => {
        await resetCommand();
    });

// Handle unknown commands
program.on('command:*', () => {
    console.error(chalk.red('\n✗ Invalid command: %s\n'), program.args.join(' '));
    program.help();
});

// Global error handler
process.on('unhandledRejection', (error) => {
    console.error(chalk.red('\n✗ Unexpected error:'), error);
    process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
