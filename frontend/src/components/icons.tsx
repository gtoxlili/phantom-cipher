// Inline SVG ports of the four Phosphor icons used by the app.
// Phosphor's React package isn't framework-agnostic, so rather than
// pull in a new dep we ship just the glyphs we actually use, copied
// verbatim from @phosphor-icons/react's "fill" / "bold" defs. Every
// icon shares the 256×256 viewBox and inherits color via currentColor.

import { mergeProps, splitProps, type JSX } from 'solid-js';

type Weight = 'fill' | 'bold' | 'regular';

interface IconProps extends Omit<JSX.SvgSVGAttributes<SVGSVGElement>, 'size'> {
  /** Phosphor "fill" or "bold" weight selector. */
  weight?: Weight;
  /** Pass any CSS length — '1em', '24px', etc. Defaults to '1em'. */
  size?: string | number;
}

// 用 splitProps 把 weight/size 从 props 中拆出来再用 getter 引用
// props.size——这样维持 Solid 反应式语义（直接 `const { size } = props`
// 会冻结成首次渲染的值，是官方文档明确点名的反例）。当下所有调用处
// 传的都是静态字面量，行为不变；改正是为了未来万一传 signal 时也对。
function svgProps(props: IconProps) {
  const [, rest] = splitProps(props, ['weight', 'size']);
  return mergeProps(
    {
      xmlns: 'http://www.w3.org/2000/svg',
      get width() {
        return props.size ?? '1em';
      },
      get height() {
        return props.size ?? '1em';
      },
      fill: 'currentColor',
      viewBox: '0 0 256 256',
    },
    rest,
  ) as JSX.SvgSVGAttributes<SVGSVGElement>;
}

/** Solid triangle pointing right. */
export function PlayIcon(props: IconProps) {
  // Only "fill" is used by the app; falls back to fill for any other weight.
  return (
    <svg {...svgProps(props)}>
      <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
    </svg>
  );
}

/** Bold left-pointing arrow. */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z" />
    </svg>
  );
}

/** Filled four-pointed sparkle with two small crosses. */
export function SparkleIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94L146,178l-19,51.62a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88L78,110l19-51.62a15.92,15.92,0,0,1,29.88,0L146,110l51.62,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z" />
    </svg>
  );
}

/** Bold checkmark. */
export function CheckIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z" />
    </svg>
  );
}
