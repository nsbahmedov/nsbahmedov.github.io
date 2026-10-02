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

  // ! the shell lives at the bottom of the page (#shell)
  var shell = document.getElementById('shell');
  var output = document.getElementById('shell-output');
  var form = document.getElementById('shell-form');
  var input = document.getElementById('shell-input');
  if (!shell || !output || !form || !input) {
    return;
  }

  // Floating ">_" button: jumps to the shell, hidden while the shell is on screen.
  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'term-launch';
  launcher.setAttribute('aria-label', 'Jump to the interactive shell');
  launcher.title = 'Jump to the shell (press `)';
  launcher.textContent = '>_';
  document.body.appendChild(launcher);

  var history = [];
  var historyIndex = 0;
  var busy = false;
  var stopMatrix = null;

  // ! output helpers
  // Keep the prompt on screen while output is added, but only once the visitor is using the shell.
  var following = false;
  function scrollToBottom() {
    if (following) {
      form.scrollIntoView({ block: 'nearest' });
    }
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
        var paragraphs = document.querySelectorAll('#about .prose p');
        for (var i = 0; i < paragraphs.length; i++) {
          line(cleanText(paragraphs[i]));
        }
      }
    },
    education: {
      desc: 'degrees and languages',
      run: function () {
        line({ em: 'education' });
        [].forEach.call(document.querySelectorAll('#about .education li'), function (li) {
          line('  - ' + cleanText(li));
        });
        line({ em: 'languages' });
        [].forEach.call(document.querySelectorAll('#about .languages li'), function (li) {
          line('  - ' + cleanText(li));
        });
      }
    },
    projects: {
      desc: 'things I have built',
      run: function () {
        var cards = document.querySelectorAll('#projects .project-card:not(.project-more)');
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
          var type = card.querySelector('.project-type');
          if (type) {
            line({ muted: '   ' + cleanText(type) });
          }
          line('   ' + cleanText(card.querySelector('p:not(.project-type)')));
          var links = card.querySelectorAll('.project-links a');
          if (links.length) {
            var linkParts = ['   '];
            [].forEach.call(links, function (a, index) {
              if (index) {
                linkParts.push('  ');
              }
              linkParts.push({ text: cleanText(a), href: a.href });
            });
            line(linkParts);
          } else if (card.querySelector('.project-links')) {
            // no public link (private or not yet listed): show the note instead
            line({ muted: '   ' + cleanText(card.querySelector('.project-links')) });
          }
        }
        blank();
        line(['More on ', { text: 'GitHub', href: LINKS.github }, '. Type ', { cmd: 'cd projects' }, ' to see them on the page.']);
      }
    },
    skills: {
      desc: 'my tech stack',
      run: function () {
        var tags = document.querySelectorAll('#skills .skill');
        line([].map.call(tags, cleanText).join('  ·  '));
        blank();
        line({ muted: 'Tip: click a skill in skills.json above to see the projects that use it.' });
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
          scrollTo(document.body);
        } else if (SECTIONS.indexOf(target) !== -1) {
          scrollTo(document.getElementById(target));
        } else {
          line('cd: no such section: ' + target + ' (try "ls")', 'term-error');
        }
      }
    },
    theme: {
      desc: 'switch theme: theme light | dark',
      run: function (args) {
        if (!window.siteTheme) {
          line('theme: not available', 'term-error');
          return;
        }
        var wanted = (args[0] || 'toggle').toLowerCase();
        if (['light', 'dark', 'toggle'].indexOf(wanted) === -1) {
          line('usage: theme light | dark', 'term-error');
          return;
        }
        line(['Theme set to ', { em: window.siteTheme.set(wanted) }, '.']);
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
      desc: 'log out (back to the top)',
      run: function () {
        line('logout');
        setTimeout(function () { scrollTo(document.body); }, 300);
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
          function () { bar.textContent = 'Hiring Nasib... [####      ] 40%'; },
          function () { bar.textContent = 'Hiring Nasib... [########  ] 80%'; },
          function () { bar.textContent = 'Hiring Nasib... [##########] 100%'; },
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

  function scrollTo(element) {
    following = false;
    input.blur();
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  // On touch screens a tapped command keeps focus, so the keyboard doesn't pop up.
  function focusInput(fromTap) {
    if (!(touch && fromTap)) {
      input.focus({ preventScroll: true });
    }
  }

  function submit(text, fromTap) {
    if (busy) {
      return;
    }
    if (stopMatrix) {
      stopMatrix();
    }
    following = true;
    echoCommand(text);
    input.value = '';
    focusInput(fromTap);
    if (text.trim()) {
      history.push(text);
      run(text);
    }
    historyIndex = history.length;
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
    } else if (words[0] === 'theme') {
      options = ['light', 'dark'];
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
    canvas.title = 'Click or press any key to exit';
    document.body.appendChild(canvas);

    var ratio = window.devicePixelRatio || 1;
    var width = window.innerWidth;
    var height = window.innerHeight;
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

  // ! jump to the shell
  function open() {
    following = true;
    shell.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' });
    focusInput(touch);
  }

  // ! welcome message
  line({ em: 'Welcome to nasibahmadov.com, terminal edition.' });
  line('Type a command and press Enter, or tap one of these:');
  line([{ cmd: 'help' }, ' ', { cmd: 'about' }, ' ', { cmd: 'projects' }, ' ', { cmd: 'skills' }, ' ', { cmd: 'contact' }, ' ', { cmd: 'sudo hire nasib' }]);
  blank();

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
    } else if (event.key === 'Escape') {
      input.blur();
    }
  });

  // Clicking empty space in the shell focuses the prompt (unless the visitor is selecting text).
  shell.addEventListener('click', function (event) {
    if ((event.target === shell || event.target === output) && !window.getSelection().toString()) {
      focusInput(false);
    }
  });

  // Any key or click ends the matrix animation.
  document.addEventListener('keydown', function () {
    if (stopMatrix) {
      stopMatrix();
    }
  }, true);
  document.addEventListener('click', function (event) {
    if (stopMatrix && event.target.classList.contains('term-matrix')) {
      stopMatrix();
    }
  });

  launcher.addEventListener('click', open);

  var openers = document.querySelectorAll('a[href="#shell"]');
  for (var i = 0; i < openers.length; i++) {
    openers[i].addEventListener('click', function (event) {
      event.preventDefault();
      open();
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      launcher.classList.toggle('is-hidden', entries[0].isIntersecting);
    }).observe(form);
  }

  // ` or ~ jumps to the shell from anywhere on the page.
  document.addEventListener('keydown', function (event) {
    var tag = event.target.tagName;
    if ((event.key === '`' || event.key === '~') &&
      !event.ctrlKey && !event.metaKey && !event.altKey &&
      tag !== 'INPUT' && tag !== 'TEXTAREA' && !event.target.isContentEditable) {
      event.preventDefault();
      open();
    }
  });

})();
