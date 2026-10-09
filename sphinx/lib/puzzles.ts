// Puzzle-gated progression. Nothing lies around to be picked up: every item is given by solving something.
// Interactables are placed at measured positions from lib/layout.ts (ids must match).
// kinds: clue (read a note) | code (keypad) | switch (flip/turn something) | container (opens, may need a flag/item) | exit (door to next scene)
type T={en:string;ar:string};
export type Pz={id:string;kind:'clue'|'code'|'switch'|'container'|'exit';off:[number,number];en:string;ar:string;
  code?:string;give?:string;need?:string;        // keypad answer / item given on success / item required
  reqFlag?:string;showIf?:string;                // flag required to use it / flag required for it to even be noticed
  photo?:boolean;fx?:'power'|'sting';focus?:string; // phone-camera clue / environmental effect / camera looks at this interactable afterwards
  note?:{title:T;text:T};                        // paper note shown when read
  mono?:T;locked?:T;needMsg?:T;wrong?:T};        // monologue on success / when requirement not met / when item missing / wrong code

export const PUZ:Record<string,Pz[]>={
 bathroom_interior:[
  {id:'b_mirror',kind:'clue',off:[0,-1],photo:true,en:'Examine the mirror',ar:'افحص المرآة',
   note:{title:{en:'The mirror',ar:'المرآة'},text:{en:'Four digits, drawn by a finger in the fog:\n\n1 · 9 · 0 · 4',ar:'أربعة أرقام رُسمت بإصبعٍ على البخار:\n\n1 · 9 · 0 · 4'}},
   mono:{en:'Somebody wrote numbers in the fog. Fresh. Why show them to me?',ar:'أحدهم كتب أرقاماً على البخار. حديثة. لماذا يُريني إياها؟'}},
  {id:'b_cabinet',kind:'code',off:[1,0],code:'1904',give:'ink',showIf:'b_mirror',en:'Open the cabinet',ar:'افتح الخزانة',
   wrong:{en:'No. Four digits… the mirror had four digits.',ar:'لا. أربعة أرقام… المرآة كانت تحمل أربعة أرقام.'},
   mono:{en:'Ink. Black, and still wet. Who leaves this behind?',ar:'حبر. أسود وما يزال رطباً. من يترك هذا خلفه؟'}},
  {id:'b_tap',kind:'switch',off:[1,1],showIf:'b_cabinet',en:'Close the tap',ar:'أغلق الصنبور',focus:'b_cistern',
   mono:{en:'The pipes stop knocking. The cistern should open now.',ar:'توقفت الأنابيب عن الطَّرق. يجب أن يُفتح الخزان الآن.'}},
  {id:'b_cistern',kind:'container',off:[0,1],give:'pendant',reqFlag:'b_tap',en:'Open the cistern',ar:'افتح الخزان',
   locked:{en:'The lid will not budge. The water pressure holds it shut… the tap.',ar:'الغطاء لا يتحرك. ضغط الماء يُبقيه مغلقاً… الصنبور.'},
   mono:{en:'My pendant. The sphinx engraving is faint, almost gone.',ar:'قلادتي. نقش أبي الهول باهتٌ كاد يختفي.'}},
  {id:'b_door',kind:'exit',off:[0,2],need:'inked_pendant',reqFlag:'b_cistern',en:'Try the door',ar:'جرّب الباب',
   needMsg:{en:'Locked. The keyhole is carved with a sphinx, like my pendant — but the engraving is too faint. Ink might bring it back.',ar:'مقفل. ثقب المفتاح منقوش بأبي الهول كقلادتي، لكن النقش باهت. ربما يُعيده الحبر.'},
   mono:{en:'It fits.',ar:'إنها تناسبه.'}}],
 abandoned_warehouse:[
  {id:'w_crate',kind:'clue',off:[0,-1],photo:true,en:'Read the crate label',ar:'اقرأ ملصق الصندوق',
   note:{title:{en:'Shipping label',ar:'ملصق الشحن'},text:{en:'FRAGILE — HANDLE WITH CARE\n\nBreaker sequence: 7 · 3 · 1\nSigned: N.',ar:'قابل للكسر — تعامل بحذر\n\nتسلسل القواطع: 7 · 3 · 1\nالتوقيع: ن.'}},
   mono:{en:'"N." Nour? … A breaker sequence. The fuse box must be nearby.',ar:'«ن.» نور؟ … تسلسل قواطع. لا بد أن صندوق الفيوزات قريب.'}},
  {id:'w_fuse',kind:'code',off:[1,0],code:'731',showIf:'w_crate',fx:'power',focus:'w_locker',en:'Open the fuse box',ar:'افتح صندوق الفيوزات',
   wrong:{en:'Wrong sequence. The crate label had a breaker sequence.',ar:'تسلسل خاطئ. ملصق الصندوق كان يحمل تسلسل القواطع.'},
   mono:{en:'The lights hum back to life. Something shifts in the dark.',ar:'عادت الأضواء تُطنّ. شيءٌ ما يتحرك في العتمة.'}},
  {id:'w_locker',kind:'container',off:[-1,0],give:'batteries',reqFlag:'w_fuse',en:'Open the locker',ar:'افتح الخزانة',
   locked:{en:'An electronic locker. Dead. No power.',ar:'خزانة إلكترونية ميتة. لا طاقة.'},
   mono:{en:'Two AA batteries. Barely warm. Something needs them.',ar:'بطاريتان صغيرتان. دافئتان قليلاً. شيء ما يحتاجهما.'}},
  {id:'w_desk',kind:'container',off:[0,1],give:'cassette',showIf:'w_crate',en:'Search the desk',ar:'فتّش المكتب',
   mono:{en:'An old cassette player. Dead weight without batteries.',ar:'مشغّل أشرطة قديم. بلا بطاريات لا يعمل.'}},
  {id:'w_gate',kind:'exit',off:[0,2],need:'tape_player',en:'Try the shutter',ar:'جرّب البوابة',
   needMsg:{en:'The shutter is sealed. Someone left a tape here for a reason. If only I could play it.',ar:'البوابة موصدة. تركوا شريطاً هنا لسبب. لو استطعت تشغيله.'},
   mono:{en:'The shutter rolls up. Cold air.',ar:'ترتفع البوابة. هواء بارد.'}}],
 southwark_borough_bunker:[
  {id:'k_panel',kind:'switch',off:[1,0],fx:'power',focus:'k_term',en:'Flip the relay',ar:'اقلب المرحّل',
   mono:{en:'A relay clicks. Somewhere a screen flickers awake.',ar:'يطقطق مرحّل. في مكانٍ ما تستيقظ شاشة.'}},
  {id:'k_term',kind:'clue',off:[0,-1],photo:true,reqFlag:'k_panel',en:'Read the terminal',ar:'اقرأ الشاشة',
   locked:{en:'A dead screen. The relay panel on the wall might feed it.',ar:'شاشة ميتة. لوحة المرحّل على الجدار ربما تغذيها.'},
   note:{title:{en:'Terminal log',ar:'سجل الشاشة'},text:{en:'LOG 14/08/15\n\nSubject moved to the crypt.\nLocker code: 0 · 8 · 1 · 5',ar:'سجل 14/08/15\n\nنُقلت إلى السرداب.\nرمز الخزانة: 0 · 8 · 1 · 5'}},
   mono:{en:'"Moved to the crypt." Moved… by whom?',ar:'«نُقلت إلى السرداب». نقلها… من؟'}},
  {id:'k_locker',kind:'code',off:[-1,0],code:'0815',give:'keycard',showIf:'k_term',en:'Open the locker',ar:'افتح الخزانة',
   wrong:{en:'Wrong. The log had a four-digit locker code.',ar:'خطأ. السجل كان فيه رمز خزانة من أربعة أرقام.'},
   mono:{en:'A keycard, "B-2" faded on it.',ar:'بطاقة دخول، «B-2» باهتة عليها.'}},
  {id:'k_door',kind:'exit',off:[0,2],need:'keycard',en:'Try the door',ar:'جرّب الباب',
   needMsg:{en:'The reader blinks red. It wants a keycard.',ar:'القارئ يومض بالأحمر. يريد بطاقة دخول.'},
   mono:{en:'Green light. The lock releases.',ar:'ضوء أخضر. ينفك القفل.'}}],
 st_pancras_new_church_crypt:[
  {id:'c_candles',kind:'switch',off:[1,0],fx:'sting',focus:'c_ins',en:'Light the candles',ar:'أشعل الشموع',
   mono:{en:'The flames reveal letters carved in the stone.',ar:'تكشف اللهبات حروفاً منحوتة في الحجر.'}},
  {id:'c_ins',kind:'clue',off:[0,-1],photo:true,reqFlag:'c_candles',en:'Study the inscription',ar:'تأمل النقش',
   locked:{en:'Too dark to read the carving. I need light.',ar:'الظلام شديد لقراءة النقش. أحتاج إلى ضوء.'},
   note:{title:{en:'Inscription',ar:'النقش'},text:{en:'Where the Sphinx looks,\ncount the stars:\n\n5 · 2 · 9',ar:'حيث ينظر أبو الهول،\nعُدّ النجوم:\n\n5 · 2 · 9'}},
   mono:{en:'The same sphinx as on my pendant. Five, two, nine.',ar:'أبو الهول نفسه كما على قلادتي. خمسة، اثنان، تسعة.'}},
  {id:'c_slab',kind:'code',off:[-1,0],code:'529',showIf:'c_ins',fx:'sting',focus:'c_tomb',en:'Turn the stone dial',ar:'أدر قرص الحجر',
   wrong:{en:'Nothing. The inscription gave three numbers.',ar:'لا شيء. النقش أعطاني ثلاثة أرقام.'},
   mono:{en:'Stone grinds on stone. A recess opens, shaped like my pendant.',ar:'يحتكّ الحجر بالحجر. يتّسع تجويف على شكل قلادتي.'}},
  {id:'c_tomb',kind:'exit',off:[0,2],need:'inked_pendant',reqFlag:'c_slab',en:'Examine the tomb',ar:'افحص القبر',
   locked:{en:'The tomb is sealed. There must be a mechanism nearby.',ar:'القبر مختوم. لا بد من آلية قريبة.'},
   needMsg:{en:'The recess wants my pendant — the inked one.',ar:'التجويف يريد قلادتي — الموشومة بالحبر.'},
   mono:{en:'It fits. The pendant clicks into place.',ar:'إنها تناسبه. تنقر القلادة في مكانها.'}}],
 the_hallwyl_museum:[
  {id:'m_plaque',kind:'clue',off:[-1,0],photo:true,en:'Read the plaque',ar:'اقرأ اللوحة',
   note:{title:{en:'Brass plaque',ar:'لوحة نحاسية'},text:{en:'The Sphinx watches the one who returns.\n\nOpen the hall with the lever.',ar:'أبو الهول يراقب من يعود.\n\nافتح القاعة بالرافعة.'}},
   mono:{en:'It was waiting for me to return. A lever, then.',ar:'كان ينتظر عودتي. رافعة إذن.'}},
  {id:'m_lever',kind:'switch',off:[1,0],showIf:'m_plaque',fx:'power',focus:'m_hall',en:'Pull the lever',ar:'اسحب الرافعة',
   mono:{en:'Machinery groans behind the walls. The great hall is open.',ar:'تئنّ آلات خلف الجدران. القاعة الكبرى مفتوحة.'}},
  {id:'m_hall',kind:'exit',off:[0,3],reqFlag:'m_lever',en:'Enter the great hall',ar:'ادخل القاعة الكبرى',
   locked:{en:'The doors will not move. There must be a lever somewhere in this room.',ar:'الأبواب لا تتحرك. لا بد من رافعة في مكانٍ ما بهذه الغرفة.'},
   mono:{en:'Nour… I am coming.',ar:'نور… أنا قادم.'}}]};

// Opening thought of each scene (shown once, a moment after the player gets control)
export const INTRO:Record<string,T>={
 bathroom_interior:{en:'My head… Where am I? The door is locked. Think.',ar:'رأسي… أين أنا؟ الباب مقفل. فكّر.'},
 abandoned_warehouse:{en:'Cold. Dust. Whoever was here left in a hurry.',ar:'برد. غبار. من كان هنا غادر مسرعاً.'},
 southwark_borough_bunker:{en:'No signal. Of course. And every screen is dead.',ar:'لا إشارة. طبعاً. وكل الشاشات ميتة.'},
 st_pancras_new_church_crypt:{en:'So quiet. Even my footsteps feel like trespassing.',ar:'هدوء شديد. حتى خطواتي تبدو تعدّياً.'},
 the_hallwyl_museum:{en:'She is here. I can feel it.',ar:'إنها هنا. أشعر بذلك.'}};

// "What now?" ladder: the first rule that matches is the current objective (also shown as a gentle nudge when the player stalls)
type F=Record<string,boolean>;
const H=(en:string,ar:string):T=>({en,ar});
export const nextHint=(scene:string,f:F,inv:string[]):T|null=>{
 switch(scene){
  case 'bathroom_interior':
   if(!f.b_mirror)return H('The mirror is fogged over… something is drawn in it.','المرآة مغطاة بالبخار… شيء مرسوم عليها.');
   if(!f.b_cabinet)return H('The cabinet has a four-digit lock. The mirror gave me four digits.','الخزانة لها قفل من أربعة أرقام. المرآة أعطتني أربعة أرقام.');
   if(!f.b_tap)return H('Something heavy holds the cistern lid down. The pipes are knocking — the tap.','شيء ثقيل يُثبّت غطاء الخزان. الأنابيب تطرق — الصنبور.');
   if(!f.b_cistern)return H('The cistern should open now.','يجب أن يُفتح الخزان الآن.');
   if(!inv.includes('inked_pendant'))return H("The pendant's engraving is faint. Ink might bring it back — I should combine them.",'نقش القلادة باهت. ربما يُعيده الحبر — عليّ دمجهما.');
   return H('The door. The keyhole matches the pendant.','الباب. ثقب المفتاح يطابق القلادة.');
  case 'abandoned_warehouse':
   if(!f.w_crate)return H('That crate has a label. It may say who was here.','على ذلك الصندوق ملصق. ربما يقول من كان هنا.');
   if(!f.w_fuse)return H('The label gave a breaker sequence. The fuse box is on a wall somewhere.','الملصق أعطاني تسلسل قواطع. صندوق الفيوزات على جدارٍ ما.');
   if(!f.w_locker)return H('The power is on. The electronic locker should open now.','الكهرباء تعمل. يجب أن تُفتح الخزانة الإلكترونية الآن.');
   if(!f.w_desk)return H('There is a desk. Something might be in its drawers.','هناك مكتب. ربما في أدراجه شيء.');
   if(!inv.includes('tape_player'))return H('Batteries and a cassette player. They belong together.','بطاريات ومشغّل أشرطة. مكانهما معاً.');
   return H('The shutter. The tape is playing — time to leave.','البوابة. الشريط يعمل — حان وقت الرحيل.');
  case 'southwark_borough_bunker':
   if(!f.k_panel)return H('No power. A relay panel on the wall might wake the terminal.','لا كهرباء. لوحة مرحّل على الجدار قد توقظ الشاشة.');
   if(!f.k_term)return H('The terminal is alive. I should read it.','الشاشة تعمل. عليّ قراءتها.');
   if(!f.k_locker)return H('The log mentioned a locker code — four digits.','السجل ذكر رمز خزانة — أربعة أرقام.');
   return H('The keycard. The door reader is blinking red.','البطاقة. قارئ الباب يومض بالأحمر.');
  case 'st_pancras_new_church_crypt':
   if(!f.c_candles)return H('Too dark to read anything. The candles…','الظلام شديد لقراءة أي شيء. الشموع…');
   if(!f.c_ins)return H('Letters are carved in the stone. Read them.','حروف منحوتة في الحجر. اقرأها.');
   if(!f.c_slab)return H('The inscription gave three numbers. A stone dial somewhere takes them.','النقش أعطاني ثلاثة أرقام. قرص حجري ما يقبلها.');
   return H('The recess is shaped like my pendant. The inked one.','التجويف على شكل قلادتي. الموشومة بالحبر.');
  case 'the_hallwyl_museum':
   if(!f.m_plaque)return H('A brass plaque by the wall. It may explain this place.','لوحة نحاسية عند الجدار. ربما تشرح هذا المكان.');
   if(!f.m_lever)return H('The plaque mentioned a lever.','اللوحة ذكرت رافعة.');
   return H('The great hall is open. Nour is waiting.','القاعة الكبرى مفتوحة. نور تنتظر.');
 me}return null};

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
 the_hallwyl_museum:{en:'Chapter V — The Museum. She was always one room ahead.',ar:'الفصل الخامس — المتحف. كانت دائماً تسبقك بغرفة.',g:'#2a1a1a'},
 great_hall:{en:'The Great Hall. At the end of the corridor, someone is waiting.',ar:'القاعة الكبرى. في نهاية الممر، أحدٌ ينتظر.',g:'#150d10'}};
