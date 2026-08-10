const actionImages = {
  idle: "../assets/actions/idle.png",
  walk: "../assets/actions/idle.png",
  wave: "../assets/actions/present.png",
  smile: "../assets/actions/proud.png",
  wink: "../assets/actions/wink.png",
  salute: "../assets/actions/wink.png",
  present: "../assets/actions/present.png",
  proud: "../assets/actions/proud.png",
  waiting: "../assets/actions/idle.png",
  working: "../assets/actions/present.png",
  review: "../assets/actions/wink.png",
  failed: "../assets/actions/idle.png"
};

const sizeProfiles = {
  small: { spriteW: 176, spriteH: 242, left: 22, bottom: 14, windowW: 220 },
  normal: { spriteW: 240, spriteH: 330, left: 30, bottom: 16, windowW: 300 },
  large: { spriteW: 312, spriteH: 430, left: 39, bottom: 20, windowW: 390 }
};

const sprite = document.getElementById("sprite");
const stage = document.getElementById("stage");
const closeButton = document.getElementById("close");
const settingsButton = document.getElementById("settings");

let mode = "idle";
let direction = 1;
let nextTurnAt = performance.now() + 3200;
let pausedUntil = 0;
let restingUntil = performance.now() + 1800;
let nextIdleActionAt = performance.now() + 2600;
let targetX = null;
let walkUntil = 0;
let currentSize = "normal";
let dragging = null;

Object.values(actionImages).forEach(src => {
  const image = new Image();
  image.src = src;
});

function applySize(key) {
  const profile = sizeProfiles[key] || sizeProfiles.normal;
  currentSize = key;
  document.documentElement.style.setProperty("--sprite-w", `${profile.spriteW}px`);
  document.documentElement.style.setProperty("--sprite-h", `${profile.spriteH}px`);
  document.documentElement.style.setProperty("--sprite-left", `${profile.left}px`);
  document.documentElement.style.setProperty("--sprite-bottom", `${profile.bottom}px`);
  localStorage.setItem("itto:size", key);
}

function setImageForMode(nextMode) {
  const src = actionImages[nextMode] || actionImages.idle;
  if (!sprite.src.endsWith(src.replace("../", ""))) {
    sprite.src = src;
  }
}

function applyModeClass() {
  sprite.className = "";
  setImageForMode(mode);
  if (mode === "walk") {
    sprite.classList.add(direction > 0 ? "walk-right" : "walk-left");
  } else if (mode !== "idle") {
    sprite.classList.add(mode);
  }
}

function playAction(nextMode, duration = 1800) {
  mode = nextMode;
  pausedUntil = nextMode === "idle" ? 0 : performance.now() + duration;
  nextIdleActionAt = Math.max(pausedUntil, performance.now()) + 3200 + Math.random() * 3800;
  applyModeClass();
}

function maybeIdleAction(now) {
  if (mode !== "idle" || now < nextIdleActionAt) return;
  const actions = [
    ["wink", 1700],
    ["proud", 2100],
    ["present", 1900],
    ["waiting", 1700],
    ["review", 1700]
  ];
  const [nextMode, duration] = actions[Math.floor(Math.random() * actions.length)];
  playAction(nextMode, duration);
}

async function wander(now) {
  if (dragging || now < pausedUntil) return;
  maybeIdleAction(now);
  if (now < pausedUntil) return;

  const [x, y] = await window.petWindow.getPosition();
  const area = await window.petWindow.getScreen();
  const profile = sizeProfiles[currentSize] || sizeProfiles.normal;

  if (mode === "walk" && now > walkUntil) {
    mode = "idle";
    targetX = null;
    restingUntil = now + 3000 + Math.random() * 3800;
    nextTurnAt = restingUntil + 1400;
    applyModeClass();
    return;
  }

  if (targetX === null || now > nextTurnAt || Math.abs(targetX - x) < 12) {
    if (Math.abs((targetX ?? x) - x) < 12) {
      restingUntil = now + 2600 + Math.random() * 3400;
    }
    const margin = 20;
    const minX = area.x + margin;
    const maxX = area.x + area.width - profile.windowW - margin;
    const distance = 45 + Math.random() * 85;
    const preferredDirection = Math.random() < 0.5 ? -1 : 1;
    targetX = Math.round(Math.max(minX, Math.min(maxX, x + preferredDirection * distance)));
    if (Math.abs(targetX - x) < 24) {
      targetX = Math.round(Math.max(minX, Math.min(maxX, x - preferredDirection * distance)));
    }
    direction = targetX >= x ? 1 : -1;
    walkUntil = now + 1900 + Math.random() * 2300;
    nextTurnAt = now + 4600 + Math.random() * 4200;
  }

  mode = now > restingUntil && Math.abs(targetX - x) > 14 ? "walk" : "idle";
  applyModeClass();
  if (mode === "walk") {
    const step = direction * 0.48;
    await window.petWindow.setPosition(x + step, y);
  }
}

function animate(now) {
  if (now >= pausedUntil && mode !== "walk" && mode !== "idle") {
    mode = "idle";
    applyModeClass();
  }
  requestAnimationFrame(animate);
}

async function beginDrag(event) {
  if (event.button !== 0 || event.target.closest("button")) return;
  const [winX, winY] = await window.petWindow.getPosition();
  dragging = {
    pointerX: event.screenX,
    pointerY: event.screenY,
    winX,
    winY,
    moved: false
  };
  mode = "idle";
  applyModeClass();
}

async function updateDrag(event) {
  if (!dragging) return;
  const dx = event.screenX - dragging.pointerX;
  const dy = event.screenY - dragging.pointerY;
  if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
  await window.petWindow.setPosition(dragging.winX + dx, dragging.winY + dy);
}

function endDrag() {
  if (!dragging) return;
  const wasClick = !dragging.moved;
  dragging = null;
  restingUntil = performance.now() + 2200;
  if (wasClick) playAction("present", 1300);
}

stage.addEventListener("mousedown", beginDrag);
window.addEventListener("mousemove", updateDrag);
window.addEventListener("mouseup", endDrag);
window.addEventListener("mouseleave", endDrag);
window.addEventListener("contextmenu", event => event.preventDefault());

window.addEventListener("mousemove", event => {
  if (dragging || mode === "walk" || performance.now() < pausedUntil) return;
  const dx = event.clientX - window.innerWidth / 2;
  if (Math.abs(dx) < 28) return;
  const tilt = Math.max(-1.2, Math.min(1.2, dx / 110));
  sprite.style.transform = `rotate(${tilt}deg)`;
  window.clearTimeout(sprite.lookTimer);
  sprite.lookTimer = window.setTimeout(() => {
    sprite.style.transform = "";
  }, 220);
});

settingsButton.addEventListener("click", event => {
  event.stopPropagation();
  window.petWindow.toggleSettings();
});

closeButton.addEventListener("click", event => {
  event.stopPropagation();
  window.petWindow.quit();
});

window.petWindow.onPetSize(applySize);
window.petWindow.onPetAction(action => {
  const durations = {
    idle: 0,
    smile: 2100,
    wink: 1800,
    salute: 1800,
    present: 2000,
    proud: 2200,
    wave: 1500
  };
  playAction(action, durations[action] ?? 1800);
});

const savedSize = localStorage.getItem("itto:size") || "normal";
applySize(savedSize);
window.petWindow.setSize(savedSize);
applyModeClass();

setInterval(() => wander(performance.now()), 90);
requestAnimationFrame(animate);