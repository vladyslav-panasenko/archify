export const presetKey='archify-layout-presets:v1';
export function validSettings(s){return s&&['grid','directed','anchored','resolve'].includes(s.mode)&&['right','down'].includes(s.direction)&&Number.isFinite(s.gap)&&s.gap>=16&&s.gap<=500&&Number.isInteger(s.gridSize)&&s.gridSize>=1&&s.gridSize<=200&&typeof s.snap==='boolean'&&typeof s.smartSnap==='boolean';}
export function readPresets(storage){try{const raw=storage.getItem(presetKey)||'[]';if(raw.length>65536)return [];const values=JSON.parse(raw);return Array.isArray(values)?values.filter(p=>typeof p.name==='string'&&p.name.trim()&&p.name.length<=60&&validSettings(p.settings)).slice(0,20):[];}catch{return [];}}
export function savePreset(storage,name,settings){name=name.trim();if(!name||name.length>60||!validSettings(settings))throw new Error('Use a name of 1–60 characters and valid layout settings.');const entries=readPresets(storage).filter(p=>p.name!==name);if(entries.length>=20)throw new Error('Delete a preset before adding more than 20.');entries.push({name,settings:{mode:settings.mode,direction:settings.direction,gap:settings.gap,gridSize:settings.gridSize,snap:settings.snap,smartSnap:settings.smartSnap}});storage.setItem(presetKey,JSON.stringify(entries));return entries;}
export function exportPresets(entries){return {format:'archify-layout-presets',version:1,presets:entries};}
export function importPresets(existing,bundle,replace=false){
 if(bundle?.format!=='archify-layout-presets'||bundle.version!==1||!Array.isArray(bundle.presets))throw new Error('Choose an Archify layout preset bundle version 1.');
 const incoming=bundle.presets.map(p=>({name:String(p?.name||'').trim(),settings:p?.settings}));
 if(incoming.some(p=>!p.name||p.name.length>60||!validSettings(p.settings)))throw new Error('The preset bundle contains an invalid name or setting.');
 const names=new Set(existing.map(p=>p.name)),duplicates=incoming.filter(p=>names.has(p.name)).map(p=>p.name);
 if(duplicates.length&&!replace)throw Object.assign(new Error(`Preset names already exist: ${duplicates.join(', ')}. Choose replace to continue.`),{duplicates});
 const next=[...existing.filter(p=>!incoming.some(v=>v.name===p.name)),...incoming];
 if(next.length>20||JSON.stringify(next).length>65536)throw new Error('Imported presets exceed the 20 preset / 64 KB limit.');
 return next;
}
