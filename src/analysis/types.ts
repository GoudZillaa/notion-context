export type ClassificationType = 'task' | 'note' | 'hybrid';

export interface Signal {
    id: string;
    description: string;
    strength: number; // 0.0 to 1.0
    type: ClassificationType;
}

export interface ItemSection {
    heading: string | null;
    blocks: any[];
    content: string; // Markdown
}

export interface AnalysisResult {
    type: ClassificationType;
    confidence: number; // 0.0 to 1.0
    signals: Signal[];
    sections: ItemSection[];
}

export interface AnalysisConfig {
    weights: {
        statusProperty: number;
        todoBlocks: number;
        headerKeywords: number;
        contentVerbs: number;
        dateProperties: number;
    };
    thresholds: {
        task: number; // Min confidence to be a task
        note: number; // Max confidence to be a note
    };
}

export const DEFAULT_CONFIG: AnalysisConfig = {
    weights: {
        statusProperty: 0.9,
        todoBlocks: 0.8,
        headerKeywords: 0.6,
        contentVerbs: 0.4,
        dateProperties: 0.7
    },
    thresholds: {
        task: 0.6,
        note: 0.4
    }
};
