import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
);
assert.equal(
  config.git?.deploymentEnabled,
  false,
  "Vercel Git deployments must remain disabled. Deployment is manual only.",
);
assert.equal(
  config.buildCommand,
  "npm run build:vercel",
  "Manual deployment must use the validated production build command.",
);
console.log("PASS: manual-only Vercel deployment policy.");
