import { readJson } from '../util/file.js';
import { ThemeDefinition } from './types.js';
import path from 'node:path';

export async function loadTheme(absOrRelPath: string): Promise<ThemeDefinition> {
    const p = absOrRelPath.startsWith('/') ? absOrRelPath : path.resolve(process.cwd(), absOrRelPath);
    const theme = await readJson(p);
    validateTheme(theme);
    return theme;
}

export function validateTheme(theme: Record<string, any>): asserts theme is ThemeDefinition {
    if (theme.schemaVersion !== 1) throw new Error('Invalid schemaVersion');
    if (!theme.themeId) throw new Error('Missing themeId');
    if (!theme.locale) throw new Error('Missing locale');
    if (!theme.properties || typeof theme.properties !== 'object') throw new Error('Missing properties');
    if (!theme.selectors || typeof theme.selectors !== 'object') throw new Error('Missing selectors');
    for (const [k, v] of Object.entries(theme.selectors)) {
        const sel: any = v as any;
        if (!sel || typeof sel !== 'object' || typeof sel.kind !== 'string') throw new Error(`Invalid selector ${k}`);
        if (sel.kind === 'table') {
            if (!Array.isArray(sel.values) || sel.values.length === 0) throw new Error(`Invalid selector.values for ${k}`);
            if (typeof sel.byte !== 'number' || sel.byte < 0 || sel.byte > 31) throw new Error(`Invalid selector.byte for ${k}`);
        } else if (sel.kind === 'bucket') {
            if (!Array.isArray(sel.rules) || sel.rules.length === 0) throw new Error(`Invalid selector.rules for ${k}`);
            for (const r of sel.rules) {
                if (typeof r.when !== 'string') throw new Error(`Invalid rule.when for ${k}`);
                if (!('pick' in r) || (typeof (r as any).pick !== 'string' && !Array.isArray((r as any).pick))) throw new Error(`Invalid rule.pick for ${k}`);
            }
        } else if (sel.kind === 'assembly') {
            if (!Array.isArray(sel.rules) || sel.rules.length === 0) throw new Error(`Invalid selector.rules for ${k}`);
            for (const r of sel.rules) {
                if (typeof r.when !== 'string') throw new Error(`Invalid rule.when for ${k}`);
                if (!('use' in r) || (typeof (r as any).use !== 'string' && !Array.isArray((r as any).use))) throw new Error(`Invalid rule.use for ${k}`);
            }
        } else {
            throw new Error(`Unknown selector.kind for ${k}`);
        }
    }
    if (!theme.templates.title) throw new Error('Missing templates.title');
    if (!theme.templates.text) throw new Error('Missing templates.text');
    if (!theme.image.style) throw new Error('Missing image.style');
    if (!theme.image.description) throw new Error('Missing image.description');
}


