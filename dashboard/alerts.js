const alertQueue = nodecg.Replicant('alertQueue');
const currentAlert = nodecg.Replicant('currentAlert');
const connectionStatus = nodecg.Replicant('connectionStatus');

const queueList = document.getElementById('queue-list');
const queueCount = document.getElementById('queue-count');
const currentAlertEl = document.getElementById('current-alert');
const statusIndicator = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');

const TYPE_LABELS = {
	follow: 'Follow',
	sub: 'Sub',
	resub: 'Resub',
	subgift: 'Gift Sub',
	bits: 'Bits',
	raid: 'Raid',
	channelpoints: 'CP',
};

function renderQueue(queue) {
	queueCount.textContent = queue.length;

	if (queue.length === 0) {
		queueList.innerHTML = '<li class="empty-state">Queue ist leer</li>';
		return;
	}

	queueList.innerHTML = queue.map((alert) => `
		<li class="queue-item">
			<span class="alert-type-badge badge-${alert.type}">${TYPE_LABELS[alert.type] || alert.type}</span>
			<span>${alert.username}</span>
			${alert.amount ? `<span style="color:#999;font-size:11px;">(${alert.amount})</span>` : ''}
		</li>
	`).join('');
}

function renderCurrentAlert(alert) {
	if (!alert) {
		currentAlertEl.innerHTML = '<span class="empty-state">Kein Alert aktiv</span>';
		return;
	}

	currentAlertEl.innerHTML = `
		<div class="queue-item" style="border:none;">
			<span class="alert-type-badge badge-${alert.type}">${TYPE_LABELS[alert.type] || alert.type}</span>
			<strong>${alert.username}</strong>
			${alert.message ? `<span style="color:#999;font-size:11px;">${alert.message}</span>` : ''}
		</div>
	`;
}

// Listen for changes
alertQueue.on('change', (newVal) => {
	renderQueue(newVal || []);
});

currentAlert.on('change', (newVal) => {
	renderCurrentAlert(newVal);
});

connectionStatus.on('change', (newVal) => {
	if (!newVal) return;
	statusIndicator.className = `status-indicator status-${newVal.status}`;
	const labels = {
		connected: 'Verbunden',
		connecting: 'Verbinde...',
		disconnected: 'Nicht verbunden',
		error: 'Fehler',
	};
	statusText.textContent = newVal.message || labels[newVal.status] || newVal.status;
});

// Test alert buttons
document.querySelectorAll('.btn-test').forEach((btn) => {
	btn.addEventListener('click', () => {
		nodecg.sendMessage('triggerTestAlert', { type: btn.dataset.type });
	});
});

// Skip current alert
document.getElementById('btn-skip').addEventListener('click', () => {
	nodecg.sendMessage('skipAlert');
});

// Clear queue
document.getElementById('btn-clear').addEventListener('click', () => {
	if (confirm('Alle Alerts in der Queue löschen?')) {
		nodecg.sendMessage('clearQueue');
	}
});
