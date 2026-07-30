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

  // cover：封面主视觉，标题留在右上暗部
  {
    id: 'cover-key-art',
    category: 'cover',
    subject:
      'a lone weaver in a tattered indigo coat standing on a vast brass clock face, ' +
      'four translucent afterimages of herself trailing behind in a receding row, ' +
      'each one fainter than the last, the nearest still solid and the farthest almost gone, ' +
      'magenta echo light threading between them like a drawn wire, ' +
      'a collapsing clocktower interior looming above with gears frozen mid-turn, ' +
      'shafts of tarnished gold light from the upper left',
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
  },
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
  },

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
  },

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

  // 装备
  {
    id: 'ratchet-flail',
    category: 'equipment',
    slot: 'weapon',
    subject:
      'a short flail whose striking head is a ratchet wheel of blackened steel, three ' +
      'stubby chain links, worn leather grip wrapped in brass wire',
  },
  {
    id: 'verdigris-fang',
    category: 'equipment',
    slot: 'weapon',
    subject:
      'a curved dagger cast as a single copper fang, thick green verdigris crusting the ' +
      'blade edge, a bead of dull venom hanging at the tip',
  },
  {
    id: 'hour-hand-cleaver',
    category: 'equipment',
    slot: 'weapon',
    subject:
      'a heavy cleaver forged from an oversized clock hour hand, the counterweight butt ' +
      'still bearing its mounting hole, edge ground razor thin',
  },
  {
    id: 'siphon-edge',
    category: 'equipment',
    slot: 'weapon',
    subject:
      'a slender sword with a hollow fuller running its length, warm amber light drawn ' +
      'along the channel toward the pommel reservoir',
  },
  {
    id: 'tolling-brand',
    category: 'equipment',
    slot: 'weapon',
    subject:
      'a branding iron shaped as a small bell, the bell mouth ringed with raised sigils, ' +
      'the metal still glowing dull orange',
  },
  {
    id: 'bellhouse-cuirass',
    category: 'equipment',
    slot: 'armor',
    subject:
      'a brass breastplate hammered into the shape of a bell housing, wide flared skirt, ' +
      'reinforcing ribs radiating from a central boss',
  },
  {
    id: 'thorncase-mail',
    category: 'equipment',
    slot: 'armor',
    subject:
      'a mail shirt woven from barbed links, short iron thorns standing out from every ' +
      'ring, leather shoulder straps buckled at the front',
  },
  {
    id: 'deadfall-mantle',
    category: 'equipment',
    slot: 'armor',
    subject:
      'a heavy shoulder mantle of stiff grey cloth hung with small stopped pocket watches, ' +
      'the fabric falling in frozen motionless folds',
  },
  {
    id: 'pendulum-harness',
    category: 'equipment',
    slot: 'armor',
    subject:
      'a leather torso harness carrying a polished pendulum bob on a short rod at the ' +
      'chest, brass buckles and adjustment slides',
  },
  {
    id: 'null-hour-carapace',
    category: 'equipment',
    slot: 'armor',
    subject:
      'a segmented shell of dark plate with no seams or fasteners visible, faint violet ' +
      'light bleeding from the joints between segments',
  },
  {
    id: 'hollow-cog-charm',
    category: 'equipment',
    slot: 'trinket',
    subject:
      'a small pendant made from a single hollowed gear, the empty hub strung on a fine ' +
      'chain, tooth edges worn smooth by handling',
  },
  {
    id: 'pocket-sundial',
    category: 'equipment',
    slot: 'trinket',
    subject:
      'a folding brass pocket sundial opened flat, a hair-thin gnomon casting a sharp ' +
      'shadow across the engraved hour scale',
  },
  {
    id: 'cinder-locket',
    category: 'equipment',
    slot: 'trinket',
    subject:
      'a soot-blackened locket hanging open, live embers glowing inside the bezel instead ' +
      'of a portrait',
  },
  {
    id: 'pawnbroker-fob',
    category: 'equipment',
    slot: 'trinket',
    subject:
      'a watch fob heavy with pawn tickets and three brass tokens, the watch itself missing ' +
      'and only the empty swivel clip remaining',
  },
  {
    id: 'metronome-scepter',
    category: 'equipment',
    slot: 'trinket',
    subject:
      'a short scepter topped with an upright metronome, the weighted arm caught mid-swing, ' +
      'tapered handle bound in dark cord',
  },
  {
    id: 'overwound-core',
    category: 'equipment',
    slot: 'core',
    subject:
      'a clockwork movement wound past its limit, the mainspring bulging against a cracked ' +
      'barrel, gear teeth splayed under the strain',
  },
  {
    id: 'ember-core',
    category: 'equipment',
    slot: 'core',
    subject:
      'a compact movement whose mainspring barrel burns from within, heat shimmer above the ' +
      'plate and scorch marks radiating outward',
  },
  {
    id: 'recurrence-coil',
    category: 'equipment',
    slot: 'core',
    subject:
      'a movement built around four nested hairsprings of decreasing size, each coil ' +
      'trailing a faint duplicate of the one outside it',
  },
  {
    id: 'frostbound-core',
    category: 'equipment',
    slot: 'core',
    subject:
      'a movement sheathed in clear ice, the escapement locked mid-tick, frost crystals ' +
      'growing along the bridge and jewel settings',
  },
  {
    id: 'paradox-core',
    category: 'equipment',
    slot: 'core',
    subject:
      'a movement whose gear train loops back into itself in an impossible closed circuit, ' +
      'one wheel driving and being driven at once',
  },

  // card · 织：穿透、吸血、荆棘与赌注，沿用垂直中轴与自下而上的收拢
  {
    id: 'awl-thread',
    category: 'card',
    subject:
      'a needle-thin golden awl driven straight up through a stack of brass plates, the plates ' +
      'left uncracked around each puncture, one taut thread following the awl through every hole',
  },
  {
    id: 'needle-run',
    category: 'card',
    subject:
      'a sewing needle stitching a vertical seam through a dark iron plate, three fresh punctures ' +
      'glowing in a rising line, the thread behind the needle pulled tight and still humming',
  },
  {
    id: 'siphon-weft',
    category: 'card',
    subject:
      'a weft thread drawing warm amber light out of a torn dark cloth below and carrying it ' +
      'upward into a small brass reservoir, the cloth dimming where the light leaves it',
  },
  {
    id: 'crimson-spindle',
    category: 'card',
    subject:
      'a brass spindle winding a thread that runs deep red where it leaves the wound below and ' +
      'turns to clean warm gold by the time it reaches the bobbin at the top',
  },
  {
    id: 'barb-mail',
    category: 'card',
    subject:
      'an upright panel of tightly woven golden thread bristling with fine outward-pointing ' +
      'barbs along every row, the barbs sharpest at the panel edge nearest the viewer',
  },
  {
    id: 'bramble-bulwark',
    category: 'card',
    subject:
      'a vertical bulwark of layered brass plates overgrown by thorned golden wire, the wire ' +
      'lashing the plates together and standing proud of the surface in dense spurs',
  },
  {
    id: 'shell-winding',
    category: 'card',
    subject:
      'a golden thread winding tightly around a standing brass shell in even layers, each higher ' +
      'ring drawn thinner than the one below it, the topmost turn still being laid',
  },
  {
    id: 'terminal-tick',
    category: 'card',
    subject:
      'the lowest mark on a vertical brass hour scale burning white hot while every mark above ' +
      'it stays dark and cold, a single thread drawn down to that final notch',
  },
  {
    id: 'guillotine-hour',
    category: 'card',
    subject:
      'a heavy blade held at the top of a tall brass frame above an engraved clock dial, one ' +
      'golden thread holding the blade up, that thread already frayed halfway through',
  },
  {
    id: 'chain-cleave',
    category: 'card',
    subject:
      'a vertical cut driven through the front brass dial of a stacked row of dials, the same cut ' +
      'carrying on into the dial behind it, both cut faces glowing along the shared line',
  },
  {
    id: 'hedged-thread',
    category: 'card',
    subject:
      'an upright shield braced by a taut golden guy-line, the far end of the line running off ' +
      'above and ending in a small hooked brass weight held back under tension',
  },
  {
    id: 'grace-period',
    category: 'card',
    subject:
      'an upright hourglass fitted with a shield-shaped brass guard, warm amber light pooled in ' +
      'the lower bulb behind a closed valve, the upper bulb almost empty',
  },
  {
    id: 'stake-the-spool',
    category: 'card',
    subject:
      'a brass spool set on a raised stone plinth as a wager, one thread already flung upward out ' +
      'of frame, the remaining winding straining visibly against the spool flanges',
  },
  {
    id: 'slow-fortune',
    category: 'card',
    subject:
      'an upright ratchet winding a heavy spring tooth by tooth behind a standing shield plate, ' +
      'the spring visibly thicker and tighter at each higher coil',
  },
  {
    id: 'covered-call',
    category: 'card',
    subject:
      'a shield of layered gold plate with a second polished mirror plate folded flat behind it, ' +
      'the hidden plate hinged and ready to swing up into place',
  },
  {
    id: 'interest-accrues',
    category: 'card',
    subject:
      'green verdigris creeping upward along a taut golden thread, each higher segment eaten ' +
      'deeper than the one below, flakes of corroded metal drifting off the worst of it',
  },
  {
    id: 'all-or-nothing',
    category: 'card',
    subject:
      'one golden thread hauling an enormous brass counterweight up a narrow vertical shaft, the ' +
      'thread drawn down to a hair at its midpoint and beginning to unravel there',
  },
  {
    id: 'borrowed-hour',
    category: 'card',
    subject:
      'a thread drawn up out of a dark well, bright clean gold where it clears the rim and ' +
      'stained green and slick along the length still hanging below the waterline',
  },
  {
    id: 'pawn-the-hour',
    category: 'card',
    subject:
      'a pocket watch laid onto the upper pan of a pawnbroker scale in exchange for a rising ' +
      'column of amber light, the empty watch chain hanging slack over the lower pan',
  },
  {
    id: 'mirror-stance',
    category: 'card',
    subject:
      'an upright polished brass mirror plate held in a frame of taut thread, one incoming amber ' +
      'ray leaving it back along the exact path it arrived on',
  },
  {
    id: 'recoil-plate',
    category: 'card',
    subject:
      'a thick vertical armor plate mounted on compressed brass springs, a fresh impact dent at ' +
      'its center, the springs already driving the plate back outward toward the viewer',
  },

  // card · 引：引爆的取用范围与回报，沿用单点透视与由内向外的扩张
  {
    id: 'hollow-toll',
    category: 'card',
    subject:
      'a small bell with no clapper inside it releasing one needle-straight amber ray forward ' +
      'through a brass wall, the wall unmarked except for the single clean bore',
  },
  {
    id: 'noon-verdict',
    category: 'card',
    subject:
      'a clock dial at high noon discharging all twelve hour marks at once, every beam bending ' +
      'inward and merging into one white-gold blade aimed straight at the viewer',
  },
  {
    id: 'spill-hour',
    category: 'card',
    subject:
      'an overfilled brass basin spilling amber light forward over its lowest rim, the overflow ' +
      'running on past the near edge instead of pooling',
  },
  {
    id: 'bell-shell',
    category: 'card',
    subject:
      'a bell struck from the inside, the expanding rings of light hardening into nested ' +
      'translucent shells that stay standing around it after the sound has passed',
  },
  {
    id: 'mirror-cascade',
    category: 'card',
    subject:
      'concentric rings of amber light meeting a ring of angled brass mirrors and turning back ' +
      'inward as a second set of rings running against the first',
  },
  {
    id: 'relight',
    category: 'card',
    subject:
      'a cold burnt-out ember catching again at the center of a brass ring, one fresh ring of ' +
      'light leaving it while a thin plate of light closes over the ember from the front',
  },

  // card · 扰：轨道操作与摹刻，沿用强对角线与偏离中轴的构图
  {
    id: 'bait-the-blow',
    category: 'card',
    subject:
      'a brass throat plate turned open along a diagonal to expose what is behind it, a row of ' +
      'short spikes standing out along its hidden underside',
  },
  {
    id: 'set-shell',
    category: 'card',
    subject:
      'a diagonal brass bar dropped across a running gear train while a curved shell plate seats ' +
      'itself down over the stalled mechanism',
  },
  {
    id: 'blood-wedge',
    category: 'card',
    subject:
      'an iron wedge driven diagonally into a brass housing, a narrow channel cut down its spine ' +
      'carrying warm light back out toward the hand that drove it',
  },
  {
    id: 'bared-throat',
    category: 'card',
    subject:
      'a diagonal gap opened in a dark chest plate, a polished mirror surface set directly behind ' +
      'the gap throwing the light back out through it',
  },
  {
    id: 'write-off',
    category: 'card',
    subject:
      'a ruled ledger struck through with one diagonal stroke of gold, the last row sliding off ' +
      'the page edge and burning away as it goes',
  },
  {
    id: 'settle-early',
    category: 'card',
    subject:
      'a brass tap opened at a diagonal on the side of a full reservoir, a short burst of amber ' +
      'light released forward, the reservoir behind it already drained empty',
  },
  {
    id: 'ledger-lock',
    category: 'card',
    subject:
      'a heavy diagonal clasp locked across a brass ledger cover, two extra tokens sealed under ' +
      'the lid, frost rimed along the whole length of the clasp',
  },
  {
    id: 'traced-blade',
    category: 'card',
    subject:
      'a blade drawn along a diagonal in thin golden outline, the outline filled in and solid ' +
      'only along the cutting edge, the rest of the shape still hollow line work',
  },
  {
    id: 'traced-ward',
    category: 'card',
    subject:
      'a shield drawn along a diagonal in golden outline, the drawn line thickened into real ' +
      'plate around the whole rim while the center remains empty line work',
  },
  {
    id: 'traced-hex',
    category: 'card',
    subject:
      'a hex sigil copied diagonally onto a dark plate, the freshly traced lines still wet and ' +
      'running downhill, the original sigil faint underneath',
  },
  {
    id: 'light-fingers',
    category: 'card',
    subject:
      'a gloved hand lifting a brass hour hand diagonally out of a foreign mechanism, a faint ' +
      'golden duplicate of that hand left behind in the empty mount',
  },
  {
    id: 'crib-the-move',
    category: 'card',
    subject:
      'a sheet of tracing vellum laid diagonally across an engraved shield boss, the boss pattern ' +
      'coming through onto the vellum in gold as it is rubbed',
  },
  {
    id: 'armory-raid',
    category: 'card',
    subject:
      'a wall rack of brass arms with two pieces pulled away along a diagonal, two empty hook ' +
      'silhouettes left glowing where they hung',
  },
  {
    id: 'pattern-theft',
    category: 'card',
    subject:
      'a gear stopped dead mid-turn under a diagonal pin while a rubbing of its tooth profile ' +
      'peels away from its face as a thin golden sheet',
  },
  {
    id: 'dissect-pattern',
    category: 'card',
    subject:
      'a foreign sigil plate cut open along a diagonal and splayed apart into separated layers, ' +
      'its inner light draining out through the exposed seam',
  },
  {
    id: 'take-over',
    category: 'card',
    subject:
      'a gloved hand catching a swinging brass hand mid-arc along a diagonal and forcing it down ' +
      'to land early, half its light already shed behind the stroke',
  },
  {
    id: 'deep-study',
    category: 'card',
    subject:
      'a captured foreign mechanism clamped diagonally under a brass lens, its plates opened and ' +
      'its parts already re-mounted into a different frame beside it',
  },
  {
    id: 'borrowed-form',
    category: 'card',
    subject:
      'two brass masks crossing past each other along a diagonal as they exchange places, one of ' +
      'them trailing a third faint duplicate of itself',
  },
  {
    id: 'overwind',
    category: 'card',
    subject:
      'a mainspring wound two full turns past its mark along a diagonal, the outermost coil ' +
      'snapped free and burning off while a brass plate braces the strained barrel',
  },
  {
    id: 'back-gear',
    category: 'card',
    subject:
      'a brass gear shifted two teeth backward along a diagonal, faint afterimages of its two ' +
      'previous positions trailing ahead of it in the direction it came from',
  },
  {
    id: 'paired-arrest',
    category: 'card',
    subject:
      'two meshed gears pinned at once by a single diagonal iron pin driven through both, frost ' +
      'blooming outward from the pin across both wheel faces',
  },

  // enemy · 小怪：补齐的六只，剪影单凸包，侧向姿态，钟面破碎或空白
  {
    id: 'second-wasp',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a slender wasp perched in side profile on a bent brass rod, its abdomen a single blank ' +
      'clock dial with no hands, two narrow glass wings folded back, a long needle stinger ' +
      'angled down toward the ground',
  },
  {
    id: 'rust-pilgrim',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a stooped pilgrim in side profile wrapped in rust-caked plate, one arm ending in a heavy ' +
      'ratchet head held low, a corroded empty dial hanging at its neck, a short staff dragging ' +
      'behind it across the ground',
  },
  {
    id: 'ember-tender',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a squat furnace tender in side profile carrying an open firebox on its back, coals glowing ' +
      'through the grate bars, a cracked blank dial fused to the firebox door, a long iron scoop ' +
      'held in one hand',
  },
  {
    id: 'hollow-cantor',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a hollow-chested cantor leaning sideways, its ribcage opened into an empty resonating ' +
      'cavity, a scored songbook chained to one wrist, a blank cracked dial where the sternum ' +
      'should sit',
  },
  {
    id: 'mirror-fry',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a small hovering sprite in side profile built from overlapping polished brass shards, each ' +
      'shard throwing back a fragment of the light that strikes it, a blank mirrored dial at its core',
  },
  {
    id: 'grave-winder',
    category: 'enemy',
    tier: 'minion',
    subject:
      'a heavy grave winder in side profile with a winch drum sunk into its back and chain wound ' +
      'around it, thick slab arms hanging low, a cracked empty dial set into its chest',
  },

  // enemy · 精英：补齐的两只，仅带 1 处冠，3/4 侧身，钟面完整正走
  {
    id: 'quarter-stalker',
    category: 'enemy',
    tier: 'elite',
    subject:
      'a lean stalker in three-quarter stance crouched to spring, a single swept quarter-hand ' +
      'blade rising from its back as its only crest, an intact forward-running dial fixed to its ' +
      'thigh plate, long clawed forelimbs braced against the ground',
  },
  {
    id: 'oath-anvil',
    category: 'enemy',
    tier: 'elite',
    subject:
      'a broad-shouldered enforcer in three-quarter stance whose right arm ends in a massive ' +
      'anvil head, a single low squared brow ridge as its only crest, an intact forward-running ' +
      'dial set into the anvil face, chains of sealed tokens crossing its chest',
  },

  // enemy · Boss：正面对称，双层轮廓，钟面逆走
  {
    id: 'silent-conductor',
    category: 'enemy',
    tier: 'boss',
    subject:
      'a colossal frontal conductor with four symmetrical arms held up in a cadence that never ' +
      'falls, a wide mantle of hanging bell mouths forming a second outer silhouette behind the ' +
      'body, a reversed-running dial at its chest, nothing but shadow under the raised hood',
  },

  // intent · attack：炽热橙红，画招式落点或落点前的一瞬
  {
    id: 'gnaw',
    category: 'intent',
    kind: 'attack',
    subject:
      'a ring of needle mandibles closed on a taut luminous thread and biting through it, ' +
      'the two severed ends snapping apart in a spray of hot sparks, nothing behind the mandibles',
  },
  {
    id: 'swarm',
    category: 'intent',
    kind: 'attack',
    subject:
      'a dense cloud of biting motes converging on one spot of a brass dial from three ' +
      'directions at once, three bore tracks already chewed clean through the plate',
  },
  {
    id: 'discord',
    category: 'intent',
    kind: 'attack',
    subject:
      'two tuning forks struck out of phase, the interference between them tearing a jagged ' +
      'rift open in the air, the dial behind splitting along the same line',
  },
  {
    id: 'pounce',
    category: 'intent',
    kind: 'attack',
    subject:
      'a mainspring released to full extension driving a set of hooked claws off the ground, ' +
      'the stone buckling under the launch point in a flat shock ring, dust thrown backward',
  },
  {
    id: 'burrow',
    category: 'intent',
    kind: 'attack',
    subject:
      'a spiral brass drill head boring down into sand, the sand funnelling into a vortex ' +
      'around it while a packed ridge of it heaves up on the near side',
  },
  {
    id: 'verdict',
    category: 'intent',
    kind: 'attack',
    subject:
      'a heavy gavel of brass and dark stone landing on a clock dial, the dial fracturing ' +
      'radially out of the contact point, splinters of enamel lifting off the face',
  },
  {
    id: 'shatterpoint',
    category: 'intent',
    kind: 'attack',
    subject:
      'the origin point of a fracture in a pane of clock glass, a single blazing stress node ' +
      'from which four hairline cracks have just started to run outward',
  },
  {
    id: 'toll',
    category: 'intent',
    kind: 'attack',
    subject:
      'a bell clapper at the instant it meets the bell wall, the metal denting visibly under it ' +
      'and concentric pressure rings punching outward from the strike',
  },
  {
    id: 'reversal',
    category: 'intent',
    kind: 'attack',
    subject:
      'an hourglass caught mid-flip, the falling sand column stalled halfway and driving back ' +
      'up against itself, the glass stressed white where the two flows collide',
  },
  {
    id: 'unmake',
    category: 'intent',
    kind: 'attack',
    subject:
      'a clockwork movement flying apart into its own wheels, screws and jewels along clean ' +
      'radial lines, holding the shape of the whole for one last instant',
  },
  {
    id: 'chaff',
    category: 'intent',
    kind: 'attack',
    subject:
      'a fistful of brass filings and snapped gear teeth flung forward in a loose shallow fan, ' +
      'each fragment tumbling and catching a hard edge of light',
  },
  {
    id: 'flare-burst',
    category: 'intent',
    kind: 'attack',
    subject:
      'a sealed glass ampoule bursting in a single flash, spear-shaped shards riding outward on ' +
      'a hard-edged ring of light, the brass cage around it blown open',
  },
  {
    id: 'slow-swing',
    category: 'intent',
    kind: 'attack',
    subject:
      'a massive pendulum bob hanging at the very top of its arc one instant before it falls, ' +
      'its chain drawn dead straight, its shadow already stretched across the ground below',
  },
  {
    id: 'anvil-fall',
    category: 'intent',
    kind: 'attack',
    subject:
      'an anvil dropping from above at the last instant before impact, the air flattened into a ' +
      'compression ring beneath it, the stone below dished and beginning to split',
  },
  {
    id: 'bound-blow',
    category: 'intent',
    kind: 'attack',
    subject:
      'a chain-wrapped fist driven three times along one straight line, the links snapping taut ' +
      'at full reach, three impact rings staggered along the path',
  },
  {
    id: 'wind-deep',
    category: 'intent',
    kind: 'attack',
    subject:
      'a spindle winding a braided cable past its breaking twist, individual strands shearing ' +
      'and standing out from the lay, the whole cable knotting into itself',
  },
  {
    id: 'plumb-drop',
    category: 'intent',
    kind: 'attack',
    subject:
      'a plumb bob cut free of its line and falling dead vertical, the slack line whipping back ' +
      'upward, one small point of raised dust marking where it will land',
  },
  {
    id: 'arc-sweep',
    category: 'intent',
    kind: 'attack',
    subject:
      'a wide crescent sweep cut twice along the same arc, two overlapping blade traces slightly ' +
      'out of register, the far end of the arc scoring a stone lip',
  },
  {
    id: 'spite-lash',
    category: 'intent',
    kind: 'attack',
    subject:
      'a barbed whip cracking forward while the same stroke drives spines backward out of its ' +
      'handle, one motion cutting in both directions at once',
  },
  {
    id: 'mirror-verdict',
    category: 'intent',
    kind: 'attack',
    subject:
      'a gavel head striking a mirror while its own reflection rises to meet it, the impact ' +
      'opening one shared crack that belongs to both sides of the glass',
  },
  {
    id: 'scuttle-bite',
    category: 'intent',
    kind: 'attack',
    subject:
      'a small pair of chitin pincers snapping shut on the edge of a brass rim and already ' +
      'pulling back, one clean notch bitten out of the metal',
  },
  {
    id: 'tempo-lash',
    category: 'intent',
    kind: 'attack',
    subject:
      'a metronome rod whipped past its stop twice in quick succession, the two strokes leaving ' +
      'crossed trails, the beat pin bent out of true by the force',
  },
  {
    id: 'sunder-note',
    category: 'intent',
    kind: 'attack',
    subject:
      'a struck bell splitting along two lines at once, the note leaving as a pair of hard ' +
      'visible wedges driven out through the openings',
  },
  {
    id: 'ratchet-slam',
    category: 'intent',
    kind: 'attack',
    subject:
      'a ratchet wheel driven one tooth forward under a hammer blow, the pawl slamming home into ' +
      'the next notch, a flat shock ring around the loaded tooth',
  },
  {
    id: 'ember-spit',
    category: 'intent',
    kind: 'attack',
    subject:
      'a jet of burning cinders forced out of a narrow brass nozzle, the embers still hooked in ' +
      'the air in the shape of the blast, the nozzle lip glowing from the pass',
  },
  {
    id: 'hour-siphon',
    category: 'intent',
    kind: 'attack',
    subject:
      'a curved fang-shaped tube bitten into a dial and drawing a bright thread of hours back ' +
      'up through itself, the near end of the tube filling while the dial face goes dead',
  },
  {
    id: 'long-toll',
    category: 'intent',
    kind: 'attack',
    subject:
      'a great bell struck twice on the same spot, two concentric shock rings still expanding ' +
      'through the metal, the bell wall bulging outward where they overlap',
  },

  // intent · defend：冷冽青蓝，画阻挡结构成形的瞬间
  {
    id: 'harden',
    category: 'intent',
    kind: 'defend',
    subject:
      'overlapping chitin and brass plates snapping shut into one seamless dome, the last ' +
      'hairline gap closing at the centre with a thin line of light still escaping it',
  },
  {
    id: 'slag-guard',
    category: 'intent',
    kind: 'defend',
    subject:
      'a poured wall of metal already crusted over and setting into a scabbed grey face, only ' +
      'the hairline seams between the pours still live',
  },
  {
    id: 'bristle-up',
    category: 'intent',
    kind: 'defend',
    subject:
      'a bed of brass barbs snapping upright out of a smooth plate all at once, each spike still ' +
      'trembling from the release, one of them already fouled with what it caught',
  },
  {
    id: 'carapace',
    category: 'intent',
    kind: 'defend',
    subject:
      'a layered shell of overlapping brass scales settling down over one another, the outer ' +
      'layer dull and pitted, a thin band of light caught in every seam',
  },
  {
    id: 'turnback-veil',
    category: 'intent',
    kind: 'defend',
    subject:
      'a hanging veil of taut thread catching a thrown dart, dimpling inward around it and ' +
      'springing back to throw the dart out the way it came',
  },
  {
    id: 'brace-cog',
    category: 'intent',
    kind: 'defend',
    subject:
      'a stout wedge cog jammed hard between two turning wheels and stopping the whole train, ' +
      'the locked teeth biting into one another and deforming at the contact',
  },
  {
    id: 'quench-plate',
    category: 'intent',
    kind: 'defend',
    subject:
      'an armour plate plunged into water and going hard and grey in an instant, a shell of ' +
      'steam sealing tight around its face',
  },
  {
    id: 'gilded-recoil',
    category: 'intent',
    kind: 'defend',
    subject:
      'a gilded convex buckler an instant after taking a hit, the incoming dart bouncing clean ' +
      'off the gold face, a bright recoil ring spreading from the point of contact',
  },

  // intent · debuff：病态紫绿，画施加与侵蚀的痕迹
  {
    id: 'sap',
    category: 'intent',
    kind: 'debuff',
    subject:
      'a hollow brass needle sunk into a knot of woven thread and drawing a thinning strand of ' +
      'light out of it, the weave slackening and going grey around the puncture',
  },
  {
    id: 'dust-cough',
    category: 'intent',
    kind: 'debuff',
    subject:
      'a burst of fine grave dust blown out of a cracked bellows mouth, the cloud already ' +
      'settling into the teeth of a gear and packing them solid',
  },
  {
    id: 'seal',
    category: 'intent',
    kind: 'debuff',
    subject:
      'a wax seal pressed shut over a keyhole with thread bound across it, the sigil struck into ' +
      'the wax a clock face with no hands',
  },
  {
    id: 'first-thread',
    category: 'intent',
    kind: 'debuff',
    subject:
      'the first strand of a web sunk through woven cloth, the thread darkening along its length ' +
      'as it draws something up out of the puncture',
  },
  {
    id: 'drain-hour',
    category: 'intent',
    kind: 'debuff',
    subject:
      'a siphon tube driven into the rim of a clock dial, the hours pulled out of it as a thick ' +
      'descending column of dull light, the numerals behind the tap wiped blank',
  },
  {
    id: 'graft-noise',
    category: 'intent',
    kind: 'debuff',
    subject:
      'a foreign gear of dead grey metal wedged into a clean brass train and pinned there, the ' +
      'mismatched teeth grating and throwing a visible rasp through the neighbouring wheels',
  },
  {
    id: 'oath-brand',
    category: 'intent',
    kind: 'debuff',
    subject:
      'a branding iron shaped as a snapped clock hand lifting away from a surface, the mark it ' +
      'left still cooking into the material and spreading at the edges',
  },
  {
    id: 'hollow-choir',
    category: 'intent',
    kind: 'debuff',
    subject:
      'a ring of open bell mouths facing inward with nothing hanging inside them, the air ' +
      'between them thinned into a visible standing void',
  },
  {
    id: 'weave-theft',
    category: 'intent',
    kind: 'debuff',
    subject:
      'a hooked needle dragging a whole finished run of weave out of a loom, the fabric ' +
      'unravelling in long loose loops along the direction of the pull',
  },

  // intent · buff：明亮暗金，画自身被强化的机构动作
  {
    id: 'drift',
    category: 'intent',
    kind: 'buff',
    subject:
      'a clock hand lifting off its own arbor and sliding sideways out of its socket, four ' +
      'thinning afterimages left standing where it used to sit',
  },
  {
    id: 'wind-back',
    category: 'intent',
    kind: 'buff',
    subject:
      'two brass gears meshing in reverse, the teeth riding backward over their own wear marks, ' +
      'a ratchet pawl kicked up out of its detent, filings thrown against the normal direction',
  },
  {
    id: 'coil-tight',
    category: 'intent',
    kind: 'buff',
    subject:
      'a mainspring wound far past its rest position, the coils packed flat against one another, ' +
      'the arbor square straining and light building in the gaps between turns',
  },
  {
    id: 'mirror-shell',
    category: 'intent',
    kind: 'buff',
    subject:
      'a faceted shell of polished mirror plates folding closed, every facet throwing a ' +
      'reflected blade of light back out of itself',
  },
  {
    id: 'reversion-halo',
    category: 'intent',
    kind: 'buff',
    subject:
      'a closed ring of polished brass mirrors hanging in the air all facing inward, every line ' +
      'of light that enters the ring turned back along the exact path it came in on',
  },

  // ui：图鉴未解锁条目的占位
  {
    id: 'codex-unknown',
    category: 'ui',
    subject:
      'a symmetrical ornate question mark cast in tarnished gold standing inside a hollow clock ' +
      'dial ring with no hands, the mark itself dull and unlit, only the surrounding ring catching ' +
      'a thin edge highlight',
  },
];
