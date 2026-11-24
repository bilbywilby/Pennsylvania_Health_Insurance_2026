#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const BUNDLE_PATH = path.join(REPO_ROOT, 'sources/keystone-sync/public/appeal_bundle.json');
const WIZARD_PATH = path.join(REPO_ROOT, 'sources/keystone-sync/src/components/generator/AppealWizard.tsx');

const REQUIRED_TOP_LEVEL_KEYS = ['schema_version', 'pathways', 'deadline_rules', 'routes', 'note'];
const EXPECTED_SCHEMA_VERSION = 1;

const EXCEPTIONS = {
  'INTEREST_RATE.deadlineKey': {
    reason: 'Interest-rate disputes (PA SB 371) have no fixed appeal clock in current corpus; owner: PA-health audit.',
  },
};

function fail(msg) {
  console.error(`FATAL: ${msg}`);
  process.exit(1);
}

function deadlineIsPopulated(rule) {
  if (!rule || typeof rule !== 'object') return false;
  return Number.isFinite(rule.days) || Number.isFinite(rule.months);
}

function extractIssueBundleMap(source) {
  const mapStart = source.indexOf('ISSUE_BUNDLE_MAP');
  if (mapStart === -1) {
    fail('ISSUE_BUNDLE_MAP not found in AppealWizard.tsx.');
  }
  const block = source.slice(mapStart, source.indexOf('};', mapStart));
  const entries = {};
  const entryRe = /(?:\[AppealIssue\.([A-Z0-9_]+)\]|([A-Z0-9_]+))\s*:\s*\{([^}]+)\}/g;
  let m;
  while ((m = entryRe.exec(block)) !== null) {
    const issue = m[1] || m[2];
    const body = m[3];
    const pick = (key) => {
      const kv = body.match(new RegExp(`${key}:\\s*(?:["']([^"']+)["']|undefined)`));
      if (!kv) return undefined;
      return kv[1] ?? null;
    };
    entries[issue] = {
      pathwayKey: pick('pathwayKey'),
      deadlineKey: pick('deadlineKey'),
      routeKey: pick('routeKey'),
    };
  }
  return entries;
}

const bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8'));
for (const key of REQUIRED_TOP_LEVEL_KEYS) {
  if (!(key in bundle)) fail(`Missing required top-level key "${key}"`);
}
if (bundle.schema_version !== EXPECTED_SCHEMA_VERSION) {
  fail(`Unexpected schema_version: ${bundle.schema_version}`);
}
if (typeof bundle.note !== 'string' || bundle.note.trim().length === 0) {
  fail('Bundle "note" must be a non-empty string.');
}

const map = extractIssueBundleMap(fs.readFileSync(WIZARD_PATH, 'utf8'));
const issues = Object.keys(map);
if (issues.length === 0) fail('No AppealIssue entries extracted from ISSUE_BUNDLE_MAP.');

const errors = [];
const warnings = [];

for (const [issue, m] of Object.entries(map)) {
  const pathway = bundle.pathways?.[m.pathwayKey];
  if (!pathway || !Array.isArray(pathway.steps)) {
    errors.push(`${issue}: pathways["${m.pathwayKey}"] missing or has no steps array`);
  } else if (pathway.steps.length === 0) {
    warnings.push(`${issue}: pathways["${m.pathwayKey}"] has an empty steps array; no pathway steps line will render`);
  }

  if (m.deadlineKey === undefined || m.deadlineKey === null) {
    const excKey = `${issue}.deadlineKey`;
    const exc = EXCEPTIONS[excKey];
    if (!exc || typeof exc.reason !== 'string') {
      errors.push(`${issue}: deadlineKey missing without reasoned EXCEPTIONS entry "${excKey}"`);
    } else {
      warnings.push(`${issue}: deadlineKey intentionally omitted — ${exc.reason}`);
    }
  } else if (!deadlineIsPopulated(bundle.deadline_rules?.[m.deadlineKey])) {
    errors.push(`${issue}: deadline_rules["${m.deadlineKey}"] missing or has neither days nor months`);
  }

  if (m.routeKey && !(m.routeKey in (bundle.routes ?? {}))) {
    errors.push(`${issue}: routes["${m.routeKey}"] missing`);
  }
}

for (const w of warnings) console.warn(`WARN: ${w}`);
if (errors.length) {
  errors.forEach((e) => console.error(`ERR: ${e}`));
  process.exit(1);
}
console.log(`OK: ${issues.length} AppealIssue entries reconciled (${warnings.length} warning(s)).`);
