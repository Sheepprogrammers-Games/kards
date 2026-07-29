# 配乐需求

## 统一基调

崩坏的时之圣殿。暗黑幻想与钟表机械的混血，不是史诗交响，是被卡住的时间本身在响。

核心声音素材：走音的音乐盒、被减速的钟琴、金属摩擦、齿轮咬合、远处的钟声、大厅混响。
禁止：现代鼓组、电吉他、明亮的大调旋律、流行和声进行。

**贯穿全局的机制呼应**：游戏的核心是「打出的牌会在之后的回合一遍遍重演，每次更弱」。
所有曲目都应带可辨识的**延迟回声**，主动机在响过之后以更低的音量与更暗的音色重复一到两次。
这是这套配乐区别于普通暗黑幻想音乐的地方，务必保留。

## 技术要求

- 格式 MP3 或 OGG，44.1kHz，立体声
- **必须无缝循环**：结尾与开头能直接衔接，不留静音尾巴，不做渐弱收尾
- 响度控制在 -18 LUFS 左右，留出音效的空间
- 中频段（800Hz 到 3kHz）适当挖空，避免盖住打击音效
- 单曲 60 到 120 秒即可，靠循环延续

## 各场景提示词

以下提示词按英文书写，多数生成工具对英文标签的响应更准确。

### 1. 标题界面 `title`

```
Dark fantasy main theme, slow and ceremonial, a detuned music box melody over deep cathedral
drones, distant bell tolls every eight bars, faint clockwork ticking underneath, long reverb
tails, each melodic phrase echoes back once quieter and darker, minor key, 60 BPM, no drums,
no percussion kit, ambient orchestral, haunting and patient, seamless loop
```

时长 90 秒。要求听感是"站在一座停摆的钟楼里"，庄重但不悲壮。

### 2. 地图 · 第一幕 崩坏钟楼 `map-act1`

```
Ambient exploration music, sparse detuned celesta notes, slow mechanical gear rhythm as the only
pulse, wind through broken stone halls, occasional distant metal groan, minor key, 52 BPM,
very low intensity, room to breathe, phrases repeat with fading echo, seamless loop
```

时长 80 秒。留白要多，玩家在这里做决策，音乐不能抢注意力。

### 3. 地图 · 第二幕 逆位回廊 `map-act2`

```
Ambient exploration music, same instrumentation as act one but everything played in reverse
articulation, backwards swells, inverted arpeggios, unsettling suspended harmony, faint choir
pad far in the background, 52 BPM, low intensity, seamless loop
```

时长 80 秒。与第一幕同源但方向相反，呼应「逆位」。

### 4. 地图 · 第三幕 归零圣所 `map-act3`

```
Ambient exploration music, nearly silent, single sustained low drone, one isolated piano note
every few bars decaying into huge reverb, no rhythm at all, no pulse, absolute stillness,
faint high shimmer, seamless loop
```

时长 80 秒。这一幕所有指针都停了，节拍消失，只剩空间。

### 5. 普通战斗 `battle`

```
Dark fantasy battle music, driving clockwork ostinato in low strings, metronomic tick as the
backbone, hammered dulcimer accents, tense minor harmony, building without release, 96 BPM,
no modern drum kit, use metallic percussion and anvil hits instead, main motif echoes back
weaker after each statement, seamless loop
```

时长 90 秒。节拍器质感是重点，玩家的回合本身就是节拍。

### 6. 精英战 `elite`

```
Dark fantasy combat music, heavier and faster than standard battle, layered gear machinery
rhythm, dissonant brass swells, low choir chanting in irregular meter, sense of a machine
speeding up, 112 BPM, metallic percussion, no drum kit, seamless loop
```

时长 90 秒。

### 7. 守时者 · 第一幕 鸣钟暴君 `boss-act1`

```
Boss battle music, massive bell strikes as the rhythmic foundation, low brass clusters,
choir shouting single syllables on the beat, relentless clockwork undercurrent, oppressive
and mechanical, 120 BPM, no drum kit, bells and anvils only, half-time breakdown at the
midpoint then return heavier, seamless loop
```

时长 120 秒。中段要有一次明显的变化，用来呼应 Boss 半血换形态。

### 8. 守时者 · 第二幕 逆位天仪 `boss-act2`

```
Boss battle music, orbital arpeggios spinning in opposite directions, polyrhythm of five
against four, glassy metallic timbres, rising and falling glissandi like gears reversing,
dissonant strings, 116 BPM, no drum kit, seamless loop
```

时长 120 秒。

### 9. 守时者 · 第三幕 初代织时者 `boss-act3`

```
Final boss music, everything from the title theme returning distorted and accelerated, the
music box melody now played by full dark orchestra, layered echoes stacking until they blur
into noise, choir in full voice, sense of every past moment happening at once, 128 BPM,
overwhelming, seamless loop
```

时长 140 秒。要求直接引用标题曲的动机并将其扭曲，这是全局回收。

### 10. 残市 `shop`

```
Quiet merchant ambience, plucked dulcimer and small hand bells, slightly playful but still
melancholy, sparse and intimate, faint coin and metal sounds in the texture, 68 BPM,
low intensity, seamless loop
```

时长 60 秒。

### 11. 篝火 `rest`

```
Calm interlude, warm low strings and a single soft flute line, embers crackling faintly in the
background, gentle and restful, no rhythm, no tension, minor key but consoling, seamless loop
```

时长 60 秒。全曲唯一允许温暖的地方。

### 12. 异象 `event`

```
Mysterious short ambience, suspended harmony, glass harmonica shimmer, a question left open,
no resolution, no rhythm, 20 to 30 seconds, seamless loop
```

时长 30 秒。

### 13. 胜利结算 `victory`

```
Short victory stinger, a single bell resolving upward into a major-ish chord, brief and
restrained, not triumphant fanfare, 8 seconds, one shot, no loop
```

不循环，一次性播放。

### 14. 败北 `defeat`

```
Short defeat stinger, clockwork winding down and stopping, a low bell struck once and left to
decay into silence, 10 seconds, one shot, no loop
```

不循环，一次性播放。

## 文件放置

生成完成后按上面每节标题里的英文 id 命名，放入 `assets/audio/`：

```
assets/audio/title.mp3
assets/audio/map-act1.mp3
assets/audio/battle.mp3
assets/audio/boss-act1.mp3
...
```

播放层会按 id 自动挂载，缺失的曲目直接跳过，不会报错。
