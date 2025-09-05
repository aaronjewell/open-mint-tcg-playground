import { renderTemplate } from './template.js';
import { resolveAllSelectors, parseSeedHex } from './selector.js';
import { ThemeDefinition, Flavor, PropertyDef } from './types.js';
import { Certificate } from '../core/index.js';

export function assembleFlavor(seedHex: string, props: Certificate['properties'], theme: ThemeDefinition): Flavor {
    const seed = parseSeedHex(seedHex);
    const ctx = resolveAllSelectors(theme, seed, props);

    const properties: PropertyDef[] = Object.entries(theme.properties).map(([key, label]) => ({ key, label, value: props[key] }));

    const title = renderTemplate(theme.templates.title, ctx as any);
    const text = renderTemplate(theme.templates.text, ctx as any);
    const imageDescription = renderTemplate(theme.image.description, ctx as any);
    const palette = renderTemplate(theme.palette, ctx as any);
    const type = renderTemplate(theme.type, ctx as any);

    const tags = [
        theme.themeId,
        ...theme.palette.split(/,\s*/g),
    ];

    return {
        properties,
        type,
        palette,
        title,
        text,
        image: { style: theme.image.style, description: imageDescription, negative: theme.image.negative },
        tags,
    };
}


