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

      /* A collapsed panel is still in the document, so without this its links
         stay tabbable and stay in the accessibility tree while invisible. */
      if (open) panel.removeAttribute("inert");
      else panel.setAttribute("inert", "");

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

  /* ------------------------------------------------------------------------
     7. Search.

     The whole site is a few dozen entries, so /search.json is fetched once on
     the first open and filtered in memory. No index library, no service, no
     request per keystroke.

     The control is hidden until this file runs (see the .js gate in the
     stylesheet), so nothing offers a search that cannot happen.
     --------------------------------------------------------------------- */
  function initSearch() {
    var dialog = document.querySelector("[data-search]");
    var openers = document.querySelectorAll("[data-search-open]");
    if (!dialog || !openers.length || typeof dialog.showModal !== "function") return;

    var input = dialog.querySelector("[data-search-input]");
    var results = dialog.querySelector("[data-search-results]");
    var closer = dialog.querySelector("[data-search-close]");
    var form = dialog.querySelector("[data-search-form]");

    var index = null;
    var loading = false;
    var active = -1;

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    /* Marks the matched run in already-escaped text. */
    function mark(text, query) {
      var safe = escapeHtml(text);
      var at = safe.toLowerCase().indexOf(query);
      if (at < 0) return safe;
      return (
        safe.slice(0, at) +
        "<mark>" +
        safe.slice(at, at + query.length) +
        "</mark>" +
        safe.slice(at + query.length)
      );
    }

    function show(html) {
      results.innerHTML = html;
      active = -1;
    }

    function hits() {
      return results.querySelectorAll(".search__hit");
    }

    function render(query) {
      if (!query) {
        show('<p class="search__hint">Stories, places, objects and pages.</p>');
        return;
      }
      if (!index) {
        show('<p class="search__hint">Loading…</p>');
        return;
      }

      var q = query.toLowerCase();

      var found = index
        .filter(function (e) {
          return (
            e.title.toLowerCase().indexOf(q) > -1 ||
            e.dek.toLowerCase().indexOf(q) > -1 ||
            String(e.kind).toLowerCase().indexOf(q) > -1
          );
        })
        /* A title match is what someone meant; a body match is a maybe. */
        .sort(function (a, b) {
          var at = a.title.toLowerCase().indexOf(q) > -1 ? 0 : 1;
          var bt = b.title.toLowerCase().indexOf(q) > -1 ? 0 : 1;
          return at - bt;
        })
        .slice(0, 8);

      if (!found.length) {
        show(
          '<p class="search__empty">Nothing for “' +
            escapeHtml(query) +
            '”. Try a place, a section, or part of a title.</p>'
        );
        return;
      }

      show(
        found
          .map(function (e) {
            return (
              '<a class="search__hit" href="' +
              escapeHtml(e.url) +
              '"><span class="search__kind">' +
              escapeHtml(e.kind) +
              '</span><span class="search__title">' +
              mark(e.title, q) +
              '</span><span class="search__dek">' +
              mark(e.dek, q) +
              "</span></a>"
            );
          })
          .join("")
      );
    }

    function load() {
      if (index || loading) return;
      loading = true;

      fetch("/search.json")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          index = data;
          render(input.value.trim());
        })
        .catch(function () {
          show('<p class="search__empty">Search is unavailable just now.</p>');
        })
        .then(function () { loading = false; });
    }

    function open() {
      if (dialog.open) return;
      dialog.showModal();
      load();
      render(input.value.trim());
      input.focus();
      input.select();
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    /* Arrow keys walk the results; Enter follows the highlighted one. */
    function move(step) {
      var list = hits();
      if (!list.length) return;

      active = (active + step + list.length) % list.length;

      Array.prototype.forEach.call(list, function (el, i) {
        if (i === active) el.setAttribute("data-active", "true");
        else el.removeAttribute("data-active");
      });

      list[active].scrollIntoView({ block: "nearest" });
    }

    Array.prototype.forEach.call(openers, function (b) {
      b.addEventListener("click", open);
    });
    if (closer) closer.addEventListener("click", close);

    /* method="dialog" would close on Enter, which is the opposite of what a
       search box should do. */
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); });

    input.addEventListener("input", function () {
      render(input.value.trim());
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") {
        var list = hits();
        var target = active > -1 ? list[active] : list[0];
        if (target) { e.preventDefault(); window.location.href = target.href; }
      }
    });

    /* Clicking the backdrop is a click on the dialog itself. */
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) close();
    });

    /* "/" the way every reader-facing site does it, and Cmd/Ctrl-K for the
       people who expect that instead. Neither steals a keystroke from someone
       who is actually typing. */
    document.addEventListener("keydown", function (e) {
      var el = document.activeElement;
      var typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);

      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open();
      } else if (e.key === "/" && !typing && !dialog.open) {
        e.preventDefault();
        open();
      }
    });

    render("");
  }

  function init() {
    initNav();
    initReveal();
    initLetterMemory();
    initSubscribe();
    initYear();
    initShop();
    initSearch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
