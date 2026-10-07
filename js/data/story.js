// Story, characters, lore pages, letters and the main questline.

export const NPCS = {
  tobin: { name: 'Tobin Ashgrove', role: 'Steward of the Wardens\' Guild', look: { skin: '#d8a07a', hair: '#d8d8d0', shirt: '#2f6a44', pants: '#3a3020', hat: '#2a4a30' } },
  marra: { name: 'Marra Quill', role: 'Keeps the market', look: { skin: '#c88a64', hair: '#3a1a10', shirt: '#b04a30', pants: '#4a3a2a', apron: '#f0e8d0', hairStyle: 1 } },
  fennick: { name: 'Fennick Gearwright', role: 'Tinkerer, sells blueprints', look: { skin: '#e8c0a0', hair: '#c06020', shirt: '#5a5a62', pants: '#3a3a40', apron: '#8a6a40', hairStyle: 2 } },
  wren: { name: 'Wren', role: 'Courier, keeps the order board', look: { skin: '#f0c8a0', hair: '#e0b040', shirt: '#3a6aa0', pants: '#4a3a2a', hairStyle: 1 } },
  hettie: { name: 'Hettie Moss', role: 'Fen-woman. Knows things.', look: { skin: '#c8a080', hair: '#a0a8a0', shirt: '#5a7048', pants: '#3a3a30', hairStyle: 1 } },
};

// Idle chatter, picked at random once the main topic is done.
export const CHATTER = {
  tobin: [
    'Your grandmother could tell a Hearthling from a Tended by the sound of its wings. Took me thirty years to learn it from the shape.',
    'The Guild had two hundred Wardens once. Now it has me, a leaking roof and you.',
    'A Skep breeds true. A Hive Box takes chances. Know which one you need before you load a Matron.',
    'Climate is a species\' birthright. You can\'t breed a desert bee into a snow bee. You can breed it to put up with snow.',
    'If a line keeps losing its Heiress, it\'s worn out. Heartsap Tonic, or a Balmwing hive nearby, will steady it.',
  ],
  marra: [
    'Prices drift with the seasons, love. Sell Meadmelt in winter and you\'ll see what I mean.',
    'Flood my stall with one thing and I\'ll pay less for it. Spread your goods around.',
    'Thistlewick drinks Meadmelt, burns candles and argues about the weather. Sell accordingly.',
    'Your grandmother paid her debts in honey. Never once late.',
  ],
  fennick: [
    'Runnels are just chutes with ambition. Point them away from a machine and it\'ll fill them.',
    'A Strand Gate reads anything that rolls over it. Matching items turn left. Everyone forgets which way left is.',
    'My grandfather thought machines could replace the hives. He was wrong. But he wasn\'t wrong about machines.',
    'No power, no problem: most of my early machines run slowly by hand. Glassforges and Smelteries need real heat, though.',
    'Spring Coils store power for later. A Windlass and a coil will carry you a long way.',
  ],
  wren: [
    'Orders change every morning. Come back tomorrow and there\'ll be new ones!',
    'I carry letters to everyone in the valley. Well. Everyone who\'s left.',
    'Your Post Box sends things straight to your Vault. I\'m very fast.',
    'There\'s a Grand Order every week. Big reward. Big ask.',
  ],
  hettie: [
    'The fen remembers what the valley forgets.',
    'Bring me nothing. I want nothing. Come back tomorrow and I\'ll tell you something true.',
  ],
};

// Lore pages hidden in the Warden cairns, three per region.
export const LORE = {
  meadowfold: [
    { title: 'Elspeth\'s Journal: The First Hum', text: 'I was six when my mother put a Meadowmote in my palm. It did not sting. It walked a circle around my lifeline and flew home. She said: "That\'s a contract. You look after them, they look after the valley, the valley looks after you." I have never heard a better description of a job.' },
    { title: 'The Wardens\' Charter, Article One', text: 'A Warden shall keep the three kingdoms (the Hummer, the Grove and the Flitter) in balance, so that each may feed the others. No Warden shall favour one kingdom to the ruin of another. The Heartroot listens for the three together, and for nothing else.' },
    { title: 'Elspeth\'s Journal: On Skeps', text: 'Young Wardens always want the Hive Box first. Mutation is exciting. But a Skep is where you learn patience. A Skep breeds true. Every line you will ever love starts as a Skep line you kept honest.' },
  ],
  thicket: [
    { title: 'Elspeth\'s Journal: Barkbuzz', text: 'Found the Barkbuzz again, after the brambles came. They have gone shy. Cross one with a Meadowmote in a proper box and you will get a Hearthling, nine times in ten if you are patient and once in ten if you are not. Mutation is not luck. It is attendance.' },
    { title: 'A Woodcutter\'s Note', text: 'To whoever finds this: the big pines are Needlepine, the white ones Paperbark. Cross them in the pollen season and you get Larchwood, which grows straight as a rule. Old Elspeth paid me in honey to tell her that. I\'m telling you for free.' },
    { title: 'The Wardens\' Charter, Article Four', text: 'Pollen moves by wing. A Hummer carries it as far as it forages; a Flitter carries it farther. A grove no wing visits will only ever make copies of itself.' },
  ],
  saltfen: [
    { title: 'Elspeth\'s Journal: The Schism', text: 'Corvin Gearwright stood up in the Guild Hall and said the hives were too slow and the groves too stubborn, and that iron would feed the valley better. Half the Wardens followed him to the lake mill. The other half stayed with the hives and stopped speaking to anyone who owned a spanner. I owned a spanner and a hive. I was not invited to either party.' },
    { title: 'Fen Saying', text: 'Bogmote hums in rain, Stormcaller hums in storm. A hive that will not work in rain will starve in the fen.' },
    { title: 'Elspeth\'s Journal: Worn Lines', text: 'An Heiress from a wild hive is pristine nine times in ten. Breed her a hundred times and she stays pristine. The ones that come out "worn" will one day fail to leave a daughter. A Balmwing\'s hum, or a spoon of Heartsap Tonic, keeps them going. I have kept a worn Hearthling line alive for nineteen years out of pure stubbornness.' },
  ],
  sunscar: [
    { title: 'Elspeth\'s Journal: Glass', text: 'The Ascetic lines its cells with grit so fine it pours like water. Melt it with Amber resin and you get glass the colour of late afternoon. Every great Warden building has Amberglass in it somewhere. The Hivespire has a whole roof of it.' },
    { title: 'Quarryman\'s Tally', text: 'Red sand has iron in it. Everyone knows that. What nobody knew until the Warden showed us was that a certain bee could pick the iron out, flake by flake. "Rustwing," she called it. We called it witchcraft and bought a dozen.' },
    { title: 'The Wardens\' Charter, Article Seven', text: 'A species\' home climate is its birthright and cannot be bred away. Its tolerance may be bred, slowly, through the hidden threads. Mock no Warden whose desert line shivers in the fen; teach her patience instead.' },
  ],
  rimeback: [
    { title: 'Elspeth\'s Journal: The Long Frost', text: 'The winter after the Schism was the worst anyone remembered. The last Verdant Matriarch was in the Guild Hall hive. Nobody tended it: the hive-folk thought it was the Gearwrights\' job, and the Gearwrights thought it was a museum piece. It died in the cold on Midwinter night. In the spring the Heartroot did not wake.' },
    { title: 'A Climber\'s Warning', text: 'Rimebuzz throw four sons to every queen. Breed them into anything that\'s short of drones.' },
    { title: 'Elspeth\'s Journal: Frames', text: 'A Catalyst Frame shakes the Strand loose: more mutations, shorter lives. A Stilling Frame does the reverse. Use the first to find a species and the second to keep it. Then throw both away and use Waxed Frames like a sensible person.' },
  ],
  canopy: [
    { title: 'Elspeth\'s Journal: Paradise', text: 'Sat by a Paradise hive for an hour today and solved a problem I had been stuck on for eleven years. Coincidence, probably. I am going back tomorrow.' },
    { title: 'The Wardens\' Charter, Article Nine', text: 'The Triad is three: the Verdant Matriarch, the Heartwood, and the Dawnwing. Each is the end of its kingdom\'s longest road. None can be reached without the other two kingdoms\' labour.' },
    { title: 'Elspeth\'s Journal: Jewelwing', text: 'A Jewelwing will carry pollen across the whole estate. Plant your groves where you like; the butterflies will do the matchmaking.' },
  ],
  ashvent: [
    { title: 'Gearwright Ledger, Final Page', text: 'The mill on the lake has stopped. Without the Heartroot the seasons have turned sharp and the wind is wrong for the sails. I was a fool to think the gears did not need the valley. — C.G.' },
    { title: 'Elspeth\'s Journal: Brimstone', text: 'Phosphor from Brimstone comb burns hotter than anything in the valley. Melt it into Amberglass and you get Ember Glass, which does not break in heat and glows a little in the dark. I made a lantern of it. The Hollow is next.' },
    { title: 'The Wardens\' Charter, Article Twelve', text: 'A Warden may use any tool that serves the three kingdoms. The Charter does not mention gears because the Charter is older than gears. Use them.' },
  ],
  hollow: [
    { title: 'Elspeth\'s Journal: The Hollow', text: 'The Heartroot\'s deepest roots break through the ceiling of the Hollow. The glowcaps feed on them. So do the Lantern Moths. Everything down here is living on the Heartroot\'s dreams.' },
    { title: 'Elspeth\'s Journal: Lanternfig', text: 'Nightebony and Glowcap, crossed down here in the dark, make Lanternfig. Its light is the same light the Heartroot gives off in the old paintings. A Verdant Matriarch will only be born near one. I think the Matriarch needs to see the Heartroot\'s light to know what she is for.' },
    { title: 'Elspeth\'s Last Entry', text: 'I am too old to finish this. Here is the road, for whoever comes next: Sovereign and Paradise, in a Hivespire, in spring, under a Lanternfig. Then Spireglass and Lanternfig, with her pollen. Then Prismwing and Silkspinner, on the Longest Day. Plant the Heartwood on the isle. Keep her hive beside it. Let the Dawnwing settle in its leaves. The Heartroot will hear. I am sure of it. I am almost sure of it. Look after the hives.' },
  ],
};

// Letters arrive every few real hours.
export const LETTERS = [
  { from: 'Tobin Ashgrove', text: 'Glad you came. The estate has been quiet too long. Scoop a few wild hives, get a Skep going and come and see me at the Guild Hall when you have honey on your hands.', gift: { goldmel: 3 } },
  { from: 'Marra Quill', text: 'Welcome to Thistlewick. I buy almost anything, and I pay fair. Better than fair if you bring me Meadmelt. Enclosed: a few seeds, on the house.', gift: { seed_wild: 3 } },
  { from: 'Wren', text: 'Hi!! I\'m Wren, I run the post and the order board. New orders every morning. I am VERY reliable. Here\'s a frame I found.', gift: { plain_frame: 1 } },
  { from: 'Fennick Gearwright', text: 'You probably know who my grandfather was. I\'d understand if you\'d rather not buy from me. But my blueprints are good, and they\'re fairly priced, and I would like to help. — F.', gift: { stone: 6 } },
  { from: 'Hettie Moss', text: 'Come to the well. I will tell you a true thing each day.', gift: { seed_fen: 2 } },
  { from: 'Tobin Ashgrove', text: 'A note on records: every species you see, read, breed or purify earns the Guild\'s regard. Renown makes rank, and rank opens doors. Literally, in a couple of cases.', gift: { goldmel: 5 } },
  { from: 'Marra Quill', text: 'Saw your hives from the road. Very handsome. Have some candles, they\'re slightly squashed.', gift: { candle: 2 } },
  { from: 'Wren', text: 'Did you know you can point a Runnel INTO a hive? It\'ll load Couriers for you. Fennick told me. I think he wanted me to tell you.', gift: { cerewax: 4 } },
  { from: 'Fennick Gearwright', text: 'Wind Sails turn faster up in the Rimeback. Waterwheels need to touch water. Bellows burn anything that burns. That is the whole of power, really.', gift: { timber: 6 } },
  { from: 'Tobin Ashgrove', text: 'Your grandmother left cairns all over the valley. Warden waymarkers. She used to tuck pages inside. If you find any, read them.', gift: { goldmel: 4 } },
  { from: 'A Fen Child', text: 'my nan says you are making the bees happy again. here is a pretty stone', gift: { gem_shard: 1 } },
  { from: 'Marra Quill', text: 'Every week Wren posts a Grand Order. Do one and you\'ll eat well for a month.', gift: { seed_orchard: 2 } },
];

// The main questline. goal types: stat, have, place, matron, codex, gate, rank, talk, lore, colony, awake, ferry
export const QUESTS = [
  // ─── Act I ───
  { id: 'q1', act: 1, title: 'A Scoop and a Promise', goal: { type: 'stat', key: 'hivesScooped', n: 1 },
    text: 'Wild hives hang from the trees around the estate. Walk up to one and gather it with your Hive Scoop.',
    hint: 'Look for a striped, hanging hive near the trees around the Homestead. Walk next to it and press E (or tap it).' },
  { id: 'q2', act: 1, title: 'The First Matron', goal: { type: 'matron' },
    text: 'Place your Skep on open ground. Open it and put in an Heiress and a Courier. They will pair into a Matron and get to work.',
    hint: 'Select the Skep in your hotbar, then tap a free tile. Open it and tap the Heiress and Courier in your bag. Hummers need their blossom close by: Meadowmotes forage the flowery meadow patches.', reward: { items: { goldcomb: 2 } } },
  { id: 'q3', act: 1, title: 'Spin the Comb', goal: { type: 'stat', key: 'combsSpun', n: 5 },
    text: 'Combs are worth little until they are spun. Build a Combwheel at the Workbench and spin five combs into Goldmel and Cerewax.',
    hint: 'You need 6 Timber and 4 Fieldstone. Fell a tree with your axe and pick up loose rocks. Without power, use the Crank button.', reward: { crowns: 20 } },
  { id: 'q4', act: 1, title: 'Meet the Steward', goal: { type: 'talk', npc: 'tobin' },
    text: 'Tobin Ashgrove, the last steward of the Wardens\' Guild, wants to see you at the Guild Hall in Thistlewick.',
    hint: 'Thistlewick is east along the path from the Homestead.' },
  { id: 'q5', act: 1, title: 'Through the Bramble', goal: { type: 'gate', id: 'g_thicket' },
    text: 'The Old Thicket lies west, behind a bramble wall. Craft a Brush Hook and cut your way in.',
    hint: 'Brush Hook: 2 Timber, 3 Fieldstone, 1 Cerewax at a Workbench. Then walk to the Bramble Snarl and press E.', reward: { crowns: 15 } },
  { id: 'q6', act: 1, title: 'A Different Hum', goal: { type: 'codex', sp: 'barkbuzz', stage: 1 },
    text: 'The Barkbuzz lives in the Old Thicket. Find one of its hives and scoop it.',
    hint: 'Barkbuzz need Needlebloom to work. They forage from Needlepines, or from a Flower Bed planted with Needlebloom Cones.' },
  { id: 'q7', act: 1, title: 'A Box With Frames', goal: { type: 'place', s: 'hivebox', n: 1 },
    text: 'A Skep breeds true. To breed something new you need a Hive Box, where the Strand can shift.',
    hint: 'Hive Box: 4 Waxed Timber and 2 Cerewax. Waxed Timber is Timber and Cerewax at the Workbench.' },
  { id: 'q8', act: 1, title: 'The First Cross', goal: { type: 'codex', sp: 'hearthling', stage: 3 },
    text: 'Pair a Meadowmote with a Barkbuzz in the Hive Box. When the Matron dies, some of her offspring may be something new: a Hearthling.',
    hint: 'Each offspring has about a 15% chance. Keep breeding the line. Your Lens shows each specimen\'s full genome.', reward: { crowns: 60, renown: 20, bp: ['waxed_frame'], items: { plain_frame: 2 } } },
  { id: 'q9', act: 1, title: 'Planting Roots', goal: { type: 'stat', key: 'scionsPlanted', n: 2 },
    text: 'Groves are the other half of the estate. Gather Scions from wild trees (or fell them) and plant two near your hives.',
    hint: 'Mature trees drop Scions now and then. Felling a tree with your axe often gives one too.' },
  { id: 'q10', act: 1, title: 'Wings in the Orchard', goal: { type: 'colony' },
    text: 'Catch a wild Flitter with your net and release it onto a Grove it can host on. It will live there, pollinate and spin cocoons.',
    hint: 'Meadow Pales flutter around Meadowfold by day and host on Orchard-blossom trees like Commonwood.' },
  { id: 'q11', act: 1, title: 'Silverleaf', goal: { type: 'codex', sp: 'silverleaf', stage: 3 },
    text: 'A Commonwood pollinated with Paperbark pollen may drop a Silverleaf Scion. Bring the two trees close together, with hives or Flitters to carry the pollen.',
    hint: 'Pollinated groves show pale blossom. A hybrid Scion falls from them a little later.', reward: { crowns: 80, renown: 25, items: { seed_orchard: 3 } } },
  // ─── Act II ───
  { id: 'q12', act: 2, title: 'Wider Fields', goal: { type: 'talk', npc: 'tobin' },
    text: 'Report to Tobin. He has plans for you.', hint: 'Guild Hall, Thistlewick.' },
  { id: 'q13', act: 2, title: 'The Fen Road', goal: { type: 'gate', id: 'g_saltfen' },
    text: 'The footbridge to Saltfen is broken. Ten Waxed Timber will rebuild it.', hint: 'The bridge is east of Thistlewick.', reward: { crowns: 30 } },
  { id: 'q14', act: 2, title: 'Lines of Rank', goal: { type: 'all', of: [{ type: 'codex', sp: 'gentry', stage: 3 }, { type: 'codex', sp: 'toiler', stage: 3 }] },
    text: 'Hearthling crossed with Tended can give Gentry or Toiler. Breed both. They are the first steps toward Crownmilk and Pollenknots.',
    hint: 'Tended comes from Hearthling crossed with any wild hummer.', reward: { renown: 20, crowns: 50 } },
  { id: 'q15', act: 2, title: 'A Name in the Guild', goal: { type: 'rank', n: 1 },
    text: 'Earn the rank of Tender. Renown comes from discovering, reading, breeding and purifying species, from orders and from lore.',
    hint: 'Analyse specimens with your Lens and fill your Codex. Wren\'s orders pay Renown too.' },
  { id: 'q16', act: 2, title: 'The Dune Road', goal: { type: 'gate', id: 'g_sunscar' },
    text: 'A rockfall blocks the road to the Sunscar Dunes. The quarrymen want 300 Crowns, and a Tender\'s word.',
    hint: 'The rockfall is at the eastern edge of Saltfen. Sell goods to Marra for Crowns.' },
  { id: 'q17', act: 2, title: 'Glass From Sand', goal: { type: 'stat', key: 'made_amberglass', n: 4 },
    text: 'Ascetic hummers line their comb with Glass Grit. Melt it with Amber Resin in a Glassforge to make Amberglass.',
    hint: 'Dunemote and Tended in Sunscar give Sparing; Sparing and Dunemote give Ascetic. Glassforges need power: a Windlass or Wind Sail.', reward: { renown: 25, crowns: 60 } },
  { id: 'q18', act: 2, title: 'Crownmilk and Pollenknots', goal: { type: 'all', of: [{ type: 'codex', sp: 'sovereign', stage: 3 }, { type: 'codex', sp: 'foreman', stage: 3 }] },
    text: 'Breed a Sovereign and a Foreman. Only they make the Crownmilk and Pollenknots a Hivespire is built from.',
    hint: 'Specialty products only appear when a hive is thriving: exactly its home climate, with its blossom in reach.', reward: { renown: 30, crowns: 100 } },
  { id: 'q19', act: 2, title: 'Grower', goal: { type: 'rank', n: 2 },
    text: 'Reach the rank of Grower.', hint: 'Fill the Codex. Purebred specimens count too.', reward: { bp: ['hivespire'], crowns: 50 } },
  // ─── Act III ───
  { id: 'q20', act: 3, title: 'Iron From Sand', goal: { type: 'stat', key: 'made_iron_ingot', n: 4 },
    text: 'Rustwing hummers sift iron from red sand. Smelt their flakes into four Iron Ingots.',
    hint: 'Foreman and Sparing in Sunscar can give Rustwing. You will need a Smeltery (Fennick, Grower rank).' },
  { id: 'q21', act: 3, title: 'The Hivespire', goal: { type: 'place', s: 'hivespire', n: 1 },
    text: 'Build a Hivespire: four Regal Panels, four Amberglass and two Gearsets. Twice the output, wider reach, and room for climate modules.',
    hint: 'Regal Panels and Gearsets come from a Joiner.', reward: { renown: 40, crowns: 120 } },
  { id: 'q22', act: 3, title: 'The Snowdrift Pass', goal: { type: 'gate', id: 'g_rimeback' },
    text: 'Melt the Snowdrift Pass with six panes of Amberglass and climb to the Rimeback Peaks.', hint: 'The pass is at the far west of the Old Thicket.' },
  { id: 'q23', act: 3, title: 'The Canopy Ravine', goal: { type: 'gate', id: 'g_canopy' },
    text: 'Bridge the ravine into the Canopy Deep with Silkwax Cloth and Waxed Timber.',
    hint: 'The ravine is north of the Sunscar Dunes. Silkwax Cloth comes from a Loomframe.' },
  { id: 'q24', act: 3, title: 'Paradise', goal: { type: 'codex', sp: 'paradise', stage: 3 },
    text: 'Breed a Paradise hummer, the line Elspeth said helped her think.', hint: 'Leafhum and Ascetic give Orchid. Orchid and Leafhum in the Canopy Deep give Paradise.', reward: { renown: 30 } },
  { id: 'q25', act: 3, title: 'The Ferry', goal: { type: 'ferry' },
    text: 'The old Warden ferry at the lake dock could reach the isle at the centre of the valley. Bring 12 Waxed Timber and 3 Silkwax Cloth to the dock to repair it.',
    hint: 'The dock is north of Thistlewick, on the lake shore.', reward: { renown: 20 } },
  { id: 'q26', act: 3, title: 'Warden', goal: { type: 'rank', n: 3 },
    text: 'Reach the rank of Warden. Only a Warden may cross into the Ashvent and the Hollow.', hint: 'Keep filling the Codex and completing orders.', reward: { bp: ['frost_ward', 'ember_lantern'], crowns: 150 } },
  // ─── Act IV ───
  { id: 'q27', act: 4, title: 'Through the Vents', goal: { type: 'gate', id: 'g_ashvent' },
    text: 'Make a Frost Ward and pass the Scalding Vents into the Ashvent Caldera.', hint: 'Frost Ward: 3 Silkwax Cloth and 16 Ice Shards. The vents are north of the Canopy Deep.' },
  { id: 'q28', act: 4, title: 'Brimstone', goal: { type: 'codex', sp: 'brimstone', stage: 3 },
    text: 'Breed a Brimstone for Phosphor, the fuel of Ember Glass.', hint: 'Cinder and Tended in the Ashvent give Emberling; Emberling and Cinder give Brimstone.', reward: { renown: 30 } },
  { id: 'q29', act: 4, title: 'Into the Barrow', goal: { type: 'gate', id: 'g_hollow' },
    text: 'Light an Ember Lantern and enter the Sealed Barrow into the Hollow.', hint: 'The barrow is north of the Rimeback Peaks.' },
  { id: 'q30', act: 4, title: 'A Light in the Dark', goal: { type: 'codex', sp: 'lanternfig', stage: 3 },
    text: 'Breed a Lanternfig: Nightebony crossed with Glowcap, down in the Hollow.', hint: 'Nightebony comes from Tanglewood crossed with Duskplum.', reward: { renown: 40, crowns: 200 } },
  // ─── Act V ───
  { id: 'q31', act: 5, title: 'The Verdant Matriarch', goal: { type: 'codex', sp: 'verdant', stage: 3 },
    text: '"Sovereign and Paradise, in a Hivespire, in spring, under a Lanternfig."', hint: 'Spring comes every fourth day. Climate modules will keep a Canopy line happy elsewhere. Catalyst Frames and Field Notes help.', reward: { renown: 60 } },
  { id: 'q32', act: 5, title: 'The Heartwood', goal: { type: 'codex', sp: 'heartwood', stage: 3 },
    text: '"Then Spireglass and Lanternfig, with her pollen."', hint: 'A Verdant Matriarch hive must carry the pollen between a Spireglass and a Lanternfig.', reward: { renown: 60 } },
  { id: 'q33', act: 5, title: 'The Dawnwing', goal: { type: 'codex', sp: 'dawnwing', stage: 3 },
    text: '"Then Prismwing and Silkspinner, on the Longest Day."', hint: 'Pair them in a Chrysal Cradle on a summer day.', reward: { renown: 60 } },
  { id: 'q34', act: 5, title: 'Wake the Heartroot', goal: { type: 'awake' },
    text: 'Plant the Heartwood on the isle. Keep a Verdant Matriarch working beside it. Let a Dawnwing settle in its leaves.',
    hint: 'All three must be working at once, on the isle. The Matriarch still forages Orchard blossom: plant a Flower Bed of it beside her.' },
  { id: 'q35', act: 5, title: 'Heartwarden', goal: { type: 'talk', npc: 'tobin' },
    text: 'Tell Tobin.', hint: 'He already knows. Everyone knows. Go anyway.', reward: { renown: 100, crowns: 500 } },
];

// What NPCs say when a quest step points at them (keyed by quest id), or on first meeting.
export const DIALOGUE = {
  q4: [
    ['tobin', 'So you\'re Elspeth\'s grandchild. You have her chin. Hopefully not her temper.'],
    ['tobin', 'I\'m Tobin. Steward of the Wardens\' Guild, which these days means I sweep the floor of the Guild Hall and remember things.'],
    ['tobin', 'Here is the short of it. Under the lake there\'s a tree older than the valley. The Heartroot. Wardens kept it awake by tending three kingdoms together: hummers, groves and flitters. Sixty years ago we stopped. It went to sleep, and the valley has been closing in on itself ever since.'],
    ['tobin', 'Brambles where there were roads. Rockfalls. Snow that doesn\'t melt. Your grandmother spent her whole life trying to find the way back. I think she got close.'],
    ['tobin', 'Start small. There are Barkbuzz in the Old Thicket, west of your house, behind the brambles. Cross one with a Meadowmote in a proper Hive Box and you\'ll have your first Hearthling. Make a Brush Hook and go.'],
    ['tobin', 'Oh, and one more thing. From today you are a Keeper of the Guild. It\'s the lowest rank. There\'s a badge somewhere. I\'ll find it.'],
  ],
  q12: [
    ['tobin', 'A Hearthling, a Silverleaf and a butterfly colony. Elspeth\'s grandchild indeed.'],
    ['tobin', 'Now the long road. Every great Warden building needs two things only two lines make: Crownmilk, from Sovereigns, and Pollenknots, from Foremen. Both start from Hearthling and Tended.'],
    ['tobin', 'You\'ll want the fen, and then the dunes. Saltfen is across the old footbridge east of town. It wants ten Waxed Timber to fix.'],
    ['tobin', 'And see Fennick. Yes, Gearwright\'s grandson. He\'s a good lad, and the valley will need his machines as much as your hives. That\'s the lesson his grandfather never learned.'],
  ],
  q35: [
    ['tobin', 'I felt it in my knees before I saw it. The whole valley sighed.'],
    ['tobin', 'Sixty years. I\'d stopped hoping and kept sweeping the floor out of habit.'],
    ['tobin', 'By the Charter and by my own say-so, you\'re a Heartwarden now. There hasn\'t been one since your great-great-grandmother. There is definitely a badge for this one.'],
    ['tobin', 'The work doesn\'t stop, mind. The Heartroot needs its Triad tended, and there are species in that Codex of yours nobody has seen in a century. Go and find them.'],
  ],
  meet_marra: [['marra', 'Ah, the new Warden! I\'m Marra. I buy and I sell. You bring me goods, I bring you Crowns, everyone goes home happy.']],
  meet_fennick: [['fennick', 'Oh. Hello. You\'re... yes. I\'m Fennick. I make machines. And blueprints for machines. I know what my family did. I\'d like to help, if you\'ll let me.']],
  meet_wren: [['wren', 'Hi! Wren! Courier! I post the orders on the board every morning. Fill them, get paid, get famous. Well, Renown. Same thing.']],
  meet_hettie: [['hettie', 'Sit, child. Each day I will tell you one true thing about how the kingdoms cross. Today\'s is free. They\'re all free. Come back tomorrow.']],
};

export const RANKS = [
  { name: 'Keeper', renown: 0 },
  { name: 'Tender', renown: 80 },
  { name: 'Grower', renown: 250 },
  { name: 'Warden', renown: 550 },
  { name: 'Heartwarden', renown: 99999 },
];

export const INTRO = [
  'My dear,',
  'If you are reading this, I am gone and the estate is yours. I am sorry it is in such a state. The hives are wild again, the orchard is half dead and the workshop smells of mice.',
  'But the valley is not dead. It is asleep. Everything I learned about waking it is written down somewhere: in my journals, in the cairns, and in the hives themselves, if you know how to read them.',
  'Take my Scoop, my Net, my Lens and my old axe. There is a Skep by the door. Start with one wild hive. Then another. Then see where it takes you.',
  'Tobin will help. Marra will overcharge you. Fennick will apologise for his grandfather. Let him.',
  'Look after the hives.',
  '— Your grandmother, Elspeth Vale',
];
