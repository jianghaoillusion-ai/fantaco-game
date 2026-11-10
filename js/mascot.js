/**
 * Animated 眠花糖.
 * Official three-view drawings (front / side / back / jump) drive a 2D performer
 * with bounce, squash-stretch, ear/tail wobble. Optional lightweight 3D stage
 * (three.js from CDN) sits behind, matching brand colours; falls back cleanly.
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
      <canvas class="mascot-3d" width="280" height="280" aria-hidden="true"></canvas>
      <img class="mascot-2d" alt="眠花糖" src="${POSES.idle}">
      <div class="mascot-bubble" hidden></div>
    </div>`;
  const img = root.querySelector(".mascot-2d");
  const bubble = root.querySelector(".mascot-bubble");
  const canvas = root.querySelector(".mascot-3d");
  let pose = "idle";
  let timer = 0;
  let moodUntil = 0;
  let squish = 1, bounce = 0, tilt = 0, targetBounce = 0;

  function setPose(name, ms = 900) {
    pose = name;
    img.src = POSES[name] || POSES.idle;
    moodUntil = performance.now() + ms;
  }

  function say(text, ms = 1600) {
    bubble.hidden = false;
    bubble.textContent = text;
    clearTimeout(bubble._t);
    bubble._t = setTimeout(() => { bubble.hidden = true; }, ms);
  }

  const api = {
    cheer() { setPose("cheer", 1200); targetBounce = 18; say("好好喔！"); },
    wish() { setPose("wish", 1400); say("許個願吧！"); },
    think() { setPose("think", 1600); },
    sad() { setPose("sleep", 1400); say("能量還在路上…"); },
    hero() { setPose("hero", 1400); targetBounce = 22; },
    merge(tier) {
      if (tier >= 5) { setPose("hero", 1400); targetBounce = 24; say("太厲害了！"); }
      else if (tier >= 3) { setPose("cheer", 1000); targetBounce = 14; }
      else { setPose("wish", 700); targetBounce = 8; }
    },
    order() { setPose("cheer", 1400); targetBounce = 20; say("訂單完成！"); },
    idle() { if (performance.now() > moodUntil) setPose("idle", 0); }
  };

  function tick(t) {
    timer = t / 1000;
    if (performance.now() > moodUntil) {
      // gentle idle pose swap
      const cycle = Math.floor(timer / 3) % 4;
      const idlePose = ["idle", "idle2", "idle", "side"][cycle];
      if (pose !== idlePose && pose !== "cheer" && pose !== "hero" && pose !== "wish") {
        pose = idlePose;
        img.src = POSES[idlePose];
      }
    }
    targetBounce += (0 - targetBounce) * 0.06;
    bounce = Math.sin(timer * 2.4) * (6 + targetBounce * 0.2) + targetBounce;
    squish = 1 + Math.sin(timer * 2.4) * 0.03 - targetBounce * 0.004;
    tilt = Math.sin(timer * 1.3) * 3;
    img.style.transform = `translateY(${-bounce}px) rotate(${tilt}deg) scale(${2 - squish}, ${squish})`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // official 2D is the performer; 3D kept as optional later
  canvas.style.display = "none";
  return api;
}

async function boot3d(canvas) {
  try {
    const ok = !!window.WebGLRenderingContext;
    if (!ok) { canvas.style.display = "none"; return; }
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0.15, 4.2);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(280, 280, false);
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const sun = new THREE.DirectionalLight(0xfff6c0, 0.7);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    const bunny = buildBunny(THREE);
    scene.add(bunny);
    const t0 = performance.now();
    function loop(now) {
      const t = (now - t0) / 1000;
      bunny.rotation.y = Math.sin(t * 0.6) * 0.35;
      bunny.position.y = Math.sin(t * 2.2) * 0.08;
      const sq = 1 + Math.sin(t * 2.2) * 0.04;
      bunny.scale.set(2 - sq, sq, 2 - sq);
      bunny.rotation.z = Math.sin(t * 1.1) * 0.05;
      // ear wiggle
      const ears = bunny.getObjectByName("ears");
      if (ears) ears.rotation.z = Math.sin(t * 3.2) * 0.08;
      const tail = bunny.getObjectByName("tail");
      if (tail) tail.rotation.z = Math.sin(t * 4) * 0.25;
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  } catch {
    canvas.style.display = "none";
  }
}

function buildBunny(THREE) {
  const ink = 0x3b4468, cream = 0xfbfcf6, yellow = 0xffed00;
  const mat = new THREE.MeshToonMaterial({ color: cream });
  const inkMat = new THREE.MeshToonMaterial({ color: ink });
  const starMat = new THREE.MeshToonMaterial({ color: yellow });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 20), mat);
  body.scale.set(0.95, 1.15, 0.8);
  body.position.y = -0.15;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 20), mat);
  head.position.y = 0.85;
  g.add(head);
  const ears = new THREE.Group(); ears.name = "ears";
  function ear(x) {
    const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.55, 6, 10), mat);
    e.position.set(x, 1.55, 0);
    e.rotation.z = x > 0 ? -0.15 : 0.15;
    return e;
  }
  ears.add(ear(-0.28), ear(0.28));
  g.add(ears);
  // face
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), inkMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.18, 0.9, 0.52);
  eyeR.position.set(0.18, 0.9, 0.52);
  g.add(eyeL, eyeR);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 12, Math.PI), inkMat);
  smile.position.set(0, 0.72, 0.54);
  smile.rotation.x = Math.PI;
  g.add(smile);
  const arms = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.15, 4, 8), mat);
  arms.position.set(-0.7, 0.15, 0.1);
  const armR = arms.clone(); armR.position.x = 0.7;
  g.add(arms, armR);
  const feet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mat);
  feet.scale.set(1.2, 0.6, 1);
  feet.position.set(-0.28, -0.85, 0.15);
  const footR = feet.clone(); footR.position.x = 0.28;
  g.add(feet, footR);
  const tail = new THREE.Group(); tail.name = "tail";
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), starMat);
  star.position.set(0, -0.1, -0.75);
  tail.add(star);
  g.add(tail);
  return g;
}
