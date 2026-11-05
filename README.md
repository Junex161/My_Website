# Julian Karcher – Personal Website

Personal website: research, background, photography and a vegan cookbook.
Built with [Astro](https://astro.build) (plus Vue for small interactive parts).

## Where things live

| What | File |
| --- | --- |
| Pages | `src/pages/` |
| Menu bar, footer, page frame | `src/layouts/Base.astro` |
| Colours and fonts | `src/styles/global.css` |
| Star sky on the home page | `src/scripts/sky.ts` |
| CV (About page) | `src/data/cv.json` |
| Logos for the CV | `src/assets/logos/` |
| Photos, sections, captions | `src/assets/photos/` and `src/data/photos.ts` |
| Contact form settings | `src/data/site.ts` |
| Recipes | `src/content/recipes/<name>/en.md` and `de.md` |
| Cookbook book (page turning, language switch) | `src/components/book/` |

### Add a recipe
Copy a folder in `src/content/recipes/` (e.g. `spaetzle/`), rename it (e.g. `lasagne/`) and change both files:
`en.md` is the English version, `de.md` the German one. `order` sets the position in the book,
`category` is one of `main`, `soup`, `side`, `breakfast`, `baking`. Ingredient lines ending in `:` become small headings.
If a line contains a colon, put it in quotes: `- "Optional: a bay leaf"`. Set `draft: true` to hide a recipe.
The book links straight to a recipe with `/cookbook/#lasagne`.

### Change the CV
Edit `src/data/cv.json`. Dates are `"YYYY-MM"`; leave out `end` for "now". `logo` is a file name in `src/assets/logos/`,
`"hidden": true` hides an entry.

### Add a photo
Put the JPG into `src/assets/photos/`, then add it to a section in `src/data/photos.ts` (import, title, alt text).
New sections (e.g. landscapes) are another `{ id, title, photos }` block there. Astro makes the small and large versions automatically.

### Contact form
By default the form opens the visitor's email app with the message filled in. To receive messages directly,
create a free form at formspree.io and paste its endpoint into `FORM_ENDPOINT` in `src/data/site.ts`.

## Run it on your laptop
1. Install Node.js (LTS) from https://nodejs.org
2. In this folder, open a terminal and run `npm install` (again whenever `package.json` changes; on Windows PowerShell use `npm.cmd install`)
3. Run `npm run dev` and open the address it shows (usually http://localhost:4321/My_Website/)

## Publish
Push to `main` on GitHub. The workflow in `.github/workflows/deploy.yml` builds the site and publishes it on GitHub Pages.
One-time setup on GitHub: Settings → Pages → Source: **GitHub Actions**.
