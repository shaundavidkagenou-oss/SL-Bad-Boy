const character = (definition) => Object.freeze({
  outfit: 'sports', hairStyle: 'crop', accessories: Object.freeze([]), ...definition,
});

/** Ten original runners sharing one articulated rig; only the equipped model is instantiated. */
export const CHARACTERS = Object.freeze([
  character({
    id: 'schoolboy', name: 'SL SCHOOLBOY', price: 0, outfit: 'uniform', accessories: Object.freeze(['badge']),
    description: 'The original white uniform and island backpack.',
    skin: 0xb97850, skinLight: 0xcb8b61, shirt: 0xfffbec, shorts: 0x172f63,
    hair: 0x171923, shoe: 0x11141b, backpack: 0x8b3048, accent: 0x176c68,
  }),
  character({
    id: 'colombo-scout', name: 'COLOMBO SCOUT', price: 50, accessories: Object.freeze(['cap']),
    description: 'Teal city kit, navy cap and a bright route pack.',
    skin: 0xa96d49, skinLight: 0xbd8058, shirt: 0x168c91, shorts: 0x243657,
    hair: 0x171923, shoe: 0x18212a, backpack: 0xf0a62e, accent: 0xffd15c, cap: 0x243657,
  }),
  character({
    id: 'kandy-runner', name: 'KANDY RUNNER', price: 100, hairStyle: 'curly', accessories: Object.freeze(['headband', 'wristbands']),
    description: 'Maroon athletics top, white shorts and curly hair.',
    skin: 0x8f573e, skinLight: 0xa96b4c, shirt: 0x9e3347, shorts: 0xf2eadb,
    hair: 0x241a18, shoe: 0x25212a, backpack: 0x293f68, accent: 0xf4b942,
  }),
  character({
    id: 'coastal-sprinter', name: 'COASTAL SPRINTER', price: 150, hairStyle: 'side', accessories: Object.freeze(['glasses']),
    description: 'Sea-blue kit, side-swept hair and sunset shades.',
    skin: 0xc0845c, skinLight: 0xd3986e, shirt: 0x2b9fc0, shorts: 0x17365c,
    hair: 0x2a1c19, shoe: 0x17232d, backpack: 0xe86b3c, accent: 0xffd05a,
  }),
  character({
    id: 'tea-trekker', name: 'TEA COUNTRY TREKKER', price: 225, outfit: 'jacket', hairStyle: 'long',
    description: 'A green hill-country jacket with warm gold trim.',
    skin: 0x9f6548, skinLight: 0xb77b58, shirt: 0x28654f, shorts: 0x283c3c,
    hair: 0x19191c, shoe: 0x1a2322, backpack: 0x74402d, accent: 0xe4b46a,
  }),
  character({
    id: 'jaffna-rider', name: 'JAFFNA RIDER', price: 300, hairStyle: 'fade', accessories: Object.freeze(['wristbands']),
    description: 'Palmyrah purple, gold bands and a clean fade.',
    skin: 0x7f4c37, skinLight: 0x996045, shirt: 0x713b83, shorts: 0x272d4c,
    hair: 0x15161b, shoe: 0x171923, backpack: 0x2c7b69, accent: 0xf4b942,
  }),
  character({
    id: 'sacred-explorer', name: 'CITY EXPLORER', price: 400, accessories: Object.freeze(['glasses', 'satchel']),
    description: 'Sand-colored field kit, glasses and a travel satchel.',
    skin: 0xb1744f, skinLight: 0xc88b62, shirt: 0xd8c49a, shorts: 0x536044,
    hair: 0x2a211d, shoe: 0x29251f, backpack: 0x855333, accent: 0x26766c,
  }),
  character({
    id: 'harbour-captain', name: 'HARBOUR CAPTAIN', price: 500, hairStyle: 'side', accessories: Object.freeze(['cap']),
    description: 'Crisp harbour blues with a white-topped captain cap.',
    skin: 0x87543e, skinLight: 0xa36b50, shirt: 0x315f9c, shorts: 0x172c4b,
    hair: 0x16181d, shoe: 0x101923, backpack: 0xe7e3d5, accent: 0x57c5c8, cap: 0xe7e3d5,
  }),
  character({
    id: 'night-ace', name: 'NIGHT ROUTE ACE', price: 650, outfit: 'jacket', hairStyle: 'long', accessories: Object.freeze(['glasses', 'wristbands']),
    description: 'Midnight jacket, orange trim and route-ready shades.',
    skin: 0x6f4434, skinLight: 0x8d5a43, shirt: 0x20283a, shorts: 0x171b28,
    hair: 0x101116, shoe: 0x0d1119, backpack: 0xd65b31, accent: 0xff9c45,
  }),
  character({
    id: 'island-legend', name: 'ISLAND LEGEND', price: 800, hairStyle: 'curly', accessories: Object.freeze(['headband', 'wristbands']),
    description: 'Championship gold, maroon panels and legendary curls.',
    skin: 0xa66a48, skinLight: 0xc08459, shirt: 0xe0a92f, shorts: 0x702d45,
    hair: 0x211816, shoe: 0x211a1d, backpack: 0x243e73, accent: 0xfff0a0,
  }),
]);

export function getCharacter(id) {
  return CHARACTERS.find((item) => item.id === id) || CHARACTERS[0];
}
