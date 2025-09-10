/**
 * AST string representation utilities for the VM.
 * 
 * This module provides functions to convert parsed AST structures
 * into human-readable string representations for debugging and display.
 */

import { OpcodeLabel, Opcode, EventKindLabel, TargetLabel, StatLabel, CmpOperand, CmpOperandKind, ComparatorLabel } from './types.js';
import { AST, TopLevelStmt, Stmt } from './ast.js';

/**
 * Converts a complete program AST into a formatted string representation.
 * Shows the program structure with proper indentation and includes metadata.
 */
export function stringifyAST(ast: AST, { indent = 0 }: { indent?: number } = { indent: 0 }): string[] {
    const lines: string[] = [];
    
    for (const stmt of ast.topLevel) {
        lines.push(...stringifyTopLevelStmt(stmt, { indent }));
    }

    return lines;
}

/**
 * Converts a top-level statement (including WHEN blocks) to string representation.
 * Handles both regular statements and event trigger blocks.
 */
export function stringifyTopLevelStmt(stmt: TopLevelStmt, { indent = 0 }: { indent?: number } = {}): string[] {
    switch (stmt.kind) {
        case OpcodeLabel[Opcode.WHEN]:
            const eventName = EventKindLabel[stmt.event];
            const lines = [`${OpcodeLabel[Opcode.WHEN]} ${eventName}`];
            for (const bodyStmt of stmt.body) {
                lines.push(...stringifyStmt(bodyStmt, { indent: indent + 1 }));
            }
            lines.push(`${OpcodeLabel[Opcode.ENDWHEN]}`);
            return lines;
        case OpcodeLabel[Opcode.IF]:
        case OpcodeLabel[Opcode.HEAL]:
        case OpcodeLabel[Opcode.DAMAGE]:
        case OpcodeLabel[Opcode.DESTROY]:
        case OpcodeLabel[Opcode.DRAW]:
        case OpcodeLabel[Opcode.DISCARD]:
        case OpcodeLabel[Opcode.BUFF_STAT]:
        case OpcodeLabel[Opcode.DEBUFF_STAT]:
        case OpcodeLabel[Opcode.CREATE_TOKEN]:
            return stringifyStmt(stmt, { indent });
        default:
            const _exhaustive: never = stmt;
            return _exhaustive;
    }
    
}

/**
 * Converts a regular statement to string representation.
 * Handles all statement types including control flow structures.
 */
export function stringifyStmt(stmt: Stmt, { indent = 0 }: { indent?: number } = {}): string[] {
    const prefix = '    '.repeat(indent);
    
    switch (stmt.kind) {
        case OpcodeLabel[Opcode.DAMAGE]:
            return [`${prefix}${OpcodeLabel[Opcode.DAMAGE]} ${TargetLabel[stmt.t]} ${stmt.k}`];
        case OpcodeLabel[Opcode.HEAL]:
            return [`${prefix}${OpcodeLabel[Opcode.HEAL]} ${TargetLabel[stmt.t]} ${stmt.k}`];
        case OpcodeLabel[Opcode.DESTROY]:
            return [`${prefix}${OpcodeLabel[Opcode.DESTROY]} ${TargetLabel[stmt.t]}`];
        case OpcodeLabel[Opcode.DRAW]:
            return [`${prefix}${OpcodeLabel[Opcode.DRAW]} ${stmt.k}`];
        case OpcodeLabel[Opcode.DISCARD]:
            return [`${prefix}${OpcodeLabel[Opcode.DISCARD]} ${stmt.k}`];
        case OpcodeLabel[Opcode.BUFF_STAT]:
            return [`${prefix}${OpcodeLabel[Opcode.BUFF_STAT]} ${TargetLabel[stmt.t]} ${StatLabel[stmt.s]} ${stmt.k}`];
        case OpcodeLabel[Opcode.DEBUFF_STAT]:
            return [`${prefix}${OpcodeLabel[Opcode.DEBUFF_STAT]} ${TargetLabel[stmt.t]} ${StatLabel[stmt.s]} ${stmt.k}`];
        case OpcodeLabel[Opcode.CREATE_TOKEN]:
            return [`${prefix}${OpcodeLabel[Opcode.CREATE_TOKEN]} ${stmt.k}`];
        case OpcodeLabel[Opcode.IF]: {
            const fmtOp = (side: CmpOperand) => side.kind === CmpOperandKind.IMM
                ? `IMM ${side.k}`
                : `STAT_OF ${TargetLabel[side.t]} ${StatLabel[side.s]}`;
            const lines = [`${prefix}${OpcodeLabel[Opcode.IF]} ${ComparatorLabel[stmt.cmp]} ${fmtOp(stmt.lhs)} ${fmtOp(stmt.rhs)}`]
            for (const thenStmt of stmt.thenBranch) {
                lines.push(...stringifyStmt(thenStmt, { indent: indent + 1 }));
            }
            if (stmt.elseBranch && stmt.elseBranch.length > 0) {
                lines.push(`${prefix}${OpcodeLabel[Opcode.ELSE]}`);
                for (const elseStmt of stmt.elseBranch) {
                    lines.push(...stringifyStmt(elseStmt, { indent: indent + 1 }));
                }
            }
            lines.push(`${prefix}${OpcodeLabel[Opcode.ENDIF]}`);
            return lines;
        }
        default:
            const _exhaustive: never = stmt;
            return _exhaustive;
    }
}
