import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'http://localhost',process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'anon');
export const signInGoogle=()=>supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:typeof window!=='undefined'?window.location.origin:undefined}});
export const signOut=()=>supabase.auth.signOut();
