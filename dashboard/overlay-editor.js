const alertConfig = nodecg.Replicant('alertConfig');
const alertBackgrounds = nodecg.Replicant('assets:alert-backgrounds');

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

const PREVIEW_SAMPLE = {
	username: 'TestUser',
	amount: 12,
	message: 'Toller Stream!',
	tier: '1',
};

const container = document.getElementById('alert-types');
const btnSave = document.getElementById('btn-save-config');

function hexToRgba(hex, alpha) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatPreviewMessage(template, data) {
	if (!template) return '';
	return template
		.replace(/{username}/g, data.username || '')
		.replace(/{amount}/g, String(data.amount || 0))
		.replace(/{message}/g, data.message || '')
		.replace(/{tier}/g, data.tier || '');
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
					<input type="checkbox" data-field="enabled" checked />
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
				<label>Hintergrund</label>
				<select data-field="backgroundImage">
					<option value="">Keine (Nur Farbe)</option>
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
				<label>Sound</label>
				<label class="toggle" style="margin-bottom:0;">
					<input type="checkbox" data-field="soundEnabled" checked />
					<span class="toggle-slider"></span>
				</label>
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
	container.querySelectorAll('input, select').forEach((input) => {
		const section = input.closest('[data-type]');
		if (!section) return;
		const key = section.dataset.type;
		const eventType = (input.type === 'checkbox' || input.type === 'color' || input.tagName === 'SELECT') ? 'change' : 'input';
		input.addEventListener(eventType, () => {
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
	if (bgImageUrl) {
		previewBox.style.backgroundColor = 'transparent';
		previewBox.style.backgroundImage = `url(${bgImageUrl})`;
		previewBox.classList.add('has-bg-image');
		previewBox.querySelector('.preview-bg-overlay').style.backgroundColor = hexToRgba(bgColor, 0.7);
	} else {
		previewBox.style.backgroundColor = bgColor;
		previewBox.style.backgroundImage = 'none';
		previewBox.classList.remove('has-bg-image');
	}
	previewBox.style.color = textColor;
	previewBox.querySelector('.alert-accent-bar').style.backgroundColor = accentColor;

	// Update icon & label
	previewBox.querySelector('.alert-icon').textContent = info.icon;
	previewBox.querySelector('.alert-type-label').textContent = info.label;

	// Format message with sample data
	const message = formatPreviewMessage(template, PREVIEW_SAMPLE);
	const msgEl = previewBox.querySelector('.alert-message');
	msgEl.textContent = message;
	msgEl.style.display = message ? 'block' : 'none';
}

function playPreviewAnimation(key) {
	const section = container.querySelector(`[data-type="${key}"]`);
	const previewBox = container.querySelector(`.preview-box[data-preview="${key}"]`);
	if (!section || !previewBox) return;

	const animation = section.querySelector('[data-field="animation"]').value || 'slide';

	// Reset
	previewBox.className = 'preview-box';
	previewBox.style.opacity = '0';

	// Entrance
	requestAnimationFrame(() => {
		previewBox.className = 'preview-box anim-' + animation + '-in';
		previewBox.style.opacity = '';

		// After 2s, play exit
		setTimeout(() => {
			previewBox.className = 'preview-box anim-' + animation + '-out';

			// After exit animation, reset to static visible
			setTimeout(() => {
				previewBox.className = 'preview-box';
				previewBox.style.opacity = '';
			}, 500);
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

		const bgImageInput = section.querySelector('[data-field="backgroundImage"]');
		if (bgImageInput) bgImageInput.value = typeConfig.backgroundImage || '';

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
		};
	});

	alertConfig.value = newConfig;

	btnSave.textContent = 'Gespeichert!';
	setTimeout(() => { btnSave.textContent = 'Alle Einstellungen speichern'; }, 1500);
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

// Save button
btnSave.addEventListener('click', saveConfig);
