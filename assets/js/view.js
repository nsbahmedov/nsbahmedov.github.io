// Terminal / simple layout. Loaded in <head> so the right layout is set before the first paint.
// Terminal is the default; the visitor's choice is remembered, and ?view=simple
// (or ?view=terminal) opens a specific layout without changing their saved choice.
(function () {
  "use strict";

  var KEY = 'view';
  var VIEWS = ['terminal', 'simple'];
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function store(view) {
    try {
      localStorage.setItem(KEY, view);
    } catch (e) {
      // storage unavailable: the choice lasts until the page is closed
    }
  }

  function fromUrl() {
    try {
      return new URLSearchParams(window.location.search).get('view');
    } catch (e) {
      return null;
    }
  }

  function get() {
    return root.getAttribute('data-view') === 'simple' ? 'simple' : 'terminal';
  }

  function apply(view) {
    root.setAttribute('data-view', view);
    var buttons = document.querySelectorAll('[data-view-btn]');
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute('data-view-btn') === view;
      if (buttons[i].hasAttribute('aria-pressed')) {
        buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
    document.dispatchEvent(new CustomEvent('viewchange', { detail: { view: view } }));
  }

  // Switch layouts, keeping the visitor on the section they were reading.
  function set(view, after) {
    if (VIEWS.indexOf(view) === -1) {
      view = get() === 'simple' ? 'terminal' : 'simple';
    }
    store(view);

    // keep a shared ?view= link in sync with what is on screen
    if (fromUrl()) {
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('view', view);
        history.replaceState(null, '', url);
      } catch (e) {
        // old browser: leave the URL alone
      }
    }

    var sectionId = window.siteCurrentSection ? window.siteCurrentSection() : null;

    function update() {
      apply(view);
      var section = sectionId && sectionId !== 'home' && document.getElementById(sectionId);
      if (section && section.getClientRects().length) {
        section.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
      if (after) {
        after();
      }
    }

    if (document.startViewTransition && !reduceMotion) {
      document.startViewTransition(update);
    } else {
      update();
    }
    return view;
  }

  var initial = fromUrl();
  if (VIEWS.indexOf(initial) === -1) {
    initial = stored();
  }
  root.setAttribute('data-view', VIEWS.indexOf(initial) === -1 ? 'terminal' : initial);

  // Used by the shell's "view" command.
  window.siteView = { get: get, set: set };

  document.addEventListener('DOMContentLoaded', function () {
    apply(get());
    var buttons = document.querySelectorAll('[data-view-btn]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].hidden = false;
      buttons[i].addEventListener('click', function (event) {
        var wanted = event.currentTarget.getAttribute('data-view-btn');
        if (wanted !== get()) {
          set(wanted);
        }
      });
    }
    var groups = document.querySelectorAll('.view-switch, .view-hint');
    for (var j = 0; j < groups.length; j++) {
      groups[j].hidden = false;
    }
  });

})();
