import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: false, // we ship our own globals
  jsxFramework: 'react',
  outdir: 'styled-system',
  include: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  exclude: [],

  theme: {
    extend: {
      tokens: {
        colors: {
          ink: { value: '#0a0a0a' },
          inkSoft: { value: '#131313' },
          inkMid: { value: '#2a1416' },
          blood: { value: '#e60022' },
          bloodBright: { value: '#ff1a3d' },
          bloodSoft: { value: '#c8001e' },
          bloodDeep: { value: '#800014' },
          paper: { value: '#fafaf3' },
          bone: { value: '#ece5cf' },
          boneDim: { value: '#d8cfb3' },
          gold: { value: '#ffd200' },
          gray: { value: '#555555' },
          graySoft: { value: '#888888' },
        },
        fonts: {
          display: { value: 'var(--font-display), "Bebas Neue", sans-serif' },
          condensed: { value: 'var(--font-condensed), "Oswald", sans-serif' },
          body: { value: 'var(--font-body), "Inter", -apple-system, sans-serif' },
          cn: { value: 'var(--font-cn), "Noto Sans SC", "PingFang SC", sans-serif' },
        },
      },

      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slamIn: {
          '0%': { opacity: '0', transform: 'translateX(-30px) skewX(-12deg) scale(1.04)' },
          '60%': { opacity: '1', transform: 'translateX(4px) skewX(-8deg) scale(1)' },
          '100%': { transform: 'translateX(0) skewX(-8deg) scale(1)' },
        },
        streakIn: {
          from: { transform: 'translateX(-110%) skewX(-22deg)', opacity: '0' },
          to: { transform: 'translateX(0) skewX(-22deg)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '20%': { transform: 'translate(-3px, 1px) rotate(-0.6deg)' },
          '40%': { transform: 'translate(3px, -1px) rotate(0.6deg)' },
          '60%': { transform: 'translate(-2px, 2px) rotate(-0.4deg)' },
          '80%': { transform: 'translate(2px, -1px) rotate(0.4deg)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(230, 0, 34, 0.55)' },
          '50%': { boxShadow: '0 0 0 6px rgba(230, 0, 34, 0)' },
        },
        blink: {
          '0%, 50%, 100%': { opacity: '1' },
          '25%, 75%': { opacity: '0.45' },
        },
        burst: {
          '0%': { transform: 'scale(0.5) rotate(-10deg)', opacity: '0' },
          '60%': { transform: 'scale(1.15) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(-3deg)', opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        streakRun: {
          '0%': { transform: 'translateX(0) skewX(-22deg)', opacity: '0' },
          '20%': { opacity: '0.8' },
          '100%': { transform: 'translateX(220vw) skewX(-22deg)', opacity: '0' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        tileIn: {
          '0%': { opacity: '0', transform: 'rotate(-12deg) translateY(20px) scale(0.85)' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'rotate(-2deg) translateY(0) scale(1)' },
        },
        pendingHover: {
          '0%, 100%': { transform: 'rotate(-1deg) translateY(-12px)' },
          '50%': { transform: 'rotate(1deg) translateY(-16px)' },
        },
        selectedShimmer: {
          '0%, 100%': { filter: 'drop-shadow(0 0 0 rgba(230, 0, 34, 0))' },
          '50%': { filter: 'drop-shadow(0 0 12px rgba(230, 0, 34, 0.85))' },
        },
        flashCorrect: {
          '0%': { transform: 'rotate(-2deg) scale(1)', filter: 'drop-shadow(0 0 0 rgba(255,210,0,0))' },
          '20%': { transform: 'rotate(0deg) scale(1.2)', filter: 'drop-shadow(0 0 18px rgba(255,210,0,1))' },
          '60%': { transform: 'rotate(-3deg) scale(1.05)' },
          '100%': { transform: 'rotate(-2deg) scale(1)', filter: 'drop-shadow(0 0 0 rgba(255,210,0,0))' },
        },
        flashWrong: {
          '0%, 100%': { transform: 'rotate(-2deg) translateX(0)' },
          '15%': { transform: 'rotate(2deg) translateX(-5px)' },
          '30%': { transform: 'rotate(-3deg) translateX(5px)' },
          '45%': { transform: 'rotate(2deg) translateX(-3px)' },
          '60%': { transform: 'rotate(-2deg) translateX(3px)' },
        },
        deckPulse: {
          '0%, 100%': { transform: 'rotate(-3deg) scale(1)', filter: 'drop-shadow(0 0 0 rgba(230,0,34,0))' },
          '50%': { transform: 'rotate(2deg) scale(1.05)', filter: 'drop-shadow(0 0 12px rgba(230,0,34,0.85))' },
        },
        fadeOutDelayed: {
          '0%, 70%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        revealOverlayFade: {
          '0%': { background: 'rgba(10, 10, 10, 0)' },
          '20%': { background: 'rgba(10, 10, 10, 0.55)' },
          '100%': { background: 'rgba(10, 10, 10, 0)' },
        },
      },
    },
  },
});
