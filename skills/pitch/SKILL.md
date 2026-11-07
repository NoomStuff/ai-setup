---
name: pitch
description: Use when the user asks to pitch or mock them a set of designs or improvements.
---

# Pitch

Pitch the user a set of improvements by building each one in the real project and showing it on one page as an after screenshot, paired with a before and a slider when it changes something that already exists. Pitches can be anything from a big overhaul to a small win or a fresh mockup. They are visual proposals only, so don't commit anything unapproved.

1. Look around and/or use the project to look for the things that could be improved.
2. Build each pitch in the real code, one at a time. Take its after shot, and a before shot when there is a before, save it with `git add -N <files it added> && git diff > pitches/03-name.patch` so new files are included, and revert before the next one, removing any files it added, so every pair shows exactly one change.
3. Take every shot with a fixed window size, data and scroll position. Pairs must have the same pixel dimensions for accurate comparison.
4. Fill in the template below and save it as `pitches.html` in a folder like `/pitches/` (prefer to place this folder in pre-existing gitignored working folders if they exist, pitches must never be committed). Embed every image in the data block as a `data:image/png;base64,...` URI, so the file still works when it's opened on a phone, another device or over a remote connection.
5. Check the final page before you show it to the user.

## Showing the page

Show the pitches inline when the harness can render HTML in the conversation. Check your skills and tools for one that does, load it, and follow its rules over this template's where they conflict, adapting the page to fit.

- T3 Code: `html_preview`, then `html_render`. Point images at absolute file paths, which T3 inlines itself. Frames stop at 2000px tall.
- Codex in the ChatGPT desktop app: the `visualize` skill. It takes an HTML fragment under 1 MB in the thread's visualization folder, referenced with `visualize{"path":"...","mode":"wide"}` on its own line of the final answer.
- Claude with artifacts: load `artifact-design`, then publish with the `Artifact` tool and pass the shots as supporting files.
- Or use a similar flow if your harness supports it. 

Always link the self-contained `pitches.html` by its absolute path as well, so the user can open it from the host's file viewer on a phone or another device. With no inline renderer, that link is the whole delivery.

Report one line per pitch and the patch that holds it, say what the shots couldn't show, then wait for the user to pick.

## Landing picks

When the user picks pitches, only execute those. Make sure that only the pitched changes are applied, not the pitch files themselves or any other pitches that the user didn't pick.

1. Apply each picked patch in order with `git apply --3way pitches/NN-name.patch`. Resolve conflicts between picks by hand. If you are unable to recover a patch, rebuild that pitch from its description and shots.
2. Apply any tweaks the user asked for, and finish anything the pitch left rough.
3. Leave the unpicked patches and the page in the pitch folder so they can be picked later. Delete them only when the user says to discard them.

## Page template

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pitches</title>
<style>
  :root { color-scheme: dark; --bg: #111; --panel: #1b1b1a; --text: #ecebe7; --muted: #9a978f; --line: #2f2e2b; --link: #8fb0ff; --warn: #ff6b6b; --warn-bg: #3a1716; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.55 system-ui, sans-serif; }
  .page { max-width: 1120px; margin: 0 auto; padding: 40px 16px 56px; }
  header { padding-bottom: 24px; border-bottom: 1px solid var(--line); }
  h1 { margin: 0 0 8px; font-size: 1.75rem; line-height: 1.2; }
  .summary { margin: 0 0 16px; max-width: 72ch; color: var(--muted); }
  nav { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 0.9rem; }
  nav a { color: var(--link); text-decoration: none; }
  nav a:hover { text-decoration: underline; }
  section { padding: 32px 0; border-bottom: 1px solid var(--line); scroll-margin-top: 16px; }
  h2 { display: flex; align-items: baseline; gap: 12px; margin: 0 0 10px; font-size: 1.25rem; line-height: 1.3; }
  .num { color: var(--muted); font-variant-numeric: tabular-nums; font-weight: 500; }
  .scope { margin-left: auto; font-size: 0.8rem; font-weight: 400; color: var(--muted); white-space: nowrap; }
  .why, .note { margin: 0 0 8px; max-width: 72ch; }
  .note { color: var(--muted); }
  .warning { margin: 12px 0 0; padding: 8px 12px; border: 1px solid var(--warn); border-radius: 6px; background: var(--warn-bg); color: var(--warn); font-size: 0.9rem; font-weight: 600; }
  .warning[hidden] { display: none; }
  .compare { --position: 50%; position: relative; margin-top: 16px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--panel); touch-action: pan-y; user-select: none; cursor: ew-resize; }
  .compare img { display: block; pointer-events: none; -webkit-user-drag: none; }
  .compare img.before { width: 100%; height: auto; }
  .compare img.after { position: absolute; inset: 0; width: 100%; height: 100%; clip-path: inset(0 0 0 var(--position)); }
  .label { position: absolute; bottom: 10px; padding: 2px 8px; border-radius: 4px; background: #000a; color: #fff; font-size: 0.75rem; font-weight: 700; pointer-events: none; transition: opacity 0.15s; }
  .label.before { left: 10px; }
  .label.after { right: 10px; }
  .label.hidden { opacity: 0; }
  .divider { position: absolute; top: 0; bottom: 0; left: var(--position); width: 2px; margin-left: -1px; background: #fff; box-shadow: 0 0 0 1px #0007; outline: none; }
  .grip { position: absolute; top: 50%; left: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; display: grid; place-items: center; border-radius: 50%; background: #fff; color: #1a1a18; box-shadow: 0 0 0 1px #0007, 0 2px 8px #0006; transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .compare.single { cursor: auto; }
  .compare.single img.after { position: static; height: auto; clip-path: none; }
  .compare.dragging .grip, .divider:focus .grip { transform: scale(1.12); }
  .divider:focus-visible .grip { outline: 2px solid #fff; outline-offset: 2px; }
</style>
</head>
<body>
<div class="page">
  <header>
    <h1 id="title"></h1>
    <p class="summary" id="summary"></p>
    <nav id="toc" aria-label="Pitches"></nav>
  </header>
  <main id="pitches"></main>
</div>

<!-- Only edit this JSON block. Image paths are relative to this file. "before" is optional; leave it out for an after-only pitch. Every before and after pair must have identical pixel dimensions. -->
<script type="application/json" id="data">
{
  "title": "Pitch title",
  "summary": "One or two sentences on what these pitches cover.",
  "pitches": [
    {
      "title": "Pitch title",
      "scope": "Small",
      "why": "The problem visible in the before shot, what changed, and what it does for the user.",
      "note": "Optional tradeoffs or open questions.",
      "before": "shots/01/before.png",
      "after": "shots/01/after.png"
    }
  ]
}
</script>

<script>
(() => {
  "use strict";
  const data = JSON.parse(document.getElementById("data").textContent);
  document.title = data.title || "Pitch";
  document.getElementById("title").textContent = data.title || "Pitch";
  document.getElementById("summary").textContent = data.summary || "";
  const toc = document.getElementById("toc");
  const main = document.getElementById("pitches");
  const template = `
    <h2><span class="num"></span><span class="title"></span><span class="scope"></span></h2>
    <p class="why"></p>
    <p class="note"></p>
    <p class="warning" role="alert" hidden></p>
    <div class="compare">
      <img class="before" alt="">
      <img class="after" alt="">
      <span class="label before">Before</span>
      <span class="label after">After</span>
      <div class="divider" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
        <div class="grip"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 5 2.5 9l4 4M11.5 5l4 4-4 4"/></svg></div>
      </div>
    </div>`;

  (data.pitches || []).forEach((pitch, index) => {
    const n = index + 1;
    const link = document.createElement("a");
    link.href = `#pitch-${n}`;
    link.textContent = `${n}. ${pitch.title}`;
    toc.appendChild(link);

    const section = document.createElement("section");
    section.id = `pitch-${n}`;
    section.innerHTML = template;
    main.appendChild(section);
    const q = (sel) => section.querySelector(sel);
    q(".num").textContent = String(n).padStart(2, "0");
    q(".title").textContent = pitch.title;
    if (pitch.scope) q(".scope").textContent = pitch.scope; else q(".scope").remove();
    q(".why").textContent = pitch.why;
    if (pitch.note) q(".note").textContent = pitch.note; else q(".note").remove();

    const compare = q(".compare"), before = q("img.before"), after = q("img.after");
    const divider = q(".divider"), warning = q(".warning");
    const labelBefore = q(".label.before"), labelAfter = q(".label.after");
    before.alt = `${pitch.title}, before`;
    after.alt = `${pitch.title}, after`;
    divider.setAttribute("aria-label", `${pitch.title} comparison`);

    const loaded = (img) => new Promise((resolve, reject) => {
      img.addEventListener("load", () => img.decode().then(resolve, resolve), { once: true });
      img.addEventListener("error", reject, { once: true });
    });
    const failed = () => {
      warning.textContent = "An image failed to load. Check the paths in the data block.";
      warning.hidden = false;
      compare.hidden = true;
    };

    if (!pitch.before) {
      compare.classList.add("single");
      compare.replaceChildren(after);
      loaded(after).catch(failed);
      after.src = pitch.after;
      return;
    }

    let position = 50;
    const set = (value) => {
      position = Math.min(100, Math.max(0, value));
      compare.style.setProperty("--position", `${position}%`);
      divider.setAttribute("aria-valuenow", String(Math.round(position)));
      labelBefore.classList.toggle("hidden", position < 12);
      labelAfter.classList.toggle("hidden", position > 88);
    };
    set(50);

    const fromPointer = (event) => {
      const rect = compare.getBoundingClientRect();
      set(((event.clientX - rect.left) / rect.width) * 100);
    };
    compare.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      compare.setPointerCapture(event.pointerId);
      compare.classList.add("dragging");
      divider.focus({ preventScroll: true, focusVisible: false });
      fromPointer(event);
    });
    compare.addEventListener("pointermove", (event) => {
      if (compare.hasPointerCapture(event.pointerId)) fromPointer(event);
    });
    const stop = () => compare.classList.remove("dragging");
    compare.addEventListener("pointerup", stop);
    compare.addEventListener("pointercancel", stop);
    compare.addEventListener("dblclick", () => set(50));

    divider.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 10 : 2;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const moves = { ArrowLeft: position - step, ArrowRight: position + step, Home: 0, End: 100, b: 100, a: 0 };
      if (!(key in moves)) return;
      set(moves[key]);
      event.preventDefault();
    });

    const ready = Promise.all([loaded(before), loaded(after)]);
    before.src = pitch.before;
    after.src = pitch.after;
    ready.then(() => {
      const [bw, bh, aw, ah] = [before.naturalWidth, before.naturalHeight, after.naturalWidth, after.naturalHeight];
      if (bw === aw && bh === ah) return;
      warning.textContent = `Sizes differ: before is ${bw}×${bh}, after is ${aw}×${ah}. Retake both at the same size.`;
      warning.hidden = false;
    }, failed);
  });
})();
</script>
</body>
</html>
```
