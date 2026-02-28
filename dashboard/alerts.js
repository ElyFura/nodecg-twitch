const alertQueue = nodecg.Replicant('alertQueue');
const currentAlert = nodecg.Replicant('currentAlert');
const connectionStatus = nodecg.Replicant('connectionStatus');
const alertHistory = nodecg.Replicant('alertHistory');
const settings = nodecg.Replicant('settings');
const alertStats = nodecg.Replicant('alertStats');
const goals = nodecg.Replicant('goals');

const queueList = document.getElementById('queue-list');
const queueCount = document.getElementById('queue-count');
const currentAlertEl = document.getElementById('current-alert');
const statusIndicator = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');
const historyList = document.getElementById('history-list');
const togglePause = document.getElementById('toggle-pause');
const pauseLabel = document.getElementById('pause-label');

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

// Custom test alert
document.getElementById('btn-test-custom').addEventListener('click', () => {
	const type = document.getElementById('test-type').value;
	const username = document.getElementById('test-username').value.trim();
	const message = document.getElementById('test-message').value.trim();
	const amount = document.getElementById('test-amount').value;
	nodecg.sendMessage('triggerTestAlert', {
		type,
		username: username || undefined,
		message: message || undefined,
		amount: amount !== '' ? Number(amount) : undefined,
	});
});

// Quick-fire test alert buttons
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

// Pause toggle
settings.on('change', (newVal) => {
	if (!newVal) return;
	const paused = !!newVal.alertsPaused;
	togglePause.checked = paused;
	pauseLabel.textContent = paused ? 'Alerts pausiert' : 'Alerts aktiv';
	pauseLabel.style.color = paused ? '#e74c3c' : '#ccc';
});

togglePause.addEventListener('change', () => {
	nodecg.sendMessage('togglePause', { paused: togglePause.checked });
});

// --- Stats ---
const STAT_TYPES = ['follow', 'sub', 'resub', 'subgift', 'bits', 'raid', 'channelpoints'];

alertStats.on('change', (newVal) => {
	if (!newVal) return;
	STAT_TYPES.forEach((type) => {
		const el = document.getElementById(`stat-${type}`);
		if (el) el.textContent = newVal[type] || 0;
	});
	const totalEl = document.getElementById('stat-total');
	if (totalEl) totalEl.textContent = newVal.total || 0;
	const bitsTotalEl = document.getElementById('stat-bits-total');
	if (bitsTotalEl) bitsTotalEl.textContent = (newVal.bitsTotal || 0).toLocaleString('de-DE');
	const sessionEl = document.getElementById('stat-session');
	if (sessionEl && newVal.sessionStart > 0) {
		sessionEl.textContent = new Date(newVal.sessionStart).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
	}
});

document.getElementById('btn-reset-stats').addEventListener('click', () => {
	if (confirm('Statistiken zurücksetzen?')) {
		nodecg.sendMessage('resetStats');
	}
});

// --- Goals ---
const GOAL_DEFS = [
	{ key: 'followGoal', label: 'Follow-Goal', icon: '❤️' },
	{ key: 'subGoal', label: 'Sub-Goal', icon: '⭐' },
	{ key: 'bitsGoal', label: 'Bits-Goal', icon: '💎' },
];
const goalsContainer = document.getElementById('goals-container');

function renderGoals(goalsVal) {
	if (!goalsVal) {
		goalsContainer.innerHTML = '<div class="empty-state">Keine Goals konfiguriert</div>';
		return;
	}
	goalsContainer.innerHTML = GOAL_DEFS.map(({ key, label, icon }) => {
		const g = goalsVal[key];
		if (!g) return '';
		const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
		const barColor = g.barColor || '#6441a5';
		return `
			<div style="margin-bottom:8px;" data-goal="${key}">
				<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
					<label class="toggle" style="margin-bottom:0;">
						<input type="checkbox" class="goal-enabled" data-goal="${key}" ${g.enabled ? 'checked' : ''} autocomplete="off" />
						<span class="toggle-slider"></span>
					</label>
					<span>${icon}</span>
					<strong style="font-size:12px;">${g.label || label}</strong>
					<span style="font-size:11px;color:#7f8c8d;margin-left:auto;">${g.current} / ${g.target} (${pct}%)</span>
				</div>
				<div style="background:#1a1a2e;border-radius:4px;height:12px;overflow:hidden;">
					<div style="background:${barColor};height:100%;width:${pct}%;transition:width 0.3s;border-radius:4px;"></div>
				</div>
				<div style="display:flex;gap:4px;margin-top:4px;">
					<input type="text" class="goal-label" data-goal="${key}" value="${g.label || ''}" placeholder="Label" style="width:80px;font-size:11px;padding:2px 4px;" />
					<input type="number" class="goal-target" data-goal="${key}" value="${g.target}" min="1" style="width:60px;font-size:11px;padding:2px 4px;" />
					<input type="color" class="goal-color" data-goal="${key}" value="${barColor}" style="width:30px;height:22px;padding:1px;" />
					<label class="toggle" style="margin-bottom:0;" title="Im Overlay anzeigen">
						<input type="checkbox" class="goal-overlay" data-goal="${key}" ${g.showInOverlay ? 'checked' : ''} autocomplete="off" />
						<span class="toggle-slider"></span>
					</label>
					<span style="font-size:10px;color:#7f8c8d;align-self:center;">Overlay</span>
					<button class="btn-secondary btn-small goal-reset" data-goal="${key}" style="margin-left:auto;font-size:10px;padding:2px 6px;">Reset</button>
				</div>
			</div>
		`;
	}).join('');

	// Attach goal event listeners
	goalsContainer.querySelectorAll('.goal-enabled').forEach((cb) => {
		cb.addEventListener('change', () => {
			nodecg.sendMessage('updateGoal', { goalKey: cb.dataset.goal, enabled: cb.checked });
		});
	});
	goalsContainer.querySelectorAll('.goal-target').forEach((input) => {
		input.addEventListener('change', () => {
			nodecg.sendMessage('updateGoal', { goalKey: input.dataset.goal, target: input.value });
		});
	});
	goalsContainer.querySelectorAll('.goal-label').forEach((input) => {
		input.addEventListener('change', () => {
			nodecg.sendMessage('updateGoal', { goalKey: input.dataset.goal, label: input.value });
		});
	});
	goalsContainer.querySelectorAll('.goal-color').forEach((input) => {
		input.addEventListener('change', () => {
			nodecg.sendMessage('updateGoal', { goalKey: input.dataset.goal, barColor: input.value });
		});
	});
	goalsContainer.querySelectorAll('.goal-overlay').forEach((cb) => {
		cb.addEventListener('change', () => {
			nodecg.sendMessage('updateGoal', { goalKey: cb.dataset.goal, showInOverlay: cb.checked });
		});
	});
	goalsContainer.querySelectorAll('.goal-reset').forEach((btn) => {
		btn.addEventListener('click', () => {
			nodecg.sendMessage('resetGoal', { goalKey: btn.dataset.goal });
		});
	});
}

goals.on('change', (newVal) => {
	renderGoals(newVal);
});
