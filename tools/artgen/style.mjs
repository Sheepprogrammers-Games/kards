/**
 * 图像生成的公共风格片段与分类预设。
 */

export const STYLE_CORE = [
  'dark fantasy arcana illustration, painterly digital oil painting, visible brush confidence',
  'ornate antique gold filigree and clockwork engraving accents',
  'the only key light is warm antique gold coming from the upper left, ' +
    'a cool indigo fill comes from the lower right, no other light source in the scene',
  'strong value contrast, clean readable silhouette, ' +
    'restrained detail that still reads at thumbnail size, no noisy micro-texture',
].join(', ');

/**
 * 品红是回响的专用色，只允许作小面积强调。
 * 与靛蓝、古金并列书写会被模型当作底色大面积铺开。
 */
export const PALETTE =
  'color structure: deep indigo #131033 and midnight blue #1d1b4b dominate the shadows and ' +
  'occupy most of the canvas, antique gold #f0b429 and warm amber #ffd27a carry all the light. ' +
  'magenta #e0399a appears only as a rare small accent under five percent of the image, ' +
  'never as a background wash, never as fog, plasma cloud, nebula or atmospheric haze';

export const NEGATIVE =
  'NO text, NO words, NO letters, NO numbers, NO signature, NO watermark, ' +
  'NO card frame, NO border, NO UI elements, NO health bars, NO buttons';

/**
 * 抠像背景。用纯绿而非品红：品红是画面主色之一，作色键会连同角色辉光一起被抠掉。
 */
export const CHROMA_BG =
  'the entire background is one flat uniform chroma key green #00FF00, ' +
  'absolutely no gradient, no vignette, no checkerboard, no transparency pattern, ' +
  'no green light spill or green reflection on the subject, no shadow cast on the background, ' +
  'subject fully inside frame with a clear margin from every edge';

/** 敌人分级构图。同一套抠像流程下，靠姿态与占幅拉开威胁感。 */
const TIER_FRAMING = {
  minion: 'a small creature no larger than a hound, low hunched or scuttling posture, ' +
    'thin fragile limbs, occupies the lower two thirds of the frame with empty space above it',
  elite: 'a human sized threat, upright aggressive asymmetric stance mid-motion, ' +
    'heavy uneven armor plating, fills most of the frame',
  boss: 'a colossal entity many times human height, imposing frontal symmetry, ' +
    'the silhouette is cropped by the top and side edges of the frame to imply mass beyond view',
};

/** 装备槽位形制。靠器物类别与持用方式拉开四个槽位，不靠颜色。 */
const SLOT_FRAMING = {
  weapon: 'a hand-held weapon shown alone at a slight angle, grip and pommel fully visible, ' +
    'the striking end catching the strongest light, wear concentrated where a hand grips it',
  armor: 'a wearable armor piece still holding the curve of the body it covers, ' +
    'strap hardware and buckles visible, impact marks scattered across the outer face',
  trinket: 'a small personal accessory no larger than a palm, hanging from its own chain or ' +
    'clasp, fine detail concentrated in one small area with the rest of the object plain',
  core: 'an uncased clockwork movement seen from the plate side, bridges jewels and mainspring ' +
    'barrel exposed, the light originating from inside the mechanism itself',
};

/**
 * 可用尺寸为 1024x1024、1024x1536、1536x1024。
 * 接口会按比例回落到 848x1264 / 1024x1024 / 1264x848，版式按比例设计而非绝对像素。
 */
export const PRESETS = {
  /** 竖版卡面，四周留出被 CSS 卡框覆盖的余量。 */
  card: {
    size: '1024x1536',
    quality: 'high',
    output: { key: 'none', maxSize: 768 },
    wrap: (subject) =>
      `${subject}. ${STYLE_CORE}. ${PALETTE}. ` +
      'Vertical trading card key art, single central subject, symmetrical arcane composition, ' +
      'subject occupies the middle 70% with calm dark space at top and bottom edges. ' +
      `${NEGATIVE}.`,
  },

  /**
   * 敌人全身立绘，绿幕拍摄后抠像。
   * tier 决定构图与体量，用剪影区分威胁等级，不靠颜色。
   */
  enemy: {
    size: '1024x1024',
    quality: 'high',
    output: { key: 'green', threshold: 0.42, trim: true, pad: 0.03, maxSize: 640 },
    wrap: (subject, opts = {}) =>
      `${subject}. ${STYLE_CORE}. ${PALETTE}. ` +
      `${TIER_FRAMING[opts.tier ?? 'minion']}. ` +
      `${CHROMA_BG}. ${NEGATIVE}.`,
  },

  /** 单件器物图标，绿幕拍摄后抠像并补成正方形。 */
  relic: {
    size: '1024x1024',
    quality: 'high',
    output: { key: 'green', threshold: 0.42, trim: true, pad: 0.06, square: true, maxSize: 384 },
    wrap: (subject) =>
      `${subject}. ${STYLE_CORE}. ${PALETTE}. ` +
      'Single ornate artifact object, three-quarter view, museum lighting, glowing arcane core. ' +
      `${CHROMA_BG}. ${NEGATIVE}.`,
  },

  /** 单件装备图标，绿幕拍摄后抠像并补成正方形。slot 决定形制。 */
  equipment: {
    size: '1024x1024',
    quality: 'high',
    output: { key: 'green', threshold: 0.42, trim: true, pad: 0.06, square: true, maxSize: 384 },
    wrap: (subject, opts = {}) =>
      `${subject}. ${STYLE_CORE}. ${PALETTE}. ` +
      `${SLOT_FRAMING[opts.slot ?? 'trinket']}. ` +
      'Clean product shot of one object, three-quarter view, worn metal and leather with ' +
      'visible craftsmanship, faint arcane glow at the seams. ' +
      `${CHROMA_BG}. ${NEGATIVE}.`,
  },

  /** 横版场景背景，下方中部留空放置战斗单位。 */
  bg: {
    size: '1536x1024',
    quality: 'high',
    output: { key: 'none', maxSize: 1600, quality: 84 },
    wrap: (subject) =>
      `${subject}. ${STYLE_CORE}. ${PALETTE}. ` +
      'Wide environment matte painting, strong atmospheric depth and haze, ' +
      'the lower-center third is empty open ground reserved for characters, ' +
      'darkened vignette edges so foreground UI stays readable. ' +
      `${NEGATIVE}.`,
  },

  /** 单行动画帧条，切分与对齐在后处理完成。 */
  strip: {
    size: '1536x1024',
    quality: 'high',
    output: { key: 'green', threshold: 0.42, maxSize: 1536 },
    wrap: (subject, opts = {}) => {
      const cols = opts.cols ?? 4;
      return (
        `A horizontal sprite strip of exactly ${cols} equal-width frames in one row, ` +
        `showing ${subject}. ` +
        'Every frame keeps the SAME character at the SAME scale and the SAME vertical position, ' +
        'only the pose changes between frames. No frame borders, no gutter lines, no labels. ' +
        `${STYLE_CORE}. ${PALETTE}. ${CHROMA_BG}. ${NEGATIVE}.`
      );
    },
  },

  /** 界面装饰构件，绿幕拍摄后抠像。 */
  ui: {
    size: '1024x1024',
    quality: 'high',
    output: { key: 'green', threshold: 0.4, trim: true, pad: 0.02, maxSize: 256 },
    wrap: (subject) =>
      `${subject}. ${STYLE_CORE}. ${PALETTE}. ` +
      'Ornamental game UI element, perfectly symmetrical, crisp metallic edges. ' +
      `${CHROMA_BG}. ${NEGATIVE}.`,
  },
};
