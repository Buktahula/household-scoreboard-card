/**
 * Household Scoreboard Card for Home Assistant
 * A gamified household chore and task scoreboard card with podium, levels, XP progress, and quick actions.
 * 
 * GitHub: https://github.com/alexanderriechel/household-scoreboard-card
 * License: MIT
 */

const CARD_VERSION = '1.0.0';

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

class HouseholdScoreboardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._lastStateHash = '';
    this._optimisticDeltas = {};
  }

  static getConfigElement() {
    return document.createElement('household-scoreboard-card-editor');
  }

  static getStubConfig(hass, entities) {
    // Attempt auto-discovery of counter or person entities
    const counters = entities ? entities.filter(e => e.startsWith('counter.')) : [];
    const persons = entities ? entities.filter(e => e.startsWith('person.')) : [];
    
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
      unit: 'XP',
      players: defaultPlayers
    };
  }

  getCardSize() {
    return 6;
  }

  setConfig(config) {
    if (!config.players || !Array.isArray(config.players) || config.players.length === 0) {
      throw new Error('Please configure at least one player in "players"');
    }

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
      levels: DEFAULT_LEVELS,
      ...config
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config || !this._config.players) return;

    // Check if relevant states have changed to prevent unnecessary re-rendering
    const currentHash = this._config.players.map(p => {
      const s = hass.states[p.entity];
      const personState = p.person ? hass.states[p.person] : null;
      return `${p.entity}:${s ? s.state : 'null'}:${personState ? personState.attributes.entity_picture : ''}`;
    }).join('|');

    if (currentHash !== this._lastStateHash) {
      this._lastStateHash = currentHash;
      this._updateData();
    }
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
    if (player.image) return player.image;
    if (player.person && this._hass && this._hass.states[player.person]) {
      const p = this._hass.states[player.person];
      if (p.attributes && p.attributes.entity_picture) {
        return p.attributes.entity_picture;
      }
    }
    if (player.entity && this._hass && this._hass.states[player.entity]) {
      const s = this._hass.states[player.entity];
      if (s.attributes && s.attributes.entity_picture) {
        return s.attributes.entity_picture;
      }
    }
    return null;
  }

  _getPlayerPoints(player) {
    let base = 0;
    if (this._hass && this._hass.states[player.entity]) {
      const val = parseFloat(this._hass.states[player.entity].state);
      base = isNaN(val) ? 0 : val;
    }
    const delta = this._optimisticDeltas[player.entity] || 0;
    return Math.max(0, base + delta);
  }

  _getSortedPlayers() {
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

  _adjustScore(player, amount) {
    this._forwardHaptic(amount > 0 ? 'success' : 'warning');
    
    // Optimistic UI update
    this._optimisticDeltas[player.entity] = (this._optimisticDeltas[player.entity] || 0) + amount;
    this._updateData();

    // Call Home Assistant service
    const domain = player.entity.split('.')[0];
    if (domain === 'counter') {
      if (amount > 0) {
        for (let i = 0; i < amount; i++) {
          this._callService('counter', 'increment', { entity_id: player.entity });
        }
      } else {
        for (let i = 0; i < Math.abs(amount); i++) {
          this._callService('counter', 'decrement', { entity_id: player.entity });
        }
      }
    } else if (domain === 'input_number') {
      const cur = this._getPlayerPoints(player);
      this._callService('input_number', 'set_value', {
        entity_id: player.entity,
        value: cur
      });
    } else {
      // Fallback custom event or generic state change attempt
      const eventName = amount > 0 ? 'household_scoreboard_increment' : 'household_scoreboard_decrement';
      this._callService('event', 'fire', {
        event_type: eventName,
        event_data: { entity_id: player.entity, amount }
      });
    }

    // Reset optimistic buffer after short delay
    setTimeout(() => {
      delete this._optimisticDeltas[player.entity];
    }, 1500);
  }

  _resetAll() {
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

    this._optimisticDeltas = {};
    this._updateData();
  }

  _render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          position: relative;
          overflow: hidden;
          background: var(--ha-card-background, var(--card-background-color, linear-gradient(135deg, rgba(28,28,38,0.96) 0%, rgba(18,18,26,0.98) 100%)));
          border-radius: var(--ha-card-border-radius, 24px);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, rgba(255, 215, 0, 0.15));
          box-shadow: var(--ha-card-box-shadow, 0 10px 30px rgba(0, 0, 0, 0.45));
          padding: 22px 18px;
          color: var(--primary-text-color, #ffffff);
          font-family: var(--paper-font-body1_-_font-family, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          box-sizing: border-box;
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
        .subtitle {
          font-size: 11.5px;
          opacity: 0.7;
          margin-top: 4px;
          font-weight: 500;
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
          background: #2a2a38;
        }

        .rank-1 .avatar-box {
          background: linear-gradient(135deg, #ffd700, #ff8f00);
          box-shadow: 0 0 22px rgba(255, 215, 0, 0.45);
        }
        .rank-1 .avatar-img, .rank-1 .avatar-fallback {
          width: 74px;
          height: 74px;
          border: 2px solid var(--ha-card-background, #1c1c24);
          font-size: 24px;
        }

        .rank-2 .avatar-box {
          background: linear-gradient(135deg, #e0e0e0, #9e9e9e);
          box-shadow: 0 0 14px rgba(224, 224, 224, 0.3);
        }
        .rank-2 .avatar-img, .rank-2 .avatar-fallback {
          width: 58px;
          height: 58px;
          border: 2px solid var(--ha-card-background, #1c1c24);
          font-size: 18px;
        }

        .rank-3 .avatar-box {
          background: linear-gradient(135deg, #cd7f32, #8d4f1f);
          box-shadow: 0 0 12px rgba(205, 127, 50, 0.3);
        }
        .rank-3 .avatar-img, .rank-3 .avatar-fallback {
          width: 52px;
          height: 52px;
          border: 2px solid var(--ha-card-background, #1c1c24);
          font-size: 16px;
        }

        .crown-badge {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 22px;
          filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6));
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
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          border: 2px solid #fff;
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
        }
        .rank-1 .podium-name {
          font-size: 15.5px;
          color: #ffd700;
          font-weight: 800;
        }

        .podium-score {
          font-size: 13px;
          font-weight: 800;
          margin-top: 2px;
          padding: 2px 10px;
          border-radius: 12px;
          background: rgba(255,255,255,0.08);
          display: inline-block;
        }
        .rank-1 .podium-score {
          background: rgba(255, 215, 0, 0.18);
          color: #ffd700;
          border: 1px solid rgba(255, 215, 0, 0.35);
        }
        .podium-level {
          font-size: 10.5px;
          opacity: 0.7;
          margin-top: 3px;
          font-weight: 600;
        }
        .rank-1 .podium-level {
          color: #ffd700;
          opacity: 0.9;
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
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 9px 12px;
          gap: 12px;
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .rank-row:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-1px);
        }
        .rank-row.leader {
          border-color: rgba(255, 215, 0, 0.35);
          background: rgba(255, 215, 0, 0.06);
        }
        .rank-pos {
          font-size: 15px;
          font-weight: 900;
          width: 22px;
          text-align: center;
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
          background: #2a2a38;
          border: 1.5px solid rgba(255,255,255,0.15);
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
        }
        .rank-row-badge {
          font-size: 10px;
          opacity: 0.65;
          font-weight: 500;
        }
        .rank-row-pts {
          font-size: 14px;
          font-weight: 800;
          color: #ffd700;
        }
        .prog-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
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
          opacity: 0.55;
          margin: 22px 0 10px 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 10px;
        }
        .action-card {
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 18px;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
          position: relative;
        }
        .action-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.18);
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
        }
        .action-score {
          font-size: 12px;
          font-weight: 800;
          color: #ffd700;
          margin-bottom: 9px;
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
          color: #ffd700;
          font-size: 12px;
          font-weight: 800;
          padding: 7px 6px;
          cursor: pointer;
          user-select: none;
          transition: all 0.15s ease;
        }
        .action-btn:hover {
          background: rgba(255, 215, 0, 0.3);
          transform: scale(1.03);
        }
        .action-btn:active {
          transform: scale(0.96);
        }
        .action-btn-dec {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.6);
          padding: 7px 8px;
          flex: 0 0 auto;
        }
        .action-btn-dec:hover {
          background: rgba(255, 82, 82, 0.2);
          border-color: rgba(255, 82, 82, 0.4);
          color: #ff5252;
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
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          padding: 7px 14px;
          color: rgba(255, 255, 255, 0.55);
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .reset-btn:hover {
          background: rgba(255, 82, 82, 0.12);
          border-color: rgba(255, 82, 82, 0.3);
          color: #ff5252;
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="title" id="card-title"></div>
          <div class="subtitle" id="card-subtitle"></div>
        </div>

        <div id="podium-section" class="podium-container"></div>
        <div id="ranks-section" class="rankings-list"></div>

        <div id="actions-wrapper">
          <div class="actions-title">⚡ Aufgaben erledigt (+XP)</div>
          <div id="actions-section" class="actions-grid"></div>
        </div>

        <div id="reset-wrapper" class="reset-wrap">
          <button id="reset-btn" class="reset-btn">
            <span>🔄</span> <span id="reset-label"></span>
          </button>
        </div>
      </ha-card>
    `;

    this.shadowRoot.getElementById('reset-btn').addEventListener('click', () => this._resetAll());
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
          ? `<img class="avatar-img" src="${p.avatar}" alt="${p.name}" />`
          : `<div class="avatar-fallback" style="background:${p.color}">${p.initials}</div>`;

        const crownHtml = rank === 1 ? `<div class="crown-badge">👑</div>` : '';

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
          ? `<img class="rank-row-avatar" src="${p.avatar}" alt="${p.name}" />`
          : `<div class="rank-row-avatar" style="background:${p.color}">${p.initials}</div>`;

        const nextHint = p.level.nextPts > 0 ? `noch ${p.level.nextPts} ${unit} bis ${p.level.nextTitle}` : 'Maximaler Rang!';

        ranksHtml += `
          <div class="rank-row ${isLeader ? 'leader' : ''}">
            <div class="rank-pos">${medalEmoji}</div>
            ${avatarHtml}
            <div class="rank-row-info">
              <div class="rank-row-top">
                <span class="rank-row-name">
                  ${p.name}
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
          ? `<img class="action-avatar" style="border-color:${p.color}" src="${p.avatar}" alt="${p.name}" />`
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

    // 4. Reset Button Section
    if (this._config.show_reset) {
      resetWrapper.style.display = 'block';
      resetLabel.textContent = this._config.reset_text || 'Wochen-Scoreboard zurücksetzen';
    } else {
      resetWrapper.style.display = 'none';
    }
  }
}

// Visual Card Editor for Lovelace UI
class HouseholdScoreboardCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    const target = ev.target;
    const configValue = target.configValue;
    let value = target.value;

    if (target.type === 'checkbox') {
      value = target.checked;
    }

    const newConfig = {
      ...this._config,
      [configValue]: value,
    };

    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        .editor {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 8px 0;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
        }
        .form-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-row label {
          font-size: 13px;
          font-weight: 600;
          color: var(--secondary-text-color, #888);
        }
        .form-row input[type="text"] {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid var(--divider-color, #444);
          background: var(--card-background-color, #222);
          color: var(--primary-text-color, #fff);
          font-size: 14px;
        }
        .switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;
        }
        .switch-row label {
          font-size: 14px;
          font-weight: 500;
        }
        .switch-row input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--primary-color, #ffd700);
          cursor: pointer;
        }
        .hint {
          font-size: 12px;
          opacity: 0.6;
          margin-top: 4px;
        }
      </style>

      <div class="editor">
        <div class="form-row">
          <label>Titel</label>
          <input type="text" .configValue="${'title'}" .value="${this._config.title || ''}" id="title" />
        </div>

        <div class="form-row">
          <label>Untertitel</label>
          <input type="text" .configValue="${'subtitle'}" .value="${this._config.subtitle || ''}" id="subtitle" />
        </div>

        <div class="form-row">
          <label>Einheit (z. B. XP, Punkte, Sterne)</label>
          <input type="text" .configValue="${'unit'}" .value="${this._config.unit || 'XP'}" id="unit" />
        </div>

        <div class="switch-row">
          <label>Siegertreppchen / Podium anzeigen</label>
          <input type="checkbox" .configValue="${'show_podium'}" ?checked="${this._config.show_podium !== false}" id="show_podium" />
        </div>

        <div class="switch-row">
          <label>Rangliste mit Fortschrittsbalken anzeigen</label>
          <input type="checkbox" .configValue="${'show_ranks'}" ?checked="${this._config.show_ranks !== false}" id="show_ranks" />
        </div>

        <div class="switch-row">
          <label>Schnell-Aktions-Buttons (+1 XP) anzeigen</label>
          <input type="checkbox" .configValue="${'show_actions'}" ?checked="${this._config.show_actions !== false}" id="show_actions" />
        </div>

        <div class="switch-row">
          <label>Scoreboard-Reset Button anzeigen</label>
          <input type="checkbox" .configValue="${'show_reset'}" ?checked="${!!this._config.show_reset}" id="show_reset" />
        </div>

        <div class="hint">
          💡 Spieler-Details (Namen, Counter- und Person-Entities) können flexibel über den YAML-Code-Editor konfiguriert werden.
        </div>
      </div>
    `;

    const inputs = this.shadowRoot.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('change', (ev) => this._valueChanged(ev));
      if (input.type === 'text') {
        input.addEventListener('input', (ev) => this._valueChanged(ev));
      }
    });
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
  documentationURL: 'https://github.com/alexanderriechel/household-scoreboard-card'
});
