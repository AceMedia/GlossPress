/* GlossPress light tooltips: a single shared tooltip element positioned next
   to the hovered, focused or tapped .glossary-highlight span. Loaded with
   defer, so it never holds up the first paint. */
(function () {
	'use strict';
	var tip = null;
	var current = null;
	var pinned = false; // opened by a click or tap, so leaving with the mouse keeps it
	var timer = 0;

	function show(el) {
		var text = el.getAttribute('data-tooltip');
		if (!text) { return; }
		clearTimeout(timer);
		if (!tip) {
			tip = document.createElement('div');
			tip.className = 'glossary-tooltip';
			tip.setAttribute('role', 'tooltip');
			tip.id = 'glossary-tooltip';
			// The mouse can move onto the tooltip without it closing (WCAG
			// 1.4.13), and pressing inside it keeps focus on the term.
			tip.addEventListener('pointerenter', function () { clearTimeout(timer); });
			tip.addEventListener('pointerleave', leave);
			tip.addEventListener('mousedown', function (e) { e.preventDefault(); });
			document.body.appendChild(tip);
		}
		if (current !== el) {
			if (current) { current.removeAttribute('aria-describedby'); }
			tip.textContent = '';
			var term = document.createElement('span');
			term.className = 'glossary-tooltip__term';
			term.textContent = el.getAttribute('data-term') || el.textContent;
			tip.appendChild(term);
			tip.appendChild(document.createTextNode(text));
			el.setAttribute('aria-describedby', tip.id);
			current = el;
			pinned = false;
		}
		tip.classList.add('is-visible');
		position();
	}

	// Centred over the term and kept 8px inside the viewport; below it when
	// there is no room above.
	function position() {
		if (!current) { return; }
		var r = current.getBoundingClientRect();
		var w = tip.offsetWidth;
		var h = tip.offsetHeight;
		var left = Math.max(8, Math.min(r.left + (r.width / 2) - (w / 2), document.documentElement.clientWidth - w - 8));
		var top = r.top - h - 8;
		if (top < 0) { top = r.bottom + 8; }
		tip.style.left = (left + window.scrollX) + 'px';
		tip.style.top = (top + window.scrollY) + 'px';
	}

	// The mouse left the term or the tooltip. A short grace period lets it
	// cross the gap between them.
	function leave(e) {
		if (e.pointerType === 'mouse' && !pinned) {
			clearTimeout(timer);
			timer = setTimeout(hide, 150);
		}
	}

	function hide() {
		clearTimeout(timer);
		if (!current) { return; }
		tip.classList.remove('is-visible');
		current.removeAttribute('aria-describedby');
		current = null;
		pinned = false;
	}

	function init() {
		var spans = document.querySelectorAll('.glossary-highlight[data-tooltip]');
		if (!spans.length) { return; }
		Array.prototype.forEach.call(spans, function (el) {
			el.setAttribute('tabindex', '0');
			// Hover is for a real mouse only. A tap fires emulated mouse events
			// and a focus before its click, which used to open the tooltip and
			// close it again in the same tap.
			el.addEventListener('pointerenter', function (e) {
				if (e.pointerType === 'mouse') { show(el); }
			});
			// Only this term's own tooltip: leaving it must not close one that
			// another term opened by keyboard focus.
			el.addEventListener('pointerleave', function (e) {
				if (current === el) { leave(e); }
			});
			el.addEventListener('focus', function () { show(el); });
			el.addEventListener('blur', function () {
				if (current === el) { hide(); }
			});
			// A click or tap opens and pins the tooltip; another on the same
			// term closes it. A tap's focus never pins, so this works the same
			// with or without Pointer Events. No preventDefault, so a term
			// inside a <details> summary or a label still does its job.
			el.addEventListener('click', function () {
				if (pinned && current === el) {
					hide();
				} else {
					show(el);
					pinned = true;
				}
			});
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' || e.key === 'Esc') { hide(); }
		});
		document.addEventListener('click', function (e) {
			if (current && !(e.target.closest && e.target.closest('.glossary-highlight, .glossary-tooltip'))) { hide(); }
		});
		window.addEventListener('scroll', position, { passive: true });
		window.addEventListener('resize', position);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
