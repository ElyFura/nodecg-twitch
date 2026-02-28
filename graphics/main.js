const currentAlert = nodecg.Replicant('currentAlert');
const alertConfig = nodecg.Replicant('alertConfig');

const alertBox = document.getElementById('alert-box');
const alertIcon = document.getElementById('alert-icon');
const alertTypeLabel = document.getElementById('alert-type-label');
const alertUsername = document.getElementById('alert-username');
const alertMessage = document.getElementById('alert-message');
const alertAccentBar = document.getElementById('alert-accent-bar');
const alertBgOverlay = document.getElementById('alert-bg-overlay');

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

function formatMessage(template, alert) {
	if (!template) return '';
	return template
		.replace(/{username}/g, alert.username || '')
		.replace(/{amount}/g, String(alert.amount || 0))
		.replace(/{message}/g, alert.message || '')
		.replace(/{tier}/g, alert.tier || '');
}

function showAlert(alert) {
	if (!alert || isShowing) return;

	isShowing = true;
	const config = (alertConfig.value && alertConfig.value[alert.type]) || {};
	const typeInfo = TYPE_INFO[alert.type] || { label: alert.type, icon: '🔔' };
	const animation = config.animation || 'slide';
	const duration = config.duration || 5000;

	// Set content
	alertIcon.textContent = typeInfo.icon;
	alertTypeLabel.textContent = typeInfo.label;
	alertUsername.textContent = alert.username;

	const message = formatMessage(config.messageTemplate, alert);
	alertMessage.textContent = message;
	alertMessage.style.display = message ? 'block' : 'none';

	// Remove old animation classes
	alertBox.className = 'visible';

	// Set colors and background image
	const bgColor = config.backgroundColor || '#6441a5';
	const bgImage = config.backgroundImage || '';

	if (bgImage) {
		alertBox.style.backgroundColor = 'transparent';
		alertBox.style.backgroundImage = `url(${bgImage})`;
		alertBox.classList.add('has-bg-image');
		alertBgOverlay.style.backgroundColor = hexToRgba(bgColor, 0.7);
	} else {
		alertBox.style.backgroundColor = bgColor;
		alertBox.style.backgroundImage = 'none';
	}

	alertBox.style.color = config.textColor || '#ffffff';
	alertAccentBar.style.backgroundColor = config.accentColor || '#b9a3e3';

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

	// Trigger entrance animation
	requestAnimationFrame(() => {
		alertBox.classList.add(`anim-${animation}-in`);
	});

	// Schedule hide
	clearTimeout(hideTimeout);
	hideTimeout = setTimeout(() => {
		hideAlert(animation);
	}, duration);
}

function hideAlert(animation) {
	// Remove entrance animation, add exit
	alertBox.className = 'visible';
	alertBox.classList.add(`anim-${animation}-out`);

	// After exit animation finishes, clean up
	setTimeout(() => {
		alertBox.className = '';
		alertBox.style.backgroundImage = 'none';
		alertBox.classList.remove('has-bg-image');
		isShowing = false;

		// Signal to extension that we're done
		currentAlert.value = null;
	}, 500);
}

// Listen for alert changes
currentAlert.on('change', (newVal, oldVal) => {
	if (newVal && !isShowing) {
		showAlert(newVal);
	}
});

nodecg.log.info('Twitch Alert Overlay geladen.');
