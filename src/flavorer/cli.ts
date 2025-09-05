#!/usr/bin/env node
import { assembleFlavor } from './index.js';
import { loadTheme } from './loader.js';
import { readJson } from '../util/file.js';
import { parseArgs } from 'node:util';
import { assertCertificate } from '../core/core.js';
import { saveFile } from '../util/index.js';

async function main() {
    const { values: args } = parseArgs({
        options: {
            cert: { type: 'string' },
            theme: { type: 'string' },
            out: { type: 'string', default: 'stdout' }
        },
        strict: true,
        allowPositionals: false
    });

    if (!args.cert || !args.theme) {
        throw 'Usage: npm run flavor -- --cert <cert.json> --theme <path> [--out <file>|stdout]';
    }

    const cert = await readJson(args.cert);
    assertCertificate(cert);

    const theme = await loadTheme(args.theme);
    const result = assembleFlavor(cert.seedHex, cert.properties, theme);

    const output = JSON.stringify(result, null, 2);

    if (args.out === 'stdout') {
        process.stdout.write(output + '\n');
    } else {
        const savedPath = await saveFile(args.out, output);
        process.stdout.write(savedPath + '\n');
    }
}

main().catch((e: any) => {
    process.stderr.write(`${e?.message ?? e}\n`);
    process.exitCode = 1;
});