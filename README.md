# codegasf.github.io

Modern static site for posts, projects, and videos. Runs on GitHub Pages with plain HTML/CSS/JS.

## Features
- Tabs: Recent Posts, Projects, Videos
- Posts 
- GitHub projects
- YouTube videos
- Contact form

## Structure
- `index.html` — main page and layout
- `css/style.css` — styles
- `js/script.js` — data fetching and rendering
- `config/config.json` — site configuration
- `config/posts.json` — posts data
- `config/tags.json` — optional list of allowed tags (drives tag chips)
- `assets/` — images

## Local Run
Serve statically (one of):
- VS Code Live Server
- Python: `python -m http.server 8080`
- Node: `npx serve`

## Configure
Edit `config/config.json`:

```json
{
  "githubUser": "codegasf",
  "githubRepoFilter": [],
  "youtubeApiKey": "",
  "youtubeChannelId": "",
  "contactEmail": "hello@codegasf.dev",
  "xUsername": "codegasf",
  "formspreeId": "YOUR_FORM_ID"
}
```

Notes:
- Videos (no API): set only `youtubeChannelId` (starts with `UC...`). The site derives the uploads playlist (`UU...`) and embeds it.
- Videos (API): set both `youtubeApiKey` and `youtubeChannelId`.
- Contact form: if `formspreeId` is set, the form action is bound at runtime to `https://formspree.io/f/<formspreeId>`.

## Posts
In `config/posts.json`:

```json
[
  {
    "id": 1,
    "title": "Post Title",
    "excerpt": "Short description...",
    "tags": ["tag1", "tag2"],
    "date": "YYYY-MM-DD",
    "code": "optional code block string",
    "lang": "language-id",
    "link": "https://full-article.example.com"
  }
]
```

## Assets
- `assets/logo.png`
- `assets/banner.png` (used in `.hero` background)

## Deploy (GitHub Pages)
Push to `main` of `codegasf.github.io` repository. Pages serves from repo root.

## Tips
- Restrict YouTube API key by HTTP referrer if you enable it
- Ensure `formspreeId` exists for form submissions
- Verify `githubUser` and visibility of repos
