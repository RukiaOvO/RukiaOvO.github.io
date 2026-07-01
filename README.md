# RukiaOvO.github.io

A personal homepage, a living notebook, and a public front door.

This repository powers my own website built with Hugo. It brings together a compact profile, project showcases, writing entry points, and a few live signals that make the page feel current instead of frozen. The site is meant to stay close to my actual work and interests, so the content changes with me.

## Overview

The homepage serves as the center of the site: profile, social links, status widgets, and quick access to the rest of the content. Around it sit project pages, article listings, and an activity view that folds external updates back into the same space.

## What the site does

- Presents a personal profile with social entry points
- Highlights selected projects and technical writing
- Surfaces GitHub activity, weather, Steam status, and comments
- Keeps the site lean with Hugo templates, local data, Cloudflare Workers, and frontend scripts

## Structure

- `content/` - page content and entry points
- `data/home.yaml` - homepage data model and live source settings
- `layouts/` - Hugo template overrides and page layouts
- `assets/` - styles, scripts, and image assets
- `config/_default/` - site configuration
- `themes/blowfish/` - Blowfish theme submodule

## Cloudflare Workers

Cloudflare Workers are managed manually in the Cloudflare dashboard, not from this repository. The site only stores the public endpoint URLs in `data/home.yaml`:

- `github.workerEventsUrl` expects a JSON endpoint with an `events` array.
- `rss.workerFeedUrl` expects a JSON endpoint with an `items` array.
- `steam.workerUrl` expects the Steam status JSON payload used by the homepage widget.

Manual setup flow, following the Cloudflare Workers dashboard path:

1. Open Cloudflare Dashboard, then go to Workers & Pages.
2. Create or edit the Worker that serves the RSS/activity JSON.
3. Paste and deploy the Worker code in the dashboard editor.
4. Confirm these routes return JSON: `/rss` for RSS items and `/github` for GitHub events.
5. Copy the deployed Worker URLs into `data/home.yaml`.
6. Run the Hugo build locally before pushing site changes.

Reference: [Cloudflare Workers dashboard guide](https://developers.cloudflare.com/workers/get-started/dashboard/).

## Comments

The homepage comment area is configured in `data/home.yaml` and uses `giscus`, which stores comments in GitHub Discussions and supports replying within discussion threads.

To finish the giscus setup:

1. Enable GitHub Discussions on `RukiaOvO/RukiaOvO.github.io`.
2. Install the giscus GitHub App for the repository.
3. Open [giscus.app](https://giscus.app/), choose this repository and discussion category, then copy `repoId` and `categoryId` into `comments.giscus`.
4. Convert the old utterances issue to a discussion if existing comments should remain attached to the homepage.

The repository is intentionally focused on my own homepage rather than on being a generic starter kit or deployment guide.
