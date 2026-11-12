/** Best-effort feedback. Call synchronously within a pointer/user gesture.
 * Safari's native switch has fixed feedback, not configurable intensity.
 * WebKit fc1ef83 blocks programmatic label clicks in newer releases; this
 * fallback is only best-effort for older engines, never a support guarantee.
 */
export function createHaptics(isEnabled, nav = navigator, doc = document) {
  let label;
  function pulse(ms) {
    if (!isEnabled()) return;
    try {
      if (typeof nav.vibrate === 'function') { nav.vibrate(ms); return; }
      if (!doc?.body) return;
      if (!label) {
        label = doc.createElement('label');
        label.setAttribute('aria-hidden', 'true');
        label.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0;pointer-events:none';
        const input = doc.createElement('input');
        input.type = 'checkbox';
        input.setAttribute('switch', '');
        input.tabIndex = -1;
        label.appendChild(input);
        doc.body.appendChild(label);
      }
      // No timer: Safari may reject activation outside the original gesture.
      label.click();
    } catch { /* Unsupported feedback must never interrupt a move. */ }
  }
  return { pickup: () => pulse(8), merge: () => pulse(24), order: () => pulse(32) };
}
