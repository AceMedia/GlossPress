/* GlossPress light tooltips: a single shared tooltip element positioned next
   to the hovered, focused or tapped .glossary-highlight span. Loaded with
   defer, so it never holds up the first paint. */
(function () {
	'use strict';
	var tip = null;
	var current = null;
	var pinned = false; // opened by a click or tap, so leaving with the mouse keeps it
	var wasOpen = false; // whether the tapped term was already open when the tap began

	function show(el) {
		var text = el.getAttribute('data-tooltip');
		if (!text) { return; }
		if (!tip) {
			tip = document.createElement('div');
			tip.className = 'glossary-tooltip';
			tip.setAttribute('role', 'tooltip');
			tip.id = 'glossary-tooltip';
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

	function hide() {
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
			el.addEventListener('pointerleave', function (e) {
				if (e.pointerType === 'mouse' && !pinned) { hide(); }
			});
			el.addEventListener('pointerdown', function () {
				wasOpen = pinned && current === el;
			});
			el.addEventListener('focus', function () { show(el); });
			el.addEventListener('blur', function () {
				if (current === el) { hide(); }
			});
			// A click or tap opens and pins the tooltip; another on the same
			// term closes it. No preventDefault, so a term inside a <details>
			// summary or a label still does its job.
			el.addEventListener('click', function () {
				if (wasOpen) {
					hide();
				} else {
					show(el);
					pinned = true;
				}
				wasOpen = false;
			});
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' || e.key === 'Esc') { hide(); }
		});
		document.addEventListener('click', function (e) {
			if (current && !(e.target.closest && e.target.closest('.glossary-highlight'))) { hide(); }
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
