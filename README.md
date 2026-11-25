# Herd Security for CrowdStrike Falcon Foundry

A Falcon Foundry app that lets Falcon Fusion workflows work with [Herd](https://herdsecurity.io), a human risk platform:

- **Look up a person.** `GET /api/v1/users/lookup?email=` on Herd's public API returns the person's risk score, band and training status. Needs a Herd API key with the `risk.read` scope.
- **Report a detection.** `POST /api/webhooks/siem/{organizationId}` is Herd's existing SIEM webhook. Herd matches the email to a person, scores the alert if you mapped its alert type, and assigns the training your mapping names. Needs the webhook secret.

Training is assigned through Herd's alert-to-training mappings, which a Herd admin controls. The app cannot assign an arbitrary training to an arbitrary person.

## What is in the app

| Path | What |
| --- | --- |
| `manifest.yml` | The app: two API integrations, three workflow templates, docs. No functions, collections, scopes or UI extension. |
| `api-integrations/herd-api.yml` | OpenAPI 3 spec for the lookup (API key in `X-API-Key`). |
| `api-integrations/herd-detection-webhook.yml` | OpenAPI 3 spec for the detection webhook (bearer secret). |
| `workflows/` | Fusion workflow templates: look up, report, and check-risk-then-report. |
| `app_docs/README.md` | The install guide shown in the Falcon console. |
| `scripts/validate.ts` | Offline checks (see below). |

Two API integrations, not one, because Foundry attaches one credential to each integration and the two Herd endpoints use different ones.

## Check it offline

```
bun install
bun run validate
```

This parses the manifest, validates both specs as OpenAPI 3 documents, and checks that every path in the manifest exists and every workflow action names an operation a spec defines. It is not the Foundry validator: `foundry apps validate` dry-runs the deploy in the cloud and needs a login.

## Deploy to a tenant

You need a Falcon tenant with Foundry access and the Foundry CLI (`brew install crowdstrike/foundry-cli/foundry`).

```
foundry login                      # pick the cloud region, paste an API client id and secret
foundry apps validate --no-prompt  # cloud dry run
foundry apps deploy                # builds and deploys a version
foundry apps release               # releases the deployed version (bumps the version)
```

Then in the Falcon console, open Foundry > App manager, install the app, and enter the Herd API key and webhook secret in its API integration settings (see `app_docs/README.md`).

## Publishing to the CrowdStrike Marketplace

Needs things this repo cannot supply: a CrowdStrike partner agreement, certified-app creator access on the tenant (a support ticket), the app deployed, released and installed in that tenant, and screenshots. CrowdStrike reviews the app in its own Foundry organization and lists it with a Certified badge. No secrets belong in the app; here the credentials are entered at install time.

## Not verified

This was written without a Falcon tenant. The shapes follow CrowdStrike's published sample apps and docs, but the following have not run:

- `foundry apps validate` and `deploy` (both need a login).
- The workflow action ids (`api_integrations.<workflow name>.<operationId>`) and the `${data['…']}` output paths for an API integration call. Foundry's docs give the format by example only; open a workflow in the console workflow editor, add the Herd actions, and compare the exported YAML.
- The CEL expression in `herd-check-risk-then-report.yml`.
- The `Print data` action id in `herd-look-up-user-risk.yml` is copied from CrowdStrike's docs.
- The templates start on demand. A detection-triggered version needs the trigger's real event and field names from the console.
