# Evidence assets and GitHub Pages

## Evidence archives

Upload the original `.tar.xz` files as assets of a GitHub Release in `ds54e/analog-trace-bench`. Keep filenames and SHA-256 hashes consistent with `data/evidence.json`. Each task uses a `results-<task-slug>` release; each independently evaluated run has one immutable archive. The catalog includes 183 selected trials.

After uploading, copy each asset's actual download URL into its entry:

```text
https://github.com/ds54e/analog-trace-bench/releases/download/<tag>/<filename>.tar.xz
```

Use a specific release tag and filename, not a `latest` alias. Keep an existing filename's bytes stable; if evidence changes, use a new archive identity and update the hash after reviewing the change.

Run:

```sh
python3 tools/fetch_evidence.py <run-id>
python3 tools/build_site.py
python3 tools/check_site.py
```

The fetcher checks the manifest, URL, filename and SHA-256 and installs a verified archive into local `evidence/`. It never extracts or executes the archive. That directory and archive formats are ignored by Git. The continuous site check remains offline.

The website shows evidence as unavailable until its URL is recorded. No speculative download URL is published. See GitHub's [release documentation](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) for asset management.

## Publish an update

1. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
2. Verify that the desired site sources are committed to `main` and that the **Check website** workflow passes.
3. In **Actions → Deploy GitHub Pages → Run workflow**, select `main` and run the workflow.
4. Check the deployment job and open the URL it reports.

The live project site is [Analog Trace Bench](https://ds54e.github.io/analog-trace-bench/). `index.html` is the Model view; `tasks.html` is the Task view. Verify the deployed workflow head matches the intended commit and check affected pages after deployment.

The Pages workflow uses `configure-pages`, `upload-pages-artifact`, and `deploy-pages`. It builds the static pages from the committed content and templates, validates them, and uploads only `site/`. It needs `pages: write` and `id-token: write` in the deployment job and uses the `github-pages` environment. See [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [publishing-source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), checked on 2026-10-04.

The workflow is manual-only. Ordinary `main` updates validate the website without publishing it. To enable automatic deployment later, make that an explicit change to the workflow after the initial publication decision.

Use relative internal URLs so the site works both in a local preview and beneath the project-site path. Keep downloads on Release assets; do not include source archives, tooling, or repository-only documents in the Pages artifact.
