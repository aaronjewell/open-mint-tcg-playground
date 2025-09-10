; Complex VM program with conditional logic and triggers
; This program demonstrates WHEN blocks and IF/ELSE control flow

; Passive effect: Draw a card
DRAW 1

; When attacking, deal extra damage
WHEN ON_ATTACK
    IF GT IMM 5 IMM 3
        DAMAGE OPPONENT 2
    ELSE
        HEAL PLAYER 1
    ENDIF
ENDWHEN

; Buff self when entering play
WHEN ON_ENTER
    BUFF_STAT SELF ATTACK 1
ENDWHEN

END
