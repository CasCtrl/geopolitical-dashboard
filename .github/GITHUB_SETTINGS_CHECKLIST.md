# GitHub Settings Checklist (2-Minute Setup)

Use this checklist after pushing workflow files to enforce merge gates.

## 1. Default Branch

1. Open repository Settings -> General -> Default branch.
2. Ensure default branch is main.

## 2. Branch Protection Rule (main)

1. Open Settings -> Branches -> Add branch protection rule.
2. Branch name pattern: main
3. Enable: Require a pull request before merging
4. Enable: Require approvals (set to at least 1)
5. Enable: Dismiss stale pull request approvals when new commits are pushed
6. Enable: Require review from Code Owners
7. Enable: Require conversation resolution before merging
8. Enable: Require status checks to pass before merging
9. Enable: Require branches to be up to date before merging
10. Add required checks:
   - CI / validate
   - CI / e2e-smoke
11. Enable: Include administrators
12. Save changes

## 3. Merge Strategy

Open Settings -> General -> Pull Requests:

1. Enable: Allow squash merging
2. Disable: Allow merge commits
3. Optional: Enable auto-delete head branches

## 4. Actions Permissions

Open Settings -> Actions -> General:

1. Allow all actions and reusable workflows (or your org-approved policy)
2. Workflow permissions: Read and write permissions
3. Enable: Allow GitHub Actions to create and approve pull requests (optional)

## 5. Environments for Release Workflow

Open Settings -> Environments:

1. Create environment: staging
2. Create environment: production
3. For production, add protection rules:
   - Required reviewers (recommended)
   - Optional wait timer

## 6. CODEOWNERS Verification

1. Confirm GitHub username/team entries in .github/CODEOWNERS are valid.
2. Open any test PR and verify code owner review is requested.

## 7. Optional Security Gate

If you want security scan as a PR gate, update workflow trigger and then add:
- Security Audit / npm-audit

Current default behavior: security audit runs on schedule + manual dispatch.
