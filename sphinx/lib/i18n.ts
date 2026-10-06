import { useGame } from './store';
export const D={en:{tap:'Tap to begin',start:'Start game',cont:'Continue',login:'Sign in with Google',logout:'Sign out',stamina:'Stamina',quality:'Quality',lang:'Language',
 loading:'Loading',hint:['Dark rooms hide what the flashlight skips.','Crouching makes your steps quieter.','There is no signal underground.'],tbc:'To be continued in Part 2…',
 s1:'…Nour?',s2:'Nour! Wait—',s3:'No. No, no—',ach_photo:'First clue photographed',ach_warn:'The Warning',ach_craft:'Craftsman',ach_end:'Part 1 complete',noSvc:'No service',interact:'Press E'},
 ar:{tap:'المس الشاشة للبدء',start:'ابدأ اللعبة',cont:'متابعة',login:'الدخول عبر جوجل',logout:'تسجيل الخروج',stamina:'التحمّل',quality:'الجودة',lang:'اللغة',
 loading:'جارٍ التحميل',hint:['الغرف المظلمة تخفي ما يفوته المصباح.','الانحناء يجعل خطواتك أخفّ صوتاً.','لا توجد إشارة تحت الأرض.'],tbc:'يتبع في الجزء الثاني…',
 s1:'…نور؟',s2:'نور! انتظري—',s3:'لا. لا، لا—',ach_photo:'أول دليل مصوَّر',ach_warn:'التحذير',ach_craft:'الحِرفي',ach_end:'اكتمل الجزء الأول',noSvc:'لا توجد خدمة',interact:'اضغط E'}};
export const useT=()=>{const l=useGame(s=>s.lang);return (k:string)=>(D[l] as any)[k] as any};
