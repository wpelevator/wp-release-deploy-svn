# Changelog

## Unreleased

## 0.5.0 (2026-10-11)

- Version mismatches are annotated on the file and line of each version that doesn't match, such as the `Version` header or the readme `Stable tag`, instead of one error with every mismatch.
- Each deploy adds a section to the job summary: the plugin linked to its WordPress.org page, the version, the written SVN paths, the commit linked to its changeset or the dry run result, and the SVN changes. A failed deploy adds the version mismatches or the error.
- Bundles `@wpelevator/wp-release` 0.5.0.

## 0.4.0 (2026-10-10)

- `svn-tag` without `trunk` now builds the tag from the source files instead of copying the repository's trunk, so a pre-release like `1.5.1-rc.1` can be tagged without touching trunk. The `Version` header must match the tag, and the readme `Stable tag` isn't checked. `trunk` with `svn-tag` still copies the synced trunk.

## 0.3.0 (2026-10-10)

- Pre-release versions like `1.5.1-rc.1` can now be used as an `svn-tag`. Syncing a pre-release version to `trunk` still warns.
- Restored the `readme-only` input, which 0.2.0 removed. It syncs only the readme to `trunk/` for updates between releases, and can't be combined with `svn-tag`.

## 0.2.0 (2026-10-09)

- `svn-tag` no longer requires `trunk`. Without `trunk`, the tag is copied from the current `trunk/` in the repository.
- Removed the `readme-only` input: a deploy writes the whole trunk or nothing to it. Assets can still be updated alone with `assets-dir`.
- New `svn-username` and `svn-password` inputs as an alternative to the `SVN_USERNAME` and `SVN_PASSWORD` environment variables. The inputs win when both are set, and the password is masked in the logs.

## 0.1.1 (2026-10-09)

- Renamed the action to "WP Release Deploy SVN", so that its GitHub Marketplace listing matches the action repository: `github.com/marketplace/actions/wp-release-deploy-svn`. Workflows keep using `wpelevator/wp-release-deploy-svn`.

## 0.1.0 (2026-10-09)

- First release: deploys plugins to the WordPress.org plugin SVN repository with `trunk`, `readme-only`, `svn-tag` and `assets-dir` inputs, using `wp-release deploy-svn`.
