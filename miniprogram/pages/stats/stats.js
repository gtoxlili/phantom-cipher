const { fetchStats } = require('../../lib/api');
const { relativeTime, formatDuration } = require('../../lib/util');

Page({
  data: {
    loading: true,
    error: '',
    totals: { matches: 0, players: 0, in_flight: 0 },
    leaderboard: [],     // 加上 _rank 字段
    recent: [],
    nowMs: Date.now(),
  },

  onLoad() {
    this._poll = setInterval(() => this._refetch(), 30000);
    this._tick = setInterval(() => this._recomputeRecent(), 60000);
    this._refetch();
  },

  onUnload() {
    if (this._poll) clearInterval(this._poll);
    if (this._tick) clearInterval(this._tick);
  },

  _refetch() {
    fetchStats(20, 20).then((data) => {
      const lb = (data.leaderboard || []).map((e, idx) => ({
        ...e,
        _rank: String(idx + 1).padStart(2, '0'),
        _rate: Math.round((e.win_rate || 0) * 100),
        _row: idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'default',
        _rankColor: idx === 0 ? 'gold' : idx <= 2 ? 'blood' : 'mute',
      }));
      const now = Date.now();
      const recent = (data.recent || []).map((m) => ({
        ...m,
        _rel: relativeTime(m.ended_at, now),
        _dur: formatDuration(m.duration_ms),
      }));
      this.setData({
        loading: false,
        error: '',
        totals: data.totals || { matches: 0, players: 0, in_flight: 0 },
        leaderboard: lb,
        recent,
        nowMs: now,
      });
    }).catch((err) => {
      this.setData({ loading: false, error: (err && err.message) || '加载失败' });
    });
  },

  _recomputeRecent() {
    const now = Date.now();
    const recent = this.data.recent.map((m) => ({
      ...m,
      _rel: relativeTime(m.ended_at, now),
    }));
    this.setData({ recent, nowMs: now });
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.redirectTo({ url: '/pages/home/home' }) });
  },
});
