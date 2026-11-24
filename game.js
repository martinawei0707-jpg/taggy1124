
// ============================================================
// 01｜基本變數、預設標籤與吊牌計數
// ============================================================
const $ = s => document.querySelector(s), stage = $('#stage'), svg = $('.person'), tray = $('#tray'), ruler = $('.ruler'), floor = $('.floor');
let layout = 'free', selected = null, seq = 0;
const initial = ['乖巧', '勇敢', '愛哭', '獨立', '需要照顧', '不合群', '善良', '有創意', '膽小', '堅強', '很努力', '不一樣'];
const hung = () => [...stage.querySelectorAll('.hung')].sort((a, b) => a.dataset.order - b.dataset.order);
function count() {
    $('#count').textContent = `已掛上 ${hung().length} 個標籤`;
    $("#debut").disabled = !hung().length;
}
function clear() {
    selected?.classList.remove('selected');
    selected = null;
}
function valid(x, y) {
    const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM().inverse());
    return $('#bodypath').isPointInFill(p) || ((p.x - 140) / 63) ** 2 + ((p.y - 75) / 59) ** 2 <= 1;
}
function place(e, x, b) {
    e.style.left = x + 'px';
    e.style.bottom = b + 'px';
}
function baseLayout() {
    const dw = Math.min(420, stage.clientWidth ? stage.clientWidth * .96 : 420);
    svg.style.width = dw + 'px';
    svg.style.height = dw * 300 / 280 + 'px';
    svg.style.left = '50%';
    stage.style.height = '660px';
    ruler.style.display = floor.style.display = 'none';
}

// ============================================================
// 02｜身上整理與標籤尺排列
// ============================================================
function arrange(m) {
    clear();
    layout = m;
    baseLayout();
    const a = hung(), w = stage.clientWidth;
    for (const e of a) {
        e.style.cssText = '';
        e.style.whiteSpace = 'normal';
    }
    if (m === 'ruler') {
        const dw = Math.min(420, w * .65), dh = dw * 300 / 280, left = Math.max(4, (w - dw - Math.min(170, w * .38)) / 2), rx = left + dw * .84 + 10, base = 34 + dh * (300 - 276) / 300;
        Object.assign(svg.style, {
            width: dw + 'px', height: dh + 'px', left: left + dw / 2 + 'px'
        });
        Object.assign(ruler.style, {
            display: 'block', left: rx + 'px', bottom: base + 'px'
        });
        Object.assign(floor.style, {
            display: 'block', left: left + 'px', right: '12px', bottom: base + 'px'
        });
        ruler.replaceChildren();
        function tick(b, n) {
            const t = document.createElement('div');
            t.className = 'tick';
            t.style.bottom = b + 'px';
            const s = document.createElement('span');
            s.textContent = n;
            t.append(s);
            ruler.append(t);
        }
        tick(0, 0);
        let b = base + 3;
        a.forEach((e, i) => {
            e.style.maxWidth = Math.max(55, w - rx - 15) + 'px';
            place(e, rx + 9, b);
            tick(b - base + e.offsetHeight / 2, i + 1);
            b += e.offsetHeight + 5;
        });
        ruler.style.height = Math.max(dh * .87, b - base) + 'px';
        stage.style.height = Math.max(660, b + 30) + 'px';
    }
    else if (m === 'body') {
        let rows = [], row = [], rw = 0, limit = Math.min(parseFloat(svg.style.width) * .66, w - 12);
        a.forEach(e => {
            e.style.maxWidth = limit + 'px';
            if (row.length && rw + e.offsetWidth + 5 > limit) {
                rows.push(row);
                row = [];
                rw = 0;
            }
            rw += e.offsetWidth + (row.length ? 5 : 0);
            row.push(e);
        });
        if (row.length)
            rows.push(row);
        // 以放大後的小人為定位基準，吊牌群組中心約在畫布底部上方 250px。
        const total = rows.reduce((sum, r) => sum + Math.max(...r.map(e => e.offsetHeight)), 0) + Math.max(0, rows.length - 1) * 5;
        const center = 34 + (250 - 34) * parseFloat(svg.style.width) / 420;
        let b = Math.max(34, center - total / 2);
        for (const r of rows) {
            let x = (w - r.reduce((v, e) => v + e.offsetWidth, 0) - 5 * (r.length - 1)) / 2;
            for (const e of r) {
                place(e, x, b);
                x += e.offsetWidth + 5;
            }
            b += Math.max(...r.map(e => e.offsetHeight)) + 5;
        }
        stage.style.height = Math.max(660, b + 20) + 'px';
    }
    count();
}

// ============================================================
// 03｜吊牌掛上、取下與拖曳事件
// ============================================================
function hang(e, x, y) {
    if (!valid(x, y))
        return;
    const r = stage.getBoundingClientRect();
    if (!e.classList.contains('hung'))
        e.dataset.order = ++seq;
    stage.append(e);
    e.classList.add('hung');
    e.style.cssText = '';
    if (layout === 'ruler' || layout === 'body')
        arrange(layout);
    else {
        place(e, Math.max(2, Math.min(r.width - e.offsetWidth - 2, x - r.left - 12)), Math.max(4, r.bottom - y - e.offsetHeight / 2));
        e.style.transform = `rotate(${Math.random() * 18 - 9}deg)`;
    }
    clear();
    count();
}
function remove(e) {
    e.classList.remove('hung', 'selected');
    e.style.cssText = '';
    tray.append(e);
    clear();
    if (layout !== 'free')
        arrange(layout);
    count();
}
function create(text, source = 'catalog') {
    const e = document.createElement('button');
    e.type = 'button';
    e.className = 'tag';
    e.textContent = text;
    e.dataset.source = source;
    tray.append(e);
    let start, ghost;
    e.onpointerdown = v => {
        if (v.button !== 0)
            return;
        start = [v.clientX, v.clientY];
        e.setPointerCapture(v.pointerId);
    };
    e.onpointermove = v => {
        if (!start)
            return;
        if (!ghost && Math.hypot(v.clientX - start[0], v.clientY - start[1]) > 5) {
            ghost = e.cloneNode(true);
            ghost.className = 'tag ghost';
            ghost.style.cssText = '';
            document.body.append(ghost);
        }
        if (ghost) {
            ghost.style.left = v.clientX - 12 + 'px';
            ghost.style.top = v.clientY - 10 + 'px';
        }
    };
    e.onpointerup = v => {
        if (!start)
            return;
        if (ghost) {
            ghost.remove();
            ghost = null;
            if (valid(v.clientX, v.clientY))
                hang(e, v.clientX, v.clientY);
            else if (e.classList.contains('hung') && !stage.contains(document.elementFromPoint(v.clientX, v.clientY)))
                remove(e);
        }
        else {
            clear();
            selected = e;
            e.classList.add('selected');
        }
        start = null;
    };
    e.onpointercancel = () => {
        ghost?.remove();
        ghost = null;
        start = null;
    };
    e.ondblclick = () => {
        if (e.classList.contains('hung'))
            remove(e);
    };
    e.onkeydown = v => {
        if (v.key === 'Enter' || v.key === ' ') {
            v.preventDefault();
            if (e.classList.contains('hung'))
                remove(e);
            else {
                const p = new DOMPoint(140, 75 + (hung().length % 5) * 38).matrixTransform(svg.getScreenCTM());
                hang(e, p.x, p.y);
            }
        }
    };
    return e;
}
stage.onclick = e => {
    if (selected && !e.target.closest('.tag'))
        hang(selected, e.clientX, e.clientY);
};
$('#arrange').onclick = () => arrange('body');
$('#measure').onclick = () => arrange('ruler');
$('#reset').onclick = () => {
    layout = 'free';
    hung().forEach(remove);
    baseLayout();
};
$('#full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen?.();

// ============================================================
// 04｜色相、飽和度、明度與 HEX 色號
// ============================================================
function hsl(c) {
    let [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, L = (max + min) / 2, H = 0, S = 0;
    if (d) {
        S = d / (1 - Math.abs(2 * L - 1));
        H = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    }
    return [Math.round(H * 60) % 360, Math.round(S * 100), Math.round(L * 100)];
}
function hex(H, S, L) {
    S /= 100;
    L /= 100;
    let a = S * Math.min(L, 1 - L), f = n => {
        let k = (n + H / 30) % 12;
        return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
}
function paint(c, sync = true) {
    if (!/^#[a-f0-9]{6}$/i.test(c))
        return;
    $('#skin').setAttribute('fill', c);
    $('#picker').value = c;
    $('#hex').value = c.toUpperCase();
    if (sync) {
        [$('#h').value, $('#s').value, $('#l').value] = hsl(c);
    }
    $('#rgb').textContent = 'RGB ' + [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).join(', ');
}
$('#picker').oninput = e => paint(e.target.value);
$('#hex').oninput = e => paint(e.target.value);
['h', 's', 'l'].forEach(i => $('#' + i).oninput = () => paint(hex(+$('#h').value, +$('#s').value, +$('#l').value), false));
$('#defaultcolor').onclick = () => paint('#f8e39b');
['#f8e39b', '#f2c9d1', '#bfdced', '#c8e0ba', '#d9c9ed'].forEach(c => {
    let b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = c;
    b.title = c;
    b.setAttribute('aria-label', '套用 ' + c);
    b.onclick = () => paint(c);
    $('#colors').append(b);
});

// ============================================================
// 05｜小人操作狀態的保存與還原
// ============================================================
function snapshot() {
    return {
        color: $('#picker').value, layout, tags: [...tray.children, ...hung()].map(e => ({
            text: e.textContent, hung: e.classList.contains('hung'), order: e.dataset.order, left: e.style.left, bottom: e.style.bottom, transform: e.style.transform
        }))
    };
}
function restore(s) {
    clear();
    hung().forEach(e => e.remove());
    tray.replaceChildren();
    baseLayout();
    layout = 'free';
    paint(s?.color || '#f8e39b');
    for (const t of s?.tags || initial.map(text => ({
        text
    }))) {
        let e = create(t.text);
        seq = Math.max(seq, Number(t.order) || 0);
        if (t.hung) {
            stage.append(e);
            e.classList.add('hung');
            e.dataset.order = t.order;
            e.style.left = t.left;
            e.style.bottom = t.bottom;
            e.style.transform = t.transform;
        }
    }
    if (s?.layout && s.layout !== 'free')
        arrange(s.layout);
    count();
}
// 共用標籤庫：只同步文字，不同步個人小人。

// ============================================================
// 06｜共用標籤庫與本機待同步佇列
// ============================================================
const storageKey = 'tag-person-library-v041-consented';
let sharing = false, started = false;
let local = {
    words: [], queue: []
};
// 不讀取舊版本未取得同意的待同步資料。
let db = null, syncing = false;
function persist() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(local));
        return true;
    }
    catch (_) {
        return false;
    }
}
function status(text) {
    $('#libraryStatus').textContent = text;
}
function addToBoard(text) {
    if (![...tray.children, ...hung()].some(e => e.textContent === text))
        create(text);
}
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
    });
}

// ============================================================
// 07｜Supabase RPC 與雲端標籤同步
// ============================================================
async function rpc(name, args = {}) {
    const r = await fetch(db.url.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
        method: 'POST', headers: {
            apikey: db.key, ...(db.key.startsWith('eyJ') ? {
                Authorization: 'Bearer ' + db.key
            } : {}), 'Content-Type': 'application/json'
        }, body: JSON.stringify(args)
    });
    if (!r.ok)
        throw Error('資料庫回應 ' + r.status);
    return r.json();
}
async function syncLibrary() {
    if (!started || syncing)
        return;
    if (!db) {
        status(sharing ? '尚未連線；已同意分享的標籤待同步。' : '僅遊玩：新增標籤不會上傳。');
        return;
    }
    syncing = true;
    try {
        while (sharing && local.queue.length) {
            const item = local.queue[0];
            await rpc('record_label', {
                p_content: item.text, p_event: item.id
            });
            for (const tag of [...tray.children, ...hung()]) {
                if (tag.dataset.eventId === item.id) {
                    tag.dataset.source = 'catalog';
                    delete tag.dataset.eventId;
                }
            }
            local.queue = local.queue.filter(x => x.id !== item.id);
            persist();
        }
        const rows = await rpc('list_labels');
        const visible = new Set(rows.map(row => row.content));
        // 雲端清單是權威來源：移除已隱藏、刪除或合併的共用吊牌。
        let changed = false;
        for (const tag of [...tray.children, ...hung()]) {
            if (tag.dataset.source === 'catalog' && !visible.has(tag.textContent)) {
                if (selected === tag)
                    clear();
                tag.remove();
                changed = true;
            }
        }
        for (const row of rows)
            addToBoard(row.content);
        if (changed && layout !== 'free')
            arrange(layout);
        count();
        // 舊版已送出的本機詞庫不再重新加入；僅保留未同步的事件。
        local.words = [...new Set(local.queue.map(item => item.text))];
        if (sharing)
            persist();
        status('共用標籤庫已更新｜雲端 ' + rows.length + ' 種標籤' + (sharing ? '' : '｜僅遊玩，不上傳'));
    }
    catch (e) {
        status('同步未完成，仍可遊玩；待同步 ' + local.queue.length + ' 筆。可按更新標籤庫重試。');
    }
    finally {
        syncing = false;
    }
}

// ============================================================
// 08｜新增標籤與事件識別碼
// ============================================================
function newEventId() {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === 'function')
        return c.randomUUID();
    if (!c || typeof c.getRandomValues !== 'function')
        throw Error('瀏覽器無法產生同步識別碼');
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
}
function addManualTag() {
    const t = $('#newtag'), text = t.value.trim().normalize('NFC');
    if (!text) {
        $('#addStatus').textContent = '請先輸入標籤文字。';
        t.focus();
        return;
    }
    // 手動新增允許重複吊牌；只有共用詞庫同步才去重。
    const tag = create(text, sharing ? 'pending' : 'private');
    tray.prepend(tag);
    $('#addStatus').textContent = '已新增「' + text + '」！請將下方第一張吊牌拖到小人身上。';
    t.value = '';
    t.focus();
    if (!sharing) {
        status('已新增「' + text + '」｜僅遊玩，不上傳。');
        return;
    }
    try {
        if (!local.words.includes(text))
            local.words.push(text);
        const id = newEventId();
        tag.dataset.eventId = id;
        local.queue.push({
            text, id
        });
        const saved = persist();
        status('已新增「' + text + '」' + (saved ? '｜待同步' : '｜本次操作保留，瀏覽器儲存失敗'));
        if (db)
            void syncLibrary();
    }
    catch (err) {
        status('吊牌已新增，但無法建立同步紀錄：' + err.message);
    }
}
$('#addTagButton').addEventListener('click', addManualTag);
$('#addform').addEventListener('submit', e => {
    e.preventDefault();
    addManualTag();
});
$('#newtag').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        addManualTag();
    }
});
$('#reloadLibrary').onclick = syncLibrary;

// ============================================================
// 09｜資料庫連線及遊玩同意設定
// ============================================================
async function connectDatabase() {
    try {
        if (!window.TAG_CONFIG)
            await loadScript('./config.js');
        const cfg = window.TAG_CONFIG || {};
        if (!cfg.url || !cfg.key || cfg.url.includes('YOUR_PROJECT') || cfg.key.includes('YOUR_'))
            throw Error('未設定');
        db = cfg;
        await syncLibrary();
    }
    catch (_) {
        status('本機模式：尚未設定 Supabase，共用同步未啟用。');
    }
}
function startGame(allow) {
    if (started)
        return;
    started = true;
    sharing = allow;
    $('#aiToggle').checked = allow;
    $('#aiToggle').disabled = !allow;
    if (allow) {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
            if (saved && Array.isArray(saved.words) && Array.isArray(saved.queue))
                local = saved;
        }
        catch (_) {
        }
    }
    $('#welcome').hidden = true;
    $('#board').hidden = false;
    $('#consentStatus').textContent = allow ? '目前設定：同意分享標籤' : '目前設定：僅遊玩，不提供標籤資料';
    $('#stopShare').hidden = !allow;
    restore(null);
    if (allow)
        for (const item of local.queue) {
            const tag = create(item.text, 'pending');
            tag.dataset.eventId = item.id;
        }
    connectDatabase();
}
$('#consentCheck').onchange = e => {
    $('#shareStart').disabled = !e.target.checked;
};
$('#shareStart').onclick = () => {
    if ($('#consentCheck').checked)
        startGame(true);
};
$('#privateStart').onclick = () => startGame(false);
$('#stopShare').onclick = () => {
    sharing = false;
    for (const tag of [...tray.children, ...hung()])
        if (tag.dataset.source === 'pending') {
            tag.dataset.source = 'private';
            delete tag.dataset.eventId;
        }
    $('#aiToggle').checked = false;
    $('#aiToggle').disabled = true;
    local.queue = [];
    persist();
    $('#stopShare').hidden = true;
    $('#consentStatus').textContent = '目前設定：僅遊玩，不提供標籤資料';
    status('已停止後續分享；先前已送出的資料不會自動刪除。');
};
setInterval(() => {
    if (started && db)
        syncLibrary();
}, 15000);
window.addEventListener('resize', () => {
    if (!$('#workspace').hidden && layout !== 'free')
        arrange(layout);
});

// ============================================================
// 10｜本機自我介紹組句規則
// ============================================================
function makeIntro(values) {
    const a = [...new Set(values)], ids = a.filter(t => /^(高中生|國中生|小學生|大學生|學生|老師|教師|身心障礙者|創作者|上班族|運動員|志工|家長|女性|男性)$/.test(t));
    const interests = a.filter(t => /^(喜歡|熱愛|擅長|愛好|不喜歡)/.test(t));
    const needs = a.filter(t => /^(需要|有時需要)/.test(t));
    const traits = a.filter(t => !ids.includes(t) && !interests.includes(t) && !needs.includes(t));
    const known = traits.filter(t => /^(乖巧|勇敢|愛哭|獨立|不合群|善良|有創意|膽小|堅強|很努力|不一樣|內向|外向|活潑|安靜|害羞|樂觀|敏感|懶惰|聰明|脆弱|依賴|努力|開朗|幽默|固執|認真)$/.test(t));
    const unknown = traits.filter(t => !known.includes(t));
    const join = x => x.length > 1 ? x.slice(0, -1).join('、') + '，也' + x.at(-1) : x[0];
    let parts = [];
    if (ids.length)
        parts.push('我是' + ids.join('，也是'));
    if (known.length)
        parts.push('我' + join(known));
    if (interests.length)
        parts.push('我' + join(interests));
    if (needs.length)
        parts.push('我' + join(needs));
    if (unknown.length)
        parts.push('大家也用「' + unknown.join('」、「') + '」來形容我');
    return '大家好！' + parts.join('；') + '。';
}

// ============================================================
// 11｜GPT 自然語言生成與本機備援
// ============================================================
async function generateIntro(tags, bubble) {
    if (!sharing || !$('#aiToggle').checked || !db) {
        bubble.textContent = makeIntro(tags);
        return;
    }
    bubble.textContent = '正在準備自我介紹…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const r = await fetch(db.url.replace(/\/$/, '') + '/functions/v1/generate-intro', {
            method: 'POST', signal: controller.signal,
            headers: {
                'Content-Type': 'application/json', apikey: db.key, ...(db.key.startsWith('eyJ') ? {
                    Authorization: 'Bearer ' + db.key
                } : {})
            },
            body: JSON.stringify({
                tags: [...new Set(tags)]
            })
        });
        if (!r.ok)
            throw Error('生成失敗');
        const data = await r.json();
        if (typeof data.intro !== 'string' || !data.intro.trim())
            throw Error('空白介紹');
        if (bubble.isConnected)
            bubble.textContent = data.intro;
    }
    catch (_) {
        if (bubble.isConnected) {
            bubble.textContent = makeIntro(tags);
            const note = document.createElement('small');
            note.style.display = 'block';
            note.textContent = 'AI 暫時無法使用，已切換本機組句。';
            bubble.append(note);
        }
    }
    finally {
        clearTimeout(timer);
    }
}

// ============================================================
// 12｜巨星登場、服裝印花及返回遊戲
// ============================================================
function closeShow() {
    $('#show').hidden = true;
    $('#workspace').hidden = false;
    $('#show').replaceChildren();
}
function debut() {
    const tags = hung().map(e => e.textContent);
    if (!tags.length)
        return;
    clear();
    const show = $('#show');
    show.replaceChildren();
    const grid = document.createElement('div');
    grid.className = 'showgrid';
    const ns = 'http://www.w3.org/2000/svg';
    function n(t, a = {}, v) {
        const e = document.createElementNS(ns, t);
        for (const [k, x] of Object.entries(a))
            e.setAttribute(k, x);
        if (v !== undefined)
            e.textContent = v;
        return e;
    }
    const scene = n('svg', {
        viewBox: '0 0 320 365', role: 'img', 'aria-label': '穿著標籤文字印花服裝的小人站在聚光燈下'
    });
    const defs = n('defs');
    const grad = n('linearGradient', {
        id: 'showbeam', x1: 0, y1: 0, x2: 0, y2: 1
    });
    grad.append(n('stop', {
        'stop-color': '#fff2b4', 'stop-opacity': .8
    }), n('stop', {
        offset: 1, 'stop-color': '#ffe8a4', 'stop-opacity': .1
    }));
    defs.append(grad);
    const cloth = tags.length <= 3 ? 'M105 151 Q142 170 214 256 L240 285 L222 281 L218 300 Q158 225 89 174Z' : tags.length <= 9 ? 'M113 150 Q82 157 68 195 L39 306 Q99 326 141 299 L160 244 L179 299 Q221 326 281 306 L252 195 Q238 157 207 150 L160 184Z' : 'M113 150 Q76 161 61 202 L19 318 Q90 346 160 306 Q230 346 301 318 L259 202 Q244 161 207 150 L160 184Z';
    const clip = n('clipPath', {
        id: 'showcloth'
    });
    clip.append(n('path', {
        d: cloth
    }));
    defs.append(clip);
    scene.append(defs, n('path', {
        d: 'M0 0 H52 Q45 90 0 161Z M320 0 H268 Q275 90 320 161Z', fill: '#733e68'
    }), n('path', {
        d: 'M135 0 H185 L310 335 H10Z', fill: 'url(#showbeam)', class: 'beam'
    }), n('ellipse', {
        cx: 160, cy: 331, rx: 140, ry: 20, fill: '#f5dc9a', opacity: .32, stroke: '#ffedb0'
    }));
    const stars = n('g', {
        class: 'spark', fill: '#ffe8a4'
    });
    [[35, 80], [273, 95], [244, 38], [30, 237], [290, 250]].forEach(([x, y]) => stars.append(n('path', {
        d: 'M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2Z', transform: `translate(${x} ${y})`
    })));
    scene.append(stars);
    const actor = n('g', {
        class: 'staractor'
    });
    const person = n('g', {
        transform: 'translate(20 25)', fill: $('#picker').value, stroke: '#d2b778', 'stroke-width': 1.2
    });
    person.append(n('path', {
        d: $('#bodypath').getAttribute('d')
    }), n('ellipse', {
        cx: 140, cy: 75, rx: 63, ry: 59
    }));
    actor.append(person, n('path', {
        d: cloth, fill: '#b986b5', stroke: '#ffe1ab', 'stroke-width': 2
    }));
    const prints = n('g', {
        'clip-path': 'url(#showcloth)'
    });
    const words = [...new Set(tags)];
    for (let row = 0; row < 15; row++)
        for (let col = 0; col < 5; col++) {
            let t = words[(row * 5 + col) % words.length], x = 12 + col * 62 + (row % 2) * 9, y = 158 + row * 13;
            prints.append(n('text', {
                x, y, fill: ['#fff5cf', '#56386d', '#fbe2b5', '#713e72'][(row + col) % 4], 'font-size': Math.min(12, 55 / Math.max(1, Array.from(t).length)), transform: `rotate(-12 ${x} ${y})`
            }, t));
        }
    actor.append(prints);
    scene.append(actor);
    const bubble = document.createElement('div');
    bubble.className = 'speech';
    bubble.setAttribute('role', 'status');
    grid.append(scene, bubble);
    const footer = document.createElement('div');
    footer.className = 'showfooter';
    const back = document.createElement('button');
    back.textContent = '返回標籤操作';
    back.onclick = () => {
        closeShow();
        $('#debut').focus();
    };
    const feedbackButton = document.createElement('button');
    feedbackButton.textContent = '留下你的遊玩心得';
    feedbackButton.onclick = openFeedback;
    footer.append(back, feedbackButton);
    show.append(grid, footer);
    $('#workspace').hidden = true;
    show.hidden = false;
    generateIntro(tags, bubble);
    back.focus();
}
$('#debut').onclick = debut;
// 回饋與標籤分享獨立；不在本機儲存回饋，也不自動補送。
let feedbackBusy = false, feedbackId = null;

// ============================================================
// 13｜遊玩回饋問卷
// ============================================================
function openFeedback() {
    $('#feedbackDialog').showModal();
}
$('#openFeedback').onclick = openFeedback;
$('#closeFeedback').onclick = () => $('#feedbackDialog').close();
$('#feedbackDialog').addEventListener('cancel', e => {
    if (feedbackBusy)
        e.preventDefault();
});
$('#feedbackConsent').onchange = () => {
    $('#sendFeedback').disabled = !$('#feedbackConsent').checked || feedbackBusy;
};
$('#feedbackForm').addEventListener('input', () => {
    if (!feedbackBusy)
        feedbackId = null;
});
$('#feedbackForm').onsubmit = async (e) => {
    e.preventDefault();
    if (feedbackBusy || !$('#feedbackConsent').checked)
        return;
    const form = new FormData(e.target), ratings = [1, 2, 3, 4].map(i => Number(form.get('q' + i)) || null);
    const feelings = form.getAll('feeling'), other = $('#otherFeeling').value.trim(), thought = $('#thought').value.trim(), suggestion = $('#suggestion').value.trim();
    const status = $('#feedbackStatus');
    if (!ratings.some(Boolean) && !feelings.length && !other && !thought && !suggestion) {
        status.textContent = '請至少填寫一項回饋，或直接返回遊戲。';
        return;
    }
    if (!db) {
        status.textContent = '尚未連線 Supabase，回饋未送出。此為本機體驗模式。';
        return;
    }
    feedbackId ||= crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
    feedbackBusy = true;
    const controls = [...e.target.querySelectorAll('input,textarea,button')];
    controls.forEach(el => el.disabled = true);
    status.textContent = '正在送出回饋…';
    try {
        const result = await rpc('submit_feedback', {
            p_id: feedbackId, p_ratings: ratings, p_feelings: feelings, p_other: other, p_thought: thought, p_suggestion: suggestion
        });
        if (result !== true)
            throw Error('未確認儲存');
        e.target.reset();
        feedbackId = null;
        status.textContent = '謝謝你留下自己的聲音！回饋已成功送出。';
    }
    catch (err) {
        status.textContent = '尚未確認送出成功，請重試；你的填寫內容仍保留在此頁。';
    }
    finally {
        feedbackBusy = false;
        controls.forEach(el => el.disabled = false);
        $('#sendFeedback').disabled = !$('#feedbackConsent').checked;
    }
};
