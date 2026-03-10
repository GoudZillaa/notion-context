import { Signal } from './types.js';

/**
 * Extracts signals from page properties (Pass 1: Structure)
 */
export function extractStructuralSignals(properties: any): Signal[] {
    const signals: Signal[] = [];

    // Check for Status property
    if (properties['Status'] || properties['status']) {
        signals.push({
            id: 'has_status_property',
            description: 'Page has a Status property',
            strength: 0.9,
            type: 'task'
        });
    }

    // Check for Due Date property
    if (properties['Due Date'] || properties['due_date'] || properties['Due']) {
        signals.push({
            id: 'has_due_date_property',
            description: 'Page has a Due Date property',
            strength: 0.8,
            type: 'task'
        });
    }

    // Check for Assignee property
    if (properties['Assignee'] || properties['assignee'] || properties['Person']) {
        signals.push({
            id: 'has_assignee_property',
            description: 'Page has an Assignee property',
            strength: 0.7,
            type: 'task'
        });
    }

    return signals;
}

/**
 * Extracts signals from content blocks (Pass 2: Content)
 */
export function extractContentSignals(blocks: any[]): Signal[] {
    const signals: Signal[] = [];
    let todoCount = 0;

    // Recursive function to count todos
    function countTodos(items: any[]) {
        for (const item of items) {
            if (item.type === 'to_do') {
                todoCount++;
            }
            if (item.children) {
                countTodos(item.children);
            }
        }
    }

    countTodos(blocks);

    if (todoCount > 0) {
        // Strength increases with number of todos, capped at 0.9
        const strength = Math.min(0.5 + (todoCount * 0.1), 0.9);
        signals.push({
            id: 'has_todo_blocks',
            description: `Found ${todoCount} todo blocks in content`,
            strength,
            type: 'task'
        });
    }

    return signals;
}

/**
 * Extract signals from text content (Pass 2: Content - NLP Lite)
 */
export function extractTextSignals(text: string): Signal[] {
    const signals: Signal[] = [];
    const lowerText = text.toLowerCase();

    // Imperative verbs often indicate tasks
    const imperativeVerbs = ['fix', 'deploy', 'update', 'implement', 'review', 'create', 'add', 'remove', 'delete', 'change'];
    const matchedVerbs = imperativeVerbs.filter(verb => lowerText.includes(verb));

    if (matchedVerbs.length > 0) {
        signals.push({
            id: 'has_imperative_verbs',
            description: `Found action verbs: ${matchedVerbs.slice(0, 3).join(', ')}`,
            strength: 0.4,
            type: 'task'
        });
    }

    // Note keywords
    const noteKeywords = ['reference', 'guide', 'documentation', 'notes', 'meeting minutes', 'overview'];
    const matchedNotes = noteKeywords.filter(keyword => lowerText.includes(keyword));

    if (matchedNotes.length > 0) {
        signals.push({
            id: 'has_note_keywords',
            description: `Found note keywords: ${matchedNotes.slice(0, 3).join(', ')}`,
            strength: 0.6,
            type: 'note'
        });
    }

    return signals;
}

/**
 * Extracts signals from context (Pass 3: Context)
 */
export function extractContextSignals(parentName: string): Signal[] {
    const signals: Signal[] = [];
    const lowerParent = parentName.toLowerCase();

    // Task indicators in parent name
    const taskParents = ['sprint', 'kanban', 'board', 'backlog', 'tracker', 'issues', 'bugs'];
    if (taskParents.some(p => lowerParent.includes(p))) {
        signals.push({
            id: 'parent_is_task_tracker',
            description: `Parent "${parentName}" looks like a task tracker`,
            strength: 0.7,
            type: 'task'
        });
    }

    // Note indicators in parent name
    const noteParents = ['wiki', 'docs', 'knowledge', 'resources', 'archive'];
    if (noteParents.some(p => lowerParent.includes(p))) {
        signals.push({
            id: 'parent_is_wiki',
            description: `Parent "${parentName}" looks like a wiki`,
            strength: 0.7,
            type: 'note'
        });
    }

    return signals;
}
