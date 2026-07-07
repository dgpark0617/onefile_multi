const keyMap = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "jump",
  " ": "jump",
  ArrowDown: "down",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
  w: "jump",
  W: "jump",
};

function setInput(key, active) {
  const game = window.__marioGameRef;
  if (!game || game.gameOver) return;
  const me = game.me();
  if (!me || !me.alive) return;
  if (key === "left") me.input.left = active;
  if (key === "right") me.input.right = active;
  if (key === "jump") {
    if (active) me.input.jumpPressed = true;
    me.input.jumpHeld = active;
  }
  if (key === "down") me.input.downPressed = active;
  const btn = (id) => document.getElementById(id);
  btn("btnLeft")?.classList.toggle("active", me.input.left);
  btn("btnRight")?.classList.toggle("active", me.input.right);
  btn("btnDown")?.classList.toggle("active", me.input.downPressed);
  btn("btnJump")?.classList.toggle("active", me.input.jumpHeld);
}

function bindBtn(el, key) {
  if (!el) return;
  const start = (e) => {
    e.preventDefault();
    setInput(key, true);
  };
  const stop = (e) => {
    e.preventDefault();
    setInput(key, false);
  };
  el.addEventListener("pointerdown", start);
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointerleave", stop);
  el.addEventListener("pointercancel", stop);
}

export function initMarioInput() {
  window.addEventListener("keydown", (e) => {
    const k = keyMap[e.key];
    if (!k) return;
    e.preventDefault();
    setInput(k, true);
  });
  window.addEventListener("keyup", (e) => {
    const k = keyMap[e.key];
    if (!k) return;
    e.preventDefault();
    setInput(k, false);
  });
  window.addEventListener("blur", () => {
    const game = window.__marioGameRef;
    if (!game) return;
    const me = game.me();
    if (!me) return;
    me.input.left = false;
    me.input.right = false;
    me.input.downPressed = false;
    me.input.jumpHeld = false;
    me.input.jumpPressed = false;
    ["btnLeft", "btnRight", "btnDown", "btnJump"].forEach((id) => {
      document.getElementById(id)?.classList.remove("active");
    });
  });

  bindBtn(document.getElementById("btnLeft"), "left");
  bindBtn(document.getElementById("btnRight"), "right");
  bindBtn(document.getElementById("btnJump"), "jump");
  bindBtn(document.getElementById("btnDown"), "down");
}

export function setMarioGameRef(game) {
  window.__marioGameRef = game;
}
