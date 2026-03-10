import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { NotionContextConfig, isValidConfig } from '../types.js';
import { fileExists, readJsonFile, writeJsonFile } from '../utils/fs.js';

const CONFIG_DIR = '.notion-context';
const CONFIG_FILE = 'config.json';

/**
 * Get the full path to the config file
 */
export function getConfigPath(): string {
    return path.join(os.homedir(), CONFIG_DIR, CONFIG_FILE);
}

/**
 * Get the config directory path
 */
export function getConfigDir(): string {
    return path.join(os.homedir(), CONFIG_DIR);
}

/**
 * Load configuration from disk
 * Returns null if config doesn't exist or is invalid
 */
export async function loadConfig(): Promise<NotionContextConfig | null> {
    const configPath = getConfigPath();

    if (!(await fileExists(configPath))) {
        return null;
    }

    const config = await readJsonFile<NotionContextConfig>(configPath);

    if (!config || !isValidConfig(config)) {
        throw new Error('Invalid configuration file. Run "notion-context reset" to recreate it.');
    }

    return config;
}

/**
 * Save configuration to disk
 */
export async function saveConfig(config: NotionContextConfig): Promise<void> {
    const configPath = getConfigPath();

    if (!isValidConfig(config)) {
        throw new Error('Invalid configuration object');
    }

    await writeJsonFile(configPath, config);
}

/**
 * Reset configuration by deleting the config file
 */
export async function resetConfig(): Promise<boolean> {
    const configPath = getConfigPath();

    try {
        if (await fileExists(configPath)) {
            await fs.unlink(configPath);
            return true;
        }
        return false;
    } catch (error) {
        throw new Error(`Failed to reset config: ${error}`);
    }
}

/**
 * Check if config exists
 */
export async function configExists(): Promise<boolean> {
    return fileExists(getConfigPath());
}
