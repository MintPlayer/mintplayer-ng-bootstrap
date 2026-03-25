# Deployment

This project automatically deploys the demo application to a VPS when code is pushed to the `master` branch.

## How it works

```
Push to master
    |
    v
GitHub Actions: build job
    - Builds Angular app
    - Runs tests
    - Publishes npm packages
    - Builds and pushes Docker image to GHCR
    |
    v
GitHub Actions: deploy job
    - SSHes into VPS via appleboy/ssh-action
    - Downloads docker-compose.yml from the repository
    - Logs into GHCR with GITHUB_TOKEN
    - Pulls the latest image
    - Restarts the container (down -> up -d)
    - Prunes old images
```

## VPS prerequisites

- Docker and Docker Compose installed
- Traefik reverse proxy running with an external `web` network
- SSH key-based authentication enabled
- Domain `bootstrap.mintplayer.com` pointing to the VPS IP

### Create the Traefik network (if not already created)

```bash
docker network create web
```

## GitHub Secrets

Configure the following secrets in the GitHub repository at **Settings > Secrets and variables > Actions**:

| Secret | Required | Description |
|--------|----------|-------------|
| `VPS_HOST` | Yes | IP address or hostname of the VPS |
| `VPS_USERNAME` | Yes | SSH user (e.g., `root`) |
| `VPS_SSH_KEY` | Yes | Private SSH key (full key including BEGIN/END lines) |
| `VPS_PORT` | No | SSH port (defaults to 22) |
| `VPS_SSH_KEY_PASSPHRASE` | No | Passphrase if the SSH key is encrypted |

`GITHUB_TOKEN` is automatically provided by GitHub Actions and is used for both pulling from GHCR and downloading `docker-compose.yml`.

## SSH key setup

Generate a dedicated SSH keypair on the VPS:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions  # Copy this entire output into the VPS_SSH_KEY secret
```

## Docker Compose

The [`docker-compose.yml`](docker-compose.yml) configures:

- Image: `ghcr.io/mintplayer/mintplayer-ng-bootstrap:master`
- Traefik labels for HTTPS routing on `bootstrap.mintplayer.com`
- Let's Encrypt TLS via Traefik's `letsencrypt` cert resolver
- Automatic restart (`unless-stopped`)

## Manual deployment

To manually deploy on the VPS:

```bash
cd /var/www/ng-bootstrap
docker compose pull
docker compose down
docker compose up -d
docker image prune -f
```
