(() => {
  document.documentElement.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nav = document.querySelector(".nav");
  if (nav) {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 40);
      if (!nav.classList.contains("is-open")) nav.classList.toggle("is-hidden", y > lastY && y > 400);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const toggle = nav.querySelector(".nav__toggle");
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle?.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.querySelectorAll(".nav__links a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal, .scribble").forEach((el) => io.observe(el));

  // Scrolling through the first screen turns the watch towards the visitor,
  // drawn from a sequence of cut-out frames so it stands on the page itself.
  const hero = document.querySelector(".hero");
  const watch = hero && hero.querySelector("[data-frames]");
  if (watch && !reduceMotion) {
    hero.classList.add("is-scrub");
    const still = watch.querySelector("img");
    const total = Number(watch.dataset.frames);
    const frames = [];
    const canvas = document.createElement("canvas");
    canvas.width = still.width;
    canvas.height = still.height;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", still.alt);
    const ctx = canvas.getContext("2d");
    let shown = -1;
    let ticking = false;

    const progress = () => {
      const r = hero.getBoundingClientRect();
      return Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
    };
    const draw = () => {
      ticking = false;
      let i = Math.round(progress() * (total - 1));
      while (i > 0 && !(frames[i] && frames[i].complete)) i--;
      if (i === shown || !(frames[i] && frames[i].complete)) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frames[i], 0, 0, canvas.width, canvas.height);
      if (shown < 0) still.replaceWith(canvas);
      shown = i;
    };
    const load = () => {
      for (let n = 1; n <= total; n++) {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } };
        img.src = `${watch.dataset.path}${String(n).padStart(2, "0")}.webp`;
        frames[n - 1] = img;
      }
    };
    if (document.readyState === "complete") load(); else window.addEventListener("load", load);
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } }, { passive: true });
  }

  const covers = document.querySelectorAll("[data-parallax]");
  if (covers.length && !reduceMotion) {
    const tick = () => covers.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      img.style.transform = `translate3d(0, ${(-7 + p * 12).toFixed(2)}%, 0)`;
    });
    window.addEventListener("scroll", () => requestAnimationFrame(tick), { passive: true });
    tick();
  }

  if (reduceMotion) document.querySelectorAll("video[autoplay]").forEach((v) => { v.removeAttribute("autoplay"); v.pause(); v.controls = true; });

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = "Copied!";
        btn.classList.add("is-copied");
        clearTimeout(btn._t);
        btn._t = setTimeout(() => { btn.textContent = label; btn.classList.remove("is-copied"); }, 2000);
      } catch {
        window.location.href = "mailto:" + btn.dataset.copy;
      }
    });
  });

  const items = [...document.querySelectorAll("[data-lightbox]")];
  let openLightbox = null;
  const buildLightbox = () => {
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Image viewer");
    lb.innerHTML = `
      <div class="lightbox__bar"><span class="lightbox__title"></span><button class="lightbox__btn lightbox__close" type="button">Close</button></div>
      <img alt="">
      <button class="lightbox__btn lightbox__nav lightbox__nav--prev" type="button">Previous</button>
      <button class="lightbox__btn lightbox__nav lightbox__nav--next" type="button">Next</button>`;
    document.body.appendChild(lb);

    const img = lb.querySelector("img");
    const title = lb.querySelector(".lightbox__title");
    const buttons = [...lb.querySelectorAll("button")];
    let index = 0;
    let lastFocus = null;

    const show = (i) => {
      index = (i + items.length) % items.length;
      const src = items[index].querySelector("img");
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      title.textContent = `${items[index].dataset.title}, ${index + 1} of ${items.length}`;
    };
    const open = (i) => {
      lastFocus = document.activeElement;
      show(i);
      lb.classList.add("is-open");
      document.body.style.overflow = "hidden";
      buttons[0].focus();
    };
    const close = () => {
      lb.classList.remove("is-open");
      document.body.style.overflow = "";
      lastFocus?.focus();
    };

    lb.querySelector(".lightbox__close").addEventListener("click", close);
    lb.querySelector(".lightbox__nav--prev").addEventListener("click", () => show(index - 1));
    lb.querySelector(".lightbox__nav--next").addEventListener("click", () => show(index + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "Tab") {
        const at = buttons.indexOf(document.activeElement);
        const next = e.shiftKey ? (at <= 0 ? buttons.length - 1 : at - 1) : (at + 1) % buttons.length;
        e.preventDefault();
        buttons[next].focus();
      }
    });
    return open;
  };
  // Built on first use so its controls are not in the page until someone opens a render.
  items.forEach((el, i) => el.addEventListener("click", () => {
    openLightbox = openLightbox || buildLightbox();
    openLightbox(i);
  }));

  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
