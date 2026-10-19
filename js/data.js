"use strict";

/* =====================================================================
   4. SEED DATA — all fictional. Hierarchy:
   Client → Program → Course → Cohort → Course day → Session → Participant
   Dates are day offsets from "today" so the demo works on any date.
   ===================================================================== */
const T = (en, ar) => ({en, ar});
const Q = (id, obj, en, ar, opts, kind='mcq') => ({id, kind, obj, required:true, text:T(en,ar), options: opts.map(o=>T(o[0],o[1])), correct:0});

const BANK_DATA = [
  Q('q1','O1','Which of these is the best example of a decision framed as a testable question?','أيّ مما يلي هو أفضل مثال على قرار مصاغ كسؤال قابل للاختبار؟',[['Will increasing preventive maintenance by 10% reduce unplanned downtime next quarter?','هل ستؤدي زيادة الصيانة الوقائية بنسبة 10% إلى خفض التوقف غير المخطط في الربع القادم؟'],['Is our maintenance program good enough?','هل برنامج الصيانة لدينا جيد بما يكفي؟'],['Should we collect more data?','هل يجب أن نجمع مزيدًا من البيانات؟'],['What do senior managers prefer?','ماذا يفضّل كبار المديرين؟']]),
  Q('q2','O1','Before collecting data for a decision, what should be defined first?','قبل جمع البيانات لاتخاذ قرار، ما الذي يجب تحديده أولًا؟',[['The decision and the metric that would change it','القرار والمؤشر الذي قد يغيّره'],['The dashboard colour scheme','ألوان لوحة المعلومات'],['The largest dataset available','أكبر مجموعة بيانات متاحة'],['The final recommendation','التوصية النهائية']]),
  Q('q3','O2','Repair times for 200 jobs are strongly right-skewed. Which summary best describes a typical repair?','أزمنة الإصلاح لـ200 مهمة ملتوية بشدة نحو اليمين. أي مقياس يصف الإصلاح النموذجي بشكل أفضل؟',[['Median','الوسيط'],['Mean','المتوسط الحسابي'],['Maximum','القيمة العظمى'],['Range','المدى']]),
  Q('q4','O2','A 95% confidence interval for average downtime is 4.1–5.3 hours. What does this mean?','فترة الثقة 95% لمتوسط التوقف هي 4.1–5.3 ساعة. ماذا يعني ذلك؟',[['The method captures the true average in about 95% of repeated samples','الطريقة تتضمن المتوسط الحقيقي في نحو 95% من العينات المتكررة'],['95% of machines are down between 4.1 and 5.3 hours','95% من الآلات تتوقف بين 4.1 و5.3 ساعة'],['The true average is exactly 4.7 hours','المتوسط الحقيقي هو 4.7 ساعة بالضبط'],['There is a 5% chance the data are wrong','هناك احتمال 5% أن تكون البيانات خاطئة']]),
  Q('q5','O3','What should open an evidence briefing for executives?','بماذا يجب أن تبدأ إحاطة الأدلة المقدَّمة للتنفيذيين؟',[['The recommendation and the key evidence behind it','التوصية وأهم الأدلة الداعمة لها'],['A detailed description of the methodology','وصف تفصيلي للمنهجية'],['Every chart produced during the analysis','جميع الرسوم البيانية التي أُعدّت أثناء التحليل'],['The raw data tables','جداول البيانات الخام']]),
  Q('q6','O3','A chart with a truncated y-axis can exaggerate small differences.','قد يبالغ الرسم البياني ذو المحور الرأسي المقطوع في إظهار الفروق الصغيرة.',[['True','صحيح'],['False','خطأ']],'tf'),
];
const BANK_SC = [
  Q('q1','O1','A recurring rise in shipments before every Eid holiday is an example of:','الارتفاع المتكرر في الشحنات قبل كل عيد هو مثال على:',[['Seasonality','الموسمية'],['A long-term trend','الاتجاه طويل المدى'],['Random noise','التذبذب العشوائي'],['A one-off outlier','قيمة شاذة لمرة واحدة']]),
  Q('q2','O1','Which metric expresses forecast error as a percentage of actual demand?','أي مؤشر يعبّر عن خطأ التنبؤ كنسبة مئوية من الطلب الفعلي؟',[['MAPE','MAPE'],['ROI','ROI'],['OTIF','OTIF'],['EOQ','EOQ']]),
  Q('q3','O2','Raising the target service level from 95% to 99%, all else equal, usually:','رفع مستوى الخدمة المستهدف من 95% إلى 99%، مع ثبات العوامل الأخرى، عادةً:',[['Increases the required safety stock','يزيد مخزون الأمان المطلوب'],['Reduces safety stock','يقلل مخزون الأمان'],['Has no effect on inventory','لا يؤثر على المخزون'],['Eliminates lead-time risk','يلغي مخاطر مهلة التوريد']]),
  Q('q4','O2','Which data split avoids leakage when testing a time-series forecast?','أي تقسيم للبيانات يمنع التسرب عند اختبار تنبؤ لسلسلة زمنية؟',[['Train on earlier periods, test on later periods','التدريب على الفترات الأقدم والاختبار على الأحدث'],['Shuffle all rows randomly','خلط جميع الصفوف عشوائيًا'],['Test on the training data','الاختبار على بيانات التدريب'],['Use all data for both','استخدام جميع البيانات للأمرين']]),
  Q('q5','O3','A route-optimization model performs worse in one region. What is the first step?','نموذج تحسين المسارات أداؤه أضعف في منطقة واحدة. ما الخطوة الأولى؟',[['Check data coverage and quality for that region','فحص تغطية البيانات وجودتها في تلك المنطقة'],['Deploy it anyway','تشغيله على أي حال'],['Exclude the region permanently','استبعاد المنطقة نهائيًا'],['Use a larger model','استخدام نموذج أكبر']]),
  Q('q6','O3','Human oversight means a qualified person can review and override AI recommendations.','الإشراف البشري يعني أن شخصًا مؤهلًا يمكنه مراجعة توصيات الذكاء الاصطناعي وتجاوزها.',[['True','صحيح'],['False','خطأ']],'tf'),
];
const QUIZ_SC = [
  Q('z1','O2','Safety stock protects against…','يحمي مخزون الأمان من…',[['Variability in demand and lead time','تقلب الطلب ومهلة التوريد'],['Fixed ordering costs','تكاليف الطلب الثابتة'],['Warehouse rent','إيجار المستودع']]),
  Q('z2','O1','Which method suits a series with a strong weekly pattern?','أي أسلوب يناسب سلسلة ذات نمط أسبوعي قوي؟',[['A seasonal model (e.g., Holt-Winters)','نموذج موسمي (مثل هولت-وينترز)'],['A simple average of all history','متوسط بسيط لكل البيانات السابقة'],['The last value only','آخر قيمة فقط']]),
  Q('z3','O2','OTIF measures orders delivered on time and in full.','يقيس مؤشر OTIF الطلبات المسلّمة في الوقت المحدد وبالكامل.',[['True','صحيح'],['False','خطأ']],'tf'),
];
const SAMPLE_COMMENTS = [T('Very practical examples from our own operations context.','أمثلة عملية جدًا من سياق عملياتنا.'),T('The statistics session needed more time for exercises.','جلسة الإحصاء احتاجت وقتًا أطول للتمارين.'),T('Excellent facilitation; the capstone tied everything together.','إدارة ممتازة للجلسات؛ والمشروع الختامي ربط كل شيء معًا.'),T('Would like to receive the workbook in advance.','أتمنى الحصول على المصنف مسبقًا.'),T('Great balance of theory and hands-on lab work.','توازن رائع بين النظرية والعمل التطبيقي.'),T('Room was a little cold in the afternoon.','كانت القاعة باردة قليلًا في فترة بعد الظهر.')];
const SAMPLE_CSV = `name,job_title,email
Omar Al-Fayez,Maintenance Planner,omar.f@sahil-energy.example
Layla Hamdan,Reliability Engineer,layla.h@sahil-energy.example
Saad Al-Mutairi,Shift Supervisor,saad.m@sahil-energy
,Process Engineer,no.name@sahil-energy.example
Rawan Al-Shehri,Data Analyst,rawan.s@sahil-energy.example
Layla Hamdan,Reliability Engineer,layla.h@sahil-energy.example`;

function seed(){
  const rnd = mulberry32(20261005), ri = (a,b)=> a + Math.floor(rnd()*(b-a+1));
  const C = (id, en, ar, active=true) => ({id, en, ar, active});
  const D = {
    version: DATA_VERSION, anchor: day0().getTime(),
    cls:{
      category:[C('cat_dig','Digital & data','الرقمنة والبيانات'),C('cat_ops','Operational excellence','التميز التشغيلي'),C('cat_lead','Leadership & management','القيادة والإدارة'),C('cat_sus','Energy & sustainability','الطاقة والاستدامة',false)],
      domain:[C('dom_data','Data analytics','تحليل البيانات'),C('dom_sc','Supply chain','سلاسل الإمداد'),C('dom_pm','Project management','إدارة المشاريع'),C('dom_ai','Artificial intelligence','الذكاء الاصطناعي')],
      audience:[C('aud_front','Supervisors & frontline teams','المشرفون والفرق الميدانية'),C('aud_mid','Middle management','الإدارة الوسطى'),C('aud_senior','Senior leaders','القيادات العليا'),C('aud_spec','Specialists','المختصون')],
      courseType:[C('ct_work','Workshop','ورشة عمل'),C('ct_boot','Bootcamp','معسكر مكثف'),C('ct_master','Masterclass','محاضرة متخصصة'),C('ct_blend','Blended course','دورة مدمجة')],
      deliveryMode:[C('dm_in','In person','حضوري'),C('dm_virtual','Virtual','افتراضي'),C('dm_hybrid','Hybrid','مدمج')],
      priority:[C('pr_high','High','عالية'),C('pr_med','Medium','متوسطة'),C('pr_low','Low','منخفضة')],
      competency:[C('cp_data','Data literacy','الثقافة البيانية'),C('cp_dec','Decision making','اتخاذ القرار'),C('cp_fc','Forecasting','التنبؤ'),C('cp_rai','Responsible AI','الذكاء الاصطناعي المسؤول'),C('cp_comm','Communicating evidence','إيصال الأدلة'),C('cp_lead','Team leadership','قيادة الفرق')],
    },
    clients:[{id:'c1', name:T('Sahil Energy Services','شركة الساحل لخدمات الطاقة'), contactName:'Waleed Al-Sahli', contactEmail:'w.sahli@sahil-energy.example', contactPhone:'+966 5x xxx 1000', createdAt: ts(-60,'09:00')},{id:'c2', name:T('Marsa Logistics Group','مجموعة مرسى للخدمات اللوجستية'), contactName:'Rana Khoury', contactEmail:'r.khoury@marsa-logistics.example', contactPhone:'+966 5x xxx 2000', createdAt: ts(-45,'09:00')}],
    rooms:[
      {id:'r1', name:T('Training Room A-101','قاعة التدريب A-101'), building:T('Academy Building A (sample)','مبنى الأكاديمية A (مثال)'), capacity:30, virtual:false, geo:{lat:22.30955, lng:39.10465, label:T('Academy Building A — sample pin','مبنى الأكاديمية A — موقع تجريبي')}},
      {id:'r2', name:T('Seminar Room B-204','قاعة الندوات B-204'), building:T('Academy Building B (sample)','مبنى الأكاديمية B (مثال)'), capacity:24, virtual:false, geo:{lat:22.31190, lng:39.10230, label:T('Academy Building B — sample pin','مبنى الأكاديمية B — موقع تجريبي')}},
      {id:'r3', name:T('Innovation Lab C-12','مختبر الابتكار C-12'), building:T('Academy Building C (sample)','مبنى الأكاديمية C (مثال)'), capacity:18, virtual:false, geo:{lat:22.30720, lng:39.10790, label:T('Academy Building C — sample pin','مبنى الأكاديمية C — موقع تجريبي')}},
      {id:'r4', name:T('Virtual room (simulated meeting)','قاعة افتراضية (اجتماع محاكى)'), building:T('Online','عبر الإنترنت'), capacity:100, virtual:true},
    ],
    users:[
      {id:'u_admin', role:'admin', name:T('Yousef Al-Harbi','يوسف الحربي'), title:T('Academy Admin','مسؤول الأكاديمية'), email:'y.alharbi@academy.example', status:'active', demo:true},
      {id:'u_coord', role:'coordinator', name:T('Hana Al-Mansour','هناء المنصور'), title:T('KAUST Program Coordinator (on-site)','منسقة برامج كاوست (في الموقع)'), email:'h.almansour@academy.example', status:'active', demo:true},
      {id:'u_coord2', role:'coordinator', name:T('Abdulrahman Saeed','عبدالرحمن سعيد'), title:T('KAUST Program Coordinator (on-site)','منسق برامج كاوست (في الموقع)'), email:'a.saeed@academy.example', status:'active'},
      {id:'t4', role:'trainer', name:T('Dr. Faris Al-Qahtani','د. فارس القحطاني'), title:T('Instructor — Operations leadership','مدرب — قيادة العمليات'), email:'f.alqahtani@trainers.example', status:'active'},
      {id:'cr1b', role:'client', clientId:'c1', name:T('Maha Al-Dosari','مها الدوسري'), title:T('Client Coordinator, Sahil Energy','منسقة العميل، الساحل للطاقة'), email:'m.aldosari@sahil-energy.example', status:'invited'},
      {id:'t3', role:'trainer', name:T('Dr. Sarah Whitfield','د. سارة ويتفيلد'), title:T('Trainer — Data storytelling','مدربة — سرد البيانات'), email:'s.whitfield@trainers.example', status:'active', demo:true},
      {id:'t2', role:'trainer', name:T('Eng. Omar Bakri','م. عمر بكري'), title:T('Trainer — Supply chain analytics','مدرب — تحليلات سلاسل الإمداد'), email:'o.bakri@trainers.example', status:'active', demo:true},
      {id:'t1', role:'trainer', name:T('Dr. Lina Haddad','د. لينا حداد'), title:T('Trainer — Data & decisions','مدربة — البيانات واتخاذ القرار'), email:'l.haddad@trainers.example', status:'active', demo:true},
      {id:'cr1', role:'client', clientId:'c1', name:T('Waleed Al-Sahli','وليد السهلي'), title:T('Client Coordinator, Sahil Energy','منسق العميل، الساحل للطاقة'), email:'w.sahli@sahil-energy.example', status:'active', demo:true},
      {id:'cr2', role:'client', clientId:'c2', name:T('Rana Khoury','رنا خوري'), title:T('Client Coordinator, Marsa Logistics','منسقة العميل، مرسى'), email:'r.khoury@marsa-logistics.example', status:'active', demo:true},
      {id:'u_pa9', role:'participant', participantId:'pa9', name:T('Sara Al-Amri','سارة العمري'), title:T('Logistics Analyst','محللة لوجستيات'), email:'sara.amri@marsa-logistics.example', status:'active', demo:true},
      {id:'u_pa19', role:'participant', participantId:'pa19', name:T('Nawaf Al-Rowais','نواف الرويس'), title:T('BI Developer','مطور ذكاء أعمال'), email:'nawaf.r@sahil-energy.example', status:'invited', demo:true},
      {id:'u_pa1', role:'participant', participantId:'pa1', name:T('Faisal Al-Otaibi','فيصل العتيبي'), title:T('Planning Engineer','مهندس تخطيط'), email:'faisal.otaibi@sahil-energy.example', status:'active', demo:true},
    ],
    programs:[
      {id:'PR1', code:'KA-PP-101', title:T('Operational Data Excellence Program','برنامج التميز في البيانات التشغيلية'), clientId:'c1', ownerId:'u_coord', categoryId:'cat_dig', domainId:'dom_data', audienceId:'aud_mid', deliveryModeId:'dm_in', priorityId:'pr_high', status:'active', archived:false, setupStep:6, startOffset:-12, endOffset:15,
        desc:T('Builds data-informed decision making across Sahil Energy operations teams.','بناء اتخاذ القرار المستند إلى البيانات لدى فرق العمليات في شركة الساحل.'),
        needs:{business:'Operational decisions rely on intuition; downtime analysis is slow and inconsistent across sites.', source:'Client L&D needs survey and operations leadership interviews (fictional).', audience:'Supervisors and engineers who prepare operational decisions.', current:'Basic spreadsheet reporting; limited statistical interpretation.', desired:'Teams frame decisions, interpret evidence and brief leaders with clear recommendations.', competencies:['cp_data','cp_dec','cp_comm'], priorityId:'pr_high', constraints:'Participants available two days per month; mixed Arabic/English preference.', measures:'Pre/post gain ≥ 20 pts; 3 data-informed decisions documented per team within 90 days.', internal:'Client budget confirmed for two cohorts. Consider Arabic workbook for Cohort B.'}},
      {id:'PR2', code:'KA-PP-214', title:T('Logistics Analytics Academy','أكاديمية تحليلات الخدمات اللوجستية'), clientId:'c2', ownerId:'u_coord', categoryId:'cat_dig', domainId:'dom_sc', audienceId:'aud_spec', deliveryModeId:'dm_hybrid', priorityId:'pr_high', status:'active', archived:false, setupStep:6, startOffset:-2, endOffset:10,
        desc:T('Applied analytics and AI for logistics planners and warehouse leaders at Marsa.','تحليلات وتطبيقات ذكاء اصطناعي لمخططي الخدمات اللوجستية وقادة المستودعات في مرسى.'),
        needs:{business:'Forecast error drives excess inventory and missed deliveries.', source:'Annual operations review (fictional).', audience:'Planners, analysts and warehouse leads.', current:'Forecasts produced manually; little use of AI tools.', desired:'Planners apply forecasting and optimization methods responsibly.', competencies:['cp_fc','cp_rai','cp_data'], priorityId:'pr_high', constraints:'Peak season in month 3; virtual sessions preferred for one day.', measures:'MAPE reduced on pilot SKUs; post-assessment gain.', internal:'Client sensitive to sharing individual scores — keep group-level reporting only.'}},
      {id:'PR3', code:'KA-PP-305', title:T('Leadership Foundations','أسس القيادة'), clientId:'c1', ownerId:'u_coord', categoryId:'cat_lead', domainId:'dom_pm', audienceId:'aud_front', deliveryModeId:'dm_in', priorityId:'pr_med', status:'draft', archived:false, setupStep:1, startOffset:40, endOffset:55,
        desc:T('First-line leadership skills for newly promoted supervisors.','مهارات القيادة الأولى للمشرفين المرقّين حديثًا.'),
        needs:{business:'Newly promoted supervisors struggle with team communication.', source:'', audience:'', current:'', desired:'', competencies:['cp_lead'], priorityId:'pr_med', constraints:'', measures:'', internal:''}},
    ],
    courses:[
      {id:'CR1', programId:'PR1', code:'DDM', title:T('Data-Driven Decision Making','اتخاذ القرار المبني على البيانات'), desc:T('Framing decisions, interpreting statistics and communicating evidence.','صياغة القرارات وتفسير الإحصاءات وإيصال الأدلة.'), objectives:[{id:'O1',...T('Frame business decisions as testable questions','صياغة قرارات العمل كأسئلة قابلة للاختبار')},{id:'O2',...T('Interpret descriptive and inferential statistics','تفسير الإحصاء الوصفي والاستدلالي')},{id:'O3',...T('Communicate evidence to decision-makers','إيصال الأدلة إلى صانعي القرار')}], language:'bi', hours:18, typeId:'ct_work', trainerId:'t1', archived:false},
      {id:'CR2', programId:'PR1', code:'DSS', title:T('Dashboards & Data Storytelling','لوحات المعلومات وسرد البيانات'), desc:T('Designing dashboards and narratives that lead to action.','تصميم لوحات معلومات وروايات تقود إلى الفعل.'), objectives:[{id:'O1',...T('Choose the right chart for the question','اختيار الرسم المناسب للسؤال')},{id:'O2',...T('Structure a data story for executives','بناء قصة بيانات للتنفيذيين')}], language:'en', hours:12, typeId:'ct_work', trainerId:'t3', archived:false},
      {id:'CR3', programId:'PR2', code:'SCA', title:T('Supply Chain Analytics & AI','تحليلات سلاسل الإمداد والذكاء الاصطناعي'), desc:T('Demand analytics, forecasting, inventory optimization and responsible AI.','تحليلات الطلب والتنبؤ وتحسين المخزون والذكاء الاصطناعي المسؤول.'), objectives:[{id:'O1',...T('Analyze demand patterns','تحليل أنماط الطلب')},{id:'O2',...T('Apply forecasting and inventory methods','تطبيق أساليب التنبؤ وإدارة المخزون')},{id:'O3',...T('Use AI responsibly in operations','استخدام الذكاء الاصطناعي بمسؤولية في العمليات')}], language:'bi', hours:24, typeId:'ct_boot', trainerId:'t2', archived:false},
      {id:'CR4', programId:'PR2', code:'WOL', title:T('Warehouse Operations Leadership','قيادة عمليات المستودعات'), desc:T('Leading warehouse teams through change, safety and performance routines.','قيادة فرق المستودعات خلال التغيير وروتين السلامة والأداء.'), objectives:[{id:'O1',...T('Run effective daily performance huddles','إدارة اجتماعات أداء يومية فعالة')},{id:'O2',...T('Lead safety conversations','قيادة حوارات السلامة')}], language:'ar', hours:6, typeId:'ct_master', trainerId:'t1', archived:false},
    ],
    cohorts:[
      {id:'CH1A', courseId:'CR1', name:T('Cohort A','الدفعة أ'), archived:false},
      {id:'CH2A', courseId:'CR2', name:T('Cohort A','الدفعة أ'), archived:false},
      {id:'CH3', courseId:'CR3', name:T('Cohort 2','الدفعة 2'), archived:false},
      {id:'CH4', courseId:'CR4', name:T('Cohort 1','الدفعة 1'), archived:false},
    ],
    days:[], sessions:[], participants:[], attendance:{}, rejected:{}, assessments:[], attempts:[], activities:[], submissions:{}, drafts:{}, materials:[], evaluations:[], certs:{}, requests:[], log:[],
    settings:{checkinWindow:15, minAttendance:80, requirePost:true, requireFinal:true, materialDays:90, downloadsDefault:false, defaultLang:'ar', contentReview:false, clientIndividual:false, coordEditParticipants:true, coordTemplates:true, geofenceRadius:100, geoAccuracy:50, geoBefore:30},
    certTpl:{bgKey:null, bgName:null, bgPersisted:false,
      desc:T('has successfully completed the course below ({{duration}}) as part of {{program_title}}.','قد أتمّ بنجاح الدورة التالية ({{duration}}) ضمن {{program_title}}.'),
      fields:{
        participant_name:{x:50,y:40,w:80,size:4.8,align:'center',color:'#071830',bold:true,show:true},
        certificate_description:{x:50,y:51,w:70,size:1.9,align:'center',color:'#4F5B6D',bold:false,show:true},
        course_title:{x:50,y:61,w:80,size:2.8,align:'center',color:'#0B6B67',bold:true,show:true},
        program_title:{x:50,y:68,w:80,size:1.6,align:'center',color:'#4F5B6D',bold:false,show:false},
        duration:{x:50,y:72,w:60,size:1.5,align:'center',color:'#4F5B6D',bold:false,show:false},
        issue_date:{x:22,y:84,w:34,size:1.5,align:'center',color:'#4F5B6D',bold:false,show:true},
        trainer_name:{x:78,y:84,w:34,size:1.6,align:'center',color:'#071830',bold:true,show:true},
        certificate_id:{x:50,y:90,w:60,size:1.35,align:'center',color:'#071830',bold:true,show:true},
      }},
  };

  /* --- Days & sessions (admin-created structure) --- */
  const mk = (chid, cid, offs, titles, opts={}) => {
    offs.forEach((off, di)=>{ const dId = `${chid}-D${di+1}`; D.days.push({id:dId, cohortId:chid, dayOffset:off});
      [0,1].forEach(k=>{ const i = di*2+k, ttl = titles[i]; if (!ttl) return; const virt = (opts.virtual||[]).includes(i);
        D.sessions.push({id:`${dId}-S${k+1}`, dayId:dId, cohortId:chid, courseId:cid, order:k+1, title:ttl, agenda: (opts.agenda||[])[i] || (k ? T('Group exercise and discussion','تمرين جماعي ونقاش') : T('Concepts, worked examples and Q&A','مفاهيم وأمثلة تطبيقية وأسئلة')), start:k?'13:00':'09:00', end:k?'16:00':'12:00', roomId: virt?'r4':opts.room, mode: virt?'virtual':'in_person', meetingUrl: virt?`https://meet.example.invalid/ka-${chid.toLowerCase()}-${di+1}${k+1}`:'', status:'scheduled', startedAt:null, endedAt:null, clockOffset:0, codeVer:0}); }); });
  };
  mk('CH1A','CR1',[-12,-11,-10],[T('Framing decisions with data','صياغة القرارات باستخدام البيانات'),T('Data quality & sources','جودة البيانات ومصادرها'),T('Descriptive statistics in practice','الإحصاء الوصفي في التطبيق'),T('Uncertainty & inference','عدم اليقين والاستدلال'),T('Dashboards that drive action','لوحات معلومات تقود إلى الفعل'),T('Capstone: evidence briefing','مشروع ختامي: إحاطة مبنية على الأدلة')],{room:'r2'});
  mk('CH2A','CR2',[9,10],[T('Choosing the right chart','اختيار الرسم المناسب'),T('Dashboard layout clinic','عيادة تصميم لوحات المعلومات'),T('Structuring the data story','بناء قصة البيانات'),T('Executive storytelling lab','مختبر السرد للتنفيذيين')],{room:'r3', agenda:[T('Chart types and when to use them','أنواع الرسوم ومتى تُستخدم'),T('Bring one dashboard for live redesign','أحضر لوحة معلومات لإعادة تصميمها'),T('Story arc: situation, insight, action','بناء القصة: الوضع، الاستنتاج، الإجراء'),T('Five-minute executive pitches','عروض تنفيذية لخمس دقائق')]});
  mk('CH3','CR3',[-2,-1,0,1],[T('Supply chain data foundations','أسس بيانات سلاسل الإمداد'),T('Demand patterns & seasonality','أنماط الطلب والموسمية'),T('Forecasting methods','أساليب التنبؤ'),T('Inventory optimization','تحسين المخزون'),T('Machine learning for logistics','تعلم الآلة في الخدمات اللوجستية'),T('Route & network analytics lab','مختبر تحليلات المسارات والشبكات'),T('Responsible AI in operations','الذكاء الاصطناعي المسؤول في العمليات'),T('Capstone presentations','عروض المشاريع الختامية')],{room:'r1', virtual:[6], agenda:[T('Data sources, quality checks','مصادر البيانات وفحص الجودة'),T('Seasonality lab with real-like data','مختبر الموسمية ببيانات شبه واقعية'),T('Moving average, exponential smoothing','المتوسط المتحرك والتمهيد الأسي'),T('Safety stock and reorder points','مخزون الأمان ونقاط إعادة الطلب'),T('Classification models for delays','نماذج تصنيف التأخير'),T('Team lab: optimise a delivery network','مختبر جماعي: تحسين شبكة توصيل'),T('Bias, oversight and accountability','التحيز والإشراف والمساءلة'),T('Team presentations and feedback','عروض الفرق والتغذية الراجعة')]});
  mk('CH4','CR4',[9],[T('Daily performance huddles','اجتماعات الأداء اليومية'),T('Safety leadership conversations','حوارات قيادة السلامة')],{room:'r1'});
  // Room double-booking (seeded conflict): CR4 afternoon placed in the Innovation Lab, which CR2 already uses.
  D.sessions.find(s=>s.id==='CH4-D1-S2').roomId = 'r3';
  const endIds = ['CH1A-D1-S1','CH1A-D1-S2','CH1A-D2-S1','CH1A-D2-S2','CH1A-D3-S1','CH1A-D3-S2','CH3-D1-S1','CH3-D1-S2','CH3-D2-S1','CH3-D2-S2','CH3-D3-S1'];
  const dOff = id => D.days.find(d=>d.id===D.sessions.find(s=>s.id===id).dayId).dayOffset;
  D.sessions.forEach(s=>{ if (endIds.includes(s.id)){ s.status='ended'; s.startedAt=ts(dOff(s.id),s.start); s.endedAt=ts(dOff(s.id),s.end); } });

  /* --- Participants (fictional) --- */
  const DEPT = {CH1A:T('Operations','العمليات'), CH2A:T('Performance & BI','الأداء وذكاء الأعمال'), CH3:T('Logistics planning','تخطيط الخدمات اللوجستية'), CH4:T('Logistics planning','تخطيط الخدمات اللوجستية')};
  const P = (id, chid, en, ar, ten, tar, email) => D.participants.push({id, cohortId:chid, name:T(en,ar), title:T(ten,tar), email, dept:DEPT[chid], empId:'E'+(1000+D.participants.length*7), invite:{status:'completed', at: ts(chid==='CH1A'?-20:-9,'10:00')}});
  P('pa1','CH1A','Faisal Al-Otaibi','فيصل العتيبي','Planning Engineer','مهندس تخطيط','faisal.otaibi@sahil-energy.example');
  P('pa2','CH1A','Noura Al-Zahrani','نورة الزهراني','Data Analyst','محللة بيانات','noura.z@sahil-energy.example');
  P('pa3','CH1A','Khalid Al-Dossary','خالد الدوسري','Operations Supervisor','مشرف عمليات','khalid.d@sahil-energy.example');
  P('pa4','CH1A','Reem Al-Ghamdi','ريم الغامدي','HSE Specialist','أخصائية صحة وسلامة','reem.g@sahil-energy.example');
  P('pa5','CH1A','Abdullah Al-Shammari','عبدالله الشمري','Maintenance Lead','قائد فريق الصيانة','abdullah.s@sahil-energy.example');
  P('pa6','CH1A','Lama Al-Harthi','لمى الحارثي','Procurement Officer','أخصائية مشتريات','lama.h@sahil-energy.example');
  P('pa7','CH1A','Turki Al-Anazi','تركي العنزي','Asset Manager','مدير الأصول','turki.a@sahil-energy.example');
  P('pa8','CH1A','Huda Al-Saleh','هدى الصالح','Finance Analyst','محللة مالية','huda.s@sahil-energy.example');
  P('pa19','CH2A','Nawaf Al-Rowais','نواف الرويس','BI Developer','مطور ذكاء أعمال','nawaf.r@sahil-energy.example');
  P('pa20','CH2A','Amal Al-Johani','أمل الجهني','Performance Analyst','محللة أداء','amal.j@sahil-energy.example');
  P('pa21','CH2A','Saud Al-Kathiri','سعود الكثيري','Operations Engineer','مهندس عمليات','saud.k@sahil-energy.example');
  P('pa22','CH2A','Wafa Al-Enezi','وفاء العنزي','Reporting Lead','قائدة التقارير','wafa.e@sahil-energy.example');
  P('pa9','CH3','Sara Al-Amri','سارة العمري','Logistics Analyst','محللة لوجستيات','sara.amri@marsa-logistics.example');
  P('pa10','CH3','Majid Al-Qarni','ماجد القرني','Fleet Manager','مدير الأسطول','majid.q@marsa-logistics.example');
  P('pa11','CH3','Jana Al-Rashid','جنى الراشد','Warehouse Planner','مخططة مستودعات','jana.r@marsa-logistics.example');
  P('pa12','CH3','Bandar Al-Juhani','بندر الجهني','Customs Coordinator','منسق جمارك','bandar.j@marsa-logistics.example');
  P('pa13','CH3','Dana Al-Malki','دانة المالكي','Demand Planner','مخططة طلب','dana.m@marsa-logistics.example');
  P('pa14','CH3','Hassan Al-Shehri','حسن الشهري','Operations Manager','مدير العمليات','hassan.s@marsa-logistics.example');
  P('pa9b','CH4','Sara Al-Amri','سارة العمري','Logistics Analyst','محللة لوجستيات','sara.amri@marsa-logistics.example');   // same person, second course (multi-course demo)

  // Invitation states for the upcoming course (shows the invite workflow)
  const inv = (id, st, off) => { const x = D.participants.find(p=>p.id===id); x.invite = {status:st, at: off==null?null:ts(off,'10:00')}; };
  inv('pa19','sent',-3); inv('pa20','completed',-3); inv('pa21','failed',-3); inv('pa22','not_sent',null);

  /* --- Attendance (P present, L late, M manual exception, A absent) --- */
  const pat = {CH1A:{pa1:'PPPPPP',pa2:'PPPLPP',pa3:'PAPPPP',pa4:'PPMPPP',pa5:'LPPALP',pa6:'PAPAPP',pa7:'PPPPLP',pa8:'PPAPPP'}, CH3:{pa9:'PPPPP',pa10:'PLPPA',pa11:'PPPPL',pa12:'LPAPP',pa13:'PPPPP',pa14:'PPMPP'}};
  for (const [chid, rows] of Object.entries(pat)){ const ss = D.sessions.filter(s=>s.cohortId===chid && s.status==='ended');
    for (const [paid, str] of Object.entries(rows)) [...str].forEach((ch, j)=>{ const s = ss[j]; if (!s || ch==='A') return; const base = ts(dOff(s.id), s.start); D.attendance[s.id] = D.attendance[s.id] || {};
      if (ch==='P') D.attendance[s.id][paid] = {status:'present', at: base + ri(-6,11)*60000, method: rnd()<.85?'code':'qr'};
      if (ch==='L') D.attendance[s.id][paid] = {status:'late', at: base + ri(17,31)*60000, method:'code'};
      if (ch==='M'){ D.attendance[s.id][paid] = {status:'present', at: base + ri(3,9)*60000, method:'manual', reason: chid==='CH1A'?'qr_failed':'device_issue', note:'Verified in person by the trainer.', by: chid==='CH1A'?'t1':'t2'};
        D.log.push({id:'Lm'+paid, ts: base+30*60000, actor: chid==='CH1A'?'t1':'t2', type:'manual', p:{course:s.courseId, sid:s.id, pid:paid, status:'present', reason:D.attendance[s.id][paid].reason}}); }
    }); }
  D.rejected['CH3-D3-S1'] = [{id:'rj1', paid:'pa10', reason:'other_session', at: ts(0,'09:21')}, {id:'rj2', paid:'pa12', reason:'invalid_code', at: ts(0,'09:06')}];

  /* --- Assessments (trainer content) --- */
  const A = (id, cid, type, o) => D.assessments.push(Object.assign({id, courseId:cid, type, version:1, status:'draft', timeLimit:10, opens:'courseStart', closes:'afterEnd7', shuffle:true, sameAsPre:false, openNow:false, questions:[], updatedAt: ts(-20,'10:00'), superseded:false}, o));
  A('AS1','CR1','pre',{status:'ready', questions:JSON.parse(JSON.stringify(BANK_DATA))});
  A('AS2','CR1','post',{status:'ready', sameAsPre:true, opens:'lastDay'});
  A('AS3','CR3','pre',{status:'ready', questions:JSON.parse(JSON.stringify(BANK_SC))});
  A('AS4','CR3','post',{status:'ready', sameAsPre:true, opens:'lastDay'});
  A('AS5','CR2','pre',{status:'draft', questions:[Q('q1','O1','Which chart best shows change over time?','أي رسم يوضح التغير عبر الزمن بشكل أفضل؟',[['Line chart','رسم خطي'],['Pie chart','رسم دائري'],['Table only','جدول فقط'],['Word cloud','سحابة كلمات']]), Q('q2','O2','An executive data story should start with the main message.','يجب أن تبدأ قصة البيانات للتنفيذيين بالرسالة الرئيسية.',[['True','صحيح'],['False','خطأ']],'tf')]});
  const qsOf = id => { const a = D.assessments.find(x=>x.id===id); return a.sameAsPre ? D.assessments.find(x=>x.courseId===a.courseId && x.type==='pre').questions : a.questions; };
  const att = (paid, aid, correctIds, off, hm) => { const a = D.assessments.find(x=>x.id===aid), qs = qsOf(aid), items = {}; const chid = D.participants.find(p=>p.id===paid).cohortId;
    qs.forEach(q=>{ const ok = correctIds.includes(q.id), r = rnd(); items[q.id] = {answer: ok ? q.correct : 1, correct: ok, gradable:true, obj:q.obj, conf: ok ? (r<.75?'sure':'unsure') : (r<.25?'sure':r<.65?'unsure':'guess')}; });
    D.attempts.push({id:'at'+D.attempts.length, assessmentId:aid, courseId:a.courseId, cohortId:chid, participantId:paid, type:a.type, items, score:correctIds.length, max:qs.length, started: ts(off,hm)-ri(6,9)*60000, completed: ts(off,hm)}); };
  Object.entries({pa1:['q1','q3'], pa2:['q1','q2','q5'], pa3:['q2'], pa4:['q1','q3','q5','q6'], pa5:['q1','q6'], pa6:['q1','q3','q6'], pa7:['q2','q5'], pa8:['q1','q2','q3','q4','q5','q6']}).forEach(([k,v])=>att(k,'AS1',v,-12,'08:52'));
  Object.entries({pa1:['q1','q2','q3','q4','q5'], pa2:['q1','q2','q3','q4','q5','q6'], pa3:['q1','q2','q3','q5'], pa4:['q1','q2','q3','q5','q6'], pa5:['q1','q2','q3','q5','q6'], pa6:['q1','q3','q5'], pa8:['q1','q2','q3','q4','q5','q6']}).forEach(([k,v])=>att(k,'AS2',v,-10,'15:40'));
  Object.entries({pa10:['q1','q2'], pa11:['q1','q3','q4'], pa12:['q2'], pa13:['q1','q2','q5'], pa14:['q1','q6']}).forEach(([k,v])=>att(k,'AS3',v,-2,'08:55'));

  /* --- Activities (trainer content) --- */
  const AC = (id, cid, o) => D.activities.push(Object.assign({id, courseId:cid, cohortId:null, type:'text', grouping:'individual', status:'published', objectiveId:'O1', dueTime:'23:59', questions:[]}, o));
  AC('a101','CR1',{title:T('Decision framing worksheet','ورقة عمل صياغة القرار'), instructions:T('Choose one recurring decision in your unit and frame it as a testable question with a success metric.','اختر قرارًا متكررًا في وحدتك وصِغه كسؤال قابل للاختبار مع مؤشر نجاح.'), type:'text', dueOffset:-12, cohortId:'CH1A'});
  AC('a102','CR1',{title:T('Capstone evidence briefing','إحاطة الأدلة الختامية'), instructions:T('Upload a one-page briefing with a recommendation, supporting evidence and limitations.','ارفع إحاطة من صفحة واحدة تتضمن توصية وأدلة داعمة وحدودًا.'), type:'file', objectiveId:'O3', dueOffset:-10, cohortId:'CH1A'});
  AC('a201','CR3',{title:T('Map your demand data sources','حصر مصادر بيانات الطلب'), instructions:T('List the systems that hold demand, inventory and shipment data in your team, with their owners.','اذكر الأنظمة التي تحتوي على بيانات الطلب والمخزون والشحنات في فريقك مع مالكيها.'), type:'text', dueOffset:-2});
  AC('a202','CR3',{title:T('Forecast accuracy exercise','تمرين دقة التنبؤ'), instructions:T('Calculate MAPE and bias for the sample series in the workbook and comment on the results.','احسب MAPE والانحياز للسلسلة النموذجية في المصنف وعلّق على النتائج.'), type:'file', objectiveId:'O2', dueOffset:-1});
  AC('a203','CR3',{title:T('Route optimization lab submission','تسليم مختبر تحسين المسارات'), instructions:T('Upload your lab notebook or summarize your optimized route and estimated savings.','ارفع دفتر المختبر أو لخّص المسار المحسّن والوفورات المتوقعة.'), type:'file', objectiveId:'O2', dueOffset:0, sessionId:'CH3-D3-S2'});
  AC('a204','CR3',{title:T('Knowledge check — Day 2','اختبار قصير — اليوم الثاني'), instructions:T('Three quick questions to check your understanding. Your score is shown immediately.','ثلاثة أسئلة سريعة لقياس فهمك. تظهر النتيجة مباشرة.'), type:'quiz', objectiveId:'O2', dueOffset:1, questions:JSON.parse(JSON.stringify(QUIZ_SC))});
  AC('a205','CR3',{title:T('Capstone slide deck (team)','عرض المشروع الختامي (فريق)'), instructions:T('Submit your team’s capstone slides before the final session.','سلّم شرائح المشروع الختامي لفريقك قبل الجلسة الأخيرة.'), type:'file', grouping:'group', objectiveId:'O3', dueOffset:1});
  AC('a301','CR2',{title:T('Story outline','مخطط القصة'), instructions:T('Draft a three-part outline for an executive data story.','اكتب مخططًا من ثلاثة أجزاء لقصة بيانات تنفيذية.'), type:'reflection', objectiveId:'O2', dueOffset:10, status:'draft'});
  const sub = (aid, ids, off, hm, reviewed) => ids.forEach((paid,i)=>{ D.submissions[aid+':'+paid] = {at: ts(off,hm)+i*7*60000, text:'Sample submission text (fictional).', fileName: '', reviewed: !!reviewed}; });
  sub('a101',['pa1','pa2','pa3','pa4','pa5','pa7','pa8'],-12,'17:10',true);
  sub('a102',['pa1','pa2','pa3','pa4','pa5','pa7','pa8'],-10,'15:20',true);
  sub('a201',['pa9','pa10','pa11','pa12','pa13','pa14'],-2,'18:05',true);
  sub('a202',['pa9','pa10','pa11','pa13'],-1,'19:40',false);
  sub('a203',['pa13'],0,'11:50',false);
  D.drafts['a203:pa9'] = {text:'Draft: two depots merged, estimated 11% fewer km (fictional).', at: ts(0,'12:30')};
  ['pa10','pa11','pa13'].forEach((paid,i)=> D.submissions['a204:'+paid] = {at: ts(-1,'16:05')+i*60000, score:[2,3,3][i], max:3, reviewed:true});

  /* --- Materials (trainer content; sample records have no file attached) --- */
  const M = (id, cid, chid, sid, type, en, ar, state, allowDownload, size, rel) => D.materials.push({id, courseId:cid, cohortId:chid, sessionId:sid, type, title:T(en,ar), state, allowDownload, access: allowDownload?'both':'view', size, releaseOffset: rel?rel[0]:null, releaseTime: rel?rel[1]:null, sample:true, fileKey:null, url:'', updatedAt: ts(-14,'09:00')});
  M('m101','CR1','CH1A','CH1A-D1-S1','pdf','Course handbook','دليل الدورة','available',true,'1.2 MB');
  M('m102','CR1','CH1A','CH1A-D1-S1','pptx','Slides — Framing decisions with data','شرائح — صياغة القرارات باستخدام البيانات','available',false,'24 slides');
  M('m103','CR1','CH1A','CH1A-D2-S1','xlsx','Practice dataset — maintenance records (synthetic)','بيانات تدريبية — سجلات صيانة (مصطنعة)','available',true,'310 KB');
  M('m104','CR1','CH1A','CH1A-D2-S2','video','Video — Confidence intervals explained','فيديو — شرح فترات الثقة','available',false,'14 min');
  M('m105','CR1','CH1A','CH1A-D3-S2','link','Further reading list (external, sample)','قائمة قراءات إضافية (رابط خارجي، مثال)','available',false,'—');
  M('m201','CR3','CH3','CH3-D1-S1','pdf','Program handbook','دليل البرنامج','available',true,'1.4 MB');
  M('m202','CR3','CH3','CH3-D1-S1','pptx','Slides — Supply chain data foundations','شرائح — أسس بيانات سلاسل الإمداد','available',false,'31 slides');
  M('m204','CR3','CH3','CH3-D2-S1','xlsx','Forecasting workbook','مصنف تمارين التنبؤ','available',true,'540 KB');
  M('m205','CR3','CH3','CH3-D2-S1','video','Video — Seasonality walkthrough','فيديو — شرح الموسمية','available',false,'12 min');
  M('m206','CR3','CH3','CH3-D2-S2','docx','Inventory policy template','نموذج سياسة المخزون','available',true,'120 KB');
  M('m207','CR3','CH3','CH3-D3-S1','pptx','Slides — Machine learning for logistics','شرائح — تعلم الآلة في الخدمات اللوجستية','available',false,'28 slides');
  M('m208','CR3','CH3','CH3-D3-S2','pdf','Lab guide — Route optimization','دليل المختبر — تحسين المسارات','draft',false,'860 KB');
  M('m210','CR3','CH3','CH3-D4-S1','pdf','Case study — Responsible AI in dispatch','دراسة حالة — الذكاء الاصطناعي المسؤول في التوزيع','scheduled',false,'640 KB',[1,'08:00']);
  M('m301','CR2','CH2A','CH2A-D1-S1','pptx','Slides — Choosing the right chart (draft)','شرائح — اختيار الرسم المناسب (مسودة)','draft',false,'18 slides');

  /* --- Evaluations --- */
  const E = (chid, paid, kind, day, off, pr, tr, rel, ci) => D.evaluations.push({id:'ev'+D.evaluations.length, cohortId:chid, participantId:paid, kind, day, at: ts(off,'16:20')+ri(0,40)*60000, ratings:{program:pr, trainer:tr, relevance:rel}, comment: ci==null?null:SAMPLE_COMMENTS[ci]});
  ['pa1','pa2','pa3','pa4','pa5','pa6','pa7','pa8'].forEach((paid,i)=>{
    E('CH1A',paid,'daily',1,-12,[5,4,4,5,4,4,5,4][i],[5,5,4,5,4,5,5,4][i],[5,4,4,4,4,3,5,4][i], i===0?0:null);
    if (paid!=='pa6') E('CH1A',paid,'daily',2,-11,[4,4,3,5,4,4,4,4][i],[5,4,4,5,4,4,5,5][i],[4,4,3,5,4,4,4,4][i], i===2?1:null);
    if (!['pa7','pa8'].includes(paid)) E('CH1A',paid,'daily',3,-10,[5,5,4,5,4,4,5,4][i],[5,5,5,5,4,4,5,5][i],[5,5,4,5,4,4,5,4][i], i===1?2:null);
    if (paid!=='pa8') E('CH1A',paid,'final',null,-10,[5,5,4,5,4,4,5,4][i],[5,5,5,5,4,5,5,4][i],[5,4,4,5,4,4,5,4][i], i===3?3:(i===4?5:null));
  });
  ['pa9','pa10','pa11','pa12','pa13','pa14'].forEach((paid,i)=> E('CH3',paid,'daily',1,-2,[5,4,4,4,5,4][i],[5,5,4,4,5,5][i],[5,4,4,4,5,4][i], i===4?4:null));
  ['pa10','pa11','pa13','pa14'].forEach((paid,i)=> E('CH3',paid,'daily',2,-1,[4,4,5,3][i],[5,4,5,4][i],[4,4,5,4][i], null));
  E('CH3','pa13','daily',3,0,5,5,5,null);

  /* --- Certificates --- */
  D.certs.pa1 = {state:'approved', code: certCode('pa1'), at: ts(-8,'10:12'), by:'u_coord'};
  D.certs.pa2 = {state:'approved', code: certCode('pa2'), at: ts(-8,'10:14'), by:'u_coord'};
  D.certs.pa5 = {state:'returned', at: ts(-8,'10:20'), by:'u_coord', note:T('Confirm the Day 2 afternoon absence with the trainer before approval.','يرجى تأكيد غياب جلسة اليوم الثاني المسائية مع المدرب قبل الاعتماد.')};

  /* --- Change requests (trainer → admin) --- */
  D.requests.push({id:'rq1', courseId:'CR4', from:'t1', target:'schedule', sessionId:'CH4-D1-S2', detail:'The afternoon session clashes with my site visit. Could it start at 14:00 instead of 13:00?', status:'open', at: ts(-1,'14:30')});
  D.requests.push({id:'rq2', courseId:'CR3', from:'t2', target:'room', sessionId:'CH3-D3-S2', detail:'The lab needs a room with 20 laptops.', status:'resolved', at: ts(-6,'11:00'), response:'Confirmed Training Room A-101 has laptops for the lab.', resolvedAt: ts(-5,'09:00')});

  /* --- Activity log --- */
  const Lg = (off, hm, actor, type, p) => D.log.push({id:'Ls'+D.log.length, ts: ts(off,hm), actor, type, p});
  Lg(-30,'10:05','u_admin','program_create',{prog:'PR1'}); Lg(-30,'10:40','u_admin','course_save',{prog:'PR1', course:'CR1'}); Lg(-30,'10:42','u_admin','trainer_assign',{course:'CR1', user:'t1'});
  Lg(-29,'09:15','u_admin','import',{course:'CR1', cohort:'CH1A', n:8}); Lg(-20,'10:00','t1','assessment_ready',{course:'CR1', kind:'pre'});
  Lg(-10,'16:30','t1','session_end',{course:'CR1', sid:'CH1A-D3-S2'});
  Lg(-8,'10:12','u_coord','cert_approve',{course:'CR1', pid:'pa1'}); Lg(-8,'10:14','u_coord','cert_approve',{course:'CR1', pid:'pa2'}); Lg(-8,'10:20','u_coord','cert_return',{course:'CR1', pid:'pa5'});
  Lg(-7,'11:00','u_admin','course_save',{prog:'PR1', course:'CR2'}); Lg(-7,'11:05','u_admin','trainer_assign',{course:'CR2', user:'t3'}); Lg(-7,'11:06','u_admin','notify_trainer',{course:'CR2', user:'t3'});
  Lg(-6,'11:00','t2','request_create',{course:'CR3'}); Lg(-5,'09:00','u_admin','request_resolve',{course:'CR3'});
  Lg(-4,'12:00','u_admin','course_save',{prog:'PR2', course:'CR4'}); Lg(-4,'12:10','u_admin','session_save',{course:'CR4', sid:'CH4-D1-S2'});
  Lg(-3,'14:00','u_admin','program_create',{prog:'PR3'}); Lg(-3,'14:20','t3','assessment_save',{course:'CR2', kind:'pre'}); Lg(-2,'08:30','t2','material_release',{course:'CR3', mid:'m201'});
  Lg(-1,'14:30','t1','request_create',{course:'CR4'}); Lg(0,'08:58','t2','session_start',{course:'CR3', sid:'CH3-D3-S1'});
  Object.entries(D.attendance['CH3-D3-S1']).forEach(([paid,r])=> D.log.push({id:'Lc'+paid, ts:r.at, actor:paid, type:'checkin', p:{course:'CR3', sid:'CH3-D3-S1', pid:paid, status:r.status}}));
  D.rejected['CH3-D3-S1'].forEach(r=> D.log.push({id:'Lr'+r.id, ts:r.at, actor:r.paid, type:'checkin_rejected', p:{course:'CR3', sid:'CH3-D3-S1', pid:r.paid, reason:r.reason}}));
  Lg(0,'11:50','pa13','submission',{course:'CR3', pid:'pa13', aid:'a203'}); Lg(0,'12:04','t2','session_end',{course:'CR3', sid:'CH3-D3-S1'});
  /* --- Access scope: instructor teams, session staffing, assigned KAUST Program Coordinators --- */
  migrate(D);
  D.programs.find(p=>p.id==='PR1').coordinatorIds = ['u_coord','u_coord2'];
  D.programs.find(p=>p.id==='PR2').coordinatorIds = ['u_coord'];
  D.programs.find(p=>p.id==='PR3').coordinatorIds = [];
  const cr3 = D.courses.find(c=>c.id==='CR3'); cr3.instructorIds = ['t2','t1']; cr3.leadId = 't2'; cr3.trainerId = 't2';
  D.sessions.filter(x=>x.courseId==='CR3').forEach(x=>{ x.instructorIds = ['t2']; x.leadId = 't2'; });
  Object.assign(D.sessions.find(x=>x.id==='CH3-D4-S1'), {instructorIds:['t1'], leadId:'t1'});
  Object.assign(D.sessions.find(x=>x.id==='CH3-D4-S2'), {instructorIds:['t2','t1'], leadId:'t2'});
  Lg(-6,'10:00','u_admin','trainer_assign',{course:'CR3', user:'t1'});
  D.log.sort((a,b)=>a.ts-b.ts);
  return D;
}

