// Controlled university source discovery. Run from Supabase Cron with SYNC_MASTER_TOKEN.
// Does not bypass access controls, CAPTCHA or robots rules. Only configured official sources.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SOURCES = [
  { school:'Đại học Ngoại thương (FTU)', host:'sdh.ftu.edu.vn', index:'https://sdh.ftu.edu.vn/tuyen-sinh/tuyen-sinh-trinh-do-thac-si-tuyen-sinh/' },
];
function decode(s:string){return s.replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_m,n)=>String.fromCharCode(Number(n))).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();}
function anchors(html:string,root:string,host:string){const seen=new Set<string>();const results:{title:string,url:string}[]=[];const re=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;for(const m of html.matchAll(re)){let url:URL;try{url=new URL(m[1],root);}catch{continue;}if(url.protocol!=='https:'||url.hostname!==host||seen.has(url.href))continue;const title=decode(m[2]);if(title.length<22||title.length>240)continue;if(!/thạc sĩ|thac si/i.test(title))continue;if(!/tuyển sinh|xét tuyển|đăng ký|nhận hồ sơ/i.test(title))continue;seen.add(url.href);results.push({title,url:url.href});}return results.slice(0,40);}
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const expected=Deno.env.get('SYNC_MASTER_TOKEN');if(!expected||req.headers.get('x-sync-token')!==expected)return new Response('Unauthorized',{status:401});
 const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return new Response('Server setup incomplete',{status:500});
 const db=createClient(url,key);const report=[];
 for(const source of SOURCES){try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  let response:Response;try{response=await fetch(source.index,{signal:controller.signal,headers:{'User-Agent':'LogiCuong Admissions Monitor (official-source links; contact site administrator for opt-out)'}});}finally{clearTimeout(timer);}
  if(!response.ok)throw Error('HTTP '+response.status);
  const html=await response.text();if(html.length>2_000_000)throw Error('Page too large');
  const found=anchors(html,source.index,source.host);
  const rows=found.map(n=>({school:source.school,title:n.title,source_url:n.url,summary:'Thông báo trên trang chính thức của trường; kiểm tra nội dung và hạn nhận hồ sơ tại bài gốc.',verified:false}));
  // Upsert by link; never overwrite manually verified deadlines or metadata.
  let added=0;for(const item of rows){const {error}=await db.from('master_notices').upsert(item,{onConflict:'source_url',ignoreDuplicates:true});if(error)throw error;added++;}
  report.push({school:source.school,discovered:found.length,processed:added});
 }catch(e){report.push({school:source.school,error:String(e)});}}
 return new Response(JSON.stringify({ok:true,report,checked_at:new Date().toISOString()}),{headers:{'Content-Type':'application/json'}});
});
