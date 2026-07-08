import { gameSession } from "../core/gameSession.js";

let callbacks = {};

function $(id) {
  return document.getElementById(id);
}

export function showLobby() {
  gameSession.clear();
  callbacks.onStopGame?.();
  $("overlay")?.classList.remove("show");
  $("gameShell")?.classList.add("hidden");
  $("lobby")?.classList.remove("hidden");
}

function showGameShell() {
  $("lobby")?.classList.add("hidden");
  $("gameShell")?.classList.remove("hidden");
  $("overlay")?.classList.remove("show");
}

export function showGameOverlay({ title, msg, shareText }) {
  if ($("overlayTitle")) $("overlayTitle").textContent = title;
  if ($("overlayMsg")) $("overlayMsg").textContent = msg;
  const overlay = $("overlay");
  if (overlay) overlay.dataset.shareText = shareText || "";
  overlay?.classList.add("show");
}

export function updateControlState(quiz) {
  const canPick = quiz && !quiz.gameOver && quiz.state === "prompt";

  if ($("btnLong")) $("btnLong").disabled = !canPick;
  if ($("btnShort")) $("btnShort").disabled = !canPick;
}

function startSolo() {
  showGameShell();
  gameSession.isInGame = true;
  gameSession.pick = null;
  callbacks.onStartGame?.();
}

function copyShareText() {
  const text = $("overlay")?.dataset.shareText || $("overlayMsg")?.textContent || "";
  const url = location.href.split("?")[0];
  const full = `${text}\n${url}`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(full);
  } else {
    const ta = document.createElement("textarea");
    ta.value = full;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export function initLobby(opts) {
  callbacks = opts;

  $("btnSolo")?.addEventListener("click", startSolo);
  $("backBtn")?.addEventListener("click", showLobby);
  $("toLobbyBtn")?.addEventListener("click", showLobby);
  $("restartBtn")?.addEventListener("click", () => {
    $("overlay")?.classList.remove("show");
    callbacks.onRestartSolo?.();
  });
  $("shareBtn")?.addEventListener("click", copyShareText);

  $("btnLong")?.addEventListener("click", () => {
    if (!gameSession.pickAndReveal("long")) return;
    $("btnLong")?.classList.add("flash-pick");
    setTimeout(() => $("btnLong")?.classList.remove("flash-pick"), 220);
    updateControlState(gameSession.quiz);
  });

  $("btnShort")?.addEventListener("click", () => {
    if (!gameSession.pickAndReveal("short")) return;
    $("btnShort")?.classList.add("flash-pick");
    setTimeout(() => $("btnShort")?.classList.remove("flash-pick"), 220);
    updateControlState(gameSession.quiz);
  });

  for (const id of ["btnLong", "btnShort"]) {
    const btn = $(id);
    if (!btn) continue;
    btn.addEventListener("pointerdown", () => btn.classList.add("pressed"));
    const release = () => btn.classList.remove("pressed");
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("pointercancel", release);
  }
}
