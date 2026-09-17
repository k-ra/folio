# Folio

write on paper, play in the margins. stories with images, interactive graphics, data, and moving text.

your stories live in your browser. the demos are yours to replace. nothing syncs to a cloud account.

```bash
git clone https://github.com/k-ra/folio.git
cd folio
npm ci
npm run dev
```

open `http://127.0.0.1:5173`. for live AI, copy `.env.example` to `.env.local`, add your own OpenAI API key, and restart. keys stay on the local server; provider usage is yours. no key is needed to write or try the design samples.

GitHub Pages can host the editor with browser-local saving. live AI needs a private backend; cloud sync is not built yet.

[hosting and storage](docs/hosting.md) · [development](docs/development.md) · [design rules](docs/design-rules.md)
