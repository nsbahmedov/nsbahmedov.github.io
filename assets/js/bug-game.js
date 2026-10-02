(function () {
  "use strict";

  var DURATION = 30; // seconds
  var BEST_KEY = 'bug-squash-best';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var arena = document.getElementById('bug-arena');
  var overlay = document.getElementById('bug-overlay');
  var message = document.getElementById('bug-message');
  var startButton = document.getElementById('bug-start');
  var scoreEl = document.getElementById('bug-score');
  var timeEl = document.getElementById('bug-time');
  var bestEl = document.getElementById('bug-best');

  var BUG_SVG =
    '<svg viewBox="0 0 40 40" aria-hidden="true">' +
    '<path d="M9 14l6 4M8 22h7M9 30l6-4M31 14l-6 4M32 22h-7M31 30l-6-4M16 6l2.5 5M24 6l-2.5 5" ' +
    'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
    '<circle cx="20" cy="13" r="4.5" fill="currentColor"/>' +
    '<ellipse cx="20" cy="24" rx="8" ry="10" fill="currentColor"/>' +
    '<path d="M20 15v19" stroke="#000" stroke-width="1.5"/>' +
    '</svg>';

  var RANKS = [
    [30, 'Principal Exterminator. Seriously, you should be hiring.'],
    [20, 'Senior Bug Slayer. Production is safe with you.'],
    [12, 'Mid-level Bug Hunter. Solid debugging skills.'],
    [5, 'Junior Debugger. Keep practicing!'],
    [0, 'Intern. The bugs won this round. 🐞']
  ];

  var score = 0;
  var timeLeft = 0;
  var running = false;
  var clockTimer = null;
  var spawnTimer = null;

  function readBest() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch (e) {
      // storage unavailable (private mode etc.): best score just isn't remembered
    }
  }

  var best = readBest();
  bestEl.textContent = best;

  function randomPosition(size) {
    return {
      x: Math.random() * (arena.clientWidth - size),
      y: Math.random() * (arena.clientHeight - size)
    };
  }

  // Bugs get faster and appear more often as the clock runs down.
  function progress() {
    return 1 - timeLeft / DURATION;
  }

  function spawnBug() {
    if (!running) {
      return;
    }

    var golden = Math.random() < 0.1;
    var lifetime = (golden ? 1100 : 2200) - progress() * 900;
    var size = arena.clientWidth < 500 ? 48 : 56;

    var bug = document.createElement('button');
    bug.type = 'button';
    bug.className = 'bug' + (golden ? ' bug-golden' : '');
    bug.setAttribute('aria-label', golden ? 'Golden bug, worth 3 points' : 'Bug');
    bug.innerHTML = BUG_SVG;
    bug.style.width = bug.style.height = size + 'px';

    var from = randomPosition(size);
    var to = randomPosition(size);
    var angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI + 90;
    bug.style.transform = 'translate(' + from.x + 'px, ' + from.y + 'px)';
    bug.firstChild.style.transform = 'rotate(' + angle + 'deg)';
    arena.appendChild(bug);

    if (!reduceMotion) {
      // Next frame, so the browser animates from the start point to the end point.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bug.style.transitionDuration = lifetime + 'ms';
          bug.style.transform = 'translate(' + to.x + 'px, ' + to.y + 'px)';
        });
      });
    }

    var escape = setTimeout(function () {
      bug.remove();
    }, lifetime);

    bug.addEventListener('click', function () {
      if (!running || bug.classList.contains('is-squashed')) {
        return;
      }
      clearTimeout(escape);
      score += golden ? 3 : 1;
      scoreEl.textContent = score;

      // Freeze the bug where it was hit, then play the splat.
      var box = bug.getBoundingClientRect();
      var area = arena.getBoundingClientRect();
      bug.style.transitionDuration = '0ms';
      bug.style.transform = 'translate(' + (box.left - area.left - arena.clientLeft) + 'px, ' +
        (box.top - area.top - arena.clientTop) + 'px)';
      bug.classList.add('is-squashed');
      bug.setAttribute('aria-hidden', 'true');
      showPoints(box, area, golden ? '+3' : '+1');
      setTimeout(function () { bug.remove(); }, 400);
    });

    var delay = 850 - progress() * 450;
    spawnTimer = setTimeout(spawnBug, delay);
  }

  function showPoints(box, area, text) {
    var points = document.createElement('span');
    points.className = 'bug-points';
    points.textContent = text;
    points.style.left = (box.left - area.left + box.width / 2) + 'px';
    points.style.top = (box.top - area.top) + 'px';
    arena.appendChild(points);
    setTimeout(function () { points.remove(); }, 700);
  }

  function clearBugs() {
    var leftovers = arena.querySelectorAll('.bug, .bug-points');
    for (var i = 0; i < leftovers.length; i++) {
      leftovers[i].remove();
    }
  }

  function start() {
    clearBugs();
    score = 0;
    timeLeft = DURATION;
    running = true;
    scoreEl.textContent = score;
    timeEl.textContent = timeLeft;
    overlay.hidden = true;
    arena.focus();

    clockTimer = setInterval(function () {
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        end();
      }
    }, 1000);
    spawnBug();
  }

  function end() {
    running = false;
    clearInterval(clockTimer);
    clearTimeout(spawnTimer);
    clearBugs();

    var rank = RANKS.filter(function (r) { return score >= r[0]; })[0][1];
    var text = 'You squashed ' + score + (score === 1 ? ' bug. ' : ' bugs. ') + rank;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      saveBest(best);
      text = 'New best! ' + text;
    }
    message.textContent = text;
    startButton.textContent = 'Play again';
    overlay.hidden = false;
    startButton.focus();
  }

  // Stop the round if the visitor switches tabs, so the timer doesn't run out unseen.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && running) {
      end();
    }
  });

  startButton.addEventListener('click', start);

})();
