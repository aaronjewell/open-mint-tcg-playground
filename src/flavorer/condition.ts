import { PropertiesMap } from '../core/types.js';

type Token = { type: 'num' | 'id' | 'op'; value: string };

const operators = new Set(['<=', '>=', '<', '>', '==', '!=', '&&', '||']);

function tokenize(expr: string): Token[] {
    const trimmed = expr.trim();
    if (trimmed === 'else') return [{ type: 'id', value: 'else' }];
    const parts = trimmed.split(/\s+/g).filter(Boolean);
    return parts.map((p) => {
        if (/^\d+$/.test(p)) return { type: 'num', value: p } as Token;
        if (p === 'else') return { type: 'id', value: p } as Token;
        if (operators.has(p)) return { type: 'op', value: p } as Token;
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p)) return { type: 'id', value: p } as Token;
        throw new Error(`Unsupported token in condition: ${p}`);
    });
}

// Pratt-like tiny parser with precedence: || < && < comparisons
export function evalCondition(expr: string, properties: PropertiesMap): boolean {
    const tokens = tokenize(expr);
    if (tokens.length === 1 && tokens[0].type === 'id' && tokens[0].value === 'else') return true;
    let index = 0;

    function peek(): Token | undefined { return tokens[index]; }
    function consume(): Token { return tokens[index++]; }

    function parsePrimary(): number | boolean {
        const t = consume();
        if (!t) throw new Error('Unexpected end of expression');
        if (t.type === 'num') return parseInt(t.value, 10);
        if (t.type === 'id') {
            if (t.value === 'else') return 1;
            const v = properties[t.value];
            if (typeof v === 'number') return v;
            throw new Error(`Unknown identifier: ${t.value}`);
        }
        throw new Error(`Unexpected token: ${t.value}`);
    }

    function parseComparison(): boolean {
        let left = parsePrimary();
        const next = peek();
        if (!next || next.type !== 'op' || !operators.has(next.value)) {
            // if no comparator, treat non-zero as true
            return Boolean(left);
        }
        const op = consume().value;
        const right = parsePrimary();
        if (typeof left !== 'number' || typeof right !== 'number') throw new Error('Comparison requires numeric operands');
        switch (op) {
            case '<=': return left <= right;
            case '>=': return left >= right;
            case '<': return left < right;
            case '>': return left > right;
            case '==': return left === right;
            case '!=': return left !== right;
            default: throw new Error(`Unknown comparator ${op}`);
        }
    }

    function parseAnd(): boolean {
        let value = parseComparison();
        while (peek() && peek()!.type === 'op' && peek()!.value === '&&') {
            consume();
            const rhs = parseComparison();
            value = value && rhs;
        }
        return value;
    }

    function parseOr(): boolean {
        let value = parseAnd();
        while (peek() && peek()!.type === 'op' && peek()!.value === '||') {
            consume();
            const rhs = parseAnd();
            value = value || rhs;
        }
        return value;
    }

    const result = parseOr();
    if (index !== tokens.length) throw new Error('Unexpected tokens at end of expression');
    return result;
}


