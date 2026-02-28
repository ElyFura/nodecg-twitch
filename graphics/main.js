const currentAlert = nodecg.Replicant('currentAlert');
const alertConfig = nodecg.Replicant('alertConfig');

const alertContainer = document.getElementById('alert-container');
const alertBox = document.getElementById('alert-box');
const alertIcon = document.getElementById('alert-icon');
const alertTypeLabel = document.getElementById('alert-type-label');
const alertUsername = document.getElementById('alert-username');
const alertMessage = document.getElementById('alert-message');
const alertAccentBar = document.getElementById('alert-accent-bar');
const alertBgOverlay = document.getElementById('alert-bg-overlay');
const alertBgVideo = document.getElementById('alert-bg-video');

const TYPE_INFO = {
	follow: { label: 'Neuer Follower', icon: '❤️' },
	sub: { label: 'Neuer Sub', icon: '⭐' },
	resub: { label: 'Resub', icon: '🌟' },
	subgift: { label: 'Gift Sub', icon: '🎁' },
	bits: { label: 'Bits', icon: '💎' },
	raid: { label: 'Raid', icon: '🚀' },
	channelpoints: { label: 'Channel Points', icon: '🏆' },
};

function hexToRgba(hex, alpha) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

let isShowing = false;
let hideTimeout = null;
let customStyleEl = null;

// --- Google Fonts loader ---
const loadedFonts = new Set();
function loadGoogleFont(fontFamily) {
	if (!fontFamily || loadedFonts.has(fontFamily)) return;
	loadedFonts.add(fontFamily);
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;700;800&display=swap`;
	document.head.appendChild(link);
}

// --- Position helper ---
function applyPosition(position) {
	// Reset all positioning
	alertContainer.style.top = '';
	alertContainer.style.bottom = '';
	alertContainer.style.left = '';
	alertContainer.style.right = '';
	alertContainer.style.transform = '';

	switch (position) {
		case 'top-left':
			alertContainer.style.top = '80px';
			alertContainer.style.left = '40px';
			break;
		case 'top-center':
			alertContainer.style.top = '80px';
			alertContainer.style.left = '50%';
			alertContainer.style.transform = 'translateX(-50%)';
			break;
		case 'top-right':
			alertContainer.style.top = '80px';
			alertContainer.style.right = '40px';
			break;
		case 'center':
			alertContainer.style.top = '50%';
			alertContainer.style.left = '50%';
			alertContainer.style.transform = 'translate(-50%, -50%)';
			break;
		case 'bottom-left':
			alertContainer.style.bottom = '80px';
			alertContainer.style.left = '40px';
			break;
		case 'bottom-right':
			alertContainer.style.bottom = '80px';
			alertContainer.style.right = '40px';
			break;
		case 'bottom-center':
		default:
			alertContainer.style.bottom = '80px';
			alertContainer.style.left = '50%';
			alertContainer.style.transform = 'translateX(-50%)';
			break;
	}
}

function escapeHtml(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatMessage(template, alert, accentColor) {
	if (!template) return '';
	const color = accentColor || '#b9a3e3';
	const wrap = (val) => `<span style="color:${color};font-weight:700">${escapeHtml(val)}</span>`;
	return escapeHtml(template)
		.replace(/\{username\}/g, wrap(alert.username || ''))
		.replace(/\{amount\}/g, wrap(String(alert.amount || 0)))
		.replace(/\{message\}/g, wrap(alert.message || ''))
		.replace(/\{tier\}/g, wrap(alert.tier || ''));
}

function showAlert(alert) {
	if (!alert || isShowing) return;

	isShowing = true;
	const config = (alertConfig.value && alertConfig.value[alert.type]) || {};
	const typeInfo = TYPE_INFO[alert.type] || { label: alert.type, icon: '🔔' };
	const animation = config.animation || 'slide';
	const duration = config.duration || 5000;
	const animInDuration = config.animationInDuration || 500;
	const animOutDuration = config.animationOutDuration || 400;

	// Apply position
	applyPosition(config.position || 'bottom-center');

	// Set icon (custom or default emoji)
	const iconUrl = config.iconUrl || '';
	if (iconUrl) {
		alertIcon.innerHTML = `<img src="${iconUrl}" style="width:36px;height:36px;object-fit:contain;" alt="" />`;
	} else {
		alertIcon.innerHTML = '';
		alertIcon.textContent = typeInfo.icon;
	}

	alertTypeLabel.textContent = typeInfo.label;
	const accentColor = config.accentColor || '#b9a3e3';
	alertUsername.textContent = alert.username;
	alertUsername.style.color = accentColor;
	const message = formatMessage(config.messageTemplate, alert, accentColor);
	alertMessage.innerHTML = message;
	alertMessage.style.display = message ? 'block' : 'none';

	// Remove old animation classes
	alertBox.className = 'visible';

	// Set colors and background image
	const bgColor = config.backgroundColor || '#6441a5';
	const bgImage = config.backgroundImage || '';
	const overlayOpacity = config.overlayOpacity !== undefined ? config.overlayOpacity : 0.7;

	// Video background
	const bgVideo = config.backgroundVideo || '';
	if (bgVideo) {
		alertBgVideo.src = bgVideo;
		alertBgVideo.style.display = 'block';
		alertBgVideo.play().catch(() => {});
		alertBox.style.backgroundColor = 'transparent';
		alertBox.style.backgroundImage = 'none';
		alertBox.classList.add('has-bg-image');
		alertBgOverlay.style.backgroundColor = hexToRgba(bgColor, overlayOpacity);
	} else if (bgImage) {
		alertBgVideo.style.display = 'none';
		alertBox.style.backgroundColor = 'transparent';
		alertBox.style.backgroundImage = `url(${bgImage})`;
		alertBox.classList.add('has-bg-image');
		alertBgOverlay.style.backgroundColor = hexToRgba(bgColor, overlayOpacity);
	} else {
		alertBgVideo.style.display = 'none';
		alertBox.style.backgroundColor = bgColor;
		alertBox.style.backgroundImage = 'none';
	}

	alertBox.style.color = config.textColor || '#ffffff';
	alertAccentBar.style.backgroundColor = config.accentColor || '#b9a3e3';

	// Font styling
	const fontFamily = config.fontFamily || '';
	if (fontFamily) {
		loadGoogleFont(fontFamily);
		alertBox.style.fontFamily = `'${fontFamily}', sans-serif`;
	} else {
		alertBox.style.fontFamily = '';
	}

	const fontSize = config.fontSize || 24;
	alertUsername.style.fontSize = fontSize + 'px';

	if (config.textShadow) {
		const shadowColor = config.textShadowColor || '#000000';
		alertBox.style.textShadow = `2px 2px 4px ${hexToRgba(shadowColor, 0.7)}`;
	} else {
		alertBox.style.textShadow = '';
	}

	if (config.textOutline) {
		const outlineColor = config.textOutlineColor || '#000000';
		alertUsername.style.webkitTextStroke = `1px ${hexToRgba(outlineColor, 0.5)}`;
	} else {
		alertUsername.style.webkitTextStroke = '';
	}

	// Play sound if enabled
	if (config.soundEnabled !== false) {
		try {
			const cue = nodecg.findCue(alert.type);
			if (cue && cue.file) {
				nodecg.playSound(alert.type);
			}
		} catch (err) {
			nodecg.log.warn('Sound playback failed:', alert.type, err);
		}
	}

	// TTS (Text-to-Speech)
	if (config.ttsEnabled && window.speechSynthesis) {
		const ttsText = (config.messageTemplate || '{username}')
			.replace(/\{username\}/g, alert.username || '')
			.replace(/\{amount\}/g, String(alert.amount || 0))
			.replace(/\{message\}/g, alert.message || '')
			.replace(/\{tier\}/g, alert.tier || '');
		if (ttsText.trim()) {
			const utterance = new SpeechSynthesisUtterance(ttsText);
			utterance.rate = config.ttsRate || 1;
			utterance.volume = config.ttsVolume !== undefined ? config.ttsVolume : 1;
			utterance.lang = 'de-DE';
			window.speechSynthesis.speak(utterance);
		}
	}

	// Inject custom CSS if defined
	if (customStyleEl) {
		customStyleEl.remove();
		customStyleEl = null;
	}
	if (config.customCss) {
		customStyleEl = document.createElement('style');
		customStyleEl.textContent = config.customCss;
		document.head.appendChild(customStyleEl);
	}

	// Set entrance animation duration
	alertBox.style.animationDuration = (animInDuration / 1000) + 's';

	// Trigger entrance animation
	requestAnimationFrame(() => {
		alertBox.classList.add(`anim-${animation}-in`);
	});

	// Schedule hide
	clearTimeout(hideTimeout);
	hideTimeout = setTimeout(() => {
		hideAlert(animation, animOutDuration);
	}, duration);
}

function hideAlert(animation, animOutDuration) {
	if (animOutDuration === undefined) animOutDuration = 400;

	// Cancel any ongoing TTS
	if (window.speechSynthesis) {
		window.speechSynthesis.cancel();
	}

	// Remove entrance animation, add exit
	alertBox.className = 'visible';
	alertBox.style.animationDuration = (animOutDuration / 1000) + 's';
	alertBox.classList.add(`anim-${animation}-out`);

	// After exit animation finishes, clean up
	setTimeout(() => {
		alertBox.className = '';
		alertBox.style.backgroundImage = 'none';
		alertBox.classList.remove('has-bg-image');
		alertBox.style.fontFamily = '';
		alertBox.style.textShadow = '';
		alertUsername.style.fontSize = '';
		alertUsername.style.webkitTextStroke = '';
		alertBox.style.animationDuration = '';
		if (customStyleEl) {
			customStyleEl.remove();
			customStyleEl = null;
		}
		alertBgVideo.pause();
		alertBgVideo.src = '';
		alertBgVideo.style.display = 'none';
		isShowing = false;

		// Signal to extension that we're done
		currentAlert.value = null;
	}, animOutDuration);
}

// Listen for alert changes
currentAlert.on('change', (newVal, oldVal) => {
	if (newVal && !isShowing) {
		showAlert(newVal);
	}
});

// Apply default position on load
applyPosition('bottom-center');

nodecg.log.info('Twitch Alert Overlay geladen.');
