/** Wires map, shop, fog, orders UI and fx so app.js only needs a thin hook. */
import { createFog, GEN_POPS, GEN_COOL_MS } from "./fog.js?v=mobile3";
import { createFx } from "./fx.js?v=mobile3";
import { createShop } from "./shop.js?v=mobile3";
import { createBag } from "./bag.js?v=25";
import { createOrdersUi } from "./orders-ui.js?v=25";
import { createMap } from "./map.js?v=bgm3r2";
import { createAds } from "./ads.js?v=25";
import { nearbyEmpty } from "./merge.js?v=mobile3";
import { createEvents } from "./events.js";
import { createEventsUi } from "./events-ui.js?v=25";
import { createBoardDrag } from "./drag.js?v=mobile3";

export { GEN_POPS, GEN_COOL_MS };

export function attachSystems(ctx) {
  const fx = createFx(ctx);
  ctx.fx = fx;
  const fog = createFog(ctx);
  ctx.fog = fog;
  const bag = createBag(ctx);
  ctx.bag = bag;
  const shop = createShop(ctx);
  const orders = createOrdersUi(ctx);
  const map = createMap(ctx);
  const ads = createAds(ctx);
  ctx.ads = ads;
  const events = createEvents(ctx);
  ctx.events = events;
  const eventsUi = createEventsUi(ctx);
  ctx.eventsUi = eventsUi;
  const drag = createBoardDrag(ctx);
  ctx.drag = drag;

  ctx.emptyOpenCell = () => nearbyEmpty(ctx.getSave().board, ctx.getCols(), ctx.getRows(), -1, fog.isOpenIndex);

  function bind() {
    bag.bind();
    shop.bind();
    map.bind();
    ads.bind();
    eventsUi.bind();
    drag.bind();
  }

  return { fx, fog, shop, bag, orders, map, ads, events, eventsUi, drag, bind, GEN_POPS, GEN_COOL_MS };
}
