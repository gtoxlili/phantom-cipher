//! 单玩家档案查询。
//!
//! 用途：客户端拿到 inf-fingerprint visitor_id 后调一下，给昵称
//! 输入框预填"上次比赛用过的名字"——清 localStorage 或换设备但
//! 指纹仍能 fuzzy 匹配回原 visitor_id 的玩家，能直接看到熟悉的
//! 默认值，不用从头输。
//!
//! 不存在该 player_id（全新访客或从没打完一局）→ 404。前端 silent
//! 失败、按"新用户"流程走即可，不需要弹错。
//!
//! 缓存：max-age=300（5 分钟），因为玩家档案变化频率很低；
//! stale-while-revalidate=600 多撑 10 分钟边缘缓存兜底。比 stats
//! 接口的 max-age=10 长得多——stats 是排行榜需要相对实时，单档
//! 主要服务"预填默认值"，陈旧 5 分钟没影响。

use super::SharedState;
use crate::db;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;

pub async fn get_player(
    State(state): State<SharedState>,
    Path(pid): Path<String>,
) -> impl IntoResponse {
    // 路径参数粗校验：长度合理、只含可见字符。inf-fingerprint 在线
    // 时回 UUID（36 字符），离线时回 16 位 hex；任何 player_id 都
    // 不该超过 64 字符
    if pid.is_empty() || pid.len() > 64 {
        return (StatusCode::BAD_REQUEST, "bad player id").into_response();
    }

    match db::player_by_id(&state.store.db, &pid) {
        Some(profile) => (
            [(
                axum::http::header::CACHE_CONTROL,
                "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
            )],
            Json(profile),
        )
            .into_response(),
        None => (StatusCode::NOT_FOUND, "player not found").into_response(),
    }
}
