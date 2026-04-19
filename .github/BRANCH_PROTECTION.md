# Branch Protection Setup

Use this checklist in GitHub repository settings for main (and/or master).

## Target branch

- main
- Optional: master

## Recommended protections

- Require a pull request before merging
- Require approvals: 1 or more
- Dismiss stale pull request approvals when new commits are pushed
- Require review from Code Owners
- Require conversation resolution before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include administrators

## Required status checks

Use these exact check names from workflow runs:

- CI / validate
- CI / e2e-smoke

Optional (if you choose to run it on PRs later):

- Security Audit / npm-audit

## Merge strategy recommendations

- Enable squash merge
- Disable merge commits
- Automatically delete head branches

## Notes

- Security Audit currently runs on schedule and manual trigger; it is not a PR gate by default.
- Release workflow is manual and environment-gated for staging/production deployment.
