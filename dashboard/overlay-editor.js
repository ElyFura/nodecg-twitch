const alertConfig = nodecg.Replicant('alertConfig');
const alertBackgrounds = nodecg.Replicant('assets:alert-backgrounds');
const alertIcons = nodecg.Replicant('assets:alert-icons');
const alertVideos = nodecg.Replicant('assets:alert-videos');

const ALERT_TYPES = [
	{ key: 'follow', label: 'Follow', color: '#6441a5' },
	{ key: 'sub', label: 'Subscription', color: '#6441a5' },
	{ key: 'resub', label: 'Resub', color: '#6441a5' },
	{ key: 'subgift', label: 'Gift Sub', color: '#6441a5' },
	{ key: 'bits', label: 'Bits / Cheers', color: '#ff8c00' },
	{ key: 'raid', label: 'Raid', color: '#e91916' },
	{ key: 'channelpoints', label: 'Channel Points', color: '#00c896' },
];

const TYPE_INFO = {
	follow: { label: 'Neuer Follower', icon: '\u2764\uFE0F' },
	sub: { label: 'Neuer Sub', icon: '\u2B50' },
	resub: { label: 'Resub', icon: '\uD83C\uDF1F' },
	subgift: { label: 'Gift Sub', icon: '\uD83C\uDF81' },
	bits: { label: 'Bits', icon: '\uD83D\uDC8E' },
	raid: { label: 'Raid', icon: '\uD83D\uDE80' },
	channelpoints: { label: 'Channel Points', icon: '\uD83C\uDFC6' },
};

const DEFAULT_PRIORITIES = {
	follow: 3,
	sub: 6,
	resub: 6,
	subgift: 7,
	bits: 5,
	raid: 8,
	channelpoints: 2,
};

const FONT_OPTIONS = [
	{ value: '', label: 'System-Standard' },
	{ value: 'Roboto', label: 'Roboto' },
	{ value: 'Open Sans', label: 'Open Sans' },
	{ value: 'Montserrat', label: 'Montserrat' },
	{ value: 'Poppins', label: 'Poppins' },
	{ value: 'Oswald', label: 'Oswald' },
	{ value: 'Bangers', label: 'Bangers' },
	{ value: 'Permanent Marker', label: 'Permanent Marker' },
	{ value: 'Press Start 2P', label: 'Press Start 2P' },
	{ value: 'Fredoka One', label: 'Fredoka One' },
	{ value: 'Outfit', label: 'Outfit' }
];

const PREVIEW_SAMPLE = {
	username: 'TestUser',
	amount: 12,
	message: 'Toller Stream!',
	tier: '1',
};

const container = document.getElementById('alert-types');
const btnSave = document.getElementById('btn-save-config');
const btnSaveTop = document.getElementById('btn-save-config-top');

function hexToRgba(hex, alpha) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatPreviewMessage(template, data, accentColor) {
	if (!template) return '';
	const color = accentColor || '#b9a3e3';
	const wrap = (val) => `<span style="color:${color};font-weight:700">${escapeHtml(val)}</span>`;
	return escapeHtml(template)
		.replace(/\{username\}/g, wrap(data.username || ''))
		.replace(/\{amount\}/g, wrap(String(data.amount || 0)))
		.replace(/\{message\}/g, wrap(data.message || ''))
		.replace(/\{tier\}/g, wrap(data.tier || ''));
}

function buildFontOptions() {
	return FONT_OPTIONS.map((f) =>
		`<option value="${f.value}" style="${f.value ? `font-family:'${f.value}'` : ''}">${f.label}</option>`
	).join('');
}

function buildPositionOptions() {
	return `
		<option value="top-left">Oben Links</option>
		<option value="top-center">Oben Mitte</option>
		<option value="top-right">Oben Rechts</option>
		<option value="center">Mitte</option>
		<option value="bottom-left">Unten Links</option>
		<option value="bottom-center">Unten Mitte</option>
		<option value="bottom-right">Unten Rechts</option>
	`;
}

function buildEditorUI() {
	container.innerHTML = ALERT_TYPES.map(({ key, label, color }) => {
		const info = TYPE_INFO[key] || { label: key, icon: '\uD83D\uDD14' };
		return `
		<div class="card alert-type-section" data-type="${key}">
			<div class="alert-type-header">
				<span class="alert-type-badge" style="background:${color};color:#fff;">${label}</span>
				<h3>${label}</h3>
				<label class="toggle" style="margin-bottom:0;">
					<input type="checkbox" data-field="enabled" autocomplete="off" />
					<span class="toggle-slider"></span>
				</label>
			</div>

			<div class="config-row">
				<label>Dauer (Sek.)</label>
				<input type="number" data-field="duration" min="1" max="30" step="0.5" value="5" style="max-width:80px;" />
			</div>

			<div class="config-row">
				<label>Nachricht</label>
				<input type="text" data-field="messageTemplate" placeholder="{username} ..." />
			</div>

			<div class="config-row">
				<label>Animation</label>
				<select data-field="animation">
					<option value="slide">Slide</option>
					<option value="fade">Fade</option>
					<option value="bounce">Bounce</option>
				</select>
			</div>

			<div class="config-row">
				<label>Position</label>
				<select data-field="position">
					${buildPositionOptions()}
				</select>
			</div>

			<div class="config-row">
				<label>Hintergrund</label>
				<select data-field="backgroundImage">
					<option value="">Keine (Nur Farbe)</option>
				</select>
			</div>

			<div class="config-row">
				<label>Icon</label>
				<select data-field="iconUrl">
					<option value="">Standard-Emoji</option>
				</select>
			</div>

			<div class="config-row">
				<label>Farben</label>
				<div class="color-group">
					<label>Hintergrund</label>
					<input type="color" data-field="backgroundColor" value="${color}" />
					<label>Text</label>
					<input type="color" data-field="textColor" value="#ffffff" />
					<label>Akzent</label>
					<input type="color" data-field="accentColor" value="#b9a3e3" />
				</div>
			</div>

			<div class="config-row">
				<label>Schriftart</label>
				<select data-field="fontFamily">
					${buildFontOptions()}
				</select>
			</div>

			<div class="config-row">
				<label>Schriftgröße</label>
				<input type="number" data-field="fontSize" min="12" max="72" step="1" value="24" style="max-width:80px;" />
				<span class="hint-text">px</span>
			</div>

			<div class="config-row">
				<label>Text-Effekte</label>
				<div class="toggle-group">
					<span class="toggle-label">Schatten</span>
					<label class="toggle" style="margin-bottom:0;">
						<input type="checkbox" data-field="textShadow" autocomplete="off" />
						<span class="toggle-slider"></span>
					</label>
					<input type="color" data-field="textShadowColor" value="#000000" title="Schattenfarbe" />
					<span class="toggle-label">Outline</span>
					<label class="toggle" style="margin-bottom:0;">
						<input type="checkbox" data-field="textOutline" autocomplete="off" />
						<span class="toggle-slider"></span>
					</label>
					<input type="color" data-field="textOutlineColor" value="#000000" title="Outlinefarbe" />
				</div>
			</div>

			<div class="config-row">
				<label>Overlay-Deckkraft</label>
				<input type="range" data-field="overlayOpacity" min="0" max="1" step="0.05" value="0.7" style="flex:1;" />
				<span class="range-value" data-label="overlayOpacity">0.70</span>
			</div>

			<div class="config-row">
				<label>Anim.-Speed</label>
				<span class="hint-text">Rein:</span>
				<input type="number" data-field="animationInDuration" min="100" max="3000" step="50" value="500" style="max-width:80px;" />
				<span class="hint-text">Raus:</span>
				<input type="number" data-field="animationOutDuration" min="100" max="3000" step="50" value="400" style="max-width:80px;" />
				<span class="hint-text">ms</span>
			</div>

			<div class="config-row">
				<label>Sound</label>
				<label class="toggle" style="margin-bottom:0;">
					<input type="checkbox" data-field="soundEnabled" autocomplete="off" />
					<span class="toggle-slider"></span>
				</label>
			</div>

			<div class="config-row">
				<label>Priorität</label>
				<input type="number" data-field="priority" min="1" max="10" step="1" value="${DEFAULT_PRIORITIES[key] || 5}" style="max-width:80px;" />
				<span class="hint-text">1 (niedrig) – 10 (hoch)</span>
			</div>

			<div class="config-row" style="align-items:flex-start;">
				<label>Custom CSS</label>
				<textarea data-field="customCss" rows="3" style="flex:1;font-family:monospace;font-size:12px;resize:vertical;" placeholder="#alert-box { border: 3px solid gold; }&#10;.alert-username { text-transform: uppercase; }"></textarea>
			</div>

			<div class="config-row">
				<label>Min. Amount</label>
				<input type="number" data-field="minAmount" min="0" step="1" value="0" style="max-width:80px;" />
				<span class="hint-text">0 = kein Filter</span>
			</div>

			<div class="config-row">
				<label>Min. Tier</label>
				<select data-field="minTier" style="max-width:140px;">
					<option value="">Alle Tiers</option>
					<option value="1000">Tier 1+</option>
					<option value="2000">Tier 2+</option>
					<option value="3000">Nur Tier 3</option>
				</select>
			</div>

			<div class="config-row">
				<label>Cooldown</label>
				<input type="number" data-field="cooldown" min="0" step="1" value="0" style="max-width:80px;" />
				<span class="hint-text">Sekunden (0 = kein Cooldown)</span>
			</div>

			<div class="config-row">
				<label>Video-BG</label>
				<select data-field="backgroundVideo">
					<option value="">Kein Video</option>
				</select>
			</div>

			<div class="config-row">
				<label>TTS</label>
				<div class="toggle-group">
					<label class="toggle" style="margin-bottom:0;">
						<input type="checkbox" data-field="ttsEnabled" autocomplete="off" />
						<span class="toggle-slider"></span>
					</label>
					<span class="hint-text">Rate:</span>
					<input type="number" data-field="ttsRate" min="0.5" max="2" step="0.1" value="1" style="max-width:60px;" />
					<span class="hint-text">Vol:</span>
					<input type="number" data-field="ttsVolume" min="0" max="1" step="0.1" value="1" style="max-width:60px;" />
				</div>
			</div>

			<div class="preview-container">
				<div class="preview-label">Vorschau</div>
				<div class="preview-box" data-preview="${key}">
					<div class="preview-bg-overlay"></div>
					<div class="alert-inner">
						<div class="alert-icon">${info.icon}</div>
						<div class="alert-content">
							<div class="alert-type-label">${info.label}</div>
							<div class="alert-username">${PREVIEW_SAMPLE.username}</div>
							<div class="alert-message"></div>
						</div>
					</div>
					<div class="alert-accent-bar"></div>
				</div>
				<div class="preview-buttons">
					<button class="btn-play-preview btn-secondary btn-small" data-type="${key}">Vorschau abspielen</button>
					<button class="btn-test-preview btn-secondary btn-small" data-type="${key}">Test senden</button>
				</div>
			</div>
		</div>
	`;
	}).join('');

	// Play preview animation buttons
	container.querySelectorAll('.btn-play-preview').forEach((btn) => {
		btn.addEventListener('click', () => {
			playPreviewAnimation(btn.dataset.type);
		});
	});

	// Test send buttons
	container.querySelectorAll('.btn-test-preview').forEach((btn) => {
		btn.addEventListener('click', () => {
			nodecg.sendMessage('triggerTestAlert', { type: btn.dataset.type });
		});
	});

	// Live update listeners on all config inputs
	container.querySelectorAll('input, select, textarea').forEach((input) => {
		const section = input.closest('[data-type]');
		if (!section) return;
		const key = section.dataset.type;
		const eventType = (input.type === 'checkbox' || input.type === 'color' || input.tagName === 'SELECT') ? 'change' : 'input';
		input.addEventListener(eventType, () => {
			// Update range labels
			if (input.dataset.field === 'overlayOpacity') {
				const label = section.querySelector('[data-label="overlayOpacity"]');
				if (label) label.textContent = parseFloat(input.value).toFixed(2);
			}
			updatePreview(key);
		});
	});

	// Initial preview update
	ALERT_TYPES.forEach(({ key }) => updatePreview(key));
}

function updatePreview(key) {
	const section = container.querySelector(`[data-type="${key}"]`);
	const previewBox = container.querySelector(`.preview-box[data-preview="${key}"]`);
	if (!section || !previewBox) return;

	const info = TYPE_INFO[key] || { label: key, icon: '\uD83D\uDD14' };
	const bgColor = section.querySelector('[data-field="backgroundColor"]').value;
	const textColor = section.querySelector('[data-field="textColor"]').value;
	const accentColor = section.querySelector('[data-field="accentColor"]').value;
	const template = section.querySelector('[data-field="messageTemplate"]').value;

	// Apply colors and background image
	const bgImageUrl = section.querySelector('[data-field="backgroundImage"]').value;
	const opacityVal = parseFloat(section.querySelector('[data-field="overlayOpacity"]').value);
	const overlayOpacity = isNaN(opacityVal) ? 0.7 : opacityVal;

	if (bgImageUrl) {
		previewBox.style.backgroundColor = 'transparent';
		previewBox.style.backgroundImage = `url(${bgImageUrl})`;
		previewBox.classList.add('has-bg-image');
		previewBox.querySelector('.preview-bg-overlay').style.backgroundColor = hexToRgba(bgColor, overlayOpacity);
	} else {
		previewBox.style.backgroundColor = bgColor;
		previewBox.style.backgroundImage = 'none';
		previewBox.classList.remove('has-bg-image');
	}
	previewBox.style.color = textColor;
	previewBox.querySelector('.alert-accent-bar').style.backgroundColor = accentColor;

	// Update icon (custom or emoji)
	const iconUrl = section.querySelector('[data-field="iconUrl"]').value;
	const iconEl = previewBox.querySelector('.alert-icon');
	if (iconUrl) {
		iconEl.innerHTML = `<img src="${iconUrl}" style="width:24px;height:24px;object-fit:contain;" alt="" />`;
	} else {
		iconEl.innerHTML = '';
		iconEl.textContent = info.icon;
	}

	previewBox.querySelector('.alert-type-label').textContent = info.label;

	// Font styling
	const fontFamily = section.querySelector('[data-field="fontFamily"]').value;
	const fontSize = parseInt(section.querySelector('[data-field="fontSize"]').value) || 24;
	const textShadow = section.querySelector('[data-field="textShadow"]').checked;
	const textOutline = section.querySelector('[data-field="textOutline"]').checked;

	if (fontFamily) {
		previewBox.style.fontFamily = `'${fontFamily}', sans-serif`;
	} else {
		previewBox.style.fontFamily = '';
	}

	// Scale font size for preview (×0.67)
	const previewUsername = previewBox.querySelector('.alert-username');
	previewUsername.style.fontSize = Math.round(fontSize * 0.67) + 'px';
	previewUsername.style.color = accentColor;

	if (textShadow) {
		const shadowColor = section.querySelector('[data-field="textShadowColor"]').value || '#000000';
		previewBox.style.textShadow = `2px 2px 4px ${hexToRgba(shadowColor, 0.7)}`;
	} else {
		previewBox.style.textShadow = '';
	}

	if (textOutline) {
		const outlineColor = section.querySelector('[data-field="textOutlineColor"]').value || '#000000';
		previewUsername.style.webkitTextStroke = `1px ${hexToRgba(outlineColor, 0.5)}`;
	} else {
		previewUsername.style.webkitTextStroke = '';
	}

	// Format message with sample data
	const message = formatPreviewMessage(template, PREVIEW_SAMPLE, accentColor);
	const msgEl = previewBox.querySelector('.alert-message');
	msgEl.innerHTML = message;
	msgEl.style.display = message ? 'block' : 'none';
}

function playPreviewAnimation(key) {
	const section = container.querySelector(`[data-type="${key}"]`);
	const previewBox = container.querySelector(`.preview-box[data-preview="${key}"]`);
	if (!section || !previewBox) return;

	const animation = section.querySelector('[data-field="animation"]').value || 'slide';
	const animInMs = parseInt(section.querySelector('[data-field="animationInDuration"]').value) || 500;
	const animOutMs = parseInt(section.querySelector('[data-field="animationOutDuration"]').value) || 400;

	// Reset
	previewBox.className = 'preview-box';
	previewBox.style.opacity = '0';
	previewBox.style.animationDuration = '';

	// Entrance
	requestAnimationFrame(() => {
		previewBox.style.animationDuration = (animInMs / 1000) + 's';
		previewBox.className = 'preview-box anim-' + animation + '-in';
		previewBox.style.opacity = '';

		// After 2s, play exit
		setTimeout(() => {
			previewBox.style.animationDuration = (animOutMs / 1000) + 's';
			previewBox.className = 'preview-box anim-' + animation + '-out';

			// After exit animation, reset to static visible
			setTimeout(() => {
				previewBox.className = 'preview-box';
				previewBox.style.opacity = '';
				previewBox.style.animationDuration = '';
			}, animOutMs);
		}, 2000);
	});
}

function loadConfig(config) {
	if (!config) return;

	ALERT_TYPES.forEach(({ key }) => {
		const section = container.querySelector(`[data-type="${key}"]`);
		const typeConfig = config[key];
		if (!section || !typeConfig) return;

		const enabledInput = section.querySelector('[data-field="enabled"]');
		const durationInput = section.querySelector('[data-field="duration"]');
		const templateInput = section.querySelector('[data-field="messageTemplate"]');
		const animationInput = section.querySelector('[data-field="animation"]');
		const bgColorInput = section.querySelector('[data-field="backgroundColor"]');
		const textColorInput = section.querySelector('[data-field="textColor"]');
		const accentColorInput = section.querySelector('[data-field="accentColor"]');
		const soundEnabledInput = section.querySelector('[data-field="soundEnabled"]');

		if (enabledInput) enabledInput.checked = typeConfig.enabled !== false;
		if (durationInput) durationInput.value = (typeConfig.duration || 5000) / 1000;
		if (templateInput) templateInput.value = typeConfig.messageTemplate || '';
		if (animationInput) animationInput.value = typeConfig.animation || 'slide';
		if (bgColorInput) bgColorInput.value = typeConfig.backgroundColor || '#6441a5';
		if (textColorInput) textColorInput.value = typeConfig.textColor || '#ffffff';
		if (accentColorInput) accentColorInput.value = typeConfig.accentColor || '#b9a3e3';
		if (soundEnabledInput) soundEnabledInput.checked = typeConfig.soundEnabled !== false;

		// Background image
		const bgImageInput = section.querySelector('[data-field="backgroundImage"]');
		if (bgImageInput) bgImageInput.value = typeConfig.backgroundImage || '';

		// Position
		const positionInput = section.querySelector('[data-field="position"]');
		if (positionInput) positionInput.value = typeConfig.position || 'bottom-center';

		// Icon
		const iconUrlInput = section.querySelector('[data-field="iconUrl"]');
		if (iconUrlInput) iconUrlInput.value = typeConfig.iconUrl || '';

		// Font
		const fontFamilyInput = section.querySelector('[data-field="fontFamily"]');
		if (fontFamilyInput) fontFamilyInput.value = typeConfig.fontFamily || '';

		const fontSizeInput = section.querySelector('[data-field="fontSize"]');
		if (fontSizeInput) fontSizeInput.value = typeConfig.fontSize || 24;

		const textShadowInput = section.querySelector('[data-field="textShadow"]');
		if (textShadowInput) textShadowInput.checked = !!typeConfig.textShadow;

		const textShadowColorInput = section.querySelector('[data-field="textShadowColor"]');
		if (textShadowColorInput) textShadowColorInput.value = typeConfig.textShadowColor || '#000000';

		const textOutlineInput = section.querySelector('[data-field="textOutline"]');
		if (textOutlineInput) textOutlineInput.checked = !!typeConfig.textOutline;

		const textOutlineColorInput = section.querySelector('[data-field="textOutlineColor"]');
		if (textOutlineColorInput) textOutlineColorInput.value = typeConfig.textOutlineColor || '#000000';

		// Overlay Opacity
		const opacityInput = section.querySelector('[data-field="overlayOpacity"]');
		if (opacityInput) {
			opacityInput.value = typeConfig.overlayOpacity !== undefined ? typeConfig.overlayOpacity : 0.7;
			const label = section.querySelector('[data-label="overlayOpacity"]');
			if (label) label.textContent = parseFloat(opacityInput.value).toFixed(2);
		}

		// Animation durations
		const animInInput = section.querySelector('[data-field="animationInDuration"]');
		if (animInInput) animInInput.value = typeConfig.animationInDuration || 500;

		const animOutInput = section.querySelector('[data-field="animationOutDuration"]');
		if (animOutInput) animOutInput.value = typeConfig.animationOutDuration || 400;

		// Priority
		const priorityInput = section.querySelector('[data-field="priority"]');
		if (priorityInput) priorityInput.value = typeConfig.priority !== undefined ? typeConfig.priority : (DEFAULT_PRIORITIES[key] || 5);

		// Custom CSS
		const customCssInput = section.querySelector('[data-field="customCss"]');
		if (customCssInput) customCssInput.value = typeConfig.customCss || '';

		// Filters & Cooldown
		const minAmountInput = section.querySelector('[data-field="minAmount"]');
		if (minAmountInput) minAmountInput.value = typeConfig.minAmount || 0;

		const minTierInput = section.querySelector('[data-field="minTier"]');
		if (minTierInput) minTierInput.value = typeConfig.minTier || '';

		const cooldownInput = section.querySelector('[data-field="cooldown"]');
		if (cooldownInput) cooldownInput.value = typeConfig.cooldown || 0;

		// Video background
		const bgVideoInput = section.querySelector('[data-field="backgroundVideo"]');
		if (bgVideoInput) bgVideoInput.value = typeConfig.backgroundVideo || '';

		// TTS
		const ttsEnabledInput = section.querySelector('[data-field="ttsEnabled"]');
		if (ttsEnabledInput) ttsEnabledInput.checked = !!typeConfig.ttsEnabled;

		const ttsRateInput = section.querySelector('[data-field="ttsRate"]');
		if (ttsRateInput) ttsRateInput.value = typeConfig.ttsRate !== undefined ? typeConfig.ttsRate : 1;

		const ttsVolumeInput = section.querySelector('[data-field="ttsVolume"]');
		if (ttsVolumeInput) ttsVolumeInput.value = typeConfig.ttsVolume !== undefined ? typeConfig.ttsVolume : 1;

		updatePreview(key);
	});
}

function saveConfig() {
	const newConfig = {};

	ALERT_TYPES.forEach(({ key }) => {
		const section = container.querySelector(`[data-type="${key}"]`);
		if (!section) return;

		newConfig[key] = {
			enabled: section.querySelector('[data-field="enabled"]').checked,
			duration: parseFloat(section.querySelector('[data-field="duration"]').value) * 1000,
			messageTemplate: section.querySelector('[data-field="messageTemplate"]').value,
			animation: section.querySelector('[data-field="animation"]').value,
			backgroundColor: section.querySelector('[data-field="backgroundColor"]').value,
			textColor: section.querySelector('[data-field="textColor"]').value,
			accentColor: section.querySelector('[data-field="accentColor"]').value,
			soundEnabled: section.querySelector('[data-field="soundEnabled"]').checked,
			backgroundImage: section.querySelector('[data-field="backgroundImage"]').value,
			position: section.querySelector('[data-field="position"]').value,
			iconUrl: section.querySelector('[data-field="iconUrl"]').value,
			fontFamily: section.querySelector('[data-field="fontFamily"]').value,
			fontSize: parseInt(section.querySelector('[data-field="fontSize"]').value) || 24,
			textShadow: section.querySelector('[data-field="textShadow"]').checked,
			textShadowColor: section.querySelector('[data-field="textShadowColor"]').value,
			textOutline: section.querySelector('[data-field="textOutline"]').checked,
			textOutlineColor: section.querySelector('[data-field="textOutlineColor"]').value,
			overlayOpacity: parseFloat(section.querySelector('[data-field="overlayOpacity"]').value),
			animationInDuration: parseInt(section.querySelector('[data-field="animationInDuration"]').value) || 500,
			animationOutDuration: parseInt(section.querySelector('[data-field="animationOutDuration"]').value) || 400,
			priority: parseInt(section.querySelector('[data-field="priority"]').value) || (DEFAULT_PRIORITIES[key] || 5),
			customCss: section.querySelector('[data-field="customCss"]').value || '',
			minAmount: parseInt(section.querySelector('[data-field="minAmount"]').value) || 0,
			minTier: section.querySelector('[data-field="minTier"]').value || '',
			cooldown: parseInt(section.querySelector('[data-field="cooldown"]').value) || 0,
			backgroundVideo: section.querySelector('[data-field="backgroundVideo"]').value || '',
			ttsEnabled: section.querySelector('[data-field="ttsEnabled"]').checked,
			ttsRate: parseFloat(section.querySelector('[data-field="ttsRate"]').value) || 1,
			ttsVolume: parseFloat(section.querySelector('[data-field="ttsVolume"]').value),
		};
	});

	alertConfig.value = newConfig;

	btnSave.textContent = 'Gespeichert!';
	btnSaveTop.textContent = 'Gespeichert!';
	setTimeout(() => {
		btnSave.textContent = 'Alle Einstellungen speichern';
		btnSaveTop.textContent = 'Alle Einstellungen speichern';
	}, 1500);
}

function populateBackgroundSelects(assets) {
	container.querySelectorAll('[data-field="backgroundImage"]').forEach((select) => {
		const currentValue = select.value;
		// Keep first option, remove rest
		while (select.options.length > 1) {
			select.remove(1);
		}
		// Add asset options
		assets.forEach((asset) => {
			const option = document.createElement('option');
			option.value = asset.url;
			option.textContent = asset.name + '.' + asset.ext;
			select.appendChild(option);
		});
		// Restore previous selection if asset still exists
		if (currentValue && [...select.options].some((o) => o.value === currentValue)) {
			select.value = currentValue;
		} else {
			select.value = '';
		}
	});
}

function populateIconSelects(assets) {
	container.querySelectorAll('[data-field="iconUrl"]').forEach((select) => {
		const currentValue = select.value;
		// Keep first option, remove rest
		while (select.options.length > 1) {
			select.remove(1);
		}
		// Add asset options
		assets.forEach((asset) => {
			const option = document.createElement('option');
			option.value = asset.url;
			option.textContent = asset.name + '.' + asset.ext;
			select.appendChild(option);
		});
		// Restore previous selection if asset still exists
		if (currentValue && [...select.options].some((o) => o.value === currentValue)) {
			select.value = currentValue;
		} else {
			select.value = '';
		}
	});
}

function populateVideoSelects(assets) {
	container.querySelectorAll('[data-field="backgroundVideo"]').forEach((select) => {
		const currentValue = select.value;
		while (select.options.length > 1) {
			select.remove(1);
		}
		assets.forEach((asset) => {
			const option = document.createElement('option');
			option.value = asset.url;
			option.textContent = asset.name + '.' + asset.ext;
			select.appendChild(option);
		});
		if (currentValue && [...select.options].some((o) => o.value === currentValue)) {
			select.value = currentValue;
		} else {
			select.value = '';
		}
	});
}

// Build UI
buildEditorUI();

// Load values when replicant is ready
alertConfig.on('change', (newVal) => {
	loadConfig(newVal);
});

// Populate background selects when assets change
alertBackgrounds.on('change', (newVal) => {
	populateBackgroundSelects(newVal || []);
	if (alertConfig.value) loadConfig(alertConfig.value);
});

// Populate icon selects when assets change
alertIcons.on('change', (newVal) => {
	populateIconSelects(newVal || []);
	if (alertConfig.value) loadConfig(alertConfig.value);
});

// Populate video selects when assets change
alertVideos.on('change', (newVal) => {
	populateVideoSelects(newVal || []);
	if (alertConfig.value) loadConfig(alertConfig.value);
});

// Save buttons
btnSave.addEventListener('click', saveConfig);
btnSaveTop.addEventListener('click', saveConfig);

// --- Config Export/Import ---
const VALID_ALERT_KEYS = ALERT_TYPES.map((t) => t.key);
const fileInput = document.getElementById('import-file-input');

function exportConfig() {
	const data = JSON.stringify(alertConfig.value, null, 2);
	const blob = new Blob([data], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	const date = new Date().toISOString().slice(0, 10);
	a.href = url;
	a.download = `alertConfig-${date}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

function importConfig(file) {
	const reader = new FileReader();
	reader.onload = (e) => {
		try {
			const parsed = JSON.parse(e.target.result);
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
				alert('Ungültige Config-Datei: Erwartet wird ein JSON-Objekt.');
				return;
			}
			const cleaned = {};
			for (const key of VALID_ALERT_KEYS) {
				if (parsed[key] && typeof parsed[key] === 'object') {
					cleaned[key] = parsed[key];
				}
			}
			if (Object.keys(cleaned).length === 0) {
				alert('Keine gültigen Alert-Typen in der Datei gefunden.');
				return;
			}
			alertConfig.value = cleaned;
			loadConfig(cleaned);
		} catch {
			alert('Fehler beim Lesen der Datei: Ungültiges JSON.');
		}
	};
	reader.readAsText(file);
}

document.getElementById('btn-export-config-top').addEventListener('click', exportConfig);
document.getElementById('btn-export-config').addEventListener('click', exportConfig);

document.getElementById('btn-import-config-top').addEventListener('click', () => fileInput.click());
document.getElementById('btn-import-config').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
	if (fileInput.files.length > 0) {
		importConfig(fileInput.files[0]);
		fileInput.value = '';
	}
});

// --- Alert Themes/Presets ---
const THEME_BASE = {
	enabled: true, duration: 5000, soundEnabled: true, backgroundImage: '', backgroundVideo: '',
	iconUrl: '', textShadow: false, textShadowColor: '#000000', textOutline: false,
	textOutlineColor: '#000000', overlayOpacity: 0.7, animationInDuration: 500,
	animationOutDuration: 400, customCss: '', minAmount: 0, minTier: '', cooldown: 0,
	ttsEnabled: false, ttsRate: 1, ttsVolume: 1,
};

const THEMES = {
	neon: {
		_visual: {
			backgroundColor: '#0f0f23', textColor: '#00ffff', accentColor: '#ff00ff',
			animation: 'fade', fontFamily: 'Bangers', fontSize: 28,
			textShadow: true, textShadowColor: '#00ffff', position: 'bottom-center',
		},
		follow: { priority: 3 },
		sub: { priority: 6, duration: 6000, accentColor: '#39ff14' },
		resub: { priority: 6, duration: 6000, accentColor: '#39ff14' },
		subgift: { priority: 7, duration: 6000, accentColor: '#39ff14' },
		bits: { priority: 5, duration: 6000, backgroundColor: '#1a0033', accentColor: '#ffd700' },
		raid: { priority: 8, duration: 8000, backgroundColor: '#1a0011', accentColor: '#ff0066' },
		channelpoints: { priority: 2, accentColor: '#00ff88' },
	},
	retro: {
		_visual: {
			backgroundColor: '#2d1b00', textColor: '#ffa500', accentColor: '#ff6600',
			animation: 'slide', fontFamily: 'Press Start 2P', fontSize: 18,
			position: 'top-center',
		},
		follow: { priority: 3 },
		sub: { priority: 6, duration: 6000 },
		resub: { priority: 6, duration: 6000 },
		subgift: { priority: 7, duration: 6000 },
		bits: { priority: 5, duration: 6000, backgroundColor: '#1a1a00', accentColor: '#ffcc00' },
		raid: { priority: 8, duration: 8000, backgroundColor: '#330000', accentColor: '#ff4444' },
		channelpoints: { priority: 2, accentColor: '#44ff44' },
	},
	minimal: {
		_visual: {
			backgroundColor: '#ffffff', textColor: '#333333', accentColor: '#666666',
			animation: 'fade', fontFamily: 'Poppins', fontSize: 22,
			textShadow: false, position: 'bottom-center',
		},
		follow: { priority: 3 },
		sub: { priority: 6, duration: 6000 },
		resub: { priority: 6, duration: 6000 },
		subgift: { priority: 7, duration: 6000 },
		bits: { priority: 5, duration: 6000, accentColor: '#ff8c00' },
		raid: { priority: 8, duration: 8000, accentColor: '#e91916' },
		channelpoints: { priority: 2, accentColor: '#00c896' },
	},
	default: {
		_visual: {
			backgroundColor: '#6441a5', textColor: '#ffffff', accentColor: '#b9a3e3',
			animation: 'slide', fontFamily: '', fontSize: 24,
			textShadow: false, position: 'bottom-center',
		},
		follow: { priority: 3 },
		sub: { priority: 6, duration: 6000, animation: 'bounce' },
		resub: { priority: 6, duration: 6000, animation: 'bounce' },
		subgift: { priority: 7, duration: 6000, animation: 'bounce' },
		bits: { priority: 5, duration: 6000, backgroundColor: '#ff8c00', accentColor: '#ffd700', animation: 'bounce' },
		raid: { priority: 8, duration: 8000, backgroundColor: '#e91916', accentColor: '#ff6b6b' },
		channelpoints: { priority: 2, backgroundColor: '#00c896', accentColor: '#7affc8', animation: 'fade' },
	},
};

function applyTheme(themeName) {
	const theme = THEMES[themeName];
	if (!theme) return;

	const visual = theme._visual || {};
	const current = alertConfig.value ? JSON.parse(JSON.stringify(alertConfig.value)) : {};
	const newConfig = {};

	ALERT_TYPES.forEach(({ key }) => {
		const existing = current[key] || {};
		const typeOverrides = theme[key] || {};
		newConfig[key] = {
			...THEME_BASE,
			...visual,
			// Preserve message templates from current config
			messageTemplate: existing.messageTemplate || THEME_BASE.messageTemplate || '{username}',
			// Apply type-specific overrides
			...typeOverrides,
			// Preserve non-visual settings from current config
			enabled: existing.enabled !== undefined ? existing.enabled : true,
			minAmount: existing.minAmount || 0,
			minTier: existing.minTier || '',
			cooldown: existing.cooldown || 0,
			ttsEnabled: existing.ttsEnabled || false,
			ttsRate: existing.ttsRate || 1,
			ttsVolume: existing.ttsVolume !== undefined ? existing.ttsVolume : 1,
		};
	});

	alertConfig.value = newConfig;
	loadConfig(newConfig);
}

document.querySelectorAll('.btn-theme').forEach((btn) => {
	btn.addEventListener('click', () => {
		if (confirm(`Theme "${btn.dataset.theme}" anwenden? Visuelle Einstellungen werden überschrieben.`)) {
			applyTheme(btn.dataset.theme);
		}
	});
});
