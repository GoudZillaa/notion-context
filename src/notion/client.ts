import { Client } from '@notionhq/client';

/**
 * Factory to create a Notion client instance
 */
export function getNotionClient(token: string): Client {
    return new Client({
        auth: token,
    });
}

/**
 * Fetches all pages and databases shared with the integration
 */
export async function fetchAvailableItems(client: Client) {
    const response = await client.search({});

    const pages = response.results.filter((item: any) => item.object === 'page');
    const databases = response.results.filter((item: any) => item.object === 'database');

    return {
        pages,
        databases,
    };
}

/**
 * Fetches all blocks for a given page ID (recursively)
 */
export async function fetchPageBlocks(client: Client, blockId: string) {
    let blocks: any[] = [];
    let cursor: string | undefined;

    while (true) {
        const response = await client.blocks.children.list({
            block_id: blockId,
            start_cursor: cursor,
        });

        blocks = [...blocks, ...response.results];

        if (!response.has_more || !response.next_cursor) {
            break;
        }
        cursor = response.next_cursor;
    }

    // Fetch children for nested blocks
    for (const block of blocks) {
        // @ts-ignore
        if (block.has_children) {
            block.children = await fetchPageBlocks(client, block.id);
        }
    }

    return blocks;
}

/**
 * Fetches all entries for a given database ID
 */
export async function fetchDatabaseEntries(client: Client, databaseId: string) {
    let entries: any[] = [];
    let cursor: string | undefined;

    while (true) {
        const response = await (client.databases as any).query({
            database_id: databaseId,
            start_cursor: cursor,
        });

        entries = [...entries, ...response.results];

        if (!response.has_more || !response.next_cursor) {
            break;
        }
        cursor = response.next_cursor;
    }

    return entries;
}
