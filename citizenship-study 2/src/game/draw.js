import { W, H, GROUND, PX, PW, GATE_W, score } from './runner'

export const HEROES = [
  { id: 'washington', name: 'George Washington', unlock: 1, coat: '#1e3a8a', hair: '#f3f4f6', hat: 'tricorn', skin: '#f2c9a0' },
  { id: 'franklin', name: 'Benjamin Franklin', unlock: 2, coat: '#7c4a21', hair: '#d1d5db', hat: 'none', glasses: true, bald: true, skin: '#f2c9a0' },
  { id: 'lincoln', name: 'Abraham Lincoln', unlock: 3, coat: '#111827', hair: '#1f2937', hat: 'stovepipe', beard: true, skin: '#e8b88a' },
  { id: 'jefferson', name: 'Thomas Jefferson', unlock: 4, coat: '#92400e', hair: '#b45309', hat: 'none', vest: '#b91c1c', skin: '#f2c9a0' },
  { id: 'anthony', name: 'Susan B. Anthony', unlock: 5, coat: '#6b21a8', hair: '#6b7280', hat: 'none', dress: true, glasses: true, skin: '#f2c9a0' },
]

// ---------- Runner ----------
export function drawHero(ctx, cx, feetY, frame, h, airborne = false) {
  const swing = Math.sin(frame * 2.2)
  ctx.save()
  // legs / dress
  if (h.dress) {
    ctx.fillStyle = h.coat
    ctx.beginPath()
    ctx.moveTo(cx - 10, feetY - 34)
    ctx.lineTo(cx + 10, feetY - 34)
    ctx.lineTo(cx + 17, feetY)
    ctx.lineTo(cx - 17, feetY)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.fillStyle = '#1f2937'
    const spread = airborne ? 8 : swing * 7
    ctx.fillRect(cx - 8 + spread, feetY - 17, 7, 17)
    ctx.fillRect(cx + 1 - spread, feetY - 17, 7, 17)
    ctx.fillStyle = h.coat
    ctx.fillRect(cx - 11, feetY - 42, 22, 26)
    if (h.vest) {
      ctx.fillStyle = h.vest
      ctx.fillRect(cx - 5, feetY - 42, 10, 22)
    }
  }
  if (h.dress) ctx.fillRect(cx - 11, feetY - 42, 22, 10)
  // arms
  ctx.fillStyle = h.coat
  const armSwing = airborne ? -6 : swing * 6
  ctx.fillRect(cx - 14, feetY - 40 + armSwing * 0.3, 5, 16)
  ctx.fillRect(cx + 9, feetY - 40 - armSwing * 0.3, 5, 16)
  // hair behind head
  ctx.fillStyle = h.hair
  if (!h.bald) {
    ctx.beginPath(); ctx.arc(cx, feetY - 50, 11, 0, Math.PI * 2); ctx.fill()
  } else {
    ctx.fillRect(cx - 11, feetY - 50, 5, 12)
    ctx.fillRect(cx + 6, feetY - 50, 5, 12)
  }
  if (h.dress) { ctx.beginPath(); ctx.arc(cx, feetY - 62, 5, 0, Math.PI * 2); ctx.fill() }
  // head
  ctx.fillStyle = h.skin
  ctx.beginPath(); ctx.arc(cx, feetY - 48, 9, 0, Math.PI * 2); ctx.fill()
  if (h.beard) { ctx.fillStyle = h.hair; ctx.fillRect(cx - 7, feetY - 44, 14, 8) }
  // eyes
  ctx.fillStyle = '#111827'
  ctx.fillRect(cx + 1, feetY - 50, 2, 2)
  ctx.fillRect(cx + 5, feetY - 50, 2, 2)
  if (h.glasses) {
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(cx + 2, feetY - 49, 3.2, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx + 7, feetY - 49, 3.2, 0, Math.PI * 2); ctx.stroke()
  }
  // hats
  ctx.fillStyle = '#111827'
  if (h.hat === 'tricorn') {
    ctx.beginPath()
    ctx.moveTo(cx - 17, feetY - 54); ctx.lineTo(cx, feetY - 66); ctx.lineTo(cx + 17, feetY - 54)
    ctx.lineTo(cx, feetY - 57)
    ctx.closePath(); ctx.fill()
  } else if (h.hat === 'stovepipe') {
    ctx.fillRect(cx - 8, feetY - 74, 16, 20)
    ctx.fillRect(cx - 14, feetY - 56, 28, 3)
  }
  ctx.restore()
}

// ---------- Background monuments (simple silhouettes) ----------
const MONUMENTS = [
  { name: 'Washington Monument', draw(c, x, y) {
    c.beginPath(); c.moveTo(x - 14, y); c.lineTo(x - 9, y - 150); c.lineTo(x, y - 178); c.lineTo(x + 9, y - 150); c.lineTo(x + 14, y); c.closePath(); c.fill()
  } },
  { name: 'U.S. Capitol', draw(c, x, y) {
    c.fillRect(x - 95, y - 34, 190, 34)
    c.fillRect(x - 36, y - 62, 72, 28)
    c.beginPath(); c.arc(x, y - 62, 34, Math.PI, 0); c.fill()
    c.fillRect(x - 4, y - 112, 8, 16)
    c.fillRect(x - 70, y - 48, 20, 14); c.fillRect(x + 50, y - 48, 20, 14)
  } },
  { name: 'Lincoln Memorial', draw(c, x, y) {
    c.fillRect(x - 90, y - 8, 180, 8)
    c.fillRect(x - 84, y - 16, 168, 8)
    for (let i = 0; i < 8; i++) c.fillRect(x - 76 + i * 21.5, y - 66, 8, 50)
    c.fillRect(x - 86, y - 78, 172, 12)
    c.beginPath(); c.moveTo(x - 90, y - 78); c.lineTo(x, y - 100); c.lineTo(x + 90, y - 78); c.closePath(); c.fill()
  } },
  { name: 'Statue of Liberty', draw(c, x, y) {
    c.fillRect(x - 24, y - 40, 48, 40)
    c.fillRect(x - 16, y - 60, 32, 20)
    c.beginPath(); c.moveTo(x - 14, y - 60); c.lineTo(x + 14, y - 60); c.lineTo(x + 9, y - 118); c.lineTo(x - 9, y - 118); c.closePath(); c.fill()
    c.beginPath(); c.arc(x, y - 126, 9, 0, Math.PI * 2); c.fill()
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 5 - 2, y - 133); c.lineTo(x + i * 6, y - 146); c.lineTo(x + i * 5 + 2, y - 133); c.fill() }
    c.fillRect(x + 8, y - 160, 5, 50)
    c.beginPath(); c.arc(x + 10.5, y - 166, 6, 0, Math.PI * 2); c.fill()
  } },
  { name: 'Mount Rushmore', draw(c, x, y) {
    c.beginPath(); c.moveTo(x - 110, y); c.lineTo(x - 80, y - 70); c.lineTo(x - 40, y - 110); c.lineTo(x + 40, y - 110); c.lineTo(x + 85, y - 75); c.lineTo(x + 115, y); c.closePath(); c.fill()
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x - 50 + i * 33, y - 82, 13, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill(); c.fillStyle = 'rgba(176,196,226,0.55)' }
  } },
]

function drawBackground(ctx, s) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND)
  sky.addColorStop(0, '#9ec5f8')
  sky.addColorStop(1, '#eaf3ff')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  const cOff = (s.distance * 0.08) % 520
  for (let i = -1; i < 3; i++) {
    const x = i * 520 - cOff + 120
    ctx.beginPath(); ctx.ellipse(x, 60 + (i % 2) * 20, 46, 14, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(x + 26, 52 + (i % 2) * 20, 28, 12, 0, 0, Math.PI * 2); ctx.fill()
  }

  // monuments (slow parallax)
  const spacing = 760
  const par = s.distance * 0.22
  const first = Math.floor(par / spacing)
  ctx.fillStyle = 'rgba(176,196,226,0.55)'
  for (let k = first - 1; k <= first + 2; k++) {
    const idx = ((k % MONUMENTS.length) + MONUMENTS.length) % MONUMENTS.length
    const x = k * spacing + 420 - par
    if (x < -200 || x > W + 200) continue
    MONUMENTS[idx].draw(ctx, x, GROUND)
    ctx.fillStyle = 'rgba(110,132,170,0.8)'
    ctx.font = '600 12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(MONUMENTS[idx].name, x, GROUND - 190 > 28 ? GROUND - 188 : 28)
    ctx.fillStyle = 'rgba(176,196,226,0.55)'
  }
}

function drawGround(ctx, s) {
  ctx.fillStyle = '#7c8b5a'
  ctx.fillRect(0, GROUND, W, H - GROUND)
  ctx.fillStyle = '#5f6e42'
  ctx.fillRect(0, GROUND, W, 3)
  ctx.fillStyle = '#6b7a4c'
  const off = s.distance % 60
  for (let x = -off; x < W; x += 60) ctx.fillRect(x, GROUND + 18, 24, 3)
  for (let x = -off + 30; x < W; x += 60) ctx.fillRect(x, GROUND + 34, 14, 3)
}

function drawObstacle(ctx, o) {
  const top = GROUND - o.h
  if (o.kind === 'cannon') {
    ctx.fillStyle = '#374151'
    ctx.save(); ctx.translate(o.x + 36, top + 12); ctx.rotate(-0.15)
    ctx.fillRect(-34, -9, 62, 18); ctx.restore()
    ctx.fillStyle = '#92400e'
    ctx.beginPath(); ctx.arc(o.x + 26, GROUND - 14, 14, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#451a03'
    ctx.beginPath(); ctx.arc(o.x + 26, GROUND - 14, 5, 0, Math.PI * 2); ctx.fill()
    return
  }
  const crates = o.kind === 'tall' ? [[0, 0], [0, 1]] : o.kind === 'chests' ? [[0, 0], [1, 0]] : [[0, 0]]
  const size = o.kind === 'tall' ? o.h / 2 : o.kind === 'chests' ? o.w / 2 : o.w
  for (const [cx, cy] of crates) {
    const x = o.x + cx * size, y = GROUND - size * (cy + 1)
    ctx.fillStyle = '#a16207'; ctx.fillRect(x, y, size, size)
    ctx.strokeStyle = '#713f12'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3)
    ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + size - 3, y + size - 3); ctx.stroke()
    ctx.fillStyle = '#fef3c7'; ctx.font = `800 ${Math.max(9, size * 0.28)}px system-ui, sans-serif`; ctx.textAlign = 'center'
    ctx.fillText('TEA', x + size / 2, y + size * 0.58)
  }
}

function drawGate(ctx, g) {
  const x = g.x, top = GROUND - 150
  ctx.fillStyle = '#1e3a8a'
  ctx.fillRect(x, top, 8, 150)
  ctx.fillRect(x + GATE_W - 8, top, 8, 150)
  ctx.fillStyle = '#b91c1c'
  ctx.fillRect(x - 4, top - 6, GATE_W + 8, 36)
  ctx.fillStyle = '#fff'
  ctx.font = '800 26px system-ui, sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('?', x + GATE_W / 2, top + 22)
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#fbbf24'; ctx.fillRect(x + 8 + i * 13.5, top + 30, 13.5, 6) }
}

export function draw(ctx, s, { hero, best = 0, answered = 0 } = {}) {
  ctx.clearRect(0, 0, W, H)
  drawBackground(ctx, s)
  drawGround(ctx, s)
  if (s.gate) drawGate(ctx, s.gate)
  for (const o of s.obstacles) drawObstacle(ctx, o)
  drawHero(ctx, PX + PW / 2, GROUND - s.y, s.frame, hero || HEROES[0], s.y > 0)

  // HUD
  ctx.textAlign = 'left'
  ctx.fillStyle = '#1e293b'
  ctx.font = '800 20px system-ui, sans-serif'
  ctx.fillText(String(score(s)).padStart(5, '0'), 14, 28)
  ctx.font = '600 13px system-ui, sans-serif'
  ctx.fillStyle = '#475569'
  ctx.fillText(`✔ ${answered}`, 14, 48)
  ctx.textAlign = 'right'
  ctx.fillText(`BEST ${String(best).padStart(5, '0')}`, W - 14, 28)
}
