/* ============================================================
   批量设置智批分值 —— 交互逻辑
   数据模型：question.set = { mode:'blank'|'sub', parts:[{name,score}] }
   题目均为主观题（解答题）
   ============================================================ */
(function () {
  'use strict';

  var TYPE = {
    answer: { label: '解答题', short: '解答' }
  };

  /* 已设置的分值结构：
     mode='sub'   按小问：parts=[{name:'(1) 问', blanks:[{name:'空1', score}]}]，问分 = 组内空分之和
     mode='blank' 按小空：parts=[{name:'空1', score}] */
  function subSet(scores) {
    return {
      mode: 'sub',
      parts: scores.map(function (s, i) {
        return { name: '(' + (i + 1) + ') 问', blanks: [{ name: '空1', score: s }] };
      })
    };
  }

  var QUESTIONS = [
    { no: 1,  type: 'answer', full: 6,  set: subSet([3, 3]) },
    { no: 2,  type: 'answer', full: 6,  set: subSet([3, 3]) },
    { no: 3,  type: 'answer', full: 6,  set: subSet([2, 2, 2]) },
    { no: 4,  type: 'answer', full: 6 },
    { no: 5,  type: 'answer', full: 6,  set: subSet([3, 3]) },
    { no: 6,  type: 'answer', full: 6 },
    { no: 7,  type: 'answer', full: 7 },
    { no: 8,  type: 'answer', full: 7,  set: subSet([3, 4]) },
    { no: 9,  type: 'answer', full: 6 },
    { no: 10, type: 'answer', full: 6 },
    { no: 11, type: 'answer', full: 8,  set: subSet([2, 2, 2, 2]) },
    { no: 12, type: 'answer', full: 10, set: subSet([4, 6]) }
  ];

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var current = 1;
  var draft = null;
  var dirty = false;
  var zoom = 1;

  var mask = $('#modalMask');
  var panelForm = $('#panelForm');
  var chipsBox = $('#chips');
  var stage = $('#stage');
  var cardImg = $('#cardImg');
  var toastEl = $('#toast');

  /* 答题卡图片（需多页时在 PAGES 中追加一项） */
  var PAGES = [
    { src: 'assets/answer-card-p1.png', alt: '答题卡 第 1 页' }
  ];
  var pageIdx = 0;
  var fitMode = false;

  /* ---------------- 基础工具 ---------------- */
  function qOf(no) {
    for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].no === no) return QUESTIONS[i];
    return null;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toNum(v) {
    var n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  function round1(n) { return Math.round(n * 10) / 10; }
  function sumScore(parts) {
    return round1(parts.reduce(function (s, p) { return s + toNum(p.score); }, 0));
  }
  function partTotal(p) { return p.blanks ? sumScore(p.blanks) : toNum(p.score); }
  function totalOf(parts) {
    return round1(parts.reduce(function (s, p) { return s + partTotal(p); }, 0));
  }
  function blankCount(parts) {
    return parts.reduce(function (s, p) { return s + (p.blanks ? p.blanks.length : 0); }, 0);
  }
  function uniformScore(list) {
    if (!list.length) return '';
    var first = toNum(list[0].score);
    return list.every(function (x) { return toNum(x.score) === first; }) ? list[0].score : '';
  }
  function unitOf(mode) { return mode === 'sub' ? '问' : '空'; }
  function nameOf(mode, i) { return mode === 'sub' ? '(' + (i + 1) + ') 问' : '空' + (i + 1); }

  function isSet(q) { return !!q.set; }
  function setCount() { return QUESTIONS.filter(isSet).length; }
  function setScore() {
    return QUESTIONS.reduce(function (s, q) { return s + (q.set ? q.full : 0); }, 0);
  }

  function defaultDraft(q) {
    return {
      mode: 'sub',
      parts: [{ name: '(1) 问', blanks: [{ name: '空1', score: q.full }] }]
    };
  }

  function statusOf(q) {
    return q.set ? { key: 'set', text: '已设置' } : { key: 'unset', text: '未设置' };
  }

  function summaryOf(q) {
    if (!q.set) return '未设置智批分值';
    var blanks = blankCount(q.set.parts);
    return q.set.parts.length + ' ' + unitOf(q.set.mode) +
      (q.set.mode === 'sub' && blanks ? ' · ' + blanks + ' 空' : '') +
      ' · 合计 ' + totalOf(q.set.parts) + ' 分';
  }

  var toastTimer = null;
  function toast(msg, kind) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show' + (kind === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.className = 'toast' + (kind === 'error' ? ' error' : '');
    }, 2600);
  }

  /* ---------------- 二次确认 ---------------- */
  var cfResolve = null;
  function confirmBox(title, text, okText) {
    $('#cfTitle').textContent = title;
    $('#cfText').textContent = text;
    $('#cfYes').textContent = okText || '放弃修改';
    $('#confirmMask').classList.add('show');
    return new Promise(function (resolve) { cfResolve = resolve; });
  }
  function closeConfirm(val) {
    $('#confirmMask').classList.remove('show');
    if (cfResolve) { cfResolve(val); cfResolve = null; }
  }
  $('#cfYes').addEventListener('click', function () { closeConfirm(true); });
  $('#cfNo').addEventListener('click', function () { closeConfirm(false); });
  $('#confirmMask').addEventListener('click', function (e) {
    if (e.target === this) closeConfirm(false);
  });

  function guard(fn) {
    if (!dirty) { fn(); return; }
    confirmBox('当前题有未保存的修改', '题号 ' + current + ' 的分值已改动，继续操作将丢弃这些改动。', '放弃并继续')
      .then(function (ok) { if (ok) { dirty = false; fn(); } });
  }

  /* ---------------- 渲染：题号胶囊 ---------------- */
  function renderChips() {
    $$('.chip', chipsBox).forEach(function (el) {
      var no = parseInt(el.getAttribute('data-no'), 10);
      var q = qOf(no);
      if (!q) return;
      var st = statusOf(q);
      el.className = 'chip ' + st.key + (no === current ? ' is-current' : '');
      el.title = '题号 ' + no + ' · ' + TYPE[q.type].label + ' · 满分 ' + q.full + ' 分 · ' + st.text;
      var stText = $('.chip-st', el);
      if (stText) stText.textContent = st.text;
      var dot = el.querySelector('.dirty-dot');
      if (no === current && dirty) {
        if (!dot) {
          var i = document.createElement('i');
          i.className = 'dirty-dot';
          el.appendChild(i);
        }
      } else if (dot) {
        dot.parentNode.removeChild(dot);
      }
    });
  }

  /* ---------------- 渲染：答题卡（仅图片，无热区） ---------------- */
  function renderPager() {
    var n = PAGES.length;
    $('#pageInd').textContent = (pageIdx + 1) + ' / ' + n;
    $('#pagePrev').disabled = pageIdx <= 0;
    $('#pageNext').disabled = pageIdx >= n - 1;
    cardImg.src = PAGES[pageIdx].src;
    cardImg.alt = PAGES[pageIdx].alt;
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  }

  function turnPage(dir) {
    var next = pageIdx + dir;
    if (next < 0 || next >= PAGES.length) return;
    pageIdx = next;
    renderPager();
  }

  /* ---------------- 渲染：右侧表单 ---------------- */
  var TRASH = '<svg viewBox="0 0 16 16"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.2h5.8l.6-8.2M6.7 7v3.6M9.3 7v3.6"/></svg>';

  function tplBlankRow(qi, b, j) {
    return '<div class="blank-row">' +
      '<input class="blank-name" data-q="' + qi + '" data-b="' + j + '" value="' + b.name + '" aria-label="空名称">' +
      '<input class="num blank-score" data-q="' + qi + '" data-b="' + j + '" value="' + b.score + '" aria-label="' + b.name + '分值">' +
      '<span class="unit">分</span>' +
      '<button type="button" class="icon-x" data-act="del-b" data-q="' + qi + '" data-b="' + j + '" title="删除该空" aria-label="删除该空">×</button>' +
    '</div>';
  }

  function tplParts() {
    if (draft.mode === 'blank') {
      return draft.parts.map(function (p, i) {
        return '<div class="part-row">' +
          '<input class="part-name" data-idx="' + i + '" value="' + p.name + '" aria-label="空名称">' +
          '<input class="num part-score" data-idx="' + i + '" value="' + p.score + '" aria-label="' + p.name + '分值">' +
          '<span class="unit">分</span>' +
          '<button type="button" class="icon-del" data-act="del" data-idx="' + i + '"' +
            (draft.parts.length <= 1 ? ' disabled' : '') + ' title="删除该空" aria-label="删除">' + TRASH +
          '</button>' +
        '</div>';
      }).join('');
    }
    return draft.parts.map(function (p, i) {
      var per = uniformScore(p.blanks);
      return '<div class="qblock">' +
        '<div class="qb-hd">' +
          '<input class="part-name" data-idx="' + i + '" value="' + p.name + '" aria-label="问名称">' +
          '<input class="num part-total" value="' + sumScore(p.blanks) + '" readonly aria-label="' + p.name + '合计分值">' +
          '<span class="unit">分</span>' +
          '<span class="qb-sep"></span>' +
          '<span class="qb-k">共</span>' +
          '<input class="num qb-count" data-idx="' + i + '" value="' + p.blanks.length + '" aria-label="' + p.name + '空数">' +
          '<span class="qb-k">空，每空</span>' +
          '<input class="num qb-per" data-idx="' + i + '" value="' + per + '" placeholder="—" aria-label="' + p.name + '每空分值">' +
          '<span class="unit">分</span>' +
          '<button type="button" class="icon-del qb-del" data-act="del-q" data-idx="' + i + '"' +
            (draft.parts.length <= 1 ? ' disabled' : '') + ' title="删除该问" aria-label="删除该问">' + TRASH +
          '</button>' +
        '</div>' +
        '<div class="qb-body">' +
          p.blanks.map(function (b, j) { return tplBlankRow(i, b, j); }).join('') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderForm() {
    var q = qOf(current);
    var unit = unitOf(draft.mode);

    $('#qMetaTitle').textContent = TYPE[q.type].label + ' · 满分 ' + q.full + ' 分';

    $$('input[name="jbMode"]', panelForm).forEach(function (r) { r.checked = (r.value === draft.mode); });

    $('#partTip').textContent = draft.mode === 'sub'
      ? '先定问数，再逐问、逐空微调'
      : '先定空数，再逐项微调';
    $('#unitWord').textContent = unit + '，每' + unit;
    $('[data-field="count"]', panelForm).value = draft.parts.length;
    $('[data-field="count"]', panelForm).setAttribute('aria-label', unit + '数');
    var per = $('[data-field="per"]', panelForm);
    var uniform = draft.mode === 'sub'
      ? uniformScore(draft.parts.map(function (p) { return { score: sumScore(p.blanks) }; }))
      : uniformScore(draft.parts);
    per.value = uniform;
    per.placeholder = uniform === '' ? '—' : '0';
    per.setAttribute('aria-label', '每' + unit + '分值');
    $('#btnAddPart').textContent = '＋ 添加一' + unit;
    $('#partList').innerHTML = tplParts();

    var total = totalOf(draft.parts);
    var diff = round1(q.full - total);
    $('#sumVal').textContent = total;
    var tag = $('#sumTag');
    if (Math.abs(diff) < 1e-6) {
      tag.className = 'ok';
      tag.textContent = '与满分一致';
    } else {
      tag.className = 'bad';
      tag.textContent = diff > 0
        ? '满分 ' + q.full + ' 分，还差 ' + diff + ' 分'
        : '超出满分 ' + q.full + ' 分共 ' + Math.abs(diff) + ' 分';
    }
    panelForm.scrollTop = 0;
  }

  /* ---------------- 渲染：汇总 ---------------- */
  function renderSummary() {
    var n = setCount();
    var total = setScore();
    $('#batchBadge').textContent = n + '/' + QUESTIONS.length;
    $('#hdChip').textContent = '已设置 ' + n + ' / ' + QUESTIONS.length;
    $('#psSub').textContent = '已设置 ' + n + ' / ' + QUESTIONS.length + ' 题';
    $('#ftText').innerHTML = '已设置 ' + n + ' / ' + QUESTIONS.length + ' 题' +
      '<span class="sep">·</span>合计 ' + total + ' 分';
    $('#barFill').style.width = Math.round(n / QUESTIONS.length * 100) + '%';
  }

  function renderPage() {
    var q1 = qOf(1);
    $('#jbPill').textContent = TYPE[q1.type].label + ' · ' + summaryOf(q1);
  }

  function renderAll() {
    renderChips();
    renderForm();
    renderSummary();
    renderPage();
  }

  function markDirty() {
    if (!dirty) {
      dirty = true;
      var chip = chipsBox.querySelector('.chip[data-no="' + current + '"]');
      if (chip && !chip.querySelector('.dirty-dot')) {
        var i = document.createElement('i');
        i.className = 'dirty-dot';
        chip.appendChild(i);
      }
    }
  }

  /* ---------------- 表单内部更新 ---------------- */
  function refreshTotals() {
    var q = qOf(current);
    if (!draft) return;

    if (draft.mode === 'sub') {
      $$('.qblock', panelForm).forEach(function (blk, i) {
        var p = draft.parts[i];
        if (!p) return;
        var tot = blk.querySelector('.part-total');
        if (tot) tot.value = sumScore(p.blanks);
        var per = blk.querySelector('.qb-per');
        if (per) {
          var u = uniformScore(p.blanks);
          per.value = u;
          per.placeholder = u === '' ? '—' : '0';
        }
      });
    }

    var total = totalOf(draft.parts);
    var diff = round1(q.full - total);
    var sumVal = $('#sumVal');
    if (!sumVal) return;
    sumVal.textContent = total;
    var tag = $('#sumTag') || sumVal.parentElement.querySelector('.ok, .bad');
    if (tag) {
      if (Math.abs(diff) < 1e-6) {
        tag.className = 'ok';
        tag.textContent = '与满分一致';
      } else {
        tag.className = 'bad';
        tag.textContent = diff > 0
          ? '满分 ' + q.full + ' 分，还差 ' + diff + ' 分'
          : '超出满分 ' + q.full + ' 分共 ' + Math.abs(diff) + ' 分';
      }
    }

    var perTop = panelForm.querySelector('[data-field="per"]');
    if (perTop) {
      var uniform = draft.mode === 'sub'
        ? uniformScore(draft.parts.map(function (p) { return { score: sumScore(p.blanks) }; }))
        : uniformScore(draft.parts);
      perTop.value = uniform;
      perTop.placeholder = uniform === '' ? '—' : '0';
    }
  }

  function renumber() {
    draft.parts.forEach(function (p, i) {
      p.name = nameOf(draft.mode, i);
      if (p.blanks) p.blanks.forEach(function (b, j) { b.name = '空' + (j + 1); });
    });
  }

  function emptyPart() {
    var remain = round1(qOf(current).full - totalOf(draft.parts));
    var score = remain > 0 ? remain : 0;
    return draft.mode === 'sub'
      ? { name: '', blanks: [{ name: '', score: score }] }
      : { name: '', score: score };
  }

  function resizeParts(count) {
    count = Math.max(1, Math.min(20, Math.round(toNum(count)) || 1));
    if (count > draft.parts.length) {
      for (var i = draft.parts.length; i < count; i++) draft.parts.push(emptyPart());
    } else {
      draft.parts.length = count;
    }
    renumber();
    renderForm();
  }

  function resizeBlanks(qi, count) {
    var p = draft.parts[qi];
    if (!p || !p.blanks) return;
    count = Math.max(0, Math.min(20, Math.round(toNum(count)) || 0));
    if (count > p.blanks.length) {
      for (var i = p.blanks.length; i < count; i++) p.blanks.push({ name: '', score: 0 });
    } else {
      p.blanks.length = count;
    }
    renumber();
    renderForm();
  }

  function setMode(next) {
    if (next === draft.mode) return;
    if (next === 'blank') {
      // 按小问 -> 按小空：每个问的合计变成一个可给分的空
      draft.parts = draft.parts.map(function (p) { return { name: '', score: sumScore(p.blanks) }; });
    } else {
      // 按小空 -> 按小问：每个空变成一个问，问内 1 空
      draft.parts = draft.parts.map(function (p) { return { name: '', blanks: [{ name: '', score: toNum(p.score) }] }; });
    }
    draft.mode = next;
    renumber();
    renderForm();
    markDirty();
  }

  /* ---------------- 表单事件 ---------------- */
  panelForm.addEventListener('input', function (e) {
    var t = e.target;
    if (!draft) return;

    if (t.matches('.blank-score') || t.matches('.blank-name')) {
      var qi = parseInt(t.getAttribute('data-q'), 10);
      var bi = parseInt(t.getAttribute('data-b'), 10);
      var part = draft.parts[qi];
      if (!part || !part.blanks || !part.blanks[bi]) return;
      if (t.matches('.blank-score')) {
        part.blanks[bi].score = toNum(t.value);
        refreshTotals();
      } else {
        part.blanks[bi].name = t.value;
      }
      markDirty();
      return;
    }

    if (t.matches('.qb-per')) {
      if (t.value === '') return;
      var pi = parseInt(t.getAttribute('data-idx'), 10);
      var p = draft.parts[pi];
      if (!p || !p.blanks) return;
      var pv = toNum(t.value);
      p.blanks.forEach(function (b) { b.score = pv; });
      var blk = t.closest('.qblock');
      if (blk) $$('.blank-score', blk).forEach(function (el) { el.value = pv; });
      refreshTotals();
      markDirty();
      return;
    }

    if (t.matches('.part-score')) {
      var i1 = parseInt(t.getAttribute('data-idx'), 10);
      if (!draft.parts[i1]) return;
      draft.parts[i1].score = toNum(t.value);
      refreshTotals();
      markDirty();
      return;
    }

    if (t.matches('.part-name')) {
      var i2 = parseInt(t.getAttribute('data-idx'), 10);
      if (!draft.parts[i2]) return;
      draft.parts[i2].name = t.value;
      markDirty();
      return;
    }

    if (t.matches('[data-field="per"]')) {
      if (t.value === '') return;
      var v = toNum(t.value);
      if (draft.mode === 'sub') {
        draft.parts.forEach(function (p) {
          var n = p.blanks.length;
          if (!n) return;
          var base = Math.floor(v / n);
          var rest = round1(v - base * n);
          p.blanks.forEach(function (b, k) { b.score = round1(base + (k < Math.round(rest) ? 1 : 0)); });
        });
        $$('.qblock', panelForm).forEach(function (blk, i) {
          var p = draft.parts[i];
          if (!p) return;
          $$('.blank-score', blk).forEach(function (el, j) {
            if (p.blanks[j]) el.value = p.blanks[j].score;
          });
        });
      } else {
        draft.parts.forEach(function (p) { p.score = v; });
        $$('.part-score', panelForm).forEach(function (el) { el.value = v; });
      }
      refreshTotals();
      markDirty();
      return;
    }

    if (t.matches('[data-field="count"]') || t.matches('.qb-count')) return;
  });

  panelForm.addEventListener('change', function (e) {
    var t = e.target;
    if (!draft) return;

    if (t.matches('[data-field="count"]')) {
      resizeParts(t.value);
      markDirty();
      return;
    }
    if (t.matches('.qb-count')) {
      resizeBlanks(parseInt(t.getAttribute('data-idx'), 10), t.value);
      markDirty();
      return;
    }
    if (t.matches('input[name="jbMode"]')) {
      setMode(t.value);
    }
  });

  panelForm.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');

    if (act === 'add') {
      draft.parts.push(emptyPart());
      renumber();
      renderForm();
      markDirty();
      return;
    }
    if (act === 'del') {
      var idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (draft.parts.length <= 1) return;
      draft.parts.splice(idx, 1);
      renumber();
      renderForm();
      markDirty();
      return;
    }
    if (act === 'del-q') {
      var qidx = parseInt(btn.getAttribute('data-idx'), 10);
      if (draft.parts.length <= 1) return;
      draft.parts.splice(qidx, 1);
      renumber();
      renderForm();
      markDirty();
      return;
    }
    if (act === 'del-b') {
      var qi2 = parseInt(btn.getAttribute('data-q'), 10);
      var bi2 = parseInt(btn.getAttribute('data-b'), 10);
      var part2 = draft.parts[qi2];
      if (!part2 || !part2.blanks) return;
      part2.blanks.splice(bi2, 1);
      renumber();
      renderForm();
      markDirty();
      return;
    }
  });

  /* ---------------- 校验与保存 ---------------- */
  function validate() {
    var q = qOf(current);
    var unit = unitOf(draft.mode);
    if (!draft.parts.length) return '至少需要 1 个' + unit;

    if (draft.mode === 'sub') {
      for (var i = 0; i < draft.parts.length; i++) {
        var p = draft.parts[i];
        if (!String(p.name).trim()) return '有问名称为空，请补全';
        if (!p.blanks || !p.blanks.length) return p.name + ' 还没有设置空，请补充';
        for (var j = 0; j < p.blanks.length; j++) {
          if (!String(p.blanks[j].name).trim()) return p.name + ' 有空名称为空，请补全';
        }
      }
    } else {
      var bad = draft.parts.filter(function (p) { return !String(p.name).trim(); });
      if (bad.length) return '有' + unit + '名称为空，请补全';
    }

    var total = totalOf(draft.parts);
    if (Math.abs(round1(q.full - total)) > 1e-6) {
      return '分值合计 ' + total + ' 分，与满分 ' + q.full + ' 分不一致';
    }
    return null;
  }

  function commit() {
    var q = qOf(current);
    q.set = clone(draft);
    dirty = false;
    renderAll();
  }

  function nextNo(from) {
    var i = QUESTIONS.findIndex(function (q) { return q.no === from; });
    for (var k = 1; k <= QUESTIONS.length; k++) {
      var q = QUESTIONS[(i + k) % QUESTIONS.length];
      if (!q.set) return q.no;
    }
    for (var j = 1; j <= QUESTIONS.length; j++) {
      var q2 = QUESTIONS[(i + j) % QUESTIONS.length];
      if (q2.no !== from) return q2.no;
    }
    return from;
  }

  function save(goNext) {
    var err = validate();
    if (err) { toast(err, 'error'); return; }
    var q = qOf(current);
    commit();
    toast('题号 ' + q.no + ' 已保存 · ' + summaryOf(q));
    if (goNext) {
      var allDone = !QUESTIONS.some(function (x) { return !x.set; });
      if (allDone) {
        toast('12 道题的智批分值已全部设置完成');
        setTimeout(closeModal, 320);
        return;
      }
      switchTo(nextNo(current));
    }
  }

  /* ---------------- 切换题目 ---------------- */
  function switchTo(no) {
    var q = qOf(no);
    if (!q) return;
    current = parseInt(no, 10);
    draft = q.set ? clone(q.set) : defaultDraft(q);
    if (!draft.parts) draft.parts = [];
    dirty = false;
    renderAll();
  }

  chipsBox.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    var no = parseInt(chip.getAttribute('data-no'), 10);
    if (no === current) return;
    guard(function () { switchTo(no); });
  });

  /* ---------------- 弹窗开关 ---------------- */
  function openModal(no) {
    mask.classList.add('show');
    mask.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var firstUnset = QUESTIONS.filter(function (q) { return !q.set; })[0];
    switchTo(no || (firstUnset ? firstUnset.no : 1));
  }

  function closeModal() {
    if (dirty) {
      confirmBox('当前题有未保存的修改', '关闭弹窗后，题号 ' + current + ' 的改动将不会保存。', '放弃并关闭')
        .then(function (ok) { if (ok) { dirty = false; doClose(); } });
      return;
    }
    doClose();
  }

  function doClose() {
    mask.classList.remove('show');
    mask.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    renderPage();
  }

  /* ---------------- 缩放 ---------------- */
  function applyZoom(z) {
    zoom = Math.min(3, Math.max(0.5, Math.round(z * 100) / 100));
    cardImg.style.width = (zoom * 100) + '%';
    $('#zoomVal').textContent = Math.round(zoom * 100) + '%';
  }

  function fitZoom() {
    var w = stage.clientWidth - 24;
    var h = stage.clientHeight - 24;
    var nw = cardImg.naturalWidth || 1341;
    var nh = cardImg.naturalHeight || 2000;
    if (w <= 0 || h <= 0) { applyZoom(1); return; }
    applyZoom(Math.min(1, h / (w * nh / nw)) * 0.985);
    fitMode = true;
  }

  /* ---------------- 绑定 ---------------- */
  $('#btnBatch').addEventListener('click', function () { openModal(); });
  $('#jbEdit').addEventListener('click', function () { openModal(1); });
  $('#btnClose').addEventListener('click', closeModal);
  $('#btnCancel').addEventListener('click', closeModal);
  $('#btnSave').addEventListener('click', function () { save(false); });
  $('#btnSaveNext').addEventListener('click', function () { save(true); });
  $('#pagePrev').addEventListener('click', function () { turnPage(-1); });
  $('#pageNext').addEventListener('click', function () { turnPage(1); });
  $('#zoomIn').addEventListener('click', function () { fitMode = false; applyZoom(zoom + 0.25); });
  $('#zoomOut').addEventListener('click', function () { fitMode = false; applyZoom(zoom - 0.25); });
  $('#zoomFit').addEventListener('click', fitZoom);

  /* ---------------- 设置说明 ---------------- */
  var helpBtn = $('#helpBtn');
  var helpPop = $('#helpPop');
  function toggleHelp(open) {
    var show = typeof open === 'boolean' ? open : helpPop.hasAttribute('hidden');
    if (show) helpPop.removeAttribute('hidden');
    else helpPop.setAttribute('hidden', '');
    helpBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
  }
  helpBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleHelp(); });
  helpPop.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', function () { toggleHelp(false); });

  mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!helpPop.hasAttribute('hidden')) { toggleHelp(false); return; }
      if ($('#confirmMask').classList.contains('show')) { closeConfirm(false); return; }
      if (mask.classList.contains('show')) closeModal();
    }
    if (!mask.classList.contains('show')) return;
    if ((e.altKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      var idx = QUESTIONS.findIndex(function (q) { return q.no === current; });
      var next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
      if (next >= 0 && next < QUESTIONS.length) {
        guard(function () { switchTo(QUESTIONS[next].no); });
      }
    }
  });

  /* ---------------- 初始化 ---------------- */
  $$('.tree-leaf').forEach(function (el) { el.title = el.textContent.trim(); });
  renderPager();
  draft = qOf(current).set ? clone(qOf(current).set) : defaultDraft(qOf(current));
  renderAll();
  if (cardImg.complete && cardImg.naturalWidth) applyZoom(1);
  else cardImg.addEventListener('load', function () { applyZoom(1); });
  window.addEventListener('resize', function () { if (fitMode) fitZoom(); });
  if (/[?&]modal=1/.test(location.search)) {
    var mq = location.search.match(/[?&]q=(\d+)/);
    openModal(mq ? parseInt(mq[1], 10) : 1);
  }
})();
