const goals = nodecg.Replicant('goals');
const goalBarsEl = document.getElementById('goal-bars');

const GOAL_LABELS = { followGoal: 'Follow-Goal', subGoal: 'Sub-Goal', bitsGoal: 'Bits-Goal' };

function renderGoalBars(goalsVal) {
	if (!goalsVal) { goalBarsEl.innerHTML = ''; return; }
	const entries = Object.entries(goalsVal).filter(([, g]) => g && g.enabled && g.showInOverlay);
	if (entries.length === 0) { goalBarsEl.innerHTML = ''; return; }
	goalBarsEl.innerHTML = entries.map(([key, g]) => {
		const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
		const barColor = g.barColor || '#6441a5';
		const bgColor = g.barBgColor || '#1a1a2e';
		const txtColor = g.textColor || '#ffffff';
		const label = g.label || GOAL_LABELS[key] || key;
		return `
			<div class="goal-card" style="background:${bgColor};">
				<div class="goal-header" style="color:${txtColor};">
					<span class="goal-label">${label}</span>
					<span>${g.current} / ${g.target}</span>
				</div>
				<div class="goal-track">
					<div class="goal-fill" style="background:${barColor};width:${pct}%;"></div>
				</div>
			</div>
		`;
	}).join('');
}

goals.on('change', (newVal) => {
	renderGoalBars(newVal);
});

nodecg.log.info('Goals Overlay geladen.');
