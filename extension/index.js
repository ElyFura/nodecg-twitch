'use strict';

const crypto = require('crypto');
const { RefreshingAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');
const { EventSubWsListener } = require('@twurple/eventsub-ws');

const TWITCH_SCOPES = [
	'moderator:read:followers',
	'channel:read:subscriptions',
	'bits:read',
	'channel:read:redemptions',
	'user:read:chat',
];

const ALERT_HISTORY_LIMIT = 50;
const CHAT_MESSAGE_LIMIT = 100;

const DEFAULT_PRIORITIES = {
	follow: 3,
	sub: 6,
	resub: 6,
	subgift: 7,
	bits: 5,
	raid: 8,
	channelpoints: 2,
};

module.exports = function (nodecg) {
	// --- Replicants ---
	const settings = nodecg.Replicant('settings');
	const connectionStatus = nodecg.Replicant('connectionStatus');
	const alertQueue = nodecg.Replicant('alertQueue');
	const currentAlert = nodecg.Replicant('currentAlert');
	const alertConfig = nodecg.Replicant('alertConfig');
	const alertHistory = nodecg.Replicant('alertHistory');
	const alertStats = nodecg.Replicant('alertStats');
	const goals = nodecg.Replicant('goals');
	const chatConfig = nodecg.Replicant('chatConfig');
	const chatMessages = nodecg.Replicant('chatMessages');

	let listener = null;
	let apiClient = null;
	let badgeUrlMap = {}; // { "broadcaster/1": "https://...", ... }

	async function fetchBadgeUrls(userId) {
		if (!apiClient) return;
		try {
			const globalBadges = await apiClient.chat.getGlobalBadges();
			const channelBadges = await apiClient.chat.getChannelBadges(userId);
			const map = {};
			for (const badge of [...globalBadges, ...channelBadges]) {
				for (const version of badge.versions) {
					map[`${badge.id}/${version.id}`] = version.getImageUrl(1);
				}
			}
			badgeUrlMap = map;
			nodecg.log.info(`${Object.keys(map).length} Badge-URLs geladen.`);
		} catch (err) {
			nodecg.log.error('Badge-URLs laden fehlgeschlagen:', err.message);
		}
	}

	// --- Alert History ---
	function recordToHistory(alert) {
		if (!alertHistory.value) {
			alertHistory.value = [];
		}
		alertHistory.value.unshift({
			id: alert.id,
			type: alert.type,
			username: alert.username,
			message: alert.message || '',
			amount: alert.amount || 0,
			tier: alert.tier || '',
			timestamp: alert.timestamp,
		});
		if (alertHistory.value.length > ALERT_HISTORY_LIMIT) {
			alertHistory.value.length = ALERT_HISTORY_LIMIT;
		}
	}

	// --- Alert Stats ---
	function trackStats(alert) {
		if (!alertStats.value) return;
		if (alertStats.value.sessionStart === 0) {
			alertStats.value.sessionStart = Date.now();
		}
		if (alertStats.value[alert.type] !== undefined) {
			alertStats.value[alert.type]++;
		}
		alertStats.value.total++;
		if (alert.type === 'bits' && alert.amount) {
			alertStats.value.bitsTotal += alert.amount;
		}
	}

	// --- Goal Progress ---
	function updateGoals(alert) {
		if (!goals.value) return;
		const goalMap = {
			follow: 'followGoal',
			sub: 'subGoal',
			resub: 'subGoal',
			subgift: 'subGoal',
			bits: 'bitsGoal',
		};
		const goalKey = goalMap[alert.type];
		if (!goalKey || !goals.value[goalKey] || !goals.value[goalKey].enabled) return;
		const goal = goals.value[goalKey];
		if (alert.type === 'bits') {
			goal.current += alert.amount || 0;
		} else {
			goal.current++;
		}
	}

	// --- Chat Message Handling ---
	function pushChatMessage(msg) {
		const config = chatConfig.value;
		if (!config || !config.enabled) return;

		// Filter: hide commands (messages starting with !)
		if (config.hideCommands && msg.text.startsWith('!')) return;

		// Filter: hide bot messages
		if (config.hideBotMessages && config.botUsernames) {
			const bots = config.botUsernames.split(',').map((b) => b.trim().toLowerCase());
			if (bots.includes(msg.username.toLowerCase())) return;
		}

		// Filter: hidden users
		if (config.hiddenUsers) {
			const hidden = config.hiddenUsers.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean);
			if (hidden.includes(msg.username.toLowerCase())) return;
		}

		if (!chatMessages.value) {
			chatMessages.value = [];
		}
		chatMessages.value.push(msg);
		if (chatMessages.value.length > CHAT_MESSAGE_LIMIT) {
			chatMessages.value.splice(0, chatMessages.value.length - CHAT_MESSAGE_LIMIT);
		}
	}

	// --- Alert Grouping ---
	const groupBuffers = {};
	const groupTimers = {};

	function flushGroup(type) {
		const buffer = groupBuffers[type];
		if (!buffer || buffer.length === 0) return;

		const config = alertConfig.value[type];
		const usernames = buffer.map((d) => d.username);
		const totalAmount = buffer.reduce((sum, d) => sum + (d.amount || 0), 0);
		const count = buffer.length;

		const grouped = {
			type,
			username: count <= 3 ? usernames.join(', ') : `${usernames[0]} +${count - 1} weitere`,
			message: '',
			amount: totalAmount,
			tier: buffer[0].tier || '',
			grouped: true,
			groupCount: count,
		};

		groupBuffers[type] = [];
		delete groupTimers[type];

		enqueueAlert(grouped);
	}

	// --- OAuth Route ---
	const router = nodecg.Router();

	router.get('/auth/start', (req, res) => {
		const { clientId } = settings.value;
		if (!clientId) {
			return res.status(400).send('Client ID nicht gesetzt. Bitte zuerst in den Einstellungen eintragen.');
		}

		const redirectUri = settings.value.redirectUri || `${req.protocol}://${req.get('host')}/nodecg-twitch/auth/callback`;
		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: 'code',
			scope: TWITCH_SCOPES.join(' '),
			force_verify: 'true',
		});

		res.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
	});

	router.get('/auth/callback', async (req, res) => {
		const { code } = req.query;
		if (!code) {
			return res.status(400).send('Kein Authorization Code erhalten.');
		}

		const { clientId, clientSecret } = settings.value;
		const redirectUri = settings.value.redirectUri || `${req.protocol}://${req.get('host')}/nodecg-twitch/auth/callback`;

		try {
			const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					client_id: clientId,
					client_secret: clientSecret,
					code,
					grant_type: 'authorization_code',
					redirect_uri: redirectUri,
				}),
			});

			const tokenData = await tokenResponse.json();

			if (tokenData.access_token) {
				settings.value.accessToken = tokenData.access_token;
				settings.value.refreshToken = tokenData.refresh_token || '';

				res.send(`
					<html><body style="background:#1a1a2e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
						<div style="text-align:center;">
							<h1 style="color:#6441a5;">Verbunden!</h1>
							<p>Twitch-Authentifizierung erfolgreich. Du kannst dieses Fenster schließen.</p>
						</div>
					</body></html>
				`);

				await tryConnect();
			} else {
				nodecg.log.error('Token-Fehler:', tokenData);
				res.status(500).send('Token-Abruf fehlgeschlagen: ' + (tokenData.message || 'Unbekannter Fehler'));
			}
		} catch (err) {
			nodecg.log.error('OAuth Callback Fehler:', err);
			res.status(500).send('Fehler bei der Authentifizierung.');
		}
	});

	nodecg.mount('/nodecg-twitch', router);

	// --- Twitch Connection ---
	async function tryConnect() {
		// Disconnect existing listener
		if (listener) {
			try {
				listener.stop();
			} catch { /* ignore */ }
			listener = null;
		}

		const { clientId, clientSecret, accessToken, refreshToken, channelName } = settings.value;

		if (!clientId || !clientSecret || !accessToken || !channelName) {
			connectionStatus.value = {
				status: 'disconnected',
				message: 'Fehlende Einstellungen. Bitte Client ID, Secret und Kanalname eintragen und mit Twitch verbinden.',
			};
			return;
		}

		connectionStatus.value = { status: 'connecting', message: 'Verbinde mit Twitch...' };

		try {
			const authProvider = new RefreshingAuthProvider({
				clientId,
				clientSecret,
			});

			authProvider.onRefresh((userId, newTokenData) => {
				nodecg.log.info('Twitch Token erneuert.');
				settings.value.accessToken = newTokenData.accessToken;
				settings.value.refreshToken = newTokenData.refreshToken || '';
			});

			await authProvider.addUserForToken(
				{
					accessToken,
					refreshToken,
					expiresIn: null,
					obtainmentTimestamp: Date.now(),
				},
				['chat'],
			);

			apiClient = new ApiClient({ authProvider });

			// Resolve channel name to user ID
			const user = await apiClient.users.getUserByName(channelName);
			if (!user) {
				connectionStatus.value = {
					status: 'error',
					message: `Kanal "${channelName}" nicht gefunden.`,
				};
				return;
			}

			settings.value.userId = user.id;
			const userId = user.id;

			// Set up EventSub WebSocket
			listener = new EventSubWsListener({ apiClient });

			// --- Follow (broadcaster is always mod of their own channel) ---
			listener.onChannelFollow(userId, userId, (event) => {
				pushAlert({
					type: 'follow',
					username: event.userDisplayName,
					message: '',
					amount: 0,
				});
			});

			// --- Subscription (new) ---
			listener.onChannelSubscription(userId, (event) => {
				pushAlert({
					type: 'sub',
					username: event.userDisplayName,
					message: '',
					amount: 0,
					tier: event.tier,
				});
			});

			// --- Resub (with message) ---
			listener.onChannelSubscriptionMessage(userId, (event) => {
				pushAlert({
					type: 'resub',
					username: event.userDisplayName,
					message: event.messageText || '',
					amount: event.cumulativeMonths,
					tier: event.tier,
				});
			});

			// --- Gift Sub ---
			listener.onChannelSubscriptionGift(userId, (event) => {
				pushAlert({
					type: 'subgift',
					username: event.gifterDisplayName || 'Anonym',
					message: '',
					amount: event.amount,
					tier: event.tier,
				});
			});

			// --- Bits / Cheers ---
			listener.onChannelCheer(userId, (event) => {
				pushAlert({
					type: 'bits',
					username: event.userDisplayName || 'Anonym',
					message: event.message || '',
					amount: event.bits,
				});
			});

			// --- Raid ---
			listener.onChannelRaidTo(userId, (event) => {
				pushAlert({
					type: 'raid',
					username: event.raidingBroadcasterDisplayName,
					message: '',
					amount: event.viewers,
				});
			});

			// --- Channel Point Redemption ---
			listener.onChannelRedemptionAdd(userId, (event) => {
				pushAlert({
					type: 'channelpoints',
					username: event.userDisplayName,
					message: event.rewardTitle + (event.input ? ': ' + event.input : ''),
					amount: event.rewardCost,
				});
			});

			// --- Chat Messages ---
			listener.onChannelChatMessage(userId, userId, (event) => {
				try {
					// Normalize badges: could be Map, Array, plain object, or undefined
					let badges = {};
					if (event.badges) {
						if (typeof event.badges[Symbol.iterator] === 'function') {
							badges = Object.fromEntries(event.badges);
						} else if (typeof event.badges === 'object') {
							badges = Object.assign({}, event.badges);
						}
					}

					// Normalize fragments: messageParts may not exist in all event types
					let fragments = [];
					if (event.messageParts && Array.isArray(event.messageParts)) {
						fragments = event.messageParts.map((part) => ({
							type: part.type,
							text: part.text,
							emoteId: part.type === 'emote' && part.emote ? part.emote.id : undefined,
						}));
					}

					// Resolve badge IDs to image URLs
					const badgeList = [];
					if (badges && typeof badges === 'object') {
						for (const [id, version] of Object.entries(badges)) {
							const url = badgeUrlMap[`${id}/${version}`];
							if (url) {
								badgeList.push({ id, url });
							}
						}
					}

					pushChatMessage({
						id: event.messageId,
						username: event.chatterName,
						displayName: event.chatterDisplayName,
						color: event.color || null,
						text: event.messageText,
						badges: badgeList,
						fragments,
						timestamp: Date.now(),
					});
				} catch (err) {
					nodecg.log.error('Chat-Nachricht Fehler:', err.message);
					nodecg.log.error('Event-Daten:', JSON.stringify({
						badges: typeof event.badges,
						messageParts: typeof event.messageParts,
						keys: event.badges ? Object.getOwnPropertyNames(event.badges).slice(0, 5) : null,
					}));
				}
			});

			listener.start();
			await fetchBadgeUrls(userId);

			connectionStatus.value = {
				status: 'connected',
				message: `Verbunden mit Kanal "${channelName}" (${userId})`,
			};
			nodecg.log.info(`Twitch EventSub verbunden: ${channelName}`);
		} catch (err) {
			nodecg.log.error('Twitch Verbindungsfehler:', err);
			connectionStatus.value = {
				status: 'error',
				message: `Verbindungsfehler: ${err.message}`,
			};
		}
	}

	// --- Cooldown tracking ---
	const lastAlertTime = {};

	// --- Alert Queue Management ---
	function enqueueAlert(data) {
		const config = alertConfig.value[data.type];
		const priority = (config && config.priority !== undefined)
			? config.priority
			: (DEFAULT_PRIORITIES[data.type] || 5);

		const alert = {
			id: crypto.randomUUID(),
			type: data.type,
			username: data.username,
			message: data.message || '',
			amount: data.amount || 0,
			tier: data.tier || '',
			timestamp: Date.now(),
			priority,
			grouped: data.grouped || false,
			groupCount: data.groupCount || 0,
		};

		const queue = alertQueue.value;
		let insertIndex = queue.length;
		for (let i = 0; i < queue.length; i++) {
			if (priority > (queue[i].priority || 5)) {
				insertIndex = i;
				break;
			}
		}
		queue.splice(insertIndex, 0, alert);

		nodecg.log.info(`Alert hinzugefügt: ${alert.type} von ${alert.username} (P${priority})${alert.grouped ? ` [Gruppe: ${alert.groupCount}]` : ''}`);

		if (!currentAlert.value) {
			showNextAlert();
		}
	}

	function pushAlert(data) {
		const config = alertConfig.value[data.type];
		if (config && !config.enabled) {
			nodecg.log.info(`Alert "${data.type}" deaktiviert, wird übersprungen.`);
			return;
		}

		// Check minimum amount threshold
		if (config && config.minAmount > 0 && (data.amount || 0) < config.minAmount) {
			nodecg.log.info(`Alert "${data.type}" unter Schwellwert (${data.amount || 0} < ${config.minAmount}), übersprungen.`);
			return;
		}

		// Check minimum tier threshold (sub, resub, subgift)
		if (config && config.minTier && data.tier) {
			if (parseInt(data.tier) < parseInt(config.minTier)) {
				nodecg.log.info(`Alert "${data.type}" unter Tier-Schwellwert (${data.tier} < ${config.minTier}), übersprungen.`);
				return;
			}
		}

		// Check cooldown
		if (config && config.cooldown > 0) {
			const now = Date.now();
			const last = lastAlertTime[data.type] || 0;
			if (now - last < config.cooldown * 1000) {
				nodecg.log.info(`Alert "${data.type}" im Cooldown, übersprungen.`);
				return;
			}
			lastAlertTime[data.type] = now;
		} else {
			lastAlertTime[data.type] = Date.now();
		}

		// Track stats and goals
		trackStats(data);
		updateGoals(data);

		// Check grouping
		if (config && config.groupEnabled && config.groupWindow > 0) {
			if (!groupBuffers[data.type]) groupBuffers[data.type] = [];
			groupBuffers[data.type].push(data);
			if (!groupTimers[data.type]) {
				groupTimers[data.type] = setTimeout(() => flushGroup(data.type), config.groupWindow * 1000);
			}
			return;
		}

		enqueueAlert(data);
	}

	function showNextAlert() {
		if (settings.value.alertsPaused) {
			return;
		}

		if (alertQueue.value.length === 0) {
			currentAlert.value = null;
			return;
		}

		const next = alertQueue.value.shift();
		currentAlert.value = JSON.parse(JSON.stringify(next));

		// Record to history
		recordToHistory(next);
	}

	// When graphic signals it's done displaying (sets currentAlert to null), show next
	currentAlert.on('change', (newVal, oldVal) => {
		if (newVal === null && oldVal !== null) {
			// Configurable delay before next alert
			const delay = (settings.value && settings.value.alertDelay !== undefined)
				? settings.value.alertDelay
				: 500;
			setTimeout(() => showNextAlert(), delay);
		}
	});

	// --- Messages from Dashboard ---
	nodecg.listenFor('triggerTestAlert', (data) => {
		const testDefaults = {
			follow: { type: 'follow', username: 'TestUser', message: '', amount: 0 },
			sub: { type: 'sub', username: 'TestUser', message: '', amount: 0, tier: '1000' },
			resub: { type: 'resub', username: 'TestUser', message: 'Bin schon 12 Monate dabei!', amount: 12, tier: '1000' },
			subgift: { type: 'subgift', username: 'TestUser', message: '', amount: 5, tier: '1000' },
			bits: { type: 'bits', username: 'TestUser', message: 'Hier sind ein paar Bits!', amount: 500 },
			raid: { type: 'raid', username: 'TestStreamer', message: '', amount: 42 },
			channelpoints: { type: 'channelpoints', username: 'TestUser', message: 'Hydrate!', amount: 500 },
		};

		const alertData = testDefaults[data.type];
		if (alertData) {
			if (data.username) alertData.username = data.username;
			if (data.message) alertData.message = data.message;
			if (data.amount !== undefined && data.amount !== '') alertData.amount = Number(data.amount);
			pushAlert(alertData);
		}
	});

	nodecg.listenFor('clearQueue', () => {
		alertQueue.value = [];
		currentAlert.value = null;
		nodecg.log.info('Alert-Queue geleert.');
	});

	nodecg.listenFor('skipAlert', () => {
		currentAlert.value = null;
	});

	nodecg.listenFor('clearHistory', () => {
		alertHistory.value = [];
		nodecg.log.info('Alert-Verlauf geleert.');
	});

	nodecg.listenFor('togglePause', (data) => {
		settings.value.alertsPaused = !!data.paused;
		nodecg.log.info(`Alerts ${data.paused ? 'pausiert' : 'fortgesetzt'}.`);
		if (!data.paused && !currentAlert.value && alertQueue.value.length > 0) {
			showNextAlert();
		}
	});

	nodecg.listenFor('reconnect', async () => {
		await tryConnect();
	});

	nodecg.listenFor('disconnect', () => {
		if (listener) {
			try {
				listener.stop();
			} catch { /* ignore */ }
			listener = null;
		}
		connectionStatus.value = {
			status: 'disconnected',
			message: 'Manuell getrennt.',
		};
		nodecg.log.info('Twitch-Verbindung manuell getrennt.');
	});

	nodecg.listenFor('resetStats', () => {
		alertStats.value = {
			sessionStart: Date.now(),
			follow: 0, sub: 0, resub: 0, subgift: 0,
			bits: 0, bitsTotal: 0, raid: 0, channelpoints: 0, total: 0,
		};
		nodecg.log.info('Alert-Statistiken zurückgesetzt.');
	});

	nodecg.listenFor('updateGoal', (data) => {
		if (!goals.value || !data.goalKey || !goals.value[data.goalKey]) return;
		const goal = goals.value[data.goalKey];
		if (data.target !== undefined) goal.target = Number(data.target);
		if (data.current !== undefined) goal.current = Number(data.current);
		if (data.enabled !== undefined) goal.enabled = !!data.enabled;
		if (data.label !== undefined) goal.label = data.label;
		if (data.showInOverlay !== undefined) goal.showInOverlay = !!data.showInOverlay;
		if (data.barColor !== undefined) goal.barColor = data.barColor;
	});

	nodecg.listenFor('clearChat', () => {
		chatMessages.value = [];
		nodecg.log.info('Chat-Nachrichten geleert.');
	});

	nodecg.listenFor('sendTestChatMessage', () => {
		pushChatMessage({
			id: 'test-' + crypto.randomUUID(),
			username: 'testuser',
			displayName: 'TestUser',
			color: '#FF69B4',
			text: 'Das ist eine Test-Nachricht! PogChamp',
			badges: badgeUrlMap['broadcaster/1'] ? [{ id: 'broadcaster', url: badgeUrlMap['broadcaster/1'] }] : [],
			fragments: [
				{ type: 'text', text: 'Das ist eine Test-Nachricht! ' },
				{ type: 'emote', text: 'PogChamp', emoteId: '305954156' },
			],
			timestamp: Date.now(),
		});
	});

	nodecg.listenFor('resetGoal', (data) => {
		if (!goals.value || !data.goalKey || !goals.value[data.goalKey]) return;
		goals.value[data.goalKey].current = 0;
	});

	// --- Auto-connect on startup ---
	settings.on('change', () => {
		if (settings.value.accessToken && settings.value.clientId && settings.value.channelName) {
			if (connectionStatus.value.status === 'disconnected' || connectionStatus.value.status === 'error') {
				tryConnect();
			}
		}
	});
};
