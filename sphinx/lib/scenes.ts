// Map scene ids to GLB files in /public/models. `scale` converts a model to metres; tune per model.
// `final` = the closing scene: reaching it from the previous chapter plays the ending cutscene instead of gameplay.
export type SceneDef={id:string;file:string;scale:number;fog:[string,number];ambient:number;signal:number;spawn?:[number,number,number];final?:boolean};
export const SCENES:Record<string,SceneDef>={
 bathroom_interior:{id:'bathroom_interior',file:'bathroom_interior.glb',scale:1,fog:['#0b0d10',.08],ambient:.35,signal:2},
 abandoned_warehouse:{id:'abandoned_warehouse',file:'abandoned_warehouse_-_interior_scene.glb',scale:1,fog:['#0a0a0c',.06],ambient:.15,signal:0},
 southwark_borough_bunker:{id:'southwark_borough_bunker',file:'southwark_borough_control_bunker.glb',scale:1,fog:['#080a0a',.09],ambient:.1,signal:0},
 st_pancras_new_church_crypt:{id:'st_pancras_new_church_crypt',file:'st_pancras_new_church_crypt.glb',scale:1,fog:['#07080b',.1],ambient:.08,signal:0},
 the_hallwyl_museum:{id:'the_hallwyl_museum',file:'the_hallwyl_museum_1st_floor_combined.glb',scale:1,fog:['#12100d',.04],ambient:.5,signal:3},
 // The Great Hall: a ~24 m corridor running along +x (floor y≈0.3, z centre ≈ -3.25). Spawn = west end, looking down the hall.
 great_hall:{id:'great_hall',file:'greathall.glb',scale:1,fog:['#050406',.042],ambient:.2,signal:0,spawn:[-8.9,0.3,-3.25],final:true}};
export const ORDER=Object.keys(SCENES);
export const NOUR_URL='/models/beautiful_young_woman_wearing_a_floral_dress.glb';
export const CHARACTERS={player:'algerian_man.glb',nour:'beautiful_young_woman_wearing_a_floral_dress.glb'};
// Everything that must be 100 % loaded before a scene (or its cutscene) is allowed to start.
export const assetsFor=(scene:string,cutscene:boolean)=>{
 const d=SCENES[scene];const out:{url:string;optional?:boolean}[]=[{url:`/models/${d?.file||scene+'.glb'}`}];
 if(cutscene)out.push({url:NOUR_URL,optional:true});   // Nour has a placeholder fallback, so a broken file never soft-locks the game
 return out};
