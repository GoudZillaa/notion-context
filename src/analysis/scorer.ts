import { AnalysisResult, Signal, AnalysisConfig, DEFAULT_CONFIG } from './types.js';

export class Scorer {
    private config: AnalysisConfig;

    constructor(config: Partial<AnalysisConfig> = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
            weights: { ...DEFAULT_CONFIG.weights, ...config.weights },
            thresholds: { ...DEFAULT_CONFIG.thresholds, ...config.thresholds }
        };
    }

    /**
     * Calculates the final classification score based on detected signals
     */
    public calculateScore(signals: Signal[]): AnalysisResult {
        let taskScore = 0;
        let noteScore = 0;
        let hybridScore = 0;

        // Sum up signals
        for (const signal of signals) {
            if (signal.type === 'task') {
                taskScore += signal.strength;
            } else if (signal.type === 'note') {
                noteScore += signal.strength;
            } else {
                hybridScore += signal.strength;
            }
        }

        // Normalize scores (simple implementation for now)
        // In a real system we might use a sigmoid function or Bayesian updates
        const totalStrength = taskScore + noteScore + hybridScore;
        const taskConfidence = totalStrength > 0 ? (taskScore + (hybridScore * 0.5)) / totalStrength : 0;

        // Boost confidence if strong signals detected (like Status property)
        // This ensures a single strong signal can drive the decision
        const maxSignalStrength = Math.max(...signals.map(s => s.strength), 0);

        // Final confidence calculation (weighted average of aggregate and max signal)
        let finalConfidence = (taskConfidence * 0.7) + (maxSignalStrength * 0.3);

        // Determine type based on thresholds
        let type: 'task' | 'note' | 'hybrid';

        if (finalConfidence >= this.config.thresholds.task) {
            type = 'task';
        } else if (finalConfidence <= this.config.thresholds.note) {
            type = 'note';
        } else {
            type = 'hybrid';
        }

        // Special override: If we have a Status property signal (strength 0.9+), force Task
        const hasStatusProperty = signals.some(s => s.id === 'has_status_property' && s.strength >= 0.9);
        if (hasStatusProperty) {
            type = 'task';
            finalConfidence = Math.max(finalConfidence, 0.95);
        }

        return {
            type,
            confidence: Math.min(finalConfidence, 1.0), // Cap at 1.0
            signals,
            sections: [] // Will be filled by the caller
        };
    }
}
