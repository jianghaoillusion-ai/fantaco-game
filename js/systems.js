/** Wires map, shop, fog, orders UI and fx so app.js only needs a thin hook. */
import { createFog, GEN_POPS, GEN_COOL_MS } from "./fog.js?v=16";
import { createFx } from "./fx.js?v=16";
import { createShop } from "./shop.js?v=16";
import { createBag } from "./bag.js?v=16";
import { createOrdersUi } from "./orders-ui.js?v=16";
import { createMap } from "./map.js?v=16";
import { createAds } from "./ads.js?v=16";
import { nearbyEmpty } from "./merge.js?v=16";
import { createEvents } from "./events.js";

export { GEN_POPS, GEN_COOL_MS };

export function attachSystems(ctx) {
  const fx = createFx(ctx);
  ctx.fx = fx;
  const fog = createFog(ctx);
  const bag = createBag(ctx);
  ctx.bag = bag;
  const shop = createShop(ctx);
  const orders = createOrdersUi(ctx);
  const map = createMap(ctx);
  const ads = createAds(ctx);
  ctx.ads = ads;
  const events = createEvents(ctx);
  ctx.events = events;

  ctx.emptyOpenCell = () => nearbyEmpty(ctx.getSave().board, ctx.getCols(), ctx.getRows(), -1, fog.isOpenIndex);

  function bind() {
    bag.bind();
    shop.bind();
    map.bind();
    ads.bind();
  }

  return { fx, fog, shop, bag, orders, map, ads, events, bind, GEN_POPS, GEN_COOL_MS };
}
