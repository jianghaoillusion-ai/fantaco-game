import assert from 'node:assert/strict';
import {createHaptics} from '../../js/haptics.js';
let enabled=true;const pulses=[];
const h=createHaptics(()=>enabled,{vibrate:n=>pulses.push(n)},null);
assert.equal(typeof h.order,'function','delivery feedback must exist');
h.order();enabled=false;h.order();assert.equal(pulses.length,1);
console.log('PASS order haptic and disabled gate');
