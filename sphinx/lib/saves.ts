import { supabase } from './supabase';
import { useGame } from './store';
import { world } from './world';
const KEY='sphinx_save';let t:any;
export async function save(){const s=useGame.getState();const data={scene:s.scene,position:world.pos,inventory:s.inventory,achievements:s.achievements,flags:s.flags};
 localStorage.setItem(KEY,JSON.stringify(data));
 if(s.user){await supabase.from('user_saves').upsert({user_id:s.user.id,data,updated_at:new Date().toISOString()});
  await supabase.from('profiles').update({achievements:s.achievements,completion:Math.min(100,Math.round(s.achievements.length*10)),updated_at:new Date().toISOString()}).eq('id',s.user.id)}}
export const autosave=()=>{clearTimeout(t);t=setTimeout(save,400)};
export async function load(){const s=useGame.getState();let d:any=null;
 if(s.user){const r=await supabase.from('user_saves').select('data').eq('user_id',s.user.id).maybeSingle();d=r.data?.data}
 if(!d){const l=localStorage.getItem(KEY);d=l&&JSON.parse(l)}
 if(d){useGame.setState({scene:d.scene||s.scene,inventory:d.inventory||[],achievements:d.achievements||[],flags:d.flags||{}});world.restore=d.position?.length===3?d.position:null}return !!d}
