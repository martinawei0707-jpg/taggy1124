
// ============================================================
// 01｜基本變數與台灣時間
// ============================================================
const $ = s => document.querySelector(s);
let db, data = {
    library: [], events: [], feedback: [], stats: []
};
const say = t => $('#status').textContent = t;
const check = r => {
    if (r.error)
        throw Error(r.error.message);
    return r.data;
};
const day = t => new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date(t));
const stamp = t => new Date(t).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei', hour12: false
});

// ============================================================
// 02｜表格與管理按鈕
// ============================================================
function table(id, heads, rows) {
    const t = document.createElement('table'), h = t.createTHead().insertRow();
    heads.forEach(x => {
        const c = document.createElement('th');
        c.textContent = x;
        h.append(c);
    });
    const b = t.createTBody();
    rows.forEach(row => {
        let r = b.insertRow();
        row.forEach(x => {
            let c = r.insertCell();
            if (x instanceof Node)
                c.append(x);
            else
                c.textContent = x ?? '';
        });
    });
    $(id).replaceChildren(t);
}
function btn(text, fn) {
    let b = document.createElement('button');
    b.textContent = text;
    b.onclick = async () => {
        b.disabled = true;
        try {
            await fn();
        }
        catch (e) {
            say(e.message);
        }
        finally {
            b.disabled = false;
        }
    };
    return b;
}

// ============================================================
// 03｜資料庫分頁讀取與日期篩選
// ============================================================
async function read(name, dateFilter = false) {
    let result = [];
    for (let offset = 0;; offset += 500) {
        let q = db.from(name).select('*').order(name === 'label_library' ? 'content' : 'created_at', {
            ascending: true
        });
        if (name !== 'label_library')
            q = q.order(name === 'feedback' ? 'id' : 'event_id');
        if (dateFilter) {
            if ($('#start').value)
                q = q.gte('created_at', new Date($('#start').value + 'T00:00:00+08:00').toISOString());
            if ($('#end').value)
                q = q.lt('created_at', new Date(new Date($('#end').value + 'T00:00:00+08:00').getTime() + 86400000).toISOString());
        }
        let rows = check(await q.range(offset, offset + 499));
        result.push(...rows);
        if (rows.length < 500)
            return result;
    }
}

// ============================================================
// 04｜預設及共用標籤管理
// ============================================================
function library() {
    table('#library', ['標籤', '類型', '累計次數', '首次', '最近', '狀態', '管理'], data.library.filter(x => x.content.includes($('#search').value)).map(x => {
        let controls = document.createElement('div');
        const act = async (action, target = null) => {
            check(await db.rpc('manage_label', {
                p_action: action, p_content: x.content, p_target: target
            }));
            await load();
        };
        controls.append(btn(x.is_default ? '取消預設' : '設為預設', async () => {
            check(await db.rpc('set_default_label', {
                p_content: x.content, p_enabled: !x.is_default
            }));
            await load();
        }), btn(x.visible ? '隱藏' : '公開', () => act(x.visible ? 'hide' : 'show')), btn('修改／合併', async () => {
            let v = prompt('輸入整理後的標籤（原始紀錄保留）', x.content);
            if (v && v.trim() !== x.content)
                await act('merge', v.trim());
        }), btn('刪除', async () => {
            if (confirm('永久刪除此標籤及其原始紀錄？'))
                await act('delete');
        }));
        return [x.content, x.is_default ? '預設' : '共用', x.submissions, stamp(x.first_seen), stamp(x.last_seen), x.visible ? '公開' : '隱藏', controls];
    }));
}

// ============================================================
// 05｜收集紀錄、詞頻與回饋統計
// ============================================================
async function load() {
    try {
        if ($('#start').value && $('#end').value && $('#start').value > $('#end').value)
            throw Error('起日不得晚於迄日');
        say('讀取資料中');
        [data.library, data.events, data.feedback] = await Promise.all([read('label_library'), read('label_events', true), read('feedback', true)]);
        let map = new Map;
        for (let e of data.events) {
            let d = day(e.created_at), key = JSON.stringify([d, e.content]);
            map.set(key, (map.get(key) || 0) + 1);
        }
        data.stats = [...map].map(([k, n]) => [...JSON.parse(k), n]).sort((a, b) => a[0].localeCompare(b[0]) || b[2] - a[2]);
        let totals = new Map;
        for (let e of data.events)
            totals.set(e.content, (totals.get(e.content) || 0) + 1);
        $('#summary').textContent = `期間輸入 ${data.events.length} 次、不同標籤 ${totals.size} 種、回饋 ${data.feedback.length} 筆`;
        table('#stats', ['日期', '原始標籤', '次數'], data.stats);
        library();
        table('#events', ['時間', '原始標籤'], data.events.map(e => [stamp(e.created_at), e.content]));
        table('#feedback', ['時間', '四項評分', '感受', '其他感受', '心得', '建議', '管理'], data.feedback.map(e => [stamp(e.created_at), (e.ratings || []).map(x => x ?? '未填').join(' / '), (e.feelings || []).join('、'), e.other_feeling, e.thought, e.suggestion, btn('刪除', async () => {
                if (confirm('永久刪除此回饋？')) {
                    check(await db.rpc('delete_feedback', {
                        p_id: e.id
                    }));
                    await load();
                }
            })]));
        say('已更新');
    }
    catch (e) {
        say(e.message);
    }
}

// ============================================================
// 06｜CSV 匯出與公式注入防護
// ============================================================
function csv(name, headers, rows) {
    const quote = x => '"' + String(x ?? '').replace(/^[\s]*[=+\-@\t\r]/, m => "'" + m).replace(/"/g, '""') + '"';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + [headers, ...rows].map(r => r.map(quote).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8'
    }));
    a.download = name + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ============================================================
// 07｜匯出按鈕與日期查詢
// ============================================================
$('#exportStats').onclick = () => csv('單日詞頻', ['日期', '標籤', '次數'], data.stats);
$('#exportEvents').onclick = () => csv('原始紀錄', ['台灣時間', '標籤'], data.events.map(x => [stamp(x.created_at), x.content]));
$('#exportLibrary').onclick = () => csv('標籤庫', ['標籤', '累計', '首次', '最近', '公開'], data.library.map(x => [x.content, x.submissions, stamp(x.first_seen), stamp(x.last_seen), x.visible]));
$('#exportFeedback').onclick = () => csv('遊玩回饋', ['台灣時間', '趣味', '易用', '反思', '共融', '感受', '其他感受', '心得', '建議'], data.feedback.map(x => [stamp(x.created_at), ...x.ratings, x.feelings.join('、'), x.other_feeling, x.thought, x.suggestion]));
$('#search').oninput = library;
$('#refresh').onclick = load;
$('#today').onclick = () => {
    $('#start').value = $('#end').value = day(Date.now());
    load();
};
$('#all').onclick = () => {
    $('#start').value = $('#end').value = '';
    load();
};

// ============================================================
// 08｜管理者授權及登入登出
// ============================================================
async function auth() {
    let session = check(await db.auth.getSession()).session;
    if (!session)
        return;
    let allowed = check(await db.rpc('is_tag_admin'));
    if (!allowed) {
        await db.auth.signOut();
        say('此帳號未獲製作團隊授權');
        return;
    }
    $('#login').hidden = true;
    $('#panel').hidden = false;
    $('#today').click();
}
$('#loginform').onsubmit = async (e) => {
    e.preventDefault();
    try {
        check(await db.auth.signInWithPassword({
            email: $('#email').value, password: $('#password').value
        }));
        $('#password').value = '';
        await auth();
    }
    catch (e) {
        say(e.message);
    }
};
$('#logout').onclick = async () => {
    await db.auth.signOut();
    location.reload();
};
try {
    let c = window.TAG_CONFIG;
    if (!c || c.url.includes('YOUR_PROJECT'))
        throw Error('請先設定 config.js');
    db = window.supabase.createClient(c.url, c.key);
    auth().catch(e => say(e.message));
}
catch (e) {
    say(e.message);
}
// 製作團隊新增預設標籤，不計入玩家投稿次數。

// ============================================================
// 09｜新增前台預設標籤
// ============================================================
$('#defaultLabelForm').onsubmit = async (e) => {
    e.preventDefault();
    const input = $('#defaultLabel');
    const button = $('#addDefaultLabel');
    if (!input.value.trim())
        return;
    button.disabled = true;
    try {
        check(await db.rpc('set_default_label', {
            p_content: input.value.trim(), p_enabled: true
        }));
        input.value = '';
        await load();
    }
    catch (err) {
        say(err.message);
    }
    finally {
        button.disabled = false;
    }
};
