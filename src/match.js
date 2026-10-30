// Explainable local ranking (not an LLM). Optional genuine AI analysis runs via Supabase Edge Function.
const norm=s=>(s||'').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
export function scoreJob(job, profile={}) {
  let score=50; const positives=[],negatives=[];
  const text=norm([job.title,job.description,job.requirements].join(' '));
  if(job.job_type==='Internship'){score+=17;positives.push('Vị trí thực tập');}
  if(job.experience_required===false){score+=17;positives.push('Không yêu cầu kinh nghiệm');}
  else if(job.experience_required===true){score-=22;negatives.push('Yêu cầu kinh nghiệm');}
  const tech=Number(job.technical_level||2);
  if(profile.lowTech!==false){if(tech<=2){score+=12;positives.push('Ít yêu cầu kỹ thuật');}else if(tech>=4){score-=28;negatives.push('Yêu cầu kỹ thuật cao');}}
  if((job.salary_max||0)>0){score+=5;positives.push('Có thông tin lương/phụ cấp');}
  if(profile.area&&profile.area!=='Tất cả'&&norm(job.location).includes(norm(profile.area))){score+=8;positives.push('Đúng khu vực ưu tiên');}
  if(profile.partTime&& /part.time|ban thoi gian|linh hoat/.test(text)){score+=8;positives.push('Có dấu hiệu phù hợp lịch bán thời gian');}
  if(/sql|python|lap trinh|power bi|data engineer/.test(text)&&profile.lowTech!==false){score-=10;negatives.push('Mô tả có kỹ năng phân tích/kỹ thuật');}
  if(job.source==='DEMO'){negatives.push('Tin minh họa, không phải tuyển dụng thực');}
  return {score:Math.max(0,Math.min(100,score)),positives,negatives,kind:'Bộ quy tắc minh bạch'};
}
export const money=n=>n>0?(n/1000000).toLocaleString('vi-VN',{maximumFractionDigits:1})+' triệu':'Không công bố';
export function pay(job){return job.salary_max>0?(job.salary_min>0?`${money(job.salary_min)} – ${money(job.salary_max)}`:money(job.salary_max)):'Thỏa thuận / chưa công bố';}
