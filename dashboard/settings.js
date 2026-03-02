const settings = nodecg.Replicant('settings');
const connectionStatus = nodecg.Replicant('connectionStatus');

const clientIdInput = document.getElementById('client-id');
const clientSecretInput = document.getElementById('client-secret');
const channelNameInput = document.getElementById('channel-name');
const alertDelayInput = document.getElementById('alert-delay');
const redirectUriInput = document.getElementById('redirect-uri');
const redirectUriDisplay = document.getElementById('redirect-uri-display');
const btnSave = document.getElementById('btn-save');
const btnConnect = document.getElementById('btn-connect');
const btnReconnect = document.getElementById('btn-reconnect');
const btnDisconnect = document.getElementById('btn-disconnect');
const statusIndicator = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');
const statusHelp = document.getElementById('status-help');

const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');

// --- Setup Steps ---
function updateSetupSteps(settingsVal, connStatus) {
	const hasCredentials = !!(settingsVal && settingsVal.clientId && settingsVal.clientSecret && settingsVal.channelName);
	const isConnected = connStatus && connStatus.status === 'connected';

	step1.className = 'setup-step' + (hasCredentials ? ' done' : ' active');
	step2.className = 'setup-step' + (isConnected ? ' done' : (hasCredentials ? ' active' : ''));
	step3.className = 'setup-step' + (isConnected ? ' done' : '');
}

// --- Connection Buttons: show only relevant ---
function updateConnectionButtons(connStatus) {
	const status = connStatus ? connStatus.status : 'disconnected';
	if (status === 'connected') {
		btnConnect.style.display = 'none';
		btnReconnect.style.display = '';
		btnDisconnect.style.display = '';
	} else if (status === 'connecting') {
		btnConnect.style.display = 'none';
		btnReconnect.style.display = 'none';
		btnDisconnect.style.display = '';
	} else {
		btnConnect.style.display = '';
		btnReconnect.style.display = 'none';
		btnDisconnect.style.display = 'none';
	}
}

// Load settings into inputs
settings.on('change', (newVal) => {
	if (!newVal) return;
	clientIdInput.value = newVal.clientId || '';
	clientSecretInput.value = newVal.clientSecret || '';
	channelNameInput.value = newVal.channelName || '';
	alertDelayInput.value = newVal.alertDelay !== undefined ? newVal.alertDelay : 500;
	redirectUriInput.value = newVal.redirectUri || '';

	// Update redirect URI display text
	if (newVal.redirectUri) {
		redirectUriDisplay.textContent = newVal.redirectUri;
	} else {
		redirectUriDisplay.textContent = `${window.location.origin}/nodecg-twitch/auth/callback`;
	}

	updateSetupSteps(newVal, connectionStatus.value);
});

// Update connection status display
connectionStatus.on('change', (newVal) => {
	if (!newVal) return;

	statusIndicator.className = `status-indicator status-${newVal.status}`;
	const statusLabels = {
		connected: 'Verbunden',
		connecting: 'Verbinde...',
		disconnected: 'Nicht verbunden',
		error: 'Fehler',
	};
	statusText.textContent = newVal.message || statusLabels[newVal.status] || newVal.status;

	// Show help text on error
	if (newVal.status === 'error') {
		statusHelp.textContent = 'Pruefe Client ID, Secret und Kanalname. Stimmt die Redirect URI?';
		statusHelp.style.display = '';
	} else {
		statusHelp.style.display = 'none';
	}

	updateConnectionButtons(newVal);
	updateSetupSteps(settings.value, newVal);
});

// Save all settings with one button
btnSave.addEventListener('click', () => {
	settings.value.clientId = clientIdInput.value.trim();
	settings.value.clientSecret = clientSecretInput.value.trim();
	settings.value.channelName = channelNameInput.value.trim().toLowerCase();
	settings.value.alertDelay = parseInt(alertDelayInput.value) || 500;
	settings.value.redirectUri = redirectUriInput.value.trim();

	btnSave.textContent = 'Gespeichert!';
	setTimeout(() => { btnSave.textContent = 'Alle Einstellungen speichern'; }, 1500);
});

// Open OAuth popup
btnConnect.addEventListener('click', () => {
	if (!settings.value.clientId || !settings.value.clientSecret) {
		alert('Bitte zuerst Client ID und Client Secret eintragen und speichern.');
		return;
	}
	window.open('/nodecg-twitch/auth/start', 'twitch-auth', 'width=500,height=700');
});

// Reconnect
btnReconnect.addEventListener('click', () => {
	nodecg.sendMessage('reconnect');
});

// Disconnect
btnDisconnect.addEventListener('click', () => {
	nodecg.sendMessage('disconnect');
});

// --- Collapsible Sections ---
document.querySelectorAll('.collapsible-header').forEach((header) => {
	header.addEventListener('click', () => {
		const targetId = header.dataset.target;
		const content = document.getElementById(targetId);
		const chevron = header.querySelector('.chevron');
		if (content) {
			content.classList.toggle('open');
		}
		if (chevron) {
			chevron.classList.toggle('open');
		}
	});
});
