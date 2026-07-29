# 配乐文件

按 `design/gdd/music-brief.md` 里各节标题的英文 id 命名，放入本目录。

循环曲目
```
title.mp3        map-act1.mp3   map-act2.mp3   map-act3.mp3
battle.mp3       elite.mp3
boss-act1.mp3    boss-act2.mp3  boss-act3.mp3
shop.mp3         rest.mp3       event.mp3
```

一次性演出音
```
victory.mp3      defeat.mp3
```

支持 mp3、ogg、m4a、aac、wav、opus、flac。扩展名不限，文件名前缀必须与上表一致。
缺失的曲目会被跳过，不影响运行。

循环曲基准音量 0.19，逐曲微调写在 `src/audio/music.ts` 的 TRIM 表里。
胜负演出音播放期间循环曲停止，放完后自动接回场景曲。
