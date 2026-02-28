const alertQueue = nodecg.Replicant('alertQueue');
const currentAlert = nodecg.Replicant('currentAlert');
const connectionStatus = nodecg.Replicant('connectionStatus');
const alertHistory = nodecg.Replicant('alertHistory');

const queueList = document.getElementById('queue-list');
const queueCount = document.getElementById('queue-count');
const currentAlertEl = document.getElementById('current-alert');
const statusIndicator = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');
const historyList = document.getElementById('history-list');

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
			<span class="priority-badge">P${alert.priority || 5}</span>
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

function renderHistory(history) {
	if (!history || history.length === 0) {
		historyList.innerHTML = '<li class="empty-state">Noch keine Alerts</li>';
		return;
	}

	historyList.innerHTML = history.map((entry) => {
		const time = new Date(entry.timestamp);
		const timeStr = time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		return `
			<li class="history-item">
				<span class="history-time">${timeStr}</span>
				<span class="alert-type-badge badge-${entry.type}">${TYPE_LABELS[entry.type] || entry.type}</span>
				<span>${entry.username}</span>
				${entry.amount ? `<span style="color:#999;font-size:11px;">(${entry.amount})</span>` : ''}
			</li>
		`;
	}).join('');
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

alertHistory.on('change', (newVal) => {
	renderHistory(newVal || []);
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

// Clear history
document.getElementById('btn-clear-history').addEventListener('click', () => {
	if (confirm('Alert-Verlauf leeren?')) {
		nodecg.sendMessage('clearHistory');
	}
});
