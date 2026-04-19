# Dependency Update Bot Policy

This repository uses Dependabot for automated dependency maintenance.

## Policy

1. Security updates are high priority and should be merged after CI passes.
2. Non-security dependency PRs are batched weekly.
3. Major-version updates require manual review and explicit approval.
4. PRs from Dependabot must pass all required checks before merge.
5. If a dependency update introduces regressions, close the PR and create a tracked follow-up issue.

## Operational Defaults

- Ecosystem: npm
- Schedule: weekly (Monday)
- Grouping: production and development dependencies
- Open PR cap: 8
- Labels: dependencies, security