/**
 * GlossPress app layout: the filter rail beside the terms.
 *
 * The server renders every term and the rail in full; this turns the rail
 * into live filters (search, letter, topic, sort) kept in the address bar,
 * keeps the per-letter counts in step with the other filters, and turns the
 * rail into a sheet on phones. No framework and no dependencies.
 */

const SHEET_QUERY = '(max-width: 781.98px)';

const normalise = ( text ) =>
	text
		.toLowerCase()
		.normalize( 'NFD' )
		.replace( /[̀-ͯ]/g, '' );

const motion = () =>
	window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
		? 'auto'
		: 'smooth';

/**
 * Bottom edge of everything pinned to the top of the viewport (a fixed
 * header, a ticker under it, the admin bar), found by probing downwards.
 *
 * @param {HTMLElement} root The glossary, skipped while probing.
 * @return {number} Pixels from the top of the viewport.
 */
export function pinnedBottom( root ) {
	const width = document.documentElement.clientWidth;
	let bottom = 0;
	for ( let pass = 0; pass < 4; pass++ ) {
		const y = bottom + 1;
		let found = bottom;
		[ 8, width / 2, width - 8 ].forEach( ( x ) => {
			let el = document.elementFromPoint( x, y );
			while (
				el &&
				el !== document.body &&
				el !== document.documentElement
			) {
				if ( root.contains( el ) ) {
					return;
				}
				const position = window.getComputedStyle( el ).position;
				if ( position === 'fixed' || position === 'sticky' ) {
					const rect = el.getBoundingClientRect();
					if (
						rect.top <= y &&
						rect.bottom > y &&
						rect.height < window.innerHeight / 2 &&
						rect.width > width / 2
					) {
						found = Math.max( found, rect.bottom );
					}
				}
				el = el.parentElement;
			}
		} );
		if ( found <= bottom ) {
			break;
		}
		bottom = found;
	}
	return Math.round( bottom );
}

export function initApp( root ) {
	const rail = root.querySelector( '.glossary-rail' );
	const sectionsWrap = root.querySelector( '.glossary-sections' );
	if ( ! rail || ! sectionsWrap ) {
		return;
	}
	const flat = root.querySelector( '.glossary-flat' );
	const sections = Array.from( root.querySelectorAll( '.glossary-letter' ) );
	const cells = Array.from(
		root.querySelectorAll( '.glossary-az__cell[data-letter]' )
	);
	const topicButtons = Array.from( root.querySelectorAll( '[data-topic]' ) );
	const sortButtons = Array.from( root.querySelectorAll( '[data-sort]' ) );
	const search = root.querySelector( '.glossary-search' );
	const input = root.querySelector( '.glossary-search__input' );
	const status = root.querySelector( '.glossary-main__status' );
	const empty = root.querySelector( '.glossary-empty[hidden]' );
	const applied = root.querySelector( '.glossary-applied' );
	const appliedList = root.querySelector( '.glossary-applied__list' );
	const openButton = root.querySelector( '.glossary-filters-open' );
	const openCount = root.querySelector( '.glossary-filters-open__n' );
	const showButton = root.querySelector( '.glossary-show' );
	const closeButton = root.querySelector( '.glossary-rail__close' );
	const sheetQuery = window.matchMedia( SHEET_QUERY );

	let strings = {};
	try {
		strings = JSON.parse( root.dataset.strings || '{}' );
	} catch ( error ) {}
	const t = ( key, ...values ) => {
		let i = 0;
		return ( strings[ key ] || key ).replace(
			/%(\d\$)?s/g,
			( match, position ) =>
				String(
					values[ position ? parseInt( position, 10 ) - 1 : i++ ] ??
						''
				)
		);
	};
	const plural = ( n, one, many ) =>
		t( n === 1 ? one : many, n.toLocaleString() );

	root.querySelectorAll( '[data-js-only]' ).forEach( ( el ) => {
		el.hidden = false;
	} );
	if ( search ) {
		search.hidden = false;
	}

	const index = Array.from( root.querySelectorAll( '.glossary-term' ) ).map(
		( term ) => {
			const section = term.closest( '.glossary-letter' );
			return {
				term,
				home: term.parentElement,
				section,
				letter: section ? section.dataset.letter : '',
				text: normalise( term.textContent ),
				topics: ( term.dataset.topics || '' )
					.split( ' ' )
					.filter( Boolean ),
				modified: parseInt( term.dataset.modified || '0', 10 ),
			};
		}
	);
	const topicName = ( slug ) => {
		const button = topicButtons.find( ( b ) => b.dataset.topic === slug );
		return button ? button.dataset.name : slug;
	};

	// State, read from the address bar so a filtered view can be shared.
	const params = new URLSearchParams( window.location.search );
	const readLetter = ( value ) => {
		const v = ( value || '' ).toUpperCase();
		if ( v === 'NUM' ) {
			return '#';
		}
		return /^[A-Z]$/.test( v ) ? v : '';
	};
	const state = {
		q: params.get( 'q' ) || '',
		letter: readLetter( params.get( 'letter' ) ),
		topic: params.get( 'topic' ) || '',
		sort: params.get( 'sort' ) === 'updated' ? 'updated' : 'az',
	};
	if (
		state.topic &&
		! topicButtons.some( ( b ) => b.dataset.topic === state.topic )
	) {
		state.topic = '';
	}
	if ( input && state.q ) {
		input.value = state.q;
	}

	const writeUrl = () => {
		const url = new URL( window.location.href );
		[ 'q', 'letter', 'topic', 'sort' ].forEach( ( k ) =>
			url.searchParams.delete( k )
		);
		if ( state.q.trim() ) {
			url.searchParams.set( 'q', state.q.trim() );
		}
		if ( state.letter ) {
			url.searchParams.set(
				'letter',
				state.letter === '#' ? 'num' : state.letter.toLowerCase()
			);
		}
		if ( state.topic ) {
			url.searchParams.set( 'topic', state.topic );
		}
		if ( state.sort === 'updated' ) {
			url.searchParams.set( 'sort', 'updated' );
		}
		url.hash = '';
		window.history.replaceState( window.history.state, '', url );
	};

	let sortedAs = 'az';
	const applySort = () => {
		if ( state.sort === sortedAs || ! flat ) {
			return;
		}
		if ( state.sort === 'updated' ) {
			index
				.slice()
				.sort( ( a, b ) => b.modified - a.modified )
				.forEach( ( item ) => flat.appendChild( item.term ) );
			flat.hidden = false;
			sectionsWrap.hidden = true;
		} else {
			// Index order is the original A to Z order, so appending each term
			// back to its own letter restores it.
			index.forEach( ( item ) => item.home.appendChild( item.term ) );
			flat.hidden = true;
			sectionsWrap.hidden = false;
		}
		sortedAs = state.sort;
	};

	const chip = ( label, clear ) => {
		const li = document.createElement( 'li' );
		const button = document.createElement( 'button' );
		button.type = 'button';
		button.className = 'glossary-applied__chip';
		button.setAttribute( 'aria-label', t( 'remove', label ) );
		button.innerHTML =
			'<span></span><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z" fill="currentColor"/></svg>';
		button.firstChild.textContent = label;
		button.addEventListener( 'click', () => {
			clear();
			apply();
		} );
		li.appendChild( button );
		return li;
	};

	let lastShown = index.length;
	function apply() {
		applySort();
		const q = normalise( state.q.trim() );
		const counts = {};
		let base = 0;
		let shown = 0;
		index.forEach( ( item ) => {
			const ok =
				( ! q || item.text.includes( q ) ) &&
				( ! state.topic || item.topics.includes( state.topic ) );
			if ( ok ) {
				counts[ item.letter ] = ( counts[ item.letter ] || 0 ) + 1;
				base++;
			}
			const visible =
				ok && ( ! state.letter || item.letter === state.letter );
			item.term.hidden = ! visible;
			if ( visible ) {
				shown++;
			}
		} );
		lastShown = shown;

		sections.forEach( ( section ) => {
			const n = section.querySelectorAll(
				'.glossary-term:not([hidden])'
			).length;
			section.hidden = n === 0;
			const label = section.querySelector( '.glossary-letter__count' );
			if ( label ) {
				label.textContent = plural( n, 'term1', 'termN' );
			}
		} );

		// The A to Z counts follow the search and topic, so a letter shows
		// how many terms it would give.
		cells.forEach( ( cell ) => {
			const letter = cell.dataset.letter;
			const n = letter ? counts[ letter ] || 0 : base;
			const number = cell.querySelector( '.glossary-az__n' );
			if ( number ) {
				number.textContent = n.toLocaleString();
			}
			const off = n === 0 && !! letter;
			cell.classList.toggle( 'is-zero', off );
			if ( cell.tagName === 'A' ) {
				if ( off ) {
					cell.setAttribute( 'aria-disabled', 'true' );
				} else {
					cell.removeAttribute( 'aria-disabled' );
				}
			}
			if ( letter === state.letter ) {
				cell.setAttribute( 'aria-current', 'true' );
			} else {
				cell.removeAttribute( 'aria-current' );
			}
		} );
		topicButtons.forEach( ( b ) =>
			b.setAttribute(
				'aria-pressed',
				String( b.dataset.topic === state.topic )
			)
		);
		sortButtons.forEach( ( b ) =>
			b.setAttribute(
				'aria-pressed',
				String( b.dataset.sort === state.sort )
			)
		);

		if ( empty ) {
			empty.hidden = shown > 0;
		}

		// The line above the terms says what is showing.
		const parts = [ plural( shown, 'term1', 'termN' ) ];
		if ( state.letter ) {
			parts.push( t( 'under', state.letter ) );
		}
		if ( state.topic ) {
			parts.push( t( 'inTopic', topicName( state.topic ) ) );
		}
		if ( state.q.trim() ) {
			parts.push( t( 'matching', state.q.trim() ) );
		}
		if ( state.sort === 'updated' ) {
			parts.push( '· ' + t( 'newest' ) );
		}
		if ( status ) {
			status.textContent = parts.join( ' ' );
		}
		if ( showButton ) {
			showButton.textContent = plural( shown, 'show1', 'showN' );
		}

		// Filter chips at the top of the rail.
		let active = 0;
		if ( appliedList ) {
			appliedList.textContent = '';
			if ( state.q.trim() ) {
				active++;
				appliedList.appendChild(
					chip( '“' + state.q.trim() + '”', () => {
						state.q = '';
						if ( input ) {
							input.value = '';
						}
					} )
				);
			}
			if ( state.letter ) {
				active++;
				appliedList.appendChild(
					chip( t( 'letterChip', state.letter ), () => {
						state.letter = '';
					} )
				);
			}
			if ( state.topic ) {
				active++;
				appliedList.appendChild(
					chip( topicName( state.topic ), () => {
						state.topic = '';
					} )
				);
			}
			if ( state.sort === 'updated' ) {
				active++;
				appliedList.appendChild(
					chip( t( 'updatedChip' ), () => {
						state.sort = 'az';
					} )
				);
			}
		}
		if ( applied ) {
			applied.hidden = active === 0;
		}
		if ( openCount ) {
			openCount.textContent = active ? String( active ) : '';
		}
		root.classList.toggle( 'is-filtered', active > 0 );
		writeUrl();
	}

	// Bring the top of the terms into view after a filter change, if the
	// reader has scrolled past it.
	const main = root.querySelector( '.glossary-main' );
	const toTop = () => {
		if ( sheetQuery.matches || ! main ) {
			return;
		}
		const top =
			main.getBoundingClientRect().top +
			window.scrollY -
			pinnedBottom( root ) -
			12;
		if ( window.scrollY > top ) {
			window.scrollTo( { top: Math.max( 0, top ), behavior: motion() } );
		}
	};

	const reset = () => {
		state.q = '';
		state.letter = '';
		state.topic = '';
		state.sort = 'az';
		if ( input ) {
			input.value = '';
		}
		apply();
		toTop();
	};

	cells.forEach( ( cell ) => {
		if ( cell.tagName !== 'A' ) {
			return;
		}
		cell.addEventListener( 'click', ( event ) => {
			event.preventDefault();
			event.stopPropagation();
			if ( cell.getAttribute( 'aria-disabled' ) === 'true' ) {
				return;
			}
			const letter = cell.dataset.letter;
			state.letter = letter && letter !== state.letter ? letter : '';
			apply();
			toTop();
		} );
	} );
	topicButtons.forEach( ( b ) =>
		b.addEventListener( 'click', () => {
			state.topic = state.topic === b.dataset.topic ? '' : b.dataset.topic;
			apply();
			toTop();
		} )
	);
	sortButtons.forEach( ( b ) =>
		b.addEventListener( 'click', () => {
			state.sort = b.dataset.sort === 'updated' ? 'updated' : 'az';
			apply();
			toTop();
		} )
	);
	root.querySelectorAll( '.glossary-reset' ).forEach( ( b ) =>
		b.addEventListener( 'click', reset )
	);

	if ( input ) {
		let timer = 0;
		input.addEventListener( 'input', () => {
			window.clearTimeout( timer );
			timer = window.setTimeout( () => {
				state.q = input.value;
				apply();
			}, 120 );
		} );
		input.addEventListener( 'keydown', ( event ) => {
			if ( event.key === 'Escape' && input.value ) {
				event.stopPropagation();
				input.value = '';
				state.q = '';
				apply();
			} else if ( event.key === 'Enter' && sheetQuery.matches ) {
				event.preventDefault();
				closeSheet(); // eslint-disable-line no-use-before-define
			}
		} );
	}

	// "See also" links point at another term on the page: clear any filter
	// hiding it, then land it clear of the header.
	let marked = null;
	const jumpTo = ( target ) => {
		if ( target.hidden || target.closest( '[hidden]' ) ) {
			state.q = '';
			state.letter = '';
			state.topic = '';
			if ( input ) {
				input.value = '';
			}
			apply();
		}
		const top =
			target.getBoundingClientRect().top +
			window.scrollY -
			pinnedBottom( root ) -
			16;
		window.scrollTo( { top: Math.max( 0, top ), behavior: motion() } );
		if ( marked ) {
			marked.classList.remove( 'is-target' );
		}
		marked = target.matches( '.glossary-term' ) ? target : null;
		if ( marked ) {
			marked.classList.add( 'is-target' );
		}
	};
	root.querySelector( '.glossary-main' ).addEventListener(
		'click',
		( event ) => {
			const link = event.target.closest( 'a[href^="#"]' );
			if ( ! link ) {
				return;
			}
			const target = document.getElementById(
				decodeURIComponent( link.getAttribute( 'href' ).slice( 1 ) )
			);
			if ( ! target || ! root.contains( target ) ) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			jumpTo( target );
		}
	);

	// The rail as a sheet on phones.
	let lastFocus = null;
	const focusables = () =>
		Array.from(
			rail.querySelectorAll(
				'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
			)
		).filter(
			( el ) =>
				! el.closest( '[hidden]' ) &&
				( el.checkVisibility
					? el.checkVisibility()
					: el.getClientRects().length > 0 )
		);
	function openSheet() {
		if ( ! sheetQuery.matches ) {
			return;
		}
		lastFocus = document.activeElement;
		root.classList.add( 'is-sheet-open' );
		document.documentElement.classList.add( 'glossary-sheet-lock' );
		rail.setAttribute( 'role', 'dialog' );
		rail.setAttribute( 'aria-modal', 'true' );
		if ( openButton ) {
			openButton.setAttribute( 'aria-expanded', 'true' );
		}
		const first = input && ! input.closest( '[hidden]' ) ? input : focusables()[ 0 ];
		if ( first ) {
			first.focus( { preventScroll: true } );
		}
	}
	function closeSheet() {
		if ( ! root.classList.contains( 'is-sheet-open' ) ) {
			return;
		}
		root.classList.remove( 'is-sheet-open' );
		document.documentElement.classList.remove( 'glossary-sheet-lock' );
		rail.removeAttribute( 'role' );
		rail.removeAttribute( 'aria-modal' );
		if ( openButton ) {
			openButton.setAttribute( 'aria-expanded', 'false' );
		}
		if ( lastFocus && lastFocus.focus ) {
			lastFocus.focus( { preventScroll: true } );
		}
	}
	if ( openButton ) {
		openButton.addEventListener( 'click', openSheet );
	}
	if ( closeButton ) {
		closeButton.addEventListener( 'click', closeSheet );
	}
	if ( showButton ) {
		showButton.addEventListener( 'click', () => {
			closeSheet();
			if ( lastShown > 0 && main ) {
				main.scrollIntoView( { behavior: motion(), block: 'start' } );
			}
		} );
	}
	root.addEventListener( 'click', ( event ) => {
		if (
			root.classList.contains( 'is-sheet-open' ) &&
			event.target === rail.parentElement
		) {
			closeSheet();
		}
	} );
	document.addEventListener( 'keydown', ( event ) => {
		if ( ! root.classList.contains( 'is-sheet-open' ) ) {
			return;
		}
		if ( event.key === 'Escape' ) {
			event.preventDefault();
			closeSheet();
			return;
		}
		if ( event.key === 'Tab' ) {
			const list = focusables();
			if ( ! list.length ) {
				return;
			}
			const first = list[ 0 ];
			const last = list[ list.length - 1 ];
			if ( event.shiftKey && document.activeElement === first ) {
				event.preventDefault();
				last.focus();
			} else if ( ! event.shiftKey && document.activeElement === last ) {
				event.preventDefault();
				first.focus();
			} else if ( ! rail.contains( document.activeElement ) ) {
				event.preventDefault();
				first.focus();
			}
		}
	} );
	sheetQuery.addEventListener( 'change', () => {
		if ( ! sheetQuery.matches ) {
			closeSheet();
		}
	} );

	// The rail sits under whatever is pinned to the top of the page.
	let offset = -1;
	const setOffset = () => {
		const next = pinnedBottom( root );
		if ( next !== offset ) {
			offset = next;
			root.style.setProperty( '--glossary-sticky-top', offset + 'px' );
		}
	};
	let ticking = false;
	window.addEventListener(
		'scroll',
		() => {
			if ( ticking ) {
				return;
			}
			ticking = true;
			window.requestAnimationFrame( () => {
				ticking = false;
				setOffset();
			} );
		},
		{ passive: true }
	);
	window.addEventListener( 'resize', setOffset );
	setOffset();

	apply();
	root.classList.add( 'is-ready' );

	// Arriving with a #term in the address: land it clear of the header.
	if ( window.location.hash.length > 1 ) {
		const target = document.getElementById(
			decodeURIComponent( window.location.hash.slice( 1 ) )
		);
		if ( target && root.contains( target ) ) {
			if ( target.matches( '.glossary-letter' ) && ! state.letter ) {
				state.letter = target.dataset.letter;
				apply();
			} else {
				window.requestAnimationFrame( () => jumpTo( target ) );
			}
		}
	}
}
