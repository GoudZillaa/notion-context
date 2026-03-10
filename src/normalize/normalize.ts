/**
 * Internal data model for normalized Notion items
 */
export interface NormalizedItem {
    id: string;
    type: 'task' | 'note' | 'metadata';
    title: string;
    content: string; // Markdown formatted
    status?: string;
    tags: string[];
    lastEdited: string;
    url: string;
    confidence?: number;
    analysis?: {
        signals: string[];
        originalType: string;
    };
}

/**
 * Represents a section within a page
 */
interface PageSection {
    heading: string | null; // null for content before first heading
    blocks: any[];
    type: 'task' | 'note' | 'unknown';
}

/**
 * Converts Notion rich text to plain text
 */
function richTextToPlainText(richText: any[]): string {
    return richText.map((rt) => rt.plain_text).join('');
}

/**
 * Converts Notion rich text to Markdown
 */
function richTextToMarkdown(richText: any[]): string {
    return richText
        .map((rt) => {
            let text = rt.plain_text;
            if (rt.annotations.bold) text = `**${text}**`;
            if (rt.annotations.italic) text = `*${text}*`;
            if (rt.annotations.strikethrough) text = `~~${text}~~`;
            if (rt.annotations.code) text = `\`${text}\``;
            if (rt.href) text = `[${text}](${rt.href})`;
            return text;
        })
        .join('');
}

/**
 * Parses Notion properties into a simpler format
 */
export function parseProperties(properties: any) {
    const result: Record<string, any> = {};
    const tags: string[] = [];
    let title = 'Untitled';
    let status: string | undefined;

    for (const [key, value] of Object.entries(properties)) {
        const val = value as any;
        switch (val.type) {
            case 'title':
                title = richTextToPlainText(val.title);
                break;
            case 'rich_text':
                result[key] = richTextToPlainText(val.rich_text);
                break;
            case 'select':
                if (val.select) {
                    result[key] = val.select.name;
                    if (key.toLowerCase() === 'status') status = val.select.name;
                }
                break;
            case 'multi_select':
                const names = val.multi_select.map((s: any) => s.name);
                result[key] = names;
                tags.push(...names);
                break;
            case 'checkbox':
                result[key] = val.checkbox;
                if (key.toLowerCase() === 'status' && val.checkbox) status = 'Done';
                break;
            case 'date':
                result[key] = val.date ? val.date.start : null;
                break;
            case 'url':
                result[key] = val.url;
                break;
            case 'email':
                result[key] = val.email;
                break;
            case 'phone_number':
                result[key] = val.phone_number;
                break;
        }
    }

    return { title, status, tags, properties: result };
}

/**
 * Converts Notion blocks to Markdown
 */
export function blocksToMarkdown(blocks: any[], indent = 0): string {
    let markdown = '';
    const pad = '  '.repeat(indent);

    for (const block of blocks) {
        switch (block.type) {
            case 'paragraph':
                markdown += `${pad}${richTextToMarkdown(block.paragraph.rich_text)}\n\n`;
                break;
            case 'heading_1':
                markdown += `${pad}# ${richTextToMarkdown(block.heading_1.rich_text)}\n\n`;
                break;
            case 'heading_2':
                markdown += `${pad}## ${richTextToMarkdown(block.heading_2.rich_text)}\n\n`;
                break;
            case 'heading_3':
                markdown += `${pad}### ${richTextToMarkdown(block.heading_3.rich_text)}\n\n`;
                break;
            case 'bulleted_list_item':
                markdown += `${pad}- ${richTextToMarkdown(block.bulleted_list_item.rich_text)}\n`;
                break;
            case 'numbered_list_item':
                markdown += `${pad}1. ${richTextToMarkdown(block.numbered_list_item.rich_text)}\n`;
                break;
            case 'to_do':
                const checked = block.to_do.checked ? '[x]' : '[ ]';
                markdown += `${pad}- ${checked} ${richTextToMarkdown(block.to_do.rich_text)}\n`;
                break;
            case 'toggle':
                markdown += `${pad}<details>\n${pad}<summary>${richTextToMarkdown(
                    block.toggle.rich_text
                )}</summary>\n\n`;
                if (block.children) {
                    markdown += blocksToMarkdown(block.children, indent + 1);
                }
                markdown += `${pad}</details>\n\n`;
                break;
            case 'code':
                markdown += `${pad}\`\`\`${block.code.language}\n${richTextToPlainText(
                    block.code.rich_text
                )}\n${pad}\`\`\`\n\n`;
                break;
            case 'divider':
                markdown += `${pad}---\n\n`;
                break;
            case 'quote':
                markdown += `${pad}> ${richTextToMarkdown(block.quote.rich_text)}\n\n`;
                break;
            case 'callout':
                const icon = block.callout.icon?.emoji || 'ℹ️';
                markdown += `${pad}> ${icon} ${richTextToMarkdown(block.callout.rich_text)}\n\n`;
                break;
            case 'column_list':
                // Flatten columns into the main markdown
                if (block.children) {
                    markdown += blocksToMarkdown(block.children, indent);
                }
                break;
            case 'column':
                // Process column children inline
                if (block.children) {
                    markdown += blocksToMarkdown(block.children, indent);
                }
                break;
        }

        if (block.children && block.type !== 'toggle' && block.type !== 'column_list' && block.type !== 'column') {
            markdown += blocksToMarkdown(block.children, indent + 1);
        }
    }

    return markdown;
}

/**
 * Extracts text from a block for section detection
 */
function getBlockText(block: any): string | null {
    switch (block.type) {
        case 'heading_1':
            return richTextToPlainText(block.heading_1.rich_text);
        case 'heading_2':
            return richTextToPlainText(block.heading_2.rich_text);
        case 'heading_3':
            return richTextToPlainText(block.heading_3.rich_text);
        case 'callout':
            return richTextToPlainText(block.callout.rich_text);
        case 'toggle':
            return richTextToPlainText(block.toggle.rich_text);
        case 'paragraph':
            return richTextToPlainText(block.paragraph.rich_text);
        default:
            return null;
    }
}

/**
 * Flattens column_list blocks into individual sections
 * Each column becomes a potential section
 */
function flattenColumnsToSections(blocks: any[]): PageSection[] {
    const sections: PageSection[] = [];

    for (const block of blocks) {
        if (block.type === 'column_list' && block.children) {
            // Each column could be a section
            for (const column of block.children) {
                if (column.type === 'column' && column.children && column.children.length > 0) {
                    // Try to detect section type from first block in column
                    const firstBlock = column.children[0];
                    const text = getBlockText(firstBlock);

                    if (text) {
                        sections.push({
                            heading: text.trim(),
                            blocks: column.children.slice(1), // Skip the header block
                            type: 'unknown' // Type will be determined by Scorer
                        });
                        continue;
                    }

                    // Fallback: add column as unknown section
                    sections.push({
                        heading: null,
                        blocks: column.children,
                        type: 'unknown'
                    });
                }
            }
        }
    }

    return sections;
}

/**
 * Splits blocks into sections
 * Handles H2 headings, columns, callouts, and toggles as section markers
 */
function splitIntoSections(blocks: any[]): PageSection[] {
    // First, check for column_list (priority: columns usually mean explicit organization)
    const columnSections = flattenColumnsToSections(blocks);
    if (columnSections.length > 0) {
        return columnSections;
    }

    // Fallback to H2-based splitting
    const sections: PageSection[] = [];
    let currentSection: PageSection = {
        heading: null,
        blocks: [],
        type: 'unknown'
    };

    for (const block of blocks) {
        // H2 headings, callouts, or toggles with keywords create new sections
        if (block.type === 'heading_2' || block.type === 'callout' || block.type === 'toggle') {
            const text = getBlockText(block);
            if (text) {
                // Save previous section if it has content
                if (currentSection.blocks.length > 0) {
                    sections.push(currentSection);
                }

                // Start new section (don't include the marker block itself)
                currentSection = {
                    heading: text.trim(),
                    blocks: [],
                    type: 'unknown'
                };
                continue;
            }
        }

        // Add block to current section
        currentSection.blocks.push(block);
    }

    // Don't forget the last section
    if (currentSection.blocks.length > 0) {
        sections.push(currentSection);
    }

    // If no sections were created, return all blocks as one section
    if (sections.length === 0) {
        sections.push({
            heading: null,
            blocks: blocks,
            type: 'unknown'
        });
    }

    return sections;
}

import { Scorer } from '../analysis/scorer.js';
import { extractStructuralSignals, extractContentSignals, extractTextSignals, extractContextSignals } from '../analysis/signals.js';
import { Signal, AnalysisConfig } from '../analysis/types.js';

/**
 * Normalizes a Notion page into one or more internal model items
 * Now uses the Advanced Classification Engine (Scorer + Signals)
 * @param parentContext Optional name of the parent database or page for context signals
 * @param analysisConfig Optional configuration for the classification engine
 */
export function normalizePage(page: any, blocks: any[], parentContext?: string, analysisConfig?: Partial<AnalysisConfig>): NormalizedItem[] {
    const { title, status, tags, properties } = parseProperties(page.properties);
    const sections = splitIntoSections(blocks);
    const scorer = new Scorer(analysisConfig);

    // Pass 1: Structural Signals (Page Level)
    const pageSignals = extractStructuralSignals(properties);

    // Pass 3: Context Signals (Parent Level)
    if (parentContext) {
        pageSignals.push(...extractContextSignals(parentContext));
    }

    // If only one section and no meaningful heading, treat as single item
    if (sections.length === 1 && sections[0].heading === null) {
        const section = sections[0];
        const content = blocksToMarkdown(section.blocks);

        // Pass 2: Content Signals
        const contentSignals = extractContentSignals(section.blocks);
        const textSignals = extractTextSignals(content); // Analyze generated markdown text

        // Combine all signals
        const allSignals = [...pageSignals, ...contentSignals, ...textSignals];

        // Calculate Score
        const analysis = scorer.calculateScore(allSignals);

        return [{
            id: page.id,
            type: analysis.type === 'hybrid' ? 'task' : analysis.type, // Map hybrid to task for now (safe fallback)
            title,
            content,
            status,
            tags,
            lastEdited: page.last_edited_time,
            url: page.url,
            confidence: analysis.confidence,
            analysis: {
                signals: analysis.signals.map(s => `${s.id} (${s.strength})`),
                originalType: analysis.type
            }
        }];
    }

    // Multiple sections - Analysis for each section
    const items: NormalizedItem[] = [];

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const content = blocksToMarkdown(section.blocks);

        // Skip empty sections
        if (content.trim().length === 0) continue;

        // Collect Section-Level Signals
        const sectionSignals: Signal[] = [];

        // 1. Explicit Section Heading Signals (Pass 2a)
        if (section.heading) {
            const headingSignals = extractTextSignals(section.heading);
            // Boost heading signals as they are strong indicators for sections
            headingSignals.forEach(s => s.strength += 0.2);
            sectionSignals.push(...headingSignals);
        }

        // 2. Section Content Signals (Pass 2b)
        const contentSignals = extractContentSignals(section.blocks);
        const textSignals = extractTextSignals(content);
        sectionSignals.push(...contentSignals, ...textSignals);

        // Combine with Page Signals (Inherited context)
        // If the page itself is strongly a Task (e.g. has Status), we lean towards Task
        const combinedSignals = [...pageSignals, ...sectionSignals];

        // Calculate Score
        const analysis = scorer.calculateScore(combinedSignals);

        const sectionTitle = section.heading
            ? `${title} - ${section.heading}`
            : title;

        items.push({
            id: `${page.id}_section_${i}`,
            type: analysis.type === 'hybrid' ? 'task' : analysis.type,
            title: sectionTitle,
            content,
            status,
            tags,
            lastEdited: page.last_edited_time,
            url: page.url,
            confidence: analysis.confidence,
            analysis: {
                signals: analysis.signals.map(s => `${s.id} (${s.strength})`),
                originalType: analysis.type
            }
        });
    }

    // Fallback: if no items created
    if (items.length === 0) {
        return [{
            id: page.id,
            type: 'note', // Default fallback
            title,
            content: blocksToMarkdown(blocks),
            status,
            tags,
            lastEdited: page.last_edited_time,
            url: page.url,
            confidence: 0,
            analysis: {
                signals: ['fallback'],
                originalType: 'unknown'
            }
        }];
    }

    return items;
}
