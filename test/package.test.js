import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { selectUpdates } from "../src/index.js";
import * as api from "../src/index.js";

const root = new URL("..", import.meta.url);

test("public exports stay limited to the documented surface", () => {
  assert.deepEqual(Object.keys(api).sort(), ["selectUpdates"]);
  assert.equal(typeof api.selectUpdates, "function");
  assert.equal(selectUpdates, api.selectUpdates);
});

test("package metadata names the module and the author", () => {
  const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.equal(pkg.name, "@aneron/update-tier");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.author, "Vadim Gubin");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.sideEffects, false);
  assert.equal(pkg.engines.node, ">=20");
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.main, "./src/index.js");
  assert.equal(pkg.exports, "./src/index.js");
  assert.equal(pkg.repository.type, "git");
  assert.equal(pkg.repository.url, "git+https://github.com/ANERON-GAMES/update-tier.git");
  assert.deepEqual(pkg.files, ["src", "LICENSE", "README.md"]);
  assert.equal(pkg.scripts.test, "node --test test/*.test.js");
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.equal(pkg.scripts.format, "prettier --write .");
  assert.equal(pkg.scripts["format:check"], "prettier --check .");
  const license = readFileSync(new URL("LICENSE", root), "utf8");
  assert.equal(license.includes("Copyright (c) 2026 Vadim Gubin"), true);
  assert.equal(license.includes("anerongames"), false);
  const readme = readFileSync(new URL("README.md", root), "utf8");
  for (const heading of [
    "## Purpose",
    "## Install",
    "## Usage",
    "## API",
    "## Design",
    "## License"
  ]) {
    assert.equal(readme.includes(heading), true, heading);
  }
  assert.equal(readme.includes("## Design notes"), false);
  assert.equal(readme.includes("## API reference"), false);
  assert.equal(readme.includes('`plan.due` is `["entity-a"]`'), true);
  assert.equal(readme.includes("`plan.deferred` is `[]`"), true);
  assert.equal(readme.includes('`plan.waiting` is `["entity-b", "entity-c"]`'), true);
  assert.equal(readme.includes('`plan.culled` is `["entity-d"]`'), true);
  assert.equal(readme.includes("`plan.tiers[0].count` is `1`"), true);
  assert.equal(readme.includes("`plan.tiers[0].due` is `1`"), true);
  assert.equal(readme.includes("`plan.tiers[1].waiting` is `1`"), true);
  assert.equal(readme.includes("`plan.tiers[2].waiting` is `1`"), true);
  assert.equal(readme.includes("`plan.tiers[2].count` is `1`"), true);
  assert.equal(readme.includes('`next.due` is `["entity-a", "entity-b"]`'), true);
  assert.equal(readme.includes('`next.waiting` is `["entity-c"]`'), true);
  assert.equal(readme.includes('`next.culled` is `["entity-d"]`'), true);
  assert.equal(readme.includes("`next.deferred` is `[]`"), true);
  assert.equal(readme.includes('`later.due` is `["entity-a", "entity-c"]`'), true);
  assert.equal(readme.includes('`later.waiting` is `["entity-b"]`'), true);
  assert.equal(readme.includes('`repeated.due` is `["entity-a"]`'), true);
  assert.equal(readme.includes('`repeated.waiting` is `["entity-b", "entity-c"]`'), true);
  assert.equal(readme.includes('`capped.due` is `["entity-a"]`'), true);
  assert.equal(readme.includes('`capped.deferred` is `["entity-b"]`'), true);
  assert.equal(readme.includes("`capped.max` is `1`"), true);
  assert.equal(readme.includes('`capped.waiting` is `["entity-c"]`'), true);
  assert.equal(readme.includes("`capped.tiers[1].deferred` is `1`"), true);
  assert.equal(readme.includes("`capped.tiers[1].due` is `0`"), true);
  assert.equal(readme.includes('`ordered.due` is `["entity-b", "entity-c"]`'), true);
  assert.equal(readme.includes('`ordered.deferred` is `["entity-a", "entity-e"]`'), true);
  assert.equal(readme.includes('`ordered.culled` is `["entity-d"]`'), true);
  assert.equal(readme.includes('`tied.due` is `["entity-a"]`'), true);
  assert.equal(readme.includes('`tied.deferred` is `["entity-b"]`'), true);
  assert.equal(readme.includes('`skipped.due` is `["entity-b"]`'), true);
  assert.equal(readme.includes('`skipped.waiting` is `["entity-a"]`'), true);
  assert.equal(readme.includes("`skipped.deferred` is `[]`"), true);
  assert.equal(readme.includes('`claimed.due` is `["entity-a"]`'), true);
  assert.equal(readme.includes('`claimed.deferred` is `["entity-b"]`'), true);
  assert.equal(readme.includes('`spread.due` is `["entity-a"]`'), true);
  assert.equal(readme.includes('`second.due` is `["entity-d"]`'), true);
  assert.equal(readme.includes('`third.due` is `["entity-c"]`'), true);
  assert.equal(readme.includes('`fourth.due` is `["entity-b"]`'), true);
  assert.equal(
    readme.includes(
      "The due counts for ticks `0`, `1`, `2`, and `3` are `11`, `11`, `9`, and `9`."
    ),
    true
  );
  assert.equal(readme.includes('`solid.due` is `["entity-a"]`'), true);
  assert.equal(readme.includes('`solid.culled` is `["entity-b"]`'), true);
  assert.equal(readme.includes('`flat.due` is `["entity-a", "entity-b"]`'), true);
  assert.equal(readme.includes("`flat.culled` is `[]`"), true);
  assert.equal(readme.includes('`inside.due` is `["entity-a"]`'), true);
  assert.equal(readme.includes('`inside.culled` is `["entity-b"]`'), true);
  assert.equal(readme.includes("`list[0].position.x` is still `6`"), true);
  assert.equal(readme.includes('`list[0].id` is still `"entity-a"`'), true);
  assert.equal(
    readme.includes("The FNV-1a 32-bit value of the empty string is `2166136261`."),
    true
  );
  assert.equal(readme.includes('The FNV-1a 32-bit value of `"a"` is `3826002220`.'), true);
});

test("source files do not contain comments, clocks, timers, or network calls", () => {
  const files = readdirSync(new URL("src/", root)).sort();
  assert.deepEqual(files, [
    "distance.js",
    "index.js",
    "phase.js",
    "read.js",
    "select.js",
    "shape.js"
  ]);
  for (const name of files) {
    const source = readFileSync(new URL("src/" + name, root), "utf8");
    const specifiers = source.match(/from "[^"]+"/g) ?? [];
    assert.equal(specifiers.length > 0 || !source.includes("import "), true, name);
    for (const specifier of specifiers) {
      assert.match(specifier, /^from "\.\/[a-z]+\.js"$/);
    }
    assert.equal(source.includes("node:"), false, name);
    assert.equal(source.includes("require("), false, name);
    assert.equal(source.includes("/*"), false, name);
    assert.equal(source.includes("//"), false, name);
    for (const token of [
      "Date",
      "setTimeout",
      "setInterval",
      "Math.random",
      "process",
      "fetch(",
      "globalThis",
      "queueMicrotask",
      "setImmediate",
      "performance"
    ]) {
      assert.equal(source.includes(token), false, name + " " + token);
    }
  }
});

test("the tree does not name private systems or carry addresses", () => {
  const files = ["README.md", "LICENSE", "package.json", "eslint.config.js"];
  const directories = ["src", "test", ".github"];
  const chunks = [];
  for (const name of files) {
    chunks.push(readFileSync(new URL(name, root), "utf8"));
  }
  for (const directory of directories) {
    const entries = readdirSync(new URL(directory + "/", root), { recursive: true });
    for (const entry of entries) {
      if (typeof entry !== "string" || (!entry.endsWith(".js") && !entry.endsWith(".yml"))) {
        continue;
      }
      chunks.push(readFileSync(new URL(directory + "/" + entry, root), "utf8"));
    }
  }
  const text = chunks.join("\n").toLowerCase();
  const banned = [
    "pocket" + "base",
    "blood" + "rain",
    "pc-" + "server",
    "messen" + "ger",
    "bot" + "s"
  ];
  for (const token of banned) {
    assert.equal(text.includes(token), false, token);
  }
});

test("the lockfile resolves only from the npm registry", () => {
  const lockPath = new URL("package-lock.json", root);
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.equal(lock.lockfileVersion >= 2, true);
  const text = readFileSync(lockPath, "utf8");
  assert.equal(text.includes("git+"), false);
  assert.equal(text.includes("github:"), false);
  assert.equal(text.includes("registry.yarnpkg.com"), false);
  let resolved = 0;
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (value !== null && typeof value === "object") {
      if (typeof value.resolved === "string") {
        resolved += 1;
        assert.equal(
          value.resolved.startsWith("https://registry.npmjs.org/"),
          true,
          value.resolved
        );
      }
      for (const key of Object.keys(value)) {
        walk(value[key]);
      }
    }
  };
  walk(lock);
  assert.equal(resolved > 0, true);
});
