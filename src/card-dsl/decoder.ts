/**
 * Bytecode decoding and parsing logic for the VM.
 * 
 * This module handles the low-level conversion of raw bytecode into tokens
 * and then parses those tokens into an Abstract Syntax Tree (AST).
 * 
 * Also includes some basic semantic checking to ensure the program is valid.
 */

import { DecoderConfig, Token, Opcode, isOpcode, OpcodeLabel, CmpOperand, CmpOperandKind, Comparator, Target, Stat, EventKind, K4, OPCODES } from './types.js';
import { AST, TopLevelStmt, Stmt } from './ast.js';

/**
 * Decodes raw bytecode bytes into a sequence of tokens.
 * Handles opcode argument parsing, and should likely also encode
 * a version token in the output in the future.
 */
export function decodeTokens(bytes: Uint8Array, cfg: DecoderConfig): {
    tokens: Token[];
    errors: string[];
} {
    const errors: string[] = [];
    let i = 0;

    if (bytes.length < 1) {
        errors.push(`Missing bytecode (need at least 1 byte).`);
        return { tokens: [], errors };
    }

    const clampK: (raw: number) => 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 = (raw: number) => raw % 16 as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15; // small immediate 0..15
    const clampK4: (raw: number) => 0 | 1 | 2 | 3 = (raw: number) => raw % 4 as 0 | 1 | 2 | 3; // small immediate 1..4
    const clampTarget: (raw: number) => typeof Target[keyof typeof Target] = (raw: number) => raw % 7 as 0 | 1 | 2 | 3 | 4 | 5 | 6; // targets 0..6
    const clampStat: (raw: number) => typeof Stat[keyof typeof Stat] = (raw: number) => raw % 2 as 0 | 1; // stats 0..1
    const clampEvent: (raw: number) => typeof EventKind[keyof typeof EventKind] = (raw: number) => raw % 5 as 0 | 1 | 2 | 3 | 4; // events 0..4
    const clampCmp: (raw: number) => typeof Comparator[keyof typeof Comparator] = (raw: number) => raw % 3 as 0 | 1 | 2; // cmp 0..2
    const clampCmpOperandKind: (raw: number) => typeof CmpOperandKind[keyof typeof CmpOperandKind] = (raw: number) => raw % 2 as 0 | 1; // cmp operand kind 0..1

    i = 1;

    const tokens: Token[] = [];
    const argCount = (op: typeof Opcode[keyof typeof Opcode]) => {
        switch (op) {
            case Opcode.WHEN: return 1;
            case Opcode.IF: return 1 + 3 + 3; // cmp + lhs(3) + rhs(3)
            case Opcode.HEAL: return 2; // target, amount
            case Opcode.DAMAGE: return 2; // target, amount
            case Opcode.DESTROY: return 1; // target
            case Opcode.DRAW: return 1; // amount
            case Opcode.DISCARD: return 1; // amount
            case Opcode.BUFF_STAT: return 3; // target, stat, amount
            case Opcode.DEBUFF_STAT: return 3; // target, stat, amount
            default: return 0;
        }
    };

    while (i < bytes.length) {
        const pc = i;
        const op = bytes[i++] % OPCODES.size;

        if (!isOpcode(op)) {
            errors.push(`Unknown opcode 0x${op} at byte ${pc}.`);
            break;
        }

        const needed = argCount(op);
        if (i + needed > bytes.length) {
            errors.push(`Opcode 0x${op.toString(16)} at ${pc} missing ${i + needed - bytes.length} argument byte(s).`);
            break;
        }

        switch (op) {
            case Opcode.WHEN: {
                const e = clampEvent(bytes[i++]);
                tokens.push({ op, e, pc });
                break;
            }
            case Opcode.HEAL: {
                const t = clampTarget(bytes[i++]);
                const k = (clampK4(bytes[i++]) + 1) as K4;
                tokens.push({ op, t, k, pc });
                break;
            }
            case Opcode.IF: {
                let lhs: CmpOperand;
                let rhs: CmpOperand;

                const cmp = clampCmp(bytes[i++]);

                const lhsKind = clampCmpOperandKind(bytes[i++]);
                switch (lhsKind) {
                    case CmpOperandKind.IMM:
                        const k = clampK(bytes[i++]);
                        lhs = { kind: CmpOperandKind.IMM, k };
                        break;
                    case CmpOperandKind.STAT_OF:
                        const t = clampTarget(bytes[i++]);
                        const s = clampStat(bytes[i++]);
                        lhs = { kind: CmpOperandKind.STAT_OF, s, t };
                        break;
                    default:
                        const _exhaustive: never = lhsKind;
                        return _exhaustive;
                }

                const rhsKind = clampCmpOperandKind(bytes[i++]);
                switch (rhsKind) {
                    case CmpOperandKind.IMM:
                        const k = clampK(bytes[i++]);
                        rhs = { kind: CmpOperandKind.IMM, k };
                        break;
                    case CmpOperandKind.STAT_OF:
                        const t = clampTarget(bytes[i++]);
                        const s = clampStat(bytes[i++]);
                        rhs = { kind: CmpOperandKind.STAT_OF, s, t };
                        break;
                    default:
                        const _exhaustive: never = rhsKind;
                        return _exhaustive;
                }

                tokens.push({ op, cmp, lhs, rhs, pc });
                break;
            }
            case Opcode.CREATE_TOKEN: {
                const k = (clampK4(bytes[i++]) + 1) as K4;
                tokens.push({ op, k, pc });
                break;
            }
            case Opcode.DAMAGE: {
                const t = clampTarget(bytes[i++]);
                const k = (clampK4(bytes[i++]) + 1) as K4;
                tokens.push({ op, t, k, pc });
                break;
            }
            case Opcode.DESTROY: {
                const t = clampTarget(bytes[i++]);
                tokens.push({ op, t, pc });
                break;
            }
            case Opcode.DRAW: {
                const k = (clampK4(bytes[i++]) + 1) as K4;
                tokens.push({ op, k, pc });
                break;
            }
            case Opcode.DISCARD: {
                const k = (clampK4(bytes[i++]) + 1) as K4;
                tokens.push({ op, k, pc });
                break;
            }
            case Opcode.BUFF_STAT: {
                const t = clampTarget(bytes[i++]);
                const s = clampStat(bytes[i++]);
                const k = (clampK4(bytes[i++]) + 1) as K4;
                tokens.push({ op, t, s, k, pc });
                break;
            }
            case Opcode.DEBUFF_STAT: {
                const t = clampTarget(bytes[i++]);
                const s = clampStat(bytes[i++]);
                const k = (clampK4(bytes[i++]) + 1) as K4;
                tokens.push({ op, t, s, k, pc });
                break;
            }
            case Opcode.ELSE:
            case Opcode.ENDIF:
            case Opcode.ENDWHEN:
            case Opcode.END: {
                tokens.push({ op, pc });
                break;
            }
            default: {
                const _exhaustive: never = op;
                return _exhaustive;
            }
        }

        if (op === Opcode.END) {
            break;
        }
    }

    // If we fell out of loop without END, add END token.
    if (tokens.length === 0 || tokens[tokens.length - 1].op !== Opcode.END) {
        tokens.push({ op: Opcode.END, pc: i - 1 });
    }

    return { tokens, errors };
}

/**
 * Parses a sequence of tokens into an Abstract Syntax Tree.
 * Handles control flow structures (IF/ELSE/ENDIF, WHEN/ENDWHEN) and validates syntax.
 */
export function parseProgram(tokens: Token[]): { ast?: AST; errors: string[] } {
    const errors: string[] = [];
    let idx = 0;

    const peek = () => tokens[idx];
    const atEnd = () => idx >= tokens.length;
    const consume = () => tokens[idx++];

    const topLevel: TopLevelStmt[] = [];

    function parseStmtSeq(stopOps: typeof Opcode[keyof typeof Opcode][]): Stmt[] {
        const seq: Stmt[] = [];
        while (!atEnd()) {
            const t = peek();
            if (stopOps.includes(t.op)) break;

            const s = parseStmt();
            if (!s) {
                continue;
            };
            seq.push(s);
        }
        return seq;
    }

    function expect(op: typeof Opcode[keyof typeof Opcode]): Token | undefined {
        if (atEnd()) {
            errors.push(`Expected ${OpcodeLabel[op]} but reached end.`);
            return;
        }
        const t = consume();
        if (t.op !== op) {
            errors.push(`Expected ${OpcodeLabel[op]} but found ${OpcodeLabel[t.op]} at ${t.pc}.`);
        }
        return t;
    }

    function parseIf(): Stmt | undefined {
        const token = expect(Opcode.IF);
        if (!token) return;

        if (!('cmp' in token)) {
            errors.push(`Expected comparison operator at token ${token.pc}.`);
            return;
        }

        const { cmp, lhs, rhs, pc } = token;

        const thenBranch = parseStmtSeq([Opcode.ELSE, Opcode.ENDIF]);

        let elseBranch: Stmt[] | undefined;
        if (!atEnd() && peek().op === Opcode.ELSE) {
            consume(); // ELSE
            elseBranch = parseStmtSeq([Opcode.ENDIF]);
        }

        const end = expect(Opcode.ENDIF);
        if (!end) return;

        return { kind: OpcodeLabel[Opcode.IF], cmp, lhs, rhs, thenBranch, elseBranch, pc } as any;
    }

    function parseWhen(): TopLevelStmt | undefined {
        const w = expect(Opcode.WHEN);
        if (!w) return;

        if (!('e' in w)) {
            errors.push(`Expected event kind at token ${w.pc}.`);
            return;
        }

        const body = parseStmtSeq([Opcode.ENDWHEN]);

        return { kind: OpcodeLabel[Opcode.WHEN], event: w.e, body, pc: w.pc };
    }

    function parseStmt(): Stmt | undefined {
        if (atEnd()) {
            errors.push(`Unexpected end of input while parsing statement.`);
            return;
        }
        const t = consume();

        switch (t.op) {
            case Opcode.DAMAGE: return { kind: OpcodeLabel[Opcode.DAMAGE], t: t.t, k: t.k, pc: t.pc };
            case Opcode.HEAL: return { kind: OpcodeLabel[Opcode.HEAL], t: t.t, k: t.k, pc: t.pc };
            case Opcode.BUFF_STAT: return { kind: OpcodeLabel[Opcode.BUFF_STAT], t: t.t, s: t.s, k: t.k, pc: t.pc };
            case Opcode.DEBUFF_STAT: return { kind: OpcodeLabel[Opcode.DEBUFF_STAT], t: t.t, s: t.s, k: t.k, pc: t.pc };
            case Opcode.DRAW: return { kind: OpcodeLabel[Opcode.DRAW], k: t.k, pc: t.pc };
            case Opcode.DISCARD: return { kind: OpcodeLabel[Opcode.DISCARD], k: t.k, pc: t.pc };
            case Opcode.DESTROY: return { kind: OpcodeLabel[Opcode.DESTROY], t: t.t, pc: t.pc };
            case Opcode.CREATE_TOKEN: return { kind: OpcodeLabel[Opcode.CREATE_TOKEN], k: t.k, pc: t.pc };
            case Opcode.IF: {
                // We consumed IF already; back up idx by 1 and let parseIf re-consume cleanly.
                idx--;
                return parseIf();
            }
            case Opcode.WHEN: {
                return; // WHEN blocks are only valid at top-level; ignore inside sequences
            }
            case Opcode.ENDWHEN:
            case Opcode.ELSE:
            case Opcode.ENDIF:
                return; // toss out unused ELSE/ENDIF/ENDWHEN/END
            case Opcode.END:
                errors.push(`Unexpected ${OpcodeLabel[t.op]} inside statement sequence at pc=${t.pc}.`);
                return; // toss out unused END
            default:
                const _exhaustive: never = t;
                return _exhaustive;
        }
    }

    // Top-level: { Stmt | WhenBlock } until END
    while (!atEnd()) {
        const t = peek();
        if (t.op === Opcode.END) {
            const endPc = t.pc;
            // consume END for completeness
            consume();

            return {
                ast: {
                    topLevel,
                    endPc,
                },
                errors,
            };
        }
        
        if (t.op === Opcode.ENDWHEN) { // ignore ENDWHEN that does not close WHEN
            consume();
            continue;
        }

        if (t.op === Opcode.WHEN) {
            const w = parseWhen();
            if (w) {
                topLevel.push(w);
                const t = peek();
                if (t?.op === Opcode.ENDWHEN) {
                    consume();
                }
                continue;
            }
        }

        const s = parseStmt();
        if (s) {
            topLevel.push(s);
        }
    }

    return { errors };
}

export function checkSemantics(ast: AST): { msg: string; pc: number }[] {
    const errors: { msg: string; pc: number }[] = [];

    type StmtMap<Stmts extends TopLevelStmt> = {
        [S in Stmts as S['kind']]?: S[]
    };

    type Ctx = { visited: StmtMap<TopLevelStmt> };

    function visitStmtSeq(seq: Stmt[], ctx: Ctx) {
        for (const s of seq) {
            visitStmt(s, ctx);
        }
    }
    
    function visitStmt(s: Stmt, ctx: Ctx): void {
        switch (s.kind) {
            case OpcodeLabel[Opcode.DISCARD]:
                const discardStmts = ctx.visited[OpcodeLabel[Opcode.DISCARD]] ?? [];
                if (discardStmts.length > 0) {
                    errors.push({ msg: `Multiple DISCARD operations`, pc: s.pc });
                }
                discardStmts.push(s);
                ctx.visited[OpcodeLabel[Opcode.DISCARD]] = discardStmts;
                break;
            case OpcodeLabel[Opcode.DESTROY]:
                const destroyStmts = ctx.visited[OpcodeLabel[Opcode.DESTROY]] ?? [];
                if (destroyStmts.length > 0) {
                    for (const d of destroyStmts) {
                        if (d.t === s.t) {
                            errors.push({ msg: `Multiple DESTROY operations for the same target`, pc: s.pc });
                        }
                    }
                }
                destroyStmts.push(s);
                ctx.visited[OpcodeLabel[Opcode.DESTROY]] = destroyStmts;
                break;
            case OpcodeLabel[Opcode.IF]:
                if (s.thenBranch.length === 0) {
                    errors.push({ msg: `Empty THEN branch`, pc: s.pc });
                } else {
                    visitStmtSeq(s.thenBranch, ctx);
                }
                if (s.elseBranch && s.elseBranch.length === 0) {
                    errors.push({ msg: `Empty ELSE branch`, pc: s.pc });
                } else {
                    visitStmtSeq(s.elseBranch ?? [], ctx);
                }

                if (s.lhs.kind === CmpOperandKind.IMM && s.rhs.kind === CmpOperandKind.IMM) {
                    errors.push({ msg: `IMM direct comparisons not allowed`, pc: s.pc });
                }
                break;
            case OpcodeLabel[Opcode.DEBUFF_STAT]:
                const debuffStatStmts = ctx.visited[OpcodeLabel[Opcode.DEBUFF_STAT]] ?? [];
                for (const d of debuffStatStmts) {
                    if (d.t === s.t && d.s === s.s) {
                        errors.push({ msg: `Multiple DEBUFF_STAT operations for the same target and stat`, pc: s.pc });
                    }
                }
                debuffStatStmts.push(s);
                ctx.visited[OpcodeLabel[Opcode.DEBUFF_STAT]] = debuffStatStmts;
                break;
            case OpcodeLabel[Opcode.DRAW]:
                const drawStmts = ctx.visited[OpcodeLabel[Opcode.DRAW]] ?? [];
                if (drawStmts.length > 0) {
                    errors.push({ msg: `Multiple DRAW operations not allowed`, pc: s.pc });
                }
                drawStmts.push(s);
                ctx.visited[OpcodeLabel[Opcode.DRAW]] = drawStmts;
                break;
            case OpcodeLabel[Opcode.DAMAGE]:
                const damageStmts = ctx.visited[OpcodeLabel[Opcode.DAMAGE]] ?? [];
                for (const d of damageStmts) {
                    if (d.t === s.t) {
                        errors.push({ msg: `Multiple DAMAGE operations for the same target`, pc: s.pc });
                    }
                }
                damageStmts.push(s);
                ctx.visited[OpcodeLabel[Opcode.DAMAGE]] = damageStmts;
                break;
            case OpcodeLabel[Opcode.HEAL]:
                const healStmts = ctx.visited[OpcodeLabel[Opcode.HEAL]] ?? [];
                for (const h of healStmts) {
                    if (h.t === s.t) {
                        errors.push({ msg: `Multiple HEAL operations for the same target`, pc: s.pc });
                    }
                }
                healStmts.push(s);
                ctx.visited[OpcodeLabel[Opcode.HEAL]] = healStmts;
                break;
            case OpcodeLabel[Opcode.CREATE_TOKEN]:
                const createTokenStmts = ctx.visited[OpcodeLabel[Opcode.CREATE_TOKEN]] ?? [];
                if (createTokenStmts.length > 0) {
                    errors.push({ msg: `Multiple CREATE_TOKEN operations`, pc: s.pc });
                }
                createTokenStmts.push(s);
                ctx.visited[OpcodeLabel[Opcode.CREATE_TOKEN]] = createTokenStmts;
                break;
            case OpcodeLabel[Opcode.BUFF_STAT]:
                const buffStatStmts = ctx.visited[OpcodeLabel[Opcode.BUFF_STAT]] ?? [];
                for (const b of buffStatStmts) {
                    if (b.t === s.t && b.s === s.s) {
                        errors.push({ msg: `Multiple BUFF_STAT operations for the same target and stat`, pc: s.pc });
                    }
                }
                buffStatStmts.push(s);
                ctx.visited[OpcodeLabel[Opcode.BUFF_STAT]] = buffStatStmts;
                break;
            default:
                const _exhaustive: never = s;
                void _exhaustive;
        }
    }

    let ctx: Ctx = { visited: {} };

    for (const t of ast.topLevel) {
        switch (t.kind) {
            case OpcodeLabel[Opcode.WHEN]:
                if (t.body.length === 0) {
                    errors.push({ msg: `Empty WHEN body`, pc: t.pc });
                } else {
                    visitStmtSeq(t.body, ctx);
                }
                break;
            case OpcodeLabel[Opcode.IF]:
            case OpcodeLabel[Opcode.DAMAGE]:
            case OpcodeLabel[Opcode.HEAL]:
            case OpcodeLabel[Opcode.BUFF_STAT]:
            case OpcodeLabel[Opcode.DEBUFF_STAT]:
            case OpcodeLabel[Opcode.DRAW]:
            case OpcodeLabel[Opcode.DISCARD]:
            case OpcodeLabel[Opcode.CREATE_TOKEN]:
            case OpcodeLabel[Opcode.DESTROY]:
                visitStmt(t, ctx);
                break;
            default:
                const _exhaustive: never = t;
                void _exhaustive;
        }
    }

    return errors;
}