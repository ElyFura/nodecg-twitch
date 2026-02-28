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
];

const ALERT_HISTORY_LIMIT = 50;

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

	let listener = null;
	let apiClient = null;

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

	// --- OAuth Route ---
	const router = nodecg.Router();

	router.get('/auth/start', (req, res) => {
		const { clientId } = settings.value;
		if (!clientId) {
			return res.status(400).send('Client ID nicht gesetzt. Bitte zuerst in den Einstellungen eintragen.');
		}

		const redirectUri = `${req.protocol}://${req.get('host')}/nodecg-twitch/auth/callback`;
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
		const redirectUri = `${req.protocol}://${req.get('host')}/nodecg-twitch/auth/callback`;

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

			listener.start();

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

	// --- Alert Queue Management ---
	function pushAlert(data) {
		const config = alertConfig.value[data.type];
		if (config && !config.enabled) {
			nodecg.log.info(`Alert "${data.type}" deaktiviert, wird übersprungen.`);
			return;
		}

		// Determine priority from config or defaults
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
		};

		// Insert at correct position based on priority (higher priority = earlier in queue)
		const queue = alertQueue.value;
		let insertIndex = queue.length;
		for (let i = 0; i < queue.length; i++) {
			if (priority > (queue[i].priority || 5)) {
				insertIndex = i;
				break;
			}
		}
		queue.splice(insertIndex, 0, alert);

		nodecg.log.info(`Alert hinzugefügt: ${alert.type} von ${alert.username} (P${priority})`);

		// If nothing is currently shown, show next
		if (!currentAlert.value) {
			showNextAlert();
		}
	}

	function showNextAlert() {
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
		const testData = {
			follow: { type: 'follow', username: 'TestUser', message: '', amount: 0 },
			sub: { type: 'sub', username: 'TestUser', message: '', amount: 0, tier: '1000' },
			resub: { type: 'resub', username: 'TestUser', message: 'Bin schon 12 Monate dabei!', amount: 12, tier: '1000' },
			subgift: { type: 'subgift', username: 'TestUser', message: '', amount: 5, tier: '1000' },
			bits: { type: 'bits', username: 'TestUser', message: 'Hier sind ein paar Bits!', amount: 500 },
			raid: { type: 'raid', username: 'TestStreamer', message: '', amount: 42 },
			channelpoints: { type: 'channelpoints', username: 'TestUser', message: 'Hydrate!', amount: 500 },
		};

		const alertData = testData[data.type];
		if (alertData) {
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

	nodecg.listenFor('reconnect', async () => {
		await tryConnect();
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
