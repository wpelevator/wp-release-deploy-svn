# Changelog

## Unreleased

## 0.2.0 (2026-10-09)

- `svn-tag` no longer requires `trunk`. Without `trunk`, the tag is copied from the current `trunk/` in the repository.
- Removed the `readme-only` input: a deploy writes the whole trunk or nothing to it. Assets can still be updated alone with `assets-dir`.
- New `svn-username` and `svn-password` inputs as an alternative to the `SVN_USERNAME` and `SVN_PASSWORD` environment variables. The inputs win when both are set, and the password is masked in the logs.

## 0.1.1 (2026-10-09)

- Renamed the action to "WP Release Deploy SVN", so that its GitHub Marketplace listing matches the action repository: `github.com/marketplace/actions/wp-release-deploy-svn`. Workflows keep using `wpelevator/wp-release-deploy-svn`.

## 0.1.0 (2026-10-09)

- First release: deploys plugins to the WordPress.org plugin SVN repository with `trunk`, `readme-only`, `svn-tag` and `assets-dir` inputs, using `wp-release deploy-svn`.
