#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { parseArgs } from 'util';
import { decodeTokens, parseProgram } from './decoder.js';
import { stringifyAST } from './formatter.js';
import { Opcode } from './types.js';

function usage() {
    process.stdout.write(`
VM Decoder CLI

USAGE:
  decoder-cli [OPTIONS]

OPTIONS:
  --input, -i <file>     Input bytecode file
  --tokens, -t           Show decoded tokens
  --ast, -a              Show parsed AST
  --verbose              Show detailed output
  --help, -h             Show this help message

EXAMPLES:
  # Decode tokens from bytecode
  decoder-cli -i program.bin -t

  # Show AST structure
  decoder-cli -i program.bin -a

  # Verbose output with all information
  decoder-cli -i program.bin --verbose
`);
}

function formatTokens(tokens: any[]): string {
    const lines: string[] = [];
    
    for (const token of tokens) {
        let line = `\tPC ${token.pc.toString().padStart(3, ' ')}: ${token.op.toString().padStart(2, '0')}`;
        
        // Add opcode name
        const opName = Object.keys(Opcode).find(key => Opcode[key as keyof typeof Opcode] === token.op) || 'UNKNOWN';
        line += ` ${opName.padEnd(12, ' ')}`;
        
        // Add argument if present
        if ('k' in token) {
            line += ` k=${token.k}`;
        } else if ('t' in token) {
            line += ` target=${token.t}`;
        } else if ('s' in token) {
            line += ` stat=${token.s}`;
        } else if ('e' in token) {
            line += ` event=${token.e}`;
        }
        
        lines.push(line);
    }
    
    return lines.join('\n');
}

async function main() {
    const { values: opts } = parseArgs({
        options: {
            input: { type: 'string', short: 'i' },
            tokens: { type: 'boolean', short: 't' },
            ast: { type: 'boolean', short: 'a' },
            verbose: { type: 'boolean' },
            help: { type: 'boolean', short: 'h' }
        }
    });

    if (opts.help) {
        usage();
        return;
    }

    if (!opts.input) {
        process.stderr.write('Error: Input file required. Use --help for usage information.\n');
        process.exitCode = 1;
        return;
    }

    try {
        const bytecode = await readFile(opts.input);
        const bytes = new Uint8Array(bytecode);
        
        process.stdout.write(`Input: ${opts.input}\n`);
        process.stdout.write(`Size: ${bytes.length} bytes\n`);
        process.stdout.write(`Hex: ${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`);
        process.stdout.write('\n');

        const defaultConfig = { versionByte: 0x01, maxStackDepth: 16, maxInstructions: 64 };
        const decodeResult = decodeTokens(bytes, defaultConfig);
        
        if (decodeResult.errors.length > 0) {
            process.stdout.write('Decode errors:\n');
            decodeResult.errors.forEach(error => console.log(`\t${error}`));
            process.stdout.write('\n');
        } else {
            process.stdout.write('Decoding successful\n');
        }
        
        process.stdout.write(`Tokens found: ${decodeResult.tokens.length}\n`);
        process.stdout.write('\n');

        // Show tokens if requested or verbose
        if (opts.tokens || opts.verbose) {
            process.stdout.write('Decoded tokens:\n');
            if (decodeResult.tokens.length > 0) {
                process.stdout.write(formatTokens(decodeResult.tokens));
            } else {
                process.stdout.write('\t(no tokens)\n');
            }
            process.stdout.write('\n');
        }

        // Parse AST
        if (decodeResult.tokens.length > 0) {
            const parseResult = parseProgram(decodeResult.tokens);
            
            if (parseResult.errors.length > 0) {
                process.stdout.write('Parse errors:\n');
                parseResult.errors.forEach(error => process.stdout.write(`\t${error}\n`));
                process.stdout.write('\n');
            } else {
                process.stdout.write('Parsing successful\n');
            }

            // Show AST if requested or verbose
            if ((opts.ast || opts.verbose) && parseResult.ast) {
                process.stdout.write('Abstract Syntax Tree:\n');
                process.stdout.write(stringifyAST(parseResult.ast, { indent: 1 }).join('\n'));
                process.stdout.write('\n');
            }
        }
    } catch (error) {
        process.stderr.write(`Error: ${error}\n`);
        process.exitCode = 1;
    }
}

main().catch((e: any) => {
    process.stderr.write(`${e?.message ?? e}\n`);
    process.exitCode = 1;
});
