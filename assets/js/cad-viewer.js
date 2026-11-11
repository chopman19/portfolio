// Interactive CAD viewer. The model is not an animation: every frame the crank angle drives
// the rod and piston through the slider-crank equations, so what you see is the real mechanism.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const DRACO_PATH = "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/";
const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;
const PLAY_SPEED = TAU / 3200; // one revolution every 3.2 s
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-cad-viewer]").forEach(init);

function init(root) {
  const stage = root.querySelector(".viewer");
  const status = root.querySelector(".viewer__status");
  const ui = root.querySelector(".viewer-ui");
  const hint = root.querySelector(".viewer__hint");
  const slider = root.querySelector(".viewer-ui__angle");
  const playBtn = root.querySelector('[data-action="play"]');
  const resetBtn = root.querySelector('[data-action="reset"]');
  const modeBtns = [...root.querySelectorAll("[data-mode]")];
  const out = {
    angle: root.querySelector('[data-out="angle"]'),
    travel: root.querySelector('[data-out="travel"]'),
    rod: root.querySelector('[data-out="rod"]'),
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    status.textContent = "The 3D view needs WebGL, which this browser has turned off.";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", stage.dataset.label || "Interactive 3D model");
  stage.prepend(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.6;
  renderer.toneMappingExposure = 1.1;

  const TARGET = new THREE.Vector3(0, 0.071, 0);
  const RADIUS = 0.13; // bounding sphere of the mechanism through a full turn (m)
  const GROUND_Y = -0.07;
  const HOME_DIR = new THREE.Vector3(0.62, 0.36, 0.78).normalize();

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(0.3, 0.7, 0.35);
  key.target.position.copy(TARGET);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -0.2, right: 0.2, top: 0.2, bottom: -0.2, near: 0.2, far: 1.4 });
  scene.add(key, key.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShadowMaterial({ opacity: 0.1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 10);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.6;
  controls.enabled = false;

  const fitDistance = () => {
    const v = THREE.MathUtils.degToRad(camera.fov);
    const h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    return (RADIUS / Math.sin(Math.min(v, h) / 2)) * 1.04;
  };
  controls.minDistance = 0.2;
  controls.maxDistance = 1.6;

  // ---------- state ----------
  let crank, rod, piston, r = 0.04, L = 0.11;
  let theta = THREE.MathUtils.degToRad(55);
  let playing = !reduceMotion;
  let mode = "turn";
  let dragging = false;
  let velocity = 0; // rad per ms, for the flywheel coast after a flick
  let tween = null;
  let ready = false;

  // ---------- kinematics ----------
  const pose = () => {
    const s = Math.sin(theta), c = Math.cos(theta);
    const k = (r * s) / L; // sine of the rod angle
    crank.rotation.x = theta;
    rod.position.set(0, r * c, r * s);
    rod.rotation.x = -Math.asin(k);
    piston.position.y = r * c + L * Math.sqrt(1 - k * k);

    const deg = ((theta * DEG) % 360 + 360) % 360;
    out.angle.textContent = `${Math.round(deg) % 360}°`;
    out.travel.textContent = ((r + L - piston.position.y) * 1000).toFixed(1);
    out.rod.textContent = `${(Math.asin(k) * DEG).toFixed(1)}°`;
    if (document.activeElement !== slider) slider.value = String(Math.round(deg) % 360);
  };

  // ---------- render loop: only runs while something moves ----------
  let raf = 0, lastT = 0, visible = true;
  const requestRender = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
  controls.addEventListener("change", requestRender);

  function frame(t) {
    raf = 0;
    const dt = lastT ? Math.min(t - lastT, 50) : 16;
    let moving = false;

    if (playing && !dragging) { theta += dt * PLAY_SPEED; moving = true; }
    else if (!dragging && Math.abs(velocity) > 2e-5) {
      theta += velocity * dt;
      velocity *= Math.exp(-dt / 650);
      moving = true;
    }
    if (tween) {
      const p = Math.min(1, (t - tween.start) / 700);
      const e = 1 - Math.pow(1 - p, 3);
      camera.position.lerpVectors(tween.from, tween.to, e);
      camera.lookAt(controls.target);
      if (p === 1) tween = null;
      moving = true;
    }
    if (controls.enabled && controls.update()) moving = true;

    if (ready) pose();
    renderer.render(scene, camera);
    lastT = moving ? t : 0;
    if (moving) requestRender();
  }

  const homePosition = () => controls.target.clone().addScaledVector(HOME_DIR, fitDistance());
  const goHome = (animate) => {
    controls.target.copy(TARGET);
    if (animate && !reduceMotion) tween = { from: camera.position.clone(), to: homePosition(), start: performance.now() };
    else { camera.position.copy(homePosition()); camera.lookAt(TARGET); }
    requestRender();
  };

  new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = stage;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // keep the viewing direction, refit the distance so the whole mechanism stays in frame
    const dir = camera.position.lengthSq() ? camera.position.clone().sub(controls.target).normalize() : HOME_DIR;
    camera.position.copy(controls.target).addScaledVector(dir, fitDistance());
    camera.lookAt(controls.target);
    requestRender();
  }).observe(stage);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) requestRender();
  }).observe(stage);

  // ---------- controls ----------
  const touched = () => stage.classList.add("is-touched");
  const setPlaying = (on) => {
    playing = on;
    playBtn.textContent = on ? "Pause" : "Play";
    if (on) velocity = 0;
    requestRender();
  };
  const setMode = (m) => {
    mode = m;
    controls.enabled = m === "orbit";
    stage.dataset.mode = m;
    modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    hint.textContent = m === "orbit" ? "Drag to orbit, scroll or pinch to zoom" : "Drag to turn the crank";
    stage.classList.remove("is-touched");
  };
  modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  playBtn.addEventListener("click", () => setPlaying(!playing));
  resetBtn.addEventListener("click", () => goHome(true));
  slider.addEventListener("input", () => {
    touched();
    setPlaying(false);
    velocity = 0;
    theta = THREE.MathUtils.degToRad(Number(slider.value));
    requestRender();
  });

  // Turning the crank. Seen roughly along the shaft, you grab it and turn it around its axis;
  // seen side-on, where a circle would collapse into a line, a horizontal drag turns it instead.
  const center = new THREE.Vector3();
  const screenAngle = (x, y, rect) => {
    center.set(0, 0, 0).project(camera);
    const cx = rect.left + (center.x + 1) / 2 * rect.width;
    const cy = rect.top + (1 - center.y) / 2 * rect.height;
    return { a: Math.atan2(-(y - cy), x - cx), d: Math.hypot(x - cx, y - cy) };
  };
  let last = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "turn" || !ready) return;
    canvas.setPointerCapture(e.pointerId);
    dragging = true;
    velocity = 0;
    touched();
    if (playing) setPlaying(false);
    last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    stage.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || !last) return;
    const rect = canvas.getBoundingClientRect();
    const along = camera.position.clone().sub(controls.target).normalize().x; // crank axis is X
    let d;
    if (Math.abs(along) > 0.3) {
      const a0 = screenAngle(last.x, last.y, rect), a1 = screenAngle(e.clientX, e.clientY, rect);
      if (a1.d < 18) { last = { x: e.clientX, y: e.clientY, t: e.timeStamp }; return; }
      d = a1.a - a0.a;
      d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
      d *= Math.sign(along);
    } else {
      d = ((e.clientX - last.x) / rect.width) * TAU;
    }
    theta += d;
    const dt = Math.max(1, e.timeStamp - last.t);
    velocity = velocity * 0.6 + (d / dt) * 0.4;
    last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    requestRender();
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (reduceMotion || e.timeStamp - last.t > 80) velocity = 0; // held still before letting go
    velocity = THREE.MathUtils.clamp(velocity, -0.03, 0.03);
    last = null;
    requestRender();
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerdown", () => { if (mode === "orbit") touched(); });

  // ---------- load ----------
  const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
  new GLTFLoader().setDRACOLoader(draco).load(
    stage.dataset.model,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      crank = model.getObjectByName("crank");
      rod = model.getObjectByName("rod");
      piston = model.getObjectByName("piston");
      r = rod.position.length();
      L = piston.position.y - rod.position.y;
      scene.add(model);
      ready = true;
      ui.hidden = false;
      status.textContent = "";
      stage.classList.add("is-ready");
      setPlaying(playing);
      goHome(false);
      draco.dispose();
    },
    (e) => { if (e.total) status.textContent = `Loading model ${Math.round((e.loaded / e.total) * 100)} %`; },
    () => { status.textContent = "The 3D model could not be loaded."; }
  );
  setMode("turn");
  goHome(false);
}
