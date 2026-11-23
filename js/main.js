(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");
  const stored = localStorage.getItem("theme");
  if (stored) {
    root.setAttribute("data-theme", stored);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }
  toggle && toggle.addEventListener("click", function () {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  /* ---------- year ---------- */
  const yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- nav: stuck + mobile + active link ---------- */
  const nav = document.getElementById("nav");
  const burger = document.getElementById("navBurger");

  const onScroll = function () {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  burger && burger.addEventListener("click", function () {
    const open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll(".nav__links a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("is-open");
      burger && burger.setAttribute("aria-expanded", "false");
    });
  });

  /* active section in nav */
  const navLinks = Array.from(document.querySelectorAll(".nav__links a"));
  const sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          const id = e.target.id;
          navLinks.forEach(function (a) {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e, i) {
        if (e.isIntersecting) {
          e.target.style.transitionDelay = Math.min(i * 60, 240) + "ms";
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- publication filter ---------- */
  const filters = document.querySelectorAll(".filter");
  const pubs = Array.from(document.querySelectorAll(".pub"));
  const empty = document.getElementById("pubEmpty");

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filters.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      const f = btn.dataset.filter;
      let shown = 0;
      pubs.forEach(function (p) {
        const match = f === "all" || (p.dataset.tags || "").split(" ").indexOf(f) !== -1;
        p.classList.toggle("is-hidden", !match);
        if (match) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    });
  });

  /* ---------- hero canvas: vision/audio/language streams ---------- */
  const canvas = document.getElementById("modalityCanvas");
  if (!canvas || prefersReduced) return;

  const ctx = canvas.getContext("2d");
  let W, H, dpr, particles = [], hub, raf;

  function colors() {
    const cs = getComputedStyle(root);
    return {
      v: cs.getPropertyValue("--vision").trim() || "#2f6df0",
      a: cs.getPropertyValue("--audio").trim() || "#0fb8a6",
      l: cs.getPropertyValue("--language").trim() || "#b45cf0",
      line: cs.getPropertyValue("--line-2").trim() || "#d4d0c5"
    };
  }
  let C = colors();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hub = { x: W * 0.72, y: H * 0.46 };
    build();
  }

  function bezier(t, p0, p1, p2) {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }

  function build() {
    particles = [];
    const streams = [
      { y: H * 0.18, key: "v" },
      { y: H * 0.46, key: "a" },
      { y: H * 0.78, key: "l" }
    ];
    streams.forEach(function (s) {
      const start = { x: -40, y: s.y };
      const ctrl = { x: W * 0.4, y: s.y };
      const count = Math.max(8, Math.round(W / 90));
      for (let i = 0; i < count; i++) {
        particles.push({
          start: start, ctrl: ctrl, key: s.key,
          t: Math.random(),
          speed: 0.0011 + Math.random() * 0.0014,
          r: 1.3 + Math.random() * 1.9
        });
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // faint guide curves
    const guides = [H * 0.18, H * 0.46, H * 0.78];
    ctx.lineWidth = 1;
    guides.forEach(function (gy) {
      ctx.strokeStyle = C.line;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(-40, gy);
      ctx.quadraticCurveTo(W * 0.4, gy, hub.x, hub.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // particles
    particles.forEach(function (p) {
      p.t += p.speed;
      if (p.t > 1) p.t = 0;
      const pos = bezier(p.t, p.start, p.ctrl, hub);
      const col = C[p.key];
      ctx.beginPath();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.18 + (1 - p.t) * 0.6;
      ctx.arc(pos.x, pos.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // hub
    const pulse = 1 + Math.sin(Date.now() / 900) * 0.08;
    const grd = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, 46 * pulse);
    grd.addColorStop(0, C.a);
    grd.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = getComputedStyle(root).getPropertyValue("--ink").trim() || "#14233c";
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, 6, 0, Math.PI * 2);
    ctx.fill();

    raf = requestAnimationFrame(draw);
  }

  const ro = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener("resize", resize);

  // refresh palette when theme changes
  new MutationObserver(function () { C = colors(); })
    .observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  resize();
  draw();

  // pause when hero off-screen
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { if (!raf) draw(); }
        else { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0 }).observe(canvas);
  }
})();
