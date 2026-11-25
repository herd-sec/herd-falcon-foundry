// Offline checks for the app. The Foundry CLI cannot validate without a
// logged-in profile (`foundry apps validate` dry-runs the deploy in the cloud),
// so this checks what it can without one: the YAML parses, each API
// integration is a valid OpenAPI document, every path the manifest names
// exists, and every workflow action that calls an API integration operation
// names an operationId the spec defines.
import { existsSync, readFileSync } from "node:fs";
import SwaggerParser from "@apidevtools/swagger-parser";
import { parse } from "yaml";

const problems: string[] = [];
const load = (path: string): Record<string, any> => parse(readFileSync(path, "utf8"));

const manifest = load("manifest.yml");
const operationsByIntegration = new Map<string, Set<string>>();

for (const integration of manifest.api_integrations ?? []) {
  if (!existsSync(integration.path)) {
    problems.push(`api integration "${integration.name}": ${integration.path} is missing`);
    continue;
  }
  // validate() also resolves $refs and checks the document against the OpenAPI schema.
  await SwaggerParser.validate(integration.path);
  const spec = load(integration.path);
  const ids = new Set<string>();
  for (const item of Object.values<Record<string, any>>(spec.paths)) {
    for (const op of Object.values<Record<string, any>>(item)) {
      if (typeof op?.operationId === "string") ids.add(op.operationId);
      const exposed = op?.["x-cs-operation-config"]?.workflow;
      if (exposed !== undefined && exposed.expose_to_workflow !== true) {
        problems.push(`${integration.path}: ${op.operationId} must set workflow.expose_to_workflow`);
      }
      // The workflow action id names the operation by its workflow name.
      if (exposed?.name !== undefined && exposed.name !== integration.name) {
        problems.push(
          `${integration.path}: workflow name "${exposed.name}" differs from the manifest entry "${integration.name}"`,
        );
      }
    }
  }
  operationsByIntegration.set(integration.name, ids);
}

for (const workflow of manifest.workflows ?? []) {
  if (!existsSync(workflow.path)) {
    problems.push(`workflow "${workflow.name}": ${workflow.path} is missing`);
    continue;
  }
  const spec = load(workflow.path);
  const actions = Object.entries<Record<string, any>>(spec.actions ?? {});
  const names = new Set(actions.map(([key]) => key));
  const conditions = new Set(Object.keys(spec.conditions ?? {}));
  const known = new Set([...names, ...conditions]);
  const next = (target: unknown) => (Array.isArray(target) ? target : target ? [target] : []);
  for (const target of [
    ...next(spec.trigger?.next),
    ...actions.flatMap(([, a]) => next(a.next)),
    ...Object.values<Record<string, any>>(spec.conditions ?? {}).flatMap((c) => next(c.next)),
  ]) {
    if (!known.has(target)) problems.push(`${workflow.path}: next -> "${target}" is not defined`);
  }
  for (const [key, action] of actions) {
    const match = /^api_integrations\.(.+)\.([^.]+)$/.exec(String(action.id));
    if (match === null) continue;
    const [, integrationName, operationId] = match;
    if (!operationsByIntegration.get(integrationName as string)?.has(operationId as string)) {
      problems.push(`${workflow.path}: action ${key} calls unknown operation ${action.id}`);
    }
  }
}

if (!existsSync(manifest.logo)) problems.push(`logo ${manifest.logo} is missing`);
if (!existsSync(`${manifest.docs.path}/${manifest.docs.entrypoint}`)) {
  problems.push("docs entrypoint is missing");
}

if (problems.length > 0) {
  console.error(problems.map((p) => `✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log(
  `✓ manifest, ${manifest.api_integrations.length} API integrations (valid OpenAPI), ${manifest.workflows.length} workflows`,
);
