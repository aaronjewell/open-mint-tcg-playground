#!/usr/bin/env node

/**
 * VM Module Tests - Tests for assembler, decoder, validator, and miner functionality
 */

import { assemble, disassemble, decodeTokens, parseProgram } from '../dist/card-dsl/index.js';
import assert from 'assert';

const SIMPLE_PROGRAM = `; Simple test program
DAMAGE OPPONENT 3
END`;

const COMPLEX_PROGRAM = `; Complex test program with control flow
DRAW 1
WHEN ON_ATTACK
    IF GT IMM 5 STAT_OF OPPONENT ATTACK
        DAMAGE OPPONENT 2
    ELSE
        HEAL SELF 1
    ENDIF
ENDWHEN
WHEN ON_ENTER
    BUFF_STAT SELF ATTACK 1
ENDWHEN
END`;

async function runTest(testFn) {
    try {
        await testFn();
        return true;
    } catch (error) {
        console.error(`✗ ${error.message}`);
        return false;
    }
}

async function testAssemblerBasic() {
    const result = assemble(SIMPLE_PROGRAM);
    
    assert(result.errors.length === 0, 'Assembly should succeed without errors');
    assert(result.bytecode.length > 0, 'Should generate bytecode');
    assert(result.disassembly.length > 0, 'Should generate disassembly');
    
    // Check expected bytecode structure
    assert.equal(result.bytecode.length, 5, 'Simple program should be 5 bytes');
}

async function testAssemblerComplex() {
    const result = assemble(COMPLEX_PROGRAM);
    
    assert(result.errors.length === 0, 'Complex assembly should succeed without errors');
    assert(result.bytecode.length > 7, 'Complex program should be longer than simple program');
    assert(result.disassembly.length > 5, 'Should generate multiple disassembly lines');
}

async function testAssemblerErrors() {
    const invalidProgram = `INVALID_OPCODE
PUSH_K 999
END`;
    
    const result = assemble(invalidProgram);
    assert(result.errors.length > 0, 'Should generate errors for invalid program');
}

async function testDisassemblerRoundTrip() {
    const result = assemble(SIMPLE_PROGRAM);
    assert(result.errors.length === 0, 'Assembly should succeed');
    
    const disassembled = disassemble(result.bytecode);
    assert(disassembled.includes('DAMAGE OPPONENT 3'), 'Disassembly should contain DAMAGE OPPONENT 3');
    assert(disassembled.includes('END'), 'Disassembly should contain END');
}

async function testDecoderTokens() {
    const result = assemble(SIMPLE_PROGRAM);
    assert(result.errors.length === 0, 'Assembly should succeed');
    
    const defaultConfig = { versionByte: 0x01 };
    const decodeResult = decodeTokens(result.bytecode, defaultConfig);
    
    assert(decodeResult.errors.length === 0, 'Decoding should succeed without errors');
    // DAMAGE (t,k) + END -> 2 tokens
    assert.equal(decodeResult.tokens.length, 2, 'Should extract 2 tokens');
}

async function testParserAST() {
    const result = assemble(SIMPLE_PROGRAM);
    assert(result.errors.length === 0, 'Assembly should succeed');
    
    const defaultConfig = { versionByte: 0x01 };
    const decodeResult = decodeTokens(result.bytecode, defaultConfig);
    const parseResult = parseProgram(decodeResult.tokens);
    
    assert(parseResult.errors.length === 0, 'Parsing should succeed without errors');
    assert(parseResult.ast !== undefined, 'Should generate AST');
    
    const ast = parseResult.ast;
    assert.equal(ast.topLevel.length, 1, 'Should have 1 top-level statement');
    assert.equal(ast.topLevel[0].kind, 'DAMAGE', 'First statement should be DAMAGE');
}

async function testParserComplexAST() {
    const result = assemble(COMPLEX_PROGRAM);
    assert(result.errors.length === 0, `Complex assembly should succeed: ${result.errors.join(', ')}`);
    
    const defaultConfig = { versionByte: 0x01 };
    const decodeResult = decodeTokens(result.bytecode, defaultConfig);
    assert(decodeResult.errors.length === 0, `Complex decoding should succeed: ${decodeResult.errors.join(', ')}`);
    const parseResult = parseProgram(decodeResult.tokens);
    
    assert(parseResult.errors.length === 0, `Complex parsing should succeed without errors: ${parseResult.errors.join(', ')}`);
    assert(parseResult.ast !== undefined, 'Should generate complex AST');
    
    const ast = parseResult.ast;
    
    // Check for WHEN blocks
    const whenBlocks = ast.topLevel.filter(stmt => stmt.kind === 'WHEN');
    assert.equal(whenBlocks.length, 2, 'Should have 2 WHEN blocks');
    
    // Check first WHEN block has IF statement
    const firstWhen = whenBlocks[0];
    const ifStatements = firstWhen.body.filter(stmt => stmt.kind === 'IF');
    assert.equal(ifStatements.length, 1, 'First WHEN block should contain IF statement');
    
    const ifStmt = ifStatements[0];
    assert(ifStmt.thenBranch.length > 0, 'IF should have then branch');
    assert(ifStmt.elseBranch && ifStmt.elseBranch.length > 0, 'IF should have else branch');
}

// Main test runner
async function runAllTests() {
    const tests = [
         testAssemblerBasic,
         testAssemblerComplex,
         testAssemblerErrors,
         testDisassemblerRoundTrip,
         testDecoderTokens,
         testParserAST,
         testParserComplexAST,
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const testFn of tests) {
        if (await runTest(testFn)) {
            passed++;
        } else {
            failed++;
        }
    }
    
    if (failed > 0) {
        process.exit(1);
    } else {
        console.log('OK');
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}

