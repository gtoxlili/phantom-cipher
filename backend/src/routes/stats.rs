//! 只读统计接口。
//!
//! 一次请求三块数据：总览、排行榜、最近对局。前端做统计页时一发
//! 就够，不用并行三个请求。响应带 10 秒 stale-while-revalidate，
//! 既不会把 SQLite 怼到墙上，也不会让玩家看到太陈旧的胜率。

use super::SharedState;
use crate::db;
use axum::extract::{Query, State};
use axum::response::IntoResponse;
use axum::Json;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct StatsQuery {
    leaderboard: Option<i64>,
    recent: Option<i64>,
}

#[derive(Serialize)]
pub struct StatsResponse {
    totals: db::Totals,
    leaderboard: Vec<db::LeaderboardEntry>,
    recent: Vec<db::RecentMatch>,
}

pub async fn stats(
    State(state): State<SharedState>,
    Query(q): Query<StatsQuery>,
) -> impl IntoResponse {
    let lb = q.leaderboard.unwrap_or(20).clamp(1, 100);
    let rc = q.recent.unwrap_or(20).clamp(1, 100);
    let body = StatsResponse {
        totals: db::totals(&state.store.db),
        leaderboard: db::leaderboard(&state.store.db, lb),
        recent: db::recent_matches(&state.store.db, rc),
    };
    (
        [(
            axum::http::header::CACHE_CONTROL,
            "public, max-age=10, s-maxage=10, stale-while-revalidate=30",
        )],
        Json(body),
    )
}
