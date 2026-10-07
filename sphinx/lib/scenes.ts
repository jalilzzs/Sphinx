// Map scene ids to GLB files in /public/models. `scale` converts a model to metres; tune per model.
export type SceneDef={id:string;file:string;scale:number;fog:[string,number];ambient:number;signal:number;spawn?:[number,number,number]};
export const SCENES:Record<string,SceneDef>={
 bathroom_interior:{id:'bathroom_interior',file:'bathroom_interior.glb',scale:1,fog:['#0b0d10',.08],ambient:.35,signal:2},
 abandoned_warehouse:{id:'abandoned_warehouse',file:'abandoned_warehouse_-_interior_scene.glb',scale:1,fog:['#0a0a0c',.06],ambient:.15,signal:0},
 southwark_borough_bunker:{id:'southwark_borough_bunker',file:'southwark_borough_control_bunker.glb',scale:1,fog:['#080a0a',.09],ambient:.1,signal:0},
 st_pancras_new_church_crypt:{id:'st_pancras_new_church_crypt',file:'st_pancras_new_church_crypt.glb',scale:1,fog:['#07080b',.1],ambient:.08,signal:0},
 the_hallwyl_museum:{id:'the_hallwyl_museum',file:'the_hallwyl_museum_1st_floor_combined.glb',scale:1,fog:['#12100d',.04],ambient:.5,signal:3}};
export const ORDER=Object.keys(SCENES);
export const CHARACTERS={player:'algerian_man.glb',nour:'beautiful_young_woman_wearing_a_floral_dress.glb'};
