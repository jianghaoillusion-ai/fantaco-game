/** Wires map, shop, fog, orders UI and fx so app.js only needs a thin hook. */
import { createFog, GEN_POPS, GEN_COOL_MS } from "./fog.js";
import { createFx } from "./fx.js";
import { createShop } from "./shop.js";
import { createOrdersUi } from "./orders-ui.js";
import { createMap } from "./map.js";
import { nearbyEmpty } from "./merge.js";

export { GEN_POPS, GEN_COOL_MS };

export function attachSystems(ctx) {
  const fx = createFx(ctx);
  ctx.fx = fx;
  const fog = createFog(ctx);
  const shop = createShop(ctx);
  const orders = createOrdersUi(ctx);
  const map = createMap(ctx);

  ctx.emptyOpenCell = () => nearbyEmpty(ctx.getSave().board, ctx.getCols(), ctx.getRows(), -1, fog.isOpenIndex);

  function bind() {
    shop.bind();
    map.bind();
  }

  return { fx, fog, shop, orders, map, bind, GEN_POPS, GEN_COOL_MS };
}
