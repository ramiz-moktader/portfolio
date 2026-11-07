# Md. Moktader Moula: academic website

Personal research website, hosted free on GitHub Pages.

## Updating the site

All text lives in **one file: `content.yml`**. You never need to touch the HTML.

1. On GitHub, open `content.yml` and click the pencil icon (✏️ Edit).
2. Make your change. To add a paper, project or job, copy an existing block and edit the copy.
3. Click **Commit changes**. The live site updates in about a minute.

If you break the formatting, the site shows a message naming the line to fix.

### Common edits

| I want to… | Edit this part of `content.yml` |
|---|---|
| Add a new paper | copy a block under `publications:` |
| Move a paper from "under review" to "published" | change its `status:` to `published`, add `year:` and `link:` |
| Add a GitHub project | copy a block under `software:` |
| Add a new job | add a block at the **top** of `experience:` |
| Add Google Scholar / ORCID / LinkedIn | fill in the fields under `profile:` |
| Add a CV button | upload your CV to a `files` folder, then set `cv_url: "files/cv.pdf"` |
| Add a photo | upload it to an `images` folder, then set `photo: "images/photo.jpg"` |
| Change the numbers under the introduction | edit `highlights:` |

Publication `status:` must be one of `published`, `preprint`, `under_review`, `in_preparation`.
`theme:` must match one of the `keyword:` values under `themes:` (GFM, Water, LULC, Forest).

### Formatting rules for `content.yml`

- Indent with spaces, never tabs, and keep indentation the same as nearby lines.
- A new list item starts with `- `.
- Put text in double quotes if it contains `: ` (colon followed by a space) or starts with a special character.

## Files

```
index.html          page shell (no need to edit)
content.yml         ALL site content ← edit this
assets/app.js       turns content.yml into the page
assets/style.css    colours, fonts, layout
assets/js-yaml.min.js  YAML reader library
```

## Turning on GitHub Pages

Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.

- If this repository is named `ramiz-moktader.github.io`, the site is at **https://ramiz-moktader.github.io/**
- Otherwise it is at `https://ramiz-moktader.github.io/<repository-name>/`

## Previewing on your computer

Browsers block reading `content.yml` from a double-clicked file, so run a small local server in this folder:

```bash
python -m http.server 8000
```

then open http://localhost:8000.
