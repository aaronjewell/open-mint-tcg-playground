#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { parseArgs } from 'util';
import { assemble, disassemble } from './assembler.js';

function usage() {
    console.log(`
VM Assembler CLI

USAGE:
  assembler-cli [OPTIONS]

OPTIONS:
  --input, -i <file>     Input file (assembly or bytecode)
  --output, -o <file>    Output file (optional, defaults to stdout)
  --disassemble, -d      Disassemble bytecode to assembly
  --help, -h             Show this help message

EXAMPLES:
  # Assemble text to bytecode
  assembler-cli -i program.asm -o program.bin

  # Disassemble bytecode to assembly
  assembler-cli -i program.bin -d
`);
}

async function main() {
    const { values: opts } = parseArgs({
        options: {
            input: { type: 'string', short: 'i' },
            output: { type: 'string', short: 'o' },
            disassemble: { type: 'boolean', short: 'd' },
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
        if (opts.disassemble) {
            // Disassemble mode
            const bytecode = await readFile(opts.input);
            const assembly = disassemble(new Uint8Array(bytecode));
            
            if (opts.output) {
                await writeFile(opts.output, assembly);
                process.stdout.write(`Disassembled to: ${opts.output}\n`);
            } else {
                process.stdout.write(assembly);
            }
        } else {
            // Assemble mode
            const text = await readFile(opts.input, 'utf-8');
            const result = assemble(text);

            if (result.errors.length > 0) {
                process.stderr.write('Assembly errors:\n');
                result.errors.forEach(error => process.stderr.write(`\t${error}\n`));
                process.exitCode = 1;
                return;
            }

            process.stdout.write('Assembly successful!\n');
            process.stdout.write(`Generated ${result.bytecode.length} bytes\n`);
            
            if (result.disassembly.length > 0) {
                process.stdout.write('\nDisassembly:\n');
                result.disassembly.forEach(line => process.stdout.write(`\t${line}\n`));
            }

            // Save bytecode if output specified
            if (opts.output) {
                await writeFile(opts.output, result.bytecode);
                process.stdout.write(`\nBytecode saved to: ${opts.output}\n`);
            }
        }

    } catch (error) {
        process.stderr.write(`Error: ${error}\n`);
        process.exitCode = 1;
        return;
    }
}

main().catch((e: any) => {
    process.stderr.write(`${e?.message ?? e}\n`);
    process.exitCode = 1;
});
