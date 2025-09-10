/**
 * Abstract Syntax Tree (AST) types and structures for the VM.
 * 
 * These types represent the parsed structure of VM bytecode programs,
 * providing a high-level view of the program's logical structure.
 */

import { Target, Stat, EventKind, Opcode, OpcodeLabel, CmpOperand, Comparator } from './types.js';

/**
 * Individual statement types that can appear in the AST.
 * Each statement corresponds to a VM operation or control structure.
 */

type HealStmt = { kind: typeof OpcodeLabel[typeof Opcode.HEAL]; t: typeof Target[keyof typeof Target]; k: number; pc: number };
type DamageStmt = { kind: typeof OpcodeLabel[typeof Opcode.DAMAGE]; t: typeof Target[keyof typeof Target]; k: number; pc: number };
type DestroyStmt = { kind: typeof OpcodeLabel[typeof Opcode.DESTROY]; t: typeof Target[keyof typeof Target]; pc: number };
type DrawStmt = { kind: typeof OpcodeLabel[typeof Opcode.DRAW]; k: number; pc: number };
type DiscardStmt = { kind: typeof OpcodeLabel[typeof Opcode.DISCARD]; k: number; pc: number };
type BuffStatStmt = { kind: typeof OpcodeLabel[typeof Opcode.BUFF_STAT]; t: typeof Target[keyof typeof Target]; s: typeof Stat[keyof typeof Stat]; k: number; pc: number };
type DebuffStatStmt = { kind: typeof OpcodeLabel[typeof Opcode.DEBUFF_STAT]; t: typeof Target[keyof typeof Target]; s: typeof Stat[keyof typeof Stat]; k: number; pc: number };
type CreateTokenStmt = { kind: typeof OpcodeLabel[typeof Opcode.CREATE_TOKEN]; k: number; pc: number };
type IfStmt = { kind: typeof OpcodeLabel[typeof Opcode.IF]; cmp: typeof Comparator[keyof typeof Comparator]; lhs: CmpOperand; rhs: CmpOperand; thenBranch: Stmt[]; elseBranch?: Stmt[]; pc: number };
type WhenStmt = { kind: typeof OpcodeLabel[typeof Opcode.WHEN]; event: typeof EventKind[keyof typeof EventKind]; body: Stmt[]; pc: number };

export type Stmt =
    | HealStmt
    | DamageStmt
    | DestroyStmt
    | DrawStmt
    | DiscardStmt
    | BuffStatStmt
    | DebuffStatStmt
    | CreateTokenStmt
    | IfStmt
/**
 * Top-level statements that can appear at the program root.
 * Includes all regular statements plus event trigger blocks.
 */
export type TopLevelStmt =
    | Stmt
    | WhenStmt

/**
 * Complete program AST representing the entire parsed bytecode program.
 */
export interface AST {
    topLevel: TopLevelStmt[];
    /** Program counter position of the END instruction */
    endPc: number;
}
