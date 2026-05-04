/**
 * 微信服务端代理调用封装。后端把所有需要 access_token 的接口都包了一层
 * `/api/wx/*`，这边给业务代码统一入口。
 *
 * 失败行为约定：
 *   - 网络错 / 后端 503（WX_APPID 未配置）：silent 失败，返回 fallback 值
 *     让上层决定怎么处理；不弹 toast，避免在合规未配置环境里干扰玩家
 *   - 业务错（比如内容 risky）：调用方按返回字段拦截，自己提示
 */

const store = require('./store');

function apiBase() {
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.apiBase) return app.globalData.apiBase;
  } catch (e) { /* ignore */ }
  return 'https://cipher.gtio.work';
}

function post(path, body) {
  return new Promise((resolve) => {
    wx.request({
      url: apiBase() + path,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: body,
      success: (res) => resolve({ statusCode: res.statusCode, data: res.data }),
      fail: () => resolve({ statusCode: 0, data: null }),
    });
  });
}

/**
 * 文本内容安全检测。返回 { pass, suggest, fallback }：
 *   - pass: true  → 放行（包括微信侧 503 / 网络错的 fallback 通行）
 *   - pass: false → 命中 risky，调用方应该拦
 *   - fallback: true 表示这次没真的检测过（后端 503 或网络错），
 *     合规更严的话调用方可以自己决定是否一并拦下
 *
 * 把 openid 从 store.playerId 拿；玩家进过游戏（identity 已 ensure）
 * 时是可信的 openid，否则是兜底 UUID——后者送给微信会被 errcode
 * 命中（openid 不属于本小程序），后端会返 ok:false，本函数 fallback。
 */
async function secCheck(content, scene) {
  const openid = store.getState().playerId;
  if (!content || !openid) return { pass: true, fallback: true };
  const res = await post('/api/wx/sec-check', {
    content,
    openid,
    scene: scene || 1,   // 1=资料/昵称 2=评论 3=论坛 4=社交日志
  });
  const body = res.data || {};
  if (res.statusCode === 503) return { pass: true, fallback: true };
  if (!body || body.ok === false) return { pass: true, fallback: true };
  return {
    pass: !!body.pass,
    suggest: body.suggest,
    label: body.label,
    fallback: false,
  };
}

/**
 * 拼小程序码 URL —— `<image src>` 直接渲染。
 *   scene: 房间码（4 字符，跟服务端 ROOM_CODE 一致）
 *   page: 进入路径，通常 'pages/room/room'，进了房间页再用 query 参数
 *         不行——getwxacodeunlimit 的 page 不支持 query，全部走 scene
 */
function qrcodeUrl(scene, opts) {
  const o = opts || {};
  const params = new (function () {
    let s = '';
    return {
      add(k, v) {
        if (v == null || v === '') return;
        s += (s ? '&' : '?') + encodeURIComponent(k) + '=' + encodeURIComponent(v);
      },
      str() { return s; },
    };
  })();
  params.add('scene', scene);
  params.add('page', o.page || 'pages/room/room');
  params.add('width', o.width || 280);
  params.add('check_path', false);
  // 调试期常用 trial；正式版上线后换 release
  params.add('env_version', o.envVersion || 'trial');
  if (o.lineColor) params.add('line_color', o.lineColor);
  return apiBase() + '/api/wx/qrcode' + params.str();
}

/**
 * 订阅消息授权 —— 客户端必须先调 wx.requestSubscribeMessage 让用户
 * 同意某个 template_id，然后服务端才能针对这个 openid+template 推一次。
 *
 * 用法：
 *   await subscribeOnce(['TEMPLATE_TURN_NOTIFICATION'])
 *   // 之后服务端可以一次性推该 template
 *
 * 返回每个 templateId 的授权结果：'accept' | 'reject' | 'ban' | 'filter'。
 */
function subscribeOnce(templateIds) {
  return new Promise((resolve) => {
    if (!templateIds || templateIds.length === 0) {
      resolve({});
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: templateIds,
      success: (res) => {
        // 把 errMsg 之类的 meta 字段过滤掉，只留 templateId → status 映射
        const out = {};
        templateIds.forEach((id) => {
          if (res[id]) out[id] = res[id];
        });
        resolve(out);
      },
      fail: () => resolve({}),
    });
  });
}

module.exports = {
  secCheck,
  qrcodeUrl,
  subscribeOnce,
};
