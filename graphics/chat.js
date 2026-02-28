const chatConfig = nodecg.Replicant('chatConfig');
const chatMessages = nodecg.Replicant('chatMessages');

const container = document.getElementById('chat-container');
const messagesEl = document.getElementById('chat-messages');

let lastRenderedCount = 0;
const fadeTimers = new Map();
let currentConfig = null;
let loadedFont = '';

function hexToRgba(hex, alpha) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function applyConfig(config) {
	if (!config) return;
	currentConfig = config;

	// Position
	const positions = {
		'top-left': { top: '20px', left: '20px', bottom: '', right: '' },
		'top-right': { top: '20px', right: '20px', bottom: '', left: '' },
		'bottom-left': { bottom: '20px', left: '20px', top: '', right: '' },
		'bottom-right': { bottom: '20px', right: '20px', top: '', left: '' },
		'custom': { top: config.customY + 'px', left: config.customX + 'px', bottom: '', right: '' },
	};
	const pos = positions[config.position] || positions['bottom-right'];
	container.style.top = pos.top || '';
	container.style.left = pos.left || '';
	container.style.bottom = pos.bottom || '';
	container.style.right = pos.right || '';

	// Size
	container.style.width = config.width + 'px';
	container.style.height = config.height + 'px';

	// Background
	container.style.backgroundColor = hexToRgba(config.backgroundColor || '#000000', config.backgroundOpacity ?? 0.6);
	container.style.borderRadius = (config.borderRadius || 0) + 'px';

	// Font
	if (config.fontFamily && config.fontFamily !== loadedFont) {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(config.fontFamily)}&display=swap`;
		document.head.appendChild(link);
		loadedFont = config.fontFamily;
	}
	container.style.fontFamily = config.fontFamily ? `'${config.fontFamily}', sans-serif` : '';
	container.style.fontSize = (config.fontSize || 16) + 'px';
	container.style.color = config.textColor || '#ffffff';

	// Visibility
	container.style.display = config.enabled ? '' : 'none';
}

function renderMessageHtml(msg, config) {
	const parts = [];

	// Timestamp
	if (config.showTimestamps) {
		const date = new Date(msg.timestamp);
		const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
		parts.push(`<span class="chat-timestamp">${time}</span>`);
	}

	// Badges (array of { id, url })
	if (config.showBadges && Array.isArray(msg.badges) && msg.badges.length > 0) {
		const badgeHtml = msg.badges.map((b) =>
			`<img class="chat-badge" src="${escapeHtml(b.url)}" alt="${escapeHtml(b.id)}" />`
		).join('');
		parts.push(`<span class="chat-badges">${badgeHtml}</span>`);
	}

	// Username
	let nameColor = config.defaultUsernameColor || '#b9a3e3';
	if (config.useTwitchColors && msg.color) {
		nameColor = msg.color;
	}
	parts.push(`<span class="chat-username" style="color:${escapeHtml(nameColor)}">${escapeHtml(msg.displayName)}</span>`);
	parts.push(`<span class="chat-separator">: </span>`);

	// Text with emotes
	if (msg.fragments && msg.fragments.length > 0 && config.showEmotes) {
		const textParts = msg.fragments.map((frag) => {
			if (frag.type === 'emote' && frag.emoteId) {
				return `<img class="chat-emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${frag.emoteId}/default/dark/1.0" alt="${escapeHtml(frag.text)}" title="${escapeHtml(frag.text)}" />`;
			}
			return escapeHtml(frag.text);
		});
		parts.push(`<span class="chat-text">${textParts.join('')}</span>`);
	} else {
		parts.push(`<span class="chat-text">${escapeHtml(msg.text)}</span>`);
	}

	return parts.join('');
}

function addMessageElement(msg, config) {
	const el = document.createElement('div');
	el.className = 'chat-message';
	el.dataset.msgId = msg.id;
	el.style.marginBottom = (config.messageSpacing || 4) + 'px';

	// Animation class
	const animClass = 'anim-' + (config.animation || 'slide');
	el.classList.add(animClass);

	el.innerHTML = renderMessageHtml(msg, config);
	messagesEl.appendChild(el);

	// Fade-out timer
	if (config.fadeOutSeconds > 0) {
		const fadeMs = config.fadeOutSeconds * 1000;
		const timer = setTimeout(() => {
			el.classList.add('fading-out');
			setTimeout(() => {
				el.remove();
				fadeTimers.delete(msg.id);
			}, 500);
		}, fadeMs);
		fadeTimers.set(msg.id, timer);
	}

	// Enforce max visible messages
	const maxMsg = config.maxMessages || 25;
	while (messagesEl.children.length > maxMsg) {
		const first = messagesEl.firstElementChild;
		if (first) {
			const id = first.dataset.msgId;
			if (fadeTimers.has(id)) {
				clearTimeout(fadeTimers.get(id));
				fadeTimers.delete(id);
			}
			first.remove();
		}
	}
}

function fullRerender(messages, config) {
	// Clear timers
	for (const timer of fadeTimers.values()) {
		clearTimeout(timer);
	}
	fadeTimers.clear();
	messagesEl.innerHTML = '';

	if (!messages || !config) return;

	const maxMsg = config.maxMessages || 25;
	const visible = messages.slice(-maxMsg);
	visible.forEach((msg) => addMessageElement(msg, config));
	lastRenderedCount = messages.length;
}

// --- Wait for both replicants, then attach listeners ---

NodeCG.waitForReplicants(chatConfig, chatMessages).then(() => {
	applyConfig(chatConfig.value);
	fullRerender(chatMessages.value, chatConfig.value);

	chatConfig.on('change', (newVal) => {
		applyConfig(newVal);
		fullRerender(chatMessages.value, newVal);
	});

	chatMessages.on('change', (newVal, oldVal) => {
		const config = chatConfig.value;
		if (!config || !newVal) return;

		// If the array was cleared or shrunk drastically, full re-render
		if (!oldVal || newVal.length === 0 || newVal.length < lastRenderedCount - 5) {
			fullRerender(newVal, config);
			return;
		}

		// Incremental: only append new messages
		const newMessages = newVal.slice(lastRenderedCount);
		newMessages.forEach((msg) => addMessageElement(msg, config));
		lastRenderedCount = newVal.length;
	});
});
