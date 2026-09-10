import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStickFigure } from '../src/index.js';
const pose={pelvis:[0,1,0],chest:[0,1.4,0],neck:[0,1.5,0],head:[0,1.65,0]};
for(const [side,s]of[['L',1],['R',-1]])Object.assign(pose,{['shoulder'+side]:[s*.22,1.4,0],['elbow'+side]:[s*.28,1.1,0],['wrist'+side]:[s*.28,.87,0],['hand'+side]:[s*.28,.80,0],['hip'+side]:[s*.10,.97,0],['knee'+side]:[s*.10,.55,.03],['ankle'+side]:[s*.10,.10,0],['toe'+side]:[s*.10,.08,.15]});
test('same model and geometry for all roles; no sculpted mesh or loader',()=>{
 const a=createStickFigure({color:'blue'}),b=createStickFigure({color:'red'});
 a.apply(pose);b.apply(pose);
 assert.equal(a.root.children.length,2);
 for(let i=0;i<2;i++){assert.equal(a.root.children[i].isInstancedMesh,true);assert.deepEqual(a.root.children[i].geometry.attributes.position.array,b.root.children[i].geometry.attributes.position.array);assert.deepEqual(a.root.children[i].instanceMatrix.array,b.root.children[i].instanceMatrix.array);}
 a.dispose();b.dispose();
});
test('all joint markers follow actual endpoints under rigid yaw and roll',()=>{
 const f=createStickFigure();
 for(const [axis,angle]of[[[0,1,0],Math.PI/2],[[0,0,1],Math.PI]]){
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis),angle);
  const p=Object.fromEntries(Object.entries(pose).map(([n,p])=>[n,new THREE.Vector3(...p).applyQuaternion(q).add(new THREE.Vector3(2,3,4)).toArray()]));f.apply(p);
  const rendered=f.getRenderedJoints();for(const[n,point]of Object.entries(p))assert.ok(Math.hypot(...point.map((v,i)=>v-rendered[n][i]))<1e-6);
 }
 assert.throws(()=>f.apply({}),/Missing or invalid/);f.dispose();assert.equal(f.diagnostics().ready,false);
});
test('capsule segment centerlines end at the supplied elbow and knee positions',()=>{
 const f=createStickFigure();f.apply(pose);const m=new THREE.Matrix4(),limbs=f.root.children[0];
 for(const[i,a,b]of[[6,'shoulderL','elbowL'],[7,'elbowL','wristL'],[8,'wristL','handL'],[12,'hipL','kneeL'],[13,'kneeL','ankleL']]){
  limbs.getMatrixAt(i,m);const from=new THREE.Vector3(0,-.5,0).applyMatrix4(m),to=new THREE.Vector3(0,.5,0).applyMatrix4(m);
  assert.ok(from.distanceTo(new THREE.Vector3(...pose[a]))<1e-6);assert.ok(to.distanceTo(new THREE.Vector3(...pose[b]))<1e-6);
 }f.dispose();
});
