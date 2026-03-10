import { Client } from '@notionhq/client';
import fs from 'fs';

const configData = fs.readFileSync('C:\\\\Users\\\\Admin\\\\.notion-context\\\\config.json', 'utf-8');
const config = JSON.parse(configData);

const notion = new Client({ auth: config.notionToken });

async function debugBlocks() {
    const pageId = config.trackedPages[0];
    console.log('Fetching blocks for page:', pageId);

    const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100
    });

    console.log('\n=== TOP LEVEL BLOCKS ===\n');
    response.results.forEach((block, i) => {
        console.log(`Block ${i}:`);
        console.log(`  Type: ${block.type}`);
        if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
            const text = block[block.type].rich_text.map(rt => rt.plain_text).join('');
            console.log(`  Text: "${text}"`);
        } else if (block.type === 'callout') {
            const text = block.callout.rich_text.map(rt => rt.plain_text).join('');
            console.log(`  Text: "${text}"`);
        } else if (block.type === 'paragraph') {
            const text = block.paragraph.rich_text.map(rt => rt.plain_text).join('');
            console.log(`  Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        } else if (block.type === 'toggle') {
            const text = block.toggle.rich_text.map(rt => rt.plain_text).join('');
            console.log(`  Text: "${text}"`);
        }
        console.log(`  Has children: ${block.has_children}`);
        console.log('');
    });
}

debugBlocks().catch(console.error);
