/* ==========================================================================
   Tests for functions/api/subscribe.js — the letter sign-up endpoint.

   Run:  node tests/subscribe.test.mjs

   No framework and no dependencies: the endpoint is a plain module taking
   { request, env }, so a stubbed global fetch is all it takes to exercise
   every path without touching Kit or spending a real address.

   Kept OUT of functions/ on purpose. Cloudflare Pages turns files in that
   folder into routes.
   ========================================================================== */

import { onRequest, onRequestPost } from "../site/functions/api/subscribe.js";

const ORIGIN = "https://olmikaya.com";
const URL_ = ORIGIN + "/api/subscribe";
const ENV = { KIT_API_KEY: "kit_test_key", KIT_FORM_ID: "8675309" };

let calls = [];

/* Kit takes two calls: create the subscriber, then add them to the form.
   `create` and `form` are the status each should answer with. */
function stubFetch(create = 201, form = 201) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    const status = String(url).includes("/forms/") ? form : create;
    return new Response(JSON.stringify({}), { status });
  };
}

function req({ email = "", company = "", json = true, origin = ORIGIN, asJson = false } = {}) {
  const headers = { Accept: json ? "application/json" : "text/html" };
  if (origin) headers.Origin = origin;
  let body;
  if (asJson) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ email, company });
  } else {
    body = new URLSearchParams({ email, company });
  }
  return new Request(URL_, { method: "POST", headers, body });
}

let pass = 0, fail = 0;
async function check(name, fn) {
  calls = [];
  try {
    await fn();
    console.log("  ok   " + name);
    pass++;
  } catch (e) {
    console.log("  FAIL " + name + " -> " + e.message);
    fail++;
  }
}
function eq(actual, expected, what) {
  if (actual !== expected) throw new Error(`${what}: expected ${expected}, got ${actual}`);
}

console.log("\n/api/subscribe");

await check("honeypot is accepted silently and never reaches the provider", async () => {
  stubFetch(201);
  const res = await onRequestPost({ request: req({ email: "a@b.com", company: "bot" }), env: ENV });
  eq(res.status, 200, "status");
  eq((await res.json()).ok, true, "ok");
  eq(calls.length, 0, "provider calls");
});

await check("malformed address is rejected before any provider call", async () => {
  stubFetch(201);
  const res = await onRequestPost({ request: req({ email: "not-an-email" }), env: ENV });
  eq(res.status, 400, "status");
  eq((await res.json()).ok, false, "ok");
  eq(calls.length, 0, "provider calls");
});

await check("unconfigured environment says so instead of faking success", async () => {
  stubFetch(201);
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: {} });
  eq(res.status, 503, "status");
  const body = await res.json();
  eq(body.ok, false, "ok");
  eq(calls.length, 0, "provider calls");
  if (!/not open yet/i.test(body.message)) throw new Error("message: " + body.message);
});

await check("a good address is created, THEN added to the form", async () => {
  stubFetch(201, 201);
  const res = await onRequestPost({ request: req({ email: "Reader@Example.COM " }), env: ENV });
  eq(res.status, 200, "status");
  eq((await res.json()).ok, true, "ok");
  eq(calls.length, 2, "provider calls");
  eq(calls[0].url, "https://api.kit.com/v4/subscribers", "step 1 endpoint");
  eq(calls[1].url, "https://api.kit.com/v4/forms/8675309/subscribers", "step 2 endpoint");
  eq(calls[0].init.headers["X-Kit-Api-Key"], "kit_test_key", "api key header");
  eq(JSON.parse(calls[0].init.body).email_address, "reader@example.com", "normalised email");
  eq(JSON.parse(calls[1].init.body).email_address, "reader@example.com", "form gets the email");
});

await check("the form step is never skipped — creating alone sends nothing", async () => {
  stubFetch(201, 201);
  await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  if (!calls.some((c) => String(c.url).includes("/forms/"))) {
    throw new Error("never called the form endpoint");
  }
});

await check("re-subscribing (200 from both steps) reads as success", async () => {
  stubFetch(200, 200);
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  eq(res.status, 200, "status");
  eq((await res.json()).ok, true, "ok");
});

await check("an address Kit rejects (422) is reported, not called a success", async () => {
  stubFetch(422, 201);
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  eq(res.status, 400, "status");
  const body = await res.json();
  eq(body.ok, false, "ok");
  eq(calls.length, 1, "should stop after the failed create");
});

await check("a failure on the form step is not reported as success", async () => {
  stubFetch(201, 500);
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  eq(res.status, 502, "status");
  eq((await res.json()).ok, false, "ok");
});

await check("provider outage surfaces as a failure, not a false success", async () => {
  stubFetch(500, 500);
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  eq(res.status, 502, "status");
  eq((await res.json()).ok, false, "ok");
});

await check("the page a sign-up came from is passed to Kit as the referrer", async () => {
  stubFetch(201, 201);
  const request = req({ email: "a@b.com" });
  request.headers.set("Referer", "https://olmikaya.com/letter/");
  const res = await onRequestPost({ request, env: ENV });
  eq(res.status, 200, "status");
  eq(JSON.parse(calls[1].init.body).referrer, "https://olmikaya.com/letter/", "referrer");
});

await check("provider throwing is caught", async () => {
  globalThis.fetch = async () => { throw new Error("network down"); };
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  eq(res.status, 502, "status");
  eq((await res.json()).ok, false, "ok");
});

await check("another site cannot post into the list", async () => {
  stubFetch(201);
  const res = await onRequestPost({ request: req({ email: "a@b.com", origin: "https://evil.example" }), env: ENV });
  eq(res.status, 403, "status");
  eq(calls.length, 0, "provider calls");
});

await check("JSON bodies work too", async () => {
  stubFetch(201);
  const res = await onRequestPost({ request: req({ email: "a@b.com", asJson: true }), env: ENV });
  eq(res.status, 200, "status");
  eq(calls.length, 2, "provider calls");
});

await check("no-JS success redirects to the thank-you page", async () => {
  stubFetch(201);
  const res = await onRequestPost({ request: req({ email: "a@b.com", json: false }), env: ENV });
  eq(res.status, 303, "status");
  eq(res.headers.get("Location"), "/letter/thank-you/", "location");
});

await check("no-JS failure redirects to the sorry page, never thank-you", async () => {
  stubFetch(500);
  const res = await onRequestPost({ request: req({ email: "a@b.com", json: false }), env: ENV });
  eq(res.status, 303, "status");
  eq(res.headers.get("Location"), "/letter/sorry/", "location");
});

await check("GET is refused", async () => {
  const res = await onRequest({ request: new Request(URL_, { method: "GET" }), env: ENV });
  eq(res.status, 405, "status");
  eq(res.headers.get("Allow"), "POST", "allow header");
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
