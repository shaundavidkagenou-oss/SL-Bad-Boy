import * as THREE from 'three';
import { createSchoolboy } from './Schoolboy.js';

// Sri Lanka Police No.02 working dress: dark khaki tunic and trousers, black
// Sam Browne leather, black peaked cap with a lacquered peak, silver buttons and
// cap badge. The officer is built on the same articulated runner body as the
// player so both characters share proportions, skinning and the draw-call budget.
const KHAKI = 0x6f6244;
const KHAKI_DARK = 0x5b5138;
const SKIN = 0xa9704c;
const SKIN_LIGHT = 0xbd8158;

export function createPoliceOfficer() {
  const visual = createSchoolboy({
    id: 'police',
    style: 'police',
    outfit: 'police',
    sleeve: 'long',
    build: 'broad',
    skin: SKIN,
    skinLight: SKIN_LIGHT,
    skinShadow: 0x7d503a,
    shirt: KHAKI,
    trousers: KHAKI_DARK,
    trouserCuff: 0x2a2822,
    shorts: KHAKI_DARK,
    hair: 0x1d1a16,
    shoe: 0x0b0c0b,
    accent: 0x141210,
    eyeColor: 0x3a2415,
    lip: 0x6f3a30,
    capStyle: 'peaked',
    cap: 0x141518,
    hairStyle: 'crop',
    accessories: [],
  });

  visual.name = 'Sri Lankan police officer in dark khaki No.02 uniform';
  visual.userData.isSriLankanPolice = true;
  visual.userData.uniform = 'dark-khaki-tunic-black-peaked-cap-silver-badge-black-sam-browne';
  visual.userData.detailLevel = 'sculpted-face-pressed-uniform-articulated-hands';
  visual.userData.characterId = 'police';
  visual.userData.anatomy = 'athletic-v-taper-lathe-torso-sculpted-head-articulated-hands';
  visual.userData.shoulders = 'rounded-deltoids-with-closed-skinned-sleeves';

  const body = visual.userData.joints?.body;
  if (body) {
    // Hinged baton on the belt: its own joint so the chase animation can swing it.
    const baton = new THREE.Group();
    baton.name = 'Baton';
    baton.position.set(-0.235, 1.25, 0.06);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.026, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x22201c, roughness: 0.6 }),
    );
    shaft.position.y = -0.15;
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.5 }),
    );
    tip.position.y = -0.3;
    baton.add(shaft, tip);
    body.add(baton);
    visual.userData.joints.baton = baton;
  }

  // Silver whistle chain across the chest, drawn once on the batched body.
  if (body) {
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.006, 5, 18, Math.PI * 0.9),
      new THREE.MeshStandardMaterial({ color: 0xc4c8cc, metalness: 0.6, roughness: 0.3 }),
    );
    chain.position.set(0, 1.72, -0.175);
    chain.rotation.set(Math.PI * 0.5, 0, Math.PI * 0.05);
    chain.name = 'Whistle chain';
    body.add(chain);
  }
  visual.userData.policeDetailLevel = 'peaked-cap-sam-browne-belt-baton-holster-shoulder-flashes';
  return visual;
}
