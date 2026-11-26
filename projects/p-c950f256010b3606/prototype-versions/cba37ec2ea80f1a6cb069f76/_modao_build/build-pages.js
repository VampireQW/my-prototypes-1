/* 把 index.html（单文件多视图原型）拆分为可导入墨刀的静态独立页面 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const OUT = path.join(__dirname, 'pages');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const src = fs.readFileSync(SRC, 'utf8');

/* ---------------- 工具 ---------------- */
function idx(s, a, from) { const i = s.indexOf(a, from || 0); if (i < 0) throw new Error('anchor not found: ' + a); return i; }
function slice(s, a, b) { const i = idx(s, a); const j = b ? idx(s, b, i) : s.length; return s.slice(i, j); }
function between(s, a, b) { const i = idx(s, a); const j = idx(s, b, i + a.length); return s.slice(i, j); }
function rep(s, a, b) { if (s.indexOf(a) < 0) throw new Error('replace target not found: ' + a); return s.split(a).join(b); }

/* ---------------- SVG 图标库（与原文件一致） ---------------- */
const ICON_PATHS = {
  screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4"/><path d="M8 7h2M8 11h2M14 7h2M14 11h2"/>',
  school: '<path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11.2V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.8"/><path d="M22 9v5"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4a3 3 0 0 1 6 0"/><path d="M8 11h8M8 15h5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6"/><path d="M17.6 14.4c2.3.8 3.9 2.7 3.9 5.6"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M18.8 5.2l-2 2M7.2 16.8l-2 2"/>',
  exam: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  book: '<path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0 2 2h14"/><path d="M8 7h8"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>',
  layers: '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  paper: '<path d="M6 2h9l5 5v15H6V2z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>',
  chartLine: '<path d="M3 20h18"/><path d="M4 16l5-6 4 3 6-8"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3v-6z"/><path d="M3 13h6a3 3 0 0 0 6 0h6"/>',
  download: '<path d="M12 3v11"/><path d="M6 10l6 6 6-6"/><path d="M4 21h16"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
  teach: '<circle cx="10" cy="7" r="3"/><path d="M3.5 21v-1.5A5.5 5.5 0 0 1 9 14h2a5.5 5.5 0 0 1 5.5 5.5V21"/><path d="M17 4.5v4M15 6.5h4"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/>',
  grip: '<circle cx="9" cy="5" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="5" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="19" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="19" r="1.3" fill="currentColor" stroke="none"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  sparkle: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8L12 3z"/><path d="M18.6 14.6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>'
};
function icon(name, size) {
  size = size || 16;
  return '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (ICON_PATHS[name] || '') + '</svg>';
}

/* ---------------- 导航数据（与原文件 DEFAULT_NAV 一致） ---------------- */
const DEFAULT_NAV = [
  { id: 'manage', name: '管理工作台', icon: 'settings', children: [
    { id: 'city-screen', name: '市级数据大屏', icon: 'screen', visible: true },
    { id: 'district-screen', name: '区级数据大屏', icon: 'screen', visible: true },
    { id: 'school-screen', name: '校级数据大屏', icon: 'screen', visible: true },
    { id: 'manage-home', name: '管理首页', icon: 'home', visible: true },
    { id: 'data-center', name: '数据中心', icon: 'database', visible: true },
    { id: 'city-manage', name: '市级管理', icon: 'building', visible: true },
    { id: 'district-manage', name: '区级管理', icon: 'building', visible: true },
    { id: 'school-manage', name: '校级管理', icon: 'school', visible: true },
    { id: 'edu-manage', name: '教务管理', icon: 'clipboard', visible: true },
    { id: 'class-manage', name: '班级管理', icon: 'users', visible: true },
    { id: 'self-manage', name: '自主管理', icon: 'edit', visible: true },
    { id: 'assistant', name: '授课助手设置', icon: 'gear', visible: true }
  ]},
  { id: 'app', name: '应用中心', icon: 'layers', children: [
    { id: 'exam', name: '考试', icon: 'exam', visible: true },
    { id: 'wrongbook', name: '错题本', icon: 'book', visible: true },
    { id: 'prepare', name: '备课资源', icon: 'folder', visible: true },
    { id: 'questionbank', name: '题库卷库', icon: 'layers', visible: true },
    { id: 'paperlib', name: '试卷库', icon: 'paper', visible: true },
    { id: 'analysis', name: '学情分析', icon: 'chartLine', visible: true },
    { id: 'teachresearch', name: '教研集备', icon: 'teach', visible: true },
    { id: 'collect', name: '征集中心', icon: 'inbox', visible: true },
    { id: 'appdownload', name: '应用下载', icon: 'download', visible: true },
    { id: 'editor', name: '直通编辑部', icon: 'send', visible: true }
  ]},
  { id: 'jiaxiang-zone', name: '嘉祥专区', icon: 'sparkle', children: [] },
  { id: 'jiaxiang-manage', name: '嘉祥管理', icon: 'building', children: [] },
  { id: 'privacy', name: '隐私空间', icon: 'lock', children: [] }
];

/* ---------------- 样式分块 ---------------- */
const styleText = slice(src, '<style>', '</style>').replace(/^<style>/, '');
const C = {
  base: slice(styleText, '', '/* ===== 顶部栏'),
  topbar: between(styleText, '/* ===== 顶部栏', '/* ===== 主区域'),
  main: between(styleText, '/* ===== 主区域', '/* ===== 数据大屏'),
  screen: between(styleText, '/* ===== 数据大屏', '/* ===== 左侧导航'),
  sidenav: between(styleText, '/* ===== 左侧导航', '/* ===== 自定义弹窗'),
  modalChunk: between(styleText, '/* ===== 自定义弹窗', '/* ===== 视图切换'),
  view: between(styleText, '/* ===== 视图切换', '/* ===== 备课工作室'),
  studio: between(styleText, '/* ===== 备课工作室', '/* ===== 未关联作业分析页'),
  assignmentChunk: between(styleText, '/* ===== 未关联作业分析页', '/* ===== 顶部备课工作室设置'),
  rangeChunk: between(styleText, '/* ===== 顶部备课工作室设置', '/* ===== 待处理任务弹窗'),
  task: between(styleText, '/* ===== 待处理任务弹窗', '/* ===== 右侧窄导航'),
  railnav: between(styleText, '/* ===== 右侧窄导航', '/* ===== 导航浮窗'),
  jiaxiang: between(styleText, '/* ===== 嘉祥专区', '/* Toast')
};
C.btnRules = slice(C.modalChunk, '.btn {');
C.modalPre = slice(C.modalChunk, '', '.btn {');
C.awRules = slice(C.assignmentChunk, '', '.link-modal-mask {');
C.linkRules = slice(C.assignmentChunk, '.link-modal-mask {');
C.gearRules = slice(C.rangeChunk, '', '.range-modal-mask {');
C.rangeRules = slice(C.rangeChunk, '.range-modal-mask {');

/* 顶部栏样式：剔除永不使用的消息浮窗/用户卡片规则 */
C.topbarTrim = slice(C.topbar, '', '.notice-pop {') + slice(C.topbar, '.user-chip {', '/* 用户悬浮卡片 */');

/* 剔除已确认一并删除 DOM 的规则 */
function dropRules(css, names) {
  names.forEach(function (n) {
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    css = css.replace(new RegExp(esc + '[^{}]*\\{[^{}]*\\}', 'g'), '');
  });
  return css;
}
C.awRules = dropRules(C.awRules, ['.class-menu', '.class-year-title', '.class-option', '.class-menu-line', '.class-tip', '.setting-pop', '.setting-row', '.sort-select', '.check-row', '.fake-check', '.card-empty', '.empty-img', '.inline-link', '.no-data', '.aw-alert-status', '.aw-select']);
function removeBalanced(css, anchor) {
  const i = css.indexOf(anchor);
  if (i < 0) return css;
  let depth = 0;
  let j = i;
  for (; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') { depth--; if (depth === 0) { j++; break; } }
  }
  return css.slice(0, i) + css.slice(j);
}
function cutDiv(html, anchor) {
  const i = html.indexOf(anchor);
  if (i < 0) throw new Error('cut target not found: ' + anchor);
  let depth = 0;
  let j = i;
  while (j < html.length) {
    if (html.startsWith('<div', j)) depth++;
    else if (html.startsWith('</div>', j)) { depth--; j += 6; if (depth === 0) return html.slice(0, i) + html.slice(j); continue; }
    j++;
  }
  throw new Error('unbalanced div: ' + anchor);
}
/* 作业页（课程内/未加入）不需要课件预览区样式 */
C.studioAw = dropRules(C.studio, ['.sm-pill', '.sm-new', '.sm-subbar', '.sm-actions', '.sm-crumb', '.sm-preview', '.cover', '.to-top', '.lesson-drop-ready', '.drop-success', '.sl-extra-pager', '.lesson-job-count']);
C.studioAw = removeBalanced(C.studioAw, '@keyframes lessonDropSuccess');

/* ---------------- 压缩 ---------------- */
function miniCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};>,])\s*/g, '$1')
    .replace(/:\s*/g, ':')
    .replace(/\s*\+\s*/g, '+')
    .replace(/;}/g, '}')
    .replace(/([\s:,(])0\./g, '$1.')
    .trim();
}
function miniHTML(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>[ \t\r\n]+</g, '><')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();
}

/* ---------------- 预烘焙组件 ---------------- */
function buildSideNav(activeId) {
  let html = '';
  DEFAULT_NAV.forEach(function (g) {
    const visible = g.children.filter(function (c) { return c.visible !== false; });
    const directActive = !g.children.length && activeId === g.id;
    html += '<div class="nav-group' + (directActive ? ' direct-active' : '') + '">' +
      '<div class="nav-group-hd" data-gid="' + g.id + '">' +
      '<span class="hd-ic">' + icon(g.icon, 17) + '</span>' +
      '<span class="hd-name">' + g.name + '</span>' +
      (g.children.length ? '<span class="arrow">' + icon('chevron', 14) + '</span>' : '') +
      '</div>';
    if (visible.length) {
      html += '<ul class="nav-sub">';
      visible.forEach(function (c) {
        html += '<li data-mid="' + c.id + '" class="' + (c.id === activeId ? 'active' : '') + '">' +
          '<span class="sub-ic">' + icon(c.icon, 15) + '</span><span>' + c.name + '</span></li>';
      });
      html += '</ul>';
    }
    html += '</div>';
  });
  return html;
}
function buildRail() {
  const QUICK = [
    { id: 'prepare', name: '备课资源', icon: 'folder' },
    { id: 'questionbank', name: '题库卷库', icon: 'layers' },
    { id: 'aihelper', name: 'AI助教', icon: 'sparkle' }
  ];
  let html = '<div class="rail-scroll">';
  QUICK.forEach(function (q) {
    html += '<div class="rail-item" data-quick="' + q.id + '"><span class="rail-ic">' + icon(q.icon, 18) + '</span><span>' + q.name + '</span></div>';
  });
  html += '<div class="rail-sep"></div>';
  ['privacy', 'manage', 'app', 'jiaxiang-zone', 'jiaxiang-manage'].forEach(function (id) {
    const g = DEFAULT_NAV.find(function (x) { return x.id === id; });
    if (g) html += '<div class="rail-item" data-gid="' + g.id + '"><span class="rail-ic">' + icon(g.icon, 18) + '</span><span>' + g.name + '</span></div>';
  });
  html += '</div>';
  return html;
}
function buildGroupList() {
  let html = '';
  DEFAULT_NAV.forEach(function (g) {
    const visibleCount = g.children.filter(function (c) { return c.visible !== false; }).length;
    html += '<li class="sort-item group-item' + (g.id === 'manage' ? ' selected' : '') + '">' +
      '<span class="sort-grip">' + icon('grip', 15) + '</span>' +
      '<span class="item-ic">' + icon(g.icon, 15) + '</span>' +
      '<span class="item-name">' + g.name + '</span>' +
      '<span class="item-badge">' + (g.children.length ? visibleCount + '/' + g.children.length : '直达') + '</span></li>';
  });
  return html;
}
function buildMenuList() {
  const g = DEFAULT_NAV[0];
  let html = '';
  g.children.forEach(function (c) {
    html += '<li class="sort-item menu-item">' +
      '<span class="sort-grip">' + icon('grip', 15) + '</span>' +
      '<span class="item-ic">' + icon(c.icon, 15) + '</span>' +
      '<span class="item-name">' + c.name + '</span>' +
      '<span class="switch on" title="显示 / 隐藏"></span></li>';
  });
  return html;
}
const TASK_ROWS = [
  ['数学填空拆题不拆图智批看原卷批阅痕迹', '6班-改', '1', '9', '2026-08-06 17:41'],
  ['2026年08月06日数学作业', '3班', '2', '10', '2026-08-06 16:40'],
  ['2026年08月05日数学作业', 'hr班', '3', '11', '2026-08-05 15:39'],
  ['是的法规', '2班', '1', '12', '2026-08-05 14:38'],
  ['2026年08月06日物理作业手写', '1班', '2', '13', '2026-08-04 13:37'],
  ['集合的概念课时练', '6班-改', '3', '14', '2026-08-04 17:36'],
  ['一元二次函数巩固', '3班', '1', '9', '2026-08-03 16:35'],
  ['函数的概念与性质小测', 'hr班', '2', '10', '2026-08-03 15:34'],
  ['数学填空拆题不拆图智批看原卷批阅痕迹（2）', '2班', '3', '11', '2026-08-02 14:33']
];
function buildTaskRows() {
  return TASK_ROWS.map(function (r) {
    return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td class="red">' + r[3] + '</td><td>' + r[4] + '</td><td><a>关联课时</a><a>答题卡设置</a></td></tr>';
  }).join('');
}

/* ---------------- 源 DOM 片段 ---------------- */
const topbarSrc = slice(src, '<!-- 顶部栏 -->', '</header>').replace(/^<!-- 顶部栏 -->/, '') + '</header>';
const studioViewSrc = slice(src, '<!-- 备课工作室视图（默认） -->', '<!-- 数据大屏视图 -->').replace(/^<!-- 备课工作室视图（默认） -->/, '');
const screenDashSrc = slice(src, '<section class="screen" id="screenDashboard">', '</section>') + '</section>';
const jxZoneSrc = slice(src, '<section class="jx-page" id="viewJiaxiangZone">', '</section>') + '</section>';
const jxManageSrc = slice(src, '<section class="jx-page" id="viewJiaxiangManage">', '</section>') + '</section>';
const sidenavSrc = slice(src, '<aside class="sidenav">', '</aside>') + '</aside>';
const railSrc = '<aside class="railnav" id="railNav"></aside>';
const courseWSSrc = slice(src, '<div class="studio-workspace" id="courseWorkspace">', '<div class="assignment-workspace" id="assignmentWorkspace">');
const awWSSrc = slice(src, '<div class="assignment-workspace" id="assignmentWorkspace">', '</section>');
const linkModalSrc = slice(src, '<div class="link-modal-mask" id="linkModalMask">', '<div class="link-success"');
const rangeModalSrc = slice(src, '<div class="range-modal-mask" id="rangeModalMask">', '<div class="task-mask"');
const taskModalSrc = slice(src, '<div class="task-mask" id="taskMask">', '<!-- 导航浮窗');
const modalMaskSrc = slice(src, '<div class="modal-mask" id="modalMask">', '<div class="toast"');

/* ---------------- 公共变换 ---------------- */
function fixTopbar(html, opt) {
  html = rep(html, noticeSlice(), '');
  html = rep(html, userCardSlice(), '');
  html = rep(html, '<img class="logo-img" src="file:///C:/Users/qky/AppData/Roaming/Qoder/SharedClientCache/cache/images/5d94cef1/zn6vfd1r-a2c92fe0.png" alt="度学 duxue.cn" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-flex\';">', '');
  html = rep(html, '<span class="duxue-word">', '<span class="duxue-word" style="display:inline-flex;">');
  html = rep(html, '<span class="link" id="bellBtn"></span>', '<span class="link bell-link" id="bellBtn">' + icon('bell', 17) + '<span class="bell-badge" id="bellBadge">3</span></span>');
  if (opt.mode === 'studio') {
    html = rep(html, '<span class="link" id="backStudio">返回备课工作室</span>', '<span class="link" id="backStudio" style="display:none;">返回备课工作室</span>');
    html = rep(html, '<div class="page-title" id="pageTitle">市级数据大屏</div>',
      '<div class="page-title" id="pageTitle"><span style="font-size:18px;color:#22315e;font-weight:700;">陈老师备课工作室</span><span id="studioTitleGear" class="studio-title-gear" title="数据范围设置">⚙</span></div>');
  } else {
    html = rep(html, '<div class="page-title" id="pageTitle">市级数据大屏</div>', '<div class="page-title" id="pageTitle">' + opt.title + '</div>');
  }
  return html;
}
function noticeSlice() { return slice(topbarSrc, '<!-- 消息中心浮窗 -->', '<!-- 用户悬浮卡片 -->'); }
function userCardSlice() { return slice(topbarSrc, '<!-- 用户悬浮卡片 -->', '</header>'); }

function hideExtraItems(html, visible) {
  let n = 0;
  return html.replace(/<div class="sl-extra-item"/g, function (m) {
    n++;
    if (n > visible) return '<div class="sl-extra-item" style="display:none"';
    return m;
  });
}
function activateFirstExtra(html) {
  return rep(html, '<div class="sl-extra-item" draggable="true" data-year="2025-2026" data-assignment="a1"', '<div class="sl-extra-item active" draggable="true" data-year="2025-2026" data-assignment="a1"');
}

/* 组装工作室主区（根据模式选择 course / assignment 内容） */
function buildStudioMain(inner) {
  return '<section class="studio-main">' + inner + '</section>';
}
function studioLeft(extraActive) {
  let left = slice(studioViewSrc, '<aside class="studio-left">', '</aside>') + '</aside>';
  left = hideExtraItems(left, 3);
  if (extraActive) left = activateFirstExtra(left);
  return left;
}
function setBlockTitles(leftHtml, panel) {
  leftHtml = rep(leftHtml, '<div class="sl-block-title active" data-panel="course">', '<div class="sl-block-title" data-panel="course">');
  if (panel === 'unlinked') leftHtml = rep(leftHtml, '<div class="sl-block-title" data-panel="unlinked">', '<div class="sl-block-title active" data-panel="unlinked">');
  else leftHtml = rep(leftHtml, '<div class="sl-block-title" data-panel="course">', '<div class="sl-block-title active" data-panel="course">');
  return leftHtml;
}

/* ---------------- 页面组装 ---------------- */
const pages = [];

function assemble(file, title, cssChunks, bodyInner) {
  const css = miniCSS(cssChunks.join('\n'));
  const body = miniHTML(bodyInner);
  const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + title + '</title><style>' + css + '</style></head><body>' + body + '</body></html>';
  if (html.indexOf('<script') >= 0) throw new Error('script leaked: ' + file);
  if (html.indexOf('file:///') >= 0) throw new Error('file ref leaked: ' + file);
  fs.writeFileSync(path.join(OUT, file), html);
  pages.push({ file: file, title: title, bytes: Buffer.byteLength(html, 'utf8'), css: Buffer.byteLength(css, 'utf8'), body: Buffer.byteLength(body, 'utf8') });
}

/* --- P1 备课工作室·课件预览 --- */
(function () {
  const left = setBlockTitles(studioLeft(false), 'course');
  const main = buildStudioMain(courseWSSrc);
  let view = '<div class="view view-studio" id="viewStudio">' + left + main + railSrc + '</div>';
  view = rep(view, '<aside class="railnav" id="railNav"></aside>', '<aside class="railnav" id="railNav">' + buildRail() + '</aside>');
  const top = fixTopbar(topbarSrc, { mode: 'studio' });
  const body = top + '<div class="main">' + view + '</div>';
  pages.length; // keep
  assemble('p1_studio_course.html', '度学 · 备课工作室（课件预览）', [C.base, C.topbarTrim, C.main, C.view, C.btnRules, C.gearRules, C.studio, C.railnav], body);
})();

/* --- P2 备课工作室·配套作业（课程内课时） --- */
(function () {
  const left = setBlockTitles(studioLeft(false), 'course');
  let aw = awWSSrc;
  aw = rep(aw, '<div class="assignment-workspace" id="assignmentWorkspace">', '<div class="assignment-workspace show" id="assignmentWorkspace">');
  aw = rep(aw, '<div class="aw-subtabs" id="courseAssignmentTabs">', '<div class="aw-subtabs" id="courseAssignmentTabs" style="display:flex;">');
  aw = rep(aw, '<span class="aw-drag-handle" id="awDragHandle" draggable="true" title="拖动到左侧目标课时">⠿</span>', '<span class="aw-drag-handle" id="awDragHandle" style="display:none;">⠿</span>');
  aw = rep(aw, '第五章　作业1　硫和二氧化硫　【配套作业】', '第五章 作业1 硫和二氧化硫　【配套作业】');
  aw = rep(aw, '<button class="btn primary sm">授课</button><button class="btn sm">对答案</button><button class="btn sm">下载</button>',
    '<button class="btn primary sm">授课</button><button class="btn sm">对答案</button><button class="btn sm">改编</button><button class="btn sm">分享</button><button class="btn sm">下载</button><span class="aw-more-wrap"><button class="btn sm" id="awMoreBtn">更多 ▾</button><span class="aw-more-pop" id="awMorePop"><span class="aw-more-item" data-act="modify">修改课程</span><span class="aw-more-item" data-act="unlink">移出课程</span><span class="aw-more-item" data-act="copy">复制</span></span></span>');
  aw = rep(aw, '<div class="aw-alert" id="linkStatus">', '<div class="aw-alert" id="linkStatus" style="display:none;">');
  aw = rep(aw, '<button class="btn sm icon-btn" id="awSetting" title="设置"></button>', '<button class="btn sm icon-btn" id="awSetting" title="设置">' + icon('settings', 14) + '</button>');
  aw = rep(aw, '<span class="detail-tab-icon"></span>', '<span class="detail-tab-icon">' + icon('clipboard', 14) + '</span>');
  aw = cutDiv(aw, '<div class="class-menu" id="classMenu">');
  aw = cutDiv(aw, '<div class="setting-pop" id="awSettingPop">');
  const main = buildStudioMain(aw);
  let view = '<div class="view view-studio" id="viewStudio">' + left + main + railSrc + '</div>';
  view = rep(view, '<aside class="railnav" id="railNav"></aside>', '<aside class="railnav" id="railNav">' + buildRail() + '</aside>');
  const top = fixTopbar(topbarSrc, { mode: 'studio' });
  assemble('p2_studio_assignment_course.html', '度学 · 配套作业（课程内）', [C.base, C.topbarTrim, C.main, C.view, C.btnRules, C.gearRules, C.studioAw, C.railnav, C.awRules], top + '<div class="main">' + view + '</div>');
})();

/* --- P3 备课工作室·配套作业（未加入课程作业） --- */
(function () {
  let left = setBlockTitles(studioLeft(true), 'unlinked');
  left = rep(left, '<div class="tree-row lesson active">', '<div class="tree-row lesson">');
  let aw = awWSSrc;
  aw = rep(aw, '<div class="assignment-workspace" id="assignmentWorkspace">', '<div class="assignment-workspace show" id="assignmentWorkspace">');
  aw = rep(aw, '<div class="sm-tabs aw-tabs">', '<div class="sm-tabs aw-tabs" style="display:none;">');
  aw = rep(aw, '第五章　作业1　硫和二氧化硫　【配套作业】', '第五章 作业3 第一节 课时3 不同价态含硫物质的转化　【配套作业】');
  aw = rep(aw, '<button class="btn sm icon-btn" id="awSetting" title="设置"></button>', '<button class="btn sm icon-btn" id="awSetting" title="设置">' + icon('settings', 14) + '</button>');
  aw = rep(aw, '<span class="detail-tab-icon"></span>', '<span class="detail-tab-icon">' + icon('clipboard', 14) + '</span>');
  aw = cutDiv(aw, '<div class="class-menu" id="classMenu">');
  aw = cutDiv(aw, '<div class="setting-pop" id="awSettingPop">');
  const main = buildStudioMain(aw);
  let view = '<div class="view view-studio" id="viewStudio">' + left + main + railSrc + '</div>';
  view = rep(view, '<aside class="railnav" id="railNav"></aside>', '<aside class="railnav" id="railNav">' + buildRail() + '</aside>');
  const top = fixTopbar(topbarSrc, { mode: 'studio' });
  assemble('p3_studio_assignment_unlinked.html', '度学 · 配套作业（未加入课程）', [C.base, C.topbarTrim, C.main, C.view, C.btnRules, C.gearRules, C.studioAw, C.railnav, C.awRules], top + '<div class="main">' + view + '</div>');
})();

/* --- P4 市级数据大屏 --- */
(function () {
  let sn = sidenavSrc;
  sn = rep(sn, '<button class="nav-setting" id="btnCustomize" title="自定义导航"></button>', '<button class="nav-setting" id="btnCustomize" title="自定义导航">' + icon('gear', 12) + '</button>');
  sn = rep(sn, '<div class="nav-scroll" id="navList"></div>', '<div class="nav-scroll" id="navList">' + buildSideNav('city-screen') + '</div>');
  let dash = screenDashSrc;
  dash = rep(dash, '<span class="stab icon-only" id="screenGear"></span>', '<span class="stab icon-only" id="screenGear">' + icon('settings', 13) + '</span>');
  const view = '<div class="view" id="viewScreen" style="display:flex;">' + dash + sn + '</div>';
  const top = fixTopbar(topbarSrc, { mode: 'screen', title: '市级数据大屏' });
  assemble('p4_screen_city.html', '度学 · 市级数据大屏', [C.base, C.topbarTrim, C.main, C.view, C.btnRules, C.screen, C.sidenav], top + '<div class="main">' + view + '</div>');
})();

/* --- P5 / P6 嘉祥专区 / 嘉祥管理 --- */
[['p5_jiaxiang_zone.html', '度学 · 嘉祥专区', '嘉祥专区', 'jiaxiang-zone', jxZoneSrc],
 ['p6_jiaxiang_manage.html', '度学 · 嘉祥管理', '嘉祥管理', 'jiaxiang-manage', jxManageSrc]].forEach(function (cfg) {
  let sn = sidenavSrc;
  sn = rep(sn, '<button class="nav-setting" id="btnCustomize" title="自定义导航"></button>', '<button class="nav-setting" id="btnCustomize" title="自定义导航">' + icon('gear', 12) + '</button>');
  sn = rep(sn, '<div class="nav-scroll" id="navList"></div>', '<div class="nav-scroll" id="navList">' + buildSideNav(cfg[3]) + '</div>');
  let sec = cfg[4];
  sec = rep(sec, '<section class="jx-page" id="' + (cfg[3] === 'jiaxiang-zone' ? 'viewJiaxiangZone' : 'viewJiaxiangManage') + '">',
    '<section class="jx-page" id="' + (cfg[3] === 'jiaxiang-zone' ? 'viewJiaxiangZone' : 'viewJiaxiangManage') + '" style="display:flex;">');
  const view = '<div class="view" id="viewScreen" style="display:flex;">' + sec + sn + '</div>';
  const top = fixTopbar(topbarSrc, { mode: 'screen', title: cfg[2] });
  assemble(cfg[0], cfg[1], [C.base, C.topbarTrim, C.main, C.view, C.btnRules, C.sidenav, C.jiaxiang], top + '<div class="main">' + view + '</div>');
});

/* --- P7 导航自定义弹窗（组件页：顶栏 + 弹窗） --- */
(function () {
  const top = fixTopbar(topbarSrc, { mode: 'screen', title: '市级数据大屏' });
  let mm = modalMaskSrc;
  mm = rep(mm, '<div class="modal-mask" id="modalMask">', '<div class="modal-mask show" id="modalMask">');
  mm = rep(mm, '<button class="modal-close" id="modalClose"></button>', '<button class="modal-close" id="modalClose">' + icon('x', 16) + '</button>');
  mm = rep(mm, '<div class="modal-tip" id="modalTip"></div>', '<div class="modal-tip" id="modalTip">' + icon('grip', 13) + '<span>拖拽 <b>左侧一级导航</b> 可调整分组顺序；拖拽 <b>右侧菜单项</b> 可调整组内顺序；关闭开关后该菜单不在导航中显示，调整后点击「确定」生效。</span></div>');
  mm = rep(mm, '<ul class="sort-list" id="groupList"></ul>', '<ul class="sort-list" id="groupList">' + buildGroupList() + '</ul>');
  mm = rep(mm, '<ul class="sort-list" id="menuList"></ul>', '<ul class="sort-list" id="menuList">' + buildMenuList() + '</ul>');
  mm = rep(mm, '<b>「<span id="curGroupName"></span>」菜单</b>', '<b>「<span id="curGroupName">管理工作台</span>」菜单</b>');
  mm = rep(mm, '<span id="menuCount"></span>', '<span id="menuCount">显示 12 / 共 12 项 · 拖拽排序</span>');
  assemble('p7_modal_nav.html', '度学 · 导航自定义弹窗', [C.base, C.topbarTrim, C.btnRules, C.modalPre], top + mm);
})();

/* --- P8 加入课程弹窗（组件页：顶栏 + 弹窗） --- */
(function () {
  const top = fixTopbar(topbarSrc, { mode: 'studio' });
  let lm = linkModalSrc;
  lm = rep(lm, '<div class="link-modal-mask" id="linkModalMask">', '<div class="link-modal-mask show" id="linkModalMask">');
  assemble('p8_modal_link.html', '度学 · 加入课程弹窗', [C.base, C.topbarTrim, C.btnRules, C.linkRules], top + lm);
})();

/* --- P9 数据范围设置弹窗（组件页：顶栏 + 弹窗） --- */
(function () {
  const top = fixTopbar(topbarSrc, { mode: 'studio' });
  let rm = rangeModalSrc;
  rm = rep(rm, '<div class="range-modal-mask" id="rangeModalMask">', '<div class="range-modal-mask show" id="rangeModalMask">');
  assemble('p9_modal_range.html', '度学 · 数据范围设置弹窗', [C.base, C.topbarTrim, C.btnRules, C.gearRules, C.rangeRules], top + rm);
})();

/* --- P10 待处理任务弹窗（组件页：顶栏 + 弹窗） --- */
(function () {
  const top = fixTopbar(topbarSrc, { mode: 'studio' });
  let tm = taskModalSrc;
  tm = rep(tm, '<div class="task-mask" id="taskMask">', '<div class="task-mask show" id="taskMask">');
  tm = rep(tm, '<tbody id="taskTbody"></tbody>', '<tbody id="taskTbody">' + buildTaskRows() + '</tbody>');
  assemble('p10_modal_task.html', '度学 · 待处理任务弹窗', [C.base, C.topbarTrim, C.btnRules, C.gearRules, C.task], top + tm);
})();

/* ---------------- 报告 ---------------- */
console.log('CSS chunks:', Object.keys(C).map(function (k) { return k + '=' + C[k].length; }).join(' '));
let total = 0;
pages.forEach(function (p) { total += p.bytes; console.log(p.file.padEnd(36), 'total=' + p.bytes, 'css=' + p.css, 'body=' + p.body); });
console.log('PAGES=' + pages.length + ' TOTAL_BYTES=' + total);
