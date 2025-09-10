/**
 * Core VM types, opcodes, enums, and configuration.
 * 
 * This module contains the fundamental types and constants for the VM,
 * including opcode definitions, target types, and configuration structures.
 */

/**
 * VM opcodes.
 * Maps opcode names to their numeric values.
 */

export const Opcode = {
	DAMAGE: 0x00,      // deal damage
	HEAL: 0x01,        // heal
	BUFF_STAT: 0x02,   // buff stat
	DEBUFF_STAT: 0x03, // debuff stat
	DRAW: 0x04,        // draw cards
	DISCARD: 0x05,     // discard cards
	CREATE_TOKEN: 0x06,// create token
	DESTROY: 0x07,     // destroy target
	IF: 0x08,          // conditional start
	ELSE: 0x09,        // conditional else
	ENDIF: 0x0A,       // conditional end
	WHEN: 0x0B,        // event trigger start
	ENDWHEN: 0x0C,     // event trigger end
	END: 0x0D,         // program terminator
} as const;

type ReverseMap<T extends Record<keyof T, keyof any>> = {
    [K in keyof T as T[K]]: K
}

export const OpcodeLabel: ReverseMap<typeof Opcode> = {
    [Opcode.DAMAGE]: 'DAMAGE',
    [Opcode.HEAL]: 'HEAL',
    [Opcode.BUFF_STAT]: 'BUFF_STAT',
    [Opcode.DEBUFF_STAT]: 'DEBUFF_STAT',
    [Opcode.DRAW]: 'DRAW',
    [Opcode.DISCARD]: 'DISCARD',
    [Opcode.CREATE_TOKEN]: 'CREATE_TOKEN',
    [Opcode.DESTROY]: 'DESTROY',
    [Opcode.IF]: 'IF',
    [Opcode.ELSE]: 'ELSE',
    [Opcode.ENDIF]: 'ENDIF',
    [Opcode.WHEN]: 'WHEN',
    [Opcode.ENDWHEN]: 'ENDWHEN',
    [Opcode.END]: 'END',
};

export const OPCODES = new Set(Object.values(Opcode));

export function isOpcode(op: string): op is typeof OpcodeLabel[keyof typeof OpcodeLabel];
export function isOpcode(op: number): op is typeof Opcode[keyof typeof Opcode];
export function isOpcode(op: number | string) {
    if (typeof op === 'number') {
        return OPCODES.has(op as typeof Opcode[keyof typeof Opcode]);
    }
    return op in Opcode;
}

/**
 * Target for effects and abilities.
 */
export const Target = {
    SELF: 0x00,
    OPPONENT: 0x01,
    ALLY: 0x02,
    ANY: 0x03,
    RANDOM: 0x04,
    ALL_ENEMIES: 0x05,
    ALL_ALLIES: 0x06,
    ENEMY: 0x07,
} as const;

export const TargetLabel: ReverseMap<typeof Target> = {
    [Target.SELF]: 'SELF',
    [Target.OPPONENT]: 'OPPONENT',
    [Target.ALLY]: 'ALLY',
    [Target.ANY]: 'ANY',
    [Target.RANDOM]: 'RANDOM',
    [Target.ALL_ENEMIES]: 'ALL_ENEMIES',
    [Target.ALL_ALLIES]: 'ALL_ALLIES',
    [Target.ENEMY]: 'ENEMY'
} as const;

export const TARGETS = new Set(Object.values(Target));

export function isTarget(t: number): t is typeof Target[keyof typeof Target] {
    return TARGETS.has(t as any);
}

export function isTargetLabel(t: string): t is typeof TargetLabel[keyof typeof TargetLabel] {
    return t in Target;
}

/**
 * Stat for buff/debuff effects.
 */
export const Stat = {
    ATTACK: 0x00,
    HEALTH: 0x01,
} as const;

export const StatLabel: ReverseMap<typeof Stat> = {
    [Stat.ATTACK]: 'ATTACK',
    [Stat.HEALTH]: 'HEALTH',
} as const;

export const STATS = new Set(Object.values(Stat));

export function isStat(s: number): s is typeof Stat[keyof typeof Stat] {
    return STATS.has(s as any);
}

export function isStatLabel(s: string): s is typeof StatLabel[keyof typeof StatLabel] {
    return s in Stat;
}

export const Comparator = {
    EQ: 0x00,
    GT: 0x01,
    LT: 0x02,
} as const;

export const ComparatorLabel: ReverseMap<typeof Comparator> = {
    [Comparator.EQ]: 'EQ',
    [Comparator.GT]: 'GT',
    [Comparator.LT]: 'LT',
} as const;

export const CmpOperandKind = {
	IMM: 0x00,
	STAT_OF: 0x01,
} as const;

export const CMP_OPERAND_KINDS = new Set(Object.values(CmpOperandKind));

export function isCmpOperandKind(k: number): k is typeof CmpOperandKind[keyof typeof CmpOperandKind] {
    return CMP_OPERAND_KINDS.has(k as any);
}

export type CmpOperand =
	| { kind: typeof CmpOperandKind.IMM; k: number }
	| { kind: typeof CmpOperandKind.STAT_OF, s: typeof Stat[keyof typeof Stat]; t: typeof Target[keyof typeof Target] };

/**
 * Event for trigger conditions.
 */
export const EventKind = {
    ON_CAST: 0x00,
    ON_ATTACK: 0x01,
    ON_DEATH: 0x02,
    ON_ENTER: 0x03,
    ON_LEAVE: 0x04,
} as const;

export const EventKindLabel: ReverseMap<typeof EventKind> = {
    [EventKind.ON_CAST]: 'ON_CAST',
    [EventKind.ON_ATTACK]: 'ON_ATTACK',
    [EventKind.ON_DEATH]: 'ON_DEATH',
    [EventKind.ON_ENTER]: 'ON_ENTER',
    [EventKind.ON_LEAVE]: 'ON_LEAVE',
} as const;

export const EVENTS = new Set(Object.values(EventKind));

export function isEventKind(e: number): e is typeof EventKind[keyof typeof EventKind] {
    return EVENTS.has(e as any);
}

export function isEventKindLabel(e: string): e is typeof EventKindLabel[keyof typeof EventKindLabel] {
    return e in EventKind;
}

/**
 * Configuration for decoder process.
 */
export interface DecoderConfig {
    /** Version byte to expect in program header */
    versionByte: number;
}

export type K = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 16;
export type K4 = 1 | 2 | 3 | 4;

/**
 * Token types for parsed bytecode.
 * Represents individual instructions with their arguments.
 */
export type Token =
	// Immediate-argument action tokens
	| { op: typeof Opcode.CREATE_TOKEN; k: K4; pc: number }
	| { op: typeof Opcode.HEAL; t: typeof Target[keyof typeof Target]; k: K; pc: number }
	| { op: typeof Opcode.DAMAGE; t: typeof Target[keyof typeof Target]; k: K; pc: number }
	| { op: typeof Opcode.DESTROY; t: typeof Target[keyof typeof Target]; pc: number }
	| { op: typeof Opcode.DRAW; k: K4; pc: number }
	| { op: typeof Opcode.DISCARD; k: K4; pc: number }
	| { op: typeof Opcode.BUFF_STAT; t: typeof Target[keyof typeof Target]; s: typeof Stat[keyof typeof Stat]; k: K4; pc: number }
	| { op: typeof Opcode.DEBUFF_STAT; t: typeof Target[keyof typeof Target]; s: typeof Stat[keyof typeof Stat]; k: K4; pc: number }
	// Control and structural tokens
	| { op: typeof Opcode.WHEN; e: typeof EventKind[keyof typeof EventKind]; pc: number }
	| { op: typeof Opcode.IF; cmp: typeof Comparator[keyof typeof Comparator]; lhs: CmpOperand; rhs: CmpOperand; pc: number }
	| { op: typeof Opcode.ELSE | typeof Opcode.ENDIF | typeof Opcode.ENDWHEN | typeof Opcode.END; pc: number }