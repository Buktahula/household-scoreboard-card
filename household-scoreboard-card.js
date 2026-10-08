/**
 * Household Scoreboard Card for Home Assistant
 * A gamified household chore and task scoreboard card with podium, levels, XP progress, and quick actions.
 * 
 * GitHub: https://github.com/buktahula/household-scoreboard-card
 * License: MIT
 */

const CARD_VERSION = '1.3.6';

console.info(
  `%c 🏆 HOUSEHOLD-SCOREBOARD-CARD %c v${CARD_VERSION} `,
  'color: #121212; background: #ffd700; font-weight: 700; border-radius: 4px 0 0 4px; padding: 2px 4px;',
  'color: #fff; background: #222; font-weight: 700; border-radius: 0 4px 4px 0; padding: 2px 4px;'
);

const DEFAULT_LEVELS = [
  { min: 50, title: 'Legende', badge: '👑', color: '#ff4081', max: 100 },
  { min: 30, title: 'Profi', badge: '⚡', color: '#7c4dff', max: 50 },
  { min: 15, title: 'Fleißig', badge: '🐝', color: '#00e676', max: 30 },
  { min: 5,  title: 'Helfer', badge: '⭐', color: '#ffd600', max: 15 },
  { min: 0,  title: 'Novize', badge: '🌱', color: '#00b0ff', max: 5 },
];

const DEFAULT_COLORS = [
  '#448aff', // Blue
  '#00e676', // Green
  '#ff4081', // Pink
  '#ffd600', // Yellow
  '#aa00ff', // Purple
  '#ff9100', // Orange
  '#00e5ff', // Cyan
  '#ff5252'  // Red
];

const TASK_CATEGORY_MAP = [
  {
    icon: '🍽️',
    name: 'Küche',
    color: '#ff9800',
    keywords: ['spülmaschine', 'geschirr', 'abwasch', 'spülen', 'kochen', 'küche', 'kühlschrank', 'herd', 'backofen', 'teller', 'topf', 'pfanne', 'tisch decken', 'kitchen', 'dish', 'dishwasher', 'cook', 'bake']
  },
  {
    icon: '🗑️',
    name: 'Müll',
    color: '#8d6e63',
    keywords: ['müll', 'abfall', 'tonne', 'gelber sack', 'altpapier', 'glascontainer', 'biomüll', 'kompost', 'wertstoff', 'trash', 'garbage', 'recycle', 'bin']
  },
  {
    icon: '🧹',
    name: 'Boden & Saugen',
    color: '#00bcd4',
    keywords: ['saugen', 'staubsaugen', 'wischen', 'boden', 'fegen', 'kehren', 'staub', 'roboter', 'sauger', 'vacuum', 'sweep', 'mop', 'dust']
  },
  {
    icon: '🧺',
    name: 'Wäsche',
    color: '#ab47bc',
    keywords: ['wäsche', 'waschen', 'waschmaschine', 'bügeln', 'trockner', 'aufhängen', 'zusammenlegen', 'bettwäsche', 'handtücher', 'laundry', 'wash', 'iron']
  },
  {
    icon: '🚿',
    name: 'Bad',
    color: '#29b6f6',
    keywords: ['bad', 'badezimmer', 'toilette', 'wc', 'klo', 'dusche', 'badewanne', 'waschbecken', 'spiegel', 'klobürste', 'bathroom', 'toilet', 'shower']
  },
  {
    icon: '🛒',
    name: 'Einkauf',
    color: '#66bb6a',
    keywords: ['einkauf', 'einkaufen', 'besorgen', 'supermarkt', 'drogerie', 'getränke', 'markt', 'grocery', 'shopping', 'buy']
  },
  {
    icon: '🌱',
    name: 'Pflanzen & Garten',
    color: '#9ccc65',
    keywords: ['pflanze', 'pflanzen', 'blumen', 'gießen', 'garten', 'rasen', 'mähen', 'unkraut', 'balkon', 'beet', 'plants', 'garden', 'water']
  },
  {
    icon: '🐾',
    name: 'Haustiere',
    color: '#ff7043',
    keywords: ['hund', 'katze', 'füttern', 'katzenklo', 'gassi', 'fressnapf', 'futter', 'tier', 'haustier', 'pet', 'dog', 'cat', 'feed']
  },
  {
    icon: '📦',
    name: 'Aufräumen',
    color: '#78909c',
    keywords: ['aufräumen', 'ordnung', 'ausmisten', 'schreibtisch', 'zimmer', 'keller', 'dachboden', 'schrank', 'tidy', 'clean up', 'organize']
  },
  {
    icon: '🔧',
    name: 'Reparatur',
    color: '#ec407a',
    keywords: ['reparieren', 'reparatur', 'fahrrad', 'auto', 'werkstatt', 'glühbirne', 'filter', 'batterie', 'schrauben', 'repair', 'fix', 'bike', 'car']
  },
  {
    icon: '📚',
    name: 'Lernen & Schule',
    color: '#5c6bc0',
    keywords: ['hausaufgabe', 'lernen', 'schule', 'üben', 'lesen', 'vokabeln', 'study', 'homework', 'school', 'read']
  },
  {
    icon: '💪',
    name: 'Fitness & Sport',
    color: '#ba68c8',
    keywords: ['sport', 'training', 'workout', 'laufen', 'gym', 'fitness', 'yoga', 'exercise']
  }
];


class HouseholdScoreboardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._lastStateHash = '';
    this._lastTodoHash = '';
    this._lastThemeHash = '';
    this._appliedThemeProps = [];
    this._pendingTargets = {};
    this._todoItems = [];
    this._isResettingTodos = false;
    this._audioCtx = null;
    this._soundMuted = false;
    try {
      this._soundMuted = localStorage.getItem('hsc_sound_muted') === 'true';
    } catch (e) {}
    this._rouletteSpinning = false;
    this._rouletteTargetItem = null;
    this._completingTasks = new Set();
    this._handledNotificationActions = new Set();
    this._activeNotifications = new Map();
    this._notifSub = null;
  }

  disconnectedCallback() {
    this._unsubscribeNotificationEvents();
  }

  static getConfigElement() {
    return document.createElement('household-scoreboard-card-editor');
  }

  static getStubConfig(hass, entities) {
    // Attempt auto-discovery of counter, person, and todo entities
    const counters = entities ? entities.filter(e => e.startsWith('counter.')) : [];
    const persons = entities ? entities.filter(e => e.startsWith('person.')) : [];
    const todo = entities ? entities.find(e => e.startsWith('todo.')) : '';
    
    let defaultPlayers = [
      { name: 'Alex', entity: 'counter.punkte_alex', person: 'person.alex' },
      { name: 'Luca', entity: 'counter.punkte_luca', person: 'person.luca' },
      { name: 'Sarah', entity: 'counter.punkte_sarah', person: 'person.sarah' }
    ];

    if (counters.length > 0) {
      defaultPlayers = counters.slice(0, 3).map((c, i) => {
        const pName = c.replace('counter.', '').replace('punkte_', '').replace('_', ' ');
        return {
          name: pName.charAt(0).toUpperCase() + pName.slice(1),
          entity: c,
          person: persons[i] || ''
        };
      });
    }

    return {
      type: 'custom:household-scoreboard-card',
      title: '🏆 Haushalts-Rangliste',
      subtitle: 'Gaming Scoreboard • Wer sammelt die meisten XP?',
      show_podium: true,
      show_ranks: true,
      show_actions: true,
      show_reset: true,
      todo_entity: todo || '',
      show_todo: !!todo,
      todo_title: '📋 Aufgaben & Quests',
      unit: 'XP',
      show_streaks: true,
      show_task_icons: true,
      show_roulette: true,
      enable_sound: true,
      players: defaultPlayers
    };
  }

  getCardSize() {
    return 6;
  }

  setConfig(config) {
    this._config = {
      title: '🏆 Haushalts-Rangliste',
      subtitle: 'Gaming Scoreboard • Wer sammelt die meisten XP?',
      show_podium: true,
      show_ranks: true,
      show_actions: true,
      show_reset: false,
      reset_text: 'Wochen-Scoreboard zurücksetzen',
      reset_confirm: 'Möchtest du die Punkte wirklich für alle Spieler zurücksetzen?',
      unit: 'XP',
      action_step: 1,
      allow_decrement: true,
      todo_entity: '',
      show_todo: true,
      todo_title: '📋 Aufgaben & Quests',
      max_tasks: 0,
      todo_limit: 0,
      todo_max_height: '',
      card_height: '',
      card_max_height: '',
      always_scroll: false,
      compact: false,
      show_streaks: true,
      show_task_icons: true,
      show_roulette: true,
      enable_sound: true,
      levels: DEFAULT_LEVELS,
      players: [],
      ...config
    };

    if (this._config.compact) {
      this.setAttribute('compact', '');
    } else {
      this.removeAttribute('compact');
    }

    this._render();
    this._applyCardDimensions();
    if (this._hass) {
      const currentTheme = this._config.theme || this._hass.themes?.theme || 'default';
      const isDark = (this._config.theme && this._config.theme !== 'default')
        ? (this._hass.themes?.darkMode || false)
        : (this._hass.themes?.darkMode || false);
      this._applyTheme(currentTheme, isDark);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }

    if (this._hass && this._config.todo_entity) {
      this._fetchTodoItems();
    }
  }

  _formatDimension(val) {
    if (val === undefined || val === null || val === '') return '';
    const str = String(val).trim();
    if (!str) return '';
    if (/^\d+(\.\d+)?$/.test(str)) {
      return `${str}px`;
    }
    return str;
  }

  _applyCardDimensions() {
    if (!this.shadowRoot) return;
    const card = this.shadowRoot.querySelector('ha-card');
    if (!card || !this._config) return;

    const rawHeight = this._config.card_height || this._config.height;
    const rawMaxHeight = this._config.card_max_height || this._config.max_height;
    const alwaysScroll = this._config.always_scroll === true || this._config.always_scroll === 'true';

    const height = this._formatDimension(rawHeight);
    const maxHeight = this._formatDimension(rawMaxHeight);

    if (height) {
      card.style.height = height;
    } else {
      card.style.height = '';
    }

    if (maxHeight) {
      card.style.maxHeight = maxHeight;
    } else if (alwaysScroll && !height) {
      card.style.maxHeight = '500px';
    } else {
      card.style.maxHeight = '';
    }

    if (alwaysScroll) {
      card.classList.add('scrollable');
      card.classList.add('force-scroll');
    } else if (height || maxHeight) {
      card.classList.add('scrollable');
      card.classList.remove('force-scroll');
    } else {
      card.classList.remove('scrollable');
      card.classList.remove('force-scroll');
    }
  }

  _applyTheme(themeName, isDark) {
    this.setAttribute('data-theme', isDark ? 'dark' : 'light');

    if (!this._appliedThemeProps) {
      this._appliedThemeProps = [];
    }

    // Remove previously applied custom theme properties
    this._appliedThemeProps.forEach(prop => {
      this.style.removeProperty(prop);
    });
    this._appliedThemeProps = [];

    if (this._hass && this._hass.themes && this._hass.themes.themes) {
      const theme = this._hass.themes.themes[themeName];
      if (theme) {
        let styles = {};
        if (theme.modes) {
          styles = { ...theme, ...(isDark ? theme.modes.dark : theme.modes.light) };
          delete styles.modes;
        } else {
          styles = { ...theme };
        }

        for (const [key, value] of Object.entries(styles)) {
          const prop = key.startsWith('--') ? key : `--${key}`;
          this.style.setProperty(prop, String(value));
          this._appliedThemeProps.push(prop);
        }
      }
    }
  }

  set hass(hass) {
    const prevHass = this._hass;
    this._hass = hass;
    if (!prevHass && hass) {
      this._subscribeNotificationEvents();
    }
    if (!this._config || !this._config.players) return;

    // Check for theme changes (card-level config.theme or Home Assistant selected theme / dark mode)
    const currentTheme = this._config.theme || hass.themes?.theme || 'default';
    const isDark = (this._config.theme && this._config.theme !== 'default')
      ? (hass.themes?.darkMode || false)
      : (hass.themes?.darkMode || false);
    const themeHash = `${currentTheme}:${isDark}`;

    if (themeHash !== this._lastThemeHash) {
      this._lastThemeHash = themeHash;
      this._applyTheme(currentTheme, isDark);
    }

    // Check if player states have changed
    const currentHash = this._config.players.map(p => {
      const s = hass.states[p.entity];
      const personState = p.person ? hass.states[p.person] : null;
      return `${p.entity}:${s ? s.state : 'null'}:${personState ? personState.attributes.entity_picture : ''}`;
    }).join('|');

    // Check if todo entity state has changed
    let todoHash = '';
    if (this._config.todo_entity && hass.states[this._config.todo_entity]) {
      const ts = hass.states[this._config.todo_entity];
      todoHash = `${this._config.todo_entity}:${ts.state}:${ts.last_updated}`;
    }

    const stateChanged = currentHash !== this._lastStateHash;
    const todoChanged = todoHash !== this._lastTodoHash;

    // Reconcile pending targets when Home Assistant updates
    if (this._pendingTargets && this._config.players) {
      this._config.players.forEach(p => {
        const pending = this._pendingTargets[p.entity];
        if (pending && hass.states[p.entity]) {
          const val = parseFloat(hass.states[p.entity].state);
          if (!isNaN(val)) {
            if ((pending.direction > 0 && val >= pending.target) ||
                (pending.direction < 0 && val <= pending.target)) {
              if (pending.timer) clearTimeout(pending.timer);
              delete this._pendingTargets[p.entity];
            }
          }
        }
      });
    }

    if (stateChanged || todoChanged) {
      this._lastStateHash = currentHash;
      if (todoChanged) {
        this._lastTodoHash = todoHash;
        this._fetchTodoItems();
      }
      this._updateData();
    }
  }

  async _subscribeNotificationEvents() {
    if (this._notifSub || !this._hass || !this._hass.connection || !this._hass.connection.subscribeEvents) return;
    try {
      this._notifSub = await this._hass.connection.subscribeEvents((event) => {
        if (event && event.data && typeof event.data.action === 'string' && event.data.action.startsWith('HSC_DONE|')) {
          this._handleNotificationAction(event.data.action);
        }
      }, 'mobile_app_notification_action');
    } catch (e) {
      console.warn('HouseholdScoreboardCard: could not subscribe to mobile_app_notification_action', e);
    }
  }

  _unsubscribeNotificationEvents() {
    if (this._notifSub) {
      try {
        if (typeof this._notifSub === 'function') {
          this._notifSub();
        } else if (this._notifSub.then) {
          this._notifSub.then(unsub => { if (typeof unsub === 'function') unsub(); });
        }
      } catch (e) {}
      this._notifSub = null;
    }
  }

  async _handleNotificationAction(actionString) {
    if (!this._handledNotificationActions) this._handledNotificationActions = new Set();
    if (this._handledNotificationActions.has(actionString)) return;
    this._handledNotificationActions.add(actionString);

    const parts = actionString.split('|');
    if (parts.length < 5) return;
    const [_, todoEntity, itemId, playerEntity, xpStr] = parts;

    // 1. Close roulette modal immediately if it was open on the dashboard
    this._closeRouletteModal();

    // 2. Fetch fresh items if needed to verify state
    let item = (this._todoItems || []).find(i => (i.uid === itemId || i.id === itemId || i.summary === itemId));
    if (!item && this._hass && this._config.todo_entity) {
      await this._fetchTodoItems();
      item = (this._todoItems || []).find(i => (i.uid === itemId || i.id === itemId || i.summary === itemId));
    }

    const players = this._config.players || [];
    const player = players.find(p => p.entity === playerEntity) || { entity: playerEntity, name: 'Spieler' };

    if (item) {
      const meta = this._parseTodoMetadata(item);
      await this._completeTask(item, player, meta);
    } else {
      this._dismissTaskNotification({ uid: itemId, summary: itemId }, player);
    }
  }

  _resolveNotifyService(player) {
    if (player && player.notify_service) return player.notify_service;
    if (this._config && this._config.notify_service) return this._config.notify_service;

    // Auto-discovery from hass.services.notify
    if (this._hass && this._hass.services && this._hass.services.notify && player) {
      const services = Object.keys(this._hass.services.notify);
      const cleanName = (player.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanName) {
        const mobileMatch = services.find(s => s.toLowerCase().startsWith('mobile_app_') && s.toLowerCase().includes(cleanName));
        if (mobileMatch) return `notify.${mobileMatch}`;
        const anyMatch = services.find(s => s.toLowerCase().includes(cleanName));
        if (anyMatch) return `notify.${anyMatch}`;
      }
    }
    return null;
  }

  async _sendTaskNotification(player, item, meta) {
    const notifyService = this._resolveNotifyService(player);
    if (!notifyService) {
      alert(`Kein Benachrichtigungsdienst für "${player.name}" konfiguriert!\n\nBitte trage in der Card-Konfiguration beim Spieler "notify_service: notify.mobile_app_..." ein.`);
      return false;
    }

    const unit = this._config.unit || 'XP';
    const itemId = item.uid || item.id || item.summary;
    const taskName = meta.cleanSummary || item.summary || 'Aufgabe';
    const actionKey = `HSC_DONE|${this._config.todo_entity}|${itemId}|${player.entity}|${meta.totalXp}`;

    const title = `🎲 Haushalts-Roulette: Du bist dran!`;
    const message = `Hey ${player.name}! Das Los hat entschieden:\nBitte erledige "${taskName}" (+${meta.totalXp} ${unit})!`;

    const rawService = notifyService.replace(/^notify\./, '');
    const serviceParts = rawService.split('.');
    const domain = serviceParts.length > 1 ? serviceParts[0] : 'notify';
    const service = serviceParts.length > 1 ? serviceParts[1] : serviceParts[0];

    const actions = [
      {
        action: actionKey,
        title: `✅ Erledigt (+${meta.totalXp} ${unit})`
      }
    ];

    const payload = {
      title,
      message,
      data: {
        tag: `hsc_task_${itemId}`,
        group: 'household-scoreboard',
        channel: 'Haushalts-Aufgaben',
        importance: 'high',
        actions
      }
    };

    try {
      await this._hass.callService(domain, service, payload);
      if (!this._activeNotifications) this._activeNotifications = new Map();
      this._activeNotifications.set(itemId, notifyService);
      this._forwardHaptic('success');
      this._playSound('coin');
      return true;
    } catch (err) {
      console.warn('HouseholdScoreboardCard: error with notify service, trying notify.send_message', err);
      try {
        await this._hass.callService('notify', 'send_message', {
          entity_id: notifyService.startsWith('notify.') ? notifyService : `notify.${notifyService}`,
          title,
          message,
          data: payload.data
        });
        if (!this._activeNotifications) this._activeNotifications = new Map();
        this._activeNotifications.set(itemId, notifyService);
        this._forwardHaptic('success');
        this._playSound('coin');
        return true;
      } catch (err2) {
        console.error('HouseholdScoreboardCard: error sending notification', err2);
        alert(`Fehler beim Senden der Benachrichtigung via ${notifyService}:\n${err2.message || err2}`);
        return false;
      }
    }
  }

  async _dismissTaskNotification(item, player = null) {
    if (!item) return;
    const itemId = item.uid || item.id || item.summary;
    if (!itemId) return;
    const tag = `hsc_task_${itemId}`;

    const notifyServices = new Set();

    if (this._activeNotifications && this._activeNotifications.has(itemId)) {
      notifyServices.add(this._activeNotifications.get(itemId));
      this._activeNotifications.delete(itemId);
    }

    if (player) {
      const s = this._resolveNotifyService(player);
      if (s) notifyServices.add(s);
    }

    // Fallback: check all configured players
    if (notifyServices.size === 0 && this._config && this._config.players) {
      this._config.players.forEach(p => {
        const s = this._resolveNotifyService(p);
        if (s) notifyServices.add(s);
      });
    }

    for (const notifyService of notifyServices) {
      try {
        const rawService = notifyService.replace(/^notify\./, '');
        const serviceParts = rawService.split('.');
        const domain = serviceParts.length > 1 ? serviceParts[0] : 'notify';
        const service = serviceParts.length > 1 ? serviceParts[1] : serviceParts[0];

        await this._hass.callService(domain, service, {
          message: 'clear_notification',
          data: { tag }
        });
      } catch (err) {
        // Silently ignore dismiss errors
      }
    }
  }

  _playSound(type) {

    if (this._config.enable_sound === false || this._soundMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this._audioCtx) {
        this._audioCtx = new AudioCtx();
      }
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume();
      }
      const ctx = this._audioCtx;
      const now = ctx.currentTime;

      if (type === 'coin') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.setValueAtTime(0.12, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'fanfare') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.connect(gain);
          gain.connect(ctx.destination);

          const start = now + idx * 0.08;
          const dur = idx === notes.length - 1 ? 0.4 : 0.12;

          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.18, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

          osc.start(start);
          osc.stop(start + dur);
        });
      } else if (type === 'dice') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(450 + Math.random() * 250, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'win') {
        [587.33, 739.99, 880.00, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.connect(gain);
          gain.connect(ctx.destination);

          const start = now + idx * 0.05;
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.15, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

          osc.start(start);
          osc.stop(start + 0.45);
        });
      }
    } catch (e) {
      console.warn('HouseholdScoreboardCard: audio error', e);
    }
  }

  _toggleSound() {
    this._soundMuted = !this._soundMuted;
    try {
      localStorage.setItem('hsc_sound_muted', this._soundMuted ? 'true' : 'false');
    } catch (e) {}
    const icon = this.shadowRoot.getElementById('sound-icon');
    if (icon) icon.textContent = this._soundMuted ? '🔇' : '🔊';
    if (!this._soundMuted) this._playSound('coin');
  }

  _formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  _getPlayerStreak(player) {
    const key = `hsc_streak_${player.entity || player.name}`;
    let data = { count: 0, lastDate: null, best: 0 };
    try {
      const stored = localStorage.getItem(key);
      if (stored) data = JSON.parse(stored);
    } catch (e) {}

    // Support optional Home Assistant entity for streak
    if (player.streak_entity && this._hass && this._hass.states[player.streak_entity]) {
      const val = parseInt(this._hass.states[player.streak_entity].state, 10);
      if (!isNaN(val)) data.count = val;
    }

    if (!data.lastDate) return { count: data.count || 0, best: data.best || 0, activeToday: false };

    const now = new Date();
    const todayStr = this._formatDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this._formatDate(yesterday);

    if (data.lastDate === todayStr) {
      return { count: data.count, best: data.best || data.count, activeToday: true };
    } else if (data.lastDate === yesterdayStr) {
      return { count: data.count, best: data.best || data.count, activeToday: false };
    } else {
      return { count: 0, best: data.best || 0, activeToday: false };
    }
  }

  _recordPlayerStreak(player) {
    const key = `hsc_streak_${player.entity || player.name}`;
    let data = { count: 0, lastDate: null, best: 0 };
    try {
      const stored = localStorage.getItem(key);
      if (stored) data = JSON.parse(stored);
    } catch (e) {}

    const now = new Date();
    const todayStr = this._formatDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this._formatDate(yesterday);

    let newCount = 1;
    if (data.lastDate === todayStr) {
      newCount = data.count || 1;
    } else if (data.lastDate === yesterdayStr) {
      newCount = (data.count || 0) + 1;
    } else {
      newCount = 1;
    }

    const best = Math.max(newCount, data.best || 0);
    const updated = { count: newCount, lastDate: todayStr, best };
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {}

    if (player.streak_entity && this._hass) {
      const domain = player.streak_entity.split('.')[0];
      if (domain === 'counter') {
        this._callService('counter', 'set_value', { entity_id: player.streak_entity, value: newCount });
      } else if (domain === 'input_number') {
        this._callService('input_number', 'set_value', { entity_id: player.streak_entity, value: newCount });
      }
    }

    return updated;
  }

  _openRouletteModal(specificItem = null) {
    const players = this._getSortedPlayers();
    if (players.length === 0) {
      alert('Bitte lege zuerst mindestens einen Spieler in den Card-Einstellungen an!');
      return;
    }

    const openItems = (this._todoItems || []).filter(item => item.status === 'needs_action');
    let targetItem = specificItem;
    if (!targetItem) {
      if (openItems.length === 0) {
        alert('🎉 Alle Aufgaben sind bereits erledigt! Keine Aufgaben zum Auslosen vorhanden.');
        return;
      }
      targetItem = openItems[Math.floor(Math.random() * openItems.length)];
    }

    const meta = this._parseTodoMetadata(targetItem);
    const modal = this.shadowRoot.getElementById('roulette-modal');
    const taskTitle = this.shadowRoot.getElementById('roulette-task-title');
    const xpBadge = this.shadowRoot.getElementById('roulette-xp-badge');
    const stage = this.shadowRoot.getElementById('roulette-stage');
    const winnerWrap = this.shadowRoot.getElementById('roulette-winner-wrap');
    if (!modal) return;

    const unit = this._config.unit || 'XP';
    taskTitle.textContent = meta.cleanSummary || targetItem.summary || 'Aufgabe';
    xpBadge.innerHTML = `⭐ <b>+${meta.totalXp} ${unit}</b> ${meta.icon ? `<span style="margin-left:6px;">${meta.icon}</span>` : ''}`;

    stage.style.display = 'block';
    winnerWrap.style.display = 'none';
    modal.style.display = 'flex';

    this._rouletteTargetItem = targetItem;
    this._spinRoulette(targetItem, meta, players);
  }

  _closeRouletteModal() {
    const modal = this.shadowRoot.getElementById('roulette-modal');
    if (modal) modal.style.display = 'none';
    this._rouletteSpinning = false;
    this._rouletteTargetItem = null;
  }

  _spinRoulette(targetItem, meta, players) {
    if (this._rouletteSpinning) return;
    this._rouletteSpinning = true;

    const stage = this.shadowRoot.getElementById('roulette-stage');
    const spinner = this.shadowRoot.getElementById('roulette-slot-spinner');
    const winnerWrap = this.shadowRoot.getElementById('roulette-winner-wrap');
    const winnerName = this.shadowRoot.getElementById('roulette-winner-name');
    const winnerSub = this.shadowRoot.getElementById('roulette-winner-sub');
    const acceptBtn = this.shadowRoot.getElementById('roulette-accept-btn');
    const spinAgainBtn = this.shadowRoot.getElementById('roulette-spin-again-btn');

    stage.style.display = 'block';
    winnerWrap.style.display = 'none';

    // Weighted fair-share selection (lower points = higher chance)
    const maxPts = Math.max(...players.map(p => p.pts), 0);
    const weights = players.map(p => Math.max(1, maxPts - p.pts + 6));
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let randWeight = Math.random() * totalWeight;
    let chosenPlayer = players[0];
    for (let i = 0; i < players.length; i++) {
      if (randWeight < weights[i]) {
        chosenPlayer = players[i];
        break;
      }
      randWeight -= weights[i];
    }

    const intervals = [40, 40, 50, 50, 60, 70, 80, 100, 130, 160, 200, 260, 340, 440];
    let step = 0;
    let playerIdx = 0;

    const renderCandidate = (p) => {
      const avatarHtml = p.avatar
        ? `<img class="roulette-avatar" style="border-color:${p.color}" src="${p.avatar}" alt="${p.name}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="roulette-avatar" style="background:${p.color}; border-color:${p.color}; display:none;">${p.initials}</div>`
        : `<div class="roulette-avatar" style="background:${p.color}; border-color:${p.color}">${p.initials}</div>`;
      spinner.innerHTML = `
        ${avatarHtml}
        <div class="roulette-candidate-name">${p.name}</div>
        <div class="roulette-candidate-pts">${p.pts} ${this._config.unit || 'XP'}</div>
      `;
    };

    const nextTick = () => {
      if (step < intervals.length) {
        playerIdx = (playerIdx + 1) % players.length;
        renderCandidate(players[playerIdx]);
        this._playSound('dice');
        setTimeout(nextTick, intervals[step]);
        step++;
      } else {
        renderCandidate(chosenPlayer);
        this._playSound('win');
        this._fireConfetti();
        this._rouletteSpinning = false;

        setTimeout(() => {
          stage.style.display = 'none';
          winnerWrap.style.display = 'block';
          winnerName.innerHTML = `🎉 <b>${chosenPlayer.name}</b> ist dran!`;
          winnerSub.textContent = `Aufgabe: "${meta.cleanSummary || targetItem.summary || 'Aufgabe'}" (+${meta.totalXp} ${this._config.unit || 'XP'})`;

          const notifyBtn = this.shadowRoot.getElementById('roulette-notify-btn');
          if (notifyBtn) {
            notifyBtn.style.display = 'inline-flex';
            notifyBtn.textContent = `📱 ${chosenPlayer.name} benachrichtigen`;
            notifyBtn.disabled = false;
            notifyBtn.classList.remove('sent');
            notifyBtn.onclick = async () => {
              notifyBtn.disabled = true;
              notifyBtn.textContent = `⏳ Sende Nachricht...`;
              const success = await this._sendTaskNotification(chosenPlayer, targetItem, meta);
              if (success) {
                notifyBtn.textContent = `✅ Nachricht gesendet!`;
                notifyBtn.classList.add('sent');
              } else {
                notifyBtn.disabled = false;
                notifyBtn.textContent = `📱 ${chosenPlayer.name} benachrichtigen`;
              }
            };
          }

          acceptBtn.onclick = () => {
            this._closeRouletteModal();
            this._completeTask(targetItem, chosenPlayer, meta);
          };

          spinAgainBtn.onclick = () => {
            this._spinRoulette(targetItem, meta, players);
          };
        }, 500);
      }
    };

    nextTick();
  }

  _getLevelInfo(pts) {
    const levels = this._config.levels || DEFAULT_LEVELS;
    const sorted = [...levels].sort((a, b) => b.min - a.min);
    
    let current = sorted[sorted.length - 1];
    let next = null;

    for (let i = 0; i < sorted.length; i++) {
      if (pts >= sorted[i].min) {
        current = sorted[i];
        next = i > 0 ? sorted[i - 1] : null;
        break;
      }
    }

    let pct = 0;
    let nextPts = 0;

    if (next) {
      const range = next.min - current.min;
      const progress = pts - current.min;
      pct = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
      nextPts = next.min - pts;
    } else {
      // Highest level reached
      const maxPts = current.max || (current.min * 2);
      pct = Math.min(100, Math.round((pts / maxPts) * 100));
      nextPts = 0;
    }

    return {
      title: current.title,
      badge: current.badge,
      color: current.color || '#ffd700',
      pct,
      nextPts,
      nextTitle: next ? next.title : ''
    };
  }

  _getPlayerAvatar(player) {
    let url = null;
    if (player.avatar) url = player.avatar;
    else if (player.image) url = player.image;
    else if (player.person && this._hass && this._hass.states[player.person]) {
      const p = this._hass.states[player.person];
      if (p.attributes && p.attributes.entity_picture) {
        url = p.attributes.entity_picture;
      }
    } else if (player.entity && this._hass && this._hass.states[player.entity]) {
      const s = this._hass.states[player.entity];
      if (s.attributes && s.attributes.entity_picture) {
        url = s.attributes.entity_picture;
      }
    }
    if (!url) return null;

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    if (this._hass) {
      if (typeof this._hass.hassUrl === 'function') {
        return this._hass.hassUrl(url);
      }
      const baseUrl = this._hass.auth?.data?.hassUrl || this._hass.connectionContext?.hassUrl;
      if (baseUrl) {
        return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
      }
    }
    return url;
  }

  _getPlayerPoints(player) {
    let base = 0;
    if (this._hass && this._hass.states[player.entity]) {
      const val = parseFloat(this._hass.states[player.entity].state);
      base = isNaN(val) ? 0 : val;
    }

    if (this._pendingTargets && this._pendingTargets[player.entity]) {
      const pending = this._pendingTargets[player.entity];
      if (pending.direction > 0) {
        if (base >= pending.target) {
          if (pending.timer) clearTimeout(pending.timer);
          delete this._pendingTargets[player.entity];
          return base;
        }
        return Math.max(base, pending.target);
      } else {
        if (base <= pending.target) {
          if (pending.timer) clearTimeout(pending.timer);
          delete this._pendingTargets[player.entity];
          return base;
        }
        return Math.min(base, pending.target);
      }
    }

    return Math.max(0, base);
  }

  _getSortedPlayers() {
    if (!this._config.players || !Array.isArray(this._config.players)) {
      return [];
    }
    const players = this._config.players.map((p, idx) => {
      const pts = this._getPlayerPoints(p);
      const avatar = this._getPlayerAvatar(p);
      const color = p.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
      const level = this._getLevelInfo(pts);
      return {
        ...p,
        pts,
        avatar,
        color,
        level,
        initials: (p.name || 'P').substring(0, 2).toUpperCase()
      };
    });

    players.sort((a, b) => b.pts - a.pts);
    return players;
  }

  _forwardHaptic(type = 'success') {
    const event = new CustomEvent('haptic', {
      detail: type,
      bubbles: true,
      composed: true,
    });
    window.dispatchEvent(event);
  }

  _callService(domain, service, data) {
    if (!this._hass) return;
    this._hass.callService(domain, service, data);
  }

  _adjustScore(player, amount, playSound = true, recordStreak = true) {
    this._forwardHaptic(amount > 0 ? 'success' : 'warning');
    if (amount > 0) {
      if (recordStreak) this._recordPlayerStreak(player);
      if (playSound) this._playSound('coin');
    }
    
    // Calculate new target value based on confirmed HA state or current active target
    let base = 0;
    if (this._hass && this._hass.states[player.entity]) {
      const val = parseFloat(this._hass.states[player.entity].state);
      base = isNaN(val) ? 0 : val;
    }

    const prevTarget = (this._pendingTargets && this._pendingTargets[player.entity])
      ? this._pendingTargets[player.entity].target
      : base;

    const newTarget = Math.max(0, prevTarget + amount);

    if (!this._pendingTargets) this._pendingTargets = {};
    if (this._pendingTargets[player.entity]?.timer) {
      clearTimeout(this._pendingTargets[player.entity].timer);
    }

    // Safety timeout: revert if Home Assistant never confirms within 5 seconds
    const timer = setTimeout(() => {
      if (this._pendingTargets && this._pendingTargets[player.entity]) {
        delete this._pendingTargets[player.entity];
        this._updateData();
      }
    }, 5000);

    this._pendingTargets[player.entity] = {
      target: newTarget,
      direction: amount >= 0 ? 1 : -1,
      timer: timer
    };

    // Immediate optimistic UI update
    this._updateData();

    // Call Home Assistant service to update entity to newTarget
    const domain = player.entity.split('.')[0];
    const cur = newTarget;

    if (domain === 'counter') {
      const hasCounter = this._hass && this._hass.services && this._hass.services.counter;
      const canSetValue = !hasCounter || (hasCounter && hasCounter.set_value);
      if (canSetValue || Math.abs(amount) > 1) {
        this._callService('counter', 'set_value', { entity_id: player.entity, value: cur });
      } else if (amount > 0) {
        for (let i = 0; i < amount; i++) {
          this._callService('counter', 'increment', { entity_id: player.entity });
        }
      } else {
        for (let i = 0; i < Math.abs(amount); i++) {
          this._callService('counter', 'decrement', { entity_id: player.entity });
        }
      }
    } else if (domain === 'input_number') {
      this._callService('input_number', 'set_value', {
        entity_id: player.entity,
        value: cur
      });
    } else {
      // Fallback custom event or generic state change attempt
      const eventName = amount > 0 ? 'household_scoreboard_increment' : 'household_scoreboard_decrement';
      this._callService('event', 'fire', {
        event_type: eventName,
        event_data: { entity_id: player.entity, amount, value: cur }
      });
    }
  }

  _resetAll() {
    if (!this._config.players || this._config.players.length === 0) return;
    const confirmMsg = this._config.reset_confirm || 'Möchtest du alle Punkte wirklich zurücksetzen?';
    if (!confirm(confirmMsg)) return;

    this._forwardHaptic('heavy');
    const counters = this._config.players.map(p => p.entity).filter(e => e.startsWith('counter.'));
    const inputNumbers = this._config.players.map(p => p.entity).filter(e => e.startsWith('input_number.'));

    if (counters.length > 0) {
      this._callService('counter', 'reset', { entity_id: counters });
    }
    if (inputNumbers.length > 0) {
      inputNumbers.forEach(e => {
        this._callService('input_number', 'set_value', { entity_id: e, value: 0 });
      });
    }

    this._pendingTargets = {};
    this._updateData();
  }

  async _fetchTodoItems() {
    if (!this._hass || !this._config.todo_entity) return;
    try {
      const res = await this._hass.callWS({
        type: 'todo/item/list',
        entity_id: this._config.todo_entity
      });
      if (res && res.items) {
        this._todoItems = res.items;
        await this._checkAndAutoReset();
        this._updateTodoSection();

        // Check if currently displayed roulette item was completed elsewhere
        if (this._rouletteTargetItem) {
          const targetUid = this._rouletteTargetItem.uid || this._rouletteTargetItem.id || this._rouletteTargetItem.summary;
          const freshTarget = res.items.find(i => (i.uid === targetUid || i.id === targetUid || i.summary === targetUid));
          if (!freshTarget || freshTarget.status === 'completed') {
            console.log('HouseholdScoreboardCard: Roulette item completed or removed, closing modal');
            this._closeRouletteModal();
            this._dismissTaskNotification(this._rouletteTargetItem);
          }
        }
      }
    } catch (err) {
      console.warn('HouseholdScoreboardCard: error fetching todo items', err);
    }
  }

  _normalizeDate(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim().toLowerCase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (s === 'heute' || s === 'today') {
      return this._formatDate(today);
    }
    if (s === 'morgen' || s === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return this._formatDate(tomorrow);
    }
    if (s === 'übermorgen' || s === 'uebermorgen') {
      const overmorrow = new Date(today);
      overmorrow.setDate(overmorrow.getDate() + 2);
      return this._formatDate(overmorrow);
    }

    // Match ISO: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
    const mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (mIso) {
      const y = parseInt(mIso[1], 10);
      const m = String(parseInt(mIso[2], 10)).padStart(2, '0');
      const d = String(parseInt(mIso[3], 10)).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Match German: DD.MM.YYYY or DD.MM.
    const mDe = s.match(/^(\d{1,2})\.(\d{1,2})\.(?:(\d{4}))?/);
    if (mDe) {
      const d = String(parseInt(mDe[1], 10)).padStart(2, '0');
      const m = String(parseInt(mDe[2], 10)).padStart(2, '0');
      const y = mDe[3] ? parseInt(mDe[3], 10) : today.getFullYear();
      return `${y}-${m}-${d}`;
    }

    return null;
  }

  _formatDisplayDate(isoDate) {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoDate;
  }

  _parseTodoMetadata(item) {
    const summary = item.summary || '';
    const desc = item.description || '';
    // Combine summary and description so tags work in both places
    const fullText = `${summary}\n${desc}`;
    const dueDateStr = item.due || item.due_date || item.due_datetime;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. XP (default 10)
    // Matches: [xp: 25], [xp 25], [25 xp], [25xp], [punkte: 25], [25 punkte], [points: 25], [25 points], xp: 25
    let baseXp = 10;
    const xpMatch1 = fullText.match(/(?:^|[\[\s,;])(?:xp|punkte|points)\s*[:=]?\s*(\d+)(?:[\]\s,;]|$)/i);
    const xpMatch2 = fullText.match(/(?:^|[\[\s,;])(\d+)\s*(?:xp|punkte|points)(?:[\]\s,;]|$)/i);
    if (xpMatch1) {
      baseXp = parseInt(xpMatch1[1], 10);
    } else if (xpMatch2) {
      baseXp = parseInt(xpMatch2[1], 10);
    }

    // 2. Reset interval in days
    // Matches: [reset: 3], [reset 3], [alle 3 Tage], [3 Tage], [täglich] (1), [wöchentlich] (7)
    let resetDays = null;
    const resetMatch = fullText.match(/(?:^|[\[\s,;])(?:reset|recur|repeat|intervall|wiederholung)\s*[:=]?\s*(\w+)(?:[\]\s,;]|$)/i);
    const daysMatch = fullText.match(/(?:^|[\[\s,;])(?:alle\s+)?(\d+)\s*(?:tage|days)(?:[\]\s,;]|$)/i);
    const dailyMatch = fullText.match(/(?:^|[\[\s,;])(?:daily|taeglich|täglich)(?:[\]\s,;]|$)/i);
    const weeklyMatch = fullText.match(/(?:^|[\[\s,;])(?:weekly|woechentlich|wöchentlich)(?:[\]\s,;]|$)/i);

    if (resetMatch) {
      const val = resetMatch[1].toLowerCase();
      if (val === 'daily' || val === 'taeglich' || val === 'täglich') resetDays = 1;
      else if (val === 'weekly' || val === 'woechentlich' || val === 'wöchentlich') resetDays = 7;
      else if (!isNaN(parseInt(val, 10))) resetDays = parseInt(val, 10);
    } else if (daysMatch) {
      resetDays = parseInt(daysMatch[1], 10);
    } else if (dailyMatch) {
      resetDays = 1;
    } else if (weeklyMatch) {
      resetDays = 7;
    }

    // 3. Bonus per day overdue
    // Matches: [bonus: +10], [bonus: 10], [bonus 10], [+10 bonus], [+10/tag], [kopfgeld: 10], [kopfgeld +10], [+10]
    let bonusPerDay = 0;
    const bonusMatch1 = fullText.match(/(?:^|[\[\s,;])(?:bonus|kopfgeld|escalate|bounty)\s*[:=]?\s*\+?(\d+)(?:[\]\s,;]|$)/i);
    const bonusMatch2 = fullText.match(/(?:\[\+(\d+)\]|(?:^|[\[\s,;])\+(\d+)\s*(?:bonus|xp|punkte|kopfgeld|\/tag|\/d)(?:[\]\s,;]|$))/i);
    if (bonusMatch1) {
      bonusPerDay = parseInt(bonusMatch1[1], 10);
    } else if (bonusMatch2) {
      bonusPerDay = parseInt(bonusMatch2[1] || bonusMatch2[2], 10);
    }

    // 4. Last done timestamp
    const doneMatch = fullText.match(/(?:^|[\[\s,;])(?:done|last_done|erledigt)\s*[:=]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|\d{1,2}\.\d{1,2}\.(?:\d{4})?)(?:[\]\s,;]|$)/i);
    const lastDone = doneMatch ? this._normalizeDate(doneMatch[1]) : null;

    // 5. Due date resolution (HA native due date or tag: [fällig: ...], [due: ...], [bis: ...])
    const dueTagMatch = fullText.match(/(?:^|[\[\s,;])(?:due|faellig|fällig|bis)\s*[:=]?\s*([^\s\]]+)(?:[\]\s,;]|$)/i);
    const rawDueDate = (dueTagMatch ? dueTagMatch[1] : null) || dueDateStr;
    const effectiveDueDate = this._normalizeDate(rawDueDate);

    // 6. Overdue days calculation
    let overdueDays = 0;
    let daysUntilDue = null;

    if (effectiveDueDate) {
      const [y, m, d] = effectiveDueDate.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      overdueDays = Math.max(0, diffDays);
      daysUntilDue = -diffDays;
    } else if (lastDone && resetDays) {
      const [y, m, d] = lastDone.split('-').map(Number);
      const targetDue = new Date(y, m - 1, d + resetDays);
      const diffTime = today.getTime() - targetDue.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      overdueDays = Math.max(0, diffDays);
      daysUntilDue = -diffDays;
    }

    const extraXp = overdueDays * bonusPerDay;
    const totalXp = baseXp + extraXp;

    // 7. Category & Icon Detection
    let icon = '📋';
    let category = 'Aufgabe';
    let categoryColor = '#ffd700';

    const iconTag = fullText.match(/(?:^|[\[\s,;])icon\s*[:=]?\s*(\S+?)(?:[\]\s,;]|$)/i);
    const catTag = fullText.match(/(?:^|[\[\s,;])(?:cat|kategorie|category)\s*[:=]?\s*(\w+)(?:[\]\s,;]|$)/i);

    if (iconTag) {
      icon = iconTag[1].replace(/[\[\]]/g, '');
    } else if (catTag) {
      const found = TASK_CATEGORY_MAP.find(c => c.name.toLowerCase().includes(catTag[1].toLowerCase()));
      if (found) {
        icon = found.icon;
        category = found.name;
        categoryColor = found.color;
      }
    } else {
      const textToSearch = fullText.toLowerCase();
      for (const c of TASK_CATEGORY_MAP) {
        if (c.keywords.some(kw => textToSearch.includes(kw))) {
          icon = c.icon;
          category = c.name;
          categoryColor = c.color;
          break;
        }
      }
    }

    // Clean text helper (removes tags from UI display so tasks look clean)
    const cleanTags = (t) => {
      if (!t) return '';
      return t
        .replace(/\[\s*(?:\d+\s*(?:xp|punkte|points)|xp|punkte|points|reset|recur|repeat|intervall|wiederholung|tage|days|alle|daily|taeglich|täglich|weekly|woechentlich|wöchentlich|bonus|kopfgeld|escalate|bounty|plus|\+\d+|done|last_done|erledigt|due|faellig|fällig|bis|icon|cat|kategorie|category)[^\]]*\]/gi, '')
        .replace(/(?:^|\n)\s*(?:xp|punkte|points|reset|recur|repeat|intervall|wiederholung|tage|days|bonus|kopfgeld|escalate|bounty|plus|done|last_done|erledigt|due|faellig|fällig|bis|icon|cat|kategorie|category)\s*[:=].*$/gim, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const cleanSummary = cleanTags(summary) || summary || 'Unbenannte Aufgabe';
    const cleanDesc = cleanTags(desc);

    return {
      baseXp,
      resetDays,
      bonusPerDay,
      lastDone,
      effectiveDueDate,
      displayDueDate: this._formatDisplayDate(effectiveDueDate),
      daysUntilDue,
      overdueDays,
      extraXp,
      totalXp,
      cleanSummary,
      cleanDesc,
      icon,
      category,
      categoryColor
    };
  }

  async _checkAndAutoReset() {
    if (!this._todoItems || !this._config.todo_entity || this._isResettingTodos) return;
    this._isResettingTodos = true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let resetCount = 0;
    try {
      for (const item of this._todoItems) {
        if (item.status === 'completed') {
          const meta = this._parseTodoMetadata(item);
          if (meta.resetDays && meta.lastDone) {
            const [y, m, d] = meta.lastDone.split('-').map(Number);
            const lastDoneDate = new Date(y, m - 1, d);
            const diffDays = Math.floor((today.getTime() - lastDoneDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays >= meta.resetDays) {
              resetCount++;
              const itemId = item.uid || item.id || item.summary;
              if (itemId) {
                await this._hass.callWS({
                  type: 'todo/item/update',
                  entity_id: this._config.todo_entity,
                  item: itemId,
                  status: 'needs_action',
                  due_date: todayStr
                });
              }
              item.status = 'needs_action';
              item.due = todayStr;
            }
          }
        }
      }
    } catch (e) {
      console.warn('HouseholdScoreboardCard: error auto-resetting items', e);
    } finally {
      this._isResettingTodos = false;
    }

    if (resetCount > 0) {
      this._updateTodoSection();
    }
  }

  _updateTodoSection() {
    if (!this.shadowRoot) return;
    const todoWrapper = this.shadowRoot.getElementById('todo-wrapper');
    const todoSection = this.shadowRoot.getElementById('todo-section');
    const todoTitleText = this.shadowRoot.getElementById('todo-title-text');
    const todoCounterBadge = this.shadowRoot.getElementById('todo-counter-badge');
    if (!todoWrapper || !todoSection) return;

    if (!this._config.todo_entity || this._config.show_todo === false) {
      todoWrapper.style.display = 'none';
      return;
    }

    todoWrapper.style.display = 'block';
    if (todoTitleText) {
      todoTitleText.textContent = this._config.todo_title || 'Aufgaben & Quests';
    }

    const items = (this._todoItems || []).filter(item => item.status === 'needs_action');
    const maxTasks = parseInt(this._config.max_tasks || this._config.todo_limit || 0, 10);
    const displayItems = (maxTasks > 0) ? items.slice(0, maxTasks) : items;

    if (todoCounterBadge) {
      if (maxTasks > 0 && items.length > maxTasks) {
        todoCounterBadge.textContent = `${displayItems.length} von ${items.length} offen`;
      } else {
        todoCounterBadge.textContent = `${items.length} offen`;
      }
      todoCounterBadge.style.display = items.length > 0 ? 'inline-block' : 'none';
    }

    if (this._config.todo_max_height) {
      todoSection.style.maxHeight = this._config.todo_max_height;
      todoSection.style.overflowY = 'auto';
    } else {
      todoSection.style.maxHeight = '';
      todoSection.style.overflowY = '';
    }

    if (items.length === 0) {
      todoSection.innerHTML = `
        <div class="todo-empty">
          <span>🎉</span> Alle Aufgaben erledigt! Ausgezeichnete Teamarbeit.
        </div>
      `;
      return;
    }

    const unit = this._config.unit || 'XP';
    todoSection.innerHTML = '';

    displayItems.forEach(item => {
      const meta = this._parseTodoMetadata(item);
      const row = document.createElement('div');
      row.className = `todo-card ${meta.overdueDays > 0 ? 'overdue' : ''}`;

      let badgesHtml = `<span class="todo-pill badge-xp">⭐ +${meta.totalXp} ${unit}</span>`;

      if (meta.bonusPerDay > 0) {
        if (meta.overdueDays > 0) {
          badgesHtml += `<span class="todo-pill badge-bounty" title="${meta.overdueDays} Tag(e) überfällig (+${meta.bonusPerDay} ${unit}/Tag)">🔥 +${meta.extraXp} Kopfgeld (+${meta.bonusPerDay}/Tag)</span>`;
        } else {
          badgesHtml += `<span class="todo-pill badge-bounty-idle" title="Kopfgeld: +${meta.bonusPerDay} ${unit} pro Tag bei Überfälligkeit">🔥 +${meta.bonusPerDay}/Tag Kopfgeld</span>`;
        }
      }

      if (meta.resetDays) {
        const resetLabel = meta.resetDays === 1 ? 'Täglich' : `Alle ${meta.resetDays} Tage`;
        badgesHtml += `<span class="todo-pill badge-reset" title="Wiederholt sich alle ${meta.resetDays} Tage">🔄 ${resetLabel}</span>`;
      }

      if (meta.overdueDays > 0) {
        badgesHtml += `<span class="todo-pill badge-overdue">⚠️ ${meta.overdueDays}d überfällig</span>`;
      } else if (meta.effectiveDueDate) {
        if (meta.daysUntilDue === 0) {
          badgesHtml += `<span class="todo-pill badge-due-today">📅 Heute fällig</span>`;
        } else if (meta.daysUntilDue === 1) {
          badgesHtml += `<span class="todo-pill badge-due">📅 Morgen fällig</span>`;
        } else {
          badgesHtml += `<span class="todo-pill badge-due">📅 Fällig: ${meta.displayDueDate}</span>`;
        }
      }

      const showIcons = this._config.show_task_icons !== false;
      const showRoulette = this._config.show_roulette !== false;

      row.innerHTML = `
        <button class="todo-check-btn" title="Aufgabe erledigen">
          <span class="check-icon">✓</span>
        </button>
        ${showIcons ? `
          <div class="todo-cat-badge" style="border-color:${meta.categoryColor};" title="Kategorie: ${meta.category}">
            ${meta.icon}
          </div>
        ` : ''}
        <div class="todo-info">
          <div class="todo-summary">${meta.cleanSummary}</div>
          ${meta.cleanDesc ? `<div class="todo-desc">${meta.cleanDesc}</div>` : ''}
          <div class="todo-badges">${badgesHtml}</div>
        </div>
        ${showRoulette ? `
          <button class="todo-roulette-mini-btn" title="Auslosen, wer diese Aufgabe macht">🎲</button>
        ` : ''}
      `;

      const checkBtn = row.querySelector('.todo-check-btn');
      const handleComplete = (e) => {
        e.stopPropagation();
        this._promptTaskCompletion(item, meta);
      };
      checkBtn.addEventListener('click', handleComplete);
      row.addEventListener('click', handleComplete);

      const miniRoulette = row.querySelector('.todo-roulette-mini-btn');
      if (miniRoulette) {
        miniRoulette.addEventListener('click', (e) => {
          e.stopPropagation();
          this._openRouletteModal(item);
        });
      }

      todoSection.appendChild(row);
    });

    if (maxTasks > 0 && items.length > maxTasks) {
      const moreRow = document.createElement('div');
      moreRow.className = 'todo-more-info';
      moreRow.textContent = `+ ${items.length - maxTasks} weitere Aufgaben in der Liste`;
      todoSection.appendChild(moreRow);
    }
  }

  _promptTaskCompletion(item, meta) {
    const players = this._getSortedPlayers();
    if (players.length === 0) {
      alert('Bitte lege zuerst mindestens einen Spieler in den Card-Einstellungen an!');
      return;
    }

    if (players.length === 1) {
      this._completeTask(item, players[0], meta);
      return;
    }

    this._openPlayerModal(item, meta, players);
  }

  _openPlayerModal(item, meta, players) {
    const modal = this.shadowRoot.getElementById('player-modal');
    const taskTitle = this.shadowRoot.getElementById('modal-task-title');
    const xpBadge = this.shadowRoot.getElementById('modal-xp-badge');
    const grid = this.shadowRoot.getElementById('modal-players-grid');
    if (!modal || !grid) return;

    const unit = this._config.unit || 'XP';
    taskTitle.textContent = meta.cleanSummary || item.summary || 'Aufgabe';
    xpBadge.innerHTML = `⭐ <b>+${meta.totalXp} ${unit}</b> ${meta.extraXp > 0 ? `<span style="color:#ff5722;">(inkl. 🔥 +${meta.extraXp} Kopfgeld)</span>` : ''}`;

    grid.innerHTML = '';
    players.forEach(p => {
      const card = document.createElement('button');
      card.className = 'modal-player-card';

      const avatarHtml = p.avatar
        ? `<img class="modal-player-avatar" style="border-color:${p.color}" src="${p.avatar}" alt="${p.name}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="modal-player-avatar" style="background:${p.color}; border-color:${p.color}; display:none;">${p.initials}</div>`
        : `<div class="modal-player-avatar" style="background:${p.color}; border-color:${p.color}">${p.initials}</div>`;

      card.innerHTML = `
        ${avatarHtml}
        <span class="modal-player-name">${p.name}</span>
        <span class="modal-player-score">${p.pts} ${unit}</span>
      `;

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closePlayerModal();
        this._completeTask(item, p, meta);
      });

      grid.appendChild(card);
    });

    modal.style.display = 'flex';
  }

  _closePlayerModal() {
    const modal = this.shadowRoot.getElementById('player-modal');
    if (modal) modal.style.display = 'none';
  }

  async _completeTask(item, player, meta) {
    if (!item) return;
    const itemId = item.uid || item.id || item.summary;
    if (!itemId) {
      console.error('HouseholdScoreboardCard: No valid item identifier found on item', item);
      return;
    }

    const taskKey = `${this._config.todo_entity}:${itemId}`;

    // 0. Concurrency & duplicate prevention check
    if (!this._completingTasks) this._completingTasks = new Set();
    if (this._completingTasks.has(taskKey)) {
      console.log('HouseholdScoreboardCard: Task completion already in progress for', taskKey);
      return;
    }
    this._completingTasks.add(taskKey);

    try {
      // 1. Check if already marked completed locally
      if (item.status === 'completed') {
        console.warn('HouseholdScoreboardCard: Task already completed locally', item);
        this._closeRouletteModal();
        this._dismissTaskNotification(item);
        return;
      }

      // 2. Fresh verification check: Query Home Assistant to see if task was already completed elsewhere!
      if (this._hass && this._config.todo_entity) {
        try {
          const freshRes = await this._hass.callWS({
            type: 'todo/item/list',
            entity_id: this._config.todo_entity
          });
          if (freshRes && freshRes.items) {
            this._todoItems = freshRes.items;
            const freshItem = freshRes.items.find(i => (i.uid === itemId || i.id === itemId || i.summary === itemId));
            if (freshItem && freshItem.status === 'completed') {
              console.warn('HouseholdScoreboardCard: Task was already completed elsewhere in Home Assistant!');
              this._closeRouletteModal();
              this._dismissTaskNotification(freshItem || item);
              this._updateTodoSection();
              return;
            }
          }
        } catch (e) {
          console.warn('HouseholdScoreboardCard: could not query fresh todo list, proceeding with local state', e);
        }
      }

      // 3. Close roulette modal & clear phone notification immediately
      this._closeRouletteModal();
      this._dismissTaskNotification(item, player);

      // 4. Celebrate & feedback
      this._forwardHaptic('success');
      this._fireConfetti();
      this._recordPlayerStreak(player);
      if (meta && meta.extraXp > 0) {
        this._playSound('fanfare');
      } else {
        this._playSound('coin');
      }

      // 5. Award XP to player (suppress duplicate streak & sound since already celebrated above)
      const xpToAdd = meta ? meta.totalXp : 10;
      this._adjustScore(player, xpToAdd, false, false);

      // 6. Prepare description with [done: YYYY-MM-DD]
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      let updatedDesc = item.description || '';
      if (/\[done:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\]/i.test(updatedDesc)) {
        updatedDesc = updatedDesc.replace(/\[done:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\]/i, `[done: ${todayStr}]`);
      } else if (/done:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}/i.test(updatedDesc)) {
        updatedDesc = updatedDesc.replace(/done:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}/i, `done: ${todayStr}`);
      } else if (meta && meta.resetDays) {
        updatedDesc = (updatedDesc ? updatedDesc + '\n' : '') + `[done: ${todayStr}]`;
      }

      // Optimistically update local item state
      item.status = 'completed';
      this._updateTodoSection();

      // 7. Call Home Assistant API to mark completed and update description
      try {
        await this._hass.callWS({
          type: 'todo/item/update',
          entity_id: this._config.todo_entity,
          item: itemId,
          status: 'completed',
          description: updatedDesc
        });
      } catch (err) {
        console.warn('HouseholdScoreboardCard: error updating todo item with description, trying without description', err);
        try {
          await this._hass.callWS({
            type: 'todo/item/update',
            entity_id: this._config.todo_entity,
            item: itemId,
            status: 'completed'
          });
        } catch (err2) {
          console.warn('HouseholdScoreboardCard: error updating via WS, trying service fallback', err2);
          try {
            await this._callService('todo', 'update_item', {
              entity_id: this._config.todo_entity,
              item: itemId,
              status: 'completed'
            });
          } catch (e) {
            console.error('HouseholdScoreboardCard: service fallback failed', e);
          }
        }
      }
    } finally {
      // Keep lock for 2 seconds to prevent rapid double-clicks
      setTimeout(() => {
        if (this._completingTasks) {
          this._completingTasks.delete(taskKey);
        }
      }, 2000);
    }
  }

  _fireConfetti() {
    const canvas = this.shadowRoot.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth || 350;
    canvas.height = canvas.offsetHeight || 400;
    canvas.style.display = 'block';

    const colors = ['#ffd700', '#ff5722', '#00e676', '#448aff', '#ff4081', '#e040fb'];
    const particles = [];
    const count = 45;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 60,
        y: canvas.height * 0.4 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 7 - 3,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let frames = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.rotation += p.rSpeed;
        p.alpha -= 0.015;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      });

      frames++;
      if (alive && frames < 90) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
      }
    };
    requestAnimationFrame(animate);
  }


  _render() {
    if (!this.shadowRoot) return;

    if (this._config && this._config.compact) {
      this.setAttribute('compact', '');
    } else {
      this.removeAttribute('compact');
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          position: relative;
          overflow: hidden;
          background: var(--ha-card-background, var(--card-background-color, var(--ha-card-background-default, #fff)));
          border-radius: var(--ha-card-border-radius, 16px);
          border-width: var(--ha-card-border-width, 1px);
          border-style: var(--ha-card-border-style, solid);
          border-color: var(--ha-card-border-color, var(--divider-color, rgba(127, 127, 127, 0.2)));
          box-shadow: var(--ha-card-box-shadow, none);
          padding: 22px 18px;
          color: var(--primary-text-color, #212121);
          font-family: var(--paper-font-body1_-_font-family, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          box-sizing: border-box;
          touch-action: pan-y;
          scrollbar-width: thin;
          scrollbar-color: rgba(127, 127, 127, 0.35) transparent;
        }

        ha-card.scrollable {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
        }

        ha-card.force-scroll {
          overflow-y: scroll !important;
        }

        ha-card.scrollable::-webkit-scrollbar,
        ha-card.force-scroll::-webkit-scrollbar {
          width: 6px;
        }
        ha-card.scrollable::-webkit-scrollbar-track,
        ha-card.force-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        ha-card.scrollable::-webkit-scrollbar-thumb,
        ha-card.force-scroll::-webkit-scrollbar-thumb {
          background: var(--scoreboard-scrollbar-thumb, rgba(127, 127, 127, 0.35));
          border-radius: 4px;
        }
        ha-card.scrollable::-webkit-scrollbar-thumb:hover,
        ha-card.force-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--scoreboard-scrollbar-thumb-hover, rgba(127, 127, 127, 0.6));
        }

        .header {
          text-align: center;
          margin-bottom: 22px;
        }
        .title {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          background: linear-gradient(90deg, #ffd700, #ffb300, #ff8f00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        :host([data-theme="light"]) .title {
          background: linear-gradient(90deg, #b8860b, #d48806, #e65100);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtitle {
          font-size: 11.5px;
          opacity: 0.75;
          margin-top: 4px;
          font-weight: 500;
          color: var(--secondary-text-color, inherit);
        }

        /* PODIUM */
        .podium-container {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-top: 18px;
        }
        .podium-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          flex: 1;
          max-width: 120px;
        }
        .rank-1 { order: 2; z-index: 2; }
        .rank-2 { order: 1; z-index: 1; }
        .rank-3 { order: 3; z-index: 1; }

        .avatar-box {
          position: relative;
          display: inline-block;
          border-radius: 50%;
          padding: 3px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .avatar-box:hover {
          transform: scale(1.06);
        }
        .avatar-img, .avatar-fallback {
          border-radius: 50%;
          object-fit: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #fff;
          background: var(--secondary-background-color, #2a2a38);
        }

        .rank-1 .avatar-box {
          background: linear-gradient(135deg, #ffd700, #ff8f00);
          box-shadow: 0 0 22px rgba(255, 215, 0, 0.45);
        }
        .rank-1 .avatar-img, .rank-1 .avatar-fallback {
          width: 74px;
          height: 74px;
          border: 2px solid var(--ha-card-background, var(--card-background-color, #fff));
          font-size: 24px;
        }

        .rank-2 .avatar-box {
          background: linear-gradient(135deg, #e0e0e0, #9e9e9e);
          box-shadow: 0 0 14px rgba(224, 224, 224, 0.3);
        }
        .rank-2 .avatar-img, .rank-2 .avatar-fallback {
          width: 58px;
          height: 58px;
          border: 2px solid var(--ha-card-background, var(--card-background-color, #fff));
          font-size: 18px;
        }

        .rank-3 .avatar-box {
          background: linear-gradient(135deg, #cd7f32, #8d4f1f);
          box-shadow: 0 0 12px rgba(205, 127, 50, 0.3);
        }
        .rank-3 .avatar-img, .rank-3 .avatar-fallback {
          width: 52px;
          height: 52px;
          border: 2px solid var(--ha-card-background, var(--card-background-color, #fff));
          font-size: 16px;
        }

        .crown-badge {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 22px;
          filter: drop-shadow(0 2px 5px rgba(0,0,0,0.4));
          animation: floatCrown 2.5s ease-in-out infinite;
        }
        @keyframes floatCrown {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-3px); }
        }

        .medal-badge {
          position: absolute;
          bottom: -5px;
          right: -3px;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          color: #111;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid var(--ha-card-background, var(--card-background-color, #fff));
        }
        .medal-1 { background: #ffd700; }
        .medal-2 { background: #e0e0e0; }
        .medal-3 { background: #cd7f32; color: #fff; }

        .podium-name {
          font-weight: 700;
          margin-top: 10px;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          color: var(--primary-text-color, inherit);
        }
        .rank-1 .podium-name {
          font-size: 15.5px;
          color: #b8860b;
          font-weight: 800;
        }
        :host([data-theme="dark"]) .rank-1 .podium-name {
          color: #ffd700;
        }

        .podium-score {
          font-size: 13px;
          font-weight: 800;
          margin-top: 2px;
          padding: 2px 10px;
          border-radius: 12px;
          background: var(--secondary-background-color, rgba(127,127,127,0.12));
          color: var(--primary-text-color, inherit);
          display: inline-block;
        }
        .rank-1 .podium-score {
          background: rgba(255, 215, 0, 0.18);
          color: #b8860b;
          border: 1px solid rgba(255, 215, 0, 0.35);
        }
        :host([data-theme="dark"]) .rank-1 .podium-score {
          color: #ffd700;
        }
        .podium-level {
          font-size: 10.5px;
          opacity: 0.75;
          margin-top: 3px;
          font-weight: 600;
          color: var(--secondary-text-color, inherit);
        }
        .rank-1 .podium-level {
          color: #b8860b;
          opacity: 0.95;
        }
        :host([data-theme="dark"]) .rank-1 .podium-level {
          color: #ffd700;
        }

        /* RANKINGS LIST */
        .rankings-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-top: 14px;
        }
        .rank-row {
          display: flex;
          align-items: center;
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.06));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.15));
          border-radius: var(--ha-card-border-radius, 16px);
          padding: 9px 12px;
          gap: 12px;
          color: var(--primary-text-color, inherit);
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .rank-row:hover {
          background: var(--divider-color, rgba(127, 127, 127, 0.14));
          transform: translateY(-1px);
        }
        .rank-row.leader {
          border-color: rgba(255, 215, 0, 0.45);
          background: rgba(255, 215, 0, 0.08);
        }
        .rank-pos {
          font-size: 15px;
          font-weight: 900;
          width: 22px;
          text-align: center;
          color: var(--primary-text-color, inherit);
        }
        .rank-row-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          color: #fff;
          background: var(--secondary-background-color, #2a2a38);
          border: 1.5px solid var(--divider-color, rgba(127,127,127,0.25));
        }
        .rank-row-info {
          flex: 1;
          min-width: 0;
        }
        .rank-row-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }
        .rank-row-name {
          font-size: 13.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--primary-text-color, inherit);
        }
        .rank-row-badge {
          font-size: 10px;
          opacity: 0.75;
          font-weight: 500;
          color: var(--secondary-text-color, inherit);
        }
        .rank-row-pts {
          font-size: 14px;
          font-weight: 800;
          color: #b8860b;
        }
        :host([data-theme="dark"]) .rank-row-pts {
          color: #ffd700;
        }
        .prog-track {
          width: 100%;
          height: 6px;
          background: var(--divider-color, rgba(127, 127, 127, 0.18));
          border-radius: 10px;
          overflow: hidden;
        }
        .prog-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ACTIONS GRID */
        .actions-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 700;
          opacity: 0.75;
          margin: 22px 0 10px 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--secondary-text-color, inherit);
        }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 10px;
        }
        .action-card {
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.06));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.15));
          border-radius: var(--ha-card-border-radius, 18px);
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: var(--primary-text-color, inherit);
          transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
          position: relative;
        }
        .action-card:hover {
          background: var(--divider-color, rgba(127, 127, 127, 0.12));
          border-color: rgba(255, 215, 0, 0.4);
        }
        .action-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 6px;
          border: 2px solid rgba(255, 215, 0, 0.6);
        }
        .action-name {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          color: var(--primary-text-color, inherit);
        }
        .action-score {
          font-size: 12px;
          font-weight: 800;
          color: #b8860b;
          margin-bottom: 9px;
        }
        :host([data-theme="dark"]) .action-score {
          color: #ffd700;
        }
        .btn-group {
          display: flex;
          gap: 5px;
          width: 100%;
        }
        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: rgba(255, 215, 0, 0.15);
          border: 1px solid rgba(255, 215, 0, 0.35);
          border-radius: 12px;
          color: #b8860b;
          font-size: 12px;
          font-weight: 800;
          padding: 7px 6px;
          cursor: pointer;
          user-select: none;
          transition: all 0.15s ease;
        }
        :host([data-theme="dark"]) .action-btn {
          color: #ffd700;
        }
        .action-btn:hover {
          background: rgba(255, 215, 0, 0.3);
          transform: scale(1.03);
        }
        .action-btn:active {
          transform: scale(0.96);
        }
        .action-btn-dec {
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
          color: var(--secondary-text-color, rgba(127, 127, 127, 0.8));
          padding: 7px 8px;
          flex: 0 0 auto;
        }
        .action-btn-dec:hover {
          background: rgba(255, 82, 82, 0.15);
          border-color: rgba(255, 82, 82, 0.4);
          color: #ff5252;
        }


        /* TO-DO / CHORES SECTION */
        #todo-wrapper {
          margin-top: 18px;
        }
        .todo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 4px 10px 4px;
        }
        .todo-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 700;
          opacity: 0.75;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--secondary-text-color, inherit);
        }
        .todo-counter-badge {
          font-size: 10px;
          font-weight: 700;
          background: rgba(255, 215, 0, 0.15);
          color: #b8860b;
          border: 1px solid rgba(255, 215, 0, 0.35);
          border-radius: 10px;
          padding: 2px 8px;
        }
        :host([data-theme="dark"]) .todo-counter-badge {
          color: #ffd700;
        }
        .todo-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .todo-card {
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.06));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.15));
          border-radius: var(--ha-card-border-radius, 14px);
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          color: var(--primary-text-color, inherit);
        }
        .todo-card:hover {
          background: var(--divider-color, rgba(127, 127, 127, 0.12));
          border-color: rgba(255, 215, 0, 0.45);
          transform: translateY(-1px);
        }
        .todo-card.overdue {
          border-color: rgba(255, 87, 34, 0.45);
          background: linear-gradient(90deg, rgba(255, 87, 34, 0.1) 0%, var(--secondary-background-color, rgba(127, 127, 127, 0.06)) 100%);
        }
        .todo-check-btn {
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: 50%;
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
          border: 2px solid var(--divider-color, rgba(127, 127, 127, 0.25));
          color: #00c853;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        :host([data-theme="dark"]) .todo-check-btn {
          color: #00e676;
        }
        .todo-card:hover .todo-check-btn {
          border-color: #00e676;
          background: rgba(0, 230, 118, 0.15);
          transform: scale(1.08);
        }
        .todo-info {
          flex: 1;
          min-width: 0;
        }
        .todo-summary {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--primary-text-color, inherit);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .todo-desc {
          font-size: 11px;
          color: var(--secondary-text-color, inherit);
          opacity: 0.75;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .todo-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          margin-top: 4px;
        }
        .todo-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 8px;
          letter-spacing: 0.2px;
        }
        .badge-xp {
          background: rgba(255, 215, 0, 0.15);
          color: #b8860b;
          border: 1px solid rgba(255, 215, 0, 0.35);
        }
        :host([data-theme="dark"]) .badge-xp {
          color: #ffd700;
        }
        .badge-bounty {
          background: rgba(255, 87, 34, 0.18);
          color: #e64a19;
          border: 1px solid rgba(255, 87, 34, 0.4);
          animation: pulse-bounty 1.8s infinite;
        }
        :host([data-theme="dark"]) .badge-bounty {
          color: #ff5722;
        }
        @keyframes pulse-bounty {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 87, 34, 0.4); }
          50% { box-shadow: 0 0 8px 2px rgba(255, 87, 34, 0.3); }
        }
        .badge-reset {
          background: rgba(68, 138, 255, 0.12);
          color: var(--primary-color, #1976d2);
          border: 1px solid rgba(68, 138, 255, 0.3);
        }
        :host([data-theme="dark"]) .badge-reset {
          color: #448aff;
        }
        .badge-due {
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
          color: var(--secondary-text-color, inherit);
        }
        .badge-overdue {
          background: rgba(255, 82, 82, 0.15);
          color: #d32f2f;
          border: 1px solid rgba(255, 82, 82, 0.35);
        }
        :host([data-theme="dark"]) .badge-overdue {
          color: #ff5252;
        }
        .badge-bounty-idle {
          color: #e65100;
          background: rgba(255, 152, 0, 0.12);
          border: 1px solid rgba(255, 152, 0, 0.3);
        }
        :host([data-theme="dark"]) .badge-bounty-idle {
          color: #ff9800;
        }
        .badge-due-today {
          color: #b8860b;
          background: rgba(255, 215, 0, 0.15);
          border: 1px solid rgba(255, 215, 0, 0.35);
          font-weight: 700;
        }
        :host([data-theme="dark"]) .badge-due-today {
          color: #ffd700;
        }
        .todo-empty {
          text-align: center;
          padding: 16px;
          font-size: 12.5px;
          color: var(--secondary-text-color, inherit);
          opacity: 0.75;
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.04));
          border-radius: var(--ha-card-border-radius, 12px);
          border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.2));
        }

        /* MODAL POPUP */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 9999;
          animation: modal-fade-in 0.2s ease;
        }
        @keyframes modal-fade-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-box {
          background: var(--ha-card-background, var(--card-background-color, var(--primary-background-color, #1c1c1e)));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
          border-radius: var(--ha-card-border-radius, 20px);
          padding: 18px 16px;
          width: 100%;
          max-width: 320px;
          text-align: center;
          box-shadow: var(--ha-card-box-shadow, 0 16px 36px rgba(0, 0, 0, 0.35));
          color: var(--primary-text-color, inherit);
        }
        .modal-header {
          margin-bottom: 14px;
        }
        .modal-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--primary-text-color, inherit);
          margin-bottom: 4px;
        }
        .modal-task-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--secondary-text-color, inherit);
          opacity: 0.85;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .modal-xp-badge {
          margin-top: 6px;
          font-size: 13px;
          color: #b8860b;
        }
        :host([data-theme="dark"]) .modal-xp-badge {
          color: #ffd700;
        }
        .modal-players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .modal-player-card {
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.08));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.18));
          border-radius: var(--ha-card-border-radius, 14px);
          padding: 10px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--primary-text-color, inherit);
        }
        .modal-player-card:hover {
          background: rgba(255, 215, 0, 0.15);
          border-color: #ffd700;
          transform: translateY(-2px);
        }
        .modal-player-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          border: 2px solid #ffd700;
          background: var(--secondary-background-color, #2a2a38);
          color: #fff;
        }
        .modal-player-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--primary-text-color, inherit);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .modal-player-score {
          font-size: 10px;
          color: var(--secondary-text-color, inherit);
          opacity: 0.75;
        }
        .modal-cancel-btn {
          width: 100%;
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
          border-radius: 10px;
          padding: 8px 0;
          color: var(--secondary-text-color, inherit);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .modal-cancel-btn:hover {
          background: var(--divider-color, rgba(127, 127, 127, 0.2));
          color: var(--primary-text-color, inherit);
        }

        /* CONFETTI CANVAS */
        .confetti-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 99;
          display: none;
          border-radius: var(--ha-card-border-radius, 16px);
        }

        /* RESET BUTTON */
        .reset-wrap {
          margin-top: 18px;
          text-align: center;
        }
        .reset-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.06));
          border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.25));
          border-radius: 14px;
          padding: 7px 14px;
          color: var(--secondary-text-color, inherit);
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .reset-btn:hover {
          background: rgba(255, 82, 82, 0.12);
          border-color: rgba(255, 82, 82, 0.4);
          color: #ff5252;
        }

        /* SOUND TOGGLE */
        .sound-toggle-btn {
          position: absolute;
          right: 0;
          top: -2px;
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
          border-radius: 10px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          color: var(--primary-text-color, inherit);
          transition: all 0.2s ease;
        }
        .sound-toggle-btn:hover {
          background: rgba(255, 215, 0, 0.15);
          border-color: #ffd700;
          transform: scale(1.08);
        }

        /* STREAKS */
        .podium-streak {
          margin-top: 5px;
          font-size: 11px;
          font-weight: 700;
          color: #e65100;
          background: rgba(255, 152, 0, 0.12);
          border: 1px solid rgba(255, 152, 0, 0.25);
          padding: 2px 8px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        :host([data-theme="dark"]) .podium-streak {
          color: #ff9800;
        }
        .podium-streak.active {
          color: #ff5722;
          background: rgba(255, 87, 34, 0.18);
          border-color: #ff5722;
          box-shadow: 0 0 10px rgba(255, 87, 34, 0.35);
          animation: streak-glow 2s infinite ease-in-out;
        }
        .streak-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          font-weight: 800;
          color: #e65100;
          background: rgba(255, 152, 0, 0.12);
          border: 1px solid rgba(255, 152, 0, 0.25);
          padding: 1px 6px;
          border-radius: 8px;
          margin-left: 6px;
          vertical-align: middle;
        }
        :host([data-theme="dark"]) .streak-badge {
          color: #ff9800;
        }
        .streak-badge.active {
          color: #ff5722;
          border-color: #ff5722;
          background: rgba(255, 87, 34, 0.2);
          box-shadow: 0 0 8px rgba(255, 87, 34, 0.35);
          animation: streak-glow 2s infinite ease-in-out;
        }
        @keyframes streak-glow {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255, 87, 34, 0.4)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 8px rgba(255, 87, 34, 0.8)); }
        }

        /* TASK CATEGORY BADGES & ROULETTE BUTTONS */
        .todo-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .todo-roulette-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 152, 0, 0.12));
          border: 1px solid rgba(255, 215, 0, 0.35);
          color: #b8860b;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        :host([data-theme="dark"]) .todo-roulette-btn {
          color: #ffd700;
        }
        .todo-roulette-btn:hover {
          background: linear-gradient(135deg, #ffd700, #ff9800);
          color: #121212;
          box-shadow: 0 4px 14px rgba(255, 215, 0, 0.35);
          transform: translateY(-1px);
        }
        .todo-roulette-mini-btn {
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
          border-radius: 8px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          margin-left: 8px;
          flex-shrink: 0;
          transition: all 0.2s ease;
          align-self: center;
          color: var(--primary-text-color, inherit);
        }
        .todo-roulette-mini-btn:hover {
          background: rgba(255, 215, 0, 0.2);
          border-color: #ffd700;
          transform: scale(1.15) rotate(15deg);
        }
        .todo-cat-badge {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.08));
          border: 1.5px solid var(--divider-color, rgba(127, 127, 127, 0.2));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
          margin-right: 4px;
        }

        /* ROULETTE MODAL */
        .roulette-box {
          max-width: 340px;
        }
        .roulette-stage {
          margin: 16px 0;
        }
        .roulette-slot-window {
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.15));
          border: 2px solid var(--primary-color, #ffd700);
          border-radius: 16px;
          padding: 16px 12px;
          box-shadow: inset 0 0 16px rgba(0,0,0,0.2), 0 0 20px rgba(255, 215, 0, 0.2);
          overflow: hidden;
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .roulette-slot-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          animation: slot-bounce 0.15s infinite alternate ease-in-out;
        }
        @keyframes slot-bounce {
          from { transform: translateY(-2px); }
          to { transform: translateY(2px); }
        }
        .roulette-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 3px solid #ffd700;
          object-fit: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 800;
          color: white;
          background: var(--secondary-background-color, #2a2a38);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }
        .roulette-candidate-name {
          font-size: 16px;
          font-weight: 800;
          color: var(--primary-text-color, inherit);
        }
        .roulette-candidate-pts {
          font-size: 12px;
          color: #b8860b;
          font-weight: 600;
        }
        :host([data-theme="dark"]) .roulette-candidate-pts {
          color: #ffd700;
        }
        .roulette-fair-hint {
          font-size: 10.5px;
          color: var(--secondary-text-color, inherit);
          opacity: 0.75;
          margin-top: 8px;
          text-align: center;
        }
        .roulette-winner-wrap {
          margin: 16px 0;
          animation: modal-fade-in 0.3s ease;
        }
        .roulette-winner-label {
          font-size: 12px;
          color: var(--secondary-text-color, inherit);
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .roulette-winner-name {
          font-size: 20px;
          color: #b8860b;
          font-weight: 800;
          margin-bottom: 4px;
        }
        :host([data-theme="dark"]) .roulette-winner-name {
          color: #ffd700;
        }
        .roulette-winner-sub {
          font-size: 12px;
          color: var(--secondary-text-color, inherit);
          opacity: 0.85;
          margin-bottom: 16px;
        }
        .roulette-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .roulette-notify-btn {
          width: 100%;
          background: linear-gradient(135deg, #00b0ff, #0081cb);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 11px 16px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 4px 14px rgba(0, 176, 255, 0.35);
          transition: transform 0.15s ease, background 0.2s ease, opacity 0.2s ease;
        }
        .roulette-notify-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 176, 255, 0.45);
        }
        .roulette-notify-btn:active {
          transform: scale(0.97);
        }
        .roulette-notify-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }
        .roulette-notify-btn.sent {
          background: linear-gradient(135deg, #00e676, #00b248);
          box-shadow: 0 4px 14px rgba(0, 230, 118, 0.35);
        }
        .roulette-accept-btn {
          width: 100%;
          background: linear-gradient(135deg, #ffd700, #ff9800);
          color: #121212;
          border: none;
          border-radius: 12px;
          padding: 10px 0;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 4px 14px rgba(255, 215, 0, 0.3);
        }
        .roulette-accept-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .roulette-spin-again-btn {
          width: 100%;
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
          color: var(--primary-text-color, inherit);
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
          border-radius: 12px;
          padding: 8px 0;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .roulette-spin-again-btn:hover {
          background: var(--divider-color, rgba(127, 127, 127, 0.2));
        }

        /* SCROLLBAR & OVERFLOW FOR TO-DO LIST */
        .todo-list {
          scrollbar-width: thin;
          scrollbar-color: var(--divider-color, rgba(127, 127, 127, 0.3)) transparent;
        }
        .todo-list::-webkit-scrollbar {
          width: 5px;
        }
        .todo-list::-webkit-scrollbar-thumb {
          background: var(--divider-color, rgba(127, 127, 127, 0.3));
          border-radius: 4px;
        }
        .todo-more-info {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--secondary-text-color, inherit);
          opacity: 0.75;
          padding: 6px 10px;
          background: var(--secondary-background-color, rgba(127, 127, 127, 0.06));
          border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.2));
          border-radius: 10px;
          margin-top: 2px;
        }

        /* COMPACT MODE (FOR NEST HUB, GOOGLE CAST & SMALL SCREENS) */
        :host([compact]) ha-card {
          padding: 10px 12px;
        }
        :host([compact]) .header {
          margin-bottom: 8px;
        }
        :host([compact]) .title {
          font-size: 15px;
          gap: 6px;
        }
        :host([compact]) .subtitle {
          font-size: 10px;
          margin-top: 2px;
        }
        :host([compact]) .podium-container {
          margin-bottom: 10px;
          padding-top: 6px;
          gap: 8px;
        }
        :host([compact]) .podium-slot {
          max-width: 90px;
        }
        :host([compact]) .rank-1 .avatar-img,
        :host([compact]) .rank-1 .avatar-fallback {
          width: 46px;
          height: 46px;
          font-size: 16px;
        }
        :host([compact]) .rank-2 .avatar-img,
        :host([compact]) .rank-2 .avatar-fallback {
          width: 38px;
          height: 38px;
          font-size: 13px;
        }
        :host([compact]) .rank-3 .avatar-img,
        :host([compact]) .rank-3 .avatar-fallback {
          width: 34px;
          height: 34px;
          font-size: 12px;
        }
        :host([compact]) .crown-badge {
          font-size: 15px;
          top: -11px;
        }
        :host([compact]) .medal-badge {
          width: 16px;
          height: 16px;
          font-size: 9px;
          bottom: -3px;
          right: -2px;
        }
        :host([compact]) .podium-name {
          font-size: 11.5px;
          margin-top: 4px;
        }
        :host([compact]) .rank-1 .podium-name {
          font-size: 12.5px;
        }
        :host([compact]) .podium-score {
          font-size: 11px;
          margin-top: 1px;
          padding: 1px 6px;
          border-radius: 8px;
        }
        :host([compact]) .podium-level {
          font-size: 9px;
          margin-top: 1px;
        }
        :host([compact]) .podium-streak {
          font-size: 8.5px;
          padding: 1px 5px;
          margin-top: 1px;
        }
        :host([compact]) .rankings-list {
          gap: 5px;
          margin-top: 8px;
        }
        :host([compact]) .rank-row {
          padding: 5px 8px;
          gap: 8px;
          border-radius: 10px;
        }
        :host([compact]) .rank-row-avatar {
          width: 26px;
          height: 26px;
          font-size: 10px;
        }
        :host([compact]) .rank-pos {
          font-size: 12px;
          width: 18px;
        }
        :host([compact]) .rank-name {
          font-size: 12px;
        }
        :host([compact]) .rank-score {
          font-size: 12px;
        }
        :host([compact]) .rank-level-badge {
          font-size: 9.5px;
          padding: 1px 5px;
        }
        :host([compact]) .rank-progress-wrap {
          height: 4px;
          margin-top: 2px;
        }
        :host([compact]) #todo-wrapper {
          margin-top: 10px;
        }
        :host([compact]) .todo-header {
          margin: 0 2px 6px 2px;
        }
        :host([compact]) .todo-title {
          font-size: 10px;
        }
        :host([compact]) .todo-counter-badge {
          font-size: 9px;
          padding: 1px 6px;
        }
        :host([compact]) .todo-roulette-btn {
          font-size: 10px;
          padding: 2px 6px;
          gap: 3px;
        }
        :host([compact]) .todo-list {
          gap: 5px;
        }
        :host([compact]) .todo-card {
          padding: 6px 8px;
          gap: 8px;
          border-radius: 10px;
        }
        :host([compact]) .todo-check-btn {
          width: 26px;
          height: 26px;
          min-width: 26px;
          font-size: 13px;
        }
        :host([compact]) .todo-cat-badge {
          width: 26px;
          height: 26px;
          font-size: 13px;
          margin-right: 0;
          border-radius: 8px;
        }
        :host([compact]) .todo-summary {
          font-size: 12px;
          margin-bottom: 1px;
        }
        :host([compact]) .todo-desc {
          font-size: 9.5px;
          margin-bottom: 2px;
        }
        :host([compact]) .todo-badges {
          gap: 4px;
          margin-top: 2px;
        }
        :host([compact]) .todo-pill {
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 6px;
          gap: 3px;
        }
        :host([compact]) .todo-roulette-mini-btn {
          width: 24px;
          height: 24px;
          font-size: 12px;
        }
        :host([compact]) .todo-more-info {
          font-size: 9.5px;
          padding: 3px 6px;
        }
        :host([compact]) .actions-title {
          font-size: 10px;
          margin-bottom: 6px;
        }
        :host([compact]) .actions-grid {
          gap: 6px;
          margin-top: 8px;
        }
        :host([compact]) .action-card {
          padding: 6px 8px;
        }
        :host([compact]) .action-btn {
          padding: 5px 8px;
          font-size: 12px;
        }
        :host([compact]) .reset-wrap {
          margin-top: 8px;
          padding-top: 6px;
        }
        :host([compact]) .reset-btn {
          font-size: 11px;
          padding: 6px 12px;
        }
      </style>

      <ha-card>
        <div class="header" style="position: relative;">
          <button id="sound-btn" class="sound-toggle-btn" title="Soundeffekte ein-/ausschalten">
            <span id="sound-icon">🔊</span>
          </button>
          <div class="title" id="card-title"></div>
          <div class="subtitle" id="card-subtitle"></div>
        </div>

        <div id="podium-section" class="podium-container"></div>
        <div id="ranks-section" class="rankings-list"></div>

        <div id="todo-wrapper">
          <div class="todo-header">
            <div class="todo-title">📋 <span id="todo-title-text">Aufgaben & Quests</span></div>
            <div class="todo-header-right">
              <button id="roulette-header-btn" class="todo-roulette-btn" title="Aufgaben-Roulette: Wer ist dran?">
                <span>🎲</span> Wer ist dran?
              </button>
              <span id="todo-counter-badge" class="todo-counter-badge"></span>
            </div>
          </div>
          <div id="todo-section" class="todo-list"></div>
        </div>

        <div id="actions-wrapper">
          <div class="actions-title">⚡ Aufgaben erledigt (+XP)</div>
          <div id="actions-section" class="actions-grid"></div>
        </div>

        <div id="reset-wrapper" class="reset-wrap">
          <button id="reset-btn" class="reset-btn">
            <span>🔄</span> <span id="reset-label"></span>
          </button>
        </div>
        <canvas id="confetti-canvas" class="confetti-canvas"></canvas>

        <div id="roulette-modal" class="modal-backdrop" style="display: none;">
          <div class="modal-box roulette-box">
            <div class="modal-header">
              <div class="modal-title">🎲 Aufgaben-Roulette</div>
              <div id="roulette-task-title" class="modal-task-title"></div>
              <div id="roulette-xp-badge" class="modal-xp-badge"></div>
            </div>

            <div id="roulette-stage" class="roulette-stage">
              <div class="roulette-slot-window">
                <div id="roulette-slot-spinner" class="roulette-slot-spinner"></div>
              </div>
              <div class="roulette-fair-hint">⚖️ Faire Auslosung (höhere Chance für Spieler mit weniger XP)</div>
            </div>

            <div id="roulette-winner-wrap" class="roulette-winner-wrap" style="display: none;">
              <div class="roulette-winner-label">Das Los hat entschieden:</div>
              <div id="roulette-winner-name" class="roulette-winner-name"></div>
              <div id="roulette-winner-sub" class="roulette-winner-sub"></div>
              <div class="roulette-action-buttons">
                <button id="roulette-notify-btn" class="roulette-notify-btn">📱 Benachrichtigung senden</button>
                <button id="roulette-accept-btn" class="roulette-accept-btn">Aufgabe jetzt erledigen ⭐</button>
                <button id="roulette-spin-again-btn" class="roulette-spin-again-btn">Erneut auslosen 🔄</button>
              </div>
            </div>

            <button id="roulette-cancel-btn" class="modal-cancel-btn" style="margin-top: 10px;">Schließen</button>
          </div>
        </div>
        <div id="player-modal" class="modal-backdrop" style="display: none;">
          <div class="modal-box">
            <div class="modal-header">
              <div class="modal-title">Wer hat es erledigt?</div>
              <div id="modal-task-title" class="modal-task-title"></div>
              <div id="modal-xp-badge" class="modal-xp-badge"></div>
            </div>
            <div id="modal-players-grid" class="modal-players-grid"></div>
            <button id="modal-cancel-btn" class="modal-cancel-btn">Abbrechen</button>
          </div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.getElementById('reset-btn').addEventListener('click', () => this._resetAll());
    const soundBtn = this.shadowRoot.getElementById('sound-btn');
    if (soundBtn) soundBtn.addEventListener('click', () => this._toggleSound());

    const rouletteHeaderBtn = this.shadowRoot.getElementById('roulette-header-btn');
    if (rouletteHeaderBtn) rouletteHeaderBtn.addEventListener('click', () => this._openRouletteModal());

    const rouletteCancel = this.shadowRoot.getElementById('roulette-cancel-btn');
    if (rouletteCancel) rouletteCancel.addEventListener('click', () => this._closeRouletteModal());
    const rouletteModal = this.shadowRoot.getElementById('roulette-modal');
    if (rouletteModal) rouletteModal.addEventListener('click', (e) => {
      if (e.target === rouletteModal) this._closeRouletteModal();
    });

    const modalCancel = this.shadowRoot.getElementById('modal-cancel-btn');
    if (modalCancel) modalCancel.addEventListener('click', () => this._closePlayerModal());
    const modal = this.shadowRoot.getElementById('player-modal');
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) this._closePlayerModal();
    });
    this._updateData();
  }

  _updateData() {
    if (!this.shadowRoot) return;

    const titleEl = this.shadowRoot.getElementById('card-title');
    const subtitleEl = this.shadowRoot.getElementById('card-subtitle');
    const podiumEl = this.shadowRoot.getElementById('podium-section');
    const ranksEl = this.shadowRoot.getElementById('ranks-section');
    const actionsWrapper = this.shadowRoot.getElementById('actions-wrapper');
    const actionsEl = this.shadowRoot.getElementById('actions-section');
    const resetWrapper = this.shadowRoot.getElementById('reset-wrapper');
    const resetLabel = this.shadowRoot.getElementById('reset-label');

    if (!titleEl || !this._config) return;

    this._applyCardDimensions();

    // Sound toggle state & button visibility
    const soundBtn = this.shadowRoot.getElementById('sound-btn');
    const soundIcon = this.shadowRoot.getElementById('sound-icon');
    if (soundBtn && soundIcon) {
      soundBtn.style.display = this._config.enable_sound !== false ? 'flex' : 'none';
      soundIcon.textContent = this._soundMuted ? '🔇' : '🔊';
    }

    // Roulette button visibility
    const rouletteHeaderBtn = this.shadowRoot.getElementById('roulette-header-btn');
    if (rouletteHeaderBtn) {
      rouletteHeaderBtn.style.display = this._config.show_roulette !== false ? 'inline-flex' : 'none';
    }

    // Header
    titleEl.textContent = this._config.title || '🏆 Haushalts-Rangliste';
    if (this._config.subtitle) {
      subtitleEl.textContent = this._config.subtitle;
      subtitleEl.style.display = 'block';
    } else {
      subtitleEl.style.display = 'none';
    }

    const players = this._getSortedPlayers();
    const unit = this._config.unit || 'XP';

    if (players.length === 0) {
      if (podiumEl) podiumEl.style.display = 'none';
      if (ranksEl) {
        ranksEl.style.display = 'block';
        ranksEl.innerHTML = `
          <div style="text-align: center; padding: 28px 14px; opacity: 0.7; font-size: 14px; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px dashed rgba(255,255,255,0.15);">
            <div style="font-size: 26px; margin-bottom: 8px;">👥</div>
            <div style="font-weight: 700; margin-bottom: 4px;">Keine Spieler konfiguriert</div>
            <div>Öffne den Card-Editor und füge Spieler mit ihren Zähler-Entitäten hinzu.</div>
          </div>
        `;
      }
      if (actionsWrapper) actionsWrapper.style.display = 'none';
      if (resetWrapper) resetWrapper.style.display = 'none';
      return;
    }

    // 1. Podium Section
    if (this._config.show_podium !== false && players.length > 0) {
      podiumEl.style.display = 'flex';
      const top3 = players.slice(0, 3);
      
      let podiumHtml = '';
      top3.forEach((p, idx) => {
        const rank = idx + 1;
        const medalClass = `medal-${rank}`;
        const slotClass = `podium-slot rank-${rank}`;
        
        const avatarHtml = p.avatar
          ? `<img class="avatar-img" src="${p.avatar}" alt="${p.name}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="avatar-fallback" style="background:${p.color}; display:none;">${p.initials}</div>`
          : `<div class="avatar-fallback" style="background:${p.color}">${p.initials}</div>`;

        const crownHtml = rank === 1 ? `<div class="crown-badge">👑</div>` : '';
        const streak = this._getPlayerStreak(p);
        const showStreaks = this._config.show_streaks !== false;
        const streakHtml = showStreaks && streak.count > 0 ? `
          <div class="podium-streak ${streak.activeToday ? 'active' : ''}" title="${streak.count} Tag(e) in Folge aktiv!">
            🔥 ${streak.count} ${streak.count === 1 ? 'Tag' : 'Tage'}
          </div>
        ` : '';

        podiumHtml += `
          <div class="${slotClass}">
            <div class="avatar-box">
              ${crownHtml}
              ${avatarHtml}
              <div class="medal-badge ${medalClass}">${rank}</div>
            </div>
            <div class="podium-name">${p.name}</div>
            <div class="podium-score">${p.pts} ${unit}</div>
            <div class="podium-level">${p.level.badge} ${p.level.title}</div>
            ${streakHtml}
          </div>
        `;
      });
      podiumEl.innerHTML = podiumHtml;
    } else {
      podiumEl.style.display = 'none';
    }

    // 2. Rankings List Section
    if (this._config.show_ranks !== false && players.length > 0) {
      ranksEl.style.display = 'flex';
      let ranksHtml = '';

      players.forEach((p, idx) => {
        const medalEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        const isLeader = idx === 0;

        const avatarHtml = p.avatar
          ? `<img class="rank-row-avatar" src="${p.avatar}" alt="${p.name}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="rank-row-avatar" style="background:${p.color}; display:none;">${p.initials}</div>`
          : `<div class="rank-row-avatar" style="background:${p.color}">${p.initials}</div>`;

        const nextHint = p.level.nextPts > 0 ? `noch ${p.level.nextPts} ${unit} bis ${p.level.nextTitle}` : 'Maximaler Rang!';
        const streak = this._getPlayerStreak(p);
        const showStreaks = this._config.show_streaks !== false;
        const streakBadgeHtml = showStreaks && streak.count > 0 ? `
          <span class="streak-badge ${streak.activeToday ? 'active' : ''}" title="${streak.count} Tag(e) in Folge aktiv!">🔥 ${streak.count}</span>
        ` : '';

        ranksHtml += `
          <div class="rank-row ${isLeader ? 'leader' : ''}">
            <div class="rank-pos">${medalEmoji}</div>
            ${avatarHtml}
            <div class="rank-row-info">
              <div class="rank-row-top">
                <span class="rank-row-name">
                  ${p.name}
                  ${streakBadgeHtml}
                  <span class="rank-row-badge">(${p.level.badge} ${p.level.title})</span>
                </span>
                <span class="rank-row-pts">${p.pts} ${unit}</span>
              </div>
              <div class="prog-track" title="${nextHint}">
                <div class="prog-fill" style="width: ${p.level.pct}%; background: ${p.level.color};"></div>
              </div>
            </div>
          </div>
        `;
      });
      ranksEl.innerHTML = ranksHtml;
    } else {
      ranksEl.style.display = 'none';
    }

    // 3. Quick Action Buttons (+1 XP)
    if (this._config.show_actions !== false && players.length > 0) {
      actionsWrapper.style.display = 'block';
      actionsEl.innerHTML = '';

      players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'action-card';

        const avatarHtml = p.avatar
          ? `<img class="action-avatar" style="border-color:${p.color}" src="${p.avatar}" alt="${p.name}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="action-avatar" style="background:${p.color}; border-color:${p.color}; display:none;">${p.initials}</div>`
          : `<div class="action-avatar" style="background:${p.color}; border-color:${p.color}">${p.initials}</div>`;

        const step = this._config.action_step || 1;
        const allowDec = this._config.allow_decrement !== false;

        card.innerHTML = `
          ${avatarHtml}
          <div class="action-name">${p.name}</div>
          <div class="action-score">${p.pts} ${unit}</div>
          <div class="btn-group">
            ${allowDec ? `<button class="action-btn action-btn-dec" title="-1 ${unit}">-</button>` : ''}
            <button class="action-btn action-btn-inc" title="+${step} ${unit}">+${step} ${unit}</button>
          </div>
        `;

        const incBtn = card.querySelector('.action-btn-inc');
        incBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._adjustScore(p, step);
        });

        if (allowDec) {
          const decBtn = card.querySelector('.action-btn-dec');
          decBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._adjustScore(p, -step);
          });
        }

        actionsEl.appendChild(card);
      });
    } else {
      actionsWrapper.style.display = 'none';
    }

    // 3.5. Update To-Do section
    this._updateTodoSection();

    // 4. Reset Button Section
    if (this._config.show_reset) {
      resetWrapper.style.display = 'block';
      resetLabel.textContent = this._config.reset_text || 'Wochen-Scoreboard zurücksetzen';
    } else {
      resetWrapper.style.display = 'none';
    }
  }
}

// Visual Card Editor for Lovelace UI (100% Configurable via Dashboard UI)
class HouseholdScoreboardCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._activeTab = 'players';
    this._isInternalChange = false;
  }

  setConfig(config) {
    this._config = {
      title: '🏆 Haushalts-Rangliste',
      subtitle: 'Gaming Scoreboard • Wer sammelt die meisten XP?',
      show_podium: true,
      show_ranks: true,
      show_actions: true,
      show_reset: false,
      reset_text: 'Wochen-Scoreboard zurücksetzen',
      reset_confirm: 'Möchtest du die Punkte wirklich für alle Spieler zurücksetzen?',
      unit: 'XP',
      action_step: 1,
      allow_decrement: true,
      max_tasks: 0,
      todo_limit: 0,
      todo_max_height: '',
      card_height: '',
      card_max_height: '',
      always_scroll: false,
      compact: false,
      players: [],
      ...config
    };

    if (this._isInternalChange) {
      this._isInternalChange = false;
      return;
    }

    this._render();
  }

  set hass(hass) {
    const prevHass = this._hass;
    this._hass = hass;
    if (!prevHass && hass) {
      this._updateDatalists();
    }
  }

  _fireConfigChanged() {
    this._isInternalChange = true;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _updateConfig(diff) {
    this._config = {
      ...this._config,
      ...diff,
    };
    this._fireConfigChanged();
  }

  _setActiveTab(tab) {
    this._activeTab = tab;
    this._render();
  }

  _addPlayer() {
    const players = [...(this._config.players || [])];
    const nextIdx = players.length + 1;
    const nextColor = DEFAULT_COLORS[players.length % DEFAULT_COLORS.length];

    let suggestedCounter = '';
    let suggestedPerson = '';
    if (this._hass && this._hass.states) {
      const usedCounters = new Set(players.map(p => p.entity));
      const availableCounters = Object.keys(this._hass.states).filter(
        id => id.startsWith('counter.') && !usedCounters.has(id)
      );
      if (availableCounters.length > 0) suggestedCounter = availableCounters[0];

      const usedPersons = new Set(players.map(p => p.person));
      const availablePersons = Object.keys(this._hass.states).filter(
        id => id.startsWith('person.') && !usedPersons.has(id)
      );
      if (availablePersons.length > 0) suggestedPerson = availablePersons[0];
    }

    players.push({
      name: `Spieler ${nextIdx}`,
      entity: suggestedCounter,
      person: suggestedPerson,
      avatar: '',
      color: nextColor
    });

    this._updateConfig({ players });
    this._render();
  }

  _removePlayer(idx) {
    const players = [...(this._config.players || [])];
    if (players.length <= 1) {
      if (!confirm('Möchtest du diesen letzten Spieler wirklich entfernen?')) return;
    }
    players.splice(idx, 1);
    this._updateConfig({ players });
    this._render();
  }

  _movePlayer(idx, direction) {
    const players = [...(this._config.players || [])];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= players.length) return;
    const temp = players[idx];
    players[idx] = players[targetIdx];
    players[targetIdx] = temp;
    this._updateConfig({ players });
    this._render();
  }

  _updatePlayerProp(idx, prop, value) {
    if (!this._config.players || !this._config.players[idx]) return;
    const players = this._config.players.map((p, i) => {
      if (i === idx) {
        return { ...p, [prop]: value };
      }
      return p;
    });
    this._config = { ...this._config, players };
    this._fireConfigChanged();

    if (prop === 'name') {
      const titleSpan = this.shadowRoot.getElementById(`p-title-${idx}`);
      if (titleSpan) titleSpan.textContent = value || `Spieler ${idx + 1}`;
    } else if (prop === 'color') {
      const dot = this.shadowRoot.getElementById(`p-dot-${idx}`);
      if (dot) dot.style.backgroundColor = value;
    }
  }

  _getTodoOptions() {
    if (!this._hass || !this._hass.states) return '';
    return Object.keys(this._hass.states)
      .filter(id => id.startsWith('todo.'))
      .sort()
      .map(id => {
        const state = this._hass.states[id];
        const friendly = state && state.attributes ? state.attributes.friendly_name : null;
        const label = friendly ? `${friendly} (${id})` : id;
        return `<option value="${id}">${label}</option>`;
      })
      .join('');
  }

  _getCounterOptions() {
    if (!this._hass || !this._hass.states) return '';
    return Object.keys(this._hass.states)
      .filter(id => id.startsWith('counter.') || id.startsWith('input_number.'))
      .sort()
      .map(id => {
        const state = this._hass.states[id];
        const friendly = state && state.attributes ? state.attributes.friendly_name : null;
        return `<option value="${id}">${friendly ? `${friendly} (${id})` : id}</option>`;
      })
      .join('');
  }

  _getPersonOptions() {
    if (!this._hass || !this._hass.states) return '';
    return Object.keys(this._hass.states)
      .filter(id => id.startsWith('person.'))
      .sort()
      .map(id => {
        const state = this._hass.states[id];
        const friendly = state && state.attributes ? state.attributes.friendly_name : null;
        return `<option value="${id}">${friendly ? `${friendly} (${id})` : id}</option>`;
      })
      .join('');
  }

  _getNotifyOptions() {
    if (!this._hass || !this._hass.services || !this._hass.services.notify) return '';
    return Object.keys(this._hass.services.notify)
      .sort()
      .map(s => `<option value="notify.${s}">notify.${s}</option>`)
      .join('');
  }

  _getThemeOptions() {
    if (!this._hass || !this._hass.themes || !this._hass.themes.themes) return '';
    return Object.keys(this._hass.themes.themes)
      .sort()
      .map(t => `<option value="${t}">${t}</option>`)
      .join('');
  }

  _updateDatalists() {
    if (!this.shadowRoot) return;
    const counterDatalist = this.shadowRoot.getElementById('hsc-counter-list');
    if (counterDatalist) {
      counterDatalist.innerHTML = this._getCounterOptions();
    }
    const personDatalist = this.shadowRoot.getElementById('hsc-person-list');
    if (personDatalist) {
      personDatalist.innerHTML = this._getPersonOptions();
    }
    const notifyDatalist = this.shadowRoot.getElementById('hsc-notify-list');
    if (notifyDatalist) {
      notifyDatalist.innerHTML = this._getNotifyOptions();
    }
    const themeDatalist = this.shadowRoot.getElementById('hsc-theme-list');
    if (themeDatalist) {
      themeDatalist.innerHTML = this._getThemeOptions();
    }
  }

  _render() {
    if (!this.shadowRoot) return;

    const players = this._config.players || [];
    const activeTab = this._activeTab;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--paper-font-body1_-_font-family, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          color: var(--primary-text-color, #212121);
          box-sizing: border-box;
        }

        .editor-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 6px 0 16px 0;
        }

        /* TABS */
        .tab-bar {
          display: flex;
          gap: 6px;
          border-bottom: 2px solid var(--divider-color, rgba(127, 127, 127, 0.2));
          padding-bottom: 4px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tab-bar::-webkit-scrollbar {
          display: none;
        }
        .tab-btn {
          background: none;
          border: none;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--secondary-text-color, #757575);
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          border-bottom: 3px solid transparent;
          margin-bottom: -6px;
          transition: all 0.2s ease;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tab-btn:hover {
          color: var(--primary-text-color, #212121);
          background: rgba(127, 127, 127, 0.08);
        }
        .tab-btn.active {
          color: var(--primary-color, #ffd700);
          border-bottom-color: var(--primary-color, #ffd700);
          background: rgba(255, 215, 0, 0.08);
        }
        .tab-badge {
          background: var(--divider-color, rgba(127, 127, 127, 0.25));
          color: var(--primary-text-color, #212121);
          font-size: 11px;
          padding: 1px 6px;
          border-radius: 10px;
          font-weight: bold;
        }

        /* TAB PANELS */
        .tab-panel {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* FORM ELEMENTS */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--secondary-text-color, #757575);
        }
        .hsc-input {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
          background: var(--card-background-color, rgba(127, 127, 127, 0.05));
          color: var(--primary-text-color, #212121);
          font-size: 13.5px;
          box-sizing: border-box;
          width: 100%;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .hsc-input:focus {
          border-color: var(--primary-color, #ffd700);
          box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.2);
        }
        .field-hint {
          font-size: 11.5px;
          color: var(--secondary-text-color, #888);
          margin-top: 2px;
          line-height: 1.3;
        }

        /* TOGGLE ROWS */
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--card-background-color, rgba(127, 127, 127, 0.05));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.15));
          border-radius: 12px;
          gap: 12px;
        }
        .toggle-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .toggle-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--primary-text-color, #212121);
        }
        .toggle-desc {
          font-size: 11.5px;
          color: var(--secondary-text-color, #757575);
        }

        /* TOGGLE SWITCH */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--divider-color, #888);
          transition: .25s ease;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .25s ease;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        input:checked + .slider {
          background-color: var(--primary-color, #ffd700);
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }

        /* PLAYER CARDS */
        .player-card {
          background: var(--card-background-color, rgba(127, 127, 127, 0.06));
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.18));
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }
        .player-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--divider-color, rgba(127, 127, 127, 0.12));
          padding-bottom: 8px;
        }
        .player-title-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .player-color-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
          flex-shrink: 0;
        }
        .player-header-title {
          font-weight: 700;
          font-size: 14px;
          color: var(--primary-text-color, #212121);
        }
        .player-btn-group {
          display: flex;
          gap: 4px;
        }
        .btn-icon {
          background: rgba(127, 127, 127, 0.12);
          border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
          border-radius: 6px;
          color: var(--primary-text-color, #212121);
          cursor: pointer;
          padding: 4px 8px;
          font-size: 12px;
          transition: all 0.15s ease;
        }
        .btn-icon:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .btn-icon:not(:disabled):hover {
          background: rgba(127, 127, 127, 0.22);
        }
        .btn-icon.delete:not(:disabled):hover {
          background: #ff5252;
          color: white;
          border-color: #ff5252;
        }

        /* COLOR PICKER & SWATCHES */
        .color-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .hsc-color-picker {
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: none;
        }
        .swatches {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .swatch {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        }
        .swatch:hover {
          transform: scale(1.18);
        }
        .swatch.active {
          outline: 2px solid var(--primary-color, #ffd700);
          outline-offset: 2px;
        }

        /* ACTION BUTTONS */
        .btn-add {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 18px;
          background: var(--primary-color, #ffd700);
          color: #121212;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.15s ease;
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
        }
        .btn-add:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        /* LEVEL CARDS */
        .level-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          background: var(--card-background-color, rgba(127, 127, 127, 0.05));
          border-left: 4px solid var(--primary-color, #ffd700);
        }
        .level-badge {
          font-size: 26px;
          line-height: 1;
        }
        .level-info {
          flex: 1;
        }
        .level-name {
          font-weight: 700;
          font-size: 14px;
          color: var(--primary-text-color, #212121);
        }
        .level-req {
          font-size: 12px;
          color: var(--secondary-text-color, #757575);
          margin-top: 2px;
        }
      </style>

      <datalist id="hsc-todo-list">
        ${this._getTodoOptions()}
      </datalist>
      <datalist id="hsc-counter-list">
        ${this._getCounterOptions()}
      </datalist>
      <datalist id="hsc-person-list">
        ${this._getPersonOptions()}
      </datalist>
      <datalist id="hsc-notify-list">
        ${this._getNotifyOptions()}
      </datalist>
      <datalist id="hsc-theme-list">
        ${this._getThemeOptions()}
      </datalist>

      <div class="editor-container">
        <!-- TAB BAR -->
        <div class="tab-bar">
          <button type="button" class="tab-btn ${activeTab === 'players' ? 'active' : ''}" data-tab="players">
            👥 Spieler <span class="tab-badge">${players.length}</span>
          </button>
          <button type="button" class="tab-btn ${activeTab === 'general' ? 'active' : ''}" data-tab="general">
            ⚙️ Allgemein
          </button>
          <button type="button" class="tab-btn ${activeTab === 'todo' ? 'active' : ''}" data-tab="todo">
            📋 Aufgaben
          </button>
          <button type="button" class="tab-btn ${activeTab === 'display' ? 'active' : ''}" data-tab="display">
            🎛️ Anzeige & Aktionen
          </button>
          <button type="button" class="tab-btn ${activeTab === 'reset' ? 'active' : ''}" data-tab="reset">
            🔄 Reset
          </button>
          <button type="button" class="tab-btn ${activeTab === 'levels' ? 'active' : ''}" data-tab="levels">
            🏅 Level
          </button>
        </div>

        <!-- TAB 1: PLAYERS -->
        <div class="tab-panel" style="display: ${activeTab === 'players' ? 'flex' : 'none'};">
          ${players.length === 0 ? `
            <div style="text-align: center; padding: 24px 12px; opacity: 0.7; font-size: 14px; background: rgba(127,127,127,0.06); border-radius: 12px; border: 1px dashed var(--divider-color, rgba(127,127,127,0.2));">
              Noch keine Spieler angelegt. Klicke unten auf "Spieler hinzufügen", um zu starten!
            </div>
          ` : ''}

          ${players.map((p, idx) => `
            <div class="player-card" data-idx="${idx}">
              <div class="player-header">
                <div class="player-title-box">
                  <span id="p-dot-${idx}" class="player-color-dot" style="background-color: ${p.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]};"></span>
                  <span id="p-title-${idx}" class="player-header-title">${p.name || `Spieler ${idx + 1}`}</span>
                </div>
                <div class="player-btn-group">
                  <button type="button" class="btn-icon btn-move-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} title="Nach oben verschieben">▲</button>
                  <button type="button" class="btn-icon btn-move-down" data-idx="${idx}" ${idx === players.length - 1 ? 'disabled' : ''} title="Nach unten verschieben">▼</button>
                  <button type="button" class="btn-icon delete btn-delete-player" data-idx="${idx}" title="Spieler löschen">🗑️</button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="hsc-input p-input" data-idx="${idx}" data-prop="name" value="${p.name || ''}" placeholder="z. B. Alex" />
              </div>

              <div class="form-group">
                <label class="form-label">Zähler-Entität (counter.* oder input_number.*)</label>
                <input type="text" list="hsc-counter-list" class="hsc-input p-input" data-idx="${idx}" data-prop="entity" value="${p.entity || ''}" placeholder="counter.punkte_alex" />
                <div class="field-hint">Die Home Assistant Entität, in der die Punkte gezählt werden.</div>
              </div>

              <div class="form-group">
                <label class="form-label">Person-Profil (für Avatarbild)</label>
                <input type="text" list="hsc-person-list" class="hsc-input p-input" data-idx="${idx}" data-prop="person" value="${p.person || ''}" placeholder="person.alex (optional)" />
                <div class="field-hint">Liest das Profilbild automatisch aus deiner Home Assistant Person.</div>
              </div>

              <div class="form-group">
                <label class="form-label">Eigenes Bild / Avatar-URL (optional)</label>
                <input type="text" class="hsc-input p-input" data-idx="${idx}" data-prop="avatar" value="${p.avatar || p.image || ''}" placeholder="/local/alex.png oder URL (optional)" />
                <div class="field-hint">Überschreibt das Profilbild der Person mit einem individuellen Bild.</div>
              </div>

              <div class="form-group">
                <label class="form-label">Streak-Zähler (optional)</label>
                <input type="text" list="hsc-counter-list" class="hsc-input p-input" data-idx="${idx}" data-prop="streak_entity" value="${p.streak_entity || ''}" placeholder="counter.streak_alex (optional)" />
                <div class="field-hint">Zähler für Serien. Bleibt dieses Feld leer, speichert die Karte Serien automatisch im Browser!</div>
              </div>

              <div class="form-group">
                <label class="form-label">Benachrichtigungs-Dienst (optional)</label>
                <input type="text" list="hsc-notify-list" class="hsc-input p-input" data-idx="${idx}" data-prop="notify_service" value="${p.notify_service || ''}" placeholder="notify.mobile_app_alex_phone (optional)" />
                <div class="field-hint">Dienst für Smartphone-Benachrichtigungen bei Aufgabenauslosung (z. B. Companion App).</div>
              </div>

              <div class="form-group">
                <label class="form-label">Spieler-Farbe</label>
                <div class="color-row">
                  <input type="color" class="hsc-color-picker" data-idx="${idx}" value="${p.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}" />
                  <div class="swatches">
                    ${DEFAULT_COLORS.map(c => `
                      <span class="swatch ${p.color === c ? 'active' : ''}" style="background-color: ${c};" data-color="${c}" data-idx="${idx}"></span>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}

          <button type="button" class="btn-add" id="btn-add-player">
            ➕ Spieler hinzufügen
          </button>
        </div>

        <!-- TAB 2: GENERAL -->
        <div class="tab-panel" style="display: ${activeTab === 'general' ? 'flex' : 'none'};">
          <div class="form-group">
            <label class="form-label">Karten-Titel</label>
            <input type="text" class="hsc-input" id="cfg-title" value="${this._config.title || ''}" placeholder="🏆 Haushalts-Rangliste" />
            <div class="field-hint">Die Hauptüberschrift ganz oben auf der Karte.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Untertitel / Motto</label>
            <input type="text" class="hsc-input" id="cfg-subtitle" value="${this._config.subtitle || ''}" placeholder="Gaming Scoreboard • Wer sammelt die meisten XP?" />
            <div class="field-hint">Kleinerer Text unter dem Titel (kann auch leer gelassen werden).</div>
          </div>

          <div class="form-group">
            <label class="form-label">Punkte-Einheit</label>
            <input type="text" class="hsc-input" id="cfg-unit" value="${this._config.unit || 'XP'}" placeholder="XP" />
            <div class="field-hint">Die angezeigte Einheit nach den Zahlen (z. B. XP, Punkte, Sterne, Tasks).</div>
          </div>

          <div class="form-group">
            <label class="form-label">Theme (optional)</label>
            <input type="text" list="hsc-theme-list" class="hsc-input" id="cfg-theme" value="${this._config.theme || ''}" placeholder="Standard (vom Benutzer / Dashboard)" />
            <div class="field-hint">Wähle ein spezifisches Home Assistant Theme für diese Karte oder lasse das Feld leer für das vom Benutzer ausgewählte Theme.</div>
          </div>
        </div>

        <!-- TAB: TODO / CHORES -->
        <div class="tab-panel" style="display: ${activeTab === 'todo' ? 'flex' : 'none'};">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">Aufgabenliste auf der Karte anzeigen</div>
              <div class="toggle-desc">Aktiviert die interaktive To-Do / Aufgaben-Sektion.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-show-todo" ${this._config.show_todo !== false ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">To-Do-Listen-Entität (todo.*)</label>
            <input type="text" list="hsc-todo-list" class="hsc-input" id="cfg-todo-entity" value="${this._config.todo_entity || ''}" placeholder="todo.haushalt" />
            <div class="field-hint">Wähle eine beliebige Home Assistant To-Do-Liste aus.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Titel der Aufgaben-Sektion</label>
            <input type="text" class="hsc-input" id="cfg-todo-title" value="${this._config.todo_title || '📋 Aufgaben & Quests'}" placeholder="📋 Aufgaben & Quests" />
          </div>

          <div class="form-group">
            <label class="form-label">Maximale Anzahl sichtbarer Aufgaben</label>
            <input type="number" min="0" max="50" class="hsc-input" id="cfg-max-tasks" value="${this._config.max_tasks !== undefined ? this._config.max_tasks : (this._config.todo_limit || '')}" placeholder="0 = alle anzeigen" />
            <div class="field-hint">Begrenzt die Aufgabenliste auf die ersten N Aufgaben (ideal für Nest Hub, Google Cast oder kleine Bildschirme). 0 = unbegrenzt.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Maximale Höhe der Aufgabenliste (z. B. 350px)</label>
            <input type="text" class="hsc-input" id="cfg-todo-max-height" value="${this._config.todo_max_height || ''}" placeholder="z. B. 350px (optional)" />
            <div class="field-hint">Aktiviert eine scrollbare Aufgabenliste mit festgelegter Maximalhöhe.</div>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">🎲 "Wer ist dran?" (Aufgaben-Roulette)</div>
              <div class="toggle-desc">Zeigt einen Würfel-Button im Aufgabenbereich und an Aufgaben zum fairen Auslosen des nächsten Erledigers.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-show-roulette" ${this._config.show_roulette !== false ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">🏷️ Automatische Aufgaben-Icons</div>
              <div class="toggle-desc">Erkennt Begriffe wie Müll 🗑️, Spülmaschine 🍽️, Wäsche 🧺 und versieht Aufgaben mit Icons.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-show-task-icons" ${this._config.show_task_icons !== false ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">Standard-Benachrichtigungsdienst (optional)</label>
            <input type="text" list="hsc-notify-list" class="hsc-input" id="cfg-notify-service" value="${this._config.notify_service || ''}" placeholder="notify.notify (optional)" />
            <div class="field-hint">Fallback für alle Spieler, bei denen kein eigener Benachrichtigungsdienst hinterlegt ist.</div>
          </div>

          <div style="background: rgba(68, 138, 255, 0.08); border: 1px solid rgba(68, 138, 255, 0.25); border-radius: 12px; padding: 12px 14px; margin-top: 8px;">
            <div style="font-weight: 700; font-size: 13px; color: #448aff; margin-bottom: 6px;">💡 Smarte Syntax in der Aufgaben-Beschreibung:</div>
            <div style="font-size: 12px; line-height: 1.6; opacity: 0.85;">
              Trage in die Beschreibung einer Aufgabe in Home Assistant einfach Tags ein:<br/>
              • <code>xp: 20</code> ➔ Basis-Belohnung (Standard: 10 XP)<br/>
              • <code>reset: 3</code> ➔ Automatisch alle 3 Tage wiederholen (oder <code>reset: 1</code> für täglich)<br/>
              • <code>bonus: +10</code> ➔ Kopfgeld: +10 XP pro Tag, den die Aufgabe überfällig ist!<br/>
              <i>Beispiel:</i> <code>[xp: 25] [reset: 2] [bonus: +10]</code>
            </div>
          </div>
        </div>

        <!-- TAB 3: DISPLAY & ACTIONS -->
        <div class="tab-panel" style="display: ${activeTab === 'display' ? 'flex' : 'none'};">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">Kompakter Modus (Nest Hub / Kleine Displays)</div>
              <div class="toggle-desc">Reduziert Abstände, Schrift- und Avatargrößen, damit die Karte perfekt auf kleine Bildschirme passt.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-compact" ${this._config.compact === true ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">Kartenhöhe (z. B. 480px, 500px)</label>
            <input type="text" class="hsc-input" id="cfg-card-height" value="${this._config.card_height || this._config.height || ''}" placeholder="z. B. 480px (optional)" />
            <div class="field-hint">Legt eine feste Kartenhöhe in Pixeln fest. Übersteigende Inhalte können flüssig vertikal gescrollt werden (ideal für Google Cast & Küchen-Displays).</div>
          </div>

          <div class="form-group">
            <label class="form-label">Maximale Kartenhöhe (z. B. 500px)</label>
            <input type="text" class="hsc-input" id="cfg-card-max-height" value="${this._config.card_max_height || this._config.max_height || ''}" placeholder="z. B. 500px (optional)" />
            <div class="field-hint">Begrenzt die Gesamthöhe der Karte nach oben hin. Größere Inhalte werden automatisch scrollbar.</div>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">📜 Scrollfunktion immer erzwingen</div>
              <div class="toggle-desc">Aktiviert immer eine vertikale Scroll-Möglichkeit auf der gesamten Karte (auch bei wenigen Aufgaben oder kompaktem Display).</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-always-scroll" ${this._config.always_scroll === true || this._config.always_scroll === 'true' ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">Siegertreppchen (Podium) anzeigen</div>
              <div class="toggle-desc">Animierte Treppchen-Darstellung der Top 3 mit Kronen und Medaillen.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-show-podium" ${this._config.show_podium !== false ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">Rangliste mit Fortschrittsbalken</div>
              <div class="toggle-desc">Zeigt alle Spieler mit Punkten, Level-Badges und Fortschritt zum nächsten Rang.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-show-ranks" ${this._config.show_ranks !== false ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">🔥 Streak-System anzeigen</div>
              <div class="toggle-desc">Zeigt Flammen-Badges für aufeinanderfolgende Tage mit erledigten Aufgaben.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-show-streaks" ${this._config.show_streaks !== false ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">🔊 Retro-Soundeffekte (Web Audio)</div>
              <div class="toggle-desc">Spielt 8-Bit Münz-Sounds und Fanfaren beim Erledigen von Aufgaben und Verteilen von Punkten.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-enable-sound" ${this._config.enable_sound !== false ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">Schnell-Aktions-Buttons (+XP)</div>
              <div class="toggle-desc">Ermöglicht das direkte Vergeben von Punkten per Klick auf der Karte.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-show-actions" ${this._config.show_actions !== false ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">Schrittweite pro Klick (Punkte)</label>
            <input type="number" min="1" max="100" class="hsc-input" id="cfg-action-step" value="${this._config.action_step || 1}" />
            <div class="field-hint">Anzahl der Punkte, die pro Klick auf den Button vergeben werden (Standard: 1).</div>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">Minus-Button (-XP) erlauben</div>
              <div class="toggle-desc">Bietet einen zusätzlichen Button, um versehentlich vergebene Punkte abzuziehen.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-allow-decrement" ${this._config.allow_decrement !== false ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- TAB 4: RESET -->
        <div class="tab-panel" style="display: ${activeTab === 'reset' ? 'flex' : 'none'};">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-title">Reset-Button anzeigen</div>
              <div class="toggle-desc">Fügt einen Button am unteren Kartenrand hinzu, um die Punktestände aller Spieler zurückzusetzen.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="cfg-show-reset" ${!!this._config.show_reset ? 'checked' : ''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">Button-Beschriftung</label>
            <input type="text" class="hsc-input" id="cfg-reset-text" value="${this._config.reset_text || 'Wochen-Scoreboard zurücksetzen'}" />
            <div class="field-hint">Text auf dem Reset-Button.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Sicherheits-Bestätigungstext</label>
            <input type="text" class="hsc-input" id="cfg-reset-confirm" value="${this._config.reset_confirm || 'Möchtest du die Punkte wirklich für alle Spieler zurücksetzen?'}" />
            <div class="field-hint">Meldung, die der Benutzer bestätigen muss, bevor alle Zähler auf 0 gesetzt werden.</div>
          </div>
        </div>

        <!-- TAB 5: LEVELS -->
        <div class="tab-panel" style="display: ${activeTab === 'levels' ? 'flex' : 'none'};">
          <div style="font-size: 13px; color: var(--secondary-text-color, #757575); margin-bottom: 4px;">
            Das Rang- und Levelsystem belohnt Fleiß im Haushalt automatisch mit neuen Abzeichen und Titeln:
          </div>

          ${DEFAULT_LEVELS.map(lvl => `
            <div class="level-card" style="border-left-color: ${lvl.color};">
              <div class="level-badge">${lvl.badge}</div>
              <div class="level-info">
                <div class="level-name" style="color: ${lvl.color};">${lvl.title}</div>
                <div class="level-req">Erreicht ab ${lvl.min} ${this._config.unit || 'XP'}</div>
              </div>
            </div>
          `).join('')}

          <div class="field-hint" style="margin-top: 6px;">
            💡 Die Level-Grenzwerte passen sich dynamisch an gesammelte Punkte an und motivieren Spieler mit animierten Fortschrittsbalken.
          </div>
        </div>
      </div>
    `;

    // Hook tab buttons
    this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._setActiveTab(btn.dataset.tab);
      });
    });

    // Hook player management
    const addBtn = this.shadowRoot.getElementById('btn-add-player');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._addPlayer());
    }

    this.shadowRoot.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        this._movePlayer(idx, -1);
      });
    });

    this.shadowRoot.querySelectorAll('.btn-move-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        this._movePlayer(idx, 1);
      });
    });

    this.shadowRoot.querySelectorAll('.btn-delete-player').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        this._removePlayer(idx);
      });
    });

    // Hook player inputs (no full re-render on input to preserve focus!)
    this.shadowRoot.querySelectorAll('.p-input').forEach(input => {
      input.addEventListener('input', (ev) => {
        const idx = parseInt(ev.target.dataset.idx, 10);
        const prop = ev.target.dataset.prop;
        this._updatePlayerProp(idx, prop, ev.target.value);
      });
    });

    // Hook player color picker
    this.shadowRoot.querySelectorAll('.hsc-color-picker').forEach(cp => {
      cp.addEventListener('input', (ev) => {
        const idx = parseInt(ev.target.dataset.idx, 10);
        this._updatePlayerProp(idx, 'color', ev.target.value);
      });
    });

    // Hook color swatches
    this.shadowRoot.querySelectorAll('.swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        const idx = parseInt(sw.dataset.idx, 10);
        const color = sw.dataset.color;
        this._updatePlayerProp(idx, 'color', color);
        const picker = this.shadowRoot.querySelector(`.hsc-color-picker[data-idx="${idx}"]`);
        if (picker) picker.value = color;
        const container = sw.parentElement;
        if (container) {
          container.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
          sw.classList.add('active');
        }
      });
    });

    // Hook general settings
    const titleInput = this.shadowRoot.getElementById('cfg-title');
    if (titleInput) {
      titleInput.addEventListener('input', (ev) => this._updateConfig({ title: ev.target.value }));
    }
    const subtitleInput = this.shadowRoot.getElementById('cfg-subtitle');
    if (subtitleInput) {
      subtitleInput.addEventListener('input', (ev) => this._updateConfig({ subtitle: ev.target.value }));
    }
    const unitInput = this.shadowRoot.getElementById('cfg-unit');
    if (unitInput) {
      unitInput.addEventListener('input', (ev) => this._updateConfig({ unit: ev.target.value }));
    }
    const themeInput = this.shadowRoot.getElementById('cfg-theme');
    if (themeInput) {
      themeInput.addEventListener('change', (ev) => {
        const val = ev.target.value.trim();
        this._updateConfig({ theme: val || undefined });
      });
    }

    // Hook display switches & inputs
    const compactToggle = this.shadowRoot.getElementById('cfg-compact');
    if (compactToggle) {
      compactToggle.addEventListener('change', (ev) => this._updateConfig({ compact: ev.target.checked }));
    }
    const cardHeightInput = this.shadowRoot.getElementById('cfg-card-height');
    if (cardHeightInput) {
      cardHeightInput.addEventListener('change', (ev) => this._updateConfig({ card_height: ev.target.value.trim() }));
    }
    const cardMaxHeightInput = this.shadowRoot.getElementById('cfg-card-max-height');
    if (cardMaxHeightInput) {
      cardMaxHeightInput.addEventListener('change', (ev) => this._updateConfig({ card_max_height: ev.target.value.trim() }));
    }
    const alwaysScrollToggle = this.shadowRoot.getElementById('cfg-always-scroll');
    if (alwaysScrollToggle) {
      alwaysScrollToggle.addEventListener('change', (ev) => this._updateConfig({ always_scroll: ev.target.checked }));
    }
    const podiumToggle = this.shadowRoot.getElementById('cfg-show-podium');
    if (podiumToggle) {
      podiumToggle.addEventListener('change', (ev) => this._updateConfig({ show_podium: ev.target.checked }));
    }
    const ranksToggle = this.shadowRoot.getElementById('cfg-show-ranks');
    if (ranksToggle) {
      ranksToggle.addEventListener('change', (ev) => this._updateConfig({ show_ranks: ev.target.checked }));
    }
    const todoEntityInput = this.shadowRoot.getElementById('cfg-todo-entity');
    if (todoEntityInput) {
      todoEntityInput.addEventListener('change', (ev) => this._updateConfig({ todo_entity: ev.target.value.trim() }));
    }

    const showTodoToggle = this.shadowRoot.getElementById('cfg-show-todo');
    if (showTodoToggle) {
      showTodoToggle.addEventListener('change', (ev) => this._updateConfig({ show_todo: ev.target.checked }));
    }
    const maxTasksInput = this.shadowRoot.getElementById('cfg-max-tasks');
    if (maxTasksInput) {
      maxTasksInput.addEventListener('input', (ev) => {
        const val = parseInt(ev.target.value, 10);
        this._updateConfig({ max_tasks: isNaN(val) ? 0 : val });
      });
    }
    const todoMaxHeightInput = this.shadowRoot.getElementById('cfg-todo-max-height');
    if (todoMaxHeightInput) {
      todoMaxHeightInput.addEventListener('change', (ev) => this._updateConfig({ todo_max_height: ev.target.value.trim() }));
    }
    const notifyServiceInput = this.shadowRoot.getElementById('cfg-notify-service');
    if (notifyServiceInput) {
      notifyServiceInput.addEventListener('change', (ev) => this._updateConfig({ notify_service: ev.target.value.trim() }));
    }

    const todoTitleInput = this.shadowRoot.getElementById('cfg-todo-title');
    if (todoTitleInput) {
      todoTitleInput.addEventListener('change', (ev) => this._updateConfig({ todo_title: ev.target.value }));
    }

    const rouletteToggle = this.shadowRoot.getElementById('cfg-show-roulette');
    if (rouletteToggle) {
      rouletteToggle.addEventListener('change', (ev) => this._updateConfig({ show_roulette: ev.target.checked }));
    }

    const iconsToggle = this.shadowRoot.getElementById('cfg-show-task-icons');
    if (iconsToggle) {
      iconsToggle.addEventListener('change', (ev) => this._updateConfig({ show_task_icons: ev.target.checked }));
    }

    const streaksToggle = this.shadowRoot.getElementById('cfg-show-streaks');
    if (streaksToggle) {
      streaksToggle.addEventListener('change', (ev) => this._updateConfig({ show_streaks: ev.target.checked }));
    }

    const soundToggle = this.shadowRoot.getElementById('cfg-enable-sound');
    if (soundToggle) {
      soundToggle.addEventListener('change', (ev) => this._updateConfig({ enable_sound: ev.target.checked }));
    }

    const actionsToggle = this.shadowRoot.getElementById('cfg-show-actions');
    if (actionsToggle) {
      actionsToggle.addEventListener('change', (ev) => this._updateConfig({ show_actions: ev.target.checked }));
    }
    const stepInput = this.shadowRoot.getElementById('cfg-action-step');
    if (stepInput) {
      stepInput.addEventListener('input', (ev) => {
        const val = parseInt(ev.target.value, 10);
        this._updateConfig({ action_step: isNaN(val) ? 1 : val });
      });
    }
    const decToggle = this.shadowRoot.getElementById('cfg-allow-decrement');
    if (decToggle) {
      decToggle.addEventListener('change', (ev) => this._updateConfig({ allow_decrement: ev.target.checked }));
    }

    // Hook reset settings
    const resetToggle = this.shadowRoot.getElementById('cfg-show-reset');
    if (resetToggle) {
      resetToggle.addEventListener('change', (ev) => this._updateConfig({ show_reset: ev.target.checked }));
    }
    const resetTextInput = this.shadowRoot.getElementById('cfg-reset-text');
    if (resetTextInput) {
      resetTextInput.addEventListener('input', (ev) => this._updateConfig({ reset_text: ev.target.value }));
    }
    const resetConfirmInput = this.shadowRoot.getElementById('cfg-reset-confirm');
    if (resetConfirmInput) {
      resetConfirmInput.addEventListener('input', (ev) => this._updateConfig({ reset_confirm: ev.target.value }));
    }
  }
}

// Register Custom Elements
customElements.define('household-scoreboard-card', HouseholdScoreboardCard);
customElements.define('household-scoreboard-card-editor', HouseholdScoreboardCardEditor);

// Register with Home Assistant custom cards list
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'household-scoreboard-card',
  name: 'Household Scoreboard Card',
  description: 'Ein spielerisches Haushalts-Scoreboard mit Siegertreppchen, Leveln, XP-Fortschritt und Schnell-Aktionen.',
  preview: true,
  documentationURL: 'https://github.com/buktahula/household-scoreboard-card'
});
