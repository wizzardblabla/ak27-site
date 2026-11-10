"use strict";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- ciel etoile
(() => {
  const c = document.getElementById("stars"), g = c.getContext("2d");
  let w, h, stars = [];
  const resize = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    c.width = w * d; c.height = h * d; g.setTransform(d, 0, 0, d, 0, 0);
    stars = Array.from({ length: Math.round(w * h / 5200) }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + .2,
      t: Math.random() * 6.28, s: .4 + Math.random() * 1.4, v: .02 + Math.random() * .08
    }));
  };
  const draw = t => {
    g.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = reduced ? .6 : .35 + .45 * Math.sin(s.t + t / 1000 * s.s);
      g.globalAlpha = a; g.fillStyle = "#fff";
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
      if (!reduced) { s.y -= s.v; if (s.y < -2) s.y = h + 2; }
    }
    if (!reduced) requestAnimationFrame(draw);
  };
  resize(); addEventListener("resize", resize); requestAnimationFrame(draw);
})();

// ---------- apparition au defilement
(() => {
  const els = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: .12 });
  els.forEach(e => io.observe(e));
})();

// ---------- derniere version publiee
(async () => {
  try {
    const r = await fetch("https://api.github.com/repos/wizzardblabla/ak27-site/releases/latest");
    if (!r.ok) return;
    const rel = await r.json();
    const exe = (rel.assets || []).find(a => /\.exe$/i.test(a.name));
    const v = String(rel.tag_name || "").replace(/^v/, "");
    if (v) document.querySelectorAll("[data-ver]").forEach(e => e.textContent = "Version " + v);
    if (exe) document.querySelectorAll("[data-size]").forEach(e => e.textContent = exe.name + " · " + (exe.size / 1048576).toFixed(1) + " MB");
  } catch (_) { /* hors ligne : on garde les valeurs ecrites dans la page */ }
})();

// ---------- mode developpeur : contenu chiffre, ouvert seulement avec le bon code
(() => {
  const dlg = document.getElementById("dev"), form = document.getElementById("devForm"),
    input = document.getElementById("devCode"), err = document.getElementById("devErr"),
    box = document.getElementById("devContent"), go = document.getElementById("devGo");
  const b64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));

  document.getElementById("devOpen").onclick = () => { err.textContent = ""; input.value = ""; dlg.showModal(); input.focus(); };
  document.getElementById("devCancel").onclick = () => dlg.close();
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

  async function unlock(code) {
    const enc = await (await fetch("dev.enc", { cache: "no-store" })).json();
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: b64(enc.salt), iterations: enc.iter }, base, 512));
    const iv = b64(enc.iv), ct = b64(enc.ct);
    const macKey = await crypto.subtle.importKey("raw", bits.slice(32), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const signed = new Uint8Array(iv.length + ct.length); signed.set(iv); signed.set(ct, iv.length);
    if (!await crypto.subtle.verify("HMAC", macKey, b64(enc.mac), signed)) return null;
    const aes = await crypto.subtle.importKey("raw", bits.slice(0, 32), "AES-CBC", false, ["decrypt"]);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aes, ct)));
  }

  const el = (tag, text, attrs) => { const e = document.createElement(tag); if (text != null) e.textContent = text; Object.assign(e, attrs || {}); return e; };

  function render(d) {
    box.replaceChildren();
    box.append(el("h3", d.title || "Developer"));
    if (d.subtitle) box.append(el("p", d.subtitle, { className: "muted" }));
    const section = (title, node) => { box.append(el("h4", title), node); };
    if (d.links && d.links.length) {
      const ul = el("ul");
      d.links.forEach(l => { const li = el("li"); const a = el("a", l.label, { href: l.url, target: "_blank", rel: "noopener" }); li.append(a); if (l.note) li.append(" · " + l.note); ul.append(li); });
      section("Links", ul);
    }
    if (d.versions && d.versions.length) {
      const t = el("table"), hr = el("tr");
      ["Version", "Loader", "Status"].forEach(h => hr.append(el("th", h)));
      t.append(hr);
      d.versions.forEach(v => { const r = el("tr"); [v.version, v.loader, v.status].forEach(x => r.append(el("td", x))); t.append(r); });
      section("Tested versions", t);
    }
    if (d.roadmap && d.roadmap.length) { const ul = el("ul"); d.roadmap.forEach(x => ul.append(el("li", x))); section("Roadmap", ul); }
    if (d.build && d.build.length) section("Build", el("pre", d.build.join("\n")));
    if (d.notes && d.notes.length) { const ul = el("ul"); d.notes.forEach(x => ul.append(el("li", x))); section("Notes", ul); }
    const close = el("button", "Close", { className: "btn ghost", type: "button" });
    close.onclick = () => dlg.close();
    const row = el("div", null, { className: "row" }); row.style.marginTop = "22px"; row.append(close);
    box.append(row);
  }

  form.onsubmit = async e => {
    e.preventDefault();
    err.textContent = ""; go.disabled = true; go.textContent = "Checking...";
    try {
      const data = await unlock(input.value);
      if (!data) { err.textContent = "Wrong code."; return; }
      input.value = "";
      render(data);
      form.hidden = true; box.hidden = false; dlg.classList.add("wide");
    } catch (_) {
      err.textContent = "Developer mode is not available right now.";
    } finally {
      go.disabled = false; go.textContent = "Unlock";
    }
  };
  dlg.addEventListener("close", () => { form.hidden = false; box.hidden = true; box.replaceChildren(); dlg.classList.remove("wide"); });
})();

// maintenance : les boutons de telechargement ne menent nulle part
if (document.body.classList.contains("maintenance")) {
  document.querySelectorAll(".dl").forEach(a => { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.title = "Downloads are paused during maintenance"; });
}
