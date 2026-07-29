/**
 * 素材清单。id 决定输出路径 assets/art/<category>/<id>.png。
 * subject 只描述画面内容，风格与负面约束由分类预设补齐。
 */

export const MANIFEST = [
  // 定调批：确认画风后再铺开全量生产
  {
    id: 'threadbind',
    category: 'card',
    tags: ['tone'],
    subject:
      'a weaver mage pulling a single luminous golden thread out of a fractured pocket watch, ' +
      'the thread coils forward toward the viewer and splits into four ghostly afterimages',
  },
  {
    id: 'collapse',
    category: 'card',
    tags: ['tone'],
    subject:
      'a cathedral of clock gears imploding into a magenta singularity, ' +
      'shattered golden hour-hands converging inward, shockwave ring of light',
  },
  {
    id: 'shove',
    category: 'card',
    tags: ['tone'],
    subject:
      'an armored gauntlet of brass and glass shoving a floating rune tile sideways along a ' +
      'glowing rail of light, motion trails of displaced time behind it',
  },
  {
    id: 'mote-gnaw',
    category: 'enemy',
    tier: 'minion',
    tags: ['tone'],
    subject:
      'a insectoid time parasite the size of a dog, chitin plated with cracked clock faces, ' +
      'six needle legs, mandibles chewing a strand of glowing golden thread, hollow amber eyes',
  },
  {
    id: 'cracked-hourglass',
    category: 'relic',
    tags: ['tone'],
    subject:
      'an ornate hourglass with a fractured upper bulb, magenta sand escaping upward as glowing ' +
      'motes instead of falling, gold clawed feet',
  },
  {
    id: 'hourguard',
    category: 'card',
    subject:
      'a curved shield woven from taut golden clock chains, hanging in mid air, ' +
      'concentric ripples of amber light spreading outward from its center where a blow landed',
  },
  {
    id: 'lacerate',
    category: 'card',
    subject:
      'two crossing slashes of golden light tearing through a hanging brass pendulum, ' +
      'the cut edges glowing white hot, fragments frozen in the moment of separation',
  },
  {
    id: 'corrode',
    category: 'card',
    subject:
      'a gilded gear mechanism eaten through by creeping verdigris rot, ' +
      'flaking metal drifting off as fine dust, the decay spreading along the teeth',
  },
  {
    id: 'foresight',
    category: 'card',
    subject:
      'a single wide open eye set inside an astrolabe ring, its iris a spiral of star charts, ' +
      'thin golden sight lines projecting forward into darkness',
  },
  {
    id: 'weaver-portrait',
    category: 'ui',
    subject:
      'the head and shoulders of a hooded weaver, face half lost in shadow under the hood, ' +
      'one eye catching the light, thin golden threads trailing from the collar of the robe',
  },
  {
    id: 'act1-clocktower',
    category: 'bg',
    tags: ['tone'],
    subject:
      'the ruined interior of a colossal clocktower, broken gears the size of buildings frozen ' +
      'mid-rotation, shattered stained glass raining upward, indigo fog pooling on the floor',
  },

  // card · 织：垂直中轴，连续的线与编织结构，自下而上收拢
  {
    id: 'spool-start',
    category: 'card',
    subject:
      "a brass spool unwinding a golden thread that climbs upward into a tight vertical helix, " +
      "thread root anchored in a cracked stone socket, loose fibers trembling along the coil's outer edge",
  },
  {
    id: 'warp-lattice',
    category: 'card',
    subject:
      'a vertical lattice of woven golden filaments rising from a dark floor, each intersection ' +
      'knotted around a tiny gear, the topmost rows still unfinished and fraying loose',
  },
  {
    id: 'gilded-seam',
    category: 'card',
    subject:
      'two torn halves of a golden woven fabric drawing together along a vertical seam, molten ' +
      'gold filling the gap between them, loose threads curling inward from both torn edges',
  },
  {
    id: 'loom-anchor',
    category: 'card',
    subject:
      'a heavy brass loom weight sunk into dark stone, three taut golden threads rising from it ' +
      'and vanishing into haze above, the stone base chipped at one corner',
  },
  {
    id: 'second-hand-vow',
    category: 'card',
    subject:
      'a slender clock second-hand bound upright with a single loop of golden thread, faint ' +
      "concentric rings expanding from the knot, the hand's tip worn smooth from years of use",
  },
  {
    id: 'braid-of-hours',
    category: 'card',
    subject:
      'three separate golden threads braiding into one thicker cord as they rise, twelve small ' +
      'hour marks spaced along the braid, the topmost mark glowing brighter than the rest',
  },
  {
    id: 'mending-coil',
    category: 'card',
    subject:
      'a coiled golden wire spiral tightening around a cracked porcelain clock face, hairline ' +
      'cracks closing from bottom to top, fine gold dust settling into the sealed seams',
  },
  {
    id: 'quiet-movement',
    category: 'card',
    subject:
      'a sealed brass clock movement resting upright, one thin golden thread feeding into it ' +
      'from below, gears turning without sound, a faint hum implied by trembling dust on its surface',
  },
  {
    id: 'thread-doubling',
    category: 'card',
    subject:
      'a single golden thread rising and splitting cleanly into two identical parallel strands ' +
      'of equal brightness, both strands curving in unison as they climb toward the top edge',
  },
  {
    id: 'lattice-bloom',
    category: 'card',
    subject:
      'a vertical spire of interlocking golden rings unfolding outward like a flower at its top, ' +
      'roots of thread spreading below into the dark floor, each ring larger than the last',
  },
  {
    id: 'patient-weft',
    category: 'card',
    subject:
      'a half-finished golden tapestry on an upright frame, the shuttle paused mid-pass, unwoven ' +
      "warp threads waiting above, loose weft strands hanging still along the tapestry's lower edge",
  },
  {
    id: 'bobbin-guard',
    category: 'card',
    subject:
      'a ring of upright brass bobbins forming a circular palisade, golden thread strung tightly ' +
      'between each post, one bobbin cracked and leaking loose fiber onto the stone floor',
  },
  {
    id: 'spiral-ward',
    category: 'card',
    subject:
      'a dome of concentric golden spirals rising from a stone floor, indigo shadow pooling ' +
      'outside the dome, the innermost spiral drawn so tight it glows white at its core',
  },
  {
    id: 'hour-tapestry',
    category: 'card',
    subject:
      'a colossal woven tapestry hanging vertically, its pattern made of twelve interlocking ' +
      'clock faces rendered in gold thread, the lowest corner unraveling into loose golden strands',
  },
  {
    id: 'eternal-warp',
    category: 'card',
    subject:
      'an infinite vertical column of woven golden thread receding upward into darkness, no ' +
      'visible top, anchored in a single brass ring, faint knots marking where older threads were spliced in',
  },

  // card · 引：单点透视，放射与光锥，由内向外扩张
  {
    id: 'draw-the-arc',
    category: 'card',
    subject:
      'a gauntleted hand drawing a glowing arc of light toward the viewer, concentric wavefronts ' +
      'expanding outward from the fingertip, faint dust caught mid-flight inside the innermost ring',
  },
  {
    id: 'lens-of-noon',
    category: 'card',
    subject:
      'a polished brass lens suspended in darkness focusing a narrow amber beam that widens ' +
      'toward the viewer, tiny scratches on the lens catching stray threads of light',
  },
  {
    id: 'amber-conduit',
    category: 'card',
    subject:
      'an amber crystal conduit radiating eight straight beams outward from a single burning ' +
      "core, the crystal's faceted surface fractured along one edge where a beam escapes crooked",
  },
  {
    id: 'resonance-lance',
    category: 'card',
    subject:
      'a spear of compressed amber light launching from a small brass aperture, shockwave rings ' +
      "trailing behind it, the aperture's rim glowing hot from the force of release",
  },
  {
    id: 'focal-hour',
    category: 'card',
    subject:
      'a single clock face burning white-hot at its center, radiating twelve beams outward along ' +
      'its hour marks, the glass cracking at the rim from the building heat',
  },
  {
    id: 'cascade-call',
    category: 'card',
    subject:
      'a brass horn mouth releasing successive expanding rings of amber light, each ring brighter ' +
      "than the last, the horn's surface etched with worn spiraling filigree",
  },
  {
    id: 'prism-of-echoes',
    category: 'card',
    subject:
      'a faceted crystal prism splitting one amber beam into five diverging beams of equal ' +
      'width, each beam casting a faint colored afterimage where it lands',
  },
  {
    id: 'summon-afterimage',
    category: 'card',
    subject:
      'a robed figure standing at the focal point of expanding light rings, one magenta ' +
      'afterimage separating forward from the body, its outline slightly blurred at the edges',
  },
  {
    id: 'widening-cone',
    category: 'card',
    subject:
      'a cone of amber light opening from a narrow brass gate toward the viewer, dust motes ' +
      "accelerating along its walls, the gate's hinges straining under the pressure",
  },
  {
    id: 'golden-recital',
    category: 'card',
    subject:
      "a conductor's raised hand at the center of a radiating burst of golden light, faint " +
      'magenta echo outlines fanning outward behind it, sheet music dissolving into scattered gold motes',
  },
  {
    id: 'deep-channel',
    category: 'card',
    subject:
      'a deep brass shaft seen head-on, rings of amber light rising out of it toward the viewer, ' +
      "darkness at its far end, condensation beading on the shaft's inner walls",
  },
  {
    id: 'chorus-of-hands',
    category: 'card',
    subject:
      'seven gilded hands emerging in a radial fan from a central point, each holding a small ' +
      'burning ember, the embers flickering at slightly different intensities',
  },
  {
    id: 'burning-meridian',
    category: 'card',
    subject:
      'a vertical meridian line of white-hot gold splitting a dark sphere, heat radiating ' +
      "outward in concentric distortion rings, the sphere's surface cracking along invisible fault lines",
  },
  {
    id: 'full-chime',
    category: 'card',
    subject:
      'a great brass bell struck at its center, expanding shells of amber sound made visible as ' +
      "nested translucent domes, the bell's surface still humming with the impact",
  },

  // card · 扰：强对角线，锐角与断裂，横向剪切，主体偏离中轴
  {
    id: 'shear',
    category: 'card',
    subject:
      'two heavy brass blades scissoring past each other along a diagonal, a golden thread ' +
      'severed at the crossing point, both cut ends already drifting apart in opposite directions',
  },
  {
    id: 'skip-tooth',
    category: 'card',
    subject:
      'a gear with one tooth broken out, its partner gear slipping diagonally past the gap, ' +
      'sparks thrown to the upper right, the broken tooth still spinning loose in the foreground',
  },
  {
    id: 'jam-escapement',
    category: 'card',
    subject:
      'an iron wedge driven diagonally into a clock escapement, the pallet fork frozen mid-swing, ' +
      "gear teeth deformed at contact, fine metal shavings scattered along the wedge's entry path",
  },
  {
    id: 'backlash',
    category: 'card',
    subject:
      'a wound mainspring released violently along a diagonal, coils whipping outward and ' +
      "striking back toward their own housing, the housing's brass casing already dented from the recoil",
  },
  {
    id: 'desync',
    category: 'card',
    subject:
      'two identical clock faces sliding out of alignment along a diagonal, their hour hands ' +
      'pointing to conflicting times, a thin crack opening between the two faces where they separate',
  },
  {
    id: 'fracture-line',
    category: 'card',
    subject:
      'a diagonal fracture running across a plate of dark enamel armor, gold light bleeding out ' +
      "of the crack, small enamel chips flaking away from the fracture's widening edge",
  },
  {
    id: 'strip-gear',
    category: 'card',
    subject:
      'a brass gear with its teeth shorn off along one diagonal edge, stripped metal shavings ' +
      "flung to the upper right, the gear's remaining teeth bent and misaligned",
  },
  {
    id: 'off-beat',
    category: 'card',
    subject:
      'a pendulum knocked off its arc by a diagonal impact, swinging on a tilted plane, its ' +
      "shadow lagging behind, the pendulum's chain visibly twisted from the sudden blow",
  },
  {
    id: 'wedge',
    category: 'card',
    subject:
      'a sharp obsidian wedge forced diagonally between two interlocking brass gears, prying ' +
      'them apart, fine gear dust spraying diagonally from the widening gap between the teeth',
  },
  {
    id: 'unwind',
    category: 'card',
    subject:
      'a spool violently unwinding in reverse along a diagonal, golden thread tearing free and ' +
      "coiling loose behind it, the spool's axle bent from the sudden reversal of force",
  },
  {
    id: 'cross-cut',
    category: 'card',
    subject:
      'two diagonal cuts of amber light crossing at an off-center point, four fragments of a ' +
      'clock face separating along them, each fragment drifting along its own diagonal path',
  },
  {
    id: 'dead-tick',
    category: 'card',
    subject:
      'a clock hand stopped mid-tick against a diagonal iron bar, the hand bent at the point of ' +
      'contact, no light on its face, fine rust already forming along the bend',
  },
  {
    id: 'sand-in-gears',
    category: 'card',
    subject:
      'dark sand pouring diagonally into an exposed gear train, grains packing between the ' +
      'teeth, movement grinding to a halt, a thin plume of grit rising from the jammed mechanism',
  },

  // enemy · 小怪：剪影单凸包，外突不超过 4 处，侧向姿态，钟面破碎或空白
  {
    id: 'tick-mite',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a crouching mite of dull brass, its back a single blank clock face with no hands, four ' +
      'short legs, a low compact silhouette, thin antennae twitching forward near the ground',
  },
  {
    id: 'dust-acolyte',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a hunched robed acolyte in three-quarter stance, face hidden, a hollow empty clock dial ' +
      'where the chest should be, hands full of grey dust, tattered hem dragging along the ground',
  },
  {
    id: 'cracked-chorister',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a thin robed singer leaning sideways, jaw hanging open, a shattered porcelain dial fused ' +
      'to its throat, no hands on the dial, one arm raised as if still conducting a note',
  },
  {
    id: 'minute-hound',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a lean quadruped hound of dark enamel and brass in mid-stride profile, ribs formed from ' +
      'broken clock hands, empty dial on its flank, jaws parted mid-snarl toward something unseen',
  },
  {
    id: 'pendulum-wisp',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a hovering wisp trailing a single bent pendulum rod beneath it, body a knot of tarnished ' +
      'brass, its dial face blank and cracked, faint trembling motion along the trailing rod',
  },
  {
    id: 'sand-crawler',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a low armored crawler in side view, shell of compacted dark sand and broken glass, dry ' +
      'sand pouring from a fractured empty dial on its back',
  },
  {
    id: 'warp-thief',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a low flat scuttler seen in side profile, its body a stack of overlapping blank dial ' +
      'plates like a pinecone, a short skirt of stubby legs beneath, one long hooked forelimb ' +
      'reaching ahead, a cracked empty dial sealing its blunt head',
  },
  {
    id: 'flare-moth',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a ragged moth folded in side profile on a broken perch, wings made of scorched paper dial ' +
      'faces with no hands, a swollen abdomen glowing from within, a thin curled proboscis, torn ' +
      'wing edges trailing loose ash',
  },
  {
    id: 'null-leech',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a fat segmented leech reared sideways off the ground, ringed body slick and translucent, ' +
      'a round sucker mouth opened forward and lined with fine teeth, a hollow blank dial ' +
      'embedded in its swollen tail',
  },
  {
    id: 'late-shade',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a tall thin wraith in side profile with no legs, its lower body fraying into a hanging ' +
      'tatter, one long arm dragging a heavy stone weight behind it across the ground, a ' +
      'shattered dial where its face would be',
  },

  // enemy · 精英：剪影带且仅带 1 处冠，外突 5–8 处，3/4 侧身，钟面完整正走
  {
    id: 'brass-inquisitor',
    category: 'enemy',
    tier: 'elite',
    subject:
      'a tall armored inquisitor in three-quarter stance, a single tall spiked brass crown as ' +
      'its only crest, an intact clock dial set in its breastplate with hands moving forward',
  },
  {
    id: 'hour-warden',
    category: 'enemy',
    tier: 'elite',
    subject:
      'a heavy warden in three-quarter stance carrying one oversized clock hand as a halberd ' +
      'across its back, intact dial on its shoulder guard, worn leather straps crossing its broad chest',
  },
  {
    id: 'the-unwound',
    category: 'enemy',
    tier: 'elite',
    subject:
      'a gaunt figure in three-quarter stance with a single ruptured chest cavity as its crest, ' +
      'loose mainspring coils spilling out, intact dial embedded above the rupture',
  },
  {
    id: 'glass-cardinal',
    category: 'enemy',
    tier: 'elite',
    subject:
      'a robed cardinal in three-quarter stance, a single tall mitre of fractured stained glass ' +
      'as its crest, intact clock dial held in one hand, the other hand raised in a stiff blessing',
  },
  {
    id: 'slag-sentinel',
    category: 'enemy',
    tier: 'elite',
    subject:
      'a broad armored sentinel in three-quarter stance, plates of cooled slag fused across its ' +
      'shoulders, a single squat horned helm as its only crest, an intact clock dial running ' +
      'forward on its thick forearm shield',
  },
  {
    id: 'chain-vicar',
    category: 'enemy',
    tier: 'elite',
    subject:
      'a hooded vicar in three-quarter stance bound in taut chains from shoulder to wrist, a ' +
      'single upright iron lock plate rising from its back as its crest, an intact ' +
      'forward-running dial fixed to its chest',
  },
  {
    id: 'deep-winder',
    category: 'enemy',
    tier: 'elite',
    subject:
      'an upright figure in three-quarter stance whose lower body is a single heavy screw thread ' +
      'bored down into the stone floor, a single tall spiral horn as its crest, an intact ' +
      'forward-running dial set on its shoulder',
  },

  // enemy · Boss：剪影跨度不低于画幅 85%，正面对称，双层轮廓，钟面逆走并自发品红光
  {
    id: 'bell-tyrant',
    category: 'enemy',
    tier: 'boss',
    subject:
      'a bell-bodied tyrant, cracked bronze bell as torso, two long arms of chain hanging wide, ' +
      'a reversed-running clock dial at its crown, broken bell fragments orbiting it',
  },
  {
    id: 'orrery-reversed',
    category: 'enemy',
    tier: 'boss',
    subject:
      'a figure built from nested brass armillary rings rotating backwards, an armored torso ' +
      'suspended at the center, a reversed dial where the head would be, loose orbiting spheres surrounding it',
  },
  {
    id: 'first-weaver',
    category: 'enemy',
    tier: 'boss',
    subject:
      'an enthroned weaver, six outstretched arms holding severed golden threads, a ' +
      'reversed-running clock dial for a face, a wide halo of hanging thread and orbiting clock fragments',
  },
  {
    id: 'plumb-magistrate',
    category: 'enemy',
    tier: 'boss',
    subject:
      'a colossal frontal magistrate whose entire lower body is one enormous plumb weight hanging ' +
      'from twin chains, a wide symmetrical shoulder mantle, two outstretched arms holding level ' +
      'balance pans, a huge reversed-running dial at its chest',
  },

  // relic：3/4 视角单体器物，馆藏布光，抠像底色
  {
    id: 'bent-minute-hand',
    category: 'relic',
    subject:
      'a long minute hand of blued steel bent into a shallow arc, gold filigree collar at its ' +
      "pivot, fine scratches running along the hand's outer curve where it once dragged against stone",
  },
  {
    id: 'weavers-thimble',
    category: 'relic',
    subject:
      'a gold thimble chased with woven line patterns, a short length of luminous thread still ' +
      'hooked through its rim, a tiny puncture mark near its rim where the thread was first pulled through',
  },
  {
    id: 'sealed-escapement',
    category: 'relic',
    subject:
      'a brass escapement assembly sealed under a fitted glass dome, pallet fork locked in ' +
      "place, wax seal at the base, a small brass plaque riveted to the dome's base left blank",
  },
  {
    id: 'tarot-of-the-null',
    category: 'relic',
    subject:
      'a single face-down tarot card of black lacquer and gold leaf, its back stamped with an ' +
      "empty clock dial, edges worn to brass, the card's corner slightly bent from being carried for a very long time",
  },
  {
    id: 'amber-ballast',
    category: 'relic',
    subject:
      'a heavy teardrop of solid amber banded in gold, suspended from a short brass chain, ' +
      "dense internal glow, the chain's links tarnished unevenly from years pressed against warm skin",
  },
  {
    id: 'brass-metronome',
    category: 'relic',
    subject:
      'a brass metronome with its pendulum arm locked upright, weight slid to the top, ornate ' +
      'scrollwork on the case, a thin layer of dust settled evenly across its untouched pendulum arm',
  },
  {
    id: 'widows-pendulum',
    category: 'relic',
    subject:
      'a long pendulum rod of tarnished silver ending in a black enamel disc, hairline crack ' +
      'across the disc face, the silver rod tarnished darkest near the point where a hand once gripped it',
  },
  {
    id: 'gilded-bobbin',
    category: 'relic',
    subject:
      'a gold-plated bobbin wound with luminous thread, ornate flanges engraved with hour marks, ' +
      'one flange slightly bent from being dropped and then hastily straightened again by hand',
  },
  {
    id: 'echo-tuning-fork',
    category: 'relic',
    subject:
      'a tall gold tuning fork with three tines instead of two, faint magenta light between the ' +
      "tines, the fork's handle worn smooth where countless fingers have struck it",
  },
  {
    id: 'inverted-astrolabe',
    category: 'relic',
    subject:
      'a brass astrolabe with every ring mounted backwards, its rete rotating counter to its ' +
      'plate, engraved star marks, verdigris pooling thickest where the backward rings meet the fixed frame',
  },
  {
    id: 'mainspring-heart',
    category: 'relic',
    subject:
      'a coiled mainspring wound into the shape of a heart, housed in an open brass cage, warm ' +
      "glow at its core, the cage's bars slightly splayed apart from the spring's constant pressure",
  },
  {
    id: 'dust-of-noon',
    category: 'relic',
    subject:
      'a small gold reliquary vial filled with glowing amber dust, stopper shaped as a sun disc, ' +
      'the stopper sealed with a thin ring of hardened golden wax',
  },
  {
    id: 'warden-key',
    category: 'relic',
    subject:
      'a heavy brass key with a clock dial as its bow and gear teeth as its bit, verdigris in ' +
      "the engraving, the key's shaft worn thin at the point where it turns each lock",
  },
  {
    id: 'looped-chain',
    category: 'relic',
    subject:
      'a short gold chain closed into a seamless loop with no visible join, each link cast as a ' +
      "tiny gear, the loop's surface polished bright where countless hands have run along it",
  },
  {
    id: 'clouded-lens',
    category: 'relic',
    subject:
      'a round brass-rimmed lens with a milky fracture pattern through its glass, ornate handle, ' +
      'the handle wrapped in cracked leather stained dark from years of use',
  },
  {
    id: 'second-shadow',
    category: 'relic',
    subject:
      'a small obsidian figurine casting two divergent shadows, gold inlay along its seams, the ' +
      "figurine's base carved with a single worn groove where it always rests",
  },
  {
    id: 'counterweight-crown',
    category: 'relic',
    subject:
      'a low brass crown hung with four small lead counterweights on short chains, engraved ' +
      'hour numerals on the band, the counterweights swinging faintly out of unison with each other',
  },
  {
    id: 'frozen-bell-clapper',
    category: 'relic',
    subject:
      'a bell clapper of dark iron encased in a shell of clear ice, gold suspension ring at its ' +
      'top, faint cracks spreading through the ice from the clapper\'s contained weight',
  },
  {
    id: 'spool-of-last-hour',
    category: 'relic',
    subject:
      'a large brass spool almost fully unwound, only a few turns of luminous thread remaining, ' +
      'ornate end caps, the remaining thread pulled taut as if it could snap at any moment',
  },
  {
    id: 'verdigris-gnomon',
    category: 'relic',
    subject:
      'a triangular sundial gnomon of heavily oxidized bronze mounted on a cracked marble base, ' +
      'no dial plate beneath it, a thin ring of pale stone visible where a dial plate once sat',
  },
  {
    id: 'shattered-numeral',
    category: 'relic',
    subject:
      'a single large roman numeral XII cast in gold, broken cleanly into three pieces held ' +
      'apart in mid air, each fragment suspended at a slightly different height above the other two',
  },
  {
    id: 'patience-sigil',
    category: 'relic',
    subject:
      'a flat gold medallion engraved with a spiral of decreasing hour marks, worn smooth at its ' +
      'center, the outermost ring of marks nearly worn away entirely by touch',
  },
  {
    id: 'null-anchor',
    category: 'relic',
    subject:
      'a heavy black iron anchor ring with a hollow empty dial at its center, gold chain fused ' +
      "solid where it enters the ring, the ring's inner surface polished smooth from something passing through it often",
  },

  // bg：横版场景，下方中部留空放置战斗单位
  {
    id: 'act2-reversed-gallery',
    category: 'bg',
    subject:
      'a weightless gallery of colossal brass armillary rings turning backwards, no floor, ' +
      'rubble and standing water flowing upward, the only light rising from ground fissures below, ' +
      'tarnished gold and dominant midnight blue',
  },
  {
    id: 'act3-null-sanctum',
    category: 'bg',
    subject:
      'the core sanctum of the temple with every clock hand stopped at the same mark, ' +
      'overlapping translucent afterimages of past moments filling the hall, near-black indigo ' +
      'depths lit only by magenta echo light, gold edges burned white',
  },

  // ui：对称装饰构件，抠像底色，运行时按幕做色调映射
  {
    id: 'card-back',
    category: 'ui',
    subject:
      'a perfectly symmetrical ornate card back panel, a central clock dial with no hands ' +
      'surrounded by radiating gold filigree and woven thread borders, dark indigo field',
  },
  {
    id: 'energy-sigil',
    category: 'ui',
    subject:
      'a small symmetrical gold sigil shaped as an eight-spoked clock dial with a burning amber ' +
      'core, crisp metallic bevel, the bevel catching a faint reflection along each of its eight points',
  },
  {
    id: 'track-slot-frame',
    category: 'ui',
    subject:
      'a symmetrical empty gold frame shaped as a single clock-hour segment, ornate corner ' +
      'scrollwork, hollow dark center, the scrollwork repeating in perfect mirrored symmetry on both sides of the frame',
  },
  {
    id: 'act-crest',
    category: 'ui',
    subject:
      'a symmetrical heraldic crest of gold filigree framing a hollow clock dial, flanked by two ' +
      'folded thread motifs, ornate base scroll, the base scroll unfurling into two symmetrical curls at its lowest point',
  },,
  // 变体批：与既有卡牌同系但效果侧重不同
  {
    id: 'thread-snap',
    category: 'card',
    subject:
      'a taut golden thread snapping at its midpoint, both severed ends whipping back in opposite '
      + 'directions, tiny sparks flying from the break, a brass bobbin spinning loose below',
  },
  {
    id: 'double-weft',
    category: 'card',
    subject:
      'two shuttles crossing paths mid-flight over a half-woven golden cloth, each trailing its own '
      + 'thread, the crossing point glowing white where the strands meet',
  },
  {
    id: 'stone-warp',
    category: 'card',
    subject:
      'a slab of dark granite with golden threads embedded straight through it like reinforcement '
      + 'bars, the surface cracked but held together by the taut metal strands',
  },
  {
    id: 'burr-thread',
    category: 'card',
    subject:
      'a golden thread covered in tiny barbed hooks, coiling around a brass pipe and biting into '
      + 'its surface, flakes of verdigris peeling away where the barbs catch',
  },
  {
    id: 'slow-spindle',
    category: 'card',
    subject:
      'a heavy stone spindle turning almost imperceptibly, one thick golden cord winding onto it, '
      + 'dust settled thick on its upper surface from long stillness',
  },
  {
    id: 'twin-anchor',
    category: 'card',
    subject:
      'two brass anchors driven into dark stone side by side, a single golden cable strung taut '
      + 'between them, the cable humming with faint vibration',
  },
  {
    id: 'frayed-hem',
    category: 'card',
    subject:
      'the frayed lower hem of a golden tapestry, loose threads hanging free and drifting, a few '
      + 'strands already dissolving into motes of light',
  },
  {
    id: 'knot-of-thirds',
    category: 'card',
    subject:
      'three golden cords tied into one complex knot at the center of a dark brass ring, each cord '
      + 'entering from a different angle, the knot pulled tight',
  },
  {
    id: 'pinhole-burst',
    category: 'card',
    subject:
      'a single pinhole in a sheet of brass with blinding amber light lancing through it in a '
      + 'narrow cone, the metal around the hole glowing red from heat',
  },
  {
    id: 'ember-tap',
    category: 'card',
    subject:
      'a brass spigot dripping molten amber light into darkness, each falling drop bursting into a '
      + 'small ring of light where it lands',
  },
  {
    id: 'split-flare',
    category: 'card',
    subject:
      'a beam of amber light striking a wedge-shaped brass prism and splitting into two diverging '
      + 'beams of unequal brightness, the wedge scorched at its edge',
  },
  {
    id: 'last-toll',
    category: 'card',
    subject:
      'a cracked bell struck once, a single visible shockwave ring leaving its rim, hairline '
      + 'fractures spreading across the bronze surface from the point of impact',
  },
  {
    id: 'sidestep-gear',
    category: 'card',
    subject:
      'a brass gear lifted out of its mounting and set down one notch to the side, the empty socket '
      + 'still glowing warm, a gloved hand withdrawing from the frame',
  },
  {
    id: 'reverse-pawl',
    category: 'card',
    subject:
      'a ratchet pawl flipped backward against its wheel, the teeth grinding in the wrong direction, '
      + 'metal shavings curling off where they bind',
  },
  {
    id: 'hold-fast',
    category: 'card',
    subject:
      'a brass clamp locked hard onto a swinging pendulum rod, freezing it mid-arc, frost creeping '
      + 'outward from the contact point',
  },
  {
    id: 'thread-theft',
    category: 'card',
    subject:
      'a hooked brass rod pulling a glowing golden thread out of a dark loom and drawing it away, '
      + 'the loom sagging where the thread was taken',
  },,

  // 标题界面的装饰件
  {
    id: 'title-frame',
    category: 'ui',
    subject:
      'a wide symmetrical heraldic ornament bar, two mirrored clockwork wings of filigree spreading '
      + 'outward from a small central gear, thin tapering flourishes at both far ends',
  },
  {
    id: 'title-sigil',
    category: 'ui',
    subject:
      'an ornate circular emblem of interlocking clock rings with a single vertical hand at its '
      + 'center, layered concentric bands of engraved metal, radiating short spokes',
  },,

  // 后补的遗物
  {
    id: 'homing-spool',
    category: 'relic',
    subject:
      'a brass spool with a golden thread looping back into its own core, the returning strand '
      + 'threaded through a small guide ring mounted on the rim',
  },
  {
    id: 'ember-reliquary',
    category: 'relic',
    subject:
      'a small hinged reliquary box left ajar, a single unspent ember suspended inside above a bed '
      + 'of cooled ash, the lid engraved with concentric burn rings',
  },
  {
    id: 'first-thread-key',
    category: 'relic',
    subject:
      'an ornate winding key whose bit is formed from a single knotted golden thread instead of '
      + 'cut metal teeth, the bow shaped like an open loom frame',
  },
  {
    id: 'even-dial',
    category: 'relic',
    subject:
      'a clock dial with all four quadrants machined to identical depth and identical marking, '
      + 'a single flat hand resting exactly between two of them',
  },
  {
    id: 'unpaid-wager',
    category: 'relic',
    subject:
      'a torn betting slip pinned under a scorched brass token, the ink still wet and glowing '
      + 'faintly along the tear, one corner already burnt away',
  },
  {
    id: 'counter-spindle',
    category: 'relic',
    subject:
      'a spindle mounted to turn against its own ratchet, thread winding backward off the shaft '
      + 'and coiling on the floor beneath it',
  },
  {
    id: 'conspirators-mask',
    category: 'relic',
    subject:
      'a smooth featureless brass half-mask with two thin eye slits, a stolen clock hand fastened '
      + 'across the brow like a diadem',
  },
  {
    id: 'silent-spring',
    category: 'relic',
    subject:
      'a hairspring frozen mid-coil inside a glass dome, frost feathering outward from its center '
      + 'across the inner surface of the glass',
  },
];
