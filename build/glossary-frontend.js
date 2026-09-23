/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/**
 * GlossPress front end.
 *
 * The glossary is rendered in full on the server, so this only enhances it:
 * live search, the sticky A to Z rail with the current letter highlighted,
 * in-page jumps that clear the site header, and related articles on request.
 * No framework and no dependencies.
 */

const normalise = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Bottom edge of whatever the theme pins to the top of the viewport (a fixed
 * header, the admin bar), found by probing the top row of pixels.
 *
 * @param {HTMLElement} root The glossary, skipped while probing.
 * @return {number} Pixels from the top of the viewport.
 */
function headerOffset(root) {
  let bottom = 0;
  const width = document.documentElement.clientWidth;
  [8, width / 2, width - 8].forEach(x => {
    let el = document.elementFromPoint(x, 1);
    while (el && el !== document.body && el !== document.documentElement) {
      if (root.contains(el)) {
        return;
      }
      const position = window.getComputedStyle(el).position;
      if (position === 'fixed' || position === 'sticky') {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 1 && rect.height < window.innerHeight / 2) {
          bottom = Math.max(bottom, rect.bottom);
        }
      }
      el = el.parentElement;
    }
  });
  return Math.round(bottom);
}
function initGlossary(root) {
  const list = root.querySelector('.glossary-az__list');
  const links = Array.from(root.querySelectorAll('a.glossary-az__link'));
  const sections = Array.from(root.querySelectorAll('.glossary-letter'));
  const terms = Array.from(root.querySelectorAll('.glossary-term'));
  const search = root.querySelector('.glossary-search');
  const input = root.querySelector('.glossary-search__input');
  const status = root.querySelector('.glossary-search__status');
  const empty = root.querySelector('.glossary-empty');
  const railQuery = window.matchMedia('(min-width: 64em)');
  let offset = -1;
  let active = null;
  let strings = {};
  try {
    strings = JSON.parse(root.dataset.strings || '{}');
  } catch (error) {}
  const t = (key, ...values) => {
    let i = 0;
    return (strings[key] || key).replace(/%(\d\$)?s/g, (match, position) => {
      var _values;
      return String((_values = values[position ? parseInt(position, 10) - 1 : i++]) !== null && _values !== void 0 ? _values : '');
    });
  };

  // Re-measured as the page scrolls: some headers grow (a pinned ad slot)
  // or hide once the reader moves down the page.
  const setOffset = () => {
    const next = headerOffset(root);
    if (next !== offset) {
      offset = next;
      root.style.setProperty('--glossary-sticky-top', offset + 'px');
    }
  };

  // How far below the top a jump should land: under the site header, plus
  // the letter strip when it is pinned across the top on small screens.
  const landingLine = () => offset + (railQuery.matches || !list ? 0 : list.offsetHeight + 8) + 16;
  const motion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const setActive = letter => {
    if (letter === active) {
      return;
    }
    active = letter;
    links.forEach(link => {
      const on = link.dataset.letter === letter;
      link.classList.toggle('is-active', on);
      if (on) {
        link.setAttribute('aria-current', 'location');
        // Keep the current letter in view on the scrolling strip.
        if (!railQuery.matches && list.scrollWidth > list.clientWidth) {
          list.scrollTo({
            left: link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2,
            behavior: motion()
          });
        }
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };
  let ticking = false;
  const onScroll = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;
      setOffset();
      const line = landingLine() + 8;
      let current = null;
      for (const section of sections) {
        if (section.hidden) {
          continue;
        }
        if (section.getBoundingClientRect().top <= line) {
          current = section.dataset.letter;
        } else {
          break;
        }
      }
      setActive(current);
    });
  };
  let marked = null;
  const markTarget = target => {
    if (marked) {
      marked.classList.remove('is-target');
    }
    marked = target.matches('.glossary-term') ? target : null;
    if (marked) {
      marked.classList.add('is-target');
    }
  };
  const jumpTo = (target, focusTarget) => {
    const top = target.getBoundingClientRect().top + window.scrollY - landingLine();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: motion()
    });
    // Replace rather than push: a trail of letter clicks should not fill
    // the back button, and keeping history.state intact stops routers
    // that stamp it from reloading on back/forward.
    window.history.replaceState(window.history.state, '', '#' + target.id);
    markTarget(target);
    if (focusTarget) {
      focusTarget.focus({
        preventScroll: true
      });
    }
  };
  root.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !root.contains(link)) {
      return;
    }
    const target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
    if (!target) {
      return;
    }
    // Themes often bind their own smooth scroll to every #link on the page;
    // keep them out so the two don't fight over the scroll position.
    event.preventDefault();
    event.stopPropagation();
    if (target.hidden) {
      return;
    }
    const focusTarget = target.matches('.glossary-letter') ? target.querySelector('.glossary-letter__title') : null;
    jumpTo(target, focusTarget);
  });

  // Search.
  if (search && input) {
    search.hidden = false;
    const total = terms.length;
    const index = terms.map(term => ({
      term,
      section: term.closest('.glossary-letter'),
      text: normalise(term.textContent)
    }));
    let timer = 0;
    const runSearch = () => {
      const query = normalise(input.value.trim());
      const visibleBySection = new Map();
      let shown = 0;
      index.forEach(({
        term,
        section,
        text
      }) => {
        const match = !query || text.includes(query);
        term.hidden = !match;
        if (match) {
          shown++;
          visibleBySection.set(section, true);
        }
      });
      sections.forEach(section => {
        section.hidden = !visibleBySection.has(section);
      });
      links.forEach(link => {
        const section = document.getElementById(link.getAttribute('href').slice(1));
        const off = !section || section.hidden;
        link.classList.toggle('is-dimmed', off);
        if (off) {
          link.setAttribute('aria-disabled', 'true');
        } else {
          link.removeAttribute('aria-disabled');
        }
      });
      if (empty) {
        empty.hidden = shown > 0;
      }
      // Letter totals would contradict the filtered list, so hide them.
      root.classList.toggle('is-searching', !!query);
      if (!query) {
        status.textContent = '';
      } else if (shown === 0) {
        status.textContent = t('none', input.value.trim());
      } else {
        status.textContent = t('count', shown, total, input.value.trim());
      }
      active = undefined;
      onScroll();
    };
    input.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(runSearch, 120);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape' && input.value) {
        input.value = '';
        runSearch();
      }
    });
  }

  // Related articles, fetched only when asked for.
  root.querySelectorAll('.glossary-term__related-toggle').forEach(button => {
    button.hidden = false;
    let panel = null;
    button.addEventListener('click', async () => {
      if (panel) {
        panel.hidden = !panel.hidden;
        button.setAttribute('aria-expanded', String(!panel.hidden));
        button.textContent = panel.hidden ? t('showRelated') : t('hideRelated');
        return;
      }
      button.disabled = true;
      button.textContent = t('loadingRelated');
      panel = document.createElement('ul');
      panel.className = 'glossary-term__related';
      panel.id = button.closest('.glossary-term').id + '-related';
      button.setAttribute('aria-controls', panel.id);
      try {
        const response = await fetch(button.dataset.relatedUrl);
        const payload = response.ok ? await response.json() : {};
        const posts = Array.isArray(payload.posts) ? payload.posts : [];
        if (!posts.length) {
          const item = document.createElement('li');
          item.textContent = t('noRelated');
          panel.appendChild(item);
        }
        posts.forEach(post => {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = post.link;
          link.textContent = post.title;
          item.appendChild(link);
          panel.appendChild(item);
        });
      } catch (error) {
        const item = document.createElement('li');
        item.textContent = t('relatedError');
        panel.appendChild(item);
      }
      button.after(panel);
      button.disabled = false;
      button.setAttribute('aria-expanded', 'true');
      button.textContent = t('hideRelated');
    });
  });
  setOffset();
  onScroll();
  window.addEventListener('scroll', onScroll, {
    passive: true
  });
  window.addEventListener('resize', () => {
    setOffset();
    onScroll();
  });
  railQuery.addEventListener('change', () => {
    active = undefined;
    onScroll();
  });

  // Arriving with a #term in the URL: land it clear of the fixed header.
  if (window.location.hash.length > 1) {
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (target && root.contains(target)) {
      window.requestAnimationFrame(() => {
        window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - landingLine());
        markTarget(target);
      });
    }
  }
}
const start = () => document.querySelectorAll('.acemedia-glossary').forEach(initGlossary);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
/******/ })()
;