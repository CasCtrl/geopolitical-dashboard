#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required. Install: https://cli.github.com/"
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <env-file>"
  echo "Example: $0 .github/deploy/deploy.staging.env"
  exit 1
fi

env_file="$1"
if [[ ! -f "$env_file" ]]; then
  echo "Env file not found: $env_file"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

required=(
  ENVIRONMENT_NAME
  DEPLOY_HOST
  DEPLOY_USER
  DEPLOY_SSH_KEY
  DEPLOY_PATH
  DEPLOY_HEALTHCHECK_URL
)

for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required value: $key"
    exit 1
  fi
done

# Ensure environment exists by setting a non-sensitive variable.
gh variable set DEPLOY_PATH --env "$ENVIRONMENT_NAME" --body "$DEPLOY_PATH"
gh variable set DEPLOY_HEALTHCHECK_URL --env "$ENVIRONMENT_NAME" --body "$DEPLOY_HEALTHCHECK_URL"

gh variable set DEPLOY_PORT --env "$ENVIRONMENT_NAME" --body "${DEPLOY_PORT:-22}"
gh variable set DEPLOY_RESTART_COMMAND --env "$ENVIRONMENT_NAME" --body "${DEPLOY_RESTART_COMMAND:-systemctl restart geopolitical-dashboard}"
gh variable set DEPLOY_HEALTH_TIMEOUT_SECONDS --env "$ENVIRONMENT_NAME" --body "${DEPLOY_HEALTH_TIMEOUT_SECONDS:-120}"

gh secret set DEPLOY_HOST --env "$ENVIRONMENT_NAME" --body "$DEPLOY_HOST"
gh secret set DEPLOY_USER --env "$ENVIRONMENT_NAME" --body "$DEPLOY_USER"
gh secret set DEPLOY_SSH_KEY --env "$ENVIRONMENT_NAME" --body "$DEPLOY_SSH_KEY"

if [[ -n "${DEPLOY_HEALTHCHECK_HEADER:-}" ]]; then
  gh secret set DEPLOY_HEALTHCHECK_HEADER --env "$ENVIRONMENT_NAME" --body "$DEPLOY_HEALTHCHECK_HEADER"
fi

echo "Configured GitHub Environment '$ENVIRONMENT_NAME' deploy vars/secrets successfully."
