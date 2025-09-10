import { sha256Bytes } from "../core/crypto.js";
import { bytesToHex, countChar } from "../core/util.js";
import { decodeTokens, parseProgram, checkSemantics } from "./decoder.js";
import { stringifyAST } from "./formatter.js";

const MIN_VIABILITY_ZEROS = 11;
const PRINT_SAMPLE_LIMIT = 10;

const stats = {
    codes: 0,
    syntaxValid: 0,
    semanticValid: 0,
    viabilityValid: 0,
    viabilityInvalid: 0,
    semanticValidAndViabilityValid: 0,
};

const samples: { code: string; hex: string; ast: string[] }[] = [];

const parseErrorCounts = new Map<string, number>();
const semanticErrorCounts = new Map<string, number>();
let count = 0;

// Collect a small sample of programs that are both semantically valid and viability-valid
for (const code of randomCharStream('abcd', 12)) {
    if (count >= (4 ** 10)) break;

    stats.codes++;

    const bytes = await sha256Bytes(code + ':viability');
    const hex = bytesToHex(bytes);

    const z = countChar(hex, '0');
    if (z >= MIN_VIABILITY_ZEROS) stats.viabilityValid++;
    else stats.viabilityInvalid++;


    const { tokens } = decodeTokens(bytes, { versionByte: 0x01 });
    const { ast, errors } = parseProgram(tokens);

    if (ast) {
        if (errors.length === 0) stats.syntaxValid++;

        const semanticErrors = checkSemantics(ast);
        if (errors.length === 0 && semanticErrors.length === 0 && ast.topLevel.length > 0) {
            stats.semanticValid++;
            if (z >= MIN_VIABILITY_ZEROS) {
                stats.semanticValidAndViabilityValid++;
                if (ast.topLevel.length > 0 && samples.length < PRINT_SAMPLE_LIMIT) {
                    samples.push({ code, hex, ast: stringifyAST(ast) });
                }
            }
        } else {
            if (errors.length > 0) {
                for (const e of errors) parseErrorCounts.set(e, (parseErrorCounts.get(e) ?? 0) + 1);
            }
            if (semanticErrors.length > 0) {
                for (const e of semanticErrors) semanticErrorCounts.set(e.msg, (semanticErrorCounts.get(e.msg) ?? 0) + 1);
            }
        }
    }

    count++;
}

const pct = (n: number, d: number) => d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%';
console.log(`
# Viability Stats

## Parameters
- SAMPLE_LIMIT: ${PRINT_SAMPLE_LIMIT}
- MIN_VIABILITY_ZEROS: ${MIN_VIABILITY_ZEROS}

## Stats
- Codes: ${Intl.NumberFormat('en-US').format(stats.codes)}
- Viability valid: ${Intl.NumberFormat('en-US').format(stats.viabilityValid)} (${pct(stats.viabilityValid, stats.codes)})
- Viability invalid: ${Intl.NumberFormat('en-US').format(stats.viabilityInvalid)} (${pct(stats.viabilityInvalid, stats.codes)})
- Syntax-valid programs: ${Intl.NumberFormat('en-US').format(stats.syntaxValid)} (${pct(stats.syntaxValid, stats.codes)})
- Semantic-valid programs: ${Intl.NumberFormat('en-US').format(stats.semanticValid)} (${pct(stats.semanticValid, stats.codes)})
- Semantic-valid programs and viability valid: ${Intl.NumberFormat('en-US').format(stats.semanticValidAndViabilityValid)} (${pct(stats.semanticValidAndViabilityValid, stats.codes)})
`);

printTop(parseErrorCounts, '## Parse errors:');
printTop(semanticErrorCounts, '## Semantic errors:');

if (samples.length > 0) {
    console.log(`\n${samples.length} sample semantically + viability valid programs with at least one statement:`);
    for (const s of samples) {
        console.log(`\nCode: ${s.code}`);
        console.table(s.ast.map(Statements => ({ Statements })))
    }
}

function printTop(map: Map<string, number>, label: string) {
    if (map.size === 0) return;
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([msg, n]) => ({ msg, n }));
    console.log(label);
    console.table(sorted, ['n', 'msg']);
}

function* randomCharStream(alphabet: string, length: number): Generator<string, never, undefined> {
    const chars = alphabet.split('');
    while (true) {
        let s = '';
        for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
        yield s;
    }
}
