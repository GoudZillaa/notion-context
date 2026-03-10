import path from 'path';
import fs from 'fs/promises';
import { NormalizedItem } from '../normalize/normalize.js';
import { ensureDir } from '../utils/fs.js';

const CONTEXT_DIR = '.project-context';

/**
 * Generates the .project-context directory and files
 */
export async function generateContext(items: NormalizedItem[]) {
    const projectRoot = process.cwd();
    const contextPath = path.join(projectRoot, CONTEXT_DIR);

    await ensureDir(contextPath);

    // Split items into tasks and notes
    const tasks = items.filter((item) => item.type === 'task');
    const notes = items.filter((item) => item.type === 'note');

    // Generate tasks.json
    await fs.writeFile(
        path.join(contextPath, 'tasks.json'),
        JSON.stringify(tasks, null, 2),
        'utf-8'
    );

    // Generate notes.json
    await fs.writeFile(
        path.join(contextPath, 'notes.json'),
        JSON.stringify(notes, null, 2),
        'utf-8'
    );

    // Generate metadata.json
    const metadata = {
        lastSync: new Date().toISOString(),
        totalItems: items.length,
        taskCount: tasks.length,
        noteCount: notes.length,
    };
    await fs.writeFile(
        path.join(contextPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf-8'
    );

    // Generate context.md
    const markdown = generateMarkdown(tasks, notes);
    await fs.writeFile(path.join(contextPath, 'context.md'), markdown, 'utf-8');

    return {
        contextPath,
        metadata,
    };
}

/**
 * Generates the main context.md content
 */
function generateMarkdown(tasks: NormalizedItem[], notes: NormalizedItem[]): string {
    let md = '# Project Context\n\n';
    md += `*Last synced: ${new Date().toLocaleString()}*\n\n`;

    if (tasks.length > 0) {
        md += '## 📋 Tasks\n\n';
        for (const task of tasks) {
            const statusIcon = task.status === 'Done' ? '✅' : '⏳';
            md += `### ${statusIcon} ${task.title}\n`;
            md += `**Status:** ${task.status || 'Pending'}\n`;
            if (task.tags.length > 0) md += `**Tags:** ${task.tags.join(', ')}\n`;
            md += `**Link:** [Notion](${task.url})\n\n`;
            md += `${task.content}\n---\n\n`;
        }
    }

    if (notes.length > 0) {
        md += '## 📝 Notes\n\n';
        for (const note of notes) {
            md += `### ${note.title}\n`;
            if (note.tags.length > 0) md += `**Tags:** ${note.tags.join(', ')}\n`;
            md += `**Link:** [Notion](${note.url})\n\n`;
            md += `${note.content}\n---\n\n`;
        }
    }

    return md;
}
