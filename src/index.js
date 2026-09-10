import * as THREE from 'three';

// One model definition for both experiments. Cylinders and round endpoints form
// literal thin sausages; no mesh sculpting, skin, facial parts or animation clips.
const SEGMENTS = [
  ['pelvis','chest',.038], ['chest','neck',.024], ['neck','head',.024],
  ['shoulderL','shoulderR',.026], ['pelvis','hipL',.027], ['pelvis','hipR',.027],
  ['shoulderL','elbowL',.024], ['elbowL','wristL',.022], ['wristL','handL',.022],
  ['shoulderR','elbowR',.024], ['elbowR','wristR',.022], ['wristR','handR',.022],
  ['hipL','kneeL',.028], ['kneeL','ankleL',.025], ['ankleL','toeL',.024],
  ['hipR','kneeR',.028], ['kneeR','ankleR',.025], ['ankleR','toeR',.024],
];
const JOINTS = [
  ['pelvis',.038], ['chest',.038], ['neck',.024], ['head',.080],
  ['shoulderL',.026], ['elbowL',.024], ['wristL',.022], ['handL',.022],
  ['shoulderR',.026], ['elbowR',.024], ['wristR',.022], ['handR',.022],
  ['hipL',.028], ['kneeL',.028], ['ankleL',.025], ['toeL',.024],
  ['hipR',.028], ['kneeR',.028], ['ankleR',.025], ['toeR',.024],
];
export const MODEL = Object.freeze({name:'Sausages and circles',height:1.715,upperArm:.30,forearm:.28,hand:.13,thigh:.42,shin:.42,segments:SEGMENTS.length,joints:JOINTS.length,kind:'instanced cylinders and spheres'});
const neutral={pelvis:[0,.945,0],chest:[0,1.385,0],neck:[0,1.535,0],head:[0,1.635,0]};
for(const[side,s]of[['L',1],['R',-1]])Object.assign(neutral,{['shoulder'+side]:[s*.22,1.365,0],['elbow'+side]:[s*.22,1.065,0],['wrist'+side]:[s*.22,.785,0],['hand'+side]:[s*.22,.655,0],['hip'+side]:[s*.105,.89,0],['knee'+side]:[s*.105,.47,0],['ankle'+side]:[s*.105,.05,0],['toe'+side]:[s*.105,.025,.17]});
export const NEUTRAL_POSE=Object.freeze(Object.fromEntries(Object.entries(neutral).map(([name,p])=>[name,Object.freeze(p)])));

/** Coordinates are local to root. The caller supplies physical or gait-IK joint
 * landmarks; this model only draws them and never chooses or modifies a pose. */
export function createStickFigure({color='#348cdd',onReady}={}) {
  const root=new THREE.Group();root.name='SharedStickFigure';
  const material=new THREE.MeshStandardMaterial({color,roughness:.64,metalness:0});
  const cylinder=new THREE.CylinderGeometry(1,1,1,12,1,true);
  const sphere=new THREE.SphereGeometry(1,16,12);
  const limbs=new THREE.InstancedMesh(cylinder,material,SEGMENTS.length);
  const joints=new THREE.InstancedMesh(sphere,material,JOINTS.length);
  limbs.name='StraightSausages';joints.name='RoundEndpoints';
  for(const m of [limbs,joints]){m.castShadow=m.receiveShadow=true;m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(m);}
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),identity=new THREE.Quaternion();
  const a=new THREE.Vector3(),b=new THREE.Vector3(),mid=new THREE.Vector3(),scale=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  let pose=null,disposed=false;root.visible=false;
  const ready=Promise.resolve().then(()=>onReady?.());
  function apply(points) {
    if(disposed)return points;
    for(const [name]of JOINTS)if(!points[name]||points[name].length!==3||!points[name].every(Number.isFinite))throw Error(`Missing or invalid stick-figure joint: ${name}`);
    pose=structuredClone(points);root.visible=true;
    SEGMENTS.forEach(([from,to,r],i)=>{
      a.fromArray(points[from]);b.fromArray(points[to]);mid.addVectors(a,b).multiplyScalar(.5);
      const length=a.distanceTo(b);rotation.setFromUnitVectors(up,b.sub(a).normalize());
      matrix.compose(mid,rotation,scale.set(r,Math.max(length,1e-8),r));limbs.setMatrixAt(i,matrix);
    });
    JOINTS.forEach(([name,r],i)=>{matrix.compose(a.fromArray(points[name]),identity,scale.setScalar(r));joints.setMatrixAt(i,matrix);});
    limbs.instanceMatrix.needsUpdate=joints.instanceMatrix.needsUpdate=true;
    return points;
  }
  return {
    root,ready,apply,
    getPose:()=>pose?structuredClone(pose):null,
    getRenderedJoints(){
      if(!pose)return{};root.updateWorldMatrix(true,true);
      return Object.fromEntries(JOINTS.map(([name],i)=>{joints.getMatrixAt(i,matrix);return[name,new THREE.Vector3().setFromMatrixPosition(matrix).applyMatrix4(joints.matrixWorld).toArray()];}));
    },
    diagnostics:()=>({ready:!disposed,error:null,model:MODEL.name,segments:SEGMENTS.length,joints:JOINTS.length,meshes:2}),
    dispose(){if(disposed)return;disposed=true;cylinder.dispose();sphere.dispose();material.dispose();limbs.dispose();joints.dispose();root.clear();},
  };
}
