/* ==========================================================================
   OLMIKAYA — progressive enhancement only.
   Every page must work fully with this file absent or blocked.
   No dependencies. No framework. Three jobs, nothing more.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     1. Mark that JS is running.
     This must happen first and synchronously. The reveal animation's hidden
     state is scoped to .js in the stylesheet, so if this line never runs the
     content simply stays visible. That is the intended no-JS behaviour.
     --------------------------------------------------------------------- */
  var root = document.documentElement;
  root.classList.add("js");

  /* ------------------------------------------------------------------------
     2. Mobile navigation toggle.
     --------------------------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var panel = document.getElementById("nav-panel");
    if (!toggle || !panel) return;

    function setOpen(open) {
      panel.setAttribute("data-open", open ? "true" : "false");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      var label = toggle.querySelector("[data-nav-label]");
      if (label) label.textContent = open ? "Close" : "Menu";
    }

    setOpen(false);

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Escape closes the panel and returns focus to the control.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    // Leaving mobile width should not strand the panel open.
    var wide = window.matchMedia("(min-width: 60rem)");
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener("change", onChange);
    else if (wide.addListener) wide.addListener(onChange);
  }

  /* ------------------------------------------------------------------------
     3. Reveal on scroll.
     Skipped entirely when the reader prefers reduced motion, or when
     IntersectionObserver is unavailable — in both cases everything is
     revealed immediately rather than left hidden.
     --------------------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !("IntersectionObserver" in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add("is-visible");
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------------
     3b. What this browser remembers about the letter.

     Not identity, and not a claim about who the visitor is — the site has no
     accounts and no way to know. It is a note this browser left itself, so a
     reader who has already signed up is not pitched at forever. The panels
     that use it say as much, and offer a way to clear it.

     Two states: "pending" once an address is submitted, "confirmed" once the
     link in Kit's confirmation email is followed to /letter/confirmed/.
     --------------------------------------------------------------------- */
  var LETTER_KEY = "olmikaya.letter";

  /* Private browsing and blocked storage both throw. Everything here degrades
     to the plain sign-up form, which is the correct fallback. */
  function letterState() {
    try {
      return window.localStorage.getItem(LETTER_KEY);
    } catch (e) {
      return null;
    }
  }

  function setLetterState(state) {
    try {
      if (state) window.localStorage.setItem(LETTER_KEY, state);
      else window.localStorage.removeItem(LETTER_KEY);
    } catch (e) {
      /* Nothing to do. The form still works; it just will not be remembered. */
    }
    showLetterState();
  }

  function showLetterState() {
    var state = letterState();
    var blocks = document.querySelectorAll("[data-letter]");

    Array.prototype.forEach.call(blocks, function (block) {
      var offer = block.querySelector("[data-letter-offer]");
      var known = block.querySelector('[data-letter-state="' + state + '"]');
      var panels = block.querySelectorAll("[data-letter-state]");

      Array.prototype.forEach.call(panels, function (p) { p.hidden = true; });

      if (known) {
        if (offer) offer.hidden = true;
        known.hidden = false;
      } else if (offer) {
        offer.hidden = false;
      }
    });
  }

  function initLetterMemory() {
    /* /letter/confirmed/ is only reachable by following the link in the
       confirmation email, so arriving there is the confirmation. */
    if (document.querySelector("[data-letter-confirmed]")) {
      setLetterState("confirmed");
      return;
    }

    showLetterState();

    var forgets = document.querySelectorAll("[data-letter-forget]");
    Array.prototype.forEach.call(forgets, function (button) {
      button.addEventListener("click", function () {
        setLetterState(null);
        var field = document.querySelector("[data-subscribe] [name=email]");
        if (field) field.focus();
      });
    });
  }

  /* ------------------------------------------------------------------------
     4. The letter sign-up.

     The form works without this function: it posts normally to
     /api/subscribe and the endpoint redirects to /letter/thank-you/. All
     this does is keep the reader on the page and report inline.

     The endpoint answers JSON when asked for it, so the only difference
     between the two paths is the Accept header.
     --------------------------------------------------------------------- */
  function initSubscribe() {
    var forms = document.querySelectorAll("[data-subscribe]");
    if (!forms.length || typeof window.fetch !== "function") return;

    Array.prototype.forEach.call(forms, function (form) {
      var status = form.parentNode.querySelector("[data-subscribe-status]");
      var button = form.querySelector("[data-subscribe-submit]");
      var busy = false;

      function say(message, kind) {
        if (!status) return;
        status.textContent = message;
        status.classList.remove("subscribe__status--ok");
        status.classList.remove("subscribe__status--error");
        if (kind) status.classList.add("subscribe__status--" + kind);
      }

      function setBusy(state) {
        busy = state;
        if (!button) return;
        button.setAttribute("aria-disabled", state ? "true" : "false");
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (busy) return;

        setBusy(true);
        say("Signing you up…");

        fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" }
        })
          .then(function (res) {
            return res.json().then(function (data) {
              return { ok: res.ok, data: data };
            });
          })
          .then(function (result) {
            if (result.ok && result.data && result.data.ok) {
              say(result.data.message || "You are on the list.", "ok");
              form.reset();
              /* The endpoint says which it was: "subscribed" for someone
                 already confirmed, "pending" for anyone who still has a
                 confirmation email to open. Swaps to the matching panel. */
              setLetterState(
                result.data.state === "subscribed" ? "confirmed" : "pending",
              );
            } else {
              say(
                (result.data && result.data.message) ||
                  "That did not go through. Try again in a moment.",
                "error"
              );
            }
          })
          .catch(function () {
            say(
              "That did not go through — check your connection and try again.",
              "error"
            );
          })
          .then(function () {
            setBusy(false);
          });
      });
    });
  }

  /* ------------------------------------------------------------------------
     5. Current year in the colophon.
     --------------------------------------------------------------------- */
  function initYear() {
    var nodes = document.querySelectorAll("[data-year]");
    var year = String(new Date().getFullYear());
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = year;
  }

  /* ------------------------------------------------------------------------
     6. Shop filtering and sorting.
     Runs only on a page carrying [data-shop]. The controls are hidden by CSS
     until html.js lands, so without this file every product is shown in
     curated order and there is nothing to click that does nothing.

     Sorting sets the CSS `order` property rather than moving nodes: the grid
     reorders visually, the DOM stays put, and nothing that has already been
     revealed is torn out and re-inserted.
     --------------------------------------------------------------------- */
  function initShop() {
    var bar = document.querySelector("[data-shop]");
    var grid = document.querySelector("[data-shop-grid]");
    if (!bar || !grid) return;

    var products = Array.prototype.slice.call(
      grid.querySelectorAll("[data-product]")
    );
    if (!products.length) return;

    var filters = bar.querySelectorAll("[data-shop-filter]");
    var sorter = bar.querySelector("[data-shop-sort]");
    var empty = document.querySelector("[data-shop-empty]");
    var kind = "all";

    function name(el) {
      return (el.getAttribute("data-name") || "").toLowerCase();
    }

    function apply() {
      var mode = sorter ? sorter.value : "order";
      var shown = 0;

      var ranked = products.slice();
      if (mode === "name-asc" || mode === "name-desc") {
        ranked.sort(function (a, b) {
          var cmp = name(a).localeCompare(name(b));
          return mode === "name-asc" ? cmp : -cmp;
        });
      } else {
        ranked.sort(function (a, b) {
          return (a.getAttribute("data-order") | 0) - (b.getAttribute("data-order") | 0);
        });
      }

      ranked.forEach(function (el, i) {
        var match = kind === "all" || el.getAttribute("data-kind") === kind;
        el.classList.toggle("is-filtered-out", !match);
        el.style.order = String(i);
        if (match) shown++;
      });

      if (empty) empty.hidden = shown > 0;
    }

    Array.prototype.forEach.call(filters, function (button) {
      button.addEventListener("click", function () {
        kind = button.getAttribute("data-shop-filter");

        Array.prototype.forEach.call(filters, function (other) {
          other.setAttribute("aria-pressed", other === button ? "true" : "false");
        });

        apply();
      });
    });

    if (sorter) sorter.addEventListener("change", apply);

    apply();
  }

  function init() {
    initNav();
    initReveal();
    initLetterMemory();
    initSubscribe();
    initYear();
    initShop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
