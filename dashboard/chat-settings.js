const chatConfig = nodecg.Replicant('chatConfig');
const chatMessages = nodecg.Replicant('chatMessages');

const positionSelect = document.querySelector('[data-field="position"]');
const customPosFields = document.getElementById('custom-pos');
const opacityRange = document.querySelector('[data-field="backgroundOpacity"]');
const opacityLabel = document.getElementById('opacity-label');
const msgCountEl = document.getElementById('msg-count');

// --- Conditional Custom Position ---
positionSelect.addEventListener('change', () => {
	customPosFields.classList.toggle('visible', positionSelect.value === 'custom');
});

// --- Opacity label ---
opacityRange.addEventListener('input', () => {
	opacityLabel.textContent = parseFloat(opacityRange.value).toFixed(2);
});

// --- Load Config ---
function loadConfig(config) {
	if (!config) return;

	document.querySelectorAll('[data-field]').forEach((el) => {
		const field = el.dataset.field;
		const value = config[field];
		if (value === undefined) return;

		if (el.type === 'checkbox') {
			el.checked = !!value;
		} else if (el.tagName === 'TEXTAREA') {
			el.value = value;
		} else if (el.type === 'range') {
			el.value = value;
		} else {
			el.value = value;
		}
	});

	// Update opacity label
	opacityLabel.textContent = parseFloat(config.backgroundOpacity ?? 0.6).toFixed(2);

	// Show/hide custom position fields
	customPosFields.classList.toggle('visible', config.position === 'custom');
}

// --- Save Config ---
function saveConfig() {
	const newConfig = {};

	document.querySelectorAll('[data-field]').forEach((el) => {
		const field = el.dataset.field;

		if (el.type === 'checkbox') {
			newConfig[field] = el.checked;
		} else if (el.type === 'number' || el.type === 'range') {
			newConfig[field] = parseFloat(el.value);
		} else {
			newConfig[field] = el.value;
		}
	});

	// Ensure integer for maxMessages
	newConfig.maxMessages = Math.round(newConfig.maxMessages);

	chatConfig.value = newConfig;

	const btn = document.getElementById('btn-save');
	btn.textContent = 'Gespeichert!';
	setTimeout(() => { btn.textContent = 'Speichern'; }, 1500);
}

// --- Replicant Listeners ---
NodeCG.waitForReplicants(chatConfig, chatMessages).then(() => {
	loadConfig(chatConfig.value);
	msgCountEl.textContent = chatMessages.value ? chatMessages.value.length : 0;

	chatConfig.on('change', (newVal) => {
		loadConfig(newVal);
	});

	chatMessages.on('change', (newVal) => {
		msgCountEl.textContent = newVal ? newVal.length : 0;
	});
});

// --- Button Handlers ---
document.getElementById('btn-save').addEventListener('click', saveConfig);

document.getElementById('btn-test').addEventListener('click', () => {
	nodecg.sendMessage('sendTestChatMessage');
});

document.getElementById('btn-clear').addEventListener('click', () => {
	if (confirm('Chat-Nachrichten wirklich leeren?')) {
		nodecg.sendMessage('clearChat');
	}
});
