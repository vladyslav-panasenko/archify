const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const layoutFields=new Set(['pos','size','row','col','stage','yOffset','width','height','via','labelAt','labelDx','labelDy','route','fromSide','toSide','y','viewBox','layout','column_fit']);
export function documentChanges(before,after){const changes=[];
 function walk(a,b,path){if(equal(a,b))return;
  if(object(a)&&object(b)){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[key],b[key],[...path,key]);return;}
  if(Array.isArray(a)&&Array.isArray(b)&&['components','nodes','states','participants','connections','edges','flows','transitions','messages'].includes(path.at(-1))){
   const keyed=[...a,...b].every(v=>v&&typeof v.id==='string')&&new Set(a.map(v=>v.id)).size===a.length&&new Set(b.map(v=>v.id)).size===b.length;
   if(keyed){for(const id of new Set([...a,...b].map(v=>v.id)))walk(a.find(v=>v.id===id),b.find(v=>v.id===id),[...path,id]);if(!equal(a.map(v=>v.id),b.map(v=>v.id))&&a.length===b.length&&a.every(v=>b.some(n=>n.id===v.id)))changes.push({path:[...path,'order'],before:a.map(v=>v.id),after:b.map(v=>v.id),category:'topology'});return;}
   for(let i=0;i<Math.max(a.length,b.length);i++)walk(a[i],b[i],[...path,String(i+1)]);return;
  }
  const category=a===undefined||b===undefined?(path.length<=2?'topology':layoutFields.has(path.at(-1))?'layout':'content'):layoutFields.has(path.at(-1))||path[0]==='layout'?'layout':['from','to','id','lane','focus','wraps'].includes(path.at(-1))?'topology':'content';
  changes.push({path,before:a,after:b,category});
 }
 walk(before||{},after||{},[]);return changes;
}
