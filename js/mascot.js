/**
 * 眠花糖 on the play screen — official 2D art is primary.
 * Idle bounce, squash-and-stretch, ear wiggle, periodic side pose
 * so the yellow star-tail shows, jump pose + sparkles on merge.
 * Official 3D remains an optional fallback (window.__MASCOT_3D = true).
 */
const POSES = {
  idle: "assets/mascot/sticker/front.png",
  idle2: "assets/mascot/sticker/front.png",
  cheer: "assets/mascot/sticker/jump.png",
  jump: "assets/mascot/sticker/jump.png",
  happy: "assets/mascot/sticker/front.png",
  wish: "assets/mascot/sticker/hold-star.png",
  hero: "assets/mascot/sticker/hold-star.png",
  think: "assets/mascot/sticker/sit-closed.png",
  sit: "assets/mascot/sticker/sit-closed.png",
  sleep: "assets/mascot/sticker/sleep.png",
  sad: "assets/mascot/sticker/sleep.png",
  side: "assets/mascot/sticker/side.png",
  run: "assets/mascot/sticker/side.png",
  back: "assets/mascot/sticker/back.png",
  face: "assets/mascot/sticker/face.png",
  front: "assets/mascot/sticker/front.png"
};

/** Load data/mascot-poses.json so later official sticker frames can drop in without a code change. */
fetch("data/mascot-poses.json?v=25").then((r) => r.json()).then((man) => {
  const setName = man.defaultSet || "sticker";
  const set = (man.sets && man.sets[setName]) || {};
  for (const [k, v] of Object.entries(set)) {
    if (typeof v === "string" && v && !v.startsWith("_")) POSES[k] = v;
  }
}).catch(() => {});

function want3d() {
  try {
    const q = new URLSearchParams(location.search).get("mascot");
    if (q === "3d") return true;
    if (q === "2d") return false;
    return localStorage.getItem("fantaco.mascot.3d") === "1" || window.__MASCOT_3D === true;
  } catch {
    return false;
  }
}

export function mountMascot(root) {
  root.innerHTML = `
    <div class="mascot-stage">
      <canvas class="mascot-3d" width="512" height="512" aria-hidden="true" hidden></canvas>
      <img class="mascot-2d" alt="眠花糖" src="${POSES.idle}">
      <div class="mascot-sparkles" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="mascot-bubble" hidden></div>
    </div>`;
  const img = root.querySelector(".mascot-2d");
  const bubble = root.querySelector(".mascot-bubble");
  const canvas = root.querySelector(".mascot-3d");
  const stage = root.querySelector(".mascot-stage");
  let pose = "idle";
  let timer = 0;
  let moodUntil = 0;
  let jump = 0;
  let jumpVel = 0;
  let targetBounce = 0;
  let mode3d = false;
  let lastIdlePose = "idle";
  const anim = { bounce: 0, squish: 1, tilt: 0, spin: 0, jump: 0 };

  function setPose(name, ms = 900) {
    pose = name;
    if (!mode3d) img.src = POSES[name] || POSES.idle;
    moodUntil = performance.now() + ms;
  }

  function startJump(power = 1) {
    jump = Math.max(jump, 0.05);
    jumpVel = 0.062 * power;
    targetBounce = 18 * power;
  }

  function say(text, ms = 1600) {
    bubble.hidden = false;
    bubble.textContent = text;
    clearTimeout(bubble._t);
    bubble._t = setTimeout(() => { bubble.hidden = true; }, ms);
  }

  const api = {
    cheer() { setPose("cheer", 1200); startJump(1.15); say("好好喔！"); },
    wish() { setPose("wish", 1400); startJump(0.7); say("許個願吧！"); },
    think() { setPose("think", 1600); },
    sad() { setPose("sleep", 1400); say("能量還在路上…"); },
    hero() { setPose("hero", 1400); startJump(1.3); },
    merge(tier) {
      if (tier >= 5) { setPose("hero", 1400); startJump(1.35); say("太厲害了！"); }
      else if (tier >= 3) { setPose("cheer", 1100); startJump(1.1); }
      else { setPose("wish", 800); startJump(0.85); }
    },
    order() { setPose("cheer", 1400); startJump(1.25); say("訂單完成！"); },
    wave() { setPose(POSES.wave ? "wave" : "cheer", 1400); },
    surprise() { setPose(POSES.surprised ? "surprised" : "jump", 1200); startJump(0.9); },
    hold() { setPose(POSES.hold ? "hold" : "wish", 1400); },
    blink() {
      if (!POSES.blink || mode3d) return;
      const prev = img.src;
      img.src = POSES.blink;
      setTimeout(() => { if (img.src.includes("blink")) img.src = prev; }, 160);
    },
    idle() { if (performance.now() > moodUntil) setPose("idle", 0); }
  };

  function tick(t) {
    timer = t / 1000;
    if (jumpVel !== 0 || jump > 0) {
      jump += jumpVel;
      jumpVel -= 0.0034;
      if (jump < 0) { jump = 0; jumpVel = jumpVel * -0.38; if (Math.abs(jumpVel) < 0.01) jumpVel = 0; }
    }
    if (performance.now() > moodUntil && !mode3d) {
      // Cycle front → idle smile → side (yellow star-tail wag) → back (star on the back).
      const cycle = Math.floor(timer / 2.8) % 5;
      const idlePose = ["idle", "idle2", "side", "back", "idle"][cycle];
      const blinkOn = POSES.blink && (timer % 4.6) < 0.14;
      if (blinkOn) {
        img.src = POSES.blink;
      } else if (pose !== idlePose && !["cheer", "hero", "wish", "wave"].includes(pose)) {
        pose = idlePose;
        lastIdlePose = idlePose;
        img.src = POSES[idlePose] || POSES.idle;
      }
    }
    targetBounce += (0 - targetBounce) * 0.07;
    const stageH = stage.clientHeight || 160;
    const amp = Math.min(12, stageH * 0.07);
    const idleBob = Math.sin(timer * 3.4) * amp;
    anim.bounce = idleBob + jump * Math.min(72, stageH * 0.42) + targetBounce;
    const jumpStretch = jump > 0.2 ? -0.16 : (jumpVel < -0.02 ? 0.14 : 0);
    anim.squish = 1 + Math.sin(timer * 3.4) * 0.06 + jumpStretch;
    // Gentle sway + a short ear-wiggle pulse every few seconds.
    const earPulse = (timer % 5.4) < 0.55 ? Math.sin(timer * 38) * 5.5 : 0;
    anim.tilt = Math.sin(timer * 1.35) * 4 + earPulse;
    anim.spin = Math.sin(timer * 0.85) * 0.22;
    anim.jump = jump;
    const sy = anim.squish, sx = 2 - sy;
    if (!mode3d) {
      img.style.transform = `translateY(${-anim.bounce}px) rotate(${anim.tilt}deg) scale(${sx}, ${sy})`;
    }
    stage.dataset.jumping = jump > 0.15 ? "1" : "0";
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const use2d = (err) => {
    if (err) console.warn("眠花糖 3D 載入失敗，改用官方平面圖", err);
    mode3d = false;
    canvas.hidden = true;
    canvas.style.display = "none";
    img.style.display = "";
    img.style.opacity = "1";
  };

  api.wake = () => {
    // 2D is primary. 3D only boots when explicitly requested.
    if (!want3d() || mode3d) return;
    canvas.hidden = false;
    canvas.style.display = "block";
    boot3d(canvas, img, () => anim, () => { mode3d = true; }, use2d).catch(use2d);
  };
  return api;
}

async function boot3d(canvas, img, getAnim, onReady, onFail) {
  const ok = !!window.WebGLRenderingContext;
  if (!ok) throw new Error("no webgl");
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  camera.position.set(2.45, 1.28, 3.85);
  camera.lookAt(0.0, 0.96, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

  let lastW = 0, lastH = 0;
  const ensureSize = () => {
    const w = canvas.clientWidth || 0, h = canvas.clientHeight || 0;
    if (w < 8 || h < 8) return false;
    if (w === lastW && h === lastH) return true;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    return true;
  };
  ensureSize();
  new ResizeObserver(ensureSize).observe(canvas.parentElement || canvas);

  scene.add(new THREE.AmbientLight(0xfff6e8, 1.55));
  const sun = new THREE.DirectionalLight(0xfff4d6, 1.05);
  sun.position.set(2.4, 4.6, 3.4);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffe8f0, 0.45);
  fill.position.set(-3.2, 1.6, 1.2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffed00, 0.35);
  rim.position.set(-1.2, 1.0, -3.2);
  scene.add(rim);

  const bodyRamp = makeToonRamp(THREE, [[255, 228, 210], [255, 244, 232], [255, 251, 244], [255, 255, 252]]);
  const inkRamp = makeToonRamp(THREE, [[36, 42, 72], [50, 58, 92], [70, 80, 120], [90, 100, 140]]);
  const starRamp = makeToonRamp(THREE, [[230, 180, 0], [255, 220, 40], [255, 237, 0], [255, 252, 160]]);

  const gltf = await new Promise((resolve, reject) => {
    new GLTFLoader().load("assets/models/mianhuatang.glb", resolve, undefined, reject);
  });
  const bunny = gltf.scene;
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x3b4468, side: THREE.BackSide, depthWrite: true
  });
  const meshes = [];
  bunny.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const c = o.material && o.material.color;
    let kind = "body";
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    if (bb && bb.min.z < -0.74 && bb.max.y < 0.9) kind = "star";
    else if (c) {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      if (hsl.s > 0.35 && c.r > 0.7 && c.g > 0.55 && c.b < 0.45) kind = "star";
      else if (hsl.l < 0.45) kind = "ink";
    }
    let mat;
    if (kind === "star") {
      mat = new THREE.MeshToonMaterial({ color: 0xffed00, gradientMap: starRamp, emissive: 0xffc400, emissiveIntensity: 0.35 });
    } else if (kind === "ink") {
      mat = new THREE.MeshToonMaterial({ color: 0x3b4468, gradientMap: inkRamp });
    } else {
      mat = new THREE.MeshToonMaterial({ color: 0xfff7ee, gradientMap: bodyRamp });
    }
    o.material = mat;
    if (kind === "star") {
      o.scale.setScalar(1.55);
      o.position.z -= 0.18;
      o.renderOrder = 2;
    } else {
      const out = new THREE.Mesh(o.geometry, outlineMat);
      out.name = "outline";
      out.scale.setScalar(1.028);
      out.renderOrder = 0;
      o.renderOrder = 1;
      o.add(out);
    }
  }
  scene.add(bunny);

  img.style.opacity = "0";
  img.style.pointerEvents = "none";
  canvas.style.display = "block";
  onReady();

  const t0 = performance.now();
  function loop(now) {
    const t = (now - t0) / 1000;
    const a = getAnim();
    ensureSize();
    bunny.rotation.y = 0.95 + a.spin * 0.55;
    bunny.rotation.z = a.tilt * 0.012;
    bunny.position.y = a.bounce * 0.010;
    const sy = a.squish;
    bunny.scale.set(2 - sy, sy, 2 - sy);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function makeToonRamp(THREE, stops) {
  const data = new Uint8Array(stops.length * 4);
  stops.forEach((s, i) => {
    data[i * 4] = s[0];
    data[i * 4 + 1] = s[1];
    data[i * 4 + 2] = s[2];
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
