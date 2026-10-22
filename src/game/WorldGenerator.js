import * as THREE from 'three';
import { ROAD } from '../config.js';
import { box, cylinder } from '../art/MeshKit.js';
import {
  createAdvertisingBoard,
  createBackdrop,
  createBoundaryWall,
  createBuilding,
  createBusStop,
  createHouse,
  createMarketStall,
  createPalm,
  createParkedVehicle,
  createRoadSign,
  createRoadsideBin,
  createSinhalaBoard,
  createStreetlight,
  createTrafficLight,
  createTree,
  createUtilityPole,
  createUtilityWires,
} from '../art/Environment.js';
import { mulberry32 } from './Random.js';
import { advanceSectionCenter } from './RoadMath.js';
import { themeForDistance, themeForSequence } from './EnvironmentThemes.js';

export class WorldGenerator {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Recycled Sri Lankan road world';
    scene.add(this.group);
    this.sections = [];
    this.pendingScenery = [];
    this.rebuildCount = 0;
    this.travelled = 0;
    this.groundTarget = new THREE.Color();

    this.ground = box(this.group, [150, 0.35, 370], [0, -0.175, -85], 0x68845a, {
      castShadow: false, receiveShadow: true,
    });
    this.group.add(createBackdrop());
    for (let i = 0; i < ROAD.sectionCount; i += 1) {
      const section = this.createSection(i);
      this.sections.push(section);
      this.group.add(section);
    }
    this.reset();
  }

  createSection(index) {
    const section = new THREE.Group();
    section.name = `Road section ${index}`;
    section.userData.sequence = index;
    const length = ROAD.sectionLength;
    box(section, [10.5, 0.2, length + 0.04], [0, -0.09, 0], 0x3c4143, {
      castShadow: false, receiveShadow: true, surface: 'asphalt',
    });
    for (const side of [-1, 1]) {
      box(section, [1.4, 0.28, length], [side * 5.95, 0.02, 0], 0xc0bcae, {
        castShadow: false, receiveShadow: true, surface: 'paving',
      });
      box(section, [0.18, 0.35, length], [side * 5.25, 0.05, 0], 0xe2d7bd, { castShadow: false });
      box(section, [0.1, 0.025, length], [side * 4.92, 0.012, 0], 0xe8dfbf, { castShadow: false });
      for (const z of [-10, 5]) {
        box(section, [0.32, 0.035, 0.8], [side * 5.08, 0.025, z], 0x3a4445, { castShadow: false });
      }
    }
    for (const x of [-1.55, 1.55]) {
      for (let z = -12; z <= 12; z += 6) {
        box(section, [0.12, 0.025, 3.1], [x, 0.015, z], 0xf4eed8, { castShadow: false });
      }
    }
    cylinder(section, [0.36], 0.025, [3.95, 0.02, -5], 0x495052, { segments: 16, castShadow: false });
    return section;
  }

  buildScenery(section, sequence) {
    if (section.userData.scenery) section.remove(section.userData.scenery);
    const scenery = new THREE.Group();
    scenery.name = `Seeded ${themeForSequence(sequence).id} scenery ${sequence}`;
    section.userData.scenery = scenery;
    section.userData.sequence = sequence;
    section.add(scenery);
    this.rebuildCount += 1;

    const theme = themeForSequence(sequence);
    section.userData.theme = theme.id;
    const random = mulberry32(9203 + sequence * 97);
    const variant = sequence * 7;

    for (const side of [-1, 1]) {
      const z = -5 + random() * 9 + (side > 0 ? 2 : -1);
      if (theme.id === 'suburb') {
        const house = createHouse(variant + (side > 0 ? 2 : 0));
        house.position.set(side * (10.2 + random()), 0.02, z);
        house.rotation.y = -side * Math.PI / 2;
        scenery.add(house);
        const wall = createBoundaryWall(sequence);
        wall.position.set(side * 7.65, 0.02, z);
        wall.rotation.y = -side * Math.PI / 2;
        scenery.add(wall);
        const gardenTree = createTree(0.65 + random() * 0.25, sequence + 4);
        gardenTree.position.set(side * (9 + random() * 2), 0, z + 7);
        scenery.add(gardenTree);
      } else {
        const building = createBuilding(variant + (side > 0 ? 1 : 0), theme.id);
        building.position.set(side * (9.8 + random() * 1.1), 0.02, z);
        building.rotation.y = -side * Math.PI / 2;
        scenery.add(building);
        if (theme.id === 'market') {
          const stall = createMarketStall(sequence + (side > 0 ? 1 : 0));
          stall.position.set(side * 7.1, 0.02, z + 7);
          stall.rotation.y = -side * Math.PI / 2;
          scenery.add(stall);
        } else if (sequence % 2 === 0 && side > 0) {
          const annex = createBuilding(variant + 3, 'colombo');
          annex.scale.setScalar(0.82);
          annex.position.set(side * 10.4, 0.02, z + 9);
          annex.rotation.y = -side * Math.PI / 2;
          scenery.add(annex);
        }
      }

      const palm = createPalm([5.8, 6.5, 7.2, 6.1][(sequence + (side > 0 ? 1 : 0)) % 4], (random() - 0.5) * 1.3);
      palm.position.set(side * (7.2 + random() * 1.1), 0, -12 + random() * 24);
      scenery.add(palm);
      if (theme.id !== 'market' || sequence % 2 === 0) {
        const tree = createTree(0.65 + random() * 0.25, sequence + (side > 0 ? 2 : 0));
        tree.position.set(side * (13 + random() * 3), 0, -10 + random() * 20);
        scenery.add(tree);
      }
      const light = createStreetlight(side);
      light.position.set(side * 6.48, 0.16, side > 0 ? -10 : 10);
      scenery.add(light);

      if ((theme.id === 'suburb' && sequence % 2 === 0) || (theme.id !== 'suburb' && sequence % 3 === 1)) {
        const parked = createParkedVehicle(theme.id === 'market' ? 'tuk-tuk' : 'car', sequence + (side > 0 ? 1 : 0));
        parked.position.set(side * 8.1, 0.02, 11 - random() * 4);
        parked.rotation.y = side > 0 ? 0.08 : -0.08;
        scenery.add(parked);
      }
    }

    const sinhalaBoard = createSinhalaBoard(sequence, theme.id);
    sinhalaBoard.position.set(sequence % 2 ? 6.95 : -6.95, 0.02, 1.5);
    scenery.add(sinhalaBoard);

    // One continuous utility run per section; the wires meet at section edges.
    const pole = createUtilityPole();
    pole.position.set(-7.25, 0.02, 0);
    scenery.add(pole);
    const wires = createUtilityWires(ROAD.sectionLength);
    wires.position.set(-7.25, 0, 0);
    scenery.add(wires);

    if (sequence % 4 === 2) {
      const stop = createBusStop();
      const side = sequence % 8 === 2 ? 1 : -1;
      stop.position.set(side * 8.25, 0.02, 5);
      stop.rotation.y = -side * Math.PI / 2;
      scenery.add(stop);
    }
    if (sequence % 3 === 1) {
      const board = createAdvertisingBoard(sequence);
      board.position.set(sequence % 2 ? 8.2 : -8.2, 0.02, -11);
      scenery.add(board);
    }
    if (sequence % 3 === 0) {
      const names = ['GALLE ROAD', 'SCHOOL ZONE', 'KOTTE ROAD'];
      const sign = createRoadSign(names[Math.floor(sequence / 3) % names.length]);
      sign.position.set(sequence % 2 ? -6.85 : 6.85, 0.02, -10);
      scenery.add(sign);
    }
    if (sequence % 2 === 0) {
      const bin = createRoadsideBin();
      bin.position.set(sequence % 4 ? 6.25 : -6.25, 0.16, 12);
      scenery.add(bin);
    }
    if (sequence % 6 === 5) {
      // Decorative side junction: the three-lane gameplay surface stays unchanged.
      box(scenery, [38, 0.045, 5.2], [0, -0.005, 1], 0x414648, { surface: 'asphalt', castShadow: false });
      for (const side of [-1, 1]) {
        const light = createTrafficLight();
        light.position.set(side * 5.85, 0.16, 4.2);
        scenery.add(light);
      }
      for (let x = -4.2; x <= 4.2; x += 1.2) {
        box(scenery, [0.58, 0.028, 1.7], [x, 0.025, -3.2], 0xe8e2cf, { castShadow: false });
      }
    }
  }

  reset() {
    this.travelled = 0;
    this.nextSequence = ROAD.sectionCount;
    this.pendingScenery.length = 0;
    this.sections.forEach((section, index) => {
      section.position.z = 15 - index * ROAD.sectionLength;
      this.buildScenery(section, index);
    });
  }

  update(delta, speed) {
    const travel = speed * delta;
    this.travelled += travel;
    for (const section of this.sections) {
      const previous = section.position.z;
      section.position.z = advanceSectionCenter(previous, travel);
      if (section.position.z < previous) {
        section.userData.sequence = this.nextSequence;
        this.nextSequence += 1;
        this.pendingScenery.push(section);
      }
    }
    // Normally one section recycles at a time. The queue also protects against
    // large catch-up steps without rebuilding several detailed groups at once.
    if (this.pendingScenery.length) {
      const section = this.pendingScenery.shift();
      this.buildScenery(section, section.userData.sequence);
    }
    const theme = this.getCurrentTheme();
    this.groundTarget.set(theme.ground);
    this.ground.material.color.lerp(this.groundTarget, Math.min(1, delta * 1.5));
  }

  getCurrentTheme() {
    return themeForDistance(this.travelled);
  }

  getSectionCenters() {
    return this.sections.map((section) => section.position.z);
  }

  getStats() {
    return {
      activeSections: this.sections.length,
      activeSceneryGroups: this.sections.filter((section) => section.userData.scenery).length,
      pendingScenery: this.pendingScenery.length,
      rebuildCount: this.rebuildCount,
      travelled: this.travelled,
      theme: this.getCurrentTheme().id,
    };
  }
}
