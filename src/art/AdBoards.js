import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, cylinder } from './MeshKit.js';
import { hasLocalSignFonts, LOCAL_SIGN_FONT } from '../ui/SignFonts.js';
import { mulberry32 } from '../game/Random.js';

/**
 * Original, procedurally painted Sri Lankan advertising. One shared 2048×1024
 * atlas feeds every billboard, so a hundred realistic boards cost a single
 * texture and one draw call per recycled section instead of a hundred draws.
 */

const CELL_WIDTH = 512;
const CELL_HEIGHT = 256;
const COLUMNS = 4;

export const AD_CREATIVES = Object.freeze([
  { id: 'ceylon-gold', brand: 'CEYLON GOLD', sinhala: 'රන්වන් තේ', sub: 'PURE CEYLON TEA', phone: '011 234 5678',
    background: '#14342a', accent: '#e8b64a', ink: '#fff7e2', art: 'tea', seal: 'EST. 1892' },
  { id: 'lanka-light', brand: 'LANKA LIGHT', sinhala: 'ආලෝකය ඔබ සමඟ', sub: 'SOLAR FOR EVERY HOME', phone: '077 456 7890',
    background: '#1d3f66', accent: '#f4c04a', ink: '#f4f8ff', art: 'solar', seal: '24 MONTHS' },
  { id: 'island-mobile', brand: 'ISLAND MOBILE', sinhala: 'දැන් ම අමතන්න', sub: 'UNLIMITED DATA • 4.5G', phone: '075 100 2020',
    background: '#3a1146', accent: '#57e0c0', ink: '#ffffff', art: 'phone', seal: 'NEW' },
  { id: 'kiri-kade', brand: 'KIRI KADE', sinhala: 'රසම තැඹිලි', sub: 'FRESH KING COCONUT', phone: '071 808 1122',
    background: '#145a34', accent: '#f7d06a', ink: '#fffbe9', art: 'coconut', seal: 'DAILY' },
  { id: 'serendib-bank', brand: 'SERENDIB BANK', sinhala: 'ඔබේ අනාගතය අප සමඟ', sub: 'SAVINGS &amp; LOANS', phone: '011 999 4455',
    background: '#0f2f52', accent: '#d9b44a', ink: '#f6fbff', art: 'card', seal: 'SINCE 1978' },
  { id: 'ok-fuel', brand: 'OK LANKA', sinhala: 'පිරවුම්හල් 250+', sub: 'FUEL • SERVICE • WASH', phone: '011 777 3300',
    background: '#7a1f22', accent: '#ffd25e', ink: '#fff8e8', art: 'fuel', seal: 'ISLANDWIDE' },
  { id: 'sunlight-paint', brand: 'SUNLIGHT PAINT', sinhala: 'වර්ණ දිදුලන නිවෙස්', sub: 'WEATHERGUARD 10 YEARS', phone: '011 234 9911',
    background: '#f2b53c', accent: '#7a2230', ink: '#2b1a12', art: 'paint', seal: '10 YEAR' },
  { id: 'araliya-markets', brand: 'ARALIYA MARKETS', sinhala: 'අද මිල අඩුයි', sub: 'FRESH EVERY MORNING', phone: '077 332 8899',
    background: '#1f6b57', accent: '#f6cd62', ink: '#f4fff9', art: 'basket', seal: 'OPEN 7AM' },
  { id: 'lanka-cement', brand: 'LANKA CEMENT', sinhala: 'ශක්තිමත් ගොඩනැගිලි', sub: 'BUILD WITH CONFIDENCE', phone: '011 555 1200',
    background: '#3c4750', accent: '#f0b94b', ink: '#ffffff', art: 'cement', seal: '50 KG' },
  { id: 'pure-water', brand: 'AQUA ISLE', sinhala: 'පිරිසිදු පානීය ජලය', sub: 'NATURAL MINERAL WATER', phone: '011 288 6644',
    background: '#0d5680', accent: '#7fe3ff', ink: '#f2fdff', art: 'bottle', seal: '1 LITRE' },
  { id: 'island-guardian', brand: 'ISLAND GUARDIAN', sinhala: 'ආරක්ෂිත හෙටක්', sub: 'LIFE &amp; MOTOR INSURANCE', phone: '011 477 2200',
    background: '#243a6b', accent: '#e8c05a', ink: '#f8faff', art: 'umbrella', seal: 'TRUSTED' },
  { id: 'rathna-textiles', brand: 'RATHNA TEXTILES', sinhala: 'අලුත් අලුත් සාරි', sub: 'SILK • COTTON • BATIK', phone: '077 901 7722',
    background: '#6d1236', accent: '#f1c86b', ink: '#fff5eb', art: 'saree', seal: 'NEW STOCK' },
  { id: 'tip-top', brand: 'TIP TOP', sinhala: 'සැණින් රස විඳින්න', sub: 'CRUNCHY CREAM BISCUITS', phone: '011 660 4455',
    background: '#b23a1e', accent: '#ffe08a', ink: '#fffaf0', art: 'biscuit', seal: 'FAMILY PACK' },
  { id: 'halo-milk', brand: 'HALO MILK', sinhala: 'ළමයින්ට ශක්තිය', sub: 'FULL CREAM MILK POWDER', phone: '011 330 9090',
    background: '#f3f0e6', accent: '#1d6fa8', ink: '#16324a', art: 'milk', seal: '400 G' },
  { id: 'city-pharmacy', brand: 'CITY PHARMACY', sinhala: 'සෞඛ්‍යය අපේ පළමු තැන', sub: 'OPEN 24 HOURS', phone: '011 271 3311',
    background: '#0f5d54', accent: '#f5f7f2', ink: '#f3fffb', art: 'pharmacy', seal: '24 HRS' },
  { id: 'serendib-travels', brand: 'SERENDIB TRAVELS', sinhala: 'දිවයින වටා ගමන', sub: 'TOURS • AIR TICKETS • VISA', phone: '077 700 4040',
    background: '#123f63', accent: '#f2c150', ink: '#f5fbff', art: 'travel', seal: 'BOOK NOW' },
]);

const artPainters = {
  tea(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.72, y + h * 0.56);
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7efe0';
    ctx.beginPath();
    ctx.ellipse(0, 6, h * 0.17, h * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ad.accent;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 6, h * 0.17, h * 0.13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a9672c';
    ctx.beginPath();
    ctx.ellipse(0, 2, h * 0.14, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 3;
    for (let steam = 0; steam < 3; steam += 1) {
      ctx.beginPath();
      ctx.moveTo(-16 + steam * 16, -h * 0.1);
      ctx.quadraticCurveTo(-26 + steam * 16, -h * 0.2, -14 + steam * 16, -h * 0.28);
      ctx.stroke();
    }
    // Leaf sprig.
    ctx.fillStyle = '#3f8a52';
    ctx.beginPath();
    ctx.ellipse(h * 0.2, -h * 0.05, 22, 9, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(h * 0.25, 12, 18, 8, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  solar(ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.52);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath();
    ctx.arc(0, -h * 0.12, h * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2b44';
    ctx.beginPath();
    ctx.moveTo(-h * 0.22, h * 0.3);
    ctx.lineTo(-h * 0.14, -h * 0.02);
    ctx.lineTo(h * 0.14, -h * 0.02);
    ctx.lineTo(h * 0.22, h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6fd0ff';
    ctx.lineWidth = 3;
    for (let row = 0; row < 3; row += 1) {
      ctx.beginPath();
      ctx.moveTo(-h * 0.2 + row * 3, h * 0.06 + row * h * 0.09);
      ctx.lineTo(h * 0.2 - row * 3, h * 0.06 + row * h * 0.09);
      ctx.stroke();
    }
    ctx.restore();
  },
  phone(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.5);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#0c0c14';
    ctx.beginPath();
    ctx.roundRect(-h * 0.16, -h * 0.34, h * 0.32, h * 0.68, 18);
    ctx.fill();
    ctx.fillStyle = ad.accent;
    ctx.beginPath();
    ctx.roundRect(-h * 0.135, -h * 0.3, h * 0.27, h * 0.6, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(10,10,20,.75)';
    ctx.beginPath();
    ctx.roundRect(-h * 0.1, -h * 0.18, h * 0.2, h * 0.22, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-h * 0.06, -h * 0.07, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  coconut(ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(x + w * 0.72, y + h * 0.54);
    ctx.fillStyle = '#e7dcae';
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b9d98a';
    ctx.beginPath();
    ctx.arc(-h * 0.03, -h * 0.04, h * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f4e9c8';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(h * 0.07, -h * 0.16);
    ctx.lineTo(h * 0.17, -h * 0.3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,80,30,.35)';
    for (let mark = 0; mark < 4; mark += 1) {
      ctx.beginPath();
      ctx.arc(-h * 0.02 + mark * 6, h * 0.12, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  card(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.52);
    ctx.rotate(-0.16);
    ctx.fillStyle = ad.accent;
    ctx.beginPath();
    ctx.roundRect(-h * 0.28, -h * 0.18, h * 0.56, h * 0.36, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(-h * 0.28, -h * 0.06, h * 0.56, h * 0.06);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(-h * 0.22, h * 0.06, h * 0.16, h * 0.03);
    ctx.restore();
  },
  fuel(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.52);
    ctx.fillStyle = '#e9e6da';
    ctx.beginPath();
    ctx.roundRect(-h * 0.14, -h * 0.3, h * 0.28, h * 0.56, 8);
    ctx.fill();
    ctx.fillStyle = ad.accent;
    ctx.beginPath();
    ctx.roundRect(-h * 0.11, -h * 0.26, h * 0.22, h * 0.16, 5);
    ctx.fill();
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(h * 0.13, -h * 0.12);
    ctx.quadraticCurveTo(h * 0.24, 0, h * 0.2, h * 0.2);
    ctx.stroke();
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-h * 0.16, h * 0.26, h * 0.32, h * 0.05);
    ctx.restore();
  },
  paint(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.54);
    ctx.fillStyle = '#f6f3ea';
    ctx.beginPath();
    ctx.roundRect(-h * 0.2, -h * 0.1, h * 0.4, h * 0.34, 6);
    ctx.fill();
    ctx.fillStyle = ad.accent;
    ctx.fillRect(-h * 0.2, -h * 0.02, h * 0.4, h * 0.12);
    ctx.fillStyle = ad.accent;
    ctx.fillRect(-h * 0.03, -h * 0.3, h * 0.06, h * 0.2);
    ctx.beginPath();
    ctx.arc(0, -h * 0.32, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  basket(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.55);
    ctx.fillStyle = '#c98f46';
    ctx.beginPath();
    ctx.moveTo(-h * 0.24, -h * 0.04);
    ctx.lineTo(h * 0.24, -h * 0.04);
    ctx.lineTo(h * 0.17, h * 0.24);
    ctx.lineTo(-h * 0.17, h * 0.24);
    ctx.closePath();
    ctx.fill();
    const produce = ['#e2543f', '#7cb342', '#f2b53c', '#8e4bb5'];
    for (let item = 0; item < 6; item += 1) {
      ctx.fillStyle = produce[item % produce.length];
      ctx.beginPath();
      ctx.arc(-h * 0.16 + item * h * 0.065, -h * 0.09 - (item % 2) * h * 0.05, h * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = ad.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -h * 0.24, h * 0.14, Math.PI, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
  },
  cement(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.54);
    ctx.fillStyle = '#e7dfc8';
    ctx.beginPath();
    ctx.roundRect(-h * 0.16, -h * 0.24, h * 0.32, h * 0.5, 5);
    ctx.fill();
    ctx.fillStyle = ad.accent;
    ctx.fillRect(-h * 0.16, -h * 0.12, h * 0.32, h * 0.14);
    ctx.fillStyle = ad.background;
    ctx.font = `700 ${Math.round(h * 0.09)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('50', 0, h * 0.02);
    ctx.restore();
  },
  bottle(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.54);
    ctx.fillStyle = 'rgba(190,240,255,.9)';
    ctx.beginPath();
    ctx.roundRect(-h * 0.08, -h * 0.22, h * 0.16, h * 0.44, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(190,240,255,.9)';
    ctx.fillRect(-h * 0.035, -h * 0.32, h * 0.07, h * 0.12);
    ctx.fillStyle = ad.accent;
    ctx.fillRect(-h * 0.08, -h * 0.08, h * 0.16, h * 0.16);
    ctx.fillStyle = ad.background;
    ctx.font = `700 ${Math.round(h * 0.06)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('AQUA', 0, h * 0.03);
    ctx.restore();
  },
  umbrella(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.5);
    ctx.fillStyle = ad.accent;
    ctx.beginPath();
    ctx.arc(0, -h * 0.04, h * 0.26, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.arc(0, -h * 0.04, h * 0.26, Math.PI, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e7e2d3';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.04);
    ctx.lineTo(0, h * 0.24);
    ctx.quadraticCurveTo(0, h * 0.32, -h * 0.06, h * 0.3);
    ctx.stroke();
    ctx.restore();
  },
  saree(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.52);
    ctx.fillStyle = '#f4e3cf';
    ctx.beginPath();
    ctx.moveTo(-h * 0.1, -h * 0.25);
    ctx.quadraticCurveTo(h * 0.14, -h * 0.12, h * 0.06, h * 0.28);
    ctx.lineTo(-h * 0.12, h * 0.28);
    ctx.quadraticCurveTo(-h * 0.2, 0, -h * 0.1, -h * 0.25);
    ctx.fill();
    ctx.fillStyle = ad.accent;
    for (let stripe = 0; stripe < 3; stripe += 1) {
      ctx.fillRect(-h * 0.11 + stripe * 4, -h * 0.2 + stripe * h * 0.14, h * 0.2, 5);
    }
    ctx.restore();
  },
  biscuit(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.52);
    for (let layer = 2; layer >= 0; layer -= 1) {
      ctx.fillStyle = layer === 2 ? '#e0b46a' : '#b9793d';
      ctx.beginPath();
      ctx.ellipse(0, -layer * 12, h * 0.2, h * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.ellipse(0, -layer * 12 - 4, h * 0.17, h * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = ad.accent;
    ctx.beginPath();
    ctx.arc(-h * 0.22, -h * 0.2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  milk(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.53);
    ctx.fillStyle = '#f7fbff';
    ctx.beginPath();
    ctx.roundRect(-h * 0.13, -h * 0.24, h * 0.26, h * 0.48, 6);
    ctx.fill();
    ctx.fillStyle = ad.accent;
    ctx.beginPath();
    ctx.moveTo(-h * 0.13, -h * 0.24);
    ctx.lineTo(0, -h * 0.34);
    ctx.lineTo(h * 0.13, -h * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ad.accent;
    ctx.fillRect(-h * 0.13, -h * 0.05, h * 0.26, h * 0.12);
    ctx.fillStyle = ad.ink;
    ctx.font = `700 ${Math.round(h * 0.07)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('HALO', 0, h * 0.06);
    ctx.restore();
  },
  pharmacy(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.52);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-h * 0.14, -h * 0.14, h * 0.28, h * 0.28, 8);
    ctx.fill();
    ctx.fillStyle = '#c8353f';
    ctx.fillRect(-h * 0.04, -h * 0.11, h * 0.08, h * 0.22);
    ctx.fillRect(-h * 0.11, -h * 0.04, h * 0.22, h * 0.08);
    ctx.strokeStyle = ad.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.21, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
  travel(ctx, x, y, w, h, ad) {
    ctx.save();
    ctx.translate(x + w * 0.73, y + h * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.moveTo(-h * 0.26, 0);
    ctx.lineTo(h * 0.12, -h * 0.06);
    ctx.lineTo(h * 0.26, -h * 0.16);
    ctx.lineTo(h * 0.2, 0);
    ctx.lineTo(h * 0.28, h * 0.08);
    ctx.lineTo(h * 0.14, h * 0.04);
    ctx.lineTo(-h * 0.24, h * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ad.accent;
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(-h * 0.3, h * 0.2);
    ctx.quadraticCurveTo(0, h * 0.1, h * 0.3, h * 0.2);
    ctx.stroke();
    ctx.restore();
  },
};

function drawCreative(ctx, ad, x, y, width, height, local) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, ad.background);
  gradient.addColorStop(1, shade(ad.background, 1.35));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  // Brand furniture: soft diagonal wash, top rule and a corner seal.
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = ad.accent;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.55, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width * 0.34, y + height);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ad.accent;
  ctx.fillRect(x, y, width, 7);

  artPainters[ad.art]?.(ctx, x, y, width, height, ad);

  const pad = width * 0.045;
  ctx.textAlign = 'left';
  ctx.fillStyle = ad.accent;
  ctx.beginPath();
  ctx.arc(x + pad + 16, y + 38, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ad.background;
  ctx.font = '700 20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(ad.brand.slice(0, 1), x + pad + 16, y + 45);
  ctx.textAlign = 'left';
  ctx.fillStyle = ad.ink;
  ctx.font = '700 23px Arial, sans-serif';
  ctx.fillText(ad.brand, x + pad + 42, y + 46);

  ctx.fillStyle = ad.ink;
  const headline = local ? ad.sinhala : ad.brand;
  const headlineSize = Math.min(46, Math.max(24, Math.floor(150 / Math.max(6, headline.length))));
  ctx.font = `700 ${headlineSize}px ${local ? LOCAL_SIGN_FONT : 'Arial, sans-serif'}`;
  const maxText = width * 0.62;
  let scale = 1;
  let measured = ctx.measureText(headline).width;
  if (measured > maxText) {
    scale = maxText / measured;
    ctx.save();
    ctx.translate(x + pad, y + 118);
    ctx.scale(scale, 1);
    ctx.fillText(headline, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(headline, x + pad, y + 118);
  }
  ctx.fillStyle = ad.ink;
  ctx.globalAlpha = 0.88;
  ctx.font = '600 19px Arial, sans-serif';
  ctx.fillText(decodeEntities(ad.sub), x + pad, y + 148, width * 0.62);
  ctx.globalAlpha = 1;

  // Bottom bar with phone number and stock seal reads like a real hoarding.
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.fillRect(x, y + height - 44, width, 44);
  ctx.fillStyle = ad.accent;
  ctx.font = '700 21px Arial, sans-serif';
  ctx.fillText(ad.phone, x + pad, y + height - 15);
  ctx.textAlign = 'right';
  ctx.fillStyle = ad.ink;
  ctx.font = '700 15px Arial, sans-serif';
  ctx.fillText(ad.seal, x + width - pad, y + height - 15);
  ctx.textAlign = 'left';

  // Small print and a registration mark complete the advertising look.
  ctx.globalAlpha = 0.55;
  ctx.font = '500 10px Arial, sans-serif';
  ctx.fillText('SRI LANKA • ISLANDWIDE DELIVERY • TERMS APPLY', x + width - pad - 238, y + height - 58);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,.32)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);
  ctx.restore();
}

function decodeEntities(value) {
  return String(value).replace(/&amp;/g, '&');
}

function shade(hex, factor) {
  const value = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((value >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((value >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((value & 255) * factor));
  return `rgb(${r},${g},${b})`;
}

let atlasTexture = null;
let atlasMaterial = null;

export function getAdAtlas() {
  if (atlasTexture || typeof document === 'undefined') return atlasTexture;
  const rows = Math.ceil(AD_CREATIVES.length / COLUMNS);
  const canvas = document.createElement('canvas');
  canvas.width = CELL_WIDTH * COLUMNS;
  canvas.height = CELL_HEIGHT * rows;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const local = hasLocalSignFonts();
  const prototype = globalThis.CanvasRenderingContext2D?.prototype;
  if (prototype && !prototype.roundRect) {
    // Older Android WebViews predate Canvas2D roundRect; draw the same path.
    prototype.roundRect = function rounded(x, y, width, height, radius) {
      const r = Math.min(radius, width * 0.5, height * 0.5);
      this.moveTo(x + r, y);
      this.arcTo(x + width, y, x + width, y + height, r);
      this.arcTo(x + width, y + height, x, y + height, r);
      this.arcTo(x, y + height, x, y, r);
      this.arcTo(x, y, x + width, y, r);
      this.closePath();
      return this;
    };
  }
  AD_CREATIVES.forEach((ad, index) => {
    const x = (index % COLUMNS) * CELL_WIDTH;
    const y = Math.floor(index / COLUMNS) * CELL_HEIGHT;
    drawCreative(ctx, ad, x + 3, y + 3, CELL_WIDTH - 6, CELL_HEIGHT - 6, local);
  });
  atlasTexture = new THREE.CanvasTexture(canvas);
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  atlasTexture.anisotropy = 4;
  atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
  atlasTexture.magFilter = THREE.LinearFilter;
  atlasTexture.needsUpdate = true;
  return atlasTexture;
}

export function getAdMaterial() {
  if (atlasMaterial) return atlasMaterial;
  const map = getAdAtlas();
  atlasMaterial = new THREE.MeshStandardMaterial({
    name: 'Shared procedural advertising atlas',
    map: map || null,
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0,
    emissive: map ? 0xffffff : 0x000000,
    emissiveMap: map || null,
    emissiveIntensity: map ? 0.22 : 0,
    side: THREE.DoubleSide,
  });
  if (!map) atlasMaterial.color.set(0x7f2d43);
  return atlasMaterial;
}

function uvFor(index, inset = 0.0015) {
  const rows = Math.ceil(AD_CREATIVES.length / COLUMNS);
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return {
    u0: (column + inset) / COLUMNS,
    u1: (column + 1 - inset) / COLUMNS,
    v0: 1 - (row + 1 - inset) / rows,
    v1: 1 - (row + inset) / rows,
  };
}

function billboardGeometry(width, height, uv, twoSided = false) {
  const front = new THREE.PlaneGeometry(width, height);
  const uvs = front.attributes.uv;
  for (let index = 0; index < uvs.count; index += 1) {
    uvs.setXY(index, uv.u0 + uvs.getX(index) * (uv.u1 - uv.u0),
      uv.v0 + uvs.getY(index) * (uv.v1 - uv.v0));
  }
  if (!twoSided) return front;
  // Free-standing boards are read from both directions, so the reverse face
  // carries the artwork with its U axis flipped to stay legible (never mirrored).
  const back = front.clone();
  const backUv = back.attributes.uv;
  for (let index = 0; index < backUv.count; index += 1) {
    backUv.setX(index, uv.u0 + uv.u1 - backUv.getX(index));
  }
  back.rotateY(Math.PI);
  backUv.needsUpdate = true;
  const merged = mergeGeometries([front, back], false);
  front.dispose();
  back.dispose();
  return merged;
}

const BOARD_LAYOUT = [
  { kind: 'hoarding', width: 5.0, height: 2.6, y: 3.15, x: 8.05, z: -12 },
  { kind: 'pole', width: 2.3, height: 1.15, y: 2.05, x: 7.0, z: -6.5 },
  { kind: 'wall', width: 3.5, height: 1.75, y: 4.35, x: 9.55, z: 0.5 },
  { kind: 'hoarding', width: 4.4, height: 2.3, y: 3.0, x: 8.2, z: 6.5 },
  { kind: 'lightbox', width: 1.7, height: 2.35, y: 1.55, x: 6.9, z: 12 },
  { kind: 'hoarding', width: 3.6, height: 1.9, y: 5.3, x: 9.2, z: 9 },
];

/**
 * Twelve original advertising boards per recycled section — 108 across the
 * nine live sections. Copy, layout and artwork are procedural and original.
 */
export function createAdBoardField(sequence, sectionLength = 30) {
  const root = new THREE.Group();
  root.name = `Illuminated island advertising ${sequence}`;
  root.userData.adBoardCount = 0;
  const random = mulberry32(4703 + sequence * 131);
  const quads = [];
  const frames = new THREE.Group();
  frames.name = 'Advertising board frames and lamps';
  root.add(frames);
  for (const side of [-1, 1]) {
    BOARD_LAYOUT.forEach((slot, index) => {
      const creative = Math.floor(random() * AD_CREATIVES.length);
      const uv = uvFor(creative);
      const width = slot.width * (0.94 + random() * 0.12);
      const height = slot.height * (0.94 + random() * 0.12);
      const z = ((slot.z + (side > 0 ? 1.6 : -1.6) + sectionLength * 0.5) % sectionLength) - sectionLength * 0.5;
      const face = billboardGeometry(width, height, uv);
      const matrix = new THREE.Matrix4()
        .makeRotationY(-side * Math.PI / 2 + (random() - 0.5) * 0.05)
        .setPosition(side * slot.x, slot.y, z);
      face.applyMatrix4(matrix);
      quads.push(face);
      // Physical frame: posts, back board, cap and a small lamp arm.
      const frame = new THREE.Group();
      if (slot.kind === 'hoarding' || slot.kind === 'wall') {
        const postHeight = slot.y + height * 0.5;
        const postCenter = (height * 0.5 - slot.y) / 2;
        for (const offset of [-0.38, 0.38]) {
          cylinder(frame, [0.075], postHeight, [offset * width, postCenter, -0.055], 0x4a5153, {
            segments: 7, rotation: [0, 0, side * 0.02], roughness: 0.7,
          });
        }
        box(frame, [width + 0.16, 0.09, 0.16], [0, height * 0.5 + 0.06, 0.06], 0x3f4648);
        box(frame, [width + 0.16, 0.07, 0.16], [0, -height * 0.5 - 0.05, 0.06], 0x3f4648);
        box(frame, [width, height, 0.05], [0, 0, -0.045], 0x8b8f8c, { roughness: 0.8 });
      } else if (slot.kind === 'pole') {
        const postHeight = Math.max(0.3, slot.y - height * 0.5);
        cylinder(frame, [0.06], postHeight, [0, -slot.y + postHeight / 2, 0.03], 0x4a5153, {
          segments: 7, rotation: [0, 0, side * 0.03],
        });
        box(frame, [width + 0.1, 0.06, 0.1], [0, -height * 0.5 - 0.02, 0.05], 0x3f4648);
      } else {
        // City-light box with a lit base.
        box(frame, [width + 0.12, height + 0.12, 0.1], [0, 0, -0.04], 0x2d3436);
        box(frame, [width + 0.2, 0.12, 0.2], [0, -height * 0.5 - 0.07, 0.06], 0x1f2527);
      }
      frame.position.set(side * slot.x, slot.y, z);
      frame.rotation.y = -side * Math.PI / 2;
      frames.add(frame);
      root.userData.adBoardCount += 1;
      root.userData.creatives = root.userData.creatives || new Set();
      root.userData.creatives.add(AD_CREATIVES[creative].id);
      root.userData.kinds = root.userData.kinds || new Set();
      root.userData.kinds.add(slot.kind);
    });
  }
  const boards = new THREE.Mesh(mergeGeometries(quads, false), getAdMaterial());
  quads.forEach((geometry) => geometry.dispose());
  boards.name = `Batched ${root.userData.adBoardCount} advertising boards`;
  boards.userData.adBoards = true;
  boards.userData.batchOwnedGeometry = true;
  boards.castShadow = false;
  boards.receiveShadow = false;
  root.add(boards);
  root.userData.adField = boards;
  root.userData.creativeCount = root.userData.creatives.size;
  delete root.userData.creatives;
  return root;
}

export function createAdBoardStats() {
  return {
    creatives: AD_CREATIVES.length,
    cellWidth: CELL_WIDTH,
    cellHeight: CELL_HEIGHT,
    atlasWidth: CELL_WIDTH * COLUMNS,
    atlasHeight: CELL_HEIGHT * Math.ceil(AD_CREATIVES.length / COLUMNS),
  };
}

/** A single free-standing painted hoarding for gateway and junction spots. */
export function createAdBoard(variant = 0) {
  const root = new THREE.Group();
  root.name = 'Painted roadside advertising hoarding';
  const creative = Math.abs(variant) % AD_CREATIVES.length;
  const width = 3.4;
  const height = 1.7;
  const y = 2.45;
  for (const offset of [-1.25, 1.25]) {
    cylinder(root, [0.065], y + height * 0.5, [offset, (y + height * 0.5) / 2, 0], 0x4a5153, {
      segments: 7, roughness: 0.7,
    });
  }
  box(root, [width + 0.18, 0.1, 0.14], [0, y + height * 0.5 + 0.05, 0], 0x3f4648);
  box(root, [width + 0.18, 0.1, 0.14], [0, y - height * 0.5 - 0.05, 0], 0x3f4648);
  box(root, [width, height, 0.06], [0, y, -0.045], 0x8b8f8c, { roughness: 0.8 });
  const face = new THREE.Mesh(billboardGeometry(width, height, uvFor(creative), true), getAdMaterial());
  face.position.set(0, y, 0);
  face.name = 'Painted advertising face';
  face.userData.adCreative = AD_CREATIVES[creative].id;
  root.add(face);
  root.userData.adCreative = AD_CREATIVES[creative].id;
  return root;
}
