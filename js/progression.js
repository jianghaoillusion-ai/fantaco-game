/** Content access is based on producers the player can actually use, never discovery alone. */
const chapters = ['village', 'journey', 'candy', 'bulu', 'hate', 'ending'];
export function retiredChains(save, chains, story) {
  // Keep the latest owned producer era active for endless play after the final story.
  const latest = Math.max(0, ...[...(save.board || []), ...(save.inventory || [])]
    .filter(c => c?.kind === 'gen').map(c => chapters.indexOf(chains[c.gen]?.chapter)));
  const cutoff = Math.min(chapters.indexOf(save.chapter), latest);
  return Object.keys(chains).filter(id => id === 'goods' || (
    chapters.indexOf(chains[id].chapter) < cutoff &&
    !story.some(o => o.need.chain === id && !save.storyDone.includes(o.flag || o.id))
  ));
}
export function availableChains(save, gens, retired = []) {
  const cells = [...(save.board || []), ...(save.inventory || [])];
  const ids = new Set();
  for (const c of cells) if (c?.kind === 'gen') {
    if (gens[c.gen]) ids.add(gens[c.gen].produces);
    if (c.gen === 'garden' && c.tier >= 2) ids.add('tea');
  }
  return [...ids].filter(id => !retired.includes(id) && id !== 'goods');
}
export function saleValue(item) { return item.tier <= 1 ? 1 : item.tier * 2; }
export function queueGenerator(save, id, tier, gens, isOpen, uid) {
  const owned = [...save.board, ...save.inventory].some(c => c?.kind === 'gen' && c.gen === id);
  save.pendingGenerators ||= [];
  if (owned || save.pendingGenerators.some(c => c.gen === id)) return false;
  const cell = {kind:'gen', gen:id, tier, uid};
  if (gens[id]?.autoMs) { cell.autoMs=gens[id].autoMs; cell.coolUntil=Date.now()+cell.autoMs; }
  const empty=save.board.map((c,i)=>!c && isOpen(i)?i:-1).filter(i=>i>=0);
  if(empty.length>=3) save.board[empty[0]]=cell;
  else save.pendingGenerators.push(cell);
  return true;
}
export function claimGenerators(save, isOpen) {
  let count=0;
  while(save.pendingGenerators?.length) {
    const empty=save.board.map((c,i)=>!c && isOpen(i)?i:-1).filter(i=>i>=0);
    if(empty.length<3) break;
    save.board[empty[0]]=save.pendingGenerators.shift();count++;
  }
  return count;
}

export function recycleOffer(save, chain, isOpen) {
  const targets=[];
  for (const [where,cells] of [['board',save.board],['inv',save.inventory]]) {
    cells.forEach((item,i)=>{
      if(item?.kind==='item' && item.chain===chain && (where==='inv'||isOpen(i))) targets.push({where,i,item});
    });
  }
  return {targets, count:targets.length, coins:targets.reduce((n,t)=>n+saleValue(t.item),0)};
}
