/* ==========================================================================
   ScrollStory 3 组横向卡片 — 数据
   进度区间按"50% 文字 + 20% 退场 + 缓冲"分配，所有组共享同一个
   SCROLL_STORY_PROGRESS（0..1）。
   调整节奏：改各组的 in/hold/out 即可。
   ========================================================================== */
(function(){
  'use strict';

  /**
   * 每张卡片的进度窗口定义（与 group 共享 in/hold/out/outEnd，但首张卡不动、其余 stagger）：
   *   in      — 卡片开始淡入的 progress
   *   hold    — 卡片完全实体的 progress（≥0.95 起始点）
   *   out     — 卡片开始淡出的 progress
   *   outEnd  — 卡片完全归零的 progress
   *
   * 关键：group.hold 是"全组全部完成 fade-in 的时刻"，不是首卡
   *   首卡：in = group.in, hold = group.hold
   *   末卡：in = group.hold - 0.04, hold = group.hold  （0.04 = 2 * stagger）
   * 即 3 张卡的 hold 都对齐到 group.hold，确保"组实体停留期"是真实可感的
   */
  const GROUPS = [
    {
      id: 1,
      title: '四十年',
      subtitle: 'Artist',
      cards: [
        { num: '40+',  unit: '年',    desc: '笔耕四十载\n只此一山水' },
        { num: '17',   unit: '岁',    desc: '拜师清漓院\n入室为关门' },
        { num: '1',    unit: '题材',  desc: '一生一幅画\n唯写桂林山' },
      ],
      // 整组区间 0.35-0.60（持续 0.25）
      in: 0.35, hold: 0.50, out: 0.55, outEnd: 0.60,
    },
    {
      id: 2,
      title: '三不',
      subtitle: 'Character',
      cards: [
        { num: '不',   unit: '逐',    desc: '不逐浮名远\n不争虚誉来' },
        { num: '不',   unit: '慕',    desc: '不慕奢华事\n不媚世俗风' },
        { num: '素',   unit: '心',    desc: '素心对素纸\n素笔写素山' },
      ],
      // 整组区间 0.65-0.95（持续 0.30；与组 1 不重叠 0.05 缓冲）
      in: 0.65, hold: 0.80, out: 0.88, outEnd: 0.95,
    },
  ];

  // 每张卡片在组内的 stagger：让"全组完整实体"的时刻等于 group.hold
  // 单卡组无 stagger 概念，直接用 group 区间
  function cardWindow(group, index){
    if (group.cards.length === 1) {
      return { in: group.in, hold: group.hold, out: group.out, outEnd: group.outEnd };
    }
    const STAGGER = 0.02;
    const last = group.cards.length - 1;
    const firstIn = group.in;
    const lastIn  = group.hold - STAGGER * last;
    const inP = firstIn + (lastIn - firstIn) * (index / last);
    return {
      in:     inP,
      hold:   group.hold,
      out:    group.out,
      outEnd: group.outEnd,
    };
  }

  window.SCROLL_STORY_CARDS_DATA = { GROUPS, cardWindow };
})();
