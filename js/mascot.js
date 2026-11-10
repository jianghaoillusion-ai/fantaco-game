/**
 * 眠花糖 on the play screen.
 * Primary: official TuZi.obj decimated GLB, toon shading + ink outline,
 * idle bounce and a happy jump on merge / order complete.
 * Fallback: official 2D three-view drawings with the same bounce/jump.
 */
const POSES = {
  idle: "assets/mascot/front.png",
  idle2: "assets/mascot/idle.png",
  cheer: "assets/mascot/jump.png",
  wish: "assets/mascot/wish.png",
  hero: "assets/mascot/hero.png",
  think: "assets/mascot/sit.png",
  sleep: "assets/mascot/sleep.png",
  side: "assets/mascot/side.png",
  run: "assets/mascot/run.png",
  back: "assets/mascot/back.png",
  face: "assets/mascot/face.png"
};

export function mountMascot(root) {
  root.innerHTML = `
    <div class="mascot-stage">
      <canvas class="mascot-3d" width="360" height="360" aria-hidden="true"></canvas>
      <img class="mascot-2d" alt="眠花糖" src="${POSES.idle}">
      <div class="mascot-bubble" hidden></div>
    </div>`;
  const img = root.querySelector(".mascot-2d");
  const bubble = root.querySelector(".mascot-bubble");
  const canvas = root.querySelector(".mascot-3d");
  const stage = root.querySelector(".mascot-stage");
  let pose = "idle";
  let timer = 0;
  let moodUntil = 0;
  let jump = 0;       // 0–1 jump envelope
  let jumpVel = 0;
  let targetBounce = 0;
  let mode3d = false;
  const anim = { bounce: 0, squish: 1, tilt: 0, spin: 0 };

  function setPose(name, ms = 900) {
    pose = name;
    if (!mode3d) img.src = POSES[name] || POSES.idle;
    moodUntil = performance.now() + ms;
  }

  function startJump(power = 1) {
    jump = Math.max(jump, 0.05);
    jumpVel = 0.055 * power;
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
    idle() { if (performance.now() > moodUntil) setPose("idle", 0); }
  };

  function tick(t) {
    timer = t / 1000;
    // jump physics
    if (jumpVel !== 0 || jump > 0) {
      jump += jumpVel;
      jumpVel -= 0.0032;
      if (jump < 0) { jump = 0; jumpVel = jumpVel * -0.35; if (Math.abs(jumpVel) < 0.01) jumpVel = 0; }
    }
    if (performance.now() > moodUntil && !mode3d) {
      const cycle = Math.floor(timer / 3) % 4;
      const idlePose = ["idle", "idle2", "idle", "side"][cycle];
      if (pose !== idlePose && pose !== "cheer" && pose !== "hero" && pose !== "wish") {
        pose = idlePose;
        img.src = POSES[idlePose];
      }
    }
    targetBounce += (0 - targetBounce) * 0.07;
    const idleBob = Math.sin(timer * 3.2) * 10;
    anim.bounce = idleBob + jump * 86 + targetBounce;
    anim.squish = 1 + Math.sin(timer * 3.2) * 0.05 - jump * 0.18;
    anim.tilt = Math.sin(timer * 1.5) * 4;
    anim.spin = Math.sin(timer * 0.7) * 0.28;
    const sy = anim.squish, sx = 2 - sy;
    if (!mode3d) {
      img.style.transform = `translateY(${-anim.bounce}px) rotate(${anim.tilt}deg) scale(${sx}, ${sy})`;
    }
    stage.dataset.jumping = jump > 0.15 ? "1" : "0";
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  let starting3d = false;
  const use2d = (err) => {
    if (err) console.warn("眠花糖 3D 載入失敗，改用官方平面圖", err);
    mode3d = false;
    canvas.style.display = "none";
    img.style.display = "";
    img.style.opacity = "1";
  };
  const start3d = () => {
    if (starting3d || mode3d) return true;
    if ((canvas.clientWidth || 0) < 8 || (canvas.clientHeight || 0) < 8) return false;
    starting3d = true;
    boot3d(canvas, img, () => anim, () => { mode3d = true; }, use2d).catch(use2d);
    return true;
  };
  api.wake = () => { if (!start3d()) requestAnimationFrame(() => start3d()); };
  if (!start3d()) {
    const ro = new ResizeObserver(() => { if (start3d()) ro.disconnect(); });
    ro.observe(canvas.parentElement || canvas);
  }
  return api;
}

async function boot3d(canvas, img, getAnim, onReady, onFail) {
  const ok = !!window.WebGLRenderingContext;
  if (!ok) throw new Error("no webgl");
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(1.7, 1.35, 4.8);
  camera.lookAt(0, 1.0, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const fit = () => {
    const w = canvas.clientWidth || 360, h = canvas.clientHeight || 360;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  fit();
  new ResizeObserver(fit).observe(canvas.parentElement || canvas);

  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(2.2, 4.2, 3.2);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc5d4ff, 0.35);
  fill.position.set(-3, 1, -2);
  scene.add(fill);

  // 4-stop toon ramp
  const ramp = makeToonRamp(THREE);

  const gltf = await new Promise((resolve, reject) => {
    new GLTFLoader().load("assets/models/mianhuatang.glb", resolve, undefined, reject);
  });
  const bunny = gltf.scene;
  // Keep official GLB materials (cream body, ink face, yellow tail star).
  scene.add(bunny);

  const ensureSize = () => {
    const w = canvas.clientWidth || 0, h = canvas.clientHeight || 0;
    if (w < 8 || h < 8) return false;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    return true;
  };
  if (!ensureSize()) {
    await new Promise((resolve) => {
      const ro = new ResizeObserver(() => { if (ensureSize()) { ro.disconnect(); resolve(); } });
      ro.observe(canvas.parentElement || canvas);
      const iv = setInterval(() => { if (ensureSize()) { clearInterval(iv); ro.disconnect(); resolve(); } }, 200);
    });
  }

  img.style.opacity = "0";
  img.style.pointerEvents = "none";
  canvas.style.display = "block";
  onReady();

  // If the canvas stays empty (hidden-at-boot WebGL / software renderer), go back to official 2D.
  setTimeout(() => {
    try {
      const gl = renderer.getContext();
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      if (!w || !h) { onFail?.(new Error("empty 3d buffer")); return; }
      const step = Math.max(4, Math.floor(Math.min(w, h) / 24));
      const buf = new Uint8Array(4);
      let hits = 0;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
          if (buf[3] > 16) hits++;
        }
      }
      if (hits < 3) onFail?.(new Error("3d canvas has no pixels"));
    } catch (e) { onFail?.(e); }
  }, 900);

  const t0 = performance.now();
  function loop(now) {
    const t = (now - t0) / 1000;
    const a = getAnim();
    ensureSize();
    bunny.rotation.y = 0.35 + a.spin * 0.45;
    bunny.rotation.z = a.tilt * 0.012;
    bunny.position.y = a.bounce * 0.012;
    const sy = a.squish;
    bunny.scale.set(2 - sy, sy, 2 - sy);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function makeToonRamp(THREE) {
  const data = new Uint8Array([
    70, 70, 70, 255,
    130, 130, 130, 255,
    190, 190, 190, 255,
    255, 255, 255, 255
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
