# Changelog

## Unreleased

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
