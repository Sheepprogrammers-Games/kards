/** 异象事件。选项以声明式结果描述，由界面层统一执行。 */

export type EventOutcome =
  | { kind: 'heal'; amount: number }
  | { kind: 'damage'; amount: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'maxHp'; amount: number }
  | { kind: 'addCard'; pool: 'random' | 'curse' }
  /** 加入指定卡牌，用于点名某张诅咒。 */
  | { kind: 'addNamedCard'; cardId: string }
  | { kind: 'removeCard' }
  /** 移除牌组中的第一张诅咒，没有诅咒时不生效。 */
  | { kind: 'removeCurse' }
  /** 随机强化一张尚未强化的牌。 */
  | { kind: 'upgradeCard' }
  | { kind: 'addRelic' }
  /** 随机失去一件已持有的遗物。 */
  | { kind: 'loseRelic' }
  /** 获得一件装备，槽位与具体条目由界面层挑选。 */
  | { kind: 'addEquipment' }
  /** 箱中是伏击，转入与该敌人的一场战斗。 */
  | { kind: 'chest'; enemyId: string }
  /** 馈赠，具体给什么由界面层按 rng 决定。 */
  | { kind: 'gift' }
  /** 按当前时砂的比例增减，-1 为全部交出，1 为翻倍。 */
  | { kind: 'goldShare'; ratio: number }
  /** 按当前生命的比例回复或扣减。 */
  | { kind: 'hpShare'; ratio: number }
  /** 按百分比命中率分岔，两条分支都可继续嵌套。 */
  | { kind: 'chance'; percent: number; hit: EventOutcome[]; miss: EventOutcome[] }
  | { kind: 'nothing' };

export interface EventOption {
  label: string;
  desc: string;
  outcomes: EventOutcome[];
}

export interface EventDef {
  id: string;
  title: string;
  body: string;
  options: EventOption[];
  /** 为真时不展示选择，进入即结算首个选项并显示结果。 */
  auto?: boolean;
}

export const EVENTS: EventDef[] = [
  {
    id: 'stalled-fountain',
    title: '停摆的水钟',
    body:
      '一座水钟停在离满刻还差一滴的位置。水面平静得不像液体，倒映出的不是你此刻的脸，' +
      '而是某个更疲惫的版本。伸手可以取回那一滴，也可以让它继续悬着。',
    options: [
      {
        label: '取走那一滴',
        desc: '回复 12 点生命，但水钟的停滞转嫁到你身上：获得一张诅咒。',
        outcomes: [
          { kind: 'heal', amount: 12 },
          { kind: 'addCard', pool: 'curse' },
        ],
      },
      {
        label: '补上那一滴',
        desc: '失去 6 点生命，水钟重新走动，从中析出一件遗物。',
        outcomes: [
          { kind: 'damage', amount: 6 },
          { kind: 'addRelic' },
        ],
      },
      {
        label: '不去碰它',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'unraveling-loom',
    title: '自行拆解的织机',
    body:
      '织机在没有人操作的情况下反向运转，把已经织好的布一寸寸退回成线，线头在地上越堆越高。' +
      '你认出其中一段花纹——那是你自己的手法，只是收尾比你现在利落得多。',
    options: [
      {
        label: '交给它一张牌',
        desc: '从牌组中随机移除一张牌，并获得 45 枚时砂。',
        outcomes: [
          { kind: 'removeCard' },
          { kind: 'gold', amount: 45 },
        ],
      },
      {
        label: '抢回半匹布',
        desc: '获得一张随机卡牌，失去 8 点生命。',
        outcomes: [
          { kind: 'addCard', pool: 'random' },
          { kind: 'damage', amount: 8 },
        ],
      },
    ],
  },
  {
    id: 'echo-of-a-stranger',
    title: '陌生人的回响',
    body:
      '走廊尽头站着一个背影，动作比你慢半拍地重复着你刚才做过的一切，连你踢到石子时的踉跄都学了去。' +
      '你停下来的时候，它还在继续走完你没走完的那一步。',
    options: [
      {
        label: '跟上它',
        desc: '生命上限 +8，跟丢半拍的代价是失去 7 点生命。',
        outcomes: [
          { kind: 'maxHp', amount: 8 },
          { kind: 'damage', amount: 7 },
        ],
      },
      {
        label: '打断它',
        desc: '获得 70 枚时砂，生命上限 -4。',
        outcomes: [
          { kind: 'gold', amount: 70 },
          { kind: 'maxHp', amount: -4 },
        ],
      },
    ],
  },
  {
    id: 'ledger-of-debts',
    title: '欠时账簿',
    body:
      '一本账簿摊开在石台上，每一页都记着某个人借走又没有归还的时间，名字后面全画着同一种勾。' +
      '最后一页是空白的，笔搁在旁边，笔尖还没干。',
    options: [
      {
        label: '签下自己的名字',
        desc: '获得一件遗物，并获得一张诅咒。',
        outcomes: [{ kind: 'addRelic' }, { kind: 'addCard', pool: 'curse' }],
      },
      {
        label: '撕掉最后一页',
        desc: '回复 20 点生命，账簿把缺口记在你头上：生命上限 -5。',
        outcomes: [
          { kind: 'heal', amount: 20 },
          { kind: 'maxHp', amount: -5 },
        ],
      },
    ],
  },
  {
    id: 'sand-broker',
    title: '砂柜台',
    body:
      '柜台后的人把左边的袖口缝死了，只用右手称砂。他说少掉的那只手换成了三年前的一个下午，' +
      '现在正在别人身上过着。他把秤推到你面前：想换什么，先放上去。',
    options: [
      {
        label: '放上一张牌',
        desc: '从牌组中随机移除一张牌，换来 55 枚时砂。',
        outcomes: [{ kind: 'removeCard' }, { kind: 'gold', amount: 55 }],
      },
      {
        label: '放上一截手腕',
        desc: '失去当前生命的两成，换来 90 枚时砂。',
        outcomes: [
          { kind: 'hpShare', ratio: -0.2 },
          { kind: 'gold', amount: 90 },
        ],
      },
      {
        label: '把砂推回给他',
        desc: '交出六成时砂，秤盘上留下一张随机卡牌。',
        outcomes: [
          { kind: 'goldShare', ratio: -0.6 },
          { kind: 'addCard', pool: 'random' },
        ],
      },
    ],
  },
  {
    id: 'blind-clockmaker',
    title: '摸黑的钟匠',
    body:
      '钟匠的眼睛蒙着一层白，手指却认得每一根游丝。他说眼睛还在的时候他修不好任何东西，' +
      '瞎了之后反而准了。他伸手过来，要摸一遍你用得最熟的那张牌。',
    options: [
      {
        label: '把牌递过去',
        desc: '随机强化牌组中的一张牌，他的手劲让你失去 9 点生命。',
        outcomes: [{ kind: 'upgradeCard' }, { kind: 'damage', amount: 9 }],
      },
      {
        label: '让他摸你的眼睛',
        desc: '生命上限 -6，他从你眼底取出一件遗物。',
        outcomes: [{ kind: 'maxHp', amount: -6 }, { kind: 'addRelic' }],
      },
      {
        label: '收回手',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'idle-hand-wager',
    title: '闲置的指针',
    body:
      '一根从任何钟上都拆不下来的指针悬在半空，只有人下注时它才肯动一格。' +
      '地上散落着别人押过的东西：一颗牙、一枚婚戒、一整袋还没拆封的时砂。',
    options: [
      {
        label: '押上你的名字',
        desc: '五成半的机会得到一件遗物；否则获得一张诅咒并失去 8 点生命。',
        outcomes: [
          {
            kind: 'chance',
            percent: 55,
            hit: [{ kind: 'addRelic' }],
            miss: [{ kind: 'addCard', pool: 'curse' }, { kind: 'damage', amount: 8 }],
          },
        ],
      },
      {
        label: '押上全部时砂',
        desc: '五成机会时砂翻倍，五成机会一枚不剩。',
        outcomes: [
          {
            kind: 'chance',
            percent: 50,
            hit: [{ kind: 'goldShare', ratio: 1 }],
            miss: [{ kind: 'goldShare', ratio: -1 }],
          },
        ],
      },
      {
        label: '看别人押',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'three-tolls',
    title: '三次钟响',
    body:
      '塔里的钟没有钟锤，敲一下要用敲钟人自己的一段时间去换。绳子递到你手上时还是热的。' +
      '守塔的人说：一下有一下的价，三下的价不是三倍。',
    options: [
      {
        label: '敲一下',
        desc: '获得 40 枚时砂，回声撞在胸口，失去 6 点生命。',
        outcomes: [{ kind: 'gold', amount: 40 }, { kind: 'damage', amount: 6 }],
      },
      {
        label: '连敲三下',
        desc: '四成半的机会震出一件遗物并失去 16 点生命；否则失去 26 点生命并获得一张诅咒。',
        outcomes: [
          {
            kind: 'chance',
            percent: 45,
            hit: [{ kind: 'addRelic' }, { kind: 'damage', amount: 16 }],
            miss: [{ kind: 'damage', amount: 26 }, { kind: 'addCard', pool: 'curse' }],
          },
        ],
      },
      {
        label: '把绳子放下',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'burnt-archive',
    title: '不烫手的火',
    body:
      '档案室的火没有温度，只把纸上的字一行行取走，纸还完整地留着。' +
      '管理员说被这火吃掉的东西不会去别的地方，它们只是从此不再发生。他让你挑一份放进去。',
    options: [
      {
        label: '烧掉自己的一张牌',
        desc: '随机移除牌组中的一张牌，火苗倒灌，失去 6 点生命。',
        outcomes: [{ kind: 'removeCard' }, { kind: 'damage', amount: 6 }],
      },
      {
        label: '从火里抢一份出来',
        desc: '获得一张随机卡牌，抢救的过程失去 11 点生命。',
        outcomes: [{ kind: 'addCard', pool: 'random' }, { kind: 'damage', amount: 11 }],
      },
      {
        label: '合上档案柜',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'the-one-who-waits',
    title: '长廊里抬着脚的人',
    body:
      '一个人保持着抬脚的姿势停在长廊正中，衣角还朝前飘着，落不下来。' +
      '他喉咙里卡着一个没说完的字。口袋外面露出半枚时砂币，边缘已经被磨圆了。',
    options: [
      {
        label: '把他推回时间里',
        desc: '失去当前生命的四分之一，他醒来后教你一手：随机强化一张牌。',
        outcomes: [{ kind: 'hpShare', ratio: -0.25 }, { kind: 'upgradeCard' }],
      },
      {
        label: '摸走那半枚币',
        desc: '获得 80 枚时砂，他没说完的那个字留在你身上：获得一张诅咒。',
        outcomes: [{ kind: 'gold', amount: 80 }, { kind: 'addCard', pool: 'curse' }],
      },
      {
        label: '绕过去',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'debtors-choir',
    title: '欠时者的合唱',
    body:
      '十几个人围成一圈，同时唱着同一句歌词的不同段落，谁也不和谁对齐。' +
      '他们都欠着时间，靠这样把利息摊薄。圈里空着一个位置，脚印是新的。',
    options: [
      {
        label: '站进空位',
        desc: '生命上限 -8，众人替你唱走一张诅咒。牌组中没有诅咒时只失去上限。',
        outcomes: [{ kind: 'maxHp', amount: -8 }, { kind: 'removeCurse' }],
      },
      {
        label: '替他们还一段',
        desc: '交出五成时砂，回复 22 点生命。',
        outcomes: [{ kind: 'goldShare', ratio: -0.5 }, { kind: 'heal', amount: 22 }],
      },
      {
        label: '在圈外听完',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'mirrored-apprentice',
    title: '镜里的学徒',
    body:
      '镜子里的人比你年轻十岁，正在练你早就练熟的那套手法，练到第三步就卡住。' +
      '他抬头问：能不能把后面的直接给我。作为交换，他愿意替你背一样东西。',
    options: [
      {
        label: '把后面的教给他',
        desc: '他背走牌组中的一张诅咒，你失去 12 点生命。没有诅咒时只承受伤害。',
        outcomes: [{ kind: 'removeCurse' }, { kind: 'damage', amount: 12 }],
      },
      {
        label: '让他照着镜子学',
        desc: '他学反了：获得一张停梭，但镜框背面掉下一件遗物。',
        outcomes: [{ kind: 'addNamedCard', cardId: 'patient-weft' }, { kind: 'addRelic' }],
      },
      {
        label: '转身走开',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'test-detonation',
    title: '试爆场',
    body:
      '一段废弃的时间轨架在空地上，四个格位里还挂着没人认领的条目，边缘泛着将熟的红。' +
      '守场的人递来引信：这里随便你炸，条件是你自己得站在轨上。',
    options: [
      {
        label: '站上去点火',
        desc: '失去当前生命的三成，爆开的残骸里留下一件遗物。',
        outcomes: [{ kind: 'hpShare', ratio: -0.3 }, { kind: 'addRelic' }],
      },
      {
        label: '看别人炸',
        desc: '收 35 枚时砂的看客钱，飞溅的碎片让你失去 5 点生命。',
        outcomes: [{ kind: 'gold', amount: 35 }, { kind: 'damage', amount: 5 }],
      },
      {
        label: '把引信还回去',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'looted-reliquary',
    title: '被撬开的圣物匣',
    body:
      '匣子的锁是从内侧撬开的。匣底压出一圈痕迹，形状和你随身带着的某样东西严丝合缝。' +
      '你合上盖子的时候，里面传出一次呼吸，节奏不是你的。',
    options: [
      {
        label: '把自己的东西放进去',
        desc: '随机失去一件遗物并失去 8 点生命，匣底换出另一件遗物和 60 枚时砂。',
        outcomes: [
          { kind: 'loseRelic' },
          { kind: 'damage', amount: 8 },
          { kind: 'addRelic' },
          { kind: 'gold', amount: 60 },
        ],
      },
      {
        label: '空着手合上',
        desc: '获得 45 枚时砂，匣里的呼吸跟着你走：获得一张诅咒。',
        outcomes: [{ kind: 'gold', amount: 45 }, { kind: 'addCard', pool: 'curse' }],
      },
    ],
  },
  {
    id: 'hour-toll',
    title: '报时闸口',
    body:
      '闸口只在整点开一次，收费的人拿一把没有刻度的尺去量你的影子。' +
      '他说过路费按你还剩多少时间算，不按你带了多少砂。排在前面的人影子已经短得看不见了。',
    options: [
      {
        label: '让他量影子',
        desc: '失去当前生命的四分之一，穿过闸口后生命上限 +7。',
        outcomes: [{ kind: 'hpShare', ratio: -0.25 }, { kind: 'maxHp', amount: 7 }],
      },
      {
        label: '改用时砂结账',
        desc: '交出七成时砂，回复 24 点生命。',
        outcomes: [{ kind: 'goldShare', ratio: -0.7 }, { kind: 'heal', amount: 24 }],
      },
      {
        label: '翻过闸口',
        desc: '省下 30 枚时砂的过路费，闸刀落下时失去 13 点生命。',
        outcomes: [{ kind: 'gold', amount: 30 }, { kind: 'damage', amount: 13 }],
      },
    ],
  },
  {
    id: 'weavers-widow',
    title: '织者的遗孀',
    body:
      '她把丈夫最后织的半匹布摊在膝上，手指压着断口，一直没敢往下看。' +
      '布的末端还在自己缓慢走针，织出来的花纹一天比一天暗。她问你，那半匹里织的是不是他死的那一天。',
    options: [
      {
        label: '说实话',
        desc: '你陪她把布看完，天亮时生命上限 -5，她把丈夫的遗物交给你。',
        outcomes: [{ kind: 'maxHp', amount: -5 }, { kind: 'addRelic' }],
      },
      {
        label: '说不是',
        desc: '她道谢并塞给你 70 枚时砂，那半匹布跟着你走：获得一张无尽经线。',
        outcomes: [
          { kind: 'gold', amount: 70 },
          { kind: 'addNamedCard', cardId: 'eternal-warp' },
        ],
      },
    ],
  },
  {
    id: 'chapel-of-repeats',
    title: '重复礼拜堂',
    body:
      '堂里的诵经每七个字循环一次，跪着的人已经念了不知道多少遍同一句。' +
      '你数到第三遍时发现有一个人的口型快了半拍，他念的是后面还没到的那一段。',
    options: [
      {
        label: '打断快半拍的人',
        desc: '整堂人同时转头，你失去 10 点生命，他把没念完的那段留给你：随机强化一张牌。',
        outcomes: [{ kind: 'damage', amount: 10 }, { kind: 'upgradeCard' }],
      },
      {
        label: '跟着念一遍',
        desc: '回复 30 点生命，那句经文卡在你嘴里：获得一张静滞机芯。',
        outcomes: [
          { kind: 'heal', amount: 30 },
          { kind: 'addNamedCard', cardId: 'quiet-movement' },
        ],
      },
      {
        label: '从侧门出去',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'last-listener',
    title: '最后的听钟人',
    body:
      '老人把耳朵贴在钟壁上，说他能听出哪一段声音是别人硬塞进你身上的。' +
      '他的报酬不收时砂——他要你把那段连同它的重量一起留在这间屋子里。',
    options: [
      {
        label: '让他掏出来',
        desc: '移除牌组中的一张诅咒，生命上限 -4。没有诅咒时只失去上限。',
        outcomes: [{ kind: 'removeCurse' }, { kind: 'maxHp', amount: -4 }],
      },
      {
        label: '让他继续往下听',
        desc: '他随手扯掉一段：随机移除牌组中的一张牌，你失去 5 点生命。',
        outcomes: [{ kind: 'removeCard' }, { kind: 'damage', amount: 5 }],
      },
      {
        label: '捂住耳朵',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'unclaimed-coffer',
    title: '无人认领的箱子',
    body:
      '箱子摆在岔路正中，锁扣是开的，扣舌却朝里弯。四周的沙压出一圈平整的印，' +
      '像它自己挪过来的。你蹲下的时候，里面有东西轻轻换了个位置，随后又摆回原样。',
    options: [
      {
        label: '掀开盖子',
        desc: '盖子底下不是时砂。',
        outcomes: [{ kind: 'chest', enemyId: 'warp-thief' }],
      },
      {
        label: '只捞外面那层浮砂',
        desc: '获得 30 枚时砂，手伸回来时少了一块皮：失去 6 点生命。',
        outcomes: [{ kind: 'gold', amount: 30 }, { kind: 'damage', amount: 6 }],
      },
      {
        label: '把它留在岔路上',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'bronze-locked-case',
    title: '三道铜锁的匣子',
    body:
      '锁孔里没有锈，反倒是温的。挂在旁边的空钥匙牌上写着上一位开匣人的名字，' +
      '字只写了一半，后半截像是写着写着就不必写了。贴上去听，里面的呼吸和你的错开半拍。',
    options: [
      {
        label: '砸开三道锁',
        desc: '里面的东西等这一下已经等了很久。',
        outcomes: [{ kind: 'chest', enemyId: 'slag-sentinel' }],
      },
      {
        label: '照牌子上的价买钥匙',
        desc: '交出六成时砂，锁自己弹开，匣底躺着一件装备。',
        outcomes: [{ kind: 'goldShare', ratio: -0.6 }, { kind: 'addEquipment' }],
      },
      {
        label: '把那个名字补完',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'weeping-strongbox',
    title: '渗水的贡匣',
    body:
      '匣底一直在往外渗水，水滴在石板上却不积起来，湿痕总停在同一圈边界内。' +
      '匣子被人钉死过，钉子是从里面顶出来的，钉帽都朝着外面。',
    options: [
      {
        label: '把钉子一根根拔掉',
        desc: '顶开钉子的东西还在里面。',
        outcomes: [{ kind: 'chest', enemyId: 'null-leech' }],
      },
      {
        label: '整个翻过来倒',
        desc: '倒出 40 枚时砂和一沓湿透的纸，纸上的字换到你牌组里去了：随机移除一张牌。',
        outcomes: [{ kind: 'gold', amount: 40 }, { kind: 'removeCard' }],
      },
      {
        label: '踩着它跨过去',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'lucky-find',
    title: '幸运发现',
    auto: true,
    body:
      '路面塌了一小块，露出底下一只早就没人记得的小袋。袋口的绳结打法比现在通行的老了几十年，' +
      '解开时还很顺手。不是你找到它，是它先绊了你一下。',
    options: [
      {
        label: '弯腰捡起来',
        desc: '袋里的东西看运气。',
        outcomes: [{ kind: 'gift' }],
      },
    ],
  },
  {
    id: 'mages-tithe',
    title: '魔法馈赠',
    auto: true,
    body:
      '一段旧咒挂在半空没散干净，遇上活人就自动把剩下的音节念完。念咒的人早已不在，' +
      '效果照发，只是不再挑对象。它落在你身上的时候，音还没收尾。',
    options: [
      {
        label: '站在原地把它受完',
        desc: '落到你身上的是哪一段，由不得你。',
        outcomes: [{ kind: 'gift' }],
      },
    ],
  },
  {
    id: 'roadside-trifle',
    title: '路边的小事',
    auto: true,
    body:
      '一只鞋、一枚扣子、一句刻在墙根的骂人话。全是赶路的人掉下的东西，没一样值得停下来，' +
      '你还是停了一会儿。',
    options: [
      {
        label: '蹲下翻了翻',
        desc: '六成机会翻出 28 枚时砂，否则被墙根的什么东西划伤，失去 5 点生命。',
        outcomes: [
          {
            kind: 'chance',
            percent: 60,
            hit: [{ kind: 'gold', amount: 28 }],
            miss: [{ kind: 'damage', amount: 5 }],
          },
        ],
      },
    ],
  },
  {
    id: 'windless-hour',
    title: '无风的一刻',
    auto: true,
    body:
      '整条路的沙都停在半空，连你呼出的白气也悬着不动。这样的间隙一天只出现一次，' +
      '撞上的人可以在里面多待一会儿，不算在自己的时间里。',
    options: [
      {
        label: '在里面站到它散掉',
        desc: '六成半的机会回复 18 点生命，否则捡到停在半空的 20 枚时砂。',
        outcomes: [
          {
            kind: 'chance',
            percent: 65,
            hit: [{ kind: 'heal', amount: 18 }],
            miss: [{ kind: 'gold', amount: 20 }],
          },
        ],
      },
    ],
  },
  {
    id: 'discarded-kit',
    title: '卸下的行头',
    auto: true,
    body:
      '路边整整齐齐码着一副卸下来的行头，扣子都系好了，摆法像是主人打算回来取。' +
      '旁边的脚印只有去的方向，没有回来的。',
    options: [
      {
        label: '挑一件穿上',
        desc: '获得一件装备。',
        outcomes: [{ kind: 'addEquipment' }],
      },
    ],
  },
  {
    id: 'two-faced-token',
    title: '两面都是正面的筹码',
    body:
      '庄家把筹码立在指节上转，说这枚两面都是正面，输的只可能是压上去的东西不够重。' +
      '他不收时砂。他收你身上还没用完的那部分。',
    options: [
      {
        label: '压一半的血',
        desc: '失去当前生命的一半；六成机会换来一件遗物与 60 枚时砂，否则只落下一张诅咒。',
        outcomes: [
          { kind: 'hpShare', ratio: -0.5 },
          {
            kind: 'chance',
            percent: 60,
            hit: [{ kind: 'addRelic' }, { kind: 'gold', amount: 60 }],
            miss: [{ kind: 'addCard', pool: 'curse' }],
          },
        ],
      },
      {
        label: '压牌组里最重的一张',
        desc: '随机移除一张牌；五成半的机会随机强化一张牌并获得 50 枚时砂，否则获得一张无尽经线。',
        outcomes: [
          { kind: 'removeCard' },
          {
            kind: 'chance',
            percent: 55,
            hit: [{ kind: 'upgradeCard' }, { kind: 'gold', amount: 50 }],
            miss: [{ kind: 'addNamedCard', cardId: 'eternal-warp' }],
          },
        ],
      },
      {
        label: '等他转完',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'hourglass-roulette',
    title: '沙漏转盘',
    body:
      '六只沙漏倒扣在转盘上，只有一只里面还有沙。停在哪一只由不得你，' +
      '围观的人押的也不是你能拿走多少，是你会不会当场老掉一截。',
    options: [
      {
        label: '转一次',
        desc: '七成机会获得 60 枚时砂，否则生命上限 -7。',
        outcomes: [
          {
            kind: 'chance',
            percent: 70,
            hit: [{ kind: 'gold', amount: 60 }],
            miss: [{ kind: 'maxHp', amount: -7 }],
          },
        ],
      },
      {
        label: '转到它自己停下为止',
        desc: '三成半的机会获得一件装备与一件遗物；否则失去当前生命的四成并获得一张诅咒。',
        outcomes: [
          {
            kind: 'chance',
            percent: 35,
            hit: [{ kind: 'addEquipment' }, { kind: 'addRelic' }],
            miss: [{ kind: 'hpShare', ratio: -0.4 }, { kind: 'addCard', pool: 'curse' }],
          },
        ],
      },
      {
        label: '把手从转盘上拿开',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'unfinished-armory',
    title: '未完工的军械间',
    body:
      '架上的东西都差最后一道工序：护腕缺一枚铆钉，刀身留着没磨的毛边。' +
      '铁匠的凳子还是温的，砧上那件半成品的形状，正好照着你的尺寸。',
    options: [
      {
        label: '挑一件带走',
        desc: '获得一件装备，没磨过的边割手：失去 9 点生命。',
        outcomes: [{ kind: 'addEquipment' }, { kind: 'damage', amount: 9 }],
      },
      {
        label: '出钱把砧上那件敲完',
        desc: '交出五成时砂请人收尾，获得一件装备并回复 10 点生命。',
        outcomes: [
          { kind: 'goldShare', ratio: -0.5 },
          { kind: 'addEquipment' },
          { kind: 'heal', amount: 10 },
        ],
      },
      {
        label: '空手出去',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
  {
    id: 'quartermaster-in-arrears',
    title: '欠饷的军需官',
    body:
      '他守着一屋子登记在册却没人来领的东西，账目对不上已经三十年。' +
      '按规矩发一行要先销一行，他不在乎销掉的是谁的，只在乎册子两边的数字一样长。',
    options: [
      {
        label: '销掉自己名下那一行',
        desc: '随机失去一件遗物，换来一件装备与 40 枚时砂。',
        outcomes: [{ kind: 'loseRelic' }, { kind: 'addEquipment' }, { kind: 'gold', amount: 40 }],
      },
      {
        label: '替别人把缺口补齐',
        desc: '交出六成时砂，获得一件装备。',
        outcomes: [{ kind: 'goldShare', ratio: -0.6 }, { kind: 'addEquipment' }],
      },
      {
        label: '不在册子上留字',
        desc: '什么也没发生。',
        outcomes: [{ kind: 'nothing' }],
      },
    ],
  },
];
