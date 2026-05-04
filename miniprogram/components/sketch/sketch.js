Component({
  options: { multipleSlots: false, addGlobalClass: false },
  properties: {
    intensity: { type: String, value: 'normal' }, // normal | subdued
  },
  data: {
    streaks: [
      { top: '12%', left: '-10%', width: '70%', height: '32rpx', bg: 'rgba(230,0,34,0.85)', op: 0.7, dur: '5.5s', delay: '0s' },
      { top: '34%', right: '-20%', width: '60%', height: '20rpx', bg: 'rgba(250,250,243,0.18)', op: 0.6, dur: '7.5s', delay: '1.4s' },
      { top: '70%', left: '-15%', width: '55%', height: '12rpx', bg: 'rgba(230,0,34,0.55)', op: 0.45, dur: '6.5s', delay: '2.6s' },
    ],
    stars: [
      { top: '18%', right: '12%', size: '54rpx', op: 0.45 },
      { top: '46%', left: '7%', size: '40rpx', op: 0.32 },
      { top: '74%', right: '18%', size: '60rpx', op: 0.28 },
    ],
  },
});
