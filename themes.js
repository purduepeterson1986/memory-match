/* Card themes for Memory Match. Every theme supplies 32 unique faces (enough for the 64-card board). */
(function () {
  'use strict';

  const emoji = (list) => list.map(([glyph, name]) => ({ kind: 'emoji', glyph, name }));

  /* ---------- Shapes (drawn in a 100 x 100 box) ---------- */
  const pts = (n, outer, inner, rot) => {
    const out = [];
    const steps = inner ? n * 2 : n;
    for (let i = 0; i < steps; i++) {
      const r = inner && i % 2 ? inner : outer;
      const a = (rot || -90) * Math.PI / 180 + (i * 2 * Math.PI) / steps;
      out.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (50 + r * Math.sin(a)).toFixed(1));
    }
    return out.join(' ');
  };
  const polygon = (p) => '<polygon points="' + p + '"/>';
  const SHAPES = [
    ['Circle', '<circle cx="50" cy="50" r="40"/>'],
    ['Square', '<rect x="13" y="13" width="74" height="74" rx="9"/>'],
    ['Triangle', polygon('50,9 93,86 7,86')],
    ['Star', polygon(pts(5, 46, 19))],
    ['Heart', '<path d="M50 88 C20 64 7 46 7 31 C7 17 18 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C82 8 93 17 93 31 C93 46 80 64 50 88Z"/>'],
    ['Diamond', polygon('50,5 87,50 50,95 13,50')],
    ['Hexagon', polygon(pts(6, 44, 0, 0))],
    ['Plus', polygon('36,9 64,9 64,36 91,36 91,64 64,64 64,91 36,91 36,64 9,64 9,36 36,36')],
    ['Moon', '<path d="M68 12 A42 42 0 1 0 68 88 A40 40 0 1 1 68 12Z"/>'],
    ['Arrow', polygon('50,7 91,50 66,50 66,93 34,93 34,50 9,50')],
    ['Bolt', polygon('60,5 20,56 45,56 36,95 80,40 55,40')],
    ['Drop', '<path d="M50 7 C50 7 18 46 18 63 A32 32 0 0 0 82 63 C82 46 50 7 50 7Z"/>'],
    ['Ring', '<path fill-rule="evenodd" d="M50 9 A41 41 0 1 0 50 91 A41 41 0 1 0 50 9Z M50 31 A19 19 0 1 1 50 69 A19 19 0 1 1 50 31Z"/>'],
    ['Pentagon', polygon(pts(5, 45))],
    ['Sparkle', polygon(pts(4, 47, 15))],
    ['Bow', polygon('9,17 50,41 91,17 91,83 50,59 9,83')]
  ];
  const SHAPE_COLORS = [
    ['Red', '#e5484d'], ['Blue', '#2f6fde'], ['Green', '#2e9e4f'], ['Orange', '#f08c1a'],
    ['Purple', '#8e4ec6'], ['Teal', '#0e9f97'], ['Pink', '#e2569b'], ['Gold', '#d9a514']
  ];
  const shapes = [];
  for (let round = 0; round < 2; round++) {
    SHAPES.forEach(([name, svg], i) => {
      const [cname, c] = SHAPE_COLORS[(i + round * 4 + (round ? 1 : 0)) % SHAPE_COLORS.length];
      shapes.push({ kind: 'shape', name: cname + ' ' + name, svg, color: c });
    });
  }

  /* ---------- Emoji sets ---------- */
  const animals = emoji([
    ['🐶', 'Dog'], ['🐱', 'Cat'], ['🦊', 'Fox'], ['🐻', 'Bear'], ['🐼', 'Panda'], ['🐨', 'Koala'],
    ['🐯', 'Tiger'], ['🦁', 'Lion'], ['🐮', 'Cow'], ['🐷', 'Pig'], ['🐸', 'Frog'], ['🐵', 'Monkey'],
    ['🐔', 'Chicken'], ['🐧', 'Penguin'], ['🦉', 'Owl'], ['🦄', 'Unicorn'], ['🐝', 'Bee'], ['🦋', 'Butterfly'],
    ['🐢', 'Turtle'], ['🐙', 'Octopus'], ['🐬', 'Dolphin'], ['🐳', 'Whale'], ['🦈', 'Shark'], ['🐘', 'Elephant'],
    ['🦒', 'Giraffe'], ['🦓', 'Zebra'], ['🦘', 'Kangaroo'], ['🦔', 'Hedgehog'], ['🦜', 'Parrot'], ['🦩', 'Flamingo'],
    ['🐞', 'Ladybug'], ['🦀', 'Crab']
  ]);
  const food = emoji([
    ['🍎', 'Apple'], ['🍌', 'Banana'], ['🍇', 'Grapes'], ['🍓', 'Strawberry'], ['🍉', 'Watermelon'], ['🍍', 'Pineapple'],
    ['🥝', 'Kiwi'], ['🍑', 'Peach'], ['🍒', 'Cherries'], ['🍋', 'Lemon'], ['🥑', 'Avocado'], ['🌽', 'Corn'],
    ['🥕', 'Carrot'], ['🍄', 'Mushroom'], ['🍕', 'Pizza'], ['🍔', 'Burger'], ['🌮', 'Taco'], ['🍟', 'Fries'],
    ['🌭', 'Hot dog'], ['🥨', 'Pretzel'], ['🧀', 'Cheese'], ['🥞', 'Pancakes'], ['🍩', 'Donut'], ['🍪', 'Cookie'],
    ['🧁', 'Cupcake'], ['🍰', 'Cake'], ['🍦', 'Ice cream'], ['🍫', 'Chocolate'], ['🍿', 'Popcorn'], ['🥐', 'Croissant'],
    ['🍣', 'Sushi'], ['🥥', 'Coconut']
  ]);
  const pictures = emoji([
    ['🚗', 'Car'], ['🚀', 'Rocket'], ['✈️', 'Airplane'], ['🚂', 'Train'], ['⛵', 'Sailboat'], ['🚲', 'Bicycle'],
    ['🚁', 'Helicopter'], ['🎈', 'Balloon'], ['🎸', 'Guitar'], ['🥁', 'Drum'], ['🎺', 'Trumpet'], ['🎨', 'Paint palette'],
    ['⚽', 'Soccer ball'], ['🏀', 'Basketball'], ['🎾', 'Tennis ball'], ['🎲', 'Dice'], ['🏰', 'Castle'], ['🗽', 'Statue'],
    ['🎡', 'Ferris wheel'], ['⛺', 'Tent'], ['🌈', 'Rainbow'], ['☀️', 'Sun'], ['🌙', 'Moon'], ['⭐', 'Star'],
    ['⚡', 'Lightning'], ['❄️', 'Snowflake'], ['🌋', 'Volcano'], ['🌵', 'Cactus'], ['🌻', 'Sunflower'], ['🎁', 'Gift'],
    ['💎', 'Gem'], ['🔑', 'Key']
  ]);

  const faces = emoji([
    ['😀', 'Grinning'], ['😂', 'Tears of joy'], ['😉', 'Winking'], ['😍', 'Heart eyes'], ['😎', 'Cool'], ['🤔', 'Thinking'],
    ['😴', 'Sleeping'], ['😮', 'Surprised'], ['😢', 'Crying'], ['😡', 'Angry'], ['🥳', 'Party'], ['🤓', 'Nerd'],
    ['😜', 'Silly'], ['🙁', 'Frowning'], ['😇', 'Angel'], ['🤩', 'Star-struck'], ['😱', 'Screaming'], ['🤢', 'Sick'],
    ['🥶', 'Freezing'], ['🥵', 'Hot'], ['😷', 'Mask'], ['🤠', 'Cowboy'], ['🤐', 'Zipped lips'], ['🙄', 'Eye roll'],
    ['😬', 'Grimacing'], ['🤯', 'Mind blown'], ['😘', 'Blowing a kiss'], ['🤫', 'Shushing'], ['😈', 'Devil'], ['🤡', 'Clown'],
    ['👻', 'Ghost'], ['🤖', 'Robot']
  ]);
  const sports = emoji([
    ['⚽', 'Soccer'], ['🏀', 'Basketball'], ['🏈', 'Football'], ['⚾', 'Baseball'], ['🎾', 'Tennis'], ['🏐', 'Volleyball'],
    ['🏉', 'Rugby'], ['🎱', 'Pool'], ['🏓', 'Ping pong'], ['🏸', 'Badminton'], ['🏒', 'Hockey'], ['🏏', 'Cricket'],
    ['⛳', 'Golf'], ['🏹', 'Archery'], ['🥊', 'Boxing'], ['🥋', 'Martial arts'], ['⛸️', 'Ice skating'], ['🎿', 'Skiing'],
    ['🏂', 'Snowboarding'], ['🛹', 'Skateboarding'], ['🏊', 'Swimming'], ['🚴', 'Cycling'], ['🏇', 'Horse racing'], ['🎳', 'Bowling'],
    ['🥌', 'Curling'], ['🏋️', 'Weightlifting'], ['🤸', 'Gymnastics'], ['🏄', 'Surfing'], ['🏆', 'Trophy'], ['🥇', 'Gold medal'],
    ['🎯', 'Darts'], ['🛼', 'Roller skating']
  ]);
  const flags = emoji([
    ['🇺🇸', 'USA'], ['🇨🇦', 'Canada'], ['🇲🇽', 'Mexico'], ['🇧🇷', 'Brazil'], ['🇦🇷', 'Argentina'], ['🇬🇧', 'UK'],
    ['🇫🇷', 'France'], ['🇩🇪', 'Germany'], ['🇮🇹', 'Italy'], ['🇪🇸', 'Spain'], ['🇵🇹', 'Portugal'], ['🇮🇪', 'Ireland'],
    ['🇳🇱', 'Netherlands'], ['🇸🇪', 'Sweden'], ['🇳🇴', 'Norway'], ['🇨🇭', 'Switzerland'], ['🇬🇷', 'Greece'], ['🇹🇷', 'Turkey'],
    ['🇺🇦', 'Ukraine'], ['🇮🇳', 'India'], ['🇨🇳', 'China'], ['🇯🇵', 'Japan'], ['🇰🇷', 'South Korea'], ['🇦🇺', 'Australia'],
    ['🇳🇿', 'New Zealand'], ['🇿🇦', 'South Africa'], ['🇪🇬', 'Egypt'], ['🇰🇪', 'Kenya'], ['🇳🇬', 'Nigeria'], ['🇮🇱', 'Israel'],
    ['🇸🇦', 'Saudi Arabia'], ['🇯🇲', 'Jamaica']
  ]);

  /* ---------- Lord of the Rings characters (original emblem medallions) ---------- */
  const lotr = [
    ['Frodo', '💍', '#b8860b'], ['Sam', '🥔', '#8d6e3f'], ['Merry', '🍺', '#b9772a'], ['Pippin', '🔮', '#3d5a99'],
    ['Gandalf', '🧙', '#8c939c'], ['Aragorn', '👑', '#7a1f2b'], ['Legolas', '🏹', '#3f8f4f'], ['Gimli', '🪓', '#a0522d'],
    ['Boromir', '📯', '#6d4c41'], ['Gollum', '🐟', '#5f7a6a'], ['Bilbo', '📖', '#b5382c'], ['Elrond', '📜', '#5b6fb5'],
    ['Galadriel', '✨', '#c2ad5a'], ['Arwen', '🌟', '#6a5acd'], ['Saruman', '🖐️', '#c9c9cf'], ['Sauron', '👁️', '#c4410c'],
    ['Éowyn', '🛡️', '#c99a2e'], ['Éomer', '🐎', '#6b8e23'], ['Théoden', '⚔️', '#2e7d4f'], ['Faramir', '🪶', '#4a6fa5'],
    ['Treebeard', '🌳', '#3b6b35'], ['Witch-king', '💀', '#2b2b33'], ['Balrog', '🔥', '#7d160c'], ['Shelob', '🕷️', '#4a3560'],
    ['Celeborn', '🌙', '#7f95ad'], ['Denethor', '🕯️', '#44444f'], ['Gríma', '🐍', '#4b5d3a'], ['Tom Bombadil', '🎩', '#2a6fdb'],
    ['Radagast', '🐦', '#8b5a2b'], ['Haldir', '🍃', '#6f9c5a'], ['Shadowfax', '🐴', '#a9aeb8'], ['Glorfindel', '🌼', '#d6a92b']
  ].map(([name, glyph, color]) => ({ kind: 'medal', name, glyph, color }));

  window.MM_THEMES = [
    { id: 'animals', name: 'Animals', blurb: 'Furry, feathered and finned', items: animals },
    { id: 'shapes', name: 'Shapes', blurb: 'Match the shape and its color', items: shapes, tiered: true, preview: [3, 4, 0, 10] },
    { id: 'pictures', name: 'Pictures', blurb: 'Things that go, play and shine', items: pictures, preview: [1, 20, 8, 16] },
    { id: 'food', name: 'Food', blurb: 'Snacks, sweets and fresh fruit', items: food, preview: [3, 14, 22, 26] },
    { id: 'faces', name: 'Emoji Faces', blurb: 'Happy, sad, silly and surprised', items: faces, preview: [0, 5, 4, 9] },
    { id: 'sports', name: 'Sports', blurb: 'Balls, boards, skates and medals', items: sports, preview: [0, 1, 2, 28] },
    { id: 'flags', name: 'Flags', blurb: 'Countries from around the world', items: flags, labels: true, preview: [0, 1, 5, 21] },
    { id: 'math', name: 'Math', blurb: 'Match cards with the same answer', preview: [0, 1, 2, 3],
      items: [['2 + 3', 5], ['9 − 4', 5], ['3 × 4', 12], ['8 ÷ 2', 4]].map(([text, value]) => ({ kind: 'math', text, value, name: text })) },
    { id: 'lotr', name: 'Lord of the Rings', blurb: 'Characters of Middle-earth', items: lotr, labels: true, preview: [4, 0, 15, 6] }
  ];
})();
