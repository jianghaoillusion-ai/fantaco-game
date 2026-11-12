/** Selection brackets, merge/spawn pop, fly-to-order, discovery card, coin pops. */

export function createFx(ctx) {
  const { $, toast, sfx } = ctx;

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animate(el, frames, duration, done) {
    const animation = el.animate(reduced() ? [{opacity: .6}, {opacity: 1}] : frames,
      {duration: reduced() ? 80 : duration, easing: 'linear'});
    animation.finished.catch(() => {}).then(() => done?.());
    return animation;
  }
  function snapshot(el) {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const image = el.querySelector('img');
    return {rect, image: image?.cloneNode(true)};
  }
  function ghostAt(s) {
    if (!s?.image) return null;
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = `position:fixed;pointer-events:none;z-index:90;left:0;top:0;width:${s.rect.width}px;height:${s.rect.height}px;will-change:transform,opacity`;
    s.image.style.cssText = 'width:100%;height:100%;object-fit:contain';
    el.append(s.image);document.body.append(el);
    return el;
  }
  function flyTo(fromEl, toEl, done) {
    const s = snapshot(fromEl), b = toEl?.getBoundingClientRect();
    const ghost = ghostAt(s);
    if (!ghost || !b) { ghost?.remove();done?.();return; }
    const a=s.rect, dx=b.left+b.width/2-a.width/2, dy=b.top+b.height/2-a.height/2;
    const frames=Array.from({length:21},(_,i)=>{
      const t=i/20, p=1-(1-t)**2;
      return {transform:`translate3d(${a.left+(dx-a.left)*p}px,${a.top+(dy-a.top)*p-40*4*t*(1-t)}px,0) scale(${1-.65*t})`,opacity:1-.8*t};
    });
    animate(ghost,frames,360,()=>{ghost.remove();done?.();});
  }
  function popAt(uid) {
    const el=document.querySelector(`.piece[data-uid="${uid}"]`);
    if (!el) return;
    animate(el,[{transform:'scale(.72)'},{transform:'scale(1.16)',offset:.42},
      {transform:'scale(.96)',offset:.72},{transform:'scale(1)'}],280);
  }
  function revealMerge(uid) {
    const el=document.querySelector(`.piece[data-uid="${uid}"]`);
    if (!el) return;
    animate(el,[{transform:'scale(.55)',opacity:.3},{transform:'scale(1.22)',opacity:1,offset:.4},
      {transform:'scale(.95)',opacity:1,offset:.7},{transform:'scale(1)',opacity:1}],320);
    if (reduced()) return;
    const r=el.getBoundingClientRect();
    for(let i=0;i<8;i++) {
      const dot=document.createElement('i'),a=i*Math.PI/4;
      dot.style.cssText=`position:fixed;pointer-events:none;z-index:91;left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;width:6px;height:6px;border-radius:50%;background:${i%2?'#fff4b8':'#ffd365'}`;
      document.body.append(dot);
      animate(dot,[{transform:'translate(-3px,-3px) scale(.3)',opacity:1},
        {transform:`translate(${Math.cos(a)*32}px,${Math.sin(a)*32}px) scale(1)`,opacity:.8,offset:.5},
        {transform:`translate(${Math.cos(a)*42}px,${Math.sin(a)*42+10}px) scale(.1)`,opacity:0}],400,()=>dot.remove());
    }
  }
  function captureMerge(fromEl,toEl) {return [snapshot(fromEl),snapshot(toEl)];}
  function mergeInto(snapshots,uid) {
    const el=document.querySelector(`.piece[data-uid="${uid}"]`);
    if (!el) return;
    if (!snapshots?.every(Boolean) || reduced()) {revealMerge(uid);return;}
    const target=el.getBoundingClientRect();
    el.style.opacity='0';let pending=2;
    const done=()=>{if(--pending===0){el.style.opacity='';revealMerge(uid);}};
    snapshots.forEach(s=>{
      const ghost=ghostAt(s);if(!ghost){done();return;}
      const a=s.rect,x=target.left+target.width/2-a.width/2,y=target.top+target.height/2-a.height/2;
      const animation=ghost.animate([
        {transform:`translate3d(${a.left}px,${a.top}px,0) scale(1)`,opacity:1},
        {transform:`translate3d(${x}px,${y}px,0) scale(.65)`,opacity:.3}
      ],{duration:100,easing:'cubic-bezier(.4,0,1,1)'});
      animation.finished.catch(()=>{}).then(()=>{ghost.remove();done();});
    });
  }
  function spawnArc(fromRect, toEl, done) {
    const item=toEl?.querySelector('.piece');
    const s=snapshot(item),b=toEl?.getBoundingClientRect();
    if (!s || !fromRect || !b) {done?.();return;}
    const ghost=ghostAt(s);if(!ghost){done?.();return;}
    const a=fromRect,x0=a.left+a.width/2-s.rect.width/2,y0=a.top+a.height/2-s.rect.height/2;
    const x1=b.left+b.width/2-s.rect.width/2,y1=b.top+b.height/2-s.rect.height/2;
    item.style.opacity='0';
    const frames=Array.from({length:21},(_,i)=>{
      const t=i/20;
      return {transform:`translate3d(${x0+(x1-x0)*t}px,${y0+(y1-y0)*t-36*4*t*(1-t)}px,0) scale(${.55+.45*Math.min(1,t*3)})`,opacity:1};
    });
    animate(ghost,frames,260,()=>{ghost.remove();item.style.opacity='';done?.();});
  }

  function bounceCell(el) {
    if (!el) return;
    el.classList.remove("cell-bounce", "bad");
    void el.offsetWidth;
    el.classList.add("cell-bounce", "bad");
    setTimeout(() => el.classList.remove("cell-bounce", "bad"), 280);
  }

  function coinPop(target, text) {
    const el = document.createElement("div");
    el.className = "coin-pop";
    el.textContent = text;
    const r = (target || $("#play"))?.getBoundingClientRect?.() || { left: innerWidth / 2, top: 120, width: 0 };
    el.style.left = (r.left + r.width / 2) + "px";
    el.style.top = (r.top + 8) + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function showDiscover(item) {
    const name = ctx.infoName(item);
    const img = ctx.infoImg(item);
    const box = $("#discover");
    if (!box) {
      toast(`新發現：${name}　＋1 星星種子`);
      return;
    }
    $("#discover-img").src = img;
    $("#discover-img").alt = name;
    $("#discover-name").textContent = "新發現：" + name;
    const tier = item.tier ? `第 ${item.tier} 階` : "";
    $("#discover-sub").textContent = `${tier}　已記進魔法書　＋1 星星種子`.trim();
    box.classList.add("on");
  }

  function showInfo(item) {
    const bar = $("#item-info");
    if (!bar) return;
    bar.hidden = false;
    const thumb = $("#info-thumb");
    if (!item) {
      bar.classList.add("empty");
      bar.hidden = true;
      $("#info-name").textContent = "";
      $("#info-hint").textContent = "";
      const chainBox = $("#info-chain");
      if (chainBox) { chainBox.hidden = true; chainBox.innerHTML = ""; }
      if ($("#btn-sell")) { $("#btn-sell").disabled = true; $("#btn-sell").textContent = "出售"; }
      if (thumb) { thumb.hidden = true; thumb.removeAttribute("src"); }
      return;
    }
    bar.hidden = false;
    bar.classList.remove("empty");
    $("#info-name").textContent = ctx.infoName(item);
    const src = ctx.infoImg?.(item);
    if (thumb) {
      if (src) { thumb.src = src; thumb.hidden = false; }
      else { thumb.hidden = true; thumb.removeAttribute("src"); }
    }
    const hint = $("#info-hint");
    const chainBox = $("#info-chain");
    const chain = item.kind === "item" ? (ctx.chainPreview?.(item.chain, item.tier) || []) : [];
    if (chainBox) {
      chainBox.hidden = !chain.length;
      chainBox.innerHTML = chain.map((it) => `<img class="${it.current ? "now" : ""}" src="${it.img || ""}" alt="">`).join("");
    }
    if (item.kind === "gen") {
      const cool = item.coolUntil && item.coolUntil > Date.now();
      if (hint) hint.textContent = cool ? "休息中" : "";
      if ($("#btn-sell")) { $("#btn-sell").disabled = true; $("#btn-sell").textContent = "出售"; }
    } else {
      const retired = ctx.isRetired?.(item);
      const offer = retired ? ctx.recycleOffer(item) : null;
      if (hint) hint.textContent = retired ? `此系列已退役：棋盤與背包共 ${offer.count} 件，回收得 ${offer.coins} 金幣` : "";
      if ($("#btn-sell")) { $("#btn-sell").disabled = false; $("#btn-sell").textContent = retired ? "回收此系列" : "出售"; }
    }
  }

  function celebrateRestore(name, anchor) {
    const layer = document.createElement("div");
    layer.className = "restore-fx";
    layer.innerHTML = `<div class="restore-burst" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <b>修好了！</b><span>${name}</span>`;
    document.body.appendChild(layer);
    coinPop(anchor || $("#map") || document.body, "修好了");
    setTimeout(() => layer.remove(), 1800);
  }

  function flyCoins(fromEl, toEl, done) {
    const a = (fromEl instanceof Element ? fromEl.getBoundingClientRect() : null)
      || { left: innerWidth * 0.5, top: innerHeight * 0.45, width: 0, height: 0 };
    const badge = toEl instanceof Element ? toEl : document.querySelector("#play .lv-badge, [data-xp-tip], .lv-badge");
    const b = badge?.getBoundingClientRect?.()
      || { left: 24, top: 24, width: 32, height: 32 };
    const x0 = a.left + a.width / 2;
    const y0 = a.top + a.height / 2;
    const x1 = b.left + b.width * 0.22;
    const y1 = b.top + b.height / 2;
    const n = 6;
    let left = n;
    for (let i = 0; i < n; i++) {
      const img = document.createElement("img");
      img.src = "assets/ui/coin.png";
      img.alt = "";
      img.className = "fly-coin";
      img.style.left = x0 + "px";
      img.style.top = y0 + "px";
      document.body.appendChild(img);
      const spread = (i - (n - 1) / 2) * 36;
      const midX = (x0 + x1) / 2 + spread;
      const midY = Math.min(y0, y1) - 70 - (i % 3) * 18;
      const delay = i * 55;
      const anim = img.animate([
        { transform: "translate(-50%,-50%) scale(.35) rotate(0deg)", opacity: 0.9, offset: 0 },
        { transform: `translate(${midX - x0 - 0}px, ${midY - y0}px) scale(1) rotate(180deg)`, opacity: 1, offset: 0.48 },
        { transform: `translate(${x1 - x0}px, ${y1 - y0}px) scale(.45) rotate(360deg)`, opacity: 1, offset: 1 }
      ], { duration: 680, delay, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" });
      anim.onfinish = () => {
        img.remove();
        left -= 1;
        if (left <= 0) {
          if (badge) {
            badge.classList.remove("lv-spin");
            void badge.offsetWidth;
            badge.classList.add("lv-spin");
            setTimeout(() => badge.classList.remove("lv-spin"), 700);
          }
          done?.();
        }
      };
    }
  }


  const REWARD_ICON = {
    coins: "assets/ui/coin.png",
    diamonds: "assets/ui/diamond.png",
    energy: "assets/icons/energy.png",
    seeds: "assets/items/star-seed.png",
    stars: "assets/items/star-seed.png"
  };
  const REWARD_TARGET = {
    coins: "#play .lv-badge, [data-xp-tip], .lv-badge",
    diamonds: "#play .pill.diamonds, .pill.diamonds",
    energy: "#play .pill.energy, .pill.energy",
    seeds: "#play .pill.seeds, .pill.seeds",
    stars: "#play .pill.seeds, .pill.seeds"
  };

  function hudEl(kind) {
    return document.querySelector(REWARD_TARGET[kind] || REWARD_TARGET.coins);
  }

  function pulseHud(el) {
    if (!el) return;
    el.classList.remove("hud-bump");
    void el.offsetWidth;
    el.classList.add("hud-bump");
    setTimeout(() => el.classList.remove("hud-bump"), 420);
  }

  /** Burst of spinning, twinkling icons that stagger into a HUD counter. */
  function flyKind(kind, fromEl, count, onArrive, done) {
    const icon = REWARD_ICON[kind];
    if (!icon || !count) { done?.(); return; }
    const n = Math.max(3, Math.min(8, 2 + Math.ceil(Math.abs(count) / 4)));
    const a = (fromEl instanceof Element ? fromEl.getBoundingClientRect() : null)
      || { left: innerWidth * 0.5, top: innerHeight * 0.45, width: 0, height: 0 };
    const target = hudEl(kind);
    const b = target?.getBoundingClientRect?.() || { left: 24, top: 24, width: 32, height: 32 };
    const x0 = a.left + a.width / 2;
    const y0 = a.top + a.height / 2;
    const x1 = b.left + b.width / 2;
    const y1 = b.top + b.height / 2;
    let left = n;
    for (let i = 0; i < n; i++) {
      const img = document.createElement("img");
      img.src = icon;
      img.alt = "";
      img.className = "fly-reward twinkle";
      img.style.left = x0 + "px";
      img.style.top = y0 + "px";
      document.body.appendChild(img);
      const spread = (i - (n - 1) / 2) * 42;
      const midX = (x0 + x1) / 2 + spread;
      const midY = Math.min(y0, y1) - 60 - (i % 3) * 16;
      const delay = i * 55;
      const anim = img.animate([
        { transform: "translate(-50%,-50%) scale(.4) rotate(0deg)", opacity: 0.95, offset: 0 },
        { transform: `translate(${midX - x0}px, ${midY - y0}px) scale(1.15) rotate(180deg)`, opacity: 1, offset: 0.42 },
        { transform: `translate(${x1 - x0}px, ${y1 - y0}px) scale(.4) rotate(360deg)`, opacity: 1, offset: 1 }
      ], { duration: 620, delay, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" });
      anim.onfinish = () => {
        img.remove();
        sfx?.chime?.();
        pulseHud(target);
        onArrive?.();
        left -= 1;
        if (left <= 0) done?.();
      };
    }
  }

  function flyRewards(bundle, fromEl, done) {
    const kinds = ["coins", "diamonds", "energy", "seeds", "stars"].filter((k) => (bundle?.[k] || 0) > 0);
    if (!kinds.length) { done?.(); return; }
    let pending = kinds.length;
    const next = () => { pending -= 1; if (pending <= 0) done?.(); };
    kinds.forEach((k, i) => {
      setTimeout(() => flyKind(k, fromEl, bundle[k], null, next), i * 80);
    });
  }

  // Keep the old name as a coins-only wrapper so existing calls still work.
  const _flyCoins = flyCoins;
  function flyCoinsWrap(fromEl, toEl, done) {
    flyKind("coins", fromEl, 8, () => {
      const badge = toEl instanceof Element ? toEl : hudEl("coins");
      if (badge) {
        badge.classList.remove("lv-spin");
        void badge.offsetWidth;
        badge.classList.add("lv-spin");
        setTimeout(() => badge.classList.remove("lv-spin"), 700);
      }
    }, done);
  }

  function showDiscover(item) {
    const name = ctx.infoName(item);
    const imgSrc = ctx.infoImg(item);
    sfx?.discover?.();
    let layer = document.getElementById("discover-fx");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "discover-fx";
      layer.className = "discover-fx";
      document.body.appendChild(layer);
    }
    const toEl = document.querySelector(`.piece[data-uid="${item.uid}"]`)
      || document.getElementById("btn-book")
      || document.querySelector(".pill.seeds");
    layer.innerHTML = `<div class="discover-stage">
      <span class="discover-rays" aria-hidden="true"></span>
      <img class="discover-item" src="${imgSrc}" alt="">
      <span class="discover-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
      <b class="discover-title">發現新物品！</b>
    </div>`;
    layer.classList.add("on");
    const skip = () => close(true);
    layer.onclick = skip;
    let closed = false;
    function close(fromTap) {
      if (closed) return;
      closed = true;
      layer.onclick = null;
      const icon = layer.querySelector(".discover-item");
      const title = layer.querySelector(".discover-title");
      if (title) title.style.opacity = "0";
      if (icon && toEl) {
        const a = icon.getBoundingClientRect();
        const b = toEl.getBoundingClientRect();
        icon.style.transition = "transform .45s cubic-bezier(.22,.61,.36,1), opacity .45s";
        icon.style.transform = `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.2)`;
        icon.style.opacity = "0.3";
        setTimeout(() => { layer.classList.remove("on"); layer.innerHTML = ""; }, 460);
      } else {
        layer.classList.remove("on");
        layer.innerHTML = "";
      }
    }
    setTimeout(() => close(false), 1500);
  }


  /** Glow, then shrink/fade a completed order or task card. Caller should fly rewards first. */
  function completeTask(el, done) {
    if (!el || !el.isConnected) { done?.(); return; }
    el.classList.add("task-glow");
    const leave = () => {
      el.classList.add("task-leave");
      setTimeout(() => {
        try { el.remove(); } catch {}
        done?.();
      }, 560);
    };
    if (el.classList.contains("task-glow") && el.dataset.glowed) leave();
    else {
      el.dataset.glowed = "1";
      setTimeout(leave, 260);
    }
  }

  return { captureMerge, mergeInto, flyTo, flyCoins: flyCoinsWrap, flyRewards, flyKind, popAt, revealMerge, spawnArc, bounceCell, coinPop, showDiscover, showInfo, celebrateRestore, pulseHud, completeTask };

}
