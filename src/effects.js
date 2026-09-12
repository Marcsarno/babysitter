import * as THREE from 'three';
import {PLACES} from './simulation.js';

export class ChoreEffects {
 constructor(world,library){this.world=world;this.library=library;this.tasks=new Map();this.bursts=[];this.time=0;}
 prop(name){const source=this.library.getObjectByName(name);return source?source.clone(true):new THREE.Group();}
 hold(actor,name){if(actor.heldName===name)return;if(actor.held)actor.held.removeFromParent();actor.heldName=name;actor.held=null;if(!name)return;const prop=this.prop(name);prop.position.set(0,-.33,.07);prop.scale.setScalar(name==='phone'?1.65:name==='brush'||name==='spoon'?1.2:.95);actor.rig.foreR?.add(prop);actor.held=prop;}
 begin(t,kid){const group=new THREE.Group();this.world.add(group);let names=[];
  if(t.type==='art')names=['scribble',...Array(4).fill('crayon')];
  if(t.type==='spill')names=['puddle','plate'];
  if(t.type==='fort')names=Array(5).fill('pillow');
  if(t.type==='laundry')names=Array(6).fill('sock');
  if(t.type==='bath')names=Array(8).fill('bubble');
  if(t.type==='cook')names=Array(5).fill('bubble');
  if(t.type==='snack')names=['plate'];
  if(t.type==='nap')names=['teddy','star'];
  if(t.type==='dance')names=Array(5).fill('star');
  names.forEach(n=>{const m=this.prop(n);m.userData.prop=n;group.add(m)});
  this.tasks.set(t.id,{group,age:0,type:t.type});kid.celebrate=1.4;
 }
 clear(){for(const f of this.tasks.values())f.group.removeFromParent();this.tasks.clear();for(const b of this.bursts)b.object.removeFromParent();this.bursts=[];}
 remove(t,kid,success){const f=this.tasks.get(t.id);if(f)f.group.removeFromParent();this.tasks.delete(t.id);if(success)this.burst(kid.x,kid.z);}
 burst(x,z){for(let i=0;i<8;i++){const object=this.prop(i%3?'star':'heart');this.world.add(object);this.bursts.push({object,x,z,age:0,angle:i*Math.PI/4});}while(this.bursts.length>48)this.bursts.shift().object.removeFromParent();}
 update(dt,tasks,kids,selected,working){this.time+=dt;
  for(const t of tasks){const f=this.tasks.get(t.id);if(!f)continue;f.age+=dt;const k=kids[t.kid],station=t.type==='cook'?{x:-6,z:-7.35}:t.type==='laundry'?PLACES.laundry:t.type==='bath'&&t.stage>0?{x:-11.1,z:-.65}:k;
   f.group.position.set(station.x,0,station.z);const active=selected===t&&working,progress=Math.min(.98,t.work/3),grow=Math.min(1,f.age*2);
   f.group.children.forEach((m,i)=>{const a=i*2.4,r=.45+(i%3)*.15,s=this.time;
    m.visible=true;m.scale.setScalar(grow);m.rotation.set(0,0,0);
    if(t.type==='art'){m.position.set(i?Math.cos(a)*r:0,.14,i?Math.sin(a)*r:0);m.rotation.y=a;m.scale.setScalar(grow*(1-progress));}
    if(t.type==='spill'){m.position.set(i?.5:0,.14,i?.2:0);m.scale.setScalar(i?.6:grow*(1-progress)*1.6);m.rotation.z=i?.8:0;}
    if(t.type==='fort'){m.position.set((i%2-.5)*.7,.25+Math.floor(i/2)*.28,(i%2)*.22);m.rotation.z=Math.sin(s*3+i)*.05;m.visible=i<Math.ceil(5*(1-progress));}
    if(t.type==='laundry'){m.position.set(Math.cos(a+s)*r,.6+Math.abs(Math.sin(s*2+i))*.9,Math.sin(a+s)*r);m.rotation.set(s,a,s*.4);m.visible=i<Math.ceil(6*(1-progress));}
    if(t.type==='bath'){m.position.set(Math.cos(a+s*.4)*.7,.6+(i*.22+s*.3)%1.5,Math.sin(a+s*.4)*.5);m.scale.setScalar(grow*(active?.5+Math.abs(Math.sin(s*5+i))*.8:.75));}
    if(t.type==='cook'){m.position.set(Math.sin(s+i)*.2,1.35+(s*.4+i*.24)%1.3,Math.cos(s+i)*.15);m.scale.setScalar(.3+((s*.4+i*.24)%1.3)*.3);}
    if(t.type==='snack'){m.position.set(.42,.75,.15);m.rotation.z=Math.sin(s*3)*.12;m.visible=t.stage===2;}
    if(t.type==='nap'){m.position.set(i?.5:-.4,i?1.6:.45,0);m.rotation.y=s*.4;m.scale.setScalar(i?.65:1);}
    if(t.type==='dance'){m.position.set(Math.cos(a+s)*.9,.6+Math.abs(Math.sin(s*3+i))*.6,Math.sin(a+s)*.9);m.rotation.y=s;m.scale.setScalar(.65);}
   });
  }
  for(const b of [...this.bursts]){b.age+=dt;const m=b.object,r=b.age*1.2;m.position.set(b.x+Math.cos(b.angle)*r,1.2+Math.sin(b.age/1.4*Math.PI)*1.1,b.z+Math.sin(b.angle)*r);m.rotation.set(b.age*2,b.angle+b.age,0);m.scale.setScalar(Math.max(0,1-b.age/1.4)*.8);if(b.age>1.4){m.removeFromParent();this.bursts.splice(this.bursts.indexOf(b),1)}}
 }
}
