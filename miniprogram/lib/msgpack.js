/**
 * 极简 MessagePack 解码器，仅服务端 → 客户端方向使用。
 *
 * 后端 rmp-serde 的 wire 形态固定：
 *   - 顶层是 map 或 array
 *   - 字符串走 UTF-8（fixstr / str8/16/32）
 *   - 整数走 fixint / int8-64 / uint8-64
 *   - 浮点 float32/64
 *   - 布尔 / nil
 *   - bin8/16/32（rmp-serde 把 Vec<u8> 编成 bin，这里支持但项目内不出现）
 *
 * 没有 ext 类型（项目里不会出现），没有 timestamp 扩展（时间戳是 i64）。
 *
 * 不依赖 TextDecoder——微信小程序的 worker / Skyline 环境可用，
 * 但保险起见，这里手写 UTF-8 → JS 字符串解码。BMP 内字符走 1-3 字节，
 * 4 字节用 surrogate pair。这套实现足够覆盖中英文 + emoji。
 *
 * 64 位整数：JS Number 的安全整数上限是 2^53-1 ≈ 9×10^15。游戏里所有
 * i64/u64 字段（ms 时间戳 ~1.7×10^12、log id 自增、deck count 等）
 * 都在这个范围内，直接转 Number 不会丢精度——跟 frontend/lib/ws.ts
 * 里 `int64AsNumber: true` 的判断完全一致。
 */

function utf8Decode(bytes, start, length) {
  let out = '';
  let i = start;
  const end = start + length;
  while (i < end) {
    const b = bytes[i++];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if ((b & 0xe0) === 0xc0) {
      const b1 = bytes[i++];
      out += String.fromCharCode(((b & 0x1f) << 6) | (b1 & 0x3f));
    } else if ((b & 0xf0) === 0xe0) {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      out += String.fromCharCode(((b & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
    } else if ((b & 0xf8) === 0xf0) {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      let cp = ((b & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      cp -= 0x10000;
      out += String.fromCharCode(0xd800 + (cp >>> 10), 0xdc00 + (cp & 0x3ff));
    } else {
      // 非法字节，跳过
    }
  }
  return out;
}

class Reader {
  constructor(buffer) {
    this.bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    this.pos = 0;
  }

  u8() { return this.bytes[this.pos++]; }
  i8() {
    const v = this.view.getInt8(this.pos);
    this.pos += 1;
    return v;
  }
  u16() {
    const v = this.view.getUint16(this.pos, false);
    this.pos += 2;
    return v;
  }
  i16() {
    const v = this.view.getInt16(this.pos, false);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.pos, false);
    this.pos += 4;
    return v;
  }
  i32() {
    const v = this.view.getInt32(this.pos, false);
    this.pos += 4;
    return v;
  }
  u64() {
    const hi = this.view.getUint32(this.pos, false);
    const lo = this.view.getUint32(this.pos + 4, false);
    this.pos += 8;
    return hi * 0x100000000 + lo;
  }
  i64() {
    const hi = this.view.getInt32(this.pos, false);
    const lo = this.view.getUint32(this.pos + 4, false);
    this.pos += 8;
    return hi * 0x100000000 + lo;
  }
  f32() {
    const v = this.view.getFloat32(this.pos, false);
    this.pos += 4;
    return v;
  }
  f64() {
    const v = this.view.getFloat64(this.pos, false);
    this.pos += 8;
    return v;
  }
  str(length) {
    const out = utf8Decode(this.bytes, this.pos, length);
    this.pos += length;
    return out;
  }
  bin(length) {
    const out = this.bytes.slice(this.pos, this.pos + length);
    this.pos += length;
    return out;
  }
}

function decodeValue(r) {
  const tag = r.u8();
  // positive fixint 0xxxxxxx
  if ((tag & 0x80) === 0) return tag;
  // negative fixint 111xxxxx
  if ((tag & 0xe0) === 0xe0) return tag - 0x100;
  // fixstr 101xxxxx
  if ((tag & 0xe0) === 0xa0) return r.str(tag & 0x1f);
  // fixarray 1001xxxx
  if ((tag & 0xf0) === 0x90) return decodeArray(r, tag & 0x0f);
  // fixmap 1000xxxx
  if ((tag & 0xf0) === 0x80) return decodeMap(r, tag & 0x0f);

  switch (tag) {
    case 0xc0: return null;
    case 0xc2: return false;
    case 0xc3: return true;
    case 0xc4: return r.bin(r.u8());
    case 0xc5: return r.bin(r.u16());
    case 0xc6: return r.bin(r.u32());
    case 0xca: return r.f32();
    case 0xcb: return r.f64();
    case 0xcc: return r.u8();
    case 0xcd: return r.u16();
    case 0xce: return r.u32();
    case 0xcf: return r.u64();
    case 0xd0: return r.i8();
    case 0xd1: return r.i16();
    case 0xd2: return r.i32();
    case 0xd3: return r.i64();
    case 0xd9: return r.str(r.u8());
    case 0xda: return r.str(r.u16());
    case 0xdb: return r.str(r.u32());
    case 0xdc: return decodeArray(r, r.u16());
    case 0xdd: return decodeArray(r, r.u32());
    case 0xde: return decodeMap(r, r.u16());
    case 0xdf: return decodeMap(r, r.u32());
    default:
      throw new Error('msgpack: unsupported tag 0x' + tag.toString(16));
  }
}

function decodeArray(r, n) {
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = decodeValue(r);
  return arr;
}

function decodeMap(r, n) {
  const obj = {};
  for (let i = 0; i < n; i++) {
    const key = decodeValue(r);
    const value = decodeValue(r);
    obj[key] = value;
  }
  return obj;
}

function decode(buffer) {
  return decodeValue(new Reader(buffer));
}

module.exports = { decode };
