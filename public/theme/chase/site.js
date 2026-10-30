/*
 * Chase Centers front-end behaviour.
 *
 * Dependency-free replacement for the Kose theme's jQuery stack (kose.js,
 * Foundation top bar, Superfish, carouFredSel, niceScroll, WPBakery front JS
 * and the content-hide plugin). It reproduces only what these pages use, with
 * the same DOM output, timings and quirks so the site looks and behaves as
 * before.
 */
(() => {
	'use strict';

	const $ = (selector, root = document) => root.querySelector(selector);
	const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

	// jQuery's default "swing" easing and durations.
	const SWING = 'cubic-bezier(0.37, 0, 0.63, 1)';
	const NORMAL = 400;
	const MOBILE_MAX = 1161;

	const html = document.documentElement;
	const body = document.body;
	const rootContainer = $('#root-container');
	const contentContainer = $('#content-container');
	const innerContent = $('#inner-content-container');
	const toggleButton = $('#hide-toggle-button');
	const bullets = $('#full-scrn-bullets');
	const sideContainer = $('#side-container');
	const sideFooter = $('#side-footer-wrapper');

	const viewportWidth = () => html.clientWidth;
	const isMobile = () => viewportWidth() <= MOBILE_MAX;

	// Fades an element's opacity like jQuery's .stop().animate({opacity}),
	// leaving the final value as an inline style.
	const running = new WeakMap();

	function fade(el, to, duration = NORMAL, done) {
		if (!el) return;

		running.get(el)?.cancel();

		const from = getComputedStyle(el).opacity;
		const animation = el.animate([{ opacity: from }, { opacity: to }], { duration, easing: SWING });

		running.set(el, animation);
		el.style.opacity = String(to);

		animation.onfinish = () => {
			running.delete(el);
			done?.call(el);
		};
	}

	function fadeOutAndHide(el, duration) {
		fade(el, 0, duration, () => { el.style.display = 'none'; });
	}

	function showAndFadeIn(el, display, duration) {
		if (!el) return;
		el.style.display = display;
		fade(el, 1, duration);
	}


	/***** Page setup *****/

	if ($('.wpb-content-wrapper')) {
		html.className += ' js_active ' + ('ontouchstart' in html ? ' vc_mobile ' : ' vc_desktop ') + ' vc_transform ';
	}

	// The site starts with the content panel closed.
	toggleButton?.classList.add('rotated');

	if (contentContainer) {
		contentContainer.style.opacity = '0';
		contentContainer.style.display = 'none';
	}

	$('#menu-main')?.classList.add('sf-js-enabled', 'sf-arrows');

	const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent) && !window.chrome;

	if (isSafari) {
		$$('#menu-wrapper > ul > li.current-menu-item > a, #menu-wrapper > ul > li.current-menu-parent > a')
			.forEach((link) => link.classList.add('safari-fix'));
	}

	$$('p').filter((p) => !p.hasChildNodes()).forEach((p) => p.remove());


	/***** Mobile menu *****/

	const mobileList = document.createElement('ul');
	$('#mobile-menu .top-bar-section')?.append(mobileList);

	$$('#menu-wrapper > ul > li').forEach((item) => {
		const clone = item.cloneNode(true);

		$$('ul', clone).forEach((submenu) => {
			submenu.classList.add('dropdown');
			submenu.parentElement.classList.add('has-dropdown');
		});

		mobileList.append(clone);
	});

	$$('ul, li', mobileList).forEach((el) => el.removeAttribute('id'));

	$$('#mobile-menu .toggle-topbar').forEach((toggle) => {
		toggle.addEventListener('click', (event) => {
			event.preventDefault();
			$('#mobile-menu').classList.toggle('expanded');
			$('#mobile-menu').style.height = '';
		});
	});


	/***** Content scrollbar *****/

	// A thin auto-hiding scrollbar drawn over the content panel on desktop.
	const scrollbar = (() => {
		let rail;
		let cursor;
		let hideTimer;
		let hovering = false;
		let dragging = null;

		function update() {
			if (!rail) return;

			const viewHeight = innerContent.clientHeight;
			const scrollHeight = innerContent.scrollHeight;

			Object.assign(rail.style, {
				top: innerContent.offsetTop + 'px',
				left: (innerContent.offsetLeft + innerContent.offsetWidth - 3) + 'px',
				height: viewHeight + 'px',
			});

			if (rail.dataset.hidden || scrollHeight <= viewHeight) {
				rail.style.display = 'none';
				return;
			}

			const cursorHeight = Math.round(viewHeight * viewHeight / scrollHeight);
			const ratio = (viewHeight - cursorHeight) / (scrollHeight - viewHeight);

			rail.style.display = 'block';
			cursor.style.height = cursorHeight + 'px';
			cursor.style.top = Math.round(innerContent.scrollTop * ratio) + 'px';
		}

		function reveal() {
			if (!rail) return;

			clearTimeout(hideTimer);
			fade(rail, 1, 200);

			hideTimer = setTimeout(() => {
				if (!hovering && !dragging) fade(rail, 0, NORMAL);
			}, 1000);
		}

		function attach() {
			if (rail || !innerContent || isMobile()) return;

			innerContent.classList.add('chase-scroll');
			innerContent.tabIndex = 5000;
			innerContent.style.outline = 'none';

			rail = document.createElement('div');
			rail.id = 'ascrail2000';
			rail.className = 'nicescroll-rails';
			rail.style.cssText = 'width: 3px; z-index: 2; cursor: default; position: absolute; opacity: 0;';

			cursor = document.createElement('div');
			cursor.style.cssText = 'position: relative; top: 0px; float: right; width: 3px; height: 0px; background-color: '
				+ ThemeOptions.content_scrollbar_color + '; border: 0px; background-clip: padding-box; border-radius: 5px;';

			rail.append(cursor);
			innerContent.after(rail);

			innerContent.addEventListener('scroll', () => { update(); reveal(); }, { passive: true });

			rail.addEventListener('mouseenter', () => { hovering = true; reveal(); });
			rail.addEventListener('mouseleave', () => { hovering = false; reveal(); });

			cursor.addEventListener('pointerdown', (event) => {
				event.preventDefault();
				cursor.setPointerCapture(event.pointerId);
				dragging = { y: event.clientY, scrollTop: innerContent.scrollTop };
			});

			cursor.addEventListener('pointermove', (event) => {
				if (!dragging) return;

				const viewHeight = innerContent.clientHeight;
				const scrollHeight = innerContent.scrollHeight;
				const track = viewHeight - cursor.offsetHeight;

				innerContent.scrollTop = dragging.scrollTop + (event.clientY - dragging.y) * (scrollHeight - viewHeight) / track;
			});

			const endDrag = () => { dragging = null; reveal(); };
			cursor.addEventListener('pointerup', endDrag);
			cursor.addEventListener('pointercancel', endDrag);

			const observer = new ResizeObserver(update);
			observer.observe(innerContent);
			[...innerContent.children].forEach((child) => observer.observe(child));

			update();
		}

		return {
			attach,
			update,
			hide() {
				if (!rail) return;
				rail.dataset.hidden = '1';
				rail.style.display = 'none';
			},
			show() {
				if (!rail) return;
				delete rail.dataset.hidden;
				update();
			},
		};
	})();


	/***** Sidebar footer *****/

	sideFooter?.insertAdjacentHTML('beforeend',
		'<div id="scroll-down-notice">' + ThemeOptions.swipe_text + ' <i class="icon ion-ios-arrow-up"></i></div>');

	const notice = $('#scroll-down-notice');
	const footerItems = () => $$('#side-footer-wrapper #copyright, #side-footer-wrapper .bar-social');
	let isScrolled = false;
	let watchingScroll = false;

	function showNotice() {
		footerItems().forEach((el) => fadeOutAndHide(el, 10));
		showAndFadeIn(notice, 'inherit');
	}

	function showFooter() {
		footerItems().forEach((el) => showAndFadeIn(el, 'inherit'));
		fadeOutAndHide(notice, 10);
	}

	// On small screens the copyright makes way for a "swipe up" hint until the visitor scrolls.
	function showHideScrolldownNotice() {
		if (!contentContainer) {
			notice.style.display = 'none';
			return;
		}

		if (!isMobile()) {
			showFooter();
			return;
		}

		if (!isScrolled) showNotice();

		if (!watchingScroll) {
			watchingScroll = true;

			window.addEventListener('scroll', () => {
				isScrolled = window.scrollY > 150;
				isScrolled ? showFooter() : showNotice();
			}, { passive: true });
		}
	}

	function setSidebarFooter() {
		if (!sideFooter) return;

		if (isMobile()) {
			sideContainer.after(sideFooter);
			$$('#copyright br').forEach((br) => br.replaceWith(Object.assign(document.createElement('span'), { className: 'blank' })));
		} else {
			sideContainer.append(sideFooter);
			$$('#copyright span.blank').forEach((span) => span.replaceWith(document.createElement('br')));
		}
	}


	/***** Content area *****/

	let isContentHidden = false;

	function hideContent() {
		scrollbar.hide();

		fade(contentContainer, 0, NORMAL, () => {
			contentContainer.style.display = 'none';
			rootContainer.style.zIndex = 'auto';
			fade(bullets, 1);
		});

		toggleButton.className = 'rotated';
		isContentHidden = true;
	}

	function showContent() {
		scrollbar.show();

		contentContainer.style.display = 'block';
		fade(contentContainer, 1);
		contentContainer.classList.remove('hidden-content');

		rootContainer.style.zIndex = '2';

		[bullets, ...$$('.slide-caption-wrapper')].forEach((el) => fade(el, 0));

		toggleButton.className = '';
		isContentHidden = false;

		scrollbar.update();
	}

	// Small screens always show the content below the slider.
	function displayContentAreaForMobile() {
		if (!contentContainer || !isMobile()) return;

		contentContainer.style.display = 'block';
		fade(contentContainer, 1);
		contentContainer.classList.remove('hidden-content');

		rootContainer.style.zIndex = '2';
		fade(bullets, 1);

		toggleButton.className = '';
		isContentHidden = false;

		scrollbar.update();
	}

	if (!contentContainer) {
		rootContainer.style.zIndex = 'auto';
	} else {
		// The panel starts closed (see "Page setup"), so start in the same state
		// hideContent() leaves behind; otherwise the first click "hides" it again.
		isContentHidden = true;
		rootContainer.style.zIndex = 'auto';
		fade(bullets, 1);
	}

	toggleButton?.addEventListener('click', () => {
		isContentHidden ? showContent() : hideContent();
	});

	if (contentContainer?.classList.contains('hidden-content')) {
		hideContent();
	}


	/***** Full screen slider *****/

	function initSlider() {
		const slider = $('#full-scrn-slider');
		const slides = $$('.full-scrn-slide', slider);

		if (!slider || !slides.length) return;

		const delay = slider.dataset.autoRotation === '0' ? 0 : parseInt(slider.dataset.autoRotation, 10);
		const speed = parseInt(slider.dataset.transitionSpeed, 10);

		const wrapper = document.createElement('div');
		wrapper.className = 'caroufredsel_wrapper';
		wrapper.style.cssText = 'position: relative; overflow: hidden; width: 100%; margin: 0px;';
		slider.before(wrapper);
		wrapper.append(slider);

		Object.assign(slider.style, { position: 'absolute', inset: '0px', margin: '0px', width: '100%' });

		slides.forEach((slide, index) => {
			Object.assign(slide.style, { position: 'absolute', inset: '0px', width: '100%', zIndex: index === 0 ? '3' : '2' });
		});

		$('#loading-bg').style.display = 'none';
		fade(slides[0], 1, 800);

		const dummy = $('#dummy-slide-image');
		if (dummy) {
			slides[0].prepend(dummy);
			dummy.style.backgroundImage = 'url("' + slides[0].dataset.imageUrl + '")';
		}

		if (!contentContainer) fade(bullets, 1);

		let current = 0;
		let busy = false;
		let queued = null;

		// A single image gets no bullets, matching carouFredSel.
		const links = slides.length < 2 ? [] : slides.map((slide, index) => {
			const link = document.createElement('a');
			link.href = 'javascript:;' + (index + 1);
			link.setAttribute('aria-label', 'Show image ' + (index + 1));
			link.addEventListener('click', (event) => {
				event.preventDefault();
				go(index);
			});
			bullets.append(link);
			return link;
		});

		if (links.length) links[0].className = 'selected';
		bullets.style.marginLeft = (bullets.offsetWidth / 2 * -1) + 'px';

		function go(index) {
			index = (index + slides.length) % slides.length;

			if (busy) {
				queued = index;
				return;
			}

			if (index === current) return;

			busy = true;

			const outgoing = slides[current];
			const incoming = slides[index];

			links[current].className = '';
			links[index].className = 'selected';
			current = index;

			loadSlide(incoming).then(() => {
				incoming.style.zIndex = '4';
				incoming.style.opacity = '0';

				fade(incoming, 1, speed, () => {
					outgoing.style.zIndex = '2';
					outgoing.style.opacity = '0';
					incoming.style.zIndex = '3';
					busy = false;

					if (queued !== null) {
						const next = queued;
						queued = null;
						go(next);
					} else {
						preloadNext();
						schedule();
					}
				});
			});
		}

		const preloadNext = () => {
			if (slides.length > 1) loadSlide(slides[(current + 1) % slides.length]);
		};

		// Auto rotation pauses while hovered and resumes with the time that was left.
		let timer;
		let startedAt;
		let remaining = delay;
		let paused = false;

		function schedule(ms = delay) {
			clearTimeout(timer);
			if (!delay || paused) return;

			remaining = ms;
			startedAt = Date.now();
			timer = setTimeout(() => go(current + 1), ms);
		}

		slider.addEventListener('mouseenter', () => {
			paused = true;
			clearTimeout(timer);
			remaining = Math.max(0, remaining - (Date.now() - startedAt));
		});

		slider.addEventListener('mouseleave', () => {
			paused = false;
			if (!busy) schedule(remaining);
		});

		let touchStart = null;

		slider.addEventListener('touchstart', (event) => {
			touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
		}, { passive: true });

		slider.addEventListener('touchend', (event) => {
			if (!touchStart) return;

			const dx = event.changedTouches[0].clientX - touchStart.x;
			const dy = event.changedTouches[0].clientY - touchStart.y;
			touchStart = null;

			if (Math.abs(dx) >= 75 && Math.abs(dx) > Math.abs(dy)) {
				go(dx < 0 ? current + 1 : current - 1);
			}
		}, { passive: true });

		schedule();

		// Fetch the second image once the page itself has finished loading.
		if (document.readyState === 'complete') {
			preloadNext();
		} else {
			window.addEventListener('load', preloadNext, { once: true });
		}
	}

	// Loads a slide's image (only the first has its source set in the HTML) and
	// shows it as the slide's background, using the size the browser picked.
	const slideLoads = new WeakMap();

	function loadSlide(slide) {
		if (!slideLoads.has(slide)) {
			const img = $('img', slide);

			slideLoads.set(slide, !img ? Promise.resolve() : new Promise((resolve) => {
				const done = () => {
					const src = img.currentSrc || img.getAttribute('src');

					if (src) {
						slide.style.backgroundImage = 'url("' + src + '")';
						slide.dataset.imageUrl = src;
					}

					img.remove();
					resolve();
				};

				if (!img.getAttribute('src') && img.dataset.src) {
					if (img.dataset.srcset) img.srcset = img.dataset.srcset;
					img.src = img.dataset.src;
				}

				if (img.complete) {
					done();
				} else {
					img.addEventListener('load', done, { once: true });
					img.addEventListener('error', done, { once: true });
				}
			}));
		}

		return slideLoads.get(slide);
	}

	const firstSlide = $('#full-scrn-slider .full-scrn-slide');

	if (firstSlide) loadSlide(firstSlide).then(initSlider);


	/***** Google Maps *****/

	// Maps ignore the mouse until clicked so they don't hijack scrolling.
	$$('.wpb_gmaps_widget').forEach((widget) => {
		const frames = $$('iframe', widget);
		const setPointer = (value) => frames.forEach((frame) => { frame.style.pointerEvents = value; });

		setPointer('none');
		widget.addEventListener('click', () => setPointer('auto'));
		widget.addEventListener('mouseleave', () => setPointer('none'));
	});

	// Maps load once they're about to scroll into view (or the content panel opens).
	const mapObserver = new IntersectionObserver((entries) => {
		entries.filter((entry) => entry.isIntersecting).forEach(({ target }) => {
			target.src = target.dataset.src;
			mapObserver.unobserve(target);
		});
	}, { rootMargin: '300px' });

	$$('.wpb_gmaps_widget iframe[data-src]').forEach((frame) => mapObserver.observe(frame));


	/***** Responsive *****/

	function layout() {
		showHideScrolldownNotice();
		scrollbar.attach();
		setSidebarFooter();
		displayContentAreaForMobile();
	}

	layout();

	window.addEventListener('resize', () => {
		layout();
		scrollbar.update();

		if (!isMobile() && !isContentHidden && contentContainer) {
			fade(bullets, 0);
		}
	});
})();
