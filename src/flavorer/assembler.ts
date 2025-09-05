import { renderTemplate } from './template.js';
import { resolveAllSelectors, parseSeedHex } from './selector.js';
import { ThemeDefinition, Flavor, PropertyDef } from './types.js';
import { Certificate } from '../core/index.js';

export function assembleFlavor(seedHex: string, props: Certificate['properties'], theme: ThemeDefinition): Flavor {
    const seed = parseSeedHex(seedHex);
    const ctx = resolveAllSelectors(theme, seed, props);

    const properties: PropertyDef[] = Object.entries(theme.properties).map(([key, label]) => ({ key, label, value: props[key] }));

    ctx.style = String(theme.image.style);

    const title = renderTemplate(theme.templates.title, ctx as any);
    const text = renderTemplate(theme.templates.text, ctx as any);
    const imageDescription = renderTemplate(theme.image.description, ctx as any);

    const tags = [
        theme.themeId,
        ctx.biome,
        ...ctx.palette.split(/,\s*/g),
    ];

    return {
        type: ctx.type,
        properties,
        palette: ctx.palette,
        biome: ctx.biome,
        title,
        text,
        image: { style: theme.image.style, description: imageDescription, negative: theme.image.negative },
        tags,
    };
}


