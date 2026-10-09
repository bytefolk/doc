# Personal Sealos preview

This deployment is a disposable personal preview, built from this checkout. It
restricts GitHub sign-in to the stable numeric account ID `47820304` and has no
email provider or public Mailpit. The GitHub OAuth application must have its
callback set to `https://<web-host>/api/auth/callback/github`.

`DOC_PERSONAL_PREVIEW=1` also denies GitHub sign-in if its allowlist is accidentally
omitted, and rejects other providers. Account connection requires a five-minute,
single-use intent bound to the initiating actor and session; switching accounts
or signing out before the callback rejects the connection. OAuth access/refresh
tokens are not retained for this sign-in-only integration.

## Images

Build the web image with its final HTTPS and WSS URLs. `NEXT_PUBLIC_*` values are
compiled into the browser bundle; changing only runtime environment variables
does not change the collaboration URL.

```sh
docker build --platform linux/amd64 --target runner -t "$DOC_WEB_IMAGE" \
  --build-arg NEXT_PUBLIC_APP_URL="https://$DOC_WEB_HOST" \
  --build-arg NEXT_PUBLIC_COLLABORATE_EDIT_URL="wss://$DOC_COLLABORATION_HOST/collaborate" .
docker build --platform linux/amd64 --target migrator -t "$DOC_MIGRATOR_IMAGE" .
docker build --platform linux/amd64 -f services/collaboration/Dockerfile -t "$DOC_COLLABORATION_IMAGE" .
```

The build never needs OAuth credentials. Supply them only to the web container
through a platform Secret.

The preview image workflow runs only on `preview/sealos-*` branches or explicit
dispatch. Set the non-secret repository variables `DOC_PREVIEW_APP_URL` and
`DOC_PREVIEW_COLLABORATION_URL` before pushing that branch. The pinned images are
`ghcr.io/bytefolk/doc-preview-{web,schema,collaboration}:<commit-sha>`; the workflow
records their immutable digests after a successful run. A workflow file in this
checkout does not by itself confirm that an image has been built or published.

## Runtime configuration

Create a `doc-preview-secrets` Secret in the target namespace, without committing
its contents. Required keys:

- `DATABASE_URL`: PostgreSQL connection string shared by all three workloads.
- `AUTH_SECRET`: a random session encryption secret, at least 32 bytes.
- `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`: a GitHub OAuth application.
- `COLLABORATE_API_AUTH_KEY`: a random encryption key shared by web and collaboration.
- `COLLABORATE_INTERNAL_API_KEY`: a separate random service authentication key.

The templates default to anonymous pulls of public images and contain no pull
credential. Publishing images does not automatically make GHCR packages public;
the operator must explicitly approve and confirm that visibility before deploying
the defaults. Keep PostgreSQL private and persistent.

For private images, create `doc-preview-ghcr` as a pull Secret using a credential
with `read:packages` and access to all three packages. Add this fragment to each
workload's `spec.template.spec` (the schema Job and both Deployments) before
submitting the templates:

```yaml
imagePullSecrets:
  - name: doc-preview-ghcr
```

A GitHub CLI token without `read:packages` is not a usable GHCR pull credential.
The runtime Secret names remain inputs; no YAML contains secret values.

The two templates use the official Sealos Template envelope, platform-generated
namespace/domain/certificate variables, workload manager labels, full Service
FQDNs and the supported CPU/memory ladder. Their defaults allocate these hosts
in the Hangzhou cluster; verify availability before building or deploying:

- `https://doc-peterguy326-f5396ac8.hzh.sealos.run`
- `wss://doc-collab-peterguy326-f5396ac8.hzh.sealos.run/collaborate`

`02-apps.template.yaml` creates both HTTPS routes, with long-lived WebSocket
connections on the collaboration ingress. Access logs are disabled to keep OAuth
callback query strings out of ingress access logs. The web workload limits are
`1` CPU / `1024Mi` memory (requests `100m` / `102Mi`); collaboration and schema
limits are each `500m` / `512Mi` (requests `50m` / `51Mi`). Check the namespace
quota before applying.

`AUTH_URL`, `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` must agree on the public web
origin. Do not configure `EMAIL_*` or `RESEND_API_KEY` for this GitHub-only preview.
Do not enable `allowDangerousEmailAccountLinking`.

## Empty database initialization

Submit `01-schema.template.yaml` through the Template API **only against a newly
created, empty preview database**, with `migrator_image` set to the pinned schema
image. Wait for Job `doc-schema-peterguy326-f5396ac8` to complete successfully.
Inspect a failed Job before retrying; the initializer intentionally refuses an
already initialized database.

Only after that success, submit `02-apps.template.yaml` through the Template API
with `web_image` and `collaboration_image` set to the pinned images. Do not submit
both stages concurrently or treat document order as a dependency guarantee.
The initializer requires `DOC_FRESH_PREVIEW_DATABASE=1` and rejects a database
containing any user table or view before invoking `npm run db:push`. It includes the share
uniqueness preflight and document search-index setup. The checked-in migrations
do not yet provide a complete baseline for `prisma migrate deploy`.

This is not a production upgrade procedure. Keep a persistent PostgreSQL volume
for the preview; application pods do not own the document data.

## Verification

1. `/api/health` returns database `ok`; collaboration `/ready` does likewise.
2. `/api/auth/providers` contains GitHub and no email provider. A sign-in request
   redirects to GitHub with the exact registered HTTPS callback.
3. The operator signs in as `PeterGuy326`; another GitHub numeric ID is denied by
   the server callback. OAuth approval remains an interactive user step.
4. Profile settings show `GitHub is connected`; `/api/account-connections` denies
   anonymous requests and returns no OAuth access or refresh token.
5. Create a document, edit it, reload it, and confirm PostgreSQL persistence and
   WebSocket collaboration. The text editor does not require AI credentials.

Image upload currently uses the legacy Alibaba OSS route, so it requires the
`OSS_*` credentials and CDN hostname; the separate generic storage provider is
not yet wired into that route. Leave uploads unconfigured for this text preview
unless a compatible storage configuration is provided.

Live Sealos deployment, the image workflow, and interactive GitHub OAuth have not
been verified by preparing these files. Record their actual results after the
operator completes the checks above.
