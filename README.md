# Joel Danson, portfolio

Static website (HTML/CSS/JS, no build step).

```
index.html            Home: hero, projects, about, contact
vingen.html           Thesis: premium horse trailer (Umesläp)
normada.html          School project: 3D-printed room divider
visualization.html    Personal product visualization and the Faucon watch film
404.html              Page shown for broken links (uses root paths, so it only works on the live host)
assets/css/styles.css
assets/js/main.js
assets/img/           Renders (WebP), share images (og-*.jpg), watch films (faucon*.mp4)
assets/Joel-Danson-Portfolio.pdf   Downloadable PDF
```

## Preview locally
Open `index.html` in a browser. To preview `404.html`, serve the folder
(`python -m http.server`) and open http://localhost:8000/404.html.

## Publish
Deploy the repository root. `.agents/`, `.claude/`, `.taste-skill/` and `skills-lock.json` are
tool folders and are kept out of git by `.gitignore`. Netlify and GitHub Pages both pick up
`404.html` automatically. Then point joeldanson.com (DNS at Namecheap) at the host.

## Saved versions
`git tag -n1` lists them; `git switch --detach <tag>` shows one, `git switch main` returns.
