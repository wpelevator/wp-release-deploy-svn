# WP Release Deploy SVN

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-WP%20Release%20Deploy%20SVN-blue?logo=github)](https://github.com/marketplace/actions/wp-release-deploy-svn) [![Latest release](https://img.shields.io/github/v/release/wpelevator/wp-release-deploy-svn?include_prereleases&sort=semver)](https://github.com/wpelevator/wp-release-deploy-svn/releases) [![npm](https://img.shields.io/npm/v/@wpelevator/wp-release?label=wp-release)](https://www.npmjs.com/package/@wpelevator/wp-release)

GitHub Action that deploys a WordPress plugin to the WordPress.org plugin SVN repository using [`@wpelevator/wp-release`](https://www.npmjs.com/package/@wpelevator/wp-release). It's named after the [`wp-release deploy-svn`](https://www.npmjs.com/package/@wpelevator/wp-release#deploy-to-svn) command that it runs.

**Status:** first release (0.x). Boolean inputs must be `true` or `false`; anything else fails the run.

Input names follow the CLI flags of [`wp-release deploy-svn`](https://www.npmjs.com/package/@wpelevator/wp-release#deploy-to-svn), and the `SVN_USERNAME`/`SVN_PASSWORD` secrets match the 10up WordPress.org actions. See [Compared with the 10up actions](#compared-with-the-10up-actions) for the differences and how to migrate.

## Usage

```yaml
on:
  release:
    types: [ published ]
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-24.04
    concurrency: wporg-deploy
    steps:
      - uses: actions/checkout@v7

      - run: npm ci && npm run build

      # Stable releases: sync the build to trunk, tag it and update the assets.
      - if: github.event_name == 'release' && ! github.event.release.prerelease
        uses: wpelevator/wp-release-deploy-svn@0.4.0
        with:
          source-dir: dist
          trunk: true
          svn-tag: ${{ github.ref_name }}
          assets-dir: .wordpress-org
          svn-username: ${{ secrets.SVN_USERNAME }}
          svn-password: ${{ secrets.SVN_PASSWORD }}

      # Main branch pushes: update the readme and assets between releases.
      - if: github.event_name == 'push'
        uses: wpelevator/wp-release-deploy-svn@0.4.0
        with:
          source-dir: dist
          readme-only: true
          assets-dir: .wordpress-org
          svn-username: ${{ secrets.SVN_USERNAME }}
          svn-password: ${{ secrets.SVN_PASSWORD }}
```

Pre-releases don't run the action in this example, so they never touch WordPress.org. To tag a pre-release build without changing trunk, run the action for them with `svn-tag` and without `trunk`. A leading `v` in `svn-tag` is stripped, so a `v1.2.0` release creates `tags/1.2.0`.

The action runs on the GitHub Actions Node.js 24 runtime. Deploys need the `svn` client, which isn't preinstalled on `ubuntu-24.04` runners, so the action installs Subversion with `apt-get` on Linux runners when `svn` is missing. On other runners, install Subversion in an earlier step. Runs without writes don't need `svn`.

The action only deploys plugins. Themes are released by uploading a ZIP on WordPress.org.

## Inputs

| Input | Default | Description |
|---|---|---|
| `source-dir` | `.` | Directory with the plugin files to deploy. |
| `slug` | repository name | WordPress.org plugin slug. |
| `version` | `svn-tag`, then the `Version` header | Version to check against the headers. |
| `trunk` | `false` | Sync the full build to `trunk/`. |
| `readme-only` | `false` | Sync only the readme to `trunk/`. Can't be combined with `svn-tag`. |
| `svn-tag` | | Version to create as `tags/<version>`. With `trunk`, the tag is a copy of the synced `trunk/`. Without it, the tag is built from the source files and `trunk/` is left alone, for pre-release tags. A leading `v` is stripped. Empty disables tagging. |
| `assets-dir` | | Directory with the banners, icons and screenshots to sync to the SVN `assets/` directory. Assets aren't deployed unless this is set, and the directory must exist. |
| `assets` | | Set to `false` to skip the `assets-dir` sync for one run. |
| `readme` | `readme.txt` | Readme file name. |
| `from-zip` | | Deploy the contents of this ZIP file, with a `{slug}/` root folder, instead of `source-dir`. |
| `distignore` | `.distignore` in `source-dir` when present | Path to the ignore file, or `false` to not read one. |
| `exclude` | | Extra gitignore-style patterns separated by commas or new lines, like `build/,assets/*,images/**/*`. |
| `svn-url` | `https://plugins.svn.wordpress.org/{slug}/` | SVN URL with a `{slug}` placeholder. |
| `svn-username` | `SVN_USERNAME` env var | SVN username, only needed for the commit. |
| `svn-password` | `SVN_PASSWORD` env var | SVN password, only needed for the commit. Pass it from a secret. |
| `message` | based on the writes | SVN commit message. |
| `force` | `false` | Replace an existing SVN tag of the same version. |
| `dry-run` | `false` | Run every step except the commit and log the SVN status. Credentials aren't required. |

Credentials are passed either as the `svn-username` and `svn-password` inputs or as the `SVN_USERNAME` and `SVN_PASSWORD` environment variables, and the inputs win when both are set. The password input is masked in the logs. They're only needed for the commit, and the password is passed to svn on the standard input, never on the command line. A run with nothing to commit succeeds without committing.

## Outputs

| Output | Description |
|---|---|
| `slug` | Resolved WordPress.org slug. |
| `version` | Deployed version, empty when unknown, like for assets-only deploys. |
| `committed` | Whether a commit was made. |
| `revision` | SVN revision of the commit, empty when nothing was committed. |

## Compared with the 10up actions

[`10up/action-wordpress-plugin-deploy`](https://github.com/10up/action-wordpress-plugin-deploy) and [`10up/action-wordpress-plugin-asset-update`](https://github.com/10up/action-wordpress-plugin-asset-update) are the most widely used WordPress.org deploy actions. This action covers both:

| | 10up actions | This action |
|---|---|---|
| Releases and readme/asset updates | Two actions with separate configuration | One action with `trunk`, `readme-only`, `svn-tag` and `assets-dir` inputs |
| Configuration | Env vars (`SLUG`, `VERSION`, `BUILD_DIR`, `ASSETS_DIR`, `README_NAME`) | `with:` inputs only; those env vars are ignored |
| Trunk without a tag | Not possible, a deploy always tags | `trunk: true` without `svn-tag` (warns, since trunk then differs from the stable tag) |
| Tag without a trunk sync | Not possible, a deploy always syncs trunk | `svn-tag` without `trunk`, which builds the tag from the source files and leaves `trunk/` alone, with the `Version` header checked |
| Readme-only updates | Separate asset-update action; copies only the readme and assets with `IGNORE_OTHER_FILES: true`, otherwise bails when other files differ from trunk | `readme-only: true` copies just the readme |
| Version checks | None | `Version` header, readme `Stable tag` and SVN tag must agree before anything is written |
| Pre-release versions | Deployed unless the workflow skips them | Versions like `1.0.0-rc.1` can be tagged, and syncing one to `trunk/` warns |
| Release ZIP | `generate-zip` input builds one from SVN trunk | Not part of the deploy; build the ZIP with `wp-release zip` in a separate step and pass it as `from-zip` to deploy exactly the released files |
| Assets directory | `.wordpress-org`, synced whenever it exists | Synced only when `assets-dir` is set, and a missing directory is an error |
| File selection | `.distignore` or `.gitattributes` `export-ignore`, ignored when `BUILD_DIR` is set | `.distignore` (or another file via `distignore`) plus `exclude` patterns, also applied to `source-dir` |
| Asset MIME types | PNG, JPEG, GIF and SVG | The same formats |
| Runtime | Bash with `rsync` and `svn` on Linux runners | Bundled Node.js without `rsync`; installs `svn` on Linux runners |

To migrate from `10up/action-wordpress-plugin-deploy`, move the env vars to inputs (`SLUG` → `slug`, `BUILD_DIR` → `source-dir`, `ASSETS_DIR` → `assets-dir`, `VERSION` → `version`), set `assets-dir: .wordpress-org` to keep deploying the 10up default assets directory, and set `trunk: true` with `svn-tag` set to the version, since trunk and tag writes are off unless requested. To replace `10up/action-wordpress-plugin-asset-update`, use `readme-only: true` (with `README_NAME` → `readme`).

## Without the action

When you can't use a GitHub Action, such as on another CI system or from your own machine, add the same tooling as a development dependency and run the CLI command that the action runs. Pass the credentials in the `SVN_USERNAME` and `SVN_PASSWORD` environment variables and install the `svn` client first, which the CLI doesn't install for you:

```bash
npm install --save-dev @wpelevator/wp-release
npx wp-release deploy-svn dist --trunk --svn-tag 1.2.0 --assets-dir .wordpress-org --dry-run
```

Remove `--dry-run` to commit. The inputs map to the flags of [`wp-release deploy-svn`](https://www.npmjs.com/package/@wpelevator/wp-release#deploy-to-svn): `source-dir` is the first argument, `trunk`, `readme-only`, `force` and `dry-run` are switches, and `slug`, `version`, `svn-tag`, `assets-dir`, `readme`, `from-zip`, `distignore`, `exclude`, `svn-url`, `svn-username` and `message` keep their names. `assets: false` is `--no-assets` and `distignore: false` is `--no-distignore`. Add `--json` to read the result from the output. The CLI needs Node.js 22.12 or later. Run `npx wp-release deploy-svn --help` for all options.

## How it works

[`src/run.ts`](src/run.ts) reads the inputs with [`@actions/core`](https://github.com/actions/toolkit/tree/main/packages/core), maps them to [`@wpelevator/wp-release`](https://www.npmjs.com/package/@wpelevator/wp-release) options, installs `svn` when needed and runs `SvnDeploy`, which logs the planned SVN changes and the SVN status in collapsible groups. GitHub-specific code stays in the action, so `wp-release` doesn't depend on the Actions toolkit. Contract tests check that the inputs, with the `action.yml` defaults, resolve to the same options as the matching `wp-release deploy-svn` flags.

The action runs `dist/index.js`, a single file bundled with esbuild that includes `wp-release` and all other dependencies, so nothing is installed from npm when the action runs. The tooling version is fixed by the action ref you pin.

## Development

The source is TypeScript in `src/`. `dist/` is git-ignored in the monorepo. `npm run build` (part of the monorepo `npm run build` and `npm run release`) bundles it with esbuild, reading `wp-release` from its TypeScript source through the `wpelevator-source` export condition so that it doesn't need a `wp-release` build first, and the split-push workflow commits it to the action's release repository, the same way the plugins ship their `build/` directories:

```bash
npm run build --workspace @wpelevator/wp-release-deploy-svn-action
```

`npm test` runs the `.ts` tests directly with Node.js type stripping (Node.js 22.18 or later), and `npm run lint` runs ESLint and a `tsc` type check.

Run the bundle locally with inputs as `INPUT_<NAME>` env vars:

```bash
env INPUT_SLUG=example-plugin INPUT_SOURCE-DIR=dist INPUT_TRUNK=true INPUT_SVN-TAG=1.0.0 INPUT_DRY-RUN=true node packages/actions/wp-release-deploy-svn/dist/index.js
```

The `Test GitHub Actions` workflow (`.github/workflows/test-github-actions.yml` in the monorepo) builds the action and runs it from the monorepo with `uses: ./packages/actions/wp-release-deploy-svn` whenever the action, the JS packages or the lockfile change. It only checks that the bundled action loads and resolves its inputs, with a run that has nothing to write. SVN deploys are covered by the `wp-release` integration tests, which deploy to a local `svnadmin` repository when Subversion is installed. The unit tests, lint and build run in `Test and Build` with the rest of the monorepo.
