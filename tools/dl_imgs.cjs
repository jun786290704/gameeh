const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const IMGS = {
  'hero_0.png':'https://aka.doubaocdn.com/s/zVJE2DBzsQ',
  'hero_1.png':'https://aka.doubaocdn.com/s/mOR0jsIt6w',
  'hero_2.png':'https://aka.doubaocdn.com/s/WMhczI0Uhs',
  'hero_3.png':'https://aka.doubaocdn.com/s/VuBifrtsnr',
  'hero_4.png':'https://aka.doubaocdn.com/s/OQCPmb7N9C',
  'mon_0.png':'https://aka.doubaocdn.com/s/bY24ULVKV4',
  'mon_1.png':'https://aka.doubaocdn.com/s/MWoFaUcelm',
  'mon_2.png':'https://aka.doubaocdn.com/s/SxyClWUfYF',
  'mon_3.png':'https://aka.doubaocdn.com/s/jga8ssk1UV',
  'mon_4.png':'https://aka.doubaocdn.com/s/TwxN2XCGLZ',
  'mon_5.png':'https://aka.doubaocdn.com/s/K02WXENjRR',
  'mon_6.png':'https://aka.doubaocdn.com/s/l7IVxGUodn',
  'mon_7.png':'https://aka.doubaocdn.com/s/idBiYfo9cK',
  'mon_8.png':'https://aka.doubaocdn.com/s/WAHZwGXWLo',
  'mon_9.png':'https://aka.doubaocdn.com/s/ya6MtcRGwk'
};

function dl(url, dest){
  return new Promise((resolve, reject)=>{
    const req = https.get(url, {headers:{'User-Agent':'Mozilla/5.0'}}, res=>{
      if(res.statusCode >= 300 && res.statusCode < 400 && res.headers.location){
        dl(res.headers.location, dest).then(resolve).catch(reject); return;
      }
      if(res.statusCode !== 200){ reject(new Error('HTTP '+res.statusCode+' '+url)); res.resume(); return; }
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', ()=>ws.close(()=>resolve(fs.statSync(dest).size)));
      ws.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60000, ()=>{ req.destroy(new Error('timeout '+url)); });
  });
}

(async ()=>{
  const dir = 'M:/ElementHeroes_Contracts/indexfrontend/img';
  fs.mkdirSync(dir, {recursive:true});
  const tasks = Object.entries(IMGS).map(async ([name, url])=>{
    const dest = path.join(dir, name);
    try{
      const size = await dl(url, dest);
      console.log(name, size, 'bytes');
    }catch(e){ console.log(name, 'FAIL', String(e).slice(0,80)); }
  });
  await Promise.all(tasks);
  console.log('DONE');
})();
