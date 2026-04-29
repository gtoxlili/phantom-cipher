import { createResource, createSignal, For, Show, onCleanup, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Sketch } from '@/components/Sketch';
import { ArrowLeftIcon } from '@/components/icons';
import * as s from './Stats.css';

interface Totals {
  matches: number;
  players: number;
  in_flight: number;
}

interface LeaderboardEntry {
  id: string;
  display_name: string;
  matches_played: number;
  matches_won: number;
  win_rate: number;
}

interface RecentMatch {
  id: number;
  code: string;
  winner_name: string | null;
  player_count: number;
  ended_at: number;
  duration_ms: number;
}

interface StatsResponse {
  totals: Totals;
  leaderboard: LeaderboardEntry[];
  recent: RecentMatch[];
}

async function fetchStats(): Promise<StatsResponse> {
  const resp = await fetch('/api/stats?leaderboard=20&recent=20');
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// "5 分钟前 / 2 小时前 / 3 天前" 这种相对时间，避免显示死板的
// 时间戳——排行榜上读起来更自然
function relativeTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚才';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  const mon = Math.floor(day / 30);
  return `${mon} 个月前`;
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} 秒`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return remSec === 0 ? `${min} 分钟` : `${min} 分 ${remSec} 秒`;
}

function rankClass(idx: number): string {
  if (idx === 0) return s.lbRowGold;
  if (idx === 1) return s.lbRowSilver;
  if (idx === 2) return s.lbRowBronze;
  return s.lbRowDefault;
}

function rankColorClass(idx: number): string {
  if (idx === 0) return s.rankGold;
  if (idx <= 2) return s.rankBlood;
  return '';
}

export default function Stats() {
  const navigate = useNavigate();
  const [data, { refetch }] = createResource(fetchStats);
  // now 用 signal 让 relativeTime 每分钟自然刷新一次（不重新拉数据，
  // 只是让"5 分钟前"自己变成"6 分钟前"）。整页轮询另起一个定时器。
  const [now, setNow] = createSignal(Date.now());

  onMount(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    // 数据轮询每 30 秒拉一次。后端 /api/stats 自带 max-age=10，浏览
    // 器或边缘缓存一般会兜住，真到源站的请求最坏 30/10 = 3 次/分钟。
    const poll = window.setInterval(() => refetch(), 30_000);
    onCleanup(() => {
      window.clearInterval(tick);
      window.clearInterval(poll);
    });
  });

  return (
    <main class={s.main}>
      <Sketch />

      <header class={s.header}>
        <button
          type="button"
          class={s.backLink}
          onClick={() => navigate('/')}
          aria-label="返回首页"
        >
          <ArrowLeftIcon size="0.85em" />
          <span>BACK</span>
        </button>
      </header>

      <div class={s.titleBlock}>
        <div class={s.titleEyebrow}>
          <span>★ STAT BOARD ★</span>
        </div>
        <h1 class={s.title}>
          <span class={s.titleRow1}>排行榜</span>
          <span class={s.titleRow2}>// LEADERBOARD</span>
        </h1>
      </div>

      <Show
        when={data() && !data.error}
        fallback={
          <Show
            when={data.error}
            fallback={<div class={s.stateBox}>· LOADING · 加载中</div>}
          >
            <div class={`${s.stateBox} ${s.errorBox}`}>
              · CONNECTION ERROR · 拉取失败 ·
            </div>
          </Show>
        }
      >
        {/* 总览三连卡 */}
        <section class={s.totals}>
          <div class={s.totalCard}>
            <div class={s.totalLabel}>累计对局</div>
            <div class={s.totalValue}>{data()!.totals.matches}</div>
            <div class={s.totalUnit}>MATCHES</div>
          </div>
          <div class={s.totalCard}>
            <div class={s.totalLabel}>累计玩家</div>
            <div class={s.totalValue}>{data()!.totals.players}</div>
            <div class={s.totalUnit}>PLAYERS</div>
          </div>
          <div class={s.totalCard}>
            <div class={s.totalLabel}>进行中</div>
            <div class={s.totalValue}>{data()!.totals.in_flight}</div>
            <div class={s.totalUnit}>LIVE NOW</div>
          </div>
        </section>

        {/* 玩家排行榜 */}
        <section>
          <div class={s.sectionHead}>
            <span class={s.sectionTitleCn}>名次</span>
            <span class={s.sectionTitleEn}>· TOP {data()!.leaderboard.length} ·</span>
          </div>
          <Show
            when={data()!.leaderboard.length > 0}
            fallback={
              <div class={s.stateBox}>
                · NO MATCHES YET · 还没有完整对局数据 ·
              </div>
            }
          >
            <div class={s.leaderboardList}>
              <For each={data()!.leaderboard}>
                {(entry, idx) => (
                  <div class={`${s.lbRow} ${rankClass(idx())}`}>
                    <div class={`${s.rank} ${rankColorClass(idx())}`}>
                      {String(idx() + 1).padStart(2, '0')}
                    </div>
                    <div class={s.lbName}>{entry.display_name.toUpperCase()}</div>
                    <div class={s.lbStat}>
                      <span class={s.lbWinsValue}>{entry.matches_won}</span>
                      <span class={s.lbStatLabel}>胜 · WIN</span>
                    </div>
                    <div class={`${s.lbStat} ${s.hideMobile}`}>
                      <span>{entry.matches_played}</span>
                      <span class={s.lbStatLabel}>出 · PLAY</span>
                    </div>
                    <div class={`${s.lbStat} ${s.hideMobile}`}>
                      <span>{(entry.win_rate * 100).toFixed(0)}%</span>
                      <span class={s.lbStatLabel}>率 · RATE</span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </section>

        {/* 最近对局 feed */}
        <section>
          <div class={s.sectionHead}>
            <span class={s.sectionTitleCn}>最近对局</span>
            <span class={s.sectionTitleEn}>· RECENT ·</span>
          </div>
          <Show
            when={data()!.recent.length > 0}
            fallback={
              <div class={s.stateBox}>
                · 暂无近期对局 ·
              </div>
            }
          >
            <div class={s.recentList}>
              <For each={data()!.recent}>
                {(m) => (
                  <div class={s.recentRow}>
                    <span class={s.recentCode}>{m.code}</span>
                    <span class={s.recentWinner}>
                      {m.winner_name ? m.winner_name.toUpperCase() : 'NO WINNER'}
                    </span>
                    <span class={s.recentMeta}>
                      <Show when={m.player_count > 0}>{m.player_count}P · </Show>
                      <span class={s.hideMobile}>
                        {formatDuration(m.duration_ms)} ·{' '}
                      </span>
                      {relativeTime(m.ended_at, now())}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </section>
      </Show>
    </main>
  );
}
