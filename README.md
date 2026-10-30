# Joel Danson — Portfolio

Static website (HTML/CSS/JS, no build step).

```
index.html            Home: hero, projects, about, contact
vingen.html           01 · Thesis — premium horse trailer (Umesläp)
normada.html          02 · School project — 3D-printed room divider
visualization.html    03 · Personal product visualization (incl. the Faucon watch animation)
assets/css/styles.css
assets/js/main.js
assets/img/           Images exported from the PDF portfolio (WebP) and faucon.mp4
assets/Joel-Danson-Portfolio.pdf   Downloadable PDF
```

## Preview locally
Open `index.html` in a browser.

## Publish
Upload the four `.html` files and the `assets/` folder. Leave out `.agents/`, `.claude/`,
`.taste-skill/`, `skills-lock.json` and `assets/img/faucon_an.mp4` (the original film; the site
uses the web copy `faucon.mp4`). Netlify Drop (https://app.netlify.com/drop), GitHub Pages, Vercel
or Cloudflare Pages all work. Point joeldanson.com's DNS at the host when you're happy with it.
