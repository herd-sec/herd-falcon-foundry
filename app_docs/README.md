# Herd Security for Falcon Fusion

Herd turns security alerts into targeted training for the people behind them. This app lets Falcon Fusion workflows look up a person's Herd risk score and training status, and report a detection to Herd so it scores the alert and assigns the training you mapped to it.

## Before you install

You need a Herd organization with the SIEM / DLP webhook turned on and a Herd admin who can create an API key.

1. In Herd, open Settings > API Keys and create a key with the `risk.read` scope. Copy it.
2. In Herd, open Settings > SIEM / DLP webhooks. Copy the webhook secret, and the organization ID from the webhook URL (the last path segment).
3. In the same page, add an alert-to-training mapping for each detection name you plan to send. Herd stores an alert without a mapping but does not score it or assign training.

## Install

1. Install the app from the Falcon console and open its API integration settings.
2. For "Herd look up user", paste the API key from step 1.
3. For "Herd report detection", paste the webhook secret from step 2.

## Workflow templates

| Template | What it does |
| --- | --- |
| Herd look up user risk | Takes an email and prints the person's Herd risk score, band and training status. |
| Herd report detection | Sends one detection to Herd. Herd scores it and assigns the training your mapping names. |
| Herd check risk then report | Looks the person up first and reports the detection only when their Herd band is High or Critical. |

Each template starts on demand. To run one from a detection, create a workflow with a Falcon detection trigger and call the template, or copy its actions into your own workflow.

## Data that leaves Falcon

Only what a workflow passes: an email address, a detection name, severity, a short description and a detection ID. The app stores nothing in Falcon and holds no secrets; the API key and webhook secret live in the API integration settings.

## Support

support@herdsecurity.io
