import { sfx } from "./audio.js?v=18";

const W = 1280, H = 720;
const GROUND = 600;

const KINDS = {
  fog:     { img: "assets/fx/fog.png",     r: 70, speed: 36, name: "緊張霧" },
  deflate: { img: "assets/fx/deflate.png", r: 64, speed: 42, name: "洩氣怪" },
  shadow:  { img: "assets/fx/shadow.png",  r: 58, speed: 50, name: "黑影嘀嘀" }
};

function loadImg(src) {
  const im = new Image();
  im.src = src;
  return im;
}

const IM = {
  jump: loadImg("assets/mascot/painted/jump.png"),
  run: loadImg("assets/mascot/painted/run.png"),
  front: loadImg("assets/mascot/painted/front.png"),
  side: loadImg("assets/mascot/painted/side.png"),
  wish: loadImg("assets/mascot/painted/wish.png"),
  seed: loadImg("assets/items/star-seed.png"),
  smile: loadImg("assets/fx/smile.png"),
  bag: loadImg("assets/fx/bag.png"),
  happy: loadImg("assets/fx/balloon-happy.png"),
  feifei: loadImg("assets/chars/feifei.png"),
  sika: loadImg("assets/chars/sika.png"),
  fog: loadImg("assets/fx/fog.png"),
  deflate: loadImg("assets/fx/deflate.png"),
  shadow: loadImg("assets/fx/shadow.png")
};

export function createBattle(canvas, hooks) {
  const ctx = canvas.getContext("2d");
  const input = { left: false, right: false, jump: false, fire: false, aimX: null, aimY: null };
  let running = false, raf, last = 0;
  let state;

  function reset(stage) {
    const b = stage.battle;
    state = {
      stage, t: 0, ended: false,
      hp: b.playerHp || 5, maxHp: b.playerHp || 5,
      player: { x: 220, y: GROUND, vx: 0, vy: 0, facing: 1, onGround: true, cooldown: 0, invul: 0 },
      enemies: [], stars: [], pickups: [], parts: [],
      spawned: new Set(),
      seedsGot: 0,
      protect: b.protect ? { ...b.protect, hp: b.protect.hp, max: b.protect.hp } : null
    };
    resize();
    running = true;
    last = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    hooks.onHp?.(state.hp, state.maxHp);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
  }

  function worldFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: ((src.clientX - r.left) / r.width) * W,
      y: ((src.clientY - r.top) / r.height) * H
    };
  }

  function spawn(spec) {
    const k = KINDS[spec.type];
    if (!k) return;
    const scale = spec.scale || 1;
    state.enemies.push({
      type: spec.type, name: spec.label || k.name,
      x: spec.x * W, y: spec.y * H,
      hp: spec.hp || 3, max: spec.hp || 3,
      r: k.r * scale, scale, t: Math.random() * 10,
      vx: (Math.random() < 0.5 ? -1 : 1) * k.speed * (0.7 + Math.random() * 0.5)
    });
  }

  function fireStar() {
    const p = state.player;
    if (p.cooldown > 0) return;
    p.cooldown = 0.28;
    let tx, ty;
    if (input.aimX != null) { tx = input.aimX; ty = input.aimY; }
    else {
      // aim nearest enemy, else forward-up
      let best = null, bd = 1e9;
      for (const e of state.enemies) {
        const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      if (best) { tx = best.x; ty = best.y; }
      else { tx = p.x + p.facing * 400; ty = p.y - 280; }
    }
    const ang = Math.atan2(ty - (p.y - 70), tx - p.x);
    const sp = 640;
    state.stars.push({ x: p.x, y: p.y - 70, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.4 });
    p.facing = Math.cos(ang) >= 0 ? 1 : -1;
    sfx.star();
  }

  function hurtPlayer(n) {
    const p = state.player;
    if (p.invul > 0 || state.ended) return;
    state.hp = Math.max(0, state.hp - n);
    p.invul = 1.1;
    sfx.hurt();
    hooks.onHp?.(state.hp, state.maxHp);
    if (state.hp <= 0) finish(false);
  }

  function killEnemy(e, i) {
    state.enemies.splice(i, 1);
    burst(e.x, e.y, 10);
    // chance to drop a seed mid-battle
    if (Math.random() < 0.45) {
      state.pickups.push({ x: e.x, y: e.y, vy: -180, kind: "seed" });
    }
    if (e.type === "deflate") {
      state.parts.push({ x: e.x, y: e.y, vy: -80, life: 1.4, kind: "happy" });
    }
    sfx.hit();
  }

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 180;
      state.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, kind: "smile" });
    }
  }

  function finish(win) {
    if (state.ended) return;
    state.ended = true;
    running = false;
    if (win) sfx.win();
    hooks.onEnd?.({
      win,
      seedsGot: state.seedsGot,
      hpLeft: state.hp
    });
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function step(dt) {
    state.t += dt;
    const p = state.player;
    const b = state.stage.battle;

    // waves
    (b.waves || []).forEach((w, i) => {
      if (!state.spawned.has(i) && state.t >= (w.at || 0)) {
        state.spawned.add(i);
        (w.spawns || []).forEach(spawn);
      }
    });

    // player
    const acc = 1400;
    if (input.left) { p.vx -= acc * dt; p.facing = -1; }
    if (input.right) { p.vx += acc * dt; p.facing = 1; }
    p.vx *= Math.pow(0.04, dt); // friction
    if (p.onGround && input.jump) { p.vy = -720; p.onGround = false; }
    p.vy += 1800 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
    p.x = Math.max(70, Math.min(W - 70, p.x));
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.invul = Math.max(0, p.invul - dt);
    if (input.fire) fireStar();

    // enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      e.t += dt;
      e.x += e.vx * dt;
      e.y += Math.sin(e.t * 2.2) * 18 * dt * 60 * 0.04;
      if (e.x < 80 || e.x > W - 80) e.vx *= -1;
      e.y = Math.max(90, Math.min(GROUND - 80, e.y));
      // hit player
      if (Math.hypot(e.x - p.x, e.y - (p.y - 60)) < e.r + 36) hurtPlayer(1);
      // hit protect target
      if (state.protect) {
        const bag = state.protect;
        const bx = bag.x * W, by = bag.y * H;
        if (Math.hypot(e.x - bx, e.y - by) < e.r + 50) {
          bag.hp = Math.max(0, bag.hp - dt * 0.7);
          if (bag.hp <= 0) finish(false);
        }
      }
    }

    // stars
    for (let i = state.stars.length - 1; i >= 0; i--) {
      const s = state.stars[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0 || s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40) {
        state.stars.splice(i, 1); continue;
      }
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (Math.hypot(s.x - e.x, s.y - e.y) < e.r + 18) {
          e.hp -= 1;
          state.stars.splice(i, 1);
          burst(s.x, s.y, 4);
          if (e.hp <= 0) killEnemy(e, j);
          else sfx.hit();
          break;
        }
      }
    }

    // pickups
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      const u = state.pickups[i];
      u.vy += 800 * dt;
      u.y += u.vy * dt;
      if (u.y > GROUND - 10) { u.y = GROUND - 10; u.vy *= -0.3; }
      if (Math.hypot(u.x - p.x, u.y - (p.y - 40)) < 70) {
        state.pickups.splice(i, 1);
        state.seedsGot += 1;
        sfx.pickup();
        hooks.onSeed?.(state.seedsGot);
      }
    }

    for (let i = state.parts.length - 1; i >= 0; i--) {
      const q = state.parts[i];
      q.life -= dt;
      q.x += (q.vx || 0) * dt;
      q.y += (q.vy || 0) * dt;
      if (q.kind === "happy") q.vy = (q.vy || 0) - 40 * dt;
      if (q.life <= 0) state.parts.splice(i, 1);
    }

    // win?
    const allSpawned = state.spawned.size >= (b.waves || []).length;
    if (allSpawned && state.enemies.length === 0 && state.t > 1 && !state.ended) {
      finish(true);
    }
  }

  function draw() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    const dpr = canvas.width / cw || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.scale(cw / W, ch / H);

    const b = state.stage.battle;
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, b.sky || "#dce8f8");
    g.addColorStop(1, "#fbfcf6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // decorative balloons
    drawBalloons(ctx, state.t, state.stage.theme);

    // ground
    ctx.fillStyle = b.ground || "#cad9a4";
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 40) {
      ctx.lineTo(x, GROUND + Math.sin(x / 70 + state.t) * 3);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(95,154,72,.25)";
    ctx.fillRect(0, GROUND, W, 14);

    // protect bag
    if (state.protect) {
      const bx = state.protect.x * W, by = state.protect.y * H;
      drawImg(ctx, IM.bag, bx, by, 160, 160);
      // hp bar
      bar(ctx, bx - 50, by - 95, 100, 8, state.protect.hp / state.protect.max, "#8dc073");
    }

    // companion cameo
    if (state.stage.id === "01-smile-contest") {
      drawImg(ctx, IM.feifei, 1100, GROUND - 20, 150, 150);
    }
    if (state.stage.id === "03-sika") {
      drawImg(ctx, IM.sika, 1100, GROUND - 20, 150, 150);
    }

    // enemies
    for (const e of state.enemies) {
      const img = IM[e.type] || IM.fog;
      const bob = Math.sin(e.t * 2.2) * 6;
      drawImg(ctx, img, e.x, e.y + bob, e.r * 2.2, e.r * 2.2, 0);
      bar(ctx, e.x - e.r, e.y + bob - e.r - 14, e.r * 2, 7, e.hp / e.max, "#f4a7bf");
    }

    // pickups / parts
    for (const u of state.pickups) drawImg(ctx, IM.seed, u.x, u.y, 48, 48);
    for (const q of state.parts) {
      ctx.globalAlpha = Math.max(0, q.life);
      if (q.kind === "happy") drawImg(ctx, IM.happy, q.x, q.y, 90, 90);
      else drawImg(ctx, IM.smile, q.x, q.y, 28, 28);
      ctx.globalAlpha = 1;
    }

    // stars
    for (const s of state.stars) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(state.t * 8);
      drawImg(ctx, IM.seed, 0, 0, 40, 40);
      ctx.restore();
    }

    // player
    const p = state.player;
    if (p.invul > 0 && Math.floor(p.invul * 12) % 2 === 0) ctx.globalAlpha = 0.4;
    const moving = Math.abs(p.vx) > 40;
    const spr = !p.onGround ? IM.jump : moving ? IM.run : IM.front;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.facing < 0) ctx.scale(-1, 1);
    drawImg(ctx, spr, 0, -10, 170, 170);
    ctx.restore();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawImg(ctx, img, x, y, w, h) {
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    }
  }
  function bar(ctx, x, y, w, h, f, color) {
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, f)), h);
    ctx.strokeStyle = "#3b4468";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }
  function drawBalloons(ctx, t, theme) {
    const cols = theme === "candy"
      ? ["#f4a7bf", "#ffed00", "#8dc073"]
      : ["#f4a7bf", "#8dc073", "#fff", "#ffed00"];
    for (let i = 0; i < 8; i++) {
      const x = 80 + i * 155;
      const y = 70 + Math.sin(t * 0.7 + i) * 16;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.ellipse(x, y, 16, 22, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#3b4468"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 22); ctx.lineTo(x, y + 44); ctx.stroke();
    }
  }

  // pointer
  canvas.addEventListener("pointerdown", (e) => {
    const w = worldFromEvent(e);
    input.aimX = w.x; input.aimY = w.y;
    input.fire = true;
    // walk toward if click is low
    if (w.y > GROUND - 40) {
      if (w.x < state.player.x - 20) input.left = true;
      if (w.x > state.player.x + 20) input.right = true;
    }
  });
  canvas.addEventListener("pointerup", () => {
    input.fire = false; input.aimX = input.aimY = null;
    input.left = input.right = false;
  });
  canvas.addEventListener("pointerleave", () => { input.fire = false; input.aimX = input.aimY = null; });

  window.addEventListener("resize", resize);

  return {
    input, start: reset, resize,
    stop() { running = false; if (raf) cancelAnimationFrame(raf); },
    getState: () => state,
    winNow() { finish(true); }
  };
}
