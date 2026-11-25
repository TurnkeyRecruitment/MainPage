# Turnkey company homepage

The approved Turnkey company homepage for https://www.turnkeyrecruitment.no.

The page introduces Turnkey and links to Turnkey Core, Turnkey Media and Turnkey Arena. It includes Norwegian and English pages, the approved branding, optimized images, social sharing images, metadata, icons, permanent redirects and a real 404 page. Arena is presented as a product under development.

## Run

Use Node.js 22 or newer. There are no external application dependencies, database requirements or API keys.

```sh
npm run build
npm start
```

The server listens on `0.0.0.0:3000`. Set `PORT` to use another port.

For a development preview with search indexing disabled:

```sh
npm run dev
```

Run the production build before validation:

```sh
npm run build
npm run check
```

## Use the existing Replit project

Use the Replit project that already publishes to **www.turnkeyrecruitment.no**. Bring the code from the `main` branch of this repository into that project, review it in its preview, and publish through the existing project when the website update is approved.

Keep the current project identity, custom domains and any unrelated project services. Read [docs/REPLIT.md](docs/REPLIT.md) for the integration instructions and a prompt for Replit Agent.

The repository includes a `.replit` configuration for the standalone homepage. When integrating into an existing project, merge the relevant commands and port mapping into its configuration after inspecting what is already there.

## Publication behavior

`npm run build` generates the production version for `https://www.turnkeyrecruitment.no`. It creates indexable metadata and `sitemap.xml`. Norwegian is served at `/` and English at `/en/`.

`npm run dev` generates preview output with `noindex` in both HTML and response headers. The local preview origin is configured in `config/publication.json`. Preview indexing controls are not authentication.

Always use the production build for a public launch. The server implements the redirect and header rules directly, so they do not depend on a static host interpreting special files.

Both social images are local JPEG files at 1200 by 630 pixels. The production pages refer to them on the company domain. Final LinkedIn and Facebook preview checks must be made after the new version is public at that domain.

## Edit

1. `src/index.template.html` defines the page structure.
2. `src/copy.mjs` contains the Norwegian and English text.
3. `site/styles.css` contains the styling.
4. `site/assets` contains the image and icon files.
5. `config/publication.json` contains company details and publication origins.
6. `tools/prepare-publication.mjs` generates HTML, metadata, sitemap and redirect rules.
7. `src/worker.template.js` contains the shared HTTP request handler.
8. `server.mjs` adapts that handler to a standard Node HTTP server for Replit.

Build again after edits. `worker/index.js` is generated during the build and is not committed. The generated HTML in `site` is included for inspection and portability.

The source preserves the approved homepage design. The Node entrypoint makes it portable to Replit without a Cloudflare account or ChatGPT sign in.

## Assets and configuration

Asset origins are recorded in `asset-sources.json`. Images, logos, names and company content remain the property of their respective owners. Repository visibility does not grant a separate reuse licence for the brand assets.

No credentials, environment secrets, private hosting tokens or ChatGPT hosting configuration are required or included.
