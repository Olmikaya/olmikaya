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
const CONFIRMED = "/letter/confirmed/";

/* The Kit form uses double opt-in, so at this point the address is pending,
   not subscribed. Saying "you are on the list" here would be a quarter of a
   lie — they are on it once they click the link in the confirmation email.
   The honeypot answers with this too, so a bot cannot tell the paths apart. */
const CONFIRM_MESSAGE =
  "Almost — check your email and click to confirm. Nothing is sent until you do.";

/* Signed up before and never confirmed. Adding them to the form again makes
   Kit send the confirmation again, which is the only way back: Kit has no
   manual resend and nobody can confirm on a reader's behalf. */
const AGAIN_MESSAGE =
  "You signed up before but never confirmed. We have sent the confirmation again — check your email.";

/* Already confirmed. Telling this person to check their email would send them
   looking for something that is never coming. */
const ALREADY_MESSAGE =
  "You are already on the list. Nothing more to do.";

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

  const email = (fields.email || "").trim().toLowerCase();
  const trap = (fields.trap || "").trim().toLowerCase();

  /* Honeypot. A bot fills every field it can see; a person never sees this
     one. Answer exactly as we would on success so the bot learns nothing,
     and tell the provider nothing.

     The exception matters more than the rule: password managers and browser
     autofill routinely ignore autocomplete="off" and put the SAME address
     into every text input they find. Discarding those would silently throw
     away real sign-ups from exactly the people most likely to use a manager.
     A trap that only echoes the address is autofill, not a bot. */
  if (trap && trap !== email) {
    return respond(request, 200, true, CONFIRM_MESSAGE, "pending");
  }

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

  /* Kit records where a sign-up came from, if we can tell it. */
  const referrer = request.headers.get("Referer") || undefined;

  try {
    /* Look first. Someone signing up a second time is the common case — they
       lost the confirmation email, or forgot they had already done it — and
       each of the three answers needs different handling. */
    const existing = await findSubscriber(env, email);

    /* Confirmed already. Nothing to do, and nothing to send. */
    if (existing && existing.state === "active") {
      return respond(request, 200, true, ALREADY_MESSAGE, "subscribed");
    }

    /* Not known to Kit at all. Create them INACTIVE — the default is active,
       which would mark them mailable and billable before they had agreed to
       anything. The form's confirmation is what promotes them. */
    if (!existing) {
      const created = await createSubscriber(env, email);

      if (!created.ok) {
        if (created.status === 422) {
          return respond(
            request,
            400,
            false,
            "That address was not accepted. Check it and try again.",
          );
        }
        return respond(request, 502, false, PROVIDER_DOWN);
      }
    }

    /* Adding to the form is what sends the confirmation email — for a new
       sign-up and for an unconfirmed one alike. Anyone not `active` lands
       here, including someone who unsubscribed and has come back, which is a
       fresh opt-in and correctly asks them to confirm again. */
    const added = await addToForm(env, email, referrer);

    if (!added.ok) {
      return respond(request, 502, false, PROVIDER_DOWN);
    }

    return respond(
      request,
      200,
      true,
      existing ? AGAIN_MESSAGE : CONFIRM_MESSAGE,
      "pending",
    );
  } catch {
    return respond(request, 502, false, PROVIDER_DOWN);
  }
}

const PROVIDER_DOWN =
  "The sign-up service did not answer. Try again in a moment.";

/* Anything that is not a POST. */
export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return new Response("Method not allowed", {
    status: 405,
    headers: { Allow: "POST", "Content-Type": "text/plain; charset=utf-8" },
  });
}

/* --------------------------------------------------------------------------
   The provider. The only Kit-aware code in the file.

   Three calls, used as needed:

     GET  /v4/subscribers?email_address=…&status=all   who is this already?
     POST /v4/subscribers                              create, INACTIVE
     POST /v4/forms/{id}/subscribers                   send the confirmation

   Two things about Kit that are easy to get wrong and expensive to miss:

   1. The list filter defaults to status=active. Without status=all an
      unconfirmed subscriber looks like a stranger, so they would be created
      again on every attempt.

   2. Creating a subscriber defaults to state "active". Kit only emails and
      only bills for CONFIRMED subscribers, so creating people active is the
      wrong side of the double opt-in the form is configured for. We create
      them inactive and let the form's confirmation promote them.

   Docs: https://developers.kit.com/api-reference/subscribers/list-subscribers
         https://developers.kit.com/api-reference/subscribers/create-a-subscriber
         https://developers.kit.com/api-reference/forms/add-subscriber-to-form-by-email-address
   ----------------------------------------------------------------------- */

const KIT = "https://api.kit.com/v4";

function kitHeaders(env) {
  return {
    "X-Kit-Api-Key": env.KIT_API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/* Returns the subscriber, or undefined if Kit has never seen this address.
   A failed lookup also returns undefined: not knowing is not a reason to turn
   a reader away, and the paths below are safe to run either way. */
async function findSubscriber(env, email) {
  const url =
    `${KIT}/subscribers?email_address=${encodeURIComponent(email)}&status=all`;

  const res = await fetch(url, { headers: kitHeaders(env) });
  if (!res.ok) return undefined;

  const body = await res.json().catch(() => null);
  const list = body && Array.isArray(body.subscribers) ? body.subscribers : [];

  /* Filtering by address should return one, but match on it rather than
     trusting position. */
  return list.find(
    (s) => String(s.email_address || "").toLowerCase() === email,
  );
}

async function createSubscriber(env, email) {
  const res = await fetch(`${KIT}/subscribers`, {
    method: "POST",
    headers: kitHeaders(env),
    body: JSON.stringify({ email_address: email, state: "inactive" }),
  });

  return { ok: res.ok, status: res.status };
}

async function addToForm(env, email, referrer) {
  const res = await fetch(
    `${KIT}/forms/${encodeURIComponent(env.KIT_FORM_ID)}/subscribers`,
    {
      method: "POST",
      headers: kitHeaders(env),
      body: JSON.stringify(
        referrer ? { email_address: email, referrer } : { email_address: email },
      ),
    },
  );

  return { ok: res.ok, status: res.status };
}

/* --------------------------------------------------------------------------
   Reading the body. The script sends FormData; a browser without JavaScript
   sends url-encoded. Accept JSON too, so the endpoint is usable directly.
   ----------------------------------------------------------------------- */
async function readFields(request) {
  const type = request.headers.get("Content-Type") || "";

  /* The trap field was renamed from `company`; both are read so a page
     cached from before the rename still submits something the endpoint
     understands. */
  if (type.includes("application/json")) {
    const body = await request.json();
    return {
      email: typeof body.email === "string" ? body.email : "",
      trap: String(body["olmi-check"] || body.company || ""),
    };
  }

  const form = await request.formData();
  return {
    email: String(form.get("email") || ""),
    trap: String(form.get("olmi-check") || form.get("company") || ""),
  };
}

/* --------------------------------------------------------------------------
   One answer, two shapes. The script asks for JSON and stays on the page;
   a plain form post gets a redirect to a real page that says the same thing.
   ----------------------------------------------------------------------- */
function respond(request, status, ok, message, state) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");

  if (wantsJson) {
    return new Response(JSON.stringify({ ok, message, state }), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  /* Without JavaScript the reader gets a page instead of a message. Someone
     already confirmed goes to the confirmed page, not to one telling them to
     check an inbox for an email that is not coming. */
  let location = SORRY;
  if (ok) location = state === "subscribed" ? CONFIRMED : THANK_YOU;

  return new Response(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}
