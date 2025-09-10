import { SeasonConfig } from '../core/types.js';

export interface MiningStrategy {
    name: string;
    checkViability(code: string): Promise<boolean>;
    buildProgram(code: string): Promise<any>;
    showDetails(program: any): string;
}

export class BasicViabilityStrategy implements MiningStrategy {
    name = 'basic';

    constructor(
        private viabilitySuffix: string,
        private threshold: number
    ) { }

    async checkViability(code: string): Promise<boolean> {
        const { sha256Hex } = await import('../core/crypto.js');
        const { countChar } = await import('../core/util.js');
        const v = await sha256Hex(code + this.viabilitySuffix);
        const z = countChar(v, '0');
        return z >= this.threshold;
    }

    async buildProgram(code: string): Promise<null> {
        return null; // No program for basic strategy
    }

    showDetails(): string {
        return ''; // No program details for basic strategy
    }
}

export function createStrategy(
    strategyName: string,
    cfg: SeasonConfig
): MiningStrategy {
    const { viability } = cfg.mining;

    switch (strategyName) {
        case 'basic':
            return new BasicViabilityStrategy(viability.suffix, viability.threshold);
        default:
            throw new Error(`Unknown strategy: ${strategyName}`);
    }
}
