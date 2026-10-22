import * as THREE from 'three';
import { ROAD } from '../config.js';
import { box, cylinder } from '../art/MeshKit.js';
import {
  createAdvertisingBoard,
  createBackdrop,
  createBananaPlant,
  createBoundaryWall,
  createBuilding,
  createBusStop,
  createHouse,
  createMarketStall,
  createPalm,
  createPalmyrah,
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
import { isThemeTunnel, isTransitionTunnelSection, themeForDistance, themeForSequence, themeSectionIndex, THEME_SECTIONS } from './EnvironmentThemes.js';
import { createDistrictLandmark, createLandscapeStrip, createTunnelSection } from '../art/Landmarks.js';
import { batchStaticGroup, disposeBatchedGeometry } from '../art/StaticBatcher.js';
import { createDistrictGateway, createSriLankanRoadside } from '../art/Roadside.js';
import { createDistrictSideFill } from '../art/DistrictDetail.js';
import { createElephant, updateElephant } from '../art/Elephant.js';

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
    this.animationTime = 0;
    this.groundTarget = new THREE.Color();

    this.ground = box(this.group, [150, 0.35, 370], [0, -0.175, -85], 0x68845a, {
      castShadow: false, receiveShadow: false, surface: 'grass',
    });
    this.backdrop = null;
    this.backdropTheme = null;
    this.updateBackdrop(themeForSequence(0));
    for (let i = 0; i < ROAD.sectionCount; i += 1) {
      const section = this.createSection(i);
      this.sections.push(section);
      this.group.add(section);
    }
    this.reset();
  }

  updateBackdrop(theme) {
    if (this.backdropTheme === theme.id) return;
    if (this.backdrop) {
      disposeBatchedGeometry(this.backdrop);
      this.backdrop.removeFromParent();
    }
    this.backdropTheme = theme.id;
    this.backdrop = batchStaticGroup(createBackdrop(theme.id), { freeze: true });
    this.group.add(this.backdrop);
  }

  createSection(index) {
    const section = new THREE.Group();
    section.name = `Road section ${index}`;
    section.userData.sequence = index;
    const length = ROAD.sectionLength;
    box(section, [10.5, 0.2, length + 0.04], [0, -0.09, 0], 0x495052, {
      castShadow: false, receiveShadow: false, surface: 'asphalt',
    });
    for (const side of [-1, 1]) {
      box(section, [1.4, 0.28, length], [side * 5.95, 0.02, 0], 0xc0bcae, {
        castShadow: false, receiveShadow: false, surface: 'paving',
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
    // Familiar Sri Lankan black-and-white road edge posts, outside traffic lanes.
    for (const side of [-1, 1]) {
      for (const z of [-12, 12]) {
        for (let band = 0; band < 3; band += 1) {
          box(section, [0.22, 0.27, 0.22], [side * 5.58, 0.18 + band * 0.27, z],
            band % 2 ? 0xf0eee2 : 0x242a2b, { castShadow: false });
        }
      }
    }
    // Keep the asphalt slab first for collider-independent road diagnostics.
    batchStaticGroup(section, { preserve: new Set([section.children[0]]), freeze: true });
    return section;
  }

  buildScenery(section, sequence) {
    if (section.userData.scenery) {
      disposeBatchedGeometry(section.userData.scenery);
      section.remove(section.userData.scenery);
    }
    const scenery = new THREE.Group();
    scenery.name = `Seeded ${themeForSequence(sequence).id} scenery ${sequence}`;
    section.userData.scenery = scenery;
    section.userData.sequence = sequence;
    section.add(scenery);
    this.rebuildCount += 1;

    const theme = themeForSequence(sequence);
    const localIndex = themeSectionIndex(sequence);
    const isTunnel = isThemeTunnel(theme, localIndex);
    const transitionTunnel = isTransitionTunnelSection(localIndex);
    const landmarkSide = Math.floor(sequence / THEME_SECTIONS) % 2 ? -1 : 1;
    const landmarkId = localIndex === 1 ? theme.landmark : localIndex === 0 ? theme.approachLandmark : localIndex === 4 ? theme.featureLandmark : null;
    const activeLandmarkSide = (localIndex === 0 && theme.approachLandmark) || localIndex === 4 ? -landmarkSide : landmarkSide;
    const stripSide = landmarkId ? -activeLandmarkSide : sequence % 2 ? 1 : -1;
    const residential = ['suburb', 'garden', 'tea', 'ancient', 'palmyrah'].includes(theme.layout);
    const hasLandscapeStrip = ['tea', 'rail', 'coast', 'fort', 'hill', 'ancient', 'palmyrah'].includes(theme.layout);
    section.userData.theme = theme.id;
    section.userData.tunnel = isTunnel;
    section.userData.landmark = localIndex === 1 ? theme.landmark : null;
    section.userData.approachLandmark = localIndex === 0 ? theme.approachLandmark || null : null;
    section.userData.featureLandmark = localIndex === 4 ? theme.featureLandmark || null : null;
    section.userData.animatedScenery = [];
    const nextTheme = transitionTunnel ? themeForSequence(sequence + THEME_SECTIONS - localIndex) : null;
    const nextLandmarkSide = Math.floor((sequence + 1) / THEME_SECTIONS) % 2 ? -1 : 1;
    const approachVistaSide = nextTheme?.approachLandmark ? -nextLandmarkSide : null;
    const random = mulberry32(9203 + sequence * 97);
    const variant = sequence * 7;
    const elephantSide = theme.id === 'anuradhapura' && localIndex % 6 === 3 && !isTunnel
      ? (Math.floor(localIndex / 6) % 2 ? 1 : -1) : null;

    for (const side of [-1, 1]) {
      const z = -5 + random() * 9 + (side > 0 ? 2 : -1);
      if (isTunnel || (landmarkId && side === activeLandmarkSide) || side === approachVistaSide || side === elephantSide) {
        // Keep tunnel interiors and grounded landmark sightlines free of buildings.
      } else if (residential || (['hill', 'rail'].includes(theme.layout) && sequence % 2 === 0)) {
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
        if (theme.layout === 'market' || theme.layout === 'coast') {
          const stall = createMarketStall(sequence + (side > 0 ? 1 : 0));
          stall.position.set(side * 7.1, 0.02, z + 7);
          stall.rotation.y = -side * Math.PI / 2;
          scenery.add(stall);
        } else if (theme.layout === 'city' && sequence % 2 === 0 && side > 0) {
          const annex = createBuilding(variant + 3, 'colombo');
          annex.scale.setScalar(0.82);
          annex.position.set(side * 10.4, 0.02, z + 9);
          annex.rotation.y = -side * Math.PI / 2;
          scenery.add(annex);
        }
      }

      if (!isTunnel && side !== approachVistaSide) {
        const variant = sequence + (side > 0 ? 1 : 0);
        const vegetation = theme.id === 'jaffna'
          ? createPalmyrah([5.4, 6.1, 6.7, 5.8][variant % 4], (random() - 0.5) * 0.45)
          : variant % 3 === 0
            ? createBananaPlant(0.9 + random() * 0.25, variant)
            : createPalm([5.8, 6.5, 7.2, 6.1][variant % 4], (random() - 0.5) * 1.3);
        vegetation.position.set(side * (7.2 + random() * 1.1), 0, -12 + random() * 24);
        scenery.add(vegetation);
      }
      if (!isTunnel) {
        const light = createStreetlight(side);
        light.position.set(side * 6.48, 0.16, side > 0 ? -10 : 10);
        scenery.add(light);
      }

      if (!isTunnel && ((residential && sequence % 2 === 0) || (!residential && sequence % 3 === 1))) {
        const parked = createParkedVehicle(['market', 'coast'].includes(theme.layout) ? 'tuk-tuk' : 'car', sequence + (side > 0 ? 1 : 0));
        parked.position.set(side * 8.1, 0.02, 11 - random() * 4);
        parked.rotation.y = side > 0 ? 0.08 : -0.08;
        scenery.add(parked);
      }
      if (!isTunnel && side !== approachVistaSide && !(landmarkId && side === activeLandmarkSide)) {
        scenery.add(createDistrictSideFill(theme.id, side, sequence));
      }
    }

    if (hasLandscapeStrip) {
      const strip = createLandscapeStrip(theme.layout, ROAD.sectionLength);
      strip.position.set(stripSide * 15.2, 0, 0);
      scenery.add(strip);
    }
    if (landmarkId) {
      const approaching = localIndex === 0 && Boolean(theme.approachLandmark);
      const districtLandmark = createDistrictLandmark(landmarkId);
      districtLandmark.position.set(activeLandmarkSide * (approaching ? 12.1 : 14.2), 0.02, approaching ? 4 : -1);
      if (approaching) districtLandmark.scale.setScalar(1.18);
      districtLandmark.rotation.y = landmarkId === 'nine-arches' ? 0 : -activeLandmarkSide * Math.PI / 2;
      scenery.add(districtLandmark);
    }
    if (!isTunnel && localIndex === 0) {
      const gateway = createDistrictGateway(theme);
      const gatewaySide = theme.approachLandmark ? -activeLandmarkSide : landmarkSide;
      gateway.position.set(gatewaySide * 6.95, 0.02, 10.5);
      gateway.rotation.y = -gatewaySide * Math.PI / 2;
      scenery.add(gateway);
    }
    if (!isTunnel && (localIndex === 2 || localIndex === 6)) {
      const roadside = createSriLankanRoadside(theme.id, sequence);
      const side = sequence % 2 ? 1 : -1;
      roadside.position.set(side * 7.05, 0.02, localIndex === 2 ? 11 : -11);
      roadside.rotation.y = -side * Math.PI / 2;
      scenery.add(roadside);
    }

    if (!isTunnel) {
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
    }

    if (!isTunnel && sequence % 4 === 2) {
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
    if (!isTunnel && sequence % 3 === 0) {
      const sign = createRoadSign(sequence % 6 === 0 ? theme.roadName : 'SCHOOL ZONE');
      sign.position.set(sequence % 2 ? -6.85 : 6.85, 0.02, -10);
      scenery.add(sign);
    }
    if (!isTunnel && sequence % 2 === 0) {
      const bin = createRoadsideBin();
      bin.position.set(sequence % 4 ? 6.25 : -6.25, 0.16, 12);
      scenery.add(bin);
    }
    if (!isTunnel && sequence % 6 === 5) {
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
    if (isTunnel) {
      const portalStart = transitionTunnel
        ? localIndex === THEME_SECTIONS - 2
        : localIndex === theme.tunnelSections[0];
      const portalEnd = transitionTunnel
        ? localIndex === THEME_SECTIONS - 1
        : localIndex === theme.tunnelSections[theme.tunnelSections.length - 1];
      const tunnel = createTunnelSection(ROAD.sectionLength, {
        portalStart, portalEnd,
        sign: transitionTunnel && nextTheme ? `${nextTheme.name} • NEXT CITY` : 'HILL COUNTRY TUNNEL',
      });
      scenery.add(tunnel);
    }
    batchStaticGroup(scenery, { freeze: true });
    if (elephantSide) {
      const elephant = createElephant(sequence);
      elephant.position.set(elephantSide * 10.1, 0, 1.5);
      elephant.rotation.y = -elephantSide * Math.PI / 2 + 0.22;
      scenery.add(elephant);
      section.userData.animatedScenery.push(elephant);
    }
  }

  reset() {
    this.travelled = 0;
    this.animationTime = 0;
    this.nextSequence = ROAD.sectionCount;
    this.pendingScenery.length = 0;
    this.updateBackdrop(themeForSequence(0));
    this.sections.forEach((section, index) => {
      section.position.z = 15 - index * ROAD.sectionLength;
      this.buildScenery(section, index);
    });
  }

  update(delta, speed) {
    const travel = speed * delta;
    this.travelled += travel;
    this.animationTime += delta;
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
    this.updateBackdrop(theme);
    this.groundTarget.set(theme.ground);
    this.ground.material.color.lerp(this.groundTarget, Math.min(1, delta * 1.5));
    for (const section of this.sections) {
      for (const elephant of section.userData.animatedScenery || []) updateElephant(elephant, this.animationTime);
    }
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
      animatedElephants: this.sections.reduce((count, section) => count + (section.userData.animatedScenery?.length || 0), 0),
      travelled: this.travelled,
      theme: this.getCurrentTheme().id,
    };
  }
}
