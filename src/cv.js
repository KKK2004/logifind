// All CV extraction and ranking runs locally in the user's browser. No CV bytes are uploaded.
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth/mammoth.browser';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const clean=s=>(s||'').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const terms={
 'Excel':['excel','spreadsheet'], 'Word':['word','microsoft office'], 'Power BI':['power bi'],
 'SQL':['sql'], 'Python':['python'], 'Odoo / ERP':['odoo','erp'], 'SAP':['sap'],
 'Chứng từ xuất nhập khẩu':['chung tu','documentation','bill of lading','packing list','invoice'],
 'Thu mua':['thu mua','purchasing','procurement','mua hang'],
 'Chăm sóc khách hàng':['cham soc khach hang','customer service','customer support'],
 'Điều phối vận tải':['dieu phoi','transportation','van tai','delivery'],
 'Quản lý kho':['quan ly kho','inventory','warehouse','ton kho'],
 'Tiếng Anh':['tieng anh','english','ielts','toeic'],
 'Giao tiếp':['giao tiep','communication'],
 'Logistics':['logistics','supply chain','chuoi cung ung'],
};
const getSkills=t=>Object.entries(terms).filter(([,syn])=>syn.some(w=>clean(t).includes(w))).map(([name])=>name);
function detectYears(s){const found=[...s.matchAll(/(?:kinh nghiem|experience|working experience|so nam)[^\n.]{0,45}?(\d{1,2})\s*(?:nam|years?)/g)].map(m=>Number(m[1]));return found.length?Math.max(...found):null;}
export function readProfile(text){const s=clean(text);return {skills:getSkills(text),education:/logistics|supply chain|chuoi cung ung/.test(s),intern:/thuc tap|internship|sinh vien|student/.test(s),years:detectYears(s),textLength:text.trim().length};}
export function cvScore(job, cvText,base){if(!cvText?.trim())return base;const profile=readProfile(cvText);const jobText=[job.title,job.description,job.requirements,job.category].join(' ');const required=getSkills(jobText);const overlap=required.filter(x=>profile.skills.includes(x));const missing=required.filter(x=>!profile.skills.includes(x));let value=base.score;
 if(required.length){value=Math.round(value*.55+100*(overlap.length/required.length)*.45);}
 if(profile.education){value+=6;}
 if(profile.intern && job.job_type==='Internship'){value+=4;}
 if(profile.years!==null){if(job.experience_required===true&&profile.years>=1){value+=9;}else if(job.experience_required===true&&profile.years<1){value-=14;}}
 const positives=[...base.positives,...(overlap.length?['CV có: '+overlap.join(', ')]:[]),...(profile.education?['CV đề cập ngành Logistics / Supply Chain']:[]),...(profile.years!==null?['CV ghi nhận khoảng '+profile.years+' năm kinh nghiệm']:[])];
 const negatives=[...base.negatives,...(missing.length?['Chưa thấy trong CV: '+missing.join(', ')]:[])];
 return {score:Math.min(100,Math.max(0,value)),positives,negatives,kind:'Đối chiếu CV trên thiết bị (quy tắc)',skillsMatched:overlap,skillsMissing:missing};}
export async function extractCV(file){if(!file)throw new Error('Chưa chọn file.');if(file.size>5*1024*1024)throw new Error('CV vượt quá giới hạn 5 MB.');const name=file.name.toLowerCase();let content='';
 if(name.endsWith('.txt'))content=await file.text();
 else if(name.endsWith('.docx')){const res=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});content=res.value;}
 else if(name.endsWith('.pdf')){const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let pages=[];for(let i=1;i<=Math.min(pdf.numPages,12);i++){const page=await pdf.getPage(i);const result=await page.getTextContent();pages.push(result.items.map(x=>x.str||'').join(' '));}content=pages.join('\n');await pdf.destroy();}
 else throw new Error('Chỉ nhận PDF, DOCX hoặc TXT.');
 if(content.trim().length<40)throw new Error('Không đọc được đủ chữ. CV PDF scan/ảnh cần OCR hoặc dán nội dung bằng tay.');return content.slice(0,40000);
}
