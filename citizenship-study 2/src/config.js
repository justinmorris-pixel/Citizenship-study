// ---- Settings you may want to change ----

// Score (percent) a student needs on the Full Practice Test to count as "passing".
// Set this to match your real graduation requirement.
export const PASSING_PERCENT = 70

// A question counts as "mastered" after this many correct answers in a row.
// (The teacher dashboard in supabase/schema.sql uses the same number: 2.
//  If you change it here, also change "correct_streak >= 2" in schema.sql.)
export const MASTER_STREAK = 2

export const QUICK_ROUND_SIZE = 10
export const TOPIC_ROUND_SIZE = 10
export const MISSED_ROUND_SIZE = 15

// XP needed for each level
export const XP_PER_LEVEL = 150

// Graduating classes shown when a student creates an account
export const GRAD_CLASSES = [2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034]

// Founders' Run (the runner game)
// A question gate appears after this many obstacles (the very first gate comes sooner).
export const RUN_GATE_EVERY = 4
export const RUN_FIRST_GATE_AFTER = 3
