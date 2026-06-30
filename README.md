# RukiaOvO.github.io

A personal homepage, a living notebook, and a public front door.

This repository powers my own website built with Hugo. It brings together a compact profile, project showcases, writing entry points, and a few live signals that make the page feel current instead of frozen. The site is meant to stay close to my actual work and interests, so the content changes with me.

## Overview

The homepage serves as the center of the site: profile, social links, status widgets, and quick access to the rest of the content. Around it sit project pages, article listings, and an activity view that folds external updates back into the same space.

## What the site does

- Presents a personal profile with social entry points
- Highlights selected projects and technical writing
- Surfaces GitHub activity, weather, Steam status, and comments
- Supports Chinese and English content paths
- Keeps the site lean with Hugo templates, local data, and frontend scripts

## Structure

- `content/` - page content and entry points
- `data/home.yaml` - homepage data model and live source settings
- `layouts/` - Hugo template overrides and page layouts
- `assets/` - styles, scripts, and image assets
- `static/data/` - JSON snapshots used by the homepage
- `scripts/` - helper scripts for syncing data
- `workers/` - Cloudflare Worker code
- `config/_default/` - site configuration and localization
- `themes/blowfish/` - Blowfish theme submodule

The repository is intentionally focused on my own homepage rather than on being a generic starter kit or deployment guide.
