(() => {
  const root = document.documentElement;
  root.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  requestAnimationFrame(() => document.body.classList.add("is-loaded"));

  /* ---- Nav: hide on scroll down, solid background after hero ---- */
  const nav = document.querySelector(".nav");
  if (nav) {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 40);
      if (!nav.classList.contains("is-open")) {
        nav.classList.toggle("is-hidden", y > lastY && y > 400);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const toggle = nav.querySelector(".nav__toggle");
    toggle?.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    nav.querySelectorAll(".nav__links a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      })
    );
  }

  /* ---- Reveal on scroll ---- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---- Lamp beam follows the pointer ---- */
  const beam = document.querySelector(".beam");
  if (beam && finePointer && !reduceMotion) {
    const base = parseFloat(getComputedStyle(beam).getPropertyValue("--angle")) || 14;
    window.addEventListener(
      "pointermove",
      (e) => {
        const r = beam.getBoundingClientRect();
        const dx = e.clientX - r.left;
        const dy = e.clientY - (r.top + r.height / 2);
        let deg = (Math.atan2(dy, Math.max(dx, 60)) * 180) / Math.PI;
        deg = Math.max(base - 14, Math.min(base + 16, deg));
        beam.style.setProperty("--angle", deg.toFixed(2) + "deg");
      },
      { passive: true }
    );
  }

  /* ---- Cursor bubble on project cards ---- */
  const bubble = document.querySelector(".cursor-bubble");
  if (bubble && finePointer) {
    window.addEventListener(
      "pointermove",
      (e) => {
        bubble.style.setProperty("--x", e.clientX + "px");
        bubble.style.setProperty("--y", e.clientY + "px");
      },
      { passive: true }
    );
    document.querySelectorAll("[data-cursor]").forEach((el) => {
      el.addEventListener("pointerenter", () => {
        bubble.textContent = el.dataset.cursor;
        bubble.classList.add("is-on");
      });
      el.addEventListener("pointerleave", () => bubble.classList.remove("is-on"));
    });
  }

  /* ---- Gentle parallax on case-study covers ---- */
  const parallax = document.querySelectorAll("[data-parallax]");
  if (parallax.length && !reduceMotion) {
    const tick = () => {
      parallax.forEach((img) => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        img.style.transform = `translate3d(0, ${(-7 + p * 12).toFixed(2)}%, 0)`;
      });
    };
    window.addEventListener("scroll", () => requestAnimationFrame(tick), { passive: true });
    tick();
  }

  /* ---- Copy e-mail ---- */
  const toast = document.querySelector(".copy-toast");
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        if (toast) {
          toast.classList.add("is-on");
          clearTimeout(toast._t);
          toast._t = setTimeout(() => toast.classList.remove("is-on"), 2200);
        }
      } catch {
        window.location.href = "mailto:" + btn.dataset.copy;
      }
    });
  });

  /* ---- Lightbox ---- */
  const items = [...document.querySelectorAll("[data-lightbox]")];
  if (items.length) {
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Image viewer");
    lb.innerHTML = `
      <div class="lightbox__bar">
        <span class="mono lightbox__count"></span>
        <button class="lightbox__btn lightbox__close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <button class="lightbox__btn lightbox__nav lightbox__nav--prev" aria-label="Previous image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>
      <img alt="">
      <button class="lightbox__btn lightbox__nav lightbox__nav--next" aria-label="Next image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg></button>`;
    document.body.appendChild(lb);

    const img = lb.querySelector("img");
    const count = lb.querySelector(".lightbox__count");
    let index = 0;
    let lastFocus = null;

    const show = (i) => {
      index = (i + items.length) % items.length;
      const src = items[index].querySelector("img");
      img.src = items[index].dataset.lightbox || src.src;
      img.alt = src.alt;
      count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")} — ${items[index].dataset.title || ""}`;
    };
    const open = (i) => {
      lastFocus = document.activeElement;
      show(i);
      lb.classList.add("is-open");
      document.body.style.overflow = "hidden";
      lb.querySelector(".lightbox__close").focus();
    };
    const close = () => {
      lb.classList.remove("is-open");
      document.body.style.overflow = "";
      lastFocus?.focus();
    };

    items.forEach((el, i) => el.addEventListener("click", () => open(i)));
    lb.querySelector(".lightbox__close").addEventListener("click", close);
    lb.querySelector(".lightbox__nav--prev").addEventListener("click", () => show(index - 1));
    lb.querySelector(".lightbox__nav--next").addEventListener("click", () => show(index + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  /* ---- Footer year ---- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
