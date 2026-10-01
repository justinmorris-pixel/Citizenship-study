// Founders' Run: game engine (no drawing here, so it can be tested on its own).
// Coordinates: x grows to the right, "y" is the player's height above the ground.

export const W = 800
export const H = 320
export const GROUND = 262
export const PX = 110          // player's fixed x on screen
export const PW = 30
export const PH = 54
export const GATE_W = 70
export const STEP = 1 / 60     // fixed time step

const GRAVITY = 1900
const JUMP_V = 720
export const START_SPEED = 300
export const SPEED_PER_CORRECT = 16
export const MAX_SPEED = 540
export const CORRECT_BONUS = 100

export const OBSTACLE_TYPES = [
  { kind: 'crate', w: 40, h: 40 },   // crate of tea
  { kind: 'tall', w: 40, h: 72 },    // stacked crates
  { kind: 'cannon', w: 72, h: 44 },
  { kind: 'chests', w: 84, h: 40 },  // row of tea chests
]

export function createState({ gateEvery = 4, firstGateAfter = 3, rng = Math.random } = {}) {
  return {
    t: 0, distance: 0, speed: START_SPEED,
    y: 0, vy: 0, buffer: 0, frame: 0,
    obstacles: [], gate: null,
    toNext: START_SPEED * 1.6,
    sinceGate: 0, gatesPassed: 0, gateEvery, firstGateAfter,
    correct: 0, bonus: 0,
    status: 'running',        // running | question | over
    over: null,               // 'crash' | 'wrong'
    crashKind: null,
    rng,
  }
}

export function jump(s) {
  if (s.status === 'running') s.buffer = 0.12   // remembers a slightly-early tap
}

export function score(s) {
  return Math.floor(s.distance / 20) + s.bonus
}

function spawn(s) {
  const needGate = !s.gate && s.sinceGate >= (s.gatesPassed === 0 ? s.firstGateAfter : s.gateEvery)
  if (needGate) {
    s.gate = { x: W + 60, hit: false }
    s.sinceGate = 0
    s.toNext = s.speed * 1.5 + 200
    return
  }
  const type = OBSTACLE_TYPES[Math.floor(s.rng() * OBSTACLE_TYPES.length)]
  s.obstacles.push({ x: W + 30, w: type.w, h: type.h, kind: type.kind })
  s.sinceGate++
  s.toNext = type.w + s.speed * 0.75 + s.rng() * s.speed * 0.7
}

// Advances the game one time step. Returns null, 'gate' (a question is due) or 'crash'.
export function step(s, dt) {
  if (s.status !== 'running') return null
  s.t += dt
  const dx = s.speed * dt
  s.distance += dx

  // jumping
  s.buffer -= dt
  if (s.buffer > 0 && s.y === 0) {
    s.vy = JUMP_V
    s.buffer = 0
  }
  if (s.y > 0 || s.vy > 0) {
    s.vy -= GRAVITY * dt
    s.y += s.vy * dt
    if (s.y <= 0) { s.y = 0; s.vy = 0 }
  }
  s.frame += s.y > 0 ? 0 : dt * (s.speed / 38)

  // world scrolls left
  for (const o of s.obstacles) o.x -= dx
  s.obstacles = s.obstacles.filter(o => o.x + o.w > -20)
  if (s.gate) s.gate.x -= dx

  s.toNext -= dx
  if (s.toNext <= 0) spawn(s)

  // collisions
  const pl = PX + 6, pr = PX + PW - 6
  const pb = GROUND - s.y, pt = pb - PH + 6
  for (const o of s.obstacles) {
    const ol = o.x + 4, or = o.x + o.w - 4, ot = GROUND - o.h + 4
    if (pr > ol && pl < or && pb > ot && pt < GROUND) {
      s.status = 'over'
      s.over = 'crash'
      s.crashKind = o.kind
      return 'crash'
    }
  }

  // reached the question gate?
  if (s.gate && !s.gate.hit && s.gate.x + GATE_W / 2 <= PX + PW / 2) {
    s.gate.hit = true
    s.status = 'question'
    return 'gate'
  }
  return null
}

export function answerGate(s, correct) {
  if (s.status !== 'question') return
  if (correct) {
    s.correct++
    s.bonus += CORRECT_BONUS
    s.speed = Math.min(MAX_SPEED, s.speed + SPEED_PER_CORRECT)
    s.gate = null
    s.gatesPassed++
    s.status = 'running'
  } else {
    s.status = 'over'
    s.over = 'wrong'
  }
}
