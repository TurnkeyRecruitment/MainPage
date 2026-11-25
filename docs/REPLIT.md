# Use this homepage in the existing Replit project

Repository: https://github.com/TurnkeyRecruitment/MainPage

Branch: `main`

Production website: https://www.turnkeyrecruitment.no

## Integration

1. Open the existing Replit project that already publishes the company website.
2. Save a checkpoint or commit of its current working state.
3. Inspect its current Git connection, application entrypoint and deployment settings. Bring the code from this repository into a working branch in that project. Resolve overlapping files explicitly.
4. Preserve the current project, domain connections, secrets and unrelated functionality. The homepage itself needs no secrets or database.
5. Merge the supplied `.replit` settings with the current configuration as appropriate. The build command is `npm run build`; the production run command is `npm start`. The server uses one port, defaults to 3000, binds to `0.0.0.0` and accepts a `PORT` override.
6. Run `npm run build` and `npm run check`. Then review the website in the Replit preview.
7. Publish from the existing project after the website update is approved.

This repository has its own Git history. An existing project can have another remote and unrelated commits. Inspect that history before changing remotes or merging. Do not force push, reset the existing project, or discard local changes as part of the transfer.

## Prompt for Replit Agent

> Use the code from https://github.com/TurnkeyRecruitment/MainPage, branch main, as the new Turnkey company homepage in this existing Replit project. Read README.md and docs/REPLIT.md first. Save a checkpoint, inspect the current app, and integrate the supplied source and assets. Preserve this project, its current domain connections for turnkeyrecruitment.no and www.turnkeyrecruitment.no, its secrets and any unrelated services. Keep the supplied design, wording, brand capitalization and product links. Retain both language pages, social images, metadata, sitemap, permanent redirects and the real 404 response. Use the production build command npm run build and start command npm start, merging the relevant Replit configuration with the current settings. Run npm run check, show the updated preview, and report any conflicts or unrelated functionality that needs a decision before publishing.

## Review before publishing

1. Confirm the Norwegian homepage and English `/en/` page match the approved design.
2. Check the Core, Media, Arena, email and LinkedIn links.
3. Check mobile layout and image loading.
4. Confirm the production canonical and social image URLs use `https://www.turnkeyrecruitment.no`.
5. Confirm no preview `noindex` remains in the production response or homepage HTML.
6. Check that `/services/flow` permanently redirects to Core and an unknown path returns HTTP 404.
7. Verify the public domain, HTTPS, sitemap and social images after publication. Refresh and inspect the shared URL in LinkedIn and Facebook.

## Official Replit references

1. [Using the Git pane](https://docs.replit.com/features/workspace-tools/git-interface)
2. [Application configuration](https://docs.replit.com/features/project-setup/configuration)
3. [Ports](https://docs.replit.com/features/project-setup/ports)
4. [After publishing](https://docs.replit.com/features/publishing/after-you-publish)
