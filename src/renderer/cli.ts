#!/usr/bin/env node
import { parseArgs } from 'node:util';
import QRCode from 'qrcode';
import { renderCardSvg, RenderOptions } from './render.js';
import { generateImageDataUrl } from './openai.js';
import { readJson, readFile, saveFile } from '../util/file.js';
import { Flavor } from '../flavorer/index.js';
import { assertCertificate } from '../core/core.js';

function assertFlavor(flavor: any): asserts flavor is Flavor {
    if (flavor.type === undefined) throw new Error('Invalid flavor output, missing type');
    if (flavor.properties === undefined || typeof flavor.properties !== 'object') throw new Error('Invalid flavor output, missing properties');
    if (flavor.palette === undefined) throw new Error('Invalid flavor output, missing palette');
    if (flavor.type === undefined) throw new Error('Invalid flavor output, missing type');
    if (flavor.title === undefined) throw new Error('Invalid flavor output, missing title');
    if (flavor.text === undefined) throw new Error('Invalid flavor output, missing text');
    if (flavor.image === undefined || typeof flavor.image !== 'object' || flavor.image.style === undefined) throw new Error('Invalid flavor output, missing image');
    if (flavor.image.description === undefined) throw new Error('Invalid flavor output, missing image.description');
    if (flavor.properties === undefined || !Array.isArray(flavor.properties) || flavor.properties.length === 0) throw new Error('Invalid flavor output, missing properties');
    if (flavor.tags === undefined || !Array.isArray(flavor.tags) || flavor.tags.length === 0) throw new Error('Invalid flavor output, missing tags');
}

async function main() {
    const { values: args } = parseArgs({
        options: {
            in: { type: 'string' },
            out: { type: 'string', default: 'stdout' },
            'use-openai': { type: 'boolean', default: false },
            'openai-key': { type: 'string' },
            'openai-model': { type: 'string', default: 'gpt-image-1' },
            'openai-size': { type: 'string', default: '1024x1024' },
            cert: { type: 'string' }
        },
        strict: true,
        allowPositionals: false
    });

    const usage = 'Usage: npm run render -- --in <flavor.json> [--out <file>|stdout] [--width 744] [--height 1039] [--use-openai] [--openai-model gpt-image-1] [--openai-size 1024x1024] [--openai-key <key>] [--cert <cert.json>]';

    if (!args.in) {
        throw usage;
    }

    const flavor = await readJson(args.in);
    assertFlavor(flavor);

    const opts: RenderOptions = {}

    if (args['use-openai']) {
        if (!args['openai-key']) {
            console.error(args);
            throw usage;
        }
        try {
            const apiKey = (await readFile(args['openai-key'])).trim();
            opts.imageDataUrl = await generateImageDataUrl(flavor.image, { model: args['openai-model'], size: args['openai-size'], apiKey });
        } catch (e: any) {
            process.stderr.write(`OpenAI image generation failed: ${e?.message ?? e}\n`);
        }
    }

    if (args.cert) {
        try {
            const raw = await readFile(args.cert);
            const cert = JSON.parse(raw);
            assertCertificate(cert);
            opts.certQrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(cert), { type: 'image/webp' });
        } catch (e: any) {
            process.stderr.write(`QR generation failed: ${e?.message ?? e}\n`);
        }
    }

    const svg = renderCardSvg(flavor, opts);
    if (args.out === 'stdout') {
        process.stdout.write(svg);
    } else {
        const savedPath = await saveFile(args.out, svg);
        process.stdout.write(savedPath + '\n');
    }
}

main().catch((e: any) => {
    process.stderr.write(`${e?.message ?? e}\n`);
    process.exitCode = 1;
});