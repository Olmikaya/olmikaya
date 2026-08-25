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
     4. Newsletter form — deliberately not wired.
     There is no mailing provider connected yet. Rather than let the form
     submit to nowhere and reload the page, we stop it and say plainly that
     it is not connected. We never show a success state for something that
     did not happen. Replace this whole function when a provider is added;
     see README.md.
     --------------------------------------------------------------------- */
  function initSubscribe() {
    var forms = document.querySelectorAll("[data-subscribe]");

    Array.prototype.forEach.call(forms, function (form) {
      var status = form.parentNode.querySelector("[data-subscribe-status]");

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!status) return;
        status.textContent =
          "This form is not connected to a mailing provider yet, so nothing " +
          "was sent. Connect one in assets/js/olmikaya.js — see README.md.";
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

  function init() {
    initNav();
    initReveal();
    initSubscribe();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
