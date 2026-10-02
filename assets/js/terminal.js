(function () {
  "use strict";

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // On touch screens, focusing the input pops up the keyboard and hides the
  // clickable commands, so only focus it when the visitor taps the input.
  var touch = window.matchMedia('(pointer: coarse)').matches;
  var cvLink = document.getElementById('cv-link');

  var LINKS = {
    github: 'https://github.com/nsbahmedov',
    linkedin: 'https://linkedin.com/in/nasib-ahmadov-web',
    email: 'mailto:nsbahmedov@gmail.com',
    cv: cvLink ? cvLink.href : null
  };
  var SECTIONS = ['projects', 'about', 'skills', 'contact'];

  // ! build the terminal window
  var overlay = document.createElement('div');
  overlay.className = 'term-overlay';
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="term-window" role="dialog" aria-modal="true" aria-labelledby="term-title" tabindex="-1">' +
    '  <div class="term-bar">' +
    '    <span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '    <span class="term-title" id="term-title">visitor@nasib: ~</span>' +
    '    <button type="button" class="term-close" aria-label="Close terminal">&times;</button>' +
    '  </div>' +
    '  <div class="term-body">' +
    '    <div class="term-output" aria-live="polite"></div>' +
    '    <form class="term-line" autocomplete="off">' +
    '      <label class="term-prompt" for="term-input">visitor@nasib:~$</label>' +
    '      <input class="term-input" id="term-input" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send">' +
    '    </form>' +
    '  </div>' +
    '</div>';
  document.body.appendChild(overlay);

  var win = overlay.querySelector('.term-window');
  var body = overlay.querySelector('.term-body');
  var output = overlay.querySelector('.term-output');
  var form = overlay.querySelector('.term-line');
  var input = overlay.querySelector('.term-input');

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'term-launch';
  launcher.setAttribute('aria-label', 'Open terminal');
  launcher.title = 'Open terminal (press `)';
  launcher.textContent = '>_';
  document.body.appendChild(launcher);

  var history = [];
  var historyIndex = 0;
  var busy = false;
  var welcomed = false;
  var lastFocus = null;
  var stopMatrix = null;

  // ! output helpers
  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }

  // parts: strings, {text, href}, {cmd, text}, {em}, {muted}
  function line(parts, className) {
    var row = document.createElement('div');
    row.className = 'term-row' + (className ? ' ' + className : '');
    [].concat(parts).forEach(function (part) {
      var node;
      if (typeof part === 'string') {
        node = document.createTextNode(part);
      } else if (part.href) {
        node = document.createElement('a');
        node.href = part.href;
        node.textContent = part.text;
        if (/^https?:/.test(part.href)) {
          node.target = '_blank';
          node.rel = 'noopener';
        }
      } else if (part.cmd) {
        node = document.createElement('button');
        node.type = 'button';
        node.className = 'term-cmd';
        node.textContent = part.text || part.cmd;
        node.addEventListener('click', function () {
          submit(part.cmd, true);
        });
      } else {
        node = document.createElement('span');
        node.className = part.em ? 'term-em' : 'term-muted';
        node.textContent = part.em || part.muted;
      }
      row.appendChild(node);
    });
    output.appendChild(row);
    scrollToBottom();
    return row;
  }

  function blank() {
    line('');
  }

  function echoCommand(text) {
    line([{ em: 'visitor@nasib:~$ ' }, text], 'term-echo');
  }

  function cleanText(node) {
    return node.textContent.replace(/\s+/g, ' ').trim();
  }

  // Runs steps one after another with a delay, blocking input meanwhile.
  function sequence(steps, done) {
    busy = true;
    var i = 0;
    (function next() {
      if (i >= steps.length) {
        busy = false;
        if (done) {
          done();
        }
        return;
      }
      steps[i++]();
      setTimeout(next, reduceMotion ? 0 : 450);
    })();
  }

  // ! commands
  var COMMANDS = {
    help: {
      desc: 'list available commands',
      run: function () {
        Object.keys(COMMANDS).forEach(function (name) {
          if (COMMANDS[name].desc) {
            line([{ cmd: name }, { muted: ' '.repeat(Math.max(1, 10 - name.length)) + COMMANDS[name].desc }]);
          }
        });
        blank();
        line({ muted: 'Psst... there are a few hidden commands. Type "hint" if you get stuck.' });
      }
    },
    about: {
      desc: 'who is Nasib?',
      run: function () {
        var paragraphs = document.querySelectorAll('#about p');
        for (var i = 0; i < paragraphs.length; i++) {
          line(cleanText(paragraphs[i]));
        }
      }
    },
    projects: {
      desc: 'things I have built',
      run: function () {
        var cards = document.querySelectorAll('#projects .project-card');
        if (!cards.length) {
          line('Projects are on their way. Meanwhile: ', { text: 'github.com/nsbahmedov', href: LINKS.github });
          return;
        }
        for (var i = 0; i < cards.length; i++) {
          var card = cards[i];
          var tags = [].map.call(card.querySelectorAll('.tag'), cleanText).join(', ');
          var parts = [{ em: (i + 1) + '. ' + cleanText(card.querySelector('h3')) }];
          if (tags) {
            parts.push({ muted: '  [' + tags + ']' });
          }
          line(parts);
          line('   ' + cleanText(card.querySelector('p')));
          var linkParts = ['   '];
          [].forEach.call(card.querySelectorAll('.project-links a'), function (a, index) {
            if (index) {
              linkParts.push('  ');
            }
            linkParts.push({ text: cleanText(a), href: a.href });
          });
          line(linkParts);
        }
        blank();
        line(['More on ', { text: 'GitHub', href: LINKS.github }, '. Type ', { cmd: 'cd projects' }, ' to see them on the page.']);
      }
    },
    skills: {
      desc: 'my tech stack',
      run: function () {
        var tags = document.querySelectorAll('#skills .tag-list .tag');
        line([].map.call(tags, cleanText).join('  ·  '));
        blank();
        line({ muted: 'Tip: click a skill on the page to see the projects that use it.' });
      }
    },
    contact: {
      desc: 'how to reach me',
      run: function () {
        line(['email     ', { text: 'nsbahmedov@gmail.com', href: LINKS.email }]);
        line(['github    ', { text: 'github.com/nsbahmedov', href: LINKS.github }]);
        line(['linkedin  ', { text: 'linkedin.com/in/nasib-ahmadov-web', href: LINKS.linkedin }]);
        line(['location  Baku, Azerbaijan']);
      }
    },
    cv: {
      desc: 'open my resume',
      run: function () {
        openLink('cv');
      }
    },
    open: {
      desc: 'open github | linkedin | cv | email',
      run: function (args) {
        if (!args[0]) {
          line('usage: open github | linkedin | cv | email', 'term-error');
          return;
        }
        openLink(args[0].toLowerCase());
      }
    },
    ls: {
      desc: 'list sections of this site',
      run: function () {
        line(SECTIONS.map(function (s) { return s + '/'; }).join('  ') + '  cv.pdf');
      }
    },
    cd: {
      desc: 'jump to a section, e.g. cd projects',
      run: function (args) {
        var target = (args[0] || '~').replace(/\/$/, '').toLowerCase();
        if (target === '~' || target === '..' || target === '/') {
          close();
          window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        } else if (SECTIONS.indexOf(target) !== -1) {
          close();
          document.getElementById(target).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        } else {
          line('cd: no such section: ' + target + ' (try "ls")', 'term-error');
        }
      }
    },
    play: {
      desc: 'take a break: squash some bugs',
      run: function () {
        line(['Bugs are waiting for you here: ', { text: 'Bug Squash', href: '/404.html' }]);
      }
    },
    clear: {
      desc: 'clear the screen',
      run: function () {
        output.textContent = '';
      }
    },
    exit: {
      desc: 'close the terminal',
      run: function () {
        close();
      }
    },

    // ! hidden commands
    hint: {
      run: function () {
        var hints = [
          'Recruiters love "sudo hire nasib".',
          'Try "matrix". Then follow the white rabbit.',
          'Developers run on "coffee".',
          'Ever been stuck in "vim"?',
          'Ask "whoami".'
        ];
        line({ muted: hints[Math.floor(Math.random() * hints.length)] });
      }
    },
    sudo: {
      run: function (args) {
        if (args.join(' ').toLowerCase() !== 'hire nasib') {
          line('visitor is not in the sudoers file. This incident will be reported. 😄', 'term-error');
          line({ muted: 'Only one sudo command works here. Type "hint".' });
          return;
        }
        var bar;
        sequence([
          function () { line('[sudo] password for visitor: ********'); },
          function () { line(['Verifying recruiter credentials... ', { em: 'OK' }]); },
          function () { line(['Checking coffee supply... ', { em: 'OK' }]); },
          function () { bar = line('Hiring Nasib... [          ] 0%'); },
          function () { bar.textContent = 'Hiring Nasib... [████      ] 40%'; },
          function () { bar.textContent = 'Hiring Nasib... [████████  ] 80%'; },
          function () { bar.textContent = 'Hiring Nasib... [██████████] 100%'; },
          function () {
            blank();
            line({ em: 'Success! Great choice. 🎉' });
            line(['Let\'s make it official: ', { text: 'nsbahmedov@gmail.com', href: LINKS.email }]);
          }
        ]);
      }
    },
    coffee: {
      run: function () {
        line([
          '      ( (',
          '       ) )',
          '    ........',
          '    |      |]',
          '    \\      /',
          '     `----\''
        ].join('\n'), 'term-art');
        line('Brewing... done. Productivity +10.');
      }
    },
    matrix: {
      run: function () {
        matrix();
      }
    },
    whoami: {
      run: function () {
        line('visitor. Hopefully my next teammate. 🙂');
      }
    },
    hello: {
      run: function () {
        line('Hi there! 👋 Type "help" to look around.');
      }
    },
    date: {
      run: function () {
        line(new Date().toString());
      }
    },
    echo: {
      run: function (args) {
        line(args.join(' '));
      }
    },
    history: {
      run: function () {
        history.forEach(function (entry, i) {
          line({ muted: String(i + 1).padStart(4) + '  ' }).appendChild(document.createTextNode(entry));
        });
      }
    },
    vim: {
      run: function () {
        line('You are now stuck in vim. Forever. Just kidding: type ":q" to escape.');
      }
    },
    ':q': {
      run: function () {
        line('Escaped vim! Only 2% of developers ever make it out. 🏆');
      }
    },
    rm: {
      run: function () {
        line('Nice try. This website is read-only. 😄', 'term-error');
      }
    }
  };

  var ALIASES = { '?': 'help', hi: 'hello', quit: 'exit', resume: 'cv', game: 'play', ':wq': ':q', ':q!': ':q' };

  function openLink(name) {
    var href = LINKS[name];
    if (!href) {
      line('open: unknown target "' + name + '" (try github, linkedin, cv or email)', 'term-error');
      return;
    }
    line(['Opening ' + name + '... ', { text: href.replace(/^mailto:/, ''), href: href }]);
    if (/^https?:/.test(href)) {
      window.open(href, '_blank', 'noopener');
    } else {
      window.location.href = href;
    }
  }

  function run(raw) {
    var words = raw.trim().split(/\s+/);
    var name = words[0].toLowerCase();
    name = ALIASES[name] || name;
    var command = Object.prototype.hasOwnProperty.call(COMMANDS, name) ? COMMANDS[name] : null;
    if (!command) {
      line('command not found: ' + words[0] + '. Type "help" to see what I can do.', 'term-error');
      return;
    }
    command.run(words.slice(1));
  }

  function focusInput(fromTap) {
    if (touch && fromTap) {
      win.focus();
    } else {
      input.focus();
    }
  }

  function submit(text, fromTap) {
    if (busy) {
      return;
    }
    if (stopMatrix) {
      stopMatrix();
    }
    echoCommand(text);
    if (text.trim()) {
      history.push(text);
      run(text);
    }
    historyIndex = history.length;
    input.value = '';
    if (!overlay.hidden) {
      focusInput(fromTap);
    }
  }

  // ! tab completion
  function complete() {
    var value = input.value;
    var words = value.split(' ');
    var options;
    if (words.length === 1) {
      options = Object.keys(COMMANDS).filter(function (name) { return COMMANDS[name].desc; });
    } else if (words[0] === 'cd') {
      options = SECTIONS;
    } else if (words[0] === 'open') {
      options = Object.keys(LINKS);
    } else {
      return;
    }
    var prefix = words[words.length - 1].toLowerCase();
    var matches = options.filter(function (option) { return option.indexOf(prefix) === 0; });
    if (matches.length === 1) {
      words[words.length - 1] = matches[0];
      input.value = words.join(' ') + (words.length === 1 && COMMANDS[matches[0]].run.length ? ' ' : '');
    } else if (matches.length > 1) {
      echoCommand(value);
      line(matches.join('  '), 'term-muted');
    }
  }

  // ! matrix rain
  function matrix() {
    if (reduceMotion) {
      line('Wake up, Neo... (animation skipped because reduced motion is on)');
      return;
    }
    var canvas = document.createElement('canvas');
    canvas.className = 'term-matrix';
    win.appendChild(canvas);

    var ratio = window.devicePixelRatio || 1;
    var width = canvas.offsetWidth;
    var height = canvas.offsetHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    var ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    var size = 16;
    var chars = 'アイウエオカキクケコサシスセソ0123456789<>/{}=;';
    var drops = [];
    for (var i = 0; i < Math.ceil(width / size); i++) {
      drops.push(Math.random() * -20);
    }

    var last = 0;
    var frame = requestAnimationFrame(function draw(time) {
      frame = requestAnimationFrame(draw);
      if (time - last < 50) {
        return;
      }
      last = time;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#42dca3';
      ctx.font = size + 'px monospace';
      for (var d = 0; d < drops.length; d++) {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], d * size, drops[d] * size);
        if (drops[d] * size > height && Math.random() > 0.975) {
          drops[d] = 0;
        }
        drops[d]++;
      }
    });
    var timer = setTimeout(function () { stopMatrix(); }, 6000);

    stopMatrix = function () {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      canvas.remove();
      stopMatrix = null;
      line({ em: 'Follow the white rabbit. 🐇' });
    };
  }

  // ! open / close
  function open() {
    if (!overlay.hidden) {
      return;
    }
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('term-open');
    if (!welcomed) {
      welcomed = true;
      line({ em: 'Welcome to nasibahmadov.com, terminal edition.' });
      line('Type a command and press Enter, or tap one of these:');
      line([{ cmd: 'help' }, ' ', { cmd: 'about' }, ' ', { cmd: 'projects' }, ' ', { cmd: 'skills' }, ' ', { cmd: 'contact' }, ' ', { cmd: 'sudo hire nasib' }]);
      blank();
    }
    focusInput(true);
  }

  function close() {
    if (overlay.hidden) {
      return;
    }
    if (stopMatrix) {
      stopMatrix();
    }
    overlay.hidden = true;
    document.body.classList.remove('term-open');
    if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  // ! events
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    submit(input.value);
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      complete();
    } else if (event.key === 'ArrowUp' && history.length) {
      event.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex];
    } else if (event.key === 'ArrowDown' && history.length) {
      event.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = history[historyIndex] || '';
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      output.textContent = '';
    }
  });

  overlay.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      close();
    } else if (stopMatrix) {
      stopMatrix();
    }
  });

  // Clicking the backdrop closes; clicking empty space in the window focuses the input.
  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) {
      close();
    } else if (stopMatrix) {
      stopMatrix();
    } else if (event.target === body || event.target === output) {
      if (!window.getSelection().toString()) {
        input.focus();
      }
    }
  });

  overlay.querySelector('.term-close').addEventListener('click', close);

  // Keep focus inside the dialog while it is open.
  document.addEventListener('focusin', function (event) {
    if (!overlay.hidden && !win.contains(event.target)) {
      focusInput(true);
    }
  });

  launcher.addEventListener('click', open);

  var openers = document.querySelectorAll('[data-open-terminal]');
  for (var i = 0; i < openers.length; i++) {
    openers[i].hidden = false;
    openers[i].addEventListener('click', open);
  }

  // ` or ~ opens the terminal from anywhere on the page.
  document.addEventListener('keydown', function (event) {
    var tag = event.target.tagName;
    if ((event.key === '`' || event.key === '~') && overlay.hidden &&
      !event.ctrlKey && !event.metaKey && !event.altKey &&
      tag !== 'INPUT' && tag !== 'TEXTAREA' && !event.target.isContentEditable) {
      event.preventDefault();
      open();
    }
  });

})();
