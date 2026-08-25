/* ==========================================================================
   POST /api/subscribe — the letter sign-up.

   A Cloudflare Pages Function. It runs on the same domain as the site, so
   the provider key never reaches the browser and the reader never leaves
   olmikaya.com to sign up.

   ---------------------------------------------------------------------------
   SETUP

   Two environment variables, set in the Cloudflare dashboard under
   Workers & Pages -> the project -> Settings -> Variables and Secrets.
   Set them for BOTH Production and Preview, or previews will report that
   sign-ups are closed.

     KIT_API_KEY   A V4 key, NOT the older V3 one. In Kit: your name, top
                   right -> Settings -> Developer -> V4 Keys -> Add a new
                   key. It is shown once. Mark it as a SECRET in Cloudflare,
                   not a plain text variable.
     KIT_FORM_ID   The numeric id of the form to subscribe people to. Grow ->
                   Landing Pages & Forms -> open the form; it is the number
                   in the address bar. Adding someone to a form is what
                   triggers that form's confirmation and welcome sequence.

   Until both are set the endpoint answers 503 and the form says sign-ups
   are not open yet. Nothing is silently dropped and nobody is told they
   subscribed when they did not.

   ---------------------------------------------------------------------------
   WHERE THIS FILE HAS TO LIVE

   Cloudflare Pages looks for functions/ at the ROOT DIRECTORY configured for
   the project's build — NOT the repository root, and not next to the build
   output. This project's root directory is `site` (see the deploy table in
   README.md), so this file belongs at site/functions/api/subscribe.js, where
   it is. At the repository root it would be silently ignored and /api/
   subscribe would 404 with no error anywhere.

   If the root directory setting ever changes, this folder moves with it.

   ---------------------------------------------------------------------------
   SWAPPING PROVIDER

   Everything Kit-specific is inside subscribeToKit(). Replace that one
   function and the two variable names above; nothing else here changes.
   ======================================================================== */

const THANK_YOU = "/letter/thank-you/";
const SORRY = "/letter/sorry/";

/* The Kit form uses double opt-in, so at this point the address is pending,
   not subscribed. Saying "you are on the list" here would be a quarter of a
   lie — they are on it once they click the link in the confirmation email.
   The honeypot answers with this too, so a bot cannot tell the paths apart. */
const CONFIRM_MESSAGE =
  "Almost — check your email and click to confirm. Nothing is sent until you do.";

/* Deliberately loose. The provider is the real authority on whether an
   address exists — this only catches obvious rubbish before we spend a
   request on it. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  /* Another site should not be able to post its visitors into our list.
     Browsers send Origin on same-origin form posts too, so when it is
     present it has to match. When it is absent (curl, older clients) we
     fall through — the honeypot and the provider still stand in the way. */
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return respond(request, 403, false, "That request did not come from this site.");
  }

  let fields;
  try {
    fields = await readFields(request);
  } catch {
    return respond(request, 400, false, "We could not read that submission.");
  }

  /* Honeypot. A bot fills every field it can see; a person never sees this
     one. Answer exactly as we would on success so the bot learns nothing,
     and tell the provider nothing. */
  if (fields.company) {
    return respond(request, 200, true, CONFIRM_MESSAGE);
  }

  const email = (fields.email || "").trim().toLowerCase();

  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return respond(request, 400, false, "That does not look like an email address.");
  }

  if (!env.KIT_API_KEY || !env.KIT_FORM_ID) {
    return respond(
      request,
      503,
      false,
      "Sign-ups are not open yet. Try again shortly.",
    );
  }

  try {
    /* Kit records where a sign-up came from, if we can tell it. */
    const referrer = request.headers.get("Referer") || undefined;
    const result = await subscribeToKit(env, email, referrer);

    if (result.ok) {
      return respond(request, 200, true, CONFIRM_MESSAGE);
    }

    /* Kit rejected the address itself. Re-subscribing is NOT this case —
       that comes back 200 — so this really is a bad address, and saying
       "you are on the list" would be a lie. */
    if (result.status === 422) {
      return respond(
        request,
        400,
        false,
        "That address was not accepted. Check it and try again.",
      );
    }

    return respond(
      request,
      502,
      false,
      "The sign-up service did not answer. Try again in a moment.",
    );
  } catch {
    return respond(
      request,
      502,
      false,
      "The sign-up service did not answer. Try again in a moment.",
    );
  }
}

/* Anything that is not a POST. */
export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return new Response("Method not allowed", {
    status: 405,
    headers: { Allow: "POST", "Content-Type": "text/plain; charset=utf-8" },
  });
}

/* --------------------------------------------------------------------------
   The provider. This is the only Kit-aware code in the file.

   Kit v4 takes TWO calls, and the order matters:

     1. POST /v4/subscribers            creates the person, or returns the
                                        existing one. 201 new, 200 existing.
     2. POST /v4/forms/{id}/subscribers puts them on the form, which is what
                                        triggers its confirmation and welcome
                                        sequence. 201 added, 200 already on it.

   Step 2 alone is not enough: "The subscriber being added to the form must
   already exist" — so calling it on a first-time address fails. That is the
   normal case for a sign-up form, so both calls are required.

   Both steps treat 200 and 201 alike: the reader is on the list either way,
   and someone re-subscribing should not be shown an error.

   Docs: https://developers.kit.com/api-reference/subscribers/create-a-subscriber
         https://developers.kit.com/api-reference/forms/add-subscriber-to-form-by-email-address
   ----------------------------------------------------------------------- */
async function subscribeToKit(env, email, referrer) {
  const headers = {
    "X-Kit-Api-Key": env.KIT_API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  /* 1. The person. A 422 here is Kit rejecting the address itself. */
  const created = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: email }),
  });

  if (!created.ok) {
    return { ok: false, status: created.status, step: "create" };
  }

  /* 2. The form. This is what actually sends them anything. */
  const added = await fetch(
    `https://api.kit.com/v4/forms/${encodeURIComponent(env.KIT_FORM_ID)}/subscribers`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(
        referrer ? { email_address: email, referrer } : { email_address: email },
      ),
    },
  );

  if (!added.ok) {
    return { ok: false, status: added.status, step: "form" };
  }

  return { ok: true, status: added.status };
}

/* --------------------------------------------------------------------------
   Reading the body. The script sends FormData; a browser without JavaScript
   sends url-encoded. Accept JSON too, so the endpoint is usable directly.
   ----------------------------------------------------------------------- */
async function readFields(request) {
  const type = request.headers.get("Content-Type") || "";

  if (type.includes("application/json")) {
    const body = await request.json();
    return {
      email: typeof body.email === "string" ? body.email : "",
      company: typeof body.company === "string" ? body.company : "",
    };
  }

  const form = await request.formData();
  return {
    email: String(form.get("email") || ""),
    company: String(form.get("company") || ""),
  };
}

/* --------------------------------------------------------------------------
   One answer, two shapes. The script asks for JSON and stays on the page;
   a plain form post gets a redirect to a real page that says the same thing.
   ----------------------------------------------------------------------- */
function respond(request, status, ok, message) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");

  if (wantsJson) {
    return new Response(JSON.stringify({ ok, message }), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: ok ? THANK_YOU : SORRY,
      "Cache-Control": "no-store",
    },
  });
}
