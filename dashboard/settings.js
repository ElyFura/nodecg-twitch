const settings = nodecg.Replicant('settings');
const connectionStatus = nodecg.Replicant('connectionStatus');

const clientIdInput = document.getElementById('client-id');
const clientSecretInput = document.getElementById('client-secret');
const channelNameInput = document.getElementById('channel-name');
const alertDelayInput = document.getElementById('alert-delay');
const btnSave = document.getElementById('btn-save');
const btnSaveDelay = document.getElementById('btn-save-delay');
const btnConnect = document.getElementById('btn-connect');
const btnReconnect = document.getElementById('btn-reconnect');
const statusIndicator = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');

// Load settings into inputs
settings.on('change', (newVal) => {
	if (!newVal) return;
	clientIdInput.value = newVal.clientId || '';
	clientSecretInput.value = newVal.clientSecret || '';
	channelNameInput.value = newVal.channelName || '';
	alertDelayInput.value = newVal.alertDelay !== undefined ? newVal.alertDelay : 500;
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
});

// Save settings
btnSave.addEventListener('click', () => {
	settings.value.clientId = clientIdInput.value.trim();
	settings.value.clientSecret = clientSecretInput.value.trim();
	settings.value.channelName = channelNameInput.value.trim().toLowerCase();

	btnSave.textContent = 'Gespeichert!';
	setTimeout(() => { btnSave.textContent = 'Speichern'; }, 1500);
});

// Save alert delay
btnSaveDelay.addEventListener('click', () => {
	settings.value.alertDelay = parseInt(alertDelayInput.value) || 500;

	btnSaveDelay.textContent = 'Gespeichert!';
	setTimeout(() => { btnSaveDelay.textContent = 'Delay speichern'; }, 1500);
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
