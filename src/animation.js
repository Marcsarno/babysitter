// Local Y is up in the Blender GLBs. All motion drives the exported joints.
export function pose(mode,time,phase=0){
 const s=Math.sin(time*7),c=Math.cos(time*7),p={legL:0,legR:0,shinL:0,shinR:0,armL:.08,armR:.08,foreL:-.12,foreR:-.12,spreadL:0,spreadR:0,lean:0,sway:0,nod:0,bob:0};
 if(mode==='walk'){const w=Math.sin(phase);Object.assign(p,{legL:w*.64,legR:-w*.64,shinL:Math.max(0,-w)*.85,shinR:Math.max(0,w)*.85,armL:-w*.48,armR:w*.48,bob:Math.abs(Math.cos(phase))*.025,sway:w*.025});}
 else if(mode==='stir')Object.assign(p,{armR:-1.05+s*.12,foreR:-.7,spreadR:.18+c*.2,armL:-.5,lean:.12,nod:.1});
 else if(mode==='wipe')Object.assign(p,{armR:-.65+s*.4,foreR:-.4,spreadR:c*.35,lean:.42,shinL:.2,legL:-.2});
 else if(mode==='slice')Object.assign(p,{armL:-1,armR:-.9+s*.35,foreL:-.6,foreR:-.4,lean:.12,nod:.15});
 else if(mode==='feed')Object.assign(p,{armL:-1.1,foreL:-.5,armR:-.9+s*.25,foreR:-.7-s*.25,nod:s*.1});
 else if(mode==='scrub')Object.assign(p,{armL:-.9+s*.3,armR:-.9-s*.3,foreL:-.4,foreR:-.4,lean:.25,nod:s*.08});
 else if(mode==='fold')Object.assign(p,{armL:-.9,armR:-.9,foreL:-.5,foreR:-.5,spreadL:-.3-c*.25,spreadR:.3+c*.25,nod:.15});
 else if(mode==='tuck')Object.assign(p,{armL:-.8+s*.18,armR:-.8+s*.18,foreL:-.25,foreR:-.25,lean:.32,nod:.12});
 else if(mode==='story')Object.assign(p,{armL:-.9,armR:-.9,foreL:-.7,foreR:-.7,nod:.12+Math.sin(time*2)*.06});
 else if(mode==='selfie')Object.assign(p,{armR:-2,foreR:-.12,spreadR:.28,armL:-.5,foreL:-1.8,spreadL:-.45,sway:.08,nod:-.12});
 else if(mode==='dance'||mode==='cheer'||mode==='mischief')Object.assign(p,{armL:-1.8+s*.35,armR:-1.8-s*.35,spreadL:-.5,spreadR:.5,foreL:-.45,foreR:-.45,legL:s*.3,legR:-s*.3,sway:s*.12,bob:Math.abs(s)*.12,nod:c*.1});
 else if(mode==='eat')Object.assign(p,{armR:-.9,foreR:-1+s*.2,armL:-.7,foreL:-.7,nod:s*.07});
 else if(mode==='sleep')Object.assign(p,{legL:0,legR:0,shinL:0,shinR:0,armL:-.35,armR:-.35,foreL:-.9,foreR:-.9,nod:.05,sway:Math.sin(time)*.01});
 else p.nod=Math.sin(time*1.8)*.025;
 return p;
}
export function choreMode(type,stage){return ({snack:['slice','feed','feed'],bath:['tuck','scrub','fold'],nap:['tuck','tuck','story'],cook:['stir'],art:['wipe'],spill:['wipe'],fort:['tuck'],laundry:['fold'],dance:['dance']})[type]?.[stage]??'idle';}
export function bindRig(object,id){const rig={};for(const n of ['torso','head','armL','armR','foreL','foreR','legL','legR','shinL','shinR'])rig[n]=object.getObjectByName(n+'_'+id);return rig;}
export function animateActor(a,dt,time){
 const mode=a.moving?'walk':a.action??(a.sleep>0?(a.rest==='eat'?'eat':'sleep'):a.celebrate>0?'cheer':'idle');
 a.celebrate=Math.max(0,(a.celebrate||0)-dt);a.phase+=a.moving?dt*(a.name==='Kayla'?13:9):0;a.animationMode=mode;if(a.lids)a.lids.visible=mode==='sleep'||(time+a.phase)%4.3<.13;
 const p=pose(mode,time,a.phase),r=a.rig;
 for(const n of ['armL','armR','foreL','foreR','legL','legR','shinL','shinR'])if(r[n]){r[n].rotation.x=p[n];r[n].rotation.z=n==='armL'?p.spreadL:n==='armR'?p.spreadR:0;}
 if(r.torso)r.torso.rotation.set(p.lean,0,p.sway);if(r.head)r.head.rotation.x=p.nod;
 const seat=a.seat;a.object.rotation.order='YXZ';a.object.rotation.x=seat?.lying?-Math.PI/2:0;const target=seat??{x:a.x,y:0,z:a.z};
 if(seat){a.object.position.x+=(target.x-a.object.position.x)*Math.min(1,dt*5);a.object.position.z+=(target.z-a.object.position.z)*Math.min(1,dt*5);a.object.position.y+=(target.y+p.bob-a.object.position.y)*Math.min(1,dt*5);a.object.rotation.y=seat.rotation??0;}
 else a.object.position.set(a.x,p.bob,a.z);a.object.rotation.z=0;
 a.shadow.position.x=a.x;a.shadow.position.z=a.z;
}
