// Chat content. req = inventory item id or flag that must be present for the message to appear.
export type Msg={d:'in'|'out';en:string;ar:string;st?:[string,string];req?:string};
export type Chat={id:string;icon:string;en:string;ar:string;m:Msg[]};
const outs:[string,string][]=[["Where are you?","أين أنتِ؟"],["Please just reply.","أرجوكِ ردّي فقط."],["I'm worried about you.","أنا قلق عليكِ."],["Pick up. Anything.","أجيبي. أي شيء."],["Nour?","نور؟"],["I'm coming to find you.","سآتي لأجدكِ."]];
const stamps:[string,string][]=[["3 weeks ago","قبل 3 أسابيع"],["2 weeks ago","قبل أسبوعين"],["Last week","الأسبوع الماضي"],["3 days ago","قبل 3 أيام"],["Yesterday","أمس"],["Tonight","الليلة"]];
const nourOut:Msg[]=Array.from({length:36},(_,i)=>({d:'out',en:outs[i%6][0],ar:outs[i%6][1],st:i%6===0?stamps[Math.floor(i/6)]:undefined}));
export const CHATS:Chat[]=[
 {id:'nour',icon:'♥',en:'Nour',ar:'نور',m:[...nourOut,
  {d:'in',en:'…you found it?',ar:'…وجدتَها؟',req:'pendant',st:['Now','الآن']},
  {d:'in',en:'The ink brings the letters back. Hurry.',ar:'الحبر يُرجع الحروف. أسرع.',req:'inked_pendant'},
  {d:'in',en:'Do not trust the voice on the phone.',ar:'لا تثق بالصوت الذي في الهاتف.',req:'tape_player'},
  {d:'in',en:'I am in the museum. Come to the great hall.',ar:'أنا في المتحف. تعالَ إلى القاعة الكبرى.',req:'ph_m_plaque'}]},
 {id:'mom',icon:'☾',en:'Mom',ar:'أمي',m:[{d:'in',en:'Dinner on Friday? Bring Nour.',ar:'عشاء الجمعة؟ أحضر نور معك.',st:['2 weeks ago','قبل أسبوعين']},{d:'out',en:'Of course, Mom.',ar:'بالتأكيد يا أمي.'},{d:'in',en:'Call me when you can, habibi.',ar:'اتصل بي حين تستطيع يا حبيبي.'}]},
 {id:'yas',icon:'☕',en:'Yassine',ar:'ياسين',m:[{d:'in',en:'Call me when you land.',ar:'اتصل بي حين تصل.',st:['Last week','الأسبوع الماضي']},{d:'out',en:'Will do.',ar:'حاضر.'},{d:'in',en:'Did you hear from her yet?',ar:'هل سمعتَ منها بعد؟',st:['3 days ago','قبل 3 أيام']}]},
 {id:'unk',icon:'?',en:'Unknown',ar:'مجهول',m:[{d:'in',en:'Stop looking.',ar:'توقف عن البحث.',req:'ph_b_mirror',st:['Now','الآن']},{d:'in',en:'I warned you about her fate.',ar:'لقد حذّرتك من مصيرها.',req:'ph_k_term'}]}];
export const GOALS:Record<string,[string,string]>={bathroom_interior:['Find the ink and the pendant, combine them, and open the door.','اعثر على الحبر والقلادة، ادمجهما، ثم افتح الباب.'],abandoned_warehouse:['Get the cassette player working, then open the shutter.','شغّل مشغّل الأشرطة ثم افتح البوابة.'],southwark_borough_bunker:['Find the keycard and unlock the door. No signal here.','اعثر على البطاقة وافتح الباب. لا توجد إشارة هنا.'],st_pancras_new_church_crypt:['Read the inscription and use the inked pendant on the tomb.','اقرأ النقش واستخدم القلادة الموشومة على القبر.'],the_hallwyl_museum:['Find Nour. Enter the great hall.','اعثر على نور. ادخل القاعة الكبرى.']};
