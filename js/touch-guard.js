// Native gesture events are used by Safari even when viewport scaling is disabled.
for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, e => e.preventDefault(), {passive:false});
let last = null;
document.addEventListener('touchend', e => {
  if (e.changedTouches.length !== 1 || e.touches.length) { last=null; return; }
  const t=e.changedTouches[0], now=performance.now();
  if (last && now-last.time<300 && Math.hypot(t.clientX-last.x,t.clientY-last.y)<24 && e.target===last.target) {
    if(e.cancelable) e.preventDefault();
    // Keep delegated div clicks (story, bag) as well as buttons; board taps use pointerup.
    if (!e.target.closest('#board')) e.target.click?.();
    last=null;
  } else last={time:now,x:t.clientX,y:t.clientY,target:e.target};
}, {passive:false});
document.addEventListener('touchmove', e => { if(e.touches.length>1 && e.cancelable) e.preventDefault(); }, {passive:false});
