/** Wires map, shop, fog, orders UI and fx so app.js only needs a thin hook. */
import { createFog, GEN_POPS, GEN_COOL_MS } from "./fog.js?v=15";
import { createFx } from "./fx.js?v=15";
import { createShop } from "./shop.js?v=15";
import { createBag } from "./bag.js?v=15";
import { createOrdersUi } from "./orders-ui.js?v=15";
import { createMap } from "./map.js?v=15";
import { createAds } from "./ads.js?v=15";
import { nearbyEmpty } from "./merge.js?v=15";

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

  ctx.emptyOpenCell = () => nearbyEmpty(ctx.getSave().board, ctx.getCols(), ctx.getRows(), -1, fog.isOpenIndex);

  function bind() {
    bag.bind();
    shop.bind();
    map.bind();
    ads.bind();
  }

  return { fx, fog, shop, bag, orders, map, ads, bind, GEN_POPS, GEN_COOL_MS };
}
