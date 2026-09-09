import * as validators from '../../archify/renderers/shared/generated-validators.mjs';
import {schemaFor,resolveSchema} from './settings.mjs';
const escapeKey=key=>String(key).replace(/~/g,'~0').replace(/\//g,'~1');
export const lineAt=(text,offset)=>text.slice(0,offset).split('\n').length;
export function sourceIndex(text) {
  const value=JSON.parse(text),ranges=new Map();let offset=0;
  const space=()=>{while(/\s/.test(text[offset]||'!'))offset++;};
  const string=()=>{const start=offset++;while(offset<text.length){if(text[offset++]==='"')break;if(text[offset-1]==='\\')offset++;}return JSON.parse(text.slice(start,offset));};
  function read(path,depth=0) {
    if(depth>150)throw new Error('JSON nesting exceeds the editor limit.');
    space();const start=offset;const ch=text[offset];
    if(ch==='{') {offset++;space();while(text[offset]!=='}'){const key=string();space();offset++;read(`${path}/${escapeKey(key)}`,depth+1);space();if(text[offset]!==',')break;offset++;space();}offset++;}
    else if(ch==='['){offset++;space();let i=0;while(text[offset]!==']'){read(`${path}/${i++}`,depth+1);space();if(text[offset]!==',')break;offset++;}offset++;}
    else if(ch==='"')string();else {while(offset<text.length&&!/[\s,}\]]/.test(text[offset]))offset++;}
    ranges.set(path,{start,end:offset});
  }
  read('');return {value,ranges};
}
export function inspectJson(text) {
  let index;
  try {index=sourceIndex(text);}catch(e){const offset=Number(e.message.match(/position (\d+)/)?.[1]||0);return {issues:[{path:'',message:e.message,start:offset,line:lineAt(text,offset)}]};}
  const validate=validators[index.value?.diagram_type];
  const valid=typeof validate==='function'&&validate(index.value);
  const issues=valid?[]:(validate?.errors||[{instancePath:'/diagram_type',message:'Choose a supported diagram type.'}]).map(e=>{
    let path=e.instancePath||'';if(e.params?.additionalProperty)path+=`/${escapeKey(e.params.additionalProperty)}`;
    const start=index.ranges.get(path)?.start||0;
    return {path,message:`${e.message}${e.params?.missingProperty?`: ${e.params.missingProperty}`:''}`,start,line:lineAt(text,start)};
  });
  return {...index,issues};
}
export function pathAt(ranges,offset) {
  return [...ranges].filter(([,r])=>r.start<=offset&&r.end>=offset).sort((a,b)=>b[0].length-a[0].length)[0]?.[0]||'';
}
export function schemaAt(type,path) {
  const root=schemaFor(type);let spec=root;
  for(const key of path.split('/').slice(1)) {spec=resolveSchema(spec,root);spec=spec?.properties?.[key.replace(/~1/g,'/').replace(/~0/g,'~')]||spec?.prefixItems?.[Number(key)]||spec?.items||{};}
  return resolveSchema(spec,root);
}
export function suggestions(index,path) {
  if(!index.ranges)return [];
  const spec=schemaAt(index.value.diagram_type,path);
  const range=index.ranges.get(path);if(!range)return [];
  const value=path.split('/').slice(1).reduce((v,k)=>v?.[k.replace(/~1/g,'/').replace(/~0/g,'~')],index.value);
  if(spec.enum)return spec.enum.map(value=>({label:JSON.stringify(value),value,kind:'value'}));
  if(spec.const!==undefined)return [{label:JSON.stringify(spec.const),value:spec.const,kind:'value'}];
  if(spec.type==='boolean')return [true,false].map(value=>({label:String(value),value,kind:'value'}));
  if(!value||typeof value!=='object'||Array.isArray(value))return [];
  return Object.entries(spec.properties||{}).filter(([key])=>!Object.hasOwn(value,key)).map(([key,property])=>{
    const s=resolveSchema(property,schemaFor(index.value.diagram_type));
    const value=s.default??s.const??s.enum?.[0]??({array:[],object:{},number:s.minimum??0,integer:s.minimum??0,boolean:false}[s.type]??'');
    return {label:key,key,value,kind:'field',required:spec.required?.includes(key)};
  });
}
export function insertSuggestion(text,index,path,suggestion) {
  const range=index.ranges.get(path);if(!range)throw new Error('Select a valid JSON value first.');
  if(suggestion.kind==='value')return text.slice(0,range.start)+JSON.stringify(suggestion.value)+text.slice(range.end);
  const end=range.end-1,inner=text.slice(range.start+1,end).trim();
  return text.slice(0,end).trimEnd()+(inner?',':'')+'\n  '+JSON.stringify(suggestion.key)+': '+JSON.stringify(suggestion.value)+'\n'+text.slice(end);
}
