import { AnalysisConfig } from './analysis/types.js';

/**
 * Configuration schema for notion-context
 */
export interface NotionContextConfig {
    /** Notion integration token */
    notionToken: string;

    /** Array of tracked Notion page IDs */
    trackedPages: string[];

    /** Array of tracked Notion database IDs */
    trackedDatabases: string[];

    /** Timestamp of last successful sync (ISO 8601) */
    lastSync: string | null;

    /** Classification settings */
    classification?: Partial<AnalysisConfig>;
}

/**
 * Type guard to check if an object is a valid NotionContextConfig
 */
export function isValidConfig(obj: unknown): obj is NotionContextConfig {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    const config = obj as Partial<NotionContextConfig>;

    return (
        typeof config.notionToken === 'string' &&
        Array.isArray(config.trackedPages) &&
        Array.isArray(config.trackedDatabases) &&
        (config.lastSync === null || typeof config.lastSync === 'string')
    );
}

/**
 * Creates a default config object
 */
export function createDefaultConfig(): NotionContextConfig {
    return {
        notionToken: '',
        trackedPages: [],
        trackedDatabases: [],
        lastSync: null,
    };
}
