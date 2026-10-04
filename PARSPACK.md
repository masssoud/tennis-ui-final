# ParsPack Deployment

Create a Docker application from `https://github.com/masssoud/tennis-ui-final`.

## UI application settings

- Branch: `main`
- Dockerfile: `Dockerfile`
- Container port: `80`
- Health endpoint: `/health`
- Build argument: `VITE_API_BASE_URL=https://<api-domain>/api/v1`

The UI is built with Vite and served by Nginx. Set `VITE_API_BASE_URL` as a
Docker build argument because Vite embeds it into the generated static files at
build time. Do not use `localhost` for the production API URL.

## GitHub repository access

The GitHub repository must be authorized in ParsPack's GitHub integration. In
GitHub, configure the ParsPack app to access `masssoud/tennis-ui-final`, then
select that repository and the `main` branch in ParsPack. Repository access is
managed by the GitHub/ParsPack integration; it cannot be enabled by Dockerfile
or application settings in this repository.
