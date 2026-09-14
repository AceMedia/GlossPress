/* GlossPress light tooltips: a single shared tooltip element positioned next
   to the hovered, focused or tapped .glossary-highlight span. */
(function () {
	'use strict';
	var tip = null;
	var current = null;

	function ensureTip() {
		if (tip) { return tip; }
		tip = document.createElement('div');
		tip.className = 'glossary-tooltip';
		tip.setAttribute('role', 'tooltip');
		tip.id = 'glossary-tooltip';
		document.body.appendChild(tip);
		return tip;
	}

	function show(el) {
		var t = ensureTip();
		var text = el.getAttribute('data-tooltip') || '';
		if (!text) { return; }
		t.textContent = '';
		var term = document.createElement('span');
		term.className = 'glossary-tooltip__term';
		term.textContent = el.getAttribute('data-term') || el.textContent;
		t.appendChild(term);
		t.appendChild(document.createTextNode(text));
		el.setAttribute('aria-describedby', t.id);
		current = el;
		t.classList.add('is-visible');
		position(el, t);
	}

	function position(el, t) {
		var r = el.getBoundingClientRect();
		var w = t.offsetWidth;
		var h = t.offsetHeight;
		var left = r.left + window.scrollX + (r.width / 2) - (w / 2);
		var minLeft = window.scrollX + 8;
		var maxLeft = window.scrollX + document.documentElement.clientWidth - w - 8;
		left = Math.max(minLeft, Math.min(left, maxLeft));
		var top = r.top + window.scrollY - h - 8;
		if (r.top - h - 8 < 0) { top = r.bottom + window.scrollY + 8; }
		t.style.left = left + 'px';
		t.style.top = top + 'px';
	}

	function hide() {
		if (!tip) { return; }
		tip.classList.remove('is-visible');
		if (current) { current.removeAttribute('aria-describedby'); }
		current = null;
	}

	function init() {
		var spans = document.querySelectorAll('.glossary-highlight[data-tooltip]');
		if (!spans.length) { return; }
		Array.prototype.forEach.call(spans, function (el) {
			el.setAttribute('tabindex', '0');
			el.addEventListener('mouseenter', function () { show(el); });
			el.addEventListener('mouseleave', hide);
			el.addEventListener('focus', function () { show(el); });
			el.addEventListener('blur', hide);
			el.addEventListener('click', function (e) {
				e.preventDefault();
				if (current === el) { hide(); } else { show(el); }
			});
		});
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hide(); } });
		document.addEventListener('click', function (e) {
			if (current && !e.target.closest('.glossary-highlight')) { hide(); }
		});
		window.addEventListener('scroll', function () { if (current && tip) { position(current, tip); } }, { passive: true });
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
