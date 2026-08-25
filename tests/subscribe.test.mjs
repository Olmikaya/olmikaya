/* ==========================================================================
   Tests for site/functions/api/subscribe.js — the letter sign-up endpoint.

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

/* Kit is three endpoints. `existing` is the subscriber the lookup should
   report (null for "never seen"); `create` and `form` are the statuses the
   two writes answer with. */
function stubKit({ existing = null, create = 201, form = 201, lookupOk = true } = {}) {
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const u = String(url);

    if (u.includes("/subscribers?")) {
      if (!lookupOk) return new Response("{}", { status: 500 });
      return new Response(
        JSON.stringify({ subscribers: existing ? [existing] : [] }),
        { status: 200 },
      );
    }
    if (u.includes("/forms/")) return new Response("{}", { status: form });
    return new Response("{}", { status: create });
  };
}

const writes = () => calls.filter((c) => (c.init.method || "GET") === "POST");
const hit = (frag) => calls.some((c) => c.url.includes(frag));

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
  if (actual !== expected) throw new Error(what + ": expected " + expected + ", got " + actual);
}

console.log("\n/api/subscribe");

await check("honeypot is accepted silently and never reaches Kit", async () => {
  stubKit();
  const res = await onRequestPost({ request: req({ email: "a@b.com", company: "bot" }), env: ENV });
  eq(res.status, 200, "status");
  eq((await res.json()).ok, true, "ok");
  eq(calls.length, 0, "provider calls");
});

await check("malformed address is rejected before any provider call", async () => {
  stubKit();
  const res = await onRequestPost({ request: req({ email: "not-an-email" }), env: ENV });
  eq(res.status, 400, "status");
  eq((await res.json()).ok, false, "ok");
  eq(calls.length, 0, "provider calls");
});

await check("unconfigured environment says so instead of faking success", async () => {
  stubKit();
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: {} });
  eq(res.status, 503, "status");
  const body = await res.json();
  eq(body.ok, false, "ok");
  eq(calls.length, 0, "provider calls");
  if (!/not open yet/i.test(body.message)) throw new Error("message: " + body.message);
});

await check("a new address is created INACTIVE, then added to the form", async () => {
  stubKit();
  const res = await onRequestPost({ request: req({ email: "Reader@Example.COM " }), env: ENV });
  eq(res.status, 200, "status");
  const body = await res.json();
  eq(body.ok, true, "ok");
  eq(body.state, "pending", "state");

  eq(calls.length, 3, "lookup + create + form");
  if (!calls[0].url.includes("status=all")) {
    throw new Error("lookup must ask status=all, or unconfirmed people look like strangers");
  }
  eq(calls[1].url, "https://api.kit.com/v4/subscribers", "create endpoint");
  eq(JSON.parse(calls[1].init.body).email_address, "reader@example.com", "normalised email");
  eq(JSON.parse(calls[1].init.body).state, "inactive", "must be inactive — not mailable before confirming");
  eq(calls[2].url, "https://api.kit.com/v4/forms/8675309/subscribers", "form endpoint");
});

await check("an already-confirmed address is told so, and nothing is written", async () => {
  stubKit({ existing: { email_address: "reader@example.com", state: "active" } });
  const res = await onRequestPost({ request: req({ email: "reader@example.com" }), env: ENV });
  eq(res.status, 200, "status");
  const body = await res.json();
  eq(body.ok, true, "ok");
  eq(body.state, "subscribed", "state");
  if (!/already on the list/i.test(body.message)) throw new Error("message: " + body.message);
  eq(writes().length, 0, "must not write anything");
});

await check("an unconfirmed address is re-sent the confirmation, not created twice", async () => {
  stubKit({ existing: { email_address: "reader@example.com", state: "inactive" } });
  const res = await onRequestPost({ request: req({ email: "reader@example.com" }), env: ENV });
  eq(res.status, 200, "status");
  const body = await res.json();
  eq(body.state, "pending", "state");
  if (!/sent the confirmation again/i.test(body.message)) throw new Error("message: " + body.message);
  eq(writes().length, 1, "form call only — no duplicate subscriber");
  if (!writes()[0].url.includes("/forms/")) throw new Error("the one write should be the form");
});

await check("someone who unsubscribed and came back must confirm again", async () => {
  stubKit({ existing: { email_address: "reader@example.com", state: "cancelled" } });
  const res = await onRequestPost({ request: req({ email: "reader@example.com" }), env: ENV });
  eq((await res.json()).state, "pending", "state");
  eq(writes().length, 1, "form call only");
});

await check("a failed lookup does not turn a reader away", async () => {
  stubKit({ lookupOk: false });
  const res = await onRequestPost({ request: req({ email: "reader@example.com" }), env: ENV });
  eq(res.status, 200, "status");
  eq((await res.json()).state, "pending", "state");
});

await check("the form step is never skipped — creating alone sends nothing", async () => {
  stubKit();
  await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  if (!hit("/forms/")) throw new Error("never called the form endpoint");
});

await check("an address Kit rejects (422) is reported, not called a success", async () => {
  stubKit({ create: 422 });
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  eq(res.status, 400, "status");
  eq((await res.json()).ok, false, "ok");
  if (hit("/forms/")) throw new Error("should not reach the form after a failed create");
});

await check("a failure on the form step is not reported as success", async () => {
  stubKit({ form: 500 });
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  eq(res.status, 502, "status");
  eq((await res.json()).ok, false, "ok");
});

await check("provider outage surfaces as a failure, not a false success", async () => {
  stubKit({ create: 500, form: 500 });
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  eq(res.status, 502, "status");
  eq((await res.json()).ok, false, "ok");
});

await check("the page a sign-up came from is passed to Kit as the referrer", async () => {
  stubKit();
  const request = req({ email: "a@b.com" });
  request.headers.set("Referer", "https://olmikaya.com/letter/");
  await onRequestPost({ request, env: ENV });
  const formCall = calls.find((c) => c.url.includes("/forms/"));
  eq(JSON.parse(formCall.init.body).referrer, "https://olmikaya.com/letter/", "referrer");
});

await check("provider throwing is caught", async () => {
  globalThis.fetch = async () => { throw new Error("network down"); };
  const res = await onRequestPost({ request: req({ email: "a@b.com" }), env: ENV });
  eq(res.status, 502, "status");
  eq((await res.json()).ok, false, "ok");
});

await check("another site cannot post into the list", async () => {
  stubKit();
  const res = await onRequestPost({ request: req({ email: "a@b.com", origin: "https://evil.example" }), env: ENV });
  eq(res.status, 403, "status");
  eq(calls.length, 0, "provider calls");
});

await check("JSON bodies work too", async () => {
  stubKit();
  const res = await onRequestPost({ request: req({ email: "a@b.com", asJson: true }), env: ENV });
  eq(res.status, 200, "status");
  eq(calls.length, 3, "lookup + create + form");
});

await check("no-JS success redirects to the thank-you page", async () => {
  stubKit();
  const res = await onRequestPost({ request: req({ email: "a@b.com", json: false }), env: ENV });
  eq(res.status, 303, "status");
  eq(res.headers.get("Location"), "/letter/thank-you/", "location");
});

await check("no-JS, already confirmed, goes to confirmed — not an inbox to watch", async () => {
  stubKit({ existing: { email_address: "a@b.com", state: "active" } });
  const res = await onRequestPost({ request: req({ email: "a@b.com", json: false }), env: ENV });
  eq(res.status, 303, "status");
  eq(res.headers.get("Location"), "/letter/confirmed/", "location");
});

await check("no-JS failure redirects to the sorry page, never thank-you", async () => {
  stubKit({ create: 500, form: 500 });
  const res = await onRequestPost({ request: req({ email: "a@b.com", json: false }), env: ENV });
  eq(res.status, 303, "status");
  eq(res.headers.get("Location"), "/letter/sorry/", "location");
});

await check("GET is refused", async () => {
  const res = await onRequest({ request: new Request(URL_, { method: "GET" }), env: ENV });
  eq(res.status, 405, "status");
  eq(res.headers.get("Allow"), "POST", "allow header");
});

console.log("\n" + pass + " passed, " + fail + " failed\n");
process.exit(fail ? 1 : 0);
