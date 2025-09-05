type Context = Record<string, string>;

function capitalizeAsciiFirst(value: string): string {
    if (!value) return value;
    const first = value[0];
    const rest = value.slice(1);
    return first.toUpperCase() + rest;
}

export function renderTemplate(template: string, ctx: Context): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+(?:\.[0-9]+)?)(\|cap)?\s*\}\}/g, (_m, varName: string, filter: string) => {
        const raw = ctx[varName as keyof typeof ctx];
        let value: string = raw ?? '';
        if (filter === '|cap') value = capitalizeAsciiFirst(value);
        return value;
    });
}


