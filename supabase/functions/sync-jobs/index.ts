// LogiCuong: scheduled ingestion from permitted Remotive public API.
// Deploy with --no-verify-jwt; requests require a private x-cron-secret.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowed = /logistics|supply[ -]?chain|procurement|purchas(?:e|ing)|freight|warehouse|inventory|shipping|fulfillment|fulfilment|transport(?:ation)?|import.?export|sourcing|operations analyst/i;
const skip = /software engineer|frontend|backend|developer|devops|cybersecurity/i;
const plain = (value: unknown, max=3000) => String(value ?? '').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,max);
const json = (body: unknown, code=200) => new Response(JSON.stringify(body), {status:code,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({error:'Method not allowed'},405);
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({error:'Unauthorized'},401);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({error:'Supabase configuration missing'},500);
  try {
    // Remotive: max four polls/day advised, source listings delayed by ~24h.
    const response = await fetch('https://remotive.com/api/remote-jobs', {headers:{'Accept':'application/json'},signal:AbortSignal.timeout(20000)});
    if (!response.ok) return json({error:'Source unavailable',http_status:response.status},502);
    const data = await response.json();
    const entries = Array.isArray(data.jobs) ? data.jobs : [];
    const rows = entries.filter((j:any) => {
      const title=plain(j.title,220);
      const cat=plain(j.category,140);
      return allowed.test(title+' '+cat) && !skip.test(title);
    }).slice(0,150).map((j:any) => {
      const title=plain(j.title,200);
      const original=String(j.url ?? '');
      if(!/^https:\/\/(?:www\.)?remotive\.com\//i.test(original)) return null;
      const rawDesc=plain(j.description,2800);
      const loc=plain(j.candidate_required_location || 'Remote / Quốc tế',200);
      const typ=String(j.job_type || '').toLowerCase();
      return {
        title, company:plain(j.company_name,200)||'Không rõ', location:loc,
        category:/procurement|purchasing|sourcing/i.test(title)?'Thu mua':/warehouse|inventory/i.test(title)?'Kho vận':'Khác',
        job_type:typ.includes('part')?'Part-time':typ.includes('intern')?'Internship':'Full-time',
        salary_min:0,salary_max:0,experience_required:/senior|manager|director|lead|[3-9]\+? years/i.test(title+' '+rawDesc),
        technical_level:/analytics|analyst|erp|sql|data/i.test(title)?3:2,
        remote_type:'Remote',description:rawDesc||'Xem bài đăng gốc để biết mô tả công việc.',requirements:'Xem yêu cầu đầy đủ trên Remotive.',
        source:'Remotive',source_url:original,verified:false,
      };
    }).filter(Boolean);
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    let imported=0;
    // Ignore duplicates by source_url, do not overwrite manual curation.
    for(let i=0;i<rows.length;i+=25){
      const batch=rows.slice(i,i+25);
      const {error}=await supabase.from('jobs').upsert(batch,{onConflict:'source_url',ignoreDuplicates:true});
      if(error) return json({error:'Database insert failed',detail:error.message,processed:imported},500);
      imported+=batch.length;
    }
    return json({ok:true,source:'Remotive',fetched:entries.length,qualified:rows.length,attempted:imported,note:'attempted includes already-existing URLs; Remotive data delayed ~24 hours'});
  }catch(e){return json({error:'Sync failed',detail:String(e)},502);}
});
