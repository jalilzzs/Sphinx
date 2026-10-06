// Interactables are placed as offsets [x,z] (metres) from each scene's spawn point. Tune them per model after loading.
export type Pz={id:string;kind:'item'|'clue'|'exit';off:[number,number];give?:string;need?:string;photo?:boolean;ach?:string;en:string;ar:string;txtEn?:string;txtAr?:string};
export const PUZ:Record<string,Pz[]>={
 bathroom_interior:[
  {id:'b_ink',kind:'item',off:[2,1],give:'ink',en:'Take the ink',ar:'خذ الحبر'},
  {id:'b_pend',kind:'item',off:[-2,1.5],give:'pendant',en:'Take the pendant',ar:'خذ القلادة'},
  {id:'b_mirror',kind:'clue',off:[0,-3],photo:true,en:'Examine the mirror',ar:'افحص المرآة',txtEn:'Fogged letters: "She left the sphinx behind."',txtAr:'حروف على البخار: «تركت أبا الهول خلفها.»'},
  {id:'b_door',kind:'exit',off:[0,3.5],need:'inked_pendant',en:'Open the door',ar:'افتح الباب'}],
 abandoned_warehouse:[
  {id:'w_bat',kind:'item',off:[2,1],give:'batteries',en:'Take the batteries',ar:'خذ البطاريات'},
  {id:'w_cas',kind:'item',off:[-2.5,2],give:'cassette',en:'Take the cassette player',ar:'خذ مشغّل الأشرطة'},
  {id:'w_crate',kind:'clue',off:[0,-3.5],photo:true,en:'Read the crate label',ar:'اقرأ ملصق الصندوق',txtEn:'Shipping note signed "N."',txtAr:'ورقة شحن موقّعة «ن.»'},
  {id:'w_gate',kind:'exit',off:[0,4],need:'tape_player',en:'Use the shutter',ar:'استخدم البوابة',txtEn:'',txtAr:''}],
 southwark_borough_bunker:[
  {id:'k_key',kind:'item',off:[2,-1],give:'keycard',en:'Take the keycard',ar:'خذ البطاقة'},
  {id:'k_term',kind:'clue',off:[-2,2],photo:true,en:'Read the terminal',ar:'اقرأ الشاشة',txtEn:'Log: "Subject moved to the crypt."',txtAr:'سجل: «نُقلت إلى السرداب.»'},
  {id:'k_door',kind:'exit',off:[0,4],need:'keycard',en:'Swipe the keycard',ar:'مرّر البطاقة'}],
 st_pancras_new_church_crypt:[
  {id:'c_ins',kind:'clue',off:[0,-3],photo:true,en:'Study the inscription',ar:'تأمل النقش',txtEn:'The carving matches the pendant.',txtAr:'النقش يطابق القلادة.'},
  {id:'c_tomb',kind:'exit',off:[0,3.5],need:'inked_pendant',en:'Place the pendant',ar:'ضع القلادة'}],
 the_hallwyl_museum:[
  {id:'m_plaque',kind:'clue',off:[-2,2],photo:true,en:'Read the plaque',ar:'اقرأ اللوحة',txtEn:'"The Sphinx watches the one who returns."',txtAr:'«أبو الهول يراقب من يعود.»'},
  {id:'m_hall',kind:'exit',off:[0,5],en:'Enter the great hall',ar:'ادخل القاعة الكبرى'}]};
export const ITEMS:Record<string,{en:string;ar:string;dEn:string;dAr:string;color:string;shape:string}>={
 ink:{en:'Ink',ar:'حبر',dEn:'A vial of black ink, still wet.',dAr:'قارورة حبر أسود لا يزال رطباً.',color:'#111',shape:'vial'},
 pendant:{en:'Pendant',ar:'قلادة',dEn:'A silver pendant with a sphinx etched on it.',dAr:'قلادة فضية نُقش عليها أبو الهول.',color:'#b8b8c0',shape:'pendant'},
 batteries:{en:'Batteries',ar:'بطاريات',dEn:'Two AA cells. Barely warm.',dAr:'بطاريتان صغيرتان. دافئتان قليلاً.',color:'#c9a45c',shape:'cells'},
 cassette:{en:'Cassette player',ar:'مشغّل أشرطة',dEn:'Needs power to play.',dAr:'يحتاج إلى طاقة ليعمل.',color:'#555',shape:'box'},
 inked_pendant:{en:'Inked pendant',ar:'قلادة موشومة بالحبر',dEn:'The etching now shows hidden letters.',dAr:'ظهرت على النقش حروف خفية.',color:'#6a5acd',shape:'pendant'},
 tape_player:{en:'Working player',ar:'مشغّل يعمل',dEn:'A tape inside begins to turn.',dAr:'شريط بداخله بدأ يدور.',color:'#3f8a8c',shape:'box'},
 keycard:{en:'Keycard',ar:'بطاقة دخول',dEn:'Worn magnetic strip. Faded "B-2".',dAr:'شريط ممغنط بالٍ عليه «B-2».',color:'#a8423b',shape:'card'}};
export const RECIPES:Record<string,string>={'ink+pendant':'inked_pendant','batteries+cassette':'tape_player'};
export const LORE:Record<string,{en:string;ar:string;g:string}>={
 bathroom_interior:{en:'Chapter I — The Bathroom. Every story begins with a locked door.',ar:'الفصل الأول — الحمّام. كل قصة تبدأ بباب موصد.',g:'#14262a'},
 abandoned_warehouse:{en:'Chapter II — The Warehouse. Crates keep other people\'s secrets.',ar:'الفصل الثاني — المستودع. الصناديق تحفظ أسرار الآخرين.',g:'#2a2418'},
 southwark_borough_bunker:{en:'Chapter III — The Bunker. No signal. No witnesses.',ar:'الفصل الثالث — الملجأ. لا إشارة، لا شهود.',g:'#1a2a1c'},
 st_pancras_new_church_crypt:{en:'Chapter IV — The Crypt. The dead remember what the living forget.',ar:'الفصل الرابع — السرداب. الموتى يتذكرون ما ينساه الأحياء.',g:'#241a2a'},
 the_hallwyl_museum:{en:'Chapter V — The Museum. She was always one room ahead.',ar:'الفصل الخامس — المتحف. كانت دائماً تسبقك بغرفة.',g:'#2a1a1a'}};
