import { ThemeDefinition, TableSelector, BucketSelector, AssemblySelector } from './types.js';
import { evalCondition } from './condition.js';
import { Certificate } from '../core/index.js';

export function parseSeedHex(seedHex: string): Uint8Array {
    if (!/^[0-9a-f]{64}$/.test(seedHex)) throw new Error('seed must be 64-char lowercase hex');
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        out[i] = parseInt(seedHex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

export function pickFromArray(values: string[], seed: Uint8Array, byteIndex: number): string {
    const i = seed[byteIndex % seed.length] % values.length;
    return values[i];
}

export function resolveSelectorValue(theme: ThemeDefinition, seed: Uint8Array, properties: Certificate['properties'], key: string): string {
    const sel = theme.selectors[key];
    if (!sel) throw new Error(`Missing selector ${key}`);
    if (sel.kind === 'table') {
        const s = sel as TableSelector;
        return pickFromArray(s.values, seed, s.byte);
    }
    if (sel.kind === 'bucket') {
        const b = sel as BucketSelector;
        let elsePick: string[] | null = null;
        for (const rule of b.rules) {
            if (rule.when.trim() === 'else') { elsePick = rule.pick; continue; }
            try {
                if (evalCondition(rule.when, properties)) {
                    return pickFromArray(rule.pick, seed, 0);
                }
            } catch {
                // skip invalid condition
            }
        }
        if (elsePick) return pickFromArray(elsePick, seed, 0);
        throw new Error(`No matching rule for bucket selector ${key}`);
    }
    throw new Error(`Unknown selector kind for ${key}`);
}

export function resolveAllSelectors(theme: ThemeDefinition, seed: Uint8Array, properties: Certificate['properties']): Record<string, string> {
    const out: Record<string, string> = {};
    const assemblyKeys: string[] = [];
    for (const [key, sel] of Object.entries(theme.selectors)) {
        if (sel.kind === 'assembly') { assemblyKeys.push(key); continue; }
        out[key] = resolveSelectorValue(theme, seed, properties, key);
    }
    for (const key of assemblyKeys) {
        const sel = theme.selectors[key] as AssemblySelector;
        let use: string[] | null = null;
        let elseUse: string[] | null = null;
        for (const rule of sel.rules) {
            if (rule.when.trim() === 'else') { elseUse = rule.use; continue; }
            try {
                if (evalCondition(rule.when, properties)) { use = rule.use; break; }
            } catch {
                // skip invalid condition
            }
        }
        if (!use) use = elseUse;
        if (!use) throw new Error(`No matching rule for assembly selector ${key}`);
        use.forEach((token, idx) => {
            const val = token in out ? out[token] : resolveSelectorValue(theme, seed, properties, token);
            out[`${key}.${idx}`] = val;
        });
    }
    return out;
}


