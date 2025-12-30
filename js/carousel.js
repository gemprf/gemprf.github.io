// Carousel animation for hemispheres
document.addEventListener("DOMContentLoaded", () => {
	const carousel = document.getElementById("hemis-carousel");
	if (!carousel) return;

	const slides = Array.from(carousel.querySelectorAll(".carousel-item"));
	if (slides.length === 0) return;

	// Utility to switch visible slide
	const setActive = (idx) => {
		slides.forEach((el, i) => {
			if (i === idx) el.classList.add("active");
			else el.classList.remove("active");
		});
	};

	let currentIndex = 0;
	setActive(currentIndex);

	// Animation state for each slide
	let scale = 1;
	let dx = 0;
	let state = "run";
	let resetAt = 0;

	// Speeds
	const moveSpeed = 60; // px/s
	const zoomSpeed = 0.15; // scale units/s
	const resetPauseMs = 3500; // pause between slides (images ↔ text)

	let cHeight = carousel.getBoundingClientRect().height;
	let cWidth = carousel.getBoundingClientRect().width;

	// Wave canvas overlay sized to carousel (always visible)
	let waveCanvas = document.createElement('canvas');
	let waveCtx = null;
	let wavePhase = 0;
	waveCanvas.className = 'wave-canvas';
	waveCanvas.width = Math.floor(cWidth);
	waveCanvas.height = Math.floor(cHeight);
	carousel.appendChild(waveCanvas);
	waveCtx = waveCanvas.getContext('2d');

	// Resize handler to update canvas and recalculate dimensions
	const handleResize = () => {
		const newHeight = carousel.getBoundingClientRect().height;
		const newWidth = carousel.getBoundingClientRect().width;
		
		// Only update if dimensions actually changed
		if (newHeight !== cHeight || newWidth !== cWidth) {
			cHeight = newHeight;
			cWidth = newWidth;
			waveCanvas.width = Math.floor(cWidth);
			waveCanvas.height = Math.floor(cHeight);
			
			// Recalculate maxScale for current image slide
			if (leftImg && rightImg && leftImg.complete && rightImg.complete) {
				const baseDisplayHeight = leftImg.getBoundingClientRect().height;
				maxScale = Math.max(1, cHeight / baseDisplayHeight);
			}
		}
	};

	// Listen for window resize
	window.addEventListener('resize', handleResize);

	// Smooth noise helper (sum of sines)
	const noiseSeeds = [Math.random()*1000, Math.random()*2000, Math.random()*3000];
	const noise1D = (x, t, seedIdx) => {
		const s = noiseSeeds[seedIdx % noiseSeeds.length] || 0;
		return (
			Math.sin(x*0.022 + t*1.3 + s)*0.5 +
			Math.sin(x*0.006 + t*0.7 + s*1.2)*0.3 +
			Math.sin(x*0.011 + t*1.05 + s*2.1)*0.2
		);
	};

	// Per-slide helpers
	let leftImg = null;
	let rightImg = null;
	let textEl = null;
	let textEls = [];
	let maxScale = 1;
	let imageReady = false;
	let textStartTs = 0;
	// Text timing: show first, then reveal second under it, hold both, then fade out
	let firstHoldMs = 1800;
	let secondFadeInMs = 800;
	let secondHoldMs = 1600;
	let textFadeDurationMs = 1600; // fade both after hold

	const setupSlide = (idx) => {
		const slide = slides[idx];
		setActive(idx);
		scale = 1;
		dx = 0;
		state = "run";
		resetAt = 0;
		leftImg = null;
		rightImg = null;
		textEl = null;
		maxScale = 1;
		imageReady = false;
		// Keep global wave canvas; no cleanup between slides

		if (slide.classList.contains("item-images")) {
			leftImg = slide.querySelector(".hemi-img.left");
			rightImg = slide.querySelector(".hemi-img.right");
			if (!leftImg || !rightImg) return;

			// Reset transforms so we never carry over previous cycle state
			leftImg.style.transform = `translateY(-50%) translateX(0px) scale(1)`;
			rightImg.style.transform = `translateY(-50%) translateX(0px) scale(1)`;

			// Wait for image loads before measuring
			const wait = [];
			if (!leftImg.complete) wait.push(new Promise((r) => leftImg.onload = r));
			if (!rightImg.complete) wait.push(new Promise((r) => rightImg.onload = r));
			const ensure = wait.length ? Promise.all(wait) : Promise.resolve();

			ensure.then(() => {
				const baseDisplayHeight = leftImg.getBoundingClientRect().height; // share same CSS height
				maxScale = Math.max(1, cHeight / baseDisplayHeight);
				imageReady = true; // enable animation and completion checks
			});
		} else if (slide.classList.contains("item-text")) {
			// Use requested markup: .carousel-text with two .carousel-text-line items
			const lines = Array.from(slide.querySelectorAll('.carousel-text .carousel-text-line'));
			if (!lines.length) return;
			// Ensure order: first GPU-Empowered Mapping (text-line-2), then Highly Accurate (text-line-1)
			const gpuLine = lines.find(el => el.classList.contains('text-line-2')) || lines[0];
			const accLine = lines.find(el => el.classList.contains('text-line-1')) || lines[1] || lines[0];
			textEls = [gpuLine, accLine];

			// Initial visibility: show GPU, hide Accurate
			gpuLine.style.opacity = '1';
			accLine.style.opacity = '0';
			textEl = gpuLine; // for applyTransforms no-op
			textStartTs = performance.now();

			// Wave canvas already created and attached to carousel
		}
	};

	setupSlide(currentIndex);

	const applyTransforms = () => {
		if (leftImg && rightImg) {
			leftImg.style.transform = `translateY(-50%) translateX(${dx}px) scale(${scale})`;
			rightImg.style.transform = `translateY(-50%) translateX(${-dx}px) scale(${scale})`;
		} else if (textEl) {
			// Text lines are centered via CSS; no transform updates needed
		}
	};

	const edgesTouch = () => {
		if (!leftImg || !rightImg) return false;
		const lRect = leftImg.getBoundingClientRect();
		const rRect = rightImg.getBoundingClientRect();
		return lRect.right >= rRect.left;
	};

	let lastTs = performance.now();
	const step = (ts) => {
		const dt = (ts - lastTs) / 1000;
		lastTs = ts;

		// Draw animated waves every frame (always, regardless of state)
		if (waveCtx) {
			wavePhase += dt;
			waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
			const W = waveCanvas.width;
			const H = waveCanvas.height;
			const waves = [
				{ y: H*0.15, amp: 16, wl: 140, speed: 1.1, color: 'rgba(255,126,126,0.35)', noiseAmp: 4, driftAmp: 7, driftFreq: 0.45, spikeAmp: 8, spikeRate: 1.35, hfAmp: 4, hfFreq: 3.2, seed: 0 },
				{ y: H*0.30, amp: 18, wl: 170, speed: 0.9, color: 'rgba(255,178,102,0.32)', noiseAmp: 5, driftAmp: 6, driftFreq: 0.38, spikeAmp: 9, spikeRate: 1.15, hfAmp: 5, hfFreq: 2.8, seed: 1 },
				{ y: H*0.50, amp: 14, wl: 130, speed: 1.4, color: 'rgba(255,235,180,0.26)', noiseAmp: 4, driftAmp: 5, driftFreq: 0.42, spikeAmp: 7, spikeRate: 1.6, hfAmp: 3, hfFreq: 3.5, seed: 2 },
				{ y: H*0.70, amp: 16, wl: 155, speed: 1.05, color: 'rgba(255,178,102,0.30)', noiseAmp: 4, driftAmp: 6, driftFreq: 0.40, spikeAmp: 8, spikeRate: 1.25, hfAmp: 4, hfFreq: 3.0, seed: 3 },
				{ y: H*0.85, amp: 15, wl: 145, speed: 1.2, color: 'rgba(255,126,126,0.28)', noiseAmp: 5, driftAmp: 7, driftFreq: 0.48, spikeAmp: 9, spikeRate: 1.4, hfAmp: 4, hfFreq: 3.3, seed: 4 }
			];
			waves.forEach((w) => {
				waveCtx.beginPath();
				for (let x = 0; x <= W; x += 2) {
					const theta = (x / w.wl) * Math.PI * 2 + wavePhase * w.speed;
					const base = w.y + w.amp * Math.sin(theta);
					const drift = w.driftAmp * Math.sin(w.driftFreq * wavePhase + w.seed);
					const noise = w.noiseAmp * noise1D(x, wavePhase*0.6, w.seed);
					const spike = w.spikeAmp * Math.max(0, noise1D(x*0.4, wavePhase * w.spikeRate, w.seed+5));
					const hf = w.hfAmp * Math.sin(theta * w.hfFreq + wavePhase * 2.2);
					const y = base + drift + noise + spike + hf;
					if (x === 0) waveCtx.moveTo(x, y); else waveCtx.lineTo(x, y);
				}
				waveCtx.strokeStyle = w.color;
				waveCtx.lineWidth = 2.2;
				waveCtx.stroke();
			});
		}

		if (state === "run") {
			// Image slide: move + zoom linearly
			if (leftImg && rightImg && imageReady) {
				dx += moveSpeed * dt;
				scale = Math.min(maxScale, scale + zoomSpeed * dt);
			}
			// Text slide: fade out over duration
			if (textEls.length) {
				const elapsed = ts - textStartTs;
				const gpu = textEls[0];
				const acc = textEls[1] || null;

				// Phase 1: show GPU fully
				if (elapsed < firstHoldMs) {
					gpu.style.opacity = '1';
					if (acc) acc.style.opacity = '0';
				}
				// Phase 2: fade in Accurate under GPU
				else if (elapsed < (firstHoldMs + secondFadeInMs)) {
					const t = Math.min(1, (elapsed - firstHoldMs) / secondFadeInMs);
					gpu.style.opacity = '1';
					if (acc) acc.style.opacity = String(t);
				}
				// Phase 3: hold both fully visible
				else if (elapsed < (firstHoldMs + secondFadeInMs + secondHoldMs)) {
					gpu.style.opacity = '1';
					if (acc) acc.style.opacity = '1';
				}
				// Phase 4: fade both out
				else if (elapsed < (firstHoldMs + secondFadeInMs + secondHoldMs + textFadeDurationMs)) {
					const t = Math.min(1, (elapsed - (firstHoldMs + secondFadeInMs + secondHoldMs)) / textFadeDurationMs);
					const op = String(1 - t);
					gpu.style.opacity = op;
					if (acc) acc.style.opacity = op;
				}
			}

			applyTransforms();

			const done = (leftImg && rightImg)
				? (imageReady && (edgesTouch() || scale >= maxScale))
				: (() => {
					if (!textEls.length) return true;
					const total = firstHoldMs + secondFadeInMs + secondHoldMs + textFadeDurationMs;
					return (ts - textStartTs) >= total;
				})();
			if (done) {
				state = "reset";
				resetAt = ts + resetPauseMs;
			}
		} else if (state === "reset") {
			if (ts >= resetAt) {
				// Advance to next slide
				currentIndex = (currentIndex + 1) % slides.length;
				setupSlide(currentIndex);
			}
		}

		requestAnimationFrame(step);
	};

	// Initial draw & start
	applyTransforms();
	requestAnimationFrame(step);
});
