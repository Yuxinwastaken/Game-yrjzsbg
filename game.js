/* ============================================================
   合成大gaygay —— game.js（第 8 阶段：最高分，全部完成 🎉）
   ------------------------------------------------------------
   前几个阶段做了什么：
     1. 接上 Matter.js 物理引擎（球会掉、会滚、会堆叠）
     2. 在游戏区里造出「左右两面墙 + 地板」
     3. 用 <img> 把球画出来，每帧跟着物理坐标移动
     4. 出球口跟着鼠标走，并显示下一颗球的预览

   第 4 阶段新加了什么：
     5. 【点一下就放球】—— 测试按钮删掉了
     6. 两次放球之间有冷却，疯狂连点也不会刷出一堆球
     7. 放球前会先瞄准，所以「看到预览」和「掉下来的球」永远一致

   第 5 阶段新加了什么：
     8. 【合成！】两个同级球撞在一起 → 变成一个高一级的球 + 加分
     9. 合成时有「噗」的消失动画 + 炸开的光晕 + 新球弹出动画
    10. 新球会继承两个旧球的速度，不会僵在半空

   第 6 阶段新加了什么：
    11. 记分板上的「下一个」会显示真的球图（以前是个灰圆）
    12. 每次换球都会闪一下；抽到 5、6 级大球会描一圈金边
    13. 全程只有 rollNextLevel() 能改 nextLevel，杜绝「预览和实际不一致」

   第 7 阶段新加了什么：
    14. 【结束判定】有球「停住」且顶过危险线，持续 2 秒就判输
    15. 危险线上有球时会变红、闪得更急，提醒玩家
    16. 结算面板按分数显示两种结局：电脑 >1200 分、手机 >500 分「守卫成功」，否则「婚礼失败」

   第 8 阶段新加了什么：
    17. 【最高分】分数超过历史最高就刷新并写进 localStorage
    18. 关掉浏览器再打开，最高分还在

   全部 8 个阶段都完成了 ✅
   ============================================================ */

'use strict'; // 严格模式：写错变量名会直接报错，方便初学者排查

/* ------------------------------------------------------------
   一、基础设置
   ------------------------------------------------------------ */

// 游戏区尺寸（和 style.css 的 --stage-w / --stage-h 对应）
// 注意：这只是默认值，真正的尺寸会在 init() 里从页面上量出来
let STAGE_WIDTH = 480;
let STAGE_HEIGHT = 660;

// 左右墙的厚度（和 style.css 里 .wall 的 width 一致）
const WALL_THICKNESS = 10;
// 地板的厚度（和 style.css 里 .floor 的 height 一致）
const FLOOR_THICKNESS = 10;

// 图片所在文件夹。注意结尾的斜杠不能少！
const IMAGE_DIR = 'assets/';

// 第 1 级球在屏幕上的直径（像素）
const BASE_DIAMETER = 56;

// 每升一级，直径乘以这个倍数（1.13 = 每级大约大 13%）
// 算下来：1 级 56px → 16 级约 350px，占游戏区宽度的大半
const GROWTH = 1.13;

// 一共 16 个等级
const MAX_LEVEL = 16;

// 重力大小。数字越大掉得越快（1 是 Matter.js 的默认值，地球味儿）
const GRAVITY = 1;

// 球有多「弹」。0 = 完全不弹（像铅球），1 = 完全弹性（像台球）
// Matter.js 里弹回来的速度 ≈ 弹性 × 撞上去的速度：
//   0.8 → 弹回八成速度，弹起高度约「落下高度 × 0.8² ≈ 64%」，很弹。
// 引擎取「两个物体里较大的弹性」，所以球撞球、球撞地用的是同一个值，
// 无论落到地板还是别的球上，都会弹。
const BALL_RESTITUTION = 0.8;

// 空气阻力：越大回弹衰减越快、球越快停稳。
// 0.01 是引擎默认值，几乎不额外打压回弹，让球能连续多弹几下。
const BALL_AIR_FRICTION = 0.01;

// 球之间的摩擦力。数字越大越不容易滚
const BALL_FRICTION = 0.35;

// 危险线离游戏区顶部多少像素
const DANGER_OFFSET = 118;

// 球压在危险线上方待满这么久（毫秒）才会判「输」。
// 留这个缓冲，是因为球刚扔下来时会「路过」危险线上方，那不能算输。
const DANGER_GRACE_MS = 2000;

// 球的速度（像素/帧）低于这个值，就认为它「基本停住了」。
// 只有「停住 + 还在危险线上方」的球才算真的危险，
// 否则刚扔下来、还在下落的球会被误判成危险。
const SETTLE_SPEED = 2;

// 是不是触摸设备：手机（触屏）true，电脑（鼠标）false。
// 后面会用它区分「手机」和「电脑」的玩法参数。
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// 守卫成功的分数线：电脑 1200，手机 500
const WIN_SCORE = IS_TOUCH ? 500 : 1200;

/* ------------------------------------------------------------
   二、图片取景微调表
   ------------------------------------------------------------
   球是用 border-radius:50% 把方图裁成圆的，只会保留中间那一块。
   如果你觉得某张图裁出来的位置不好看（比如人的脸被切掉了），
   就在下面加一行，数字含义：
     x: 0% = 只看左边   50% = 中间   100% = 只看右边
     y: 0% = 只看上边   50% = 中间   100% = 只看下边
   例：3: { x: 50, y: 30 },  ← 3 级球往上挪一点
   ------------------------------------------------------------ */
const IMAGE_FOCUS = {
  // 暂时全部用默认的居中，之后按需要再加
};

/* ------------------------------------------------------------
   三、生成 16 个等级
   ------------------------------------------------------------ */

/**
 * 算出每个等级的信息。
 * @returns {Array} 每一项形如 { level, diameter, radius, image, focus }
 */
function buildLevels() {
  const levels = [];

  // 从 1 数到 16
  for (let level = 1; level <= MAX_LEVEL; level++) {
    // 直径 = 基础直径 × 增长倍数的 (等级-1) 次方
    // Math.pow(1.13, 2) 就是 1.13 的 2 次方
    const diameter = BASE_DIAMETER * Math.pow(GROWTH, level - 1);

    levels.push({
      level: level,
      diameter: Math.round(diameter * 100) / 100, // 保留两位小数
      radius: Math.round((diameter / 2) * 100) / 100, // 半径 = 直径的一半
      image: IMAGE_DIR + 'level' + level + '.jpg',
      // 如果 IMAGE_FOCUS 里写了这个等级就用它，否则用居中
      focus: IMAGE_FOCUS[level] || { x: 50, y: 50 },
    });
  }

  return levels;
}

// 所有球等级的数组，索引 0 对应 1 级球（所以取的时候要 -1，或者写个辅助函数）
const LEVELS = buildLevels();

/**
 * 按等级拿球的信息，写起来更顺手。
 * 例：getLevelInfo(1) 拿到 1 级球
 */
function getLevelInfo(level) {
  // 防止传进来奇怪的数字（比如 0 或者 99），夹在 1~16 之间
  const safeLevel = Math.min(Math.max(Math.round(level), 1), MAX_LEVEL);
  return LEVELS[safeLevel - 1];
}

/* ------------------------------------------------------------
   四、抽球概率
   ------------------------------------------------------------
   玩家每次得到的新球，只可能是 1~6 级（否则一上来就是巨球，没法玩）。
   数字越大 = 越容易被抽到。
   下面这些数字加起来是 100，所以可以直接当成百分比来读：
     1 级 30%   2 级 25%   3 级 20%   4 级 15%   5 级 7%   6 级 3%
   ------------------------------------------------------------ */
function getSpawnWeights() {
  return {
    1: 30,
    2: 25,
    3: 20,
    4: 15,
    5: 7,
    6: 3,
  };
}

/**
 * 按上面的概率随机抽一个等级。
 * 做法：把所有概率乘成一条长尺子，然后往上面随便扔一个点。
 * @returns {number} 1~6 之间的某个等级
 */
function pickSpawnLevel() {
  const weights = getSpawnWeights();

  // 先算总长度（这里是 100）
  let total = 0;
  for (const level in weights) {
    total += weights[level];
  }

  // 在 0 ~ total 之间随机取一个点
  let hit = Math.random() * total;

  // 从 1 级开始一小段一小段地减，减到负数说明这个点落在这一段里
  for (const level in weights) {
    hit -= weights[level];
    if (hit <= 0) {
      return Number(level);
    }
  }

  return 1; // 保险起见：万一上面都没命中，就返回 1 级
}

/* ------------------------------------------------------------
   五、拿到页面上的元素
   ------------------------------------------------------------
   getElementById 里的名字，必须和 index.html 里的 id="..." 完全一样。
   ------------------------------------------------------------ */
const el = {
  stage: document.getElementById('stage'),
  canvas: document.getElementById('gameCanvas'),
  ballLayer: document.getElementById('ballLayer'),
  score: document.getElementById('score'),
  bestScore: document.getElementById('bestScore'),
  nextPreview: document.getElementById('nextPreview'),
  dangerLine: document.getElementById('dangerLine'),
  spawnMark: document.getElementById('spawnMark'),
  spawnGuide: null, // 这个元素是 JS 动态造的，见 layoutSpawnMark()
  hintText: document.getElementById('hintText'),
  restartBtn: document.getElementById('restartBtn'),
  gameoverPanel: document.getElementById('gameoverPanel'),
  finalScore: document.getElementById('finalScore'),
  gameoverTitle: document.getElementById('gameoverTitle'),
  gameoverHint: document.getElementById('gameoverHint'),
};

/* ------------------------------------------------------------
   六、物理世界（Matter.js）
   ------------------------------------------------------------
   Matter.js 里有几个核心概念，先记住这三个就够了：
     Engine  —— 引擎，负责推进时间、算重力
     World   —— 世界，装着所有物体
     Bodies  —— 造物体的工厂（圆、方块、墙都靠它）
   ------------------------------------------------------------ */

// Matter 里的常用模块，先取出来，后面写起来短一些
const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Events = Matter.Events;   // 碰撞事件（第 5 阶段）
const Body = Matter.Body;       // 用来设置速度等（第 5 阶段）

// 引擎：整个物理世界的发动机
const engine = Engine.create();

// 把重力调成我们想要的大小
engine.gravity.y = GRAVITY;

// 世界：所有物体的容器
const world = engine.world;

// 用来存「这一局所有活着的球」，每一项形如 { body, img, level }
let balls = [];

/* ------------------------------------------------------------
   七、合成规则（第 5 阶段）
   ------------------------------------------------------------
   玩法：两个【同级】的球碰在一起 → 合成一个高一级的球 + 加分。

   为什么不能直接在碰撞事件里改世界？
     因为 Matter.js 在检测碰撞时，正在内部遍历物体列表。
     这时候删东西/加东西 = 边遍历边改数组，
     轻则行为诡异，重则直接崩。
   正确做法（下面就是这么写的）：
     碰撞时只把「想合并谁」记在一个待办列表里，
     等这一帧的物理算完了，再去处理这个列表。
   ------------------------------------------------------------ */

// 合成各级球能得多少分。
// 索引 0 没用（没有 0 级球），所以 1 级球合出来的分写在索引 1。
// 规律：越高级的球分越多，翻倍增长，玩到后面成就感更强。
const MERGE_SCORES = [
  0,   // 占位（没有 0 级）
  1,   // 1+1 → 2 级，1 分
  3,   // 2+2 → 3 级，3 分
  6,
  10,
  15,
  21,
  28,
  36,
  45,
  55,
  66,
  78,
  91,
  105,
  120,
  136, // 15+15 → 16 级（最高级），136 分
];

// 待处理的合成请求。每一项形如 { a, b, x, y, vx, vy, newLevel }
let pendingMerges = [];

// 这一帧里「已经被安排要消失」的球。
// 用 Set 存，因为它判断「有没有」特别快。
// 作用：防止一颗球在同一帧里被合并两次（A碰B、A又碰C）。
let mergingBodies = new Set();

// 当前分数
let currentScore = 0;

/**
 * 查某个等级合成能得多少分。
 * @param {number} level 被合成的两个球的等级
 * @returns {number}
 */
function getMergeScore(level) {
  if (level < 1 || level >= MAX_LEVEL) {
    return 0; // 越界或最高级，不给分
  }
  return MERGE_SCORES[level] || 0;
}

/**
 * 造出左右墙和地板。
 * 注意：这三块在画面上是 CSS 画的（.wall / .floor），
 * 这里造的是「看不见的碰撞体」，位置和粗细要和 CSS 对上，
 * 不然会出现「球没碰到墙却弹开了」这种怪事。
 */
function createWalls() {
  const halfW = WALL_THICKNESS / 2;
  const halfF = FLOOR_THICKNESS / 2;

  // Matter 里物体的位置指的是「中心点」，所以 x 要写一半厚度

  // 左墙：贴着左边，中心在 x = halfW
  const leftWall = Bodies.rectangle(
    halfW,
    STAGE_HEIGHT / 2,
    WALL_THICKNESS,
    STAGE_HEIGHT * 2, // 造高一点，防止球从顶上飞出去
    { isStatic: true } // isStatic = true 表示这个物体不动，像一堵真的墙
  );

  // 右墙
  const rightWall = Bodies.rectangle(
    STAGE_WIDTH - halfW,
    STAGE_HEIGHT / 2,
    WALL_THICKNESS,
    STAGE_HEIGHT * 2,
    { isStatic: true }
  );

  // 地板
  const floor = Bodies.rectangle(
    STAGE_WIDTH / 2,
    STAGE_HEIGHT - halfF,
    STAGE_WIDTH,
    FLOOR_THICKNESS,
    { isStatic: true }
  );

  // 给它们起个名字，以后调试时好辨认
  leftWall.label = 'wall-left';
  rightWall.label = 'wall-right';
  floor.label = 'floor';

  // 放进世界里
  Composite.add(world, [leftWall, rightWall, floor]);

  return { leftWall: leftWall, rightWall: rightWall, floor: floor };
}

/**
 * 造一颗球（物理 + 画面各一半）。
 * @param {number} level 等级 1~16
 * @param {number} x     水平位置（像素）
 * @param {number} y     垂直位置（像素）
 * @returns {object} { body, img, level }
 */
function createBall(level, x, y) {
  const info = getLevelInfo(level);
  const radius = info.radius;

  // ---- 1. 物理那一半：一个看不见的圆 ----
  const body = Bodies.circle(x, y, radius, {
    restitution: BALL_RESTITUTION,  // 弹性
    friction: BALL_FRICTION,        // 摩擦力
    frictionStatic: 0.5,            // 静止时的摩擦，防止球慢慢滑动
    frictionAir: BALL_AIR_FRICTION, // 空气阻力：让回弹自然衰减，球能停稳
    density: 0.001,                 // 密度，先随便给个小值，第 5 阶段再调
    label: 'ball-' + level,         // 方便调试时认出这是几级球
  });

  // 把等级信息挂在物体上，以后碰撞时能直接读出来
  body.plugin = { level: level, info: info };

  // ---- 2. 画面那一半：一个 <img> ----
  const img = document.createElement('img');
  img.className = 'ball';
  img.src = info.image;
  img.alt = level + ' 级球';
  img.draggable = false; // 禁止浏览器自带的「拖图片」行为

  // 宽高设成实际直径
  img.style.width = info.diameter + 'px';
  img.style.height = info.diameter + 'px';

  // 图片从哪个位置裁（对应 IMAGE_FOCUS 那张表）
  img.style.objectPosition = info.focus.x + '% ' + info.focus.y + '%';

  // 挂到球层上
  if (el.ballLayer) {
    el.ballLayer.appendChild(img);
  }

  // ---- 3. 物理 + 画面配成一对，存进列表 ----
  const ball = { body: body, img: img, level: level };
  balls.push(ball);

  // 把物理物体也放进世界
  Composite.add(world, body);

  return ball;
}

/**
 * 把每颗球的位置同步到画面上。
 * 这个函数每秒会被调用约 60 次（每一帧一次）。
 */
function syncBallsToScreen() {
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const pos = ball.body.position;

    // 用 transform 一次性把球挪到该在的地方
    // 后面的 translate(-50%,-50%) 让图片中心对齐物理中心，
    // 否则图片会按左上角对齐，整体偏右下一半
    ball.img.style.transform =
      'translate(' + pos.x + 'px, ' + pos.y + 'px) translate(-50%, -50%)';
  }
}

/* ------------------------------------------------------------
   八、出球口：跟着鼠标 / 手指左右移动（第 3 阶段）
   ------------------------------------------------------------
   思路：
     1. 监听「指针移动」（鼠标、手指、触控笔都算）
     2. 把指针在游戏区里的水平位置记下来
     3. 每一帧把这个位置写进 .spawn-mark 的 transform
     4. 位置要「夹」在两面墙之间，不然会跑到墙里面去
   ------------------------------------------------------------ */

// 出球口当前的水平位置（游戏区坐标，单位像素）
let spawnX = 0;

// 手机端「按住拖动瞄准」用的：记录正按着的那根手指的 pointerId。
// null = 现在没在按住瞄准。
let aimingPointerId = null;

// 下一颗球的等级。第 3 阶段先定下来，第 4 阶段投放后会重新抽
let nextLevel = 1;

/**
 * 把出球口的位置限制在两面墙之间。
 * 为什么要限制？因为球是有半径的：
 * 如果出球口贴在墙上，球会有一半生到墙里面，直接卡住。
 * @param {number} x 想要的位置
 * @param {number} radius 球半径
 * @returns {number} 修正后的安全位置
 */
function clampSpawnX(x, radius) {
  // 左边的极限：墙厚 + 球半径 + 3 像素余量
  const minX = WALL_THICKNESS + radius + 3;
  // 右边的极限：总宽 - 墙厚 - 球半径 - 3 像素余量
  const maxX = STAGE_WIDTH - WALL_THICKNESS - radius - 3;

  // Math.min / Math.max 组合起来就是「夹」在两个数中间
  return Math.min(Math.max(x, minX), maxX);
}

/**
 * 让出球口挪到 spawnX 指定的位置，并把外观调成下一颗球的样子。
 */
function layoutSpawnMark() {
  const mark = el.spawnMark;
  if (!mark) return;

  const info = getLevelInfo(nextLevel);

  // 1. 先把位置夹到安全范围里
  spawnX = clampSpawnX(spawnX, info.radius);

  // 2. 挪位置。
  //    这里不能只写 translateX(spawnX)，因为还要 -50% 让中心对齐
  mark.style.transform =
    'translateX(' + spawnX + 'px) translateX(-50%)';

  // 3. 出球口的大小跟着球的大小走（这样玩家一眼能看出球多大）
  mark.style.width = info.diameter + 'px';
  mark.style.height = info.diameter + 'px';

  // 4. 更新里面的预览球图片
  let ghost = mark.querySelector('.spawn-ghost');

  if (!ghost) {
    // 还没有就造一个
    ghost = document.createElement('img');
    ghost.className = 'spawn-ghost';
    ghost.draggable = false;
    ghost.alt = '';
    mark.appendChild(ghost);
  }

  // 5. 换图片和尺寸：路径变了才重新设 src，避免每帧都重新下载
  if (ghost.getAttribute('src') !== info.image) {
    ghost.src = info.image;
  }

  // 预览球比出球口略微小一点，露出外圈的虚线圈
  const ghostSize = Math.max(info.diameter - 6, 12);
  ghost.style.width = ghostSize + 'px';
  ghost.style.height = ghostSize + 'px';
  ghost.style.objectPosition = info.focus.x + '% ' + info.focus.y + '%';

  // 6. 出球口下面那条往下渐隐的瞄准线（只造一次，挂在 .stage 上）
  if (!el.spawnGuide) {
    el.spawnGuide = document.createElement('div');
    el.spawnGuide.className = 'spawn-guide';
    el.stage.appendChild(el.spawnGuide);
  }

  // 让它从出球口下边缘开始，垂直拉到游戏区底部
  const guideTop = 6 + info.diameter; // 出球口的 top(6) + 它的高度
  el.spawnGuide.style.height = Math.max(STAGE_HEIGHT - guideTop, 0) + 'px';
  el.spawnGuide.style.transform =
    'translateX(' + spawnX + 'px) translateY(' + guideTop + 'px)';
}

/* ------------------------------------------------------------
   九、「下一个」预览（第 6 阶段）
   ------------------------------------------------------------
   记分板上那张卡要提前告诉玩家：下一颗掉下来的球长什么样。
   这样玩家才能规划落点，而不是球掉了才发现是个大球。
   ------------------------------------------------------------ */

/**
 * 更新「下一个」那张卡里的小圆预览图。
 * 这里是 HUD（记分板），和出球口里那颗预览球是两个不同的东西：
 *   出球口预览 —— 在游戏区里，跟着鼠标移动，每帧刷新
 *   HUD 预览  —— 在记分板上，位置固定，只在换球的时候刷新
 * @param {boolean} withAnimation 换球时要不要闪一下
 */
function updateNextPreview(withAnimation) {
  const preview = el.nextPreview;
  if (!preview) return;

  const info = getLevelInfo(nextLevel);

  // 1. 换图片。
  //    和出球口一样，路径没变就不重设，避免浏览器反复重新解码图片。
  const url = 'url("' + info.image + '")';
  if (preview.dataset.image !== url) {
    preview.style.backgroundImage = url;
    preview.dataset.image = url;
  }

  // 2. 和普通球一样，按 IMAGE_FOCUS 表决定从图片的哪个位置裁
  preview.style.backgroundPosition =
    info.focus.x + '% ' + info.focus.y + '%';

  // 3. 把等级记在元素上，方便调试时一眼看出这是几级球
  preview.dataset.level = String(nextLevel);
  preview.title = '下一个：' + nextLevel + ' 级球';

  // 4. 抽到大球（5、6 级）时描一圈金边
  preview.classList.toggle('is-rare', nextLevel >= 5);

  // 5. 闪一下。
  //    先摘掉这个 class 再重新加上，否则连续两次换球时
  //    浏览器会认为「class 没变过」，动画不会重新播。
  if (withAnimation) {
    preview.classList.remove('is-changed');
    // void 一下是在「强迫浏览器立刻重算样式」，
    // 不这么做的话，remove 和 add 在同一帧里会被合并，动画还是不播。
    void preview.offsetWidth;
    preview.classList.add('is-changed');
  }
}

/**
 * 抽下一颗球，并把 HUD 上的「下一个」预览更新掉。
 *
 * 为什么要把这两件事包在一起？
 * 因为「抽球」和「更新预览」必须永远同时发生。
 * 如果哪天有人在别的地方直接写 nextLevel = pickSpawnLevel()，
 * 就会漏掉预览更新，HUD 上的球和真正掉下来的球就对不上了。
 * 所以全游戏只有这一个地方能改 nextLevel。
 * @param {boolean} withAnimation 要不要播换球动画
 * @returns {number} 抽到的等级
 */
function rollNextLevel(withAnimation) {
  nextLevel = pickSpawnLevel();
  updateNextPreview(withAnimation !== false);
  return nextLevel;
}

/**
 * 指针在游戏区里移动时，更新出球口位置。
 * Pointer Events 的好处是一套代码同时管鼠标、手指、触控笔。
 * @param {PointerEvent} event
 */
function handlePointerMove(event) {
  if (!el.stage) return;

  // rect 是游戏区在屏幕上的位置和大小
  const rect = el.stage.getBoundingClientRect();

  // event.clientX 是「相对整个浏览器窗口」的坐标，
  // 减去 rect.left 才是「相对游戏区左边缘」的坐标
  spawnX = event.clientX - rect.left;

  // 手指按住移动时，顺便阻止页面跟着上下滚动
  if (event.pointerType !== 'mouse') {
    event.preventDefault();
  }
}

/**
 * 指针离开游戏区时，把出球口收回中间。
 */
function handlePointerLeave() {
  spawnX = STAGE_WIDTH / 2;
}

/**
 * 绑定指针相关的事件。
 */
function setupPointerControls() {
  const stage = el.stage;
  if (!stage) return;

  // pointermove：鼠标/手指在游戏区里移动
  stage.addEventListener('pointermove', handlePointerMove);

  // pointerdown：鼠标点一下放球；手指按住开始瞄准
  stage.addEventListener('pointerdown', handleDropPress);

  // pointerup：手指松开时放球（手机端）
  stage.addEventListener('pointerup', handlePointerUp);

  // pointercancel：触摸被打断时清掉瞄准状态
  stage.addEventListener('pointercancel', handlePointerCancel);

  // pointerleave：移出游戏区，回到中间
  stage.addEventListener('pointerleave', handlePointerLeave);

  // 手指在游戏区里划动时不要把页面一起拖走
  stage.addEventListener('touchmove', function (event) {
    event.preventDefault();
  }, { passive: false });
}

/* ------------------------------------------------------------
   十、画背景
   ------------------------------------------------------------
   把画布设成高清的 + 清空，并在上面画一些淡雅的装饰。
   以后想加「球落下的辅助虚线」之类的，就写在这里。
   ------------------------------------------------------------ */

function drawBackground() {
  const canvas = el.canvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1; // 高分屏上是 2

  // 物理像素 = CSS 像素 × dpr，这样在苹果的屏幕上也不会糊
  canvas.width = Math.round(STAGE_WIDTH * dpr);
  canvas.height = Math.round(STAGE_HEIGHT * dpr);

  // 把坐标系放大回去，这样我们就能直接按 CSS 像素来画
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 清空整块画布
  ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
}

/* ------------------------------------------------------------
   十一、主循环（游戏的心脏）
   ------------------------------------------------------------ */

/**
 * 每一帧都要做的事：推进物理 -> 把结果显示到画面上。
 * requestAnimationFrame 会以屏幕刷新率（一般 60 次/秒）反复调用它。
 */
function gameLoop() {
  // 0. 游戏已经结束了：画面冻结，但循环还活着（重开后能立刻恢复）。
  //    注意这里还是得再 requestAnimationFrame 一次，否则循环就断了。
  if (isGameOver) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // 1. 让物理世界往前走一小步。
  //    1000/60 表示「这一帧大约过了 16.7 毫秒」，
  //    Matter.js 会自己把它换算成内部的时间单位。
  Engine.update(engine, 1000 / 60);

  // 2. 【必须在这一步之后】处理这一帧发生的合成。
  //    Engine.update 内部会触发 collisionStart，
  //    那些事件只负责「登记」，真正的合成在这里做。
  processMergeQueue();

  // 3. 把物理算出来的新位置抄到画面上的 <img>
  syncBallsToScreen();

  // 4. 让出球口跟着鼠标走（第 3 阶段加的）
  layoutSpawnMark();

  // 5. 更新底部的玩法提示（第 4 阶段加的）
  updateHint(!canDrop(Date.now()));

  // 6. 检查有没有球压在危险线上（第 7 阶段加的）
  checkGameOver(Date.now());

  // 7. 请求浏览器在下一帧再叫我一次（这样就形成了循环）
  requestAnimationFrame(gameLoop);
}

/* ------------------------------------------------------------
   十二、测量、清理
   ------------------------------------------------------------ */

/**
 * 从页面上量出游戏区的真实尺寸。
 * 为什么不能写死 480×660？
 * 因为 style.css 里有响应式断点，小屏幕上尺寸会变，
 * 写死的话物理世界和画面就对不上了。
 */
function measureStage() {
  if (!el.stage) return;

  const rect = el.stage.getBoundingClientRect();

  // rect 里是小数（可能是 479.99），取整一下更干净
  STAGE_WIDTH = Math.round(rect.width);
  STAGE_HEIGHT = Math.round(rect.height);
}

/**
 * 把危险线挪到该在的位置。
 */
function layoutDangerLine() {
  if (el.dangerLine) {
    el.dangerLine.style.top = DANGER_OFFSET + 'px';
  }
}

/**
 * 把所有球清掉（重新开始时用）。
 */
function clearBalls() {
  for (let i = 0; i < balls.length; i++) {
    // 1. 从物理世界里删掉
    Composite.remove(world, balls[i].body);

    // 2. 从画面上删掉
    const img = balls[i].img;
    if (img && img.parentNode) {
      img.parentNode.removeChild(img);
    }
  }

  // 3. 列表清空
  balls = [];

  // 4. 顺便把待办和「已安排消失」的名单也清掉，
  //    否则重开之后可能残留上一局的幽灵记录
  pendingMerges = [];
  mergingBodies.clear();
}

/* ------------------------------------------------------------
   十三、合成逻辑（第 5 阶段）
   ------------------------------------------------------------ */

/**
 * 按物理物体找到对应的那颗球（{ body, img, level }）。
 * @param {object} body 物理物体
 * @returns {object|null}
 */
function findBallByBody(body) {
  for (let i = 0; i < balls.length; i++) {
    if (balls[i].body === body) {
      return balls[i];
    }
  }
  return null;
}

/**
 * 把一颗球从物理世界 + 画面上彻底删掉（合成时用）。
 * 和 clearBalls 的区别：这里只删一颗，而且会播放「噗」的消失动画。
 * @param {object} ball 要删的球
 * @param {boolean} withAnimation 要不要播消失动画
 */
function removeBall(ball, withAnimation) {
  if (!ball) return;

  // 1. 从物理世界删掉。删了之后它就不再参与碰撞了。
  Composite.remove(world, ball.body);

  // 2. 从 balls 列表里删掉
  const index = balls.indexOf(ball);
  if (index !== -1) {
    balls.splice(index, 1);
  }

  // 3. 画面上的图片
  const img = ball.img;
  if (!img) return;

  if (withAnimation) {
    // 加上动画类，等动画播完（260 毫秒）再把元素删掉。
    // 如果立刻删，玩家就什么都看不见了。
    img.classList.add('is-merging');
    setTimeout(function () {
      if (img.parentNode) {
        img.parentNode.removeChild(img);
      }
    }, 260);
  } else {
    // 不要动画，立刻删（重开的时候用这种）
    if (img.parentNode) {
      img.parentNode.removeChild(img);
    }
  }
}

/**
 * 在指定位置放一圈炸开的光晕（纯装饰，不影响物理）。
 */
function spawnSpark(x, y, radius) {
  if (!el.ballLayer) return;

  const spark = document.createElement('div');
  spark.className = 'merge-spark';
  spark.style.width = radius * 2.4 + 'px';
  spark.style.height = radius * 2.4 + 'px';
  spark.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

  el.ballLayer.appendChild(spark);

  // 动画 420 毫秒，播完清掉，避免 DOM 里越堆越多
  setTimeout(function () {
    if (spark.parentNode) {
      spark.parentNode.removeChild(spark);
    }
  }, 420);
}

/**
 * 收到「两颗球碰上了」的通知时调用。
 * 这里【只登记】，不动手改世界 —— 原因见前面「七、合成规则」的说明。
 * @param {object} bodyA 第一颗球的物理物体
 * @param {object} bodyB 第二颗球的物理物体
 */
function queueMerge(bodyA, bodyB) {
  // 1. 两颗球都得是球（可能有一方是墙或者地板）
  const ballA = findBallByBody(bodyA);
  const ballB = findBallByBody(bodyB);
  if (!ballA || !ballB) return;

  // 2. 必须同级
  if (ballA.level !== ballB.level) return;

  // 3. 最高级（16 级）不再往上合成，否则会越界找不到图片
  if (ballA.level >= MAX_LEVEL) return;

  // 4. 已经有一颗被安排消失了，就不要再算一次
  if (mergingBodies.has(ballA.body) || mergingBodies.has(ballB.body)) return;

  // 5. 登记「这两颗要消失」
  mergingBodies.add(ballA.body);
  mergingBodies.add(ballB.body);

  // 6. 算出新球的位置：两个旧球的中点。
  //    这样球不会突然跳到别的地方，视觉上最自然。
  const x = (ballA.body.position.x + ballB.body.position.x) / 2;
  const y = (ballA.body.position.y + ballB.body.position.y) / 2;

  // 7. 把两个旧球的速度加起来平均，让新球「继承惯性」。
  //    不然正在快速下落的球一合成就会僵在半空，很假。
  const vx = (ballA.body.velocity.x + ballB.body.velocity.x) / 2;
  const vy = (ballA.body.velocity.y + ballB.body.velocity.y) / 2;

  pendingMerges.push({
    a: ballA,
    b: ballB,
    x: x,
    y: y,
    vx: vx,
    vy: vy,
    newLevel: ballA.level + 1,
  });
}

/**
 * 处理这一帧攒下来的所有合成请求。
 * 必须在 Engine.update() 之后调用 —— 这时物理已经算完了，改世界才安全。
 */
function processMergeQueue() {
  if (pendingMerges.length === 0) return;

  // 先把待办复制一份出来，然后清空原来的列表。
  // 这样处理过程中如果又有新的碰撞进来，不会乱。
  const merges = pendingMerges;
  pendingMerges = [];

  for (let i = 0; i < merges.length; i++) {
    const m = merges[i];

    // 1. 两个旧球消失（带「噗」的动画）
    const oldRadius = getLevelInfo(m.a.level).radius;
    spawnSpark(m.x, m.y, oldRadius);
    removeBall(m.a, true);
    removeBall(m.b, true);

    // 2. 造一个新球，等级 +1
    const newBall = createBall(m.newLevel, m.x, m.y);

    // 3. 把继承来的速度塞给新球
    Body.setVelocity(newBall.body, { x: m.vx, y: m.vy });

    // 4. 新球播一个「弹出来」的动画
    newBall.img.classList.add('is-born');

    // 5. 加分
    const gained = getMergeScore(m.a.level);
    addScore(gained);
  }

  // 这一帧的合成全部处理完了，把「已安排消失」的名单清空，
  // 让这些球（其实已经不存在了）不会一直占着位置。
  mergingBodies.clear();
}

/**
 * 加分，并把分数写到画面上的 HUD 里。
 * @param {number} amount 加多少分
 */
function addScore(amount) {
  if (!amount) return;

  currentScore += amount;

  if (el.score) {
    el.score.textContent = currentScore;
  }

  updateBestScore();
  console.log('合成成功！+' + amount + ' 分，总分 ' + currentScore);
}

/**
 * 把分数归零（重开时用）。
 */
function resetScore() {
  currentScore = 0;
  if (el.score) {
    el.score.textContent = '0';
  }
}

/**
 * 监听所有球的碰撞，把「同级撞在一起」的挑出来登记。
 * 注意：这是全局只绑一次的，绑在 engine 上，不是绑在某颗球上。
 */
function setupMergeDetection() {
  Events.on(engine, 'collisionStart', function (event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
      queueMerge(pairs[i].bodyA, pairs[i].bodyB);
    }
  });
}

/* ------------------------------------------------------------
   十四、投放一颗球（第 4 阶段）
   ------------------------------------------------------------
   规则：
     1. 球从出球口的位置掉下来
     2. 两次投放之间要等一小会儿（冷却），防止疯狂点鼠标刷球
     3. 掉下来的球和出球口里预览的球，一定是同一颗
   ------------------------------------------------------------ */

// 两次投放之间要等多少毫秒。
// 250 毫秒差不多是「快速连点两下」的间隔，够挡住乱点，又不影响正常玩。
const DROP_COOLDOWN_MS = 250;

// 上一次成功投放的时间（毫秒时间戳）。0 表示还没投过。
let lastDropTime = 0;

/**
 * 现在能不能放球？冷却还没过就不能。
 * @param {number} now 当前时间戳
 * @returns {boolean}
 */
function canDrop(now) {
  return now - lastDropTime >= DROP_COOLDOWN_MS;
}

/**
 * 在出球口的位置放一颗球。
 * @returns {object|null} 成功返回球的信息，冷却中返回 null
 */
function dropBall() {
  const now = Date.now();

  // 1. 冷却检查：太频繁就直接忽略这次点击
  if (!canDrop(now)) {
    return null;
  }

  // 2. 用当前「下一个」的等级
  const level = nextLevel;
  const info = getLevelInfo(level);

  // 3. 位置用出球口当前位置。
  //    spawnX 在 layoutSpawnMark() 里已经被夹到安全范围内了。
  const ball = createBall(level, spawnX, info.radius + 20);

  // 4. 记下这次投放的时间，开始冷却
  lastDropTime = now;

  // 5. 投放完了，抽下一颗。
  //    因为 nextLevel 变了，出球口里的预览图会在下一帧自动换成新球，
  //    HUD 上的「下一个」则由 rollNextLevel() 立刻刷新。
  rollNextLevel(true);

  return ball;
}

/**
 * 真的放一颗球：先做各种拦截检查，再投放，最后打日志。
 * 鼠标「点一下」和手机「松手」都会走到这里，所以单独抽出来复用。
 */
function tryDrop() {
  // 已经结束了就不能再放球（第 7 阶段加的）
  if (isGameOver) return;

  // 冷却没到就别放了，也不要刷 Console
  if (!canDrop(Date.now())) {
    return;
  }

  const ball = dropBall();

  if (ball) {
    console.log(
      '放了一颗 ' + ball.level + ' 级球（x=' + Math.round(spawnX) + '），' +
      '目前场上 ' + balls.length + ' 颗，下一个是 ' + nextLevel + ' 级'
    );
  }
}

/**
 * 玩家按下鼠标 / 手指时调用：先瞄准，再决定怎么放球。
 * 鼠标 / 触控笔：点一下 = 放球。
 * 手指：按下去 = 开始「按住瞄准」，等松手（handlePointerUp）才放球。
 * @param {PointerEvent} event
 */
function handleDropPress(event) {
  if (!el.stage) return;

  // 先让出球口挪到手指/鼠标的位置（这样就算在放球前一刻移动也能跟上）
  handlePointerMove(event);

  // 手机上：按住先瞄准，不放球
  if (event.pointerType === 'touch') {
    aimingPointerId = event.pointerId;
    // 把后续的 move / up / cancel 都「锁」到 stage 上，
    // 这样手指划出游戏区再松手，我们也能收到 up 事件。
    el.stage.setPointerCapture(event.pointerId);
    return;
  }

  // 鼠标 / 触控笔：点一下直接放球
  tryDrop();
}

/**
 * 手指松开时调用：在手机端，这才是真正放球的时刻。
 * @param {PointerEvent} event
 */
function handlePointerUp(event) {
  if (!el.stage) return;
  if (event.pointerType !== 'touch') return;
  // 只处理「按住瞄准中」的那根手指
  if (aimingPointerId !== event.pointerId) return;

  aimingPointerId = null;

  // 松手瞬间再校准一次位置，避免最后一小段没触发 move
  handlePointerMove(event);
  tryDrop();
}

/**
 * 触摸被系统打断（来电、通知下滑等）时调用：清掉瞄准状态，避免卡住。
 * @param {PointerEvent} event
 */
function handlePointerCancel(event) {
  if (event.pointerId === aimingPointerId) {
    aimingPointerId = null;
  }
}

/**
 * 更新底部那行玩法提示。
 * 冷却中的时候变个颜色，玩家就知道「不是坏了，是点太快了」。
 * @param {boolean} blocked 现在能不能放球
 */
function updateHint(blocked) {
  if (!el.hintText) return;

  // 状态没变就别每帧都改 DOM，省一点性能。
  // dataset 里存的是字符串，所以这里也转成字符串来比较。
  const wantBlocked = blocked ? '1' : '0';

  if (el.hintText.dataset.blocked === wantBlocked) {
    return; // 和上一帧一样，什么都不用做
  }

  el.hintText.dataset.blocked = wantBlocked;
  el.hintText.classList.toggle('is-blocked', blocked);
  el.hintText.textContent = blocked
    ? '别点太快啦，稍等一下 ⏳'
    : (IS_TOUCH
        ? '按住并左右拖动瞄准，松手放球 💐'
        : '把鼠标移到想要的位置，点一下就放球 💐');
}

/* ------------------------------------------------------------
   十五、结束判定（第 7 阶段）
   ------------------------------------------------------------
   规则：某颗球「停住」并且顶部超过危险线，持续一小段时间，就判输。
   为什么要「停住」才算？因为球刚扔下来时会从危险线上方经过，
   那是在「路过」，不是真的堆太高了。
   ------------------------------------------------------------ */

// 现在这一局是不是已经结束了
let isGameOver = false;

// 危险开始的时间（毫秒时间戳）。null = 现在没有球压在危险线上。
let dangerStartTime = null;

/**
 * 判断一颗球算不算「危险」。
 * 两个条件要同时满足：
 *   1. 球顶（中心 y - 半径）已经越过危险线
 *   2. 球基本停住了（速度很慢）
 * 光有第 1 条不算数 —— 刚扔下来的球也在线上方，但那是在下落。
 * @param {object} ball 要检查的球
 * @returns {boolean}
 */
function isBallDanger(ball) {
  // 球顶 = 圆心往上挪一个半径
  const top = ball.body.position.y - getLevelInfo(ball.level).radius;
  const aboveLine = top < DANGER_OFFSET;

  // 速度大小 = 勾股定理：横竖两个分量的平方和再开根号
  const v = ball.body.velocity;
  const speed = Math.sqrt(v.x * v.x + v.y * v.y);
  const settled = speed < SETTLE_SPEED;

  return aboveLine && settled;
}

/**
 * 每一帧检查一次：有没有球压在危险线上，该不该判输。
 * 必须在 Engine.update() 之后调用，这样球的最新位置才是准的。
 * @param {number} now 当前时间戳（毫秒）
 */
function checkGameOver(now) {
  // 1. 找出「现在有没有球处于危险状态」
  let anyDanger = false;
  for (let i = 0; i < balls.length; i++) {
    if (isBallDanger(balls[i])) {
      anyDanger = true;
      break;
    }
  }

  // 2. 危险线的视觉反馈：有球压着就变红、闪得更急
  if (el.dangerLine) {
    el.dangerLine.classList.toggle('is-danger', anyDanger);
  }

  // 3. 没有球危险：计时清零，一切正常
  if (!anyDanger) {
    dangerStartTime = null;
    return;
  }

  // 4. 有球危险：第一次记下开始时间；之后看有没有拖满缓冲时间
  if (dangerStartTime === null) {
    dangerStartTime = now;
  } else if (now - dangerStartTime >= DANGER_GRACE_MS) {
    triggerGameOver();
  }
}

/**
 * 判定输了：显示结算面板、冻结整个游戏。
 */
/**
 * 判定结束：显示结算面板、冻结整个游戏。
 * 分数超过 WIN_SCORE 算「守卫成功」（赢），否则算「婚礼失败」（输）。
 */
function triggerGameOver() {
  if (isGameOver) return; // 已经结束了，别重复触发

  isGameOver = true;

  // 分数够高 = 守卫成功（赢），否则 = 婚礼失败（输）
  const isWin = currentScore > WIN_SCORE;

  // 把本局分数写进结算面板
  if (el.finalScore) {
    el.finalScore.textContent = currentScore;
  }

  // 根据输赢换不同的标题和提示文字
  if (el.gameoverTitle) {
    el.gameoverTitle.textContent = isWin
      ? '您已成功守卫他们的爱情，恭喜'
      : '婚礼举办失败';
  }
  if (el.gameoverHint) {
    el.gameoverHint.textContent = isWin
      ? '有情人终成眷属 💐'
      : '是否需要再次举办？点下面的按钮';
  }

  // 显示遮罩
  if (el.gameoverPanel) {
    el.gameoverPanel.classList.add('is-visible');
  }

  console.log(
    (isWin ? '💖 你成功守卫了他们的爱情！' : '💔 婚礼举办失败！') +
      ' 本局得分 ' + currentScore
  );
}

/**
 * 重新开始 / 初始化时，把「结束」状态清掉。
 */
function resetGameOver() {
  isGameOver = false;
  dangerStartTime = null;

  if (el.gameoverPanel) {
    el.gameoverPanel.classList.remove('is-visible');
  }
  if (el.dangerLine) {
    el.dangerLine.classList.remove('is-danger');
  }
}

/* ------------------------------------------------------------
   十六、最高分（第 8 阶段）
   ------------------------------------------------------------
   最高分会存进浏览器自带的 localStorage，
   这样关掉页面再打开，最高分还在。
   localStorage 就是「这个网站专属的一小块永久存储」。
   ------------------------------------------------------------ */

// localStorage 里存最高分用的「钥匙」（key）。
// 名字随便起，只要读和写用同一个就行。
const BEST_SCORE_KEY = 'merge-gaygay-best-score';

// 当前最高分（开局时从 localStorage 读出来）
let bestScore = 0;

/**
 * 从 localStorage 里把最高分读出来。
 * 读不到（比如第一次玩，或者存的是坏数据）就返回 0。
 * @returns {number}
 */
function loadBestScore() {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const n = parseInt(raw, 10);
    return isNaN(n) || n < 0 ? 0 : n;
  } catch (e) {
    // localStorage 可能在隐私模式里被禁用，别让游戏崩掉
    return 0;
  }
}

/**
 * 把最高分写进 localStorage。
 * 存失败就只警告，不影响游戏继续。
 * @param {number} score
 */
function saveBestScore(score) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch (e) {
    console.warn('最高分没能存下来（隐私模式可能关掉了存储）', e);
  }
}

/**
 * 如果当前分数超过了历史最高分，就更新最高分 + 存起来 + 刷新 HUD。
 * 在 addScore() 里每加一次分都会调一次，所以最高分总是最新的。
 */
function updateBestScore() {
  if (currentScore > bestScore) {
    bestScore = currentScore;
    saveBestScore(bestScore);

    if (el.bestScore) {
      el.bestScore.textContent = bestScore;
    }

    console.log('🎉 新纪录！最高分 ' + bestScore);
  }
}

/* ------------------------------------------------------------
   十七、游戏初始化
   ------------------------------------------------------------ */

function init() {
  // ---- 0. 先检查 Matter.js 有没有加载成功 ----
  if (typeof Matter === 'undefined') {
    console.error(
      '【错误】Matter.js 没加载成功！\n' +
        '原因通常是：网络断了 / CDN 被墙了 / 文件路径写错了。\n' +
        '请检查网络后刷新页面，或参考 README 改用本地文件。'
    );
    return; // 没有物理引擎，后面全都跑不了，直接停
  }

  // ---- 1. 量尺寸、摆危险线、准备画布 ----
  measureStage();
  layoutDangerLine();
  drawBackground();

  // ---- 2. 造墙和地板 ----
  createWalls();

  // ---- 3. 分数显示成 0，加载最高分，清掉「结束」状态 ----
  resetScore();
  resetGameOver();
  bestScore = loadBestScore();
  if (el.bestScore) el.bestScore.textContent = bestScore;

  // ---- 4. 监听碰撞，准备合成（第 5 阶段）----
  setupMergeDetection();

  // ---- 5. 出球口：默认在正中间 + 抽第一颗球 ----
  spawnX = STAGE_WIDTH / 2;
  // 第一次抽球不播动画（页面刚打开就闪一下反而莫名其妙）
  rollNextLevel(false);
  layoutSpawnMark();

  // ---- 6. 绑定鼠标 / 手指操作 ----
  setupPointerControls();

  // ---- 7. 按钮：只留「重新开始」----
  if (el.restartBtn) {
    el.restartBtn.addEventListener('click', function () {
      clearBalls();
      resetScore();
      rollNextLevel(true);
      lastDropTime = 0; // 重置冷却，让玩家可以立刻开始
      resetGameOver(); // 第 7 阶段：清掉「结束」状态
      console.log('已清空场上所有球，开始新的一局');
    });
  }

  // ---- 8. 开始跑主循环 ----
  requestAnimationFrame(gameLoop);

  // ---- 9. 打印日志，方便确认一切正常 ----
  console.log('游戏初始化成功');
  console.log('游戏区尺寸：' + STAGE_WIDTH + ' × ' + STAGE_HEIGHT + ' 像素');
  console.log('一共 ' + LEVELS.length + ' 个等级：');
  LEVELS.forEach(function (info) {
    console.log(
      '  ' + info.level + ' 级：直径 ' + info.diameter + 'px，图片 ' + info.image
    );
  });
  console.log('抽球概率：', getSpawnWeights());
  console.log('Matter.js 版本：' + Matter.version);
  console.log('👉 把鼠标移进游戏区，出球口会跟着走');
  console.log('👉 【点一下鼠标】就能放球，位置由出球口决定');
  console.log('👉 两个【同级】的球碰在一起就会合体升级，还会加分！');
  console.log('👉 记分板上的「下一个」会提前告诉你要来的球，先规划好落点');
  console.log('👉 球堆到危险线以上、停住 2 秒，这局就结束了');
  console.log('👉 分数超过历史最高就刷新，关掉页面再打开最高分还在');

  // 全部 8 个阶段都做完了 🎉
}

/* ------------------------------------------------------------
   十八、窗口大小变了要重新量
   ------------------------------------------------------------
   因为墙和地板的位置是按下尺寸算好就固定住的，
   如果用户中途拉大/拉小窗口，物理世界就和画面错位了。
   最省事的办法：直接重新加载页面。
   （以后可以做成更优雅的「原地重建」）
   ------------------------------------------------------------ */
let resizeTimer = null;

window.addEventListener('resize', function () {
  // 防抖：用户拖动窗口时会触发很多次，
  // 等他不拖了（200 毫秒）再执行，避免卡顿
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    // 如果场上已经有球了，就提示一下（重新加载会清空）
    if (balls.length > 0) {
      console.log('检测到窗口尺寸变化，如果你觉得画面错位了，请刷新页面（F5）');
    }
  }, 200);
});

/* ------------------------------------------------------------
   十九、等页面元素都准备好之后再启动
   ------------------------------------------------------------ */
if (document.readyState === 'loading') {
  // 页面还在加载，等它加载完
  document.addEventListener('DOMContentLoaded', init);
} else {
  // 页面已经加载完了，直接启动
  init();
}
