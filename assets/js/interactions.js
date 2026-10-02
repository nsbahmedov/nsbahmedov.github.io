(function () {
  "use strict";

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ! scroll reveal
  // The <head> script adds .reveal-ready only when this can run, so content
  // stays visible for reduced-motion users and browsers without IntersectionObserver.
  if (document.documentElement.classList.contains('reveal-ready')) {
    var targets = document.querySelectorAll('.reveal, .reveal-stagger');

    for (var i = 0; i < targets.length; i++) {
      if (targets[i].classList.contains('reveal-stagger')) {
        var children = targets[i].children;
        for (var j = 0; j < children.length; j++) {
          children[j].style.setProperty('--i', j);
        }
      }
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    for (var k = 0; k < targets.length; k++) {
      observer.observe(targets[k]);
    }
  }

  // ! clickable skills -> highlight projects that use them
  var projectsSection = document.getElementById('projects');
  var filterStatus = document.getElementById('project-filter');
  var skillTags = document.querySelectorAll('#skills .tag-list .tag');
  var cards = document.querySelectorAll('#projects .project-card');

  if (!projectsSection || !filterStatus || !skillTags.length) {
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

  function clearFilter() {
    if (activeButton) {
      activeButton.setAttribute('aria-pressed', 'false');
      activeButton = null;
    }
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove('is-match', 'is-dimmed');
    }
    projectsSection.classList.remove('is-filtered');
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

    var text = filterStatus.querySelector('.project-filter-text');
    if (matches) {
      projectsSection.classList.add('is-filtered');
      text.textContent = 'Projects built with ' + label + ': ' + matches;
    } else {
      for (var k = 0; k < cards.length; k++) {
        cards[k].classList.remove('is-dimmed');
      }
      text.textContent = 'No project here uses ' + label + ' yet. More on GitHub.';
    }
    filterStatus.hidden = false;

    projectsSection.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  for (var s = 0; s < skillTags.length; s++) {
    var tag = skillTags[s];
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-btn';
    button.textContent = tag.textContent.trim();
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Show projects built with ' + button.textContent;
    tag.textContent = '';
    tag.classList.add('tag-clickable');
    tag.appendChild(button);

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
