// Light / dark theme. Loaded in <head> so the right theme is set before the first paint.
// Follows the OS setting until the visitor picks a theme; their choice is remembered.
(function () {
  "use strict";

  var KEY = 'theme';
  var root = document.documentElement;
  var prefersLight = window.matchMedia('(prefers-color-scheme: light)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function stored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function store(theme) {
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {
      // storage unavailable (private mode etc.): the choice lasts until the page is closed
    }
  }

  function get() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function apply(theme) {
    var other = theme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f6f7f3' : '#0b0f0d');
    }

    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-label', 'Switch to ' + other + ' theme');
      buttons[i].title = 'Switch to ' + other + ' theme';
      buttons[i].querySelector('.theme-value').textContent = theme;
    }
  }

  // Briefly animate colours so the switch feels like the screen re-rendering, not a jump.
  function set(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      theme = get() === 'light' ? 'dark' : 'light';
    }
    if (!reduceMotion) {
      root.classList.add('theme-switching');
      setTimeout(function () {
        root.classList.remove('theme-switching');
      }, 400);
    }
    apply(theme);
    store(theme);
    return theme;
  }

  apply(stored() || (prefersLight.matches ? 'light' : 'dark'));

  function followSystem(event) {
    if (!stored()) {
      apply(event.matches ? 'light' : 'dark');
    }
  }

  if (prefersLight.addEventListener) {
    prefersLight.addEventListener('change', followSystem);
  } else if (prefersLight.addListener) {
    prefersLight.addListener(followSystem);
  }

  // Used by the shell's "theme" command.
  window.siteTheme = { get: get, set: set };

  document.addEventListener('DOMContentLoaded', function () {
    apply(get());
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].hidden = false;
      buttons[i].addEventListener('click', function () {
        set();
      });
    }
  });

})();
