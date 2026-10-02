(function () {
  "use strict";

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ! footer year + "Last login" line
  var year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }
  var lastLogin = document.getElementById('last-login');
  if (lastLogin) {
    lastLogin.textContent = new Date().toString().split(' GMT')[0];
  }

  // ! type each section's command when it scrolls into view, then show its output
  // The <head> script adds .reveal-ready only when this can run, so content
  // stays visible for reduced-motion users and browsers without IntersectionObserver.
  function typeCommand(block) {
    var target = block.querySelector('.cmd-text');
    var text = target.textContent;
    var caret = document.createElement('span');
    caret.className = 'caret';
    var i = 0;

    target.textContent = '';
    target.after(caret);
    block.classList.add('is-typing');

    (function next() {
      if (i < text.length) {
        target.textContent += text[i++];
        setTimeout(next, 45 + Math.random() * 40);
      } else {
        setTimeout(function () {
          caret.remove();
          block.classList.remove('is-typing');
          block.classList.add('is-done');
        }, 180);
      }
    })();
  }

  var blocks = document.querySelectorAll('.block');

  if (document.documentElement.classList.contains('reveal-ready')) {
    var typer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          typer.unobserve(entry.target);
          typeCommand(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -15% 0px' });

    for (var b = 0; b < blocks.length; b++) {
      if (blocks[b].querySelector('.cmd-text')) {
        typer.observe(blocks[b]);
      }
    }
  }

  // ! title bar + sidebar: highlight the current section and show its path
  // The current section is the one whose top most recently scrolled past 40% of the
  // screen. Works in both layouts: in the simple view the intro is a sticky sidebar
  // and the shell is hidden, so both are skipped.
  var title = document.getElementById('titlebar-title');
  var tabs = document.querySelectorAll('.titlebar-tabs a, .side-nav a');
  var currentId = null;

  function updateCurrentSection() {
    var simple = document.documentElement.getAttribute('data-view') === 'simple';
    var threshold = window.innerHeight * 0.4;
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    var current = null;
    var currentTop = -Infinity;
    var topmost = null;
    var lowest = null;

    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      if ((simple && block.id === 'home') || !block.getClientRects().length) {
        continue;
      }
      var top = block.getBoundingClientRect().top;
      if (!topmost || top < topmost.getBoundingClientRect().top) {
        topmost = block;
      }
      if (!lowest || top > lowest.getBoundingClientRect().top) {
        lowest = block;
      }
      if (top <= threshold && top > currentTop) {
        current = block;
        currentTop = top;
      }
    }
    if (atBottom && lowest) {
      current = lowest;
    }
    current = current || topmost;

    if (!current || current.id === currentId) {
      return;
    }
    currentId = current.id;
    if (title) {
      title.textContent = 'visitor@nasib: ' + current.getAttribute('data-path');
    }
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].classList.toggle('is-active', tabs[t].getAttribute('href') === '#' + currentId);
    }
  }

  // Used by view.js to keep the visitor on the same section when switching layouts.
  window.siteCurrentSection = function () {
    return currentId;
  };

  document.addEventListener('viewchange', function () {
    currentId = null;
    updateCurrentSection();
  });

  var spyQueued = false;
  window.addEventListener('scroll', function () {
    if (!spyQueued) {
      spyQueued = true;
      requestAnimationFrame(function () {
        spyQueued = false;
        updateCurrentSection();
      });
    }
  }, { passive: true });
  window.addEventListener('resize', updateCurrentSection);
  updateCurrentSection();

  // ! clickable skills -> highlight projects that use them
  var projectsSection = document.getElementById('projects');
  var filterStatus = document.getElementById('project-filter');
  var skills = document.querySelectorAll('#skills .skill');
  var cards = document.querySelectorAll('#projects .project-card:not(.project-more)');

  if (!projectsSection || !filterStatus || !skills.length) {
    return;
  }

  // "React.js" and "React" should match, as should "Redux / Redux Toolkit" and "Redux Toolkit"
  function normalize(name) {
    return name.toLowerCase().replace(/\.js\b/g, '').replace(/[^a-z0-9]/g, '');
  }

  function aliases(label) {
    return label.split('/').map(normalize).filter(Boolean);
  }

  var activeButton = null;
  var lastFilter = null;

  // The filter message reads like a grep in the terminal view and like plain text in the simple view.
  function describeFilter() {
    if (!lastFilter) {
      return;
    }
    var label = lastFilter.label;
    var matches = lastFilter.matches;
    var simple = document.documentElement.getAttribute('data-view') === 'simple';
    var text;
    if (simple) {
      text = matches
        ? 'Showing ' + matches + (matches === 1 ? ' project' : ' projects') + ' built with ' + label
        : 'No project here uses ' + label + ' yet. More on GitHub.';
    } else {
      text = '$ grep -l "' + label + '" ~/projects/*  → ' +
        (matches ? matches + (matches === 1 ? ' match' : ' matches') : 'no matches yet, see GitHub');
    }
    filterStatus.querySelector('.project-filter-text').textContent = text;
  }

  document.addEventListener('viewchange', describeFilter);

  function clearFilter() {
    if (activeButton) {
      activeButton.setAttribute('aria-pressed', 'false');
      activeButton = null;
    }
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove('is-match', 'is-dimmed');
    }
    filterStatus.hidden = true;
  }

  function applyFilter(button) {
    var label = button.textContent.trim();
    var wanted = aliases(label);
    var matches = 0;

    clearFilter();
    activeButton = button;
    button.setAttribute('aria-pressed', 'true');

    for (var i = 0; i < cards.length; i++) {
      var tags = cards[i].querySelectorAll('.tag');
      var hit = false;
      for (var j = 0; j < tags.length; j++) {
        if (wanted.indexOf(normalize(tags[j].textContent)) !== -1) {
          hit = true;
          break;
        }
      }
      cards[i].classList.add(hit ? 'is-match' : 'is-dimmed');
      if (hit) {
        matches++;
      }
    }

    lastFilter = { label: label, matches: matches };
    describeFilter();
    if (!matches) {
      for (var k = 0; k < cards.length; k++) {
        cards[k].classList.remove('is-dimmed');
      }
    }
    filterStatus.hidden = false;

    projectsSection.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  for (var n = 0; n < skills.length; n++) {
    var skill = skills[n];
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'skill-btn';
    button.textContent = skill.textContent.trim();
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Show projects built with ' + button.textContent;
    skill.textContent = '';
    skill.appendChild(button);

    button.addEventListener('click', function (event) {
      var target = event.currentTarget;
      if (target === activeButton) {
        clearFilter();
      } else {
        applyFilter(target);
      }
    });
  }

  var hint = document.getElementById('skills-hint');
  if (hint) {
    hint.hidden = false;
  }

  filterStatus.querySelector('.project-filter-clear').addEventListener('click', clearFilter);

})();
