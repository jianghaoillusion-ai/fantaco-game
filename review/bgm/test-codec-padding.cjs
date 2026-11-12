const {chromium}=require('playwright');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8938/review/bgm/loop-test.html');
 const scores=JSON.parse(fs.readFileSync(__dirname+'/scores-bgm3.json'));
 const rows=await page.evaluate(async scores=>{
  const {prepareLoopBuffer}=await import('../../js/audio.js?v=bgm3r2');const rows=[];
  for(const rate of [48000,44100])for(const song of scores){
   const c=new OfflineAudioContext(2,1,rate),raw=await c.decodeAudioData(await(await fetch('../../assets/audio/bgm-'+song.id+'.mp3')).arrayBuffer());
   for(const delay of [529,1105,2257]){
    const padded=c.createBuffer(2,raw.length+delay,rate);for(let ch=0;ch<2;ch++)padded.copyToChannel(raw.getChannelData(ch),ch,delay);
    const frames=Math.round(song.samples/48000*rate),guard=Math.round(.192*rate),p=prepareLoopBuffer(padded,frames,guard,c);
    let error=0,power=0,count=0;const q=p.codecOrigin,w=Math.round(rate*.002);
    for(let ch=0;ch<2;ch++){const x=padded.getChannelData(ch);for(let k=0;k<w;k++){error+=(x[q+k]-x[q+frames+k])**2;power+=x[q+k]**2;count++}}
    const relative_rmse=Math.sqrt(error/Math.max(power,1e-12)),absolute_rmse=Math.sqrt(error/count);
    rows.push({id:song.id,rate,leading_zero_samples:delay,relative_rmse,absolute_rmse,accepted:relative_rmse<=.25&&absolute_rmse<=.025});
   }
  }return rows;
 },scores);
 fs.writeFileSync(__dirname+'/padding-bgm3.json',JSON.stringify({synthetic_delay_on_real_mp3:true,not_safari_hardware:true,rows},null,2)+'\n');
 console.log(JSON.stringify({cases:rows.length,accepted:rows.filter(r=>r.accepted).length,rejected:rows.filter(r=>!r.accepted)}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
