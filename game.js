try { if (typeof vkBridge !== 'undefined') vkBridge.send('VKWebAppInit'); } catch (e) {}

const VIDEO_LINKS = { 
plum: "https://vk.ru/clip_ext.php?oid=-222114060&id=456240781&autoplay=1", 
cherry: "https://vk.ru/clip_ext.php?oid=-222114060&id=456240702&autoplay=1", 
strawberry: "https://vk.ru/clip_ext.php?oid=-241022619&id=456239018&autoplay=1", 
bread: "https://vk.ru/clip_ext.php?oid=-241022619&id=456239020&autoplay=1", 
tractor: "" 
};

const MOCK_VK_POSTS = [ 
{ text: "🛰️ <b>Точное земледелие:</b> Тракторы экономят топливо благодаря GPS и берегут почву от уплотнения.", date: "Сегодня" }, 
{ text: "💧 <b>Системы полива:</b> Капельный полив доставляет воду прямо к корням, снижая расход на 50%.", date: "Вчера" },
{ text: "🧬 <b>Селекция:</b> Современная селекция создает сорта пшеницы, устойчивые к засухе.", date: "3 дня назад" }
];

const SIZE = 6;
const TYPES = ["plum", "cherry", "strawberry", "bread", "tractor"];
const ICON = { plum: "🍑", cherry: "🍒", strawberry: "🍓", bread: "🍞", tractor: "🚜" };
const SPECIAL_ICON = { arrowH: "↔️", arrowV: "↕️", bomb: "💣", plane: "✈️" };

const LEVELS_DATA = [ 
{ id: 1, targetItem: "plum", targetCount: 10, moves: 15, reward: null }, 
{ id: 2, targetItem: "cherry", targetCount: 15, moves: 18, reward: "plum" },
{ id: 3, targetItem: "strawberry", targetCount: 18, moves: 20, reward: "strawberry" },
{ id: 4, targetItem: "bread", targetCount: 20, moves: 22, reward: "cherry" },
{ id: 5, targetItem: "tractor", targetCount: 25, moves: 25, reward: "tractor" },
{ id: 6, targetItem: "bread", targetCount: 25, moves: 24, reward: "bread" },
{ id: 7, targetItem: "plum", targetCount: 30, moves: 25, reward: null },
{ id: 8, targetItem: "cherry", targetCount: 30, moves: 25, reward: null },
{ id: 9, targetItem: "strawberry", targetCount: 35, moves: 26, reward: null },
{ id: 10, targetItem: "tractor", targetCount: 35, moves: 28, reward: null, isCheckpoint: true },
{ id: 11, targetItem: "bread", targetCount: 40, moves: 28, reward: null },
{ id: 12, targetItem: "plum", targetCount: 45, moves: 30, reward: null }
];

let maxUnlockedLevel = localStorage.getItem('kz_max_level') ? parseInt(localStorage.getItem('kz_max_level')) : 1;
let selectedLevelIndex = maxUnlockedLevel - 1; 
let unlockedItems = localStorage.getItem('kz_unlocked') ? JSON.parse(localStorage.getItem('kz_unlocked')) : [];
let coins = localStorage.getItem('kz_coins') ? parseInt(localStorage.getItem('kz_coins')) : 500; 

let storage = JSON.parse(localStorage.getItem('kz_storage')) || { cherry: 0, jam: 0 };
let soilBeds = JSON.parse(localStorage.getItem('kz_soil_beds')) || [];
let buildings = JSON.parse(localStorage.getItem('kz_buildings')) || [ { id: 'start_barn', type: 'barn', c: 11, r: 11, level: 1, queue: [] } ];
let marketSlots = JSON.parse(localStorage.getItem('kz_market')) || [ { id: 1, item: null, qty: 0, price: 0, start: 0, duration: 0, status: 'empty' }, { id: 2, item: null, qty: 0, price: 0, start: 0, duration: 0, status: 'empty' }, { id: 3, item: null, qty: 0, price: 0, start: 0, duration: 0, status: 'empty' } ];

let board = [], selected = null, busy = false, finished = false;
let moves = 0, collectedCount = 0;
let selectedBoosters = { bomb: false, plane: false, moves: false };
const BOOSTER_COSTS = { bomb: 30, plane: 30, moves: 40 };

function getCapacity() { return buildings.filter(b => b.type === 'barn').reduce((sum, b) => sum + (b.level * 50), 0); }
function updateStorageUI() {
let total = (storage.cherry || 0) + (storage.jam || 0); let cap = getCapacity();
let elTop = document.getElementById('storage-count'); if (elTop) elTop.innerText = `${total}/${cap}`;
}

// === ЛОГИКА ФЕРМЫ (МЕНЮ ЗДАНИЙ) ===
function openBarn(bId) {
let b = bId ? buildings.find(x => x.id === bId) : buildings.find(x => x.type === 'barn'); if (!b) return;
let cap = b.level * 50; let upCost = b.level * 100;
let content = `<div style="text-align:left;"><p style="font-size:13px; color:#555; text-align:center;">Вместимость амбара: ${cap} ед.</p>`;
let empty = true;
['cherry', 'jam'].forEach(item => {
    if ((storage[item] || 0) > 0) {
        empty = false; let name = item === 'cherry' ? 'Черешня 🍒' : 'Варенье 🍯';
        content += `<div style="padding:10px; border-bottom:1px solid #EEE; display:flex; justify-content:space-between; align-items:center;"><b>${name}</b><span style="font-weight:800; color:#436932;">${storage[item]} шт.</span></div>`;
    }
});
if (empty) content += `<div style="color:#777; padding: 20px 0; text-align:center;">Амбар пуст. Собери урожай!</div>`;
if (b.level < 5) content += `<button class="btn btn-secondary" style="margin-top:15px; width:100%; border:1px solid #CCC;" onclick="upgradeBuilding('${b.id}', ${upCost})">Улучшить до ур.${b.level+1} (${upCost} 🪙)</button>`;
else content += `<p style="color:#E58E26; font-weight:bold; margin-top:15px; text-align:center;">Максимальный 5 уровень!</p>`;
content += `</div>`; showModal(`📦 Амбар (Ур. ${b.level})`, "", "Закрыть", closeModal); document.getElementById('modal-text').innerHTML = content;
}

function openFactoryInfo(bId) {
let b = buildings.find(x => x.id === bId); if (!b) return;
let upCost = b.level * 150; let now = Date.now();
let readyItems = b.queue ? b.queue.filter(q => now >= q.start + q.duration) : [];
if (readyItems.length > 0) {
    let total = (storage.cherry || 0) + (storage.jam || 0);
    if (total + readyItems.length > getCapacity()) { showModal("Склад полон!", "Освободи место в амбаре.", "Ок", closeModal); return; }
    storage.jam = (storage.jam || 0) + readyItems.length;
    b.queue = b.queue.filter(q => now < q.start + q.duration);
    localStorage.setItem('kz_buildings', JSON.stringify(buildings)); localStorage.setItem('kz_storage', JSON.stringify(storage));
    updateStorageUI(); renderFarmItems(); return; 
}
let content = `<div style="text-align:left;"><p>Варим варенье! (6 Черешен 🍒 = 1 Варенье 🍯). Время: 7 минут.</p><div class="factory-queue">`;
if (!b.queue) b.queue = [];
for (let i = 0; i < b.level; i++) {
    if (i < b.queue.length) { let qItem = b.queue[i]; let left = Math.max(0, Math.ceil(((qItem.start + qItem.duration) - now)/1000)); content += `<div class="factory-slot active">⏳ ${Math.ceil(left/60)}м</div>`; } 
    else { content += `<div class="factory-slot" style="cursor:pointer;" onclick="startProduction('${bId}')">➕</div>`; }
}
content += `</div>`;
if (b.level < 5) content += `<button class="btn btn-secondary" style="margin-top:15px; border:1px solid #CCC; width:100%;" onclick="upgradeBuilding('${b.id}', ${upCost})">Улучшить (Слот +1) за ${upCost} 🪙</button>`;
else content += `<p style="color:#E58E26; font-weight:bold; margin-top:10px; text-align:center;">Максимальный 5 уровень!</p>`;
showModal(`🏭 Завод варенья (Ур. ${b.level})`, "", "Закрыть", closeModal); document.getElementById('modal-text').innerHTML = content;
}

function startProduction(bId) {
if ((storage.cherry || 0) < 6) { showModal("Нет сырья!", "Для одной банки варенья нужно 6 черешен.", "Понятно", () => openFactoryInfo(bId)); return; }
let b = buildings.find(x => x.id === bId); storage.cherry -= 6; b.queue.push({ item: 'jam', start: Date.now(), duration: 420000 });
localStorage.setItem('kz_buildings', JSON.stringify(buildings)); localStorage.setItem('kz_storage', JSON.stringify(storage)); updateStorageUI(); openFactoryInfo(bId); renderFarmItems();
}

function upgradeBuilding(bId, cost) {
if (coins < cost) { alert("Мало монет!"); return; } let b = buildings.find(x => x.id === bId); addCoins(-cost); b.level++;
localStorage.setItem('kz_buildings', JSON.stringify(buildings)); updateStorageUI(); closeModal(); renderFarmItems();
}

function openMarketHeader() { if (!buildings.some(b => b.type === 'market')) showModal("Рынок закрыт", "Сначала построй Рынок (из Магазина), чтобы продавать товары!", "Понятно", closeModal); else openMarket(); }
function openBarnHeader() { let b = buildings.find(x => x.type === 'barn'); if (b) openBarn(b.id); }

function openMarket() {
let content = `<div style="text-align:left;"><p style="font-size:13px; color:#555;">Выставляй товары, чтобы заработать монеты!</p>`;
let now = Date.now();
marketSlots.forEach((slot, idx) => {
    if (slot.status === 'empty') {
        content += `<div class="market-slot"><span style="color:#999;">Слот свободен</span><button class="btn btn-accent" style="padding:6px; font-size:12px; width:80px;" onclick="marketSelect(${idx})">Продать</button></div>`;
    } else if (slot.status === 'selling') {
        if (now >= slot.start + slot.duration) {
            slot.status = 'ready'; localStorage.setItem('kz_market', JSON.stringify(marketSlots));
            content += `<div class="market-slot" style="background:#E8F5E9; border-color:#4CAF50;"><b>Продано! (+${slot.price} 🪙)</b><button class="btn btn-secondary" style="padding:6px; font-size:12px; width:80px; background:#4CAF50; color:white;" onclick="marketCollect(${idx})">Забрать</button></div>`;
        } else {
            let left = Math.ceil(((slot.start + slot.duration) - now)/1000); let name = slot.item === 'cherry' ? '🍒' : '🍯';
            content += `<div class="market-slot"><span>Продажа ${name} x${slot.qty}...</span><span style="color:#E58E26; font-weight:bold;">⏳ ${left}с</span></div>`;
        }
    } else if (slot.status === 'ready') { content += `<div class="market-slot" style="background:#E8F5E9; border-color:#4CAF50;"><b>Продано! (+${slot.price} 🪙)</b><button class="btn btn-secondary" style="padding:6px; font-size:12px; width:80px; background:#4CAF50; color:white;" onclick="marketCollect(${idx})">Забрать</button></div>`; }
});
content += `</div>`; showModal("🏪 РЫНОК", "", "Закрыть", closeModal); document.getElementById('modal-text').innerHTML = content;
}

function marketSelect(slotIdx) {
let content = `<div style="text-align:left;">Что выставить на продажу?</div>`;
if ((storage.cherry || 0) >= 6) { content += `<button class="btn btn-secondary" style="margin-top:10px; width:100%; border:1px solid #CCC;" onclick="marketStart(${slotIdx}, 'cherry')">Черешня x6 (30 сек) ➡️ <b>2 🪙</b></button>`; } 
else { content += `<div style="color:#777; margin-top:10px; font-size:12px; text-align:center;">Нужно минимум 6 Черешен для продажи.</div>`; }
if ((storage.jam || 0) >= 1) { content += `<button class="btn btn-secondary" style="margin-top:10px; width:100%; border:1px solid #CCC; background:#FFF8E1;" onclick="marketStart(${slotIdx}, 'jam')">Варенье x1 (1 мин) ➡️ <b style="color:#E58E26;">3 🪙</b></button>`; }
showModal("Выбор товара", "", "Назад", openMarket); document.getElementById('modal-text').innerHTML = content;
}

function marketStart(slotIdx, type) {
let cost = type === 'cherry' ? 6 : 1;
if ((storage[type] || 0) >= cost) {
    storage[type] -= cost; localStorage.setItem('kz_storage', JSON.stringify(storage));
    let slot = marketSlots[slotIdx]; slot.status = 'selling'; slot.item = type; slot.qty = cost; slot.start = Date.now();
    if (type === 'cherry') { slot.price = 2; slot.duration = 30000; } if (type === 'jam') { slot.price = 3; slot.duration = 60000; }
    localStorage.setItem('kz_market', JSON.stringify(marketSlots)); updateStorageUI(); openMarket();
}
}
function marketCollect(slotIdx) { let slot = marketSlots[slotIdx]; addCoins(slot.price); slot.status = 'empty'; slot.item = null; localStorage.setItem('kz_market', JSON.stringify(marketSlots)); openMarket(); }

// === КАМЕРА ===
const fViewport = document.getElementById('farm-viewport'); const fWorld = document.getElementById('farm-world');
let fScale = 1; let fPanX = window.innerWidth < 400 ? -800 : -850; let fPanY = -750;
let fIsDragging = false, fStartX, fStartY, fStartPanX, fStartPanY; let fInitialPinchDist = 0, fInitialScale = 1; let fReqAnim = null; let harvestedThisSwipe = false; 

if (fViewport) {
fViewport.addEventListener('touchstart', e => {
    harvestedThisSwipe = false;
    if (e.touches.length === 1) { fIsDragging = true; fStartX = e.touches[0].clientX; fStartY = e.touches[0].clientY; fStartPanX = fPanX; fStartPanY = fPanY; } 
    else if (e.touches.length === 2) { fIsDragging = false; fInitialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); fInitialScale = fScale; fStartPanX = fPanX; fStartPanY = fPanY; }
}, {passive: false});

fViewport.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && fIsDragging) {
        let touch = e.touches[0]; let rect = fViewport.getBoundingClientRect();
        let worldX = ((touch.clientX - rect.left) - fPanX) / fScale; let worldY = ((touch.clientY - rect.top) - fPanY) / fScale;
        let c = Math.floor(worldX / 80); let r = Math.floor(worldY / 80);
        
        let bed = soilBeds.find(b => b.c === c && b.r === r);
        if (buildModeItem && buildModeItem.type === 'cherry' && buildModeItem.count > 0 && bed && !bed.item) {
            bed.item = { type: buildModeItem.type, plantedAt: Date.now(), harvestsLeft: Math.floor(Math.random()*2)+5, state: 'growing' };
            buildModeItem.count--; document.getElementById('place-qty').innerText = buildModeItem.count;
            localStorage.setItem('kz_soil_beds', JSON.stringify(soilBeds)); renderFarmItems();
            let flash = document.createElement('div'); flash.style.position = 'absolute'; flash.style.left = (c*80)+'px'; flash.style.top = (r*80)+'px'; flash.style.width = '80px'; flash.style.height = '80px'; flash.style.background = 'rgba(255,255,255,0.6)'; flash.style.borderRadius = '50%'; flash.style.pointerEvents = 'none'; flash.style.animation = 'popAnim 0.3s forwards'; document.getElementById('farm-items-container').appendChild(flash); setTimeout(() => flash.remove(), 300);
            if (buildModeItem.count <= 0) cancelPlacement(); harvestedThisSwipe = true; 
        }
        else if (bed && bed.item && bed.item.state !== 'dry' && !buildModeItem) {
            if (Date.now() - bed.item.plantedAt >= 120000) { harvestItem(bed, touch.clientX, touch.clientY); harvestedThisSwipe = true; }
        }

        if (!harvestedThisSwipe) { fPanX = fStartPanX + (touch.clientX - fStartX); fPanY = fStartPanY + (touch.clientY - fStartY); requestCameraUpdate(); }
    } else if (e.touches.length === 2) {
        let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        let newScale = Math.min(Math.max(0.4, fInitialScale * (dist / fInitialPinchDist)), 2.0);
        let focalX = (e.touches[0].clientX + e.touches[1].clientX) / 2; let focalY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        let rect = fViewport.getBoundingClientRect(); let viewFocalX = focalX - rect.left; let viewFocalY = focalY - rect.top;
        let relX = (viewFocalX - fStartPanX) / fInitialScale; let relY = (viewFocalY - fStartPanY) / fInitialScale;
        fScale = newScale; fPanX = viewFocalX - relX * fScale; fPanY = viewFocalY - relY * fScale;
        requestCameraUpdate();
    }
}, {passive: false});

fViewport.addEventListener('touchend', e => { 
    if (e.changedTouches.length === 1 && fStartX !== undefined) {
        let dx = e.changedTouches[0].clientX - fStartX; let dy = e.changedTouches[0].clientY - fStartY;
        if (Math.hypot(dx, dy) < 10 && !harvestedThisSwipe) handleFarmTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    fIsDragging = false; 
});
fViewport.addEventListener('touchcancel', e => { fIsDragging = false; });
}

function requestCameraUpdate() { if (!fReqAnim) { fReqAnim = requestAnimationFrame(() => { updateCamera(); fReqAnim = null; }); } }
function updateCamera() { let minPanX = -(2000 * fScale - fViewport.clientWidth); let minPanY = -(2000 * fScale - fViewport.clientHeight); fPanX = Math.min(0, Math.max(minPanX, fPanX)); fPanY = Math.min(0, Math.max(minPanY, fPanY)); if (fWorld) fWorld.style.transform = `translate(${fPanX}px, ${fPanY}px) scale(${fScale})`; }
setTimeout(updateCamera, 100);

// === МАГАЗИН ===
let buildModeItem = null; let shopQty = 1;
function changeShopQty(delta) { shopQty += delta; if (shopQty < 1) shopQty = 1; if (shopQty > 10) shopQty = 10; document.getElementById('shop-qty').innerText = shopQty; }

function renderFarmDrawer() {
shopQty = 1;
let drawerHtml = `
    <div class="drawer-item" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div class="drawer-item-icon" style="background:#FFF3E0;"><img src="img/soil.png" style="width:70%; height:70%; object-fit:contain;" onerror="this.style.display='none';"><span style="display:none; font-size:20px;">🟫</span></div>
            <div class="drawer-item-info"><div class="drawer-item-title">Грядка земли</div><div style="font-size:11px; color:#666;">Место для посадки (1х1)</div></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; background:#FFF; border:1px solid #CCC; border-radius:12px; padding:6px;">
            <div style="display:flex; align-items:center; gap:8px;"><button class="qty-btn" onclick="changeShopQty(-1)">-</button><span class="qty-val" id="shop-qty">1</span><button class="qty-btn" onclick="changeShopQty(1)">+</button></div>
            <button class="btn btn-accent" style="padding:8px 12px; font-size:13px; width:auto; border-radius: 8px;" onclick="startPlacement('soil', 5)">Купить (5 🪙/шт)</button>
        </div>
    </div>
    <div class="drawer-item" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div class="drawer-item-icon" style="background:#FFF3E0;"><img src="img/cherry.png" style="width:70%; height:70%; object-fit:contain;" onerror="this.style.display='none';"><span style="display:none; font-size:20px;">🍒</span></div>
            <div class="drawer-item-info"><div class="drawer-item-title">Саженец черешни</div><div style="font-size:11px; color:#666;">Сажать на грядку</div></div>
        </div>
        <button class="btn btn-accent" style="padding:8px 12px; font-size:13px; border-radius: 8px;" onclick="startPlacement('cherry', 10)">Купить саженцы (10 🪙/шт)</button>
    </div>
    <div class="drawer-item" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div class="drawer-item-icon" style="background:#FFF3E0;"><img src="img/barn.png" style="width:70%; height:70%; object-fit:contain;" onerror="this.style.display='none';"><span style="display:none; font-size:20px;">🏠</span></div>
            <div class="drawer-item-info"><div class="drawer-item-title">Новый Амбар</div><div style="font-size:11px; color:#666;">Вместимость (2х2 клетки)</div></div>
        </div>
        <button class="btn btn-accent" style="padding:8px 12px; font-size:13px; border-radius: 8px;" onclick="startPlacement('barn', 150)">Построить (150 🪙)</button>
    </div>
    <div class="drawer-item" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div class="drawer-item-icon" style="background:#FFF3E0;"><span style="font-size:20px;">🏭</span></div>
            <div class="drawer-item-info"><div class="drawer-item-title">Завод варенья</div><div style="font-size:11px; color:#666;">Переработка (2х2 клетки)</div></div>
        </div>
        <button class="btn btn-accent" style="padding:8px 12px; font-size:13px; border-radius: 8px;" onclick="startPlacement('factory', 300)">Построить (300 🪙)</button>
    </div>
    <div class="drawer-item" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div class="drawer-item-icon" style="background:#FFF3E0;"><span style="font-size:20px;">🏪</span></div>
            <div class="drawer-item-info"><div class="drawer-item-title">Рынок фермера</div><div style="font-size:11px; color:#666;">Продажа товаров (2х2)</div></div>
        </div>
        <button class="btn btn-accent" style="padding:8px 12px; font-size:13px; border-radius: 8px;" onclick="startPlacement('market', 200)">Построить (200 🪙)</button>
    </div>
`;
document.getElementById('drawer-items').innerHTML = drawerHtml;
}

function startPlacement(type, basePrice) {
let count = (type === 'soil' || type === 'cherry') ? shopQty : 1;
let totalCost = count * basePrice;
if (coins < totalCost) { showModal("Мало монет 🪙", "Заработай монеты!", "Понятно", closeModal); return; }
addCoins(-totalCost); buildModeItem = { type: type, count: count, pricePerUnit: basePrice }; closeBuildMenu();
document.getElementById('place-qty').innerText = buildModeItem.count; document.getElementById('placement-banner').style.display = 'flex'; document.getElementById('farm-world').classList.add('planting-mode');
}
function cancelPlacement() { 
if (buildModeItem && buildModeItem.count > 0) { addCoins(buildModeItem.count * buildModeItem.pricePerUnit); } 
buildModeItem = null; document.getElementById('placement-banner').style.display = 'none'; document.getElementById('farm-world').classList.remove('planting-mode');
}

function isSpaceFree(c, r, w, h) {
for(let i=0; i<w; i++){ for(let j=0; j<h; j++){ let cc = c+i, rr = r+j; if(soilBeds.some(b => b.c===cc && b.r===rr)) return false; if(buildings.some(b => cc >= b.c && cc < b.c+2 && rr >= b.r && rr < b.r+2)) return false; } } return true;
}

function handleFarmTap(clientX, clientY) {
let rect = fViewport.getBoundingClientRect();
let worldX = ((clientX - rect.left) - fPanX) / fScale; let worldY = ((clientY - rect.top) - fPanY) / fScale;
let c = Math.floor(worldX / 80); let r = Math.floor(worldY / 80);

let clickedBld = buildings.find(b => c >= b.c && c < b.c+2 && r >= b.r && r < b.r+2);
if (clickedBld && !buildModeItem) {
    if (clickedBld.type === 'barn') openBarn(clickedBld.id);
    if (clickedBld.type === 'factory') openFactoryInfo(clickedBld.id);
    if (clickedBld.type === 'market') openMarket();
    return;
}

let bed = soilBeds.find(b => b.c === c && b.r === r);
if (bed && bed.item && bed.item.state === 'dry') {
    showModal("Засохшее дерево 🍂", "Выкорчевать?", "Да (2 🪙)", () => {
        if (coins >= 2) { addCoins(-2); bed.item = null; localStorage.setItem('kz_soil_beds', JSON.stringify(soilBeds)); closeModal(); renderFarmItems(); } 
        else { showModal("Мало монет", "Нужно 2 🪙", "Понятно", closeModal); }
    }, "Нет", closeModal); return; 
}

if (!buildModeItem) return;

if (buildModeItem.type === 'soil' && isSpaceFree(c, r, 1, 1)) {
    soilBeds.push({c: c, r: r, item: null}); buildModeItem.count--; document.getElementById('place-qty').innerText = buildModeItem.count;
    localStorage.setItem('kz_soil_beds', JSON.stringify(soilBeds)); renderFarmItems();
    if (buildModeItem.count <= 0) cancelPlacement();
}
else if (buildModeItem.type === 'cherry' && bed && !bed.item) {
    bed.item = { type: 'cherry', plantedAt: Date.now(), harvestsLeft: Math.floor(Math.random()*2)+5, state: 'growing' };
    buildModeItem.count--; document.getElementById('place-qty').innerText = buildModeItem.count;
    localStorage.setItem('kz_soil_beds', JSON.stringify(soilBeds)); renderFarmItems();
    if (buildModeItem.count <= 0) cancelPlacement();
}
else if ((buildModeItem.type === 'barn' || buildModeItem.type === 'factory' || buildModeItem.type === 'market') && isSpaceFree(c, r, 2, 2)) {
    buildings.push({ id: 'b_'+Date.now(), type: buildModeItem.type, c: c, r: r, level: 1, queue: [] });
    buildModeItem.count--; document.getElementById('place-qty').innerText = buildModeItem.count;
    localStorage.setItem('kz_buildings', JSON.stringify(buildings)); updateStorageUI(); renderFarmItems();
    if (buildModeItem.count <= 0) cancelPlacement();
}
}

// === УЛЬТРА-СКОРОСТНОЙ РЕНДЕР ===
function renderFarmItems() {
let container = document.getElementById('farm-items-container'); if (!container) return;
let now = Date.now(); let activeIds = new Set();

buildings.forEach(b => {
    let id = 'bld_' + b.id; activeIds.add(id); let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div'); el.id = id;
        el.style.position = 'absolute'; el.style.left = (b.c * 80) + 'px'; el.style.top = (b.r * 80) + 'px'; el.style.width = '160px'; el.style.height = '160px';
        el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.alignItems = 'center'; el.style.justifyContent = 'flex-end'; el.style.pointerEvents = 'none'; el.style.zIndex = b.r * 10;
        container.appendChild(el);
    }
    
    let html = '';
    if (b.type === 'barn') {
        let total = (storage.cherry || 0) + (storage.jam || 0); let cap = b.level * 50; let percent = Math.min(100, (total / cap) * 100);
        html = `<div class="storage-bar-wrap" style="position:absolute; top:-20px; left:20px; width:120px; height:18px; background:rgba(0,0,0,0.6); border:2px solid #FFF; border-radius:10px; overflow:hidden; display:flex; align-items:center; justify-content:center; pointer-events:none;"><div style="position:absolute; left:0; top:0; bottom:0; width:${percent}%; background:linear-gradient(90deg, #81C784, #4CAF50); transition:width 0.4s ease-out;"></div><div style="position:relative; color:#FFF; font-size:10px; font-weight:800;">${total}/${cap}</div></div><div class="barn-shadow"></div><img src="img/barn.png" style="width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 15px 15px rgba(0,0,0,0.3)); pointer-events:none;" onerror="this.style.display='none';"><span style="display:none; font-size:80px; z-index:2; filter:drop-shadow(0 15px 15px rgba(0,0,0,0.3));">🏠</span>`;
    } else if (b.type === 'factory') {
        let hasReady = b.queue && b.queue.some(q => now >= q.start + q.duration); let readyBadge = hasReady ? `<div class="booster-badge" style="position:absolute; top:-20px; font-size:40px; z-index:100; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.5));">🍯</div>` : '';
        html = `${readyBadge}<div class="barn-shadow"></div><span style="font-size:90px; z-index:2; filter:drop-shadow(0 10px 10px rgba(0,0,0,0.3));">🏭</span>`;
    } else if (b.type === 'market') { html = `<div class="barn-shadow"></div><span style="font-size:90px; z-index:2; filter:drop-shadow(0 10px 10px rgba(0,0,0,0.3));">🏪</span>`; }
    
    if (el.getAttribute('data-html') !== html) { el.innerHTML = html; el.setAttribute('data-html', html); }
});

soilBeds.forEach(bed => {
    let id = 'bed_' + bed.c + '_' + bed.r; activeIds.add(id); let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div'); el.id = id;
        el.style.position = 'absolute'; el.style.left = (bed.c * 80) + 'px'; el.style.top = (bed.r * 80) + 'px'; el.style.width = '80px'; el.style.height = '80px'; el.style.pointerEvents = 'none'; el.style.zIndex = bed.r * 10 - 5;
        el.innerHTML = `<img src="img/soil.png" style="position:absolute; left:0; top:0; width:100%; height:100%; display:block;" onerror="this.style.background='#6D4C41';"><div class="item-wrap" style="position:absolute; left:-40px; top:-80px; width:160px; height:160px; display:flex; align-items:flex-end; justify-content:center; z-index:10;"></div>`;
        container.appendChild(el);
    }
    
    let wrap = el.querySelector('.item-wrap');
    
    if (bed.item) {
        let age = now - bed.item.plantedAt;
        let isDry = bed.item.state === 'dry';
        let isGrowing = !isDry && age < 120000;
        let stateKey = isDry ? 'dry' : (isGrowing ? 'growing' : 'ready');
        
        if (wrap.getAttribute('data-state') !== stateKey) {
            if (isDry) { wrap.innerHTML = `<img src="img/tree_dry.png" style="width:100%; height:100%; object-fit:contain; filter: drop-shadow(0 6px 6px rgba(0,0,0,0.4));" onerror="this.src='img/cherry.png'; this.style.filter='grayscale(100%) sepia(100%) hue-rotate(30deg) drop-shadow(0 6px 6px rgba(0,0,0,0.4))';">`; }
            else if (isGrowing) { wrap.innerHTML = `<img src="img/sprout.png" style="width:30%; height:30%; object-fit:contain; margin-bottom:10px; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));" onerror="this.style.display='none';"><div style="display:none; font-size:30px; margin-bottom:10px;">🌱</div><div class="pct-lbl" style="position:absolute; bottom:15px; background:rgba(0,0,0,0.7); border: 1px solid #FFF; color:white; font-size:11px; font-weight:800; border-radius:8px; padding:2px 6px;">0%</div>`; }
            else { wrap.innerHTML = `<div class="sway" style="width:100%; height:100%;"><img src="img/tree_cherry.png" style="width:100%; height:100%; object-fit:contain; filter: drop-shadow(0 8px 8px rgba(0,0,0,0.4));" onerror="this.src='img/cherry.png';"></div>`; }
            wrap.setAttribute('data-state', stateKey);
        }
        if (isGrowing) {
            let percent = Math.min(100, Math.floor((age / 120000) * 100));
            let lbl = wrap.querySelector('.pct-lbl');
            if (lbl && lbl.innerText !== percent + '%') lbl.innerText = percent + '%';
        }
    } else {
        if (wrap.getAttribute('data-state') !== 'empty') { wrap.innerHTML = ''; wrap.setAttribute('data-state', 'empty'); }
    }
});

Array.from(container.children).forEach(child => { if (!activeIds.has(child.id)) child.remove(); });
}

function harvestItem(bed, clientX, clientY) {
if ((storage.cherry||0) + (storage.jam||0) >= getCapacity()) { showModal("Склад полон!", "Расширьте амбар или продайте товар на Рынке.", "Ок", closeModal); return; }
bed.item.harvestsLeft -= 1; if (bed.item.harvestsLeft <= 0) { bed.item.state = 'dry'; } else { bed.item.plantedAt = Date.now(); bed.item.state = 'growing'; }
localStorage.setItem('kz_soil_beds', JSON.stringify(soilBeds));

let yieldAmt = Math.floor(Math.random() * 2) + 3;
storage.cherry = (storage.cherry || 0) + yieldAmt; localStorage.setItem('kz_storage', JSON.stringify(storage)); updateStorageUI();

for(let i=0; i<3; i++) {
    setTimeout(() => {
        let flyEl = document.createElement('div'); flyEl.innerHTML = `<img src="img/cherry.png" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display='none';"><span style="display:none; font-size:30px;">🍒</span>`;
        flyEl.style.position = 'fixed'; flyEl.style.left = (clientX + (Math.random()*40-20)) + 'px'; flyEl.style.top = (clientY + (Math.random()*40-20)) + 'px'; flyEl.style.width = '40px'; flyEl.style.height = '40px'; flyEl.style.zIndex = '9999'; flyEl.style.transition = 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'; flyEl.style.pointerEvents = 'none'; flyEl.style.filter = 'drop-shadow(0 6px 6px rgba(0,0,0,0.4))'; document.body.appendChild(flyEl);
        setTimeout(() => { let target = document.getElementById('storage-count').getBoundingClientRect(); flyEl.style.left = (target.left) + 'px'; flyEl.style.top = (target.top) + 'px'; flyEl.style.transform = 'scale(0.3)'; flyEl.style.opacity = '0'; }, 50);
        setTimeout(() => flyEl.remove(), 600);
    }, i * 100);
}
let flash = document.createElement('div'); flash.style.position = 'fixed'; flash.style.left = (clientX-30) + 'px'; flash.style.top = (clientY-30) + 'px'; flash.style.width = '60px'; flash.style.height = '60px'; flash.style.background = '#FFF'; flash.style.borderRadius = '50%'; flash.style.zIndex = '9998'; flash.style.animation = 'popAnim 0.3s forwards'; flash.style.pointerEvents = 'none'; document.body.appendChild(flash); setTimeout(() => flash.remove(), 300); renderFarmItems();
}

setInterval(() => { 
if (document.getElementById('screen-farm').classList.contains('active')) {
    renderFarmItems();
    let modalVisible = document.getElementById('modal').style.display === 'flex';
    let mOpen = modalVisible && document.getElementById('modal-title')?.innerText === "🏪 РЫНОК"; if(mOpen) openMarket();
    let fOpen = modalVisible && document.getElementById('modal-title')?.innerText.includes("Завод варенья"); if(fOpen && buildings.find(b=>b.type==='factory')) openFactoryInfo(buildings.find(b=>b.type==='factory').id);
} 
}, 1000);

// === КОЛЛЕКЦИЯ, БЛОГ И МОДАЛКИ ===
function openVideo(type, title) { openVideoUrl(title, VIDEO_LINKS[type]); }
function openVideoUrl(title, url) { 
document.getElementById("video-modal").style.display = "flex"; 
document.getElementById("video-title").innerText = title; 
const container = document.getElementById("video-container"); 
if (url && url !== "" && url !== "СЮДА_ВСТАВЬ_ССЫЛКУ_НА_ВИДЕО_ДЛЯ_ЧЕРЕШНИ") { 
    container.innerHTML = `<iframe src="${url}" width="100%" height="100%" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen style="background-color:#000;"></iframe>`; 
} else { container.innerHTML = `<div style="padding:20px; text-align:center; color:#888;">Видео скоро появится!</div>`; } 
}
function closeVideo() { document.getElementById("video-modal").style.display = "none"; document.getElementById("video-container").innerHTML = ""; }

function renderCollection() { const container = document.getElementById('collection-container'); container.innerHTML = ''; const metadata = { plum: { title: "Садовая слива", req: "2 ур." }, cherry: { title: "Спелая вишня", req: "4 ур." }, strawberry: { title: "Капельный полив", req: "3 ур." }, bread: { title: "Откуда берутся продукты", req: "6 ур." }, tractor: { title: "Агротехнологии", req: "5 ур." } }; TYPES.forEach(type => { const card = document.createElement('div'), isUnlocked = unlockedItems.includes(type); const info = metadata[type] || { title: type, req: "уровни" }; card.className = `collection-card ${isUnlocked ? 'unlocked' : ''}`; card.innerHTML = `<div class="collection-icon">${getImgTag(type)}</div><div class="collection-title">${info.title}</div><div class="collection-status">${isUnlocked ? '▶ Смотреть ролик' : '🔒 ' + info.req}</div>`; if (isUnlocked) card.onclick = () => openVideo(type, info.title); container.appendChild(card); }); }
function renderBlog() { const container = document.getElementById('blog-container'); container.innerHTML = ''; MOCK_VK_POSTS.forEach(post => { container.innerHTML += `<div class="post-card"><div class="post-header"><div class="post-avatar"><span style="font-size: 24px;">🌱</span></div><div><div class="post-author">Код Земли</div><div class="post-date">${post.date}</div></div></div><div class="post-text">${post.text}</div><div class="post-footer"><div class="post-action">🤍 Лайк</div><div class="post-action">💬 Коммент</div></div></div>`; }); }
function showPreLevel(idx) { selectedLevelIndex = idx; let lvl = LEVELS_DATA[idx]; document.getElementById("prelevel-title").innerText = `Уровень ${lvl.id}`; document.getElementById("prelevel-icon").innerHTML = `<div style="width:100%;height:100%;">${getImgTag(lvl.targetItem)}</div>`; document.getElementById("prelevel-count").innerText = `${lvl.targetCount} шт.`; document.getElementById("prelevel-moves").innerText = `⏳ ${lvl.moves}`; selectedBoosters = { bomb: false, plane: false, moves: false }; updateBoosterUI(); document.getElementById("prelevel-modal").style.display = "flex"; }
function closePreLevel() { document.getElementById("prelevel-modal").style.display = "none"; }
function toggleBooster(type) { selectedBoosters[type] = !selectedBoosters[type]; updateBoosterUI(); }
function updateBoosterUI() { ['bomb', 'plane', 'moves'].forEach(type => { let el = document.getElementById(`boost-${type}`); if (selectedBoosters[type]) el.classList.add('selected'); else el.classList.remove('selected'); }); }
function startLevelFromModal() { let totalCost = 0; if (selectedBoosters.bomb) totalCost += BOOSTER_COSTS.bomb; if (selectedBoosters.plane) totalCost += BOOSTER_COSTS.plane; if (selectedBoosters.moves) totalCost += BOOSTER_COSTS.moves; if (coins >= totalCost) { addCoins(-totalCost); closePreLevel(); showScreen('screen-game'); initLevel(); } else { closePreLevel(); showModal("Мало монет 🪙", "Заработай монеты на уровнях.", "Понятно", () => { document.getElementById("prelevel-modal").style.display="flex"; }); } }
function addCoins(amount) { coins += amount; localStorage.setItem('kz_coins', coins); updateCoinsUI(); }
function updateCoinsUI() { document.querySelectorAll('.coin-val').forEach(el => el.innerText = coins); }
function checkDailyBonus() { let today = new Date().toDateString(); if (localStorage.getItem('kz_last_login') !== today) { localStorage.setItem('kz_last_login', today); setTimeout(() => { addCoins(150); showModal("Ежедневный бонус 🎁", "Держи монеты для старта фермы:\n\n+150 🪙", "Забрать", closeModal); }, 500); } }
function showScreen(screenId) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(screenId).classList.add('active'); if (screenId === 'screen-levels') { renderLevelsMap(); } if (screenId === 'screen-farm') { updateStorageUI(); renderFarmDrawer(); renderFarmItems(); setTimeout(updateCamera, 50); } if (screenId === 'screen-collection') { renderCollection(); } if (screenId === 'screen-blog') { renderBlog(); } }
function openBuildMenu() { document.getElementById('drawer-overlay').style.display = 'block'; setTimeout(() => document.getElementById('build-drawer').classList.add('open'), 10); }
function closeBuildMenu() { document.getElementById('build-drawer').classList.remove('open'); setTimeout(() => document.getElementById('drawer-overlay').style.display = 'none', 300); }
function renderLevelsMap() { const container = document.getElementById('levels-container'); container.innerHTML = ''; LEVELS_DATA.forEach((lvl, idx) => { const wrap = document.createElement('div'); const isCheckpoint = lvl.isCheckpoint || lvl.id % 10 === 0; wrap.className = `level-node-wrap ${isCheckpoint ? 'checkpoint' : ''}`; const isLocked = lvl.id > maxUnlockedLevel, isCompleted = lvl.id < maxUnlockedLevel, isCurrent = lvl.id === maxUnlockedLevel; let iconContent = isLocked ? '🔒' : lvl.id; if (isCheckpoint && !isLocked) iconContent = '▶️'; wrap.innerHTML = `<div class="level-node ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}"><div>${iconContent}</div>${!isLocked && !isCheckpoint ? `<div class="level-badge">${getImgTag(lvl.targetItem)}${lvl.targetCount}</div>` : ''}</div>`; if (!isLocked) wrap.onclick = () => showPreLevel(idx); container.appendChild(wrap); }); }
function getImgTag(name, special = null) { if (!name) return ""; let fallback = ICON[name] || SPECIAL_ICON[name] || "❓"; let html = `<img src="img/${name}.png" class="item-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span class="fallback-icon" style="display:none; width: 100%; height: 100%; align-items:center; justify-content:center;">${fallback}</span>`; if (special) { let specIcon = SPECIAL_ICON[special] || "✨"; html += `<div class="booster-badge" style="position:absolute; right:-4px; bottom:-4px; background:#FFF; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 4px rgba(0,0,0,0.4); z-index:10; border:1px solid #E0E0E0;">${specIcon}</div>`; } return html; }

// === ТРИ В РЯД (С ANTI-DEADLOCK) ===
function initLevel() { let lvl = LEVELS_DATA[selectedLevelIndex]; document.getElementById("game-level-indicator").innerText = `Уровень ${lvl.id}`; moves = lvl.moves; if (selectedBoosters.moves) moves += 5; collectedCount = 0; finished = false; busy = false; selected = null; quizUsed = false; document.getElementById("board").innerHTML = ""; createBoard(); updateUI(); }
function createBoard() { 
let attempts = 0;
do { 
    board = []; 
    for (let r = 0; r < SIZE; r++) { 
        let row = []; 
        for (let c = 0; c < SIZE; c++) { 
            let type; 
            do { type = TYPES[Math.floor(Math.random() * TYPES.length)]; } while ((c >= 2 && row[c-1].type === type && row[c-2].type === type) || (r >= 2 && board[r-1][c].type === type && board[r-2][c].type === type) || (r >= 1 && c >= 1 && board[r-1][c-1].type === type && board[r-1][c].type === type && row[c-1].type === type)); 
            row.push({ type: type, special: null, counted: false, isNew: false }); 
        } 
        board.push(row); 
    } 
    attempts++;
    if (attempts > 50) break;
} while (findAllMatches().length > 0 || !hasPossibleMoves()); 
if (selectedBoosters.bomb) board[Math.floor(Math.random() * SIZE)][Math.floor(Math.random() * SIZE)].special = "bomb"; 
if (selectedBoosters.plane) board[Math.floor(Math.random() * SIZE)][Math.floor(Math.random() * SIZE)].special = "plane"; 
}
function renderBoard() { const boardEl = document.getElementById("board"); if (boardEl.children.length === 0) { for (let r = 0; r < SIZE; r++) { for (let c = 0; c < SIZE; c++) { const cell = document.createElement("div"); cell.className = "cell"; cell.id = `cell-${r}-${c}`; cell.innerHTML = `<div class="cell-inner" id="inner-${r}-${c}"></div>`; cell.addEventListener('touchstart', (e) => { if (busy || finished) return; swipeStartX = e.touches[0].clientX; swipeStartY = e.touches[0].clientY; swipeR = r; swipeC = c; isSwiping = false; }, {passive: true}); cell.addEventListener('touchmove', (e) => { isSwiping = true; }, {passive: true}); cell.addEventListener('touchend', (e) => { if (busy || finished || swipeR === -1) return; let dx = e.changedTouches[0].clientX - swipeStartX; let dy = e.changedTouches[0].clientY - swipeStartY; if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) { isSwiping = true; let tr = swipeR, tc = swipeC; if (Math.abs(dx) > Math.abs(dy)) { dx > 0 ? tc++ : tc--; } else { dy > 0 ? tr++ : tr--; } if (tr >= 0 && tr < SIZE && tc >= 0 && tc < SIZE) { selected = null; renderBoard(); animateSwapAndCheck(swipeR, swipeC, tr, tc); } } setTimeout(() => isSwiping = false, 100); swipeR = -1; swipeC = -1; }); cell.onclick = (e) => { if (isSwiping) return; handleCellClick(r, c); }; boardEl.appendChild(cell); } } } for (let r = 0; r < SIZE; r++) { for (let c = 0; c < SIZE; c++) { const cell = document.getElementById(`cell-${r}-${c}`); const inner = document.getElementById(`inner-${r}-${c}`); if (selected && selected.r === r && selected.c === c) cell.classList.add("selected"); else cell.classList.remove("selected"); const item = board[r][c]; if (item) { let content = getImgTag(item.type, item.special); if (inner.innerHTML !== content) { inner.innerHTML = content; } inner.className = `cell-inner ${item.isNew ? 'drop-anim' : ''}`; inner.style.transform = ''; } else { inner.innerHTML = ''; inner.className = 'cell-inner'; } } } }
function updateUI() { let lvl = LEVELS_DATA[selectedLevelIndex]; document.getElementById("target-icon").innerHTML = `<div style="width: 100%; height: 100%;">${getImgTag(lvl.targetItem)}</div>`; document.getElementById("target-count").innerText = `${collectedCount}/${lvl.targetCount}`; document.getElementById("moves-label").innerText = `Ходы: ${moves}`; renderBoard(); }
function setMessage(text) { document.getElementById("message").innerText = text; }
function collectItem(item) { let lvl = LEVELS_DATA[selectedLevelIndex]; if (item && item.type === lvl.targetItem && !item.counted) { collectedCount++; item.counted = true; } }
function handleCellClick(r, c) { if (busy || finished) return; if (!selected) { selected = { r, c }; renderBoard(); setMessage(""); return; } if (selected.r === r && selected.c === c) { selected = null; renderBoard(); return; } if ((Math.abs(selected.r - r) + Math.abs(selected.c - c)) === 1) { let sr = selected.r, sc = selected.c; selected = null; renderBoard(); animateSwapAndCheck(sr, sc, r, c); } else { selected = { r, c }; renderBoard(); return; } }

function animateSwapAndCheck(r1, c1, r2, c2) {
busy = true; let inner1 = document.getElementById(`inner-${r1}-${c1}`); let inner2 = document.getElementById(`inner-${r2}-${c2}`); let dx = (c2 - c1) * 100, dy = (r2 - r1) * 100; if (inner1) { inner1.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'; inner1.style.transform = `translate(${dx}%, ${dy}%)`; } if (inner2) { inner2.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'; inner2.style.transform = `translate(${-dx}%, ${-dy}%)`; } 
setTimeout(() => { let temp = board[r1][c1]; board[r1][c1] = board[r2][c2]; board[r2][c2] = temp; let item1 = board[r1][c1], item2 = board[r2][c2]; let matches = findAllMatches(); if ((item1 && item1.special) || (item2 && item2.special)) { moves--; let toDestroy = new Set(); if (item1 && item1.special && item2 && item2.special) { toDestroy.add(`${r1},${c1}`); toDestroy.add(`${r2},${c2}`); activateSpecial(r1, c1, toDestroy); activateSpecial(r2, c2, toDestroy); } else if (item1 && item1.special) { toDestroy.add(`${r1},${c1}`); activateSpecial(r1, c1, toDestroy); } else { toDestroy.add(`${r2},${c2}`); activateSpecial(r2, c2, toDestroy); } explodeCells(toDestroy, null); toDestroy.forEach(coord => { let parts = coord.split(','); let el = document.getElementById(`inner-${parts[0]}-${parts[1]}`); if (el) el.classList.add('pop'); }); setTimeout(() => { toDestroy.forEach(coord => { let parts = coord.split(','); let r = parseInt(parts[0]), c = parseInt(parts[1]); if (board[r][c]) { collectItem(board[r][c]); board[r][c] = null; } }); renderBoard(); setTimeout(() => dropAndFill(), 50); }, 300); return; } if (matches.length === 0) { if (inner1) inner1.style.transform = `translate(0px, 0px)`; if (inner2) inner2.style.transform = `translate(0px, 0px)`; setTimeout(() => { temp = board[r1][c1]; board[r1][c1] = board[r2][c2]; board[r2][c2] = temp; renderBoard(); let el1 = document.getElementById(`cell-${r1}-${c1}`); let el2 = document.getElementById(`cell-${r2}-${c2}`); if(el1) el1.classList.add('error-anim'); if(el2) el2.classList.add('error-anim'); setTimeout(() => { if(el1) el1.classList.remove('error-anim'); if(el2) el2.classList.remove('error-anim'); }, 300); busy = false; setMessage("Нет комбинации"); }, 250); } else { moves--; setMessage(""); processMatches(r1, c1, r2, c2, matches); } }, 250); 
}

function explodeCells(coordsSet, safeCoordStr) { let newlyAdded = true; let processedSpecials = new Set(); while (newlyAdded) { newlyAdded = false; let currentCoords = Array.from(coordsSet); for (let coord of currentCoords) { if (coord === safeCoordStr) continue; if (processedSpecials.has(coord)) continue; let parts = coord.split(','); let r = parseInt(parts[0]), c = parseInt(parts[1]); let item = board[r][c]; if (item && item.special) { processedSpecials.add(coord); let beforeSize = coordsSet.size; activateSpecial(r, c, coordsSet); if (coordsSet.size > beforeSize) newlyAdded = true; } } } }
function processMatches(r1, c1, r2, c2, matches) { let toDestroy = new Set(); let specialCoords = null; if (r1 !== null) { specialCoords = checkAndCreateSpecial(r1, c1, matches); if (!specialCoords) specialCoords = checkAndCreateSpecial(r2, c2, matches); } let safeCoordStr = specialCoords ? `${specialCoords.r},${specialCoords.c}` : null; matches.forEach(m => { let coordStr = `${m.r},${m.c}`; if (coordStr === safeCoordStr) return; toDestroy.add(coordStr); }); explodeCells(toDestroy, safeCoordStr); toDestroy.forEach(coord => { let parts = coord.split(','); let r = parseInt(parts[0]), c = parseInt(parts[1]); let inner = document.getElementById(`inner-${r}-${c}`); if (inner) inner.classList.add('pop'); }); setTimeout(() => { toDestroy.forEach(coord => { let parts = coord.split(','); let r = parseInt(parts[0]), c = parseInt(parts[1]); if (board[r][c]) { collectItem(board[r][c]); board[r][c] = null; } }); renderBoard(); setTimeout(() => dropAndFill(), 50); }, 300); }

function dropAndFill() { 
for (let c = 0; c < SIZE; c++) { let remaining = []; for (let r = SIZE - 1; r >= 0; r--) { if (board[r][c] !== null) remaining.push(board[r][c]); } let writeRow = SIZE - 1; for (let i = 0; i < remaining.length; i++) { board[writeRow][c] = remaining[i]; writeRow--; } while (writeRow >= 0) { board[writeRow][c] = { type: TYPES[Math.floor(Math.random() * TYPES.length)], special: null, counted: false, isNew: true }; writeRow--; } } 
renderBoard(); 
setTimeout(() => { 
    for (let r = 0; r < SIZE; r++) { for (let c = 0; c < SIZE; c++) { if (board[r][c]) board[r][c].isNew = false; } } 
    let cascadeMatches = findAllMatches(); 
    if (cascadeMatches.length > 0) { 
        processMatches(null, null, null, null, cascadeMatches); 
    } else { 
        checkGameEnd(); 
        if (!finished) {
            if (!hasPossibleMoves()) {
                shuffleBoard();
            } else {
                busy = false; 
            }
        }
    } 
}, 350); 
}

function getCluster(r, c, matches) { let type = board[r][c]?.type; if (!type) return []; let cluster = []; let queue = [{r,c}]; let visited = new Set(); visited.add(`${r},${c}`); while(queue.length > 0) { let curr = queue.shift(); cluster.push(curr); let adj = matches.filter(m => board[m.r][m.c]?.type === type && !visited.has(`${m.r},${m.c}`) && (Math.abs(m.r - curr.r) + Math.abs(m.c - curr.c) === 1)); adj.forEach(a => { visited.add(`${a.r},${a.c}`); queue.push(a); }); } return cluster; }
function checkAndCreateSpecial(r, c, matches) { if (r === null || c === null || matches.length < 4) return null; let type = board[r][c]?.type; if (!type) return null; let inMatch = matches.some(m => m.r === r && m.c === c); if (!inMatch) return null; let cluster = getCluster(r, c, matches); if (cluster.length < 4) return null; let rowCount = cluster.filter(m => m.r === r).length; let colCount = cluster.filter(m => m.c === c).length; if (rowCount >= 5 || colCount >= 5 || (rowCount >= 3 && colCount >= 3)) { board[r][c] = { type: type, special: "bomb", counted: false }; return { r, c }; } let minR = Math.min(...cluster.map(m=>m.r)), maxR = Math.max(...cluster.map(m=>m.r)); let minC = Math.min(...cluster.map(m=>m.c)), maxC = Math.max(...cluster.map(m=>m.c)); if (maxR - minR === 1 && maxC - minC === 1 && cluster.length === 4) { board[r][c] = { type: type, special: "plane", counted: false }; return { r, c }; } if (rowCount >= 4) { board[r][c] = { type: type, special: "arrowV", counted: false }; return { r, c }; } if (colCount >= 4) { board[r][c] = { type: type, special: "arrowH", counted: false }; return { r, c }; } return null; }
function activateSpecial(r, c, toDestroy) { let item = board[r][c]; if (!item || !item.special) return; let spec = item.special; if (spec === "arrowH") { for (let col = 0; col < SIZE; col++) if (board[r][col]) toDestroy.add(`${r},${col}`); } else if (spec === "arrowV") { for (let row = 0; row < SIZE; row++) if (board[row][c]) toDestroy.add(`${row},${c}`); } else if (spec === "bomb") { for (let dr = -2; dr <= 2; dr++) { for (let dc = -2; dc <= 2; dc++) { let nr = r + dr, nc = c + dc; if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc]) { toDestroy.add(`${nr},${nc}`); } } } } else if (spec === "plane") { for(let dr=-1; dr<=1; dr++) { for(let dc=-1; dc<=1; dc++) { if(r+dr>=0 && r+dr<SIZE && c+dc>=0 && c+dc<SIZE && board[r+dr][c+dc]) toDestroy.add(`${r+dr},${c+dc}`); } } let targets = []; let lvl = LEVELS_DATA[selectedLevelIndex]; for(let rr=0; rr<SIZE; rr++){ for(let cc=0; cc<SIZE; cc++){ if (board[rr][cc] && board[rr][cc].type === lvl.targetItem && !toDestroy.has(`${rr},${cc}`)) targets.push(`${rr},${cc}`); } } if (targets.length > 0) toDestroy.add(targets[Math.floor(Math.random()*targets.length)]); else { let tr = Math.floor(Math.random() * SIZE), tc = Math.floor(Math.random() * SIZE); if (board[tr][tc]) toDestroy.add(`${tr},${tc}`); } } }
function findAllMatches() { let matchedCoords = new Set(); for (let r = 0; r < SIZE; r++) { let count = 1; for (let c = 0; c < SIZE; c++) { let cur = board[r][c]?.type, next = (c + 1 < SIZE) ? board[r][c+1]?.type : null; if (cur && cur === next) count++; else { if (count >= 3) { for (let i = 0; i < count; i++) matchedCoords.add(`${r},${c - i}`); } count = 1; } } } for (let c = 0; c < SIZE; c++) { let count = 1; for (let r = 0; r < SIZE; r++) { let cur = board[r][c]?.type, next = (r + 1 < SIZE) ? board[r+1][c]?.type : null; if (cur && cur === next) count++; else { if (count >= 3) { for (let i = 0; i < count; i++) matchedCoords.add(`${r - i},${c}`); } count = 1; } } } for (let r = 0; r < SIZE - 1; r++) { for (let c = 0; c < SIZE - 1; c++) { let t = board[r][c]?.type; if (t && board[r+1][c]?.type === t && board[r][c+1]?.type === t && board[r+1][c+1]?.type === t) { matchedCoords.add(`${r},${c}`); matchedCoords.add(`${r+1},${c}`); matchedCoords.add(`${r},${c+1}`); matchedCoords.add(`${r+1},${c+1}`); } } } let res = []; matchedCoords.forEach(item => { let p = item.split(","); res.push({ r: parseInt(p[0]), c: parseInt(p[1]) }); }); return res; }

// АНТИ-ДЕДЛОК (Проверка возможных ходов)
function hasPossibleMoves() {
for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
        if (board[r][c] && board[r][c].special) return true; // Спец-фишку можно сдвинуть всегда
        if (c + 1 < SIZE) {
            let t = board[r][c]; board[r][c] = board[r][c+1]; board[r][c+1] = t;
            let m = findAllMatches();
            t = board[r][c]; board[r][c] = board[r][c+1]; board[r][c+1] = t;
            if (m.length > 0) return true;
        }
        if (r + 1 < SIZE) {
            let t = board[r][c]; board[r][c] = board[r+1][c]; board[r+1][c] = t;
            let m = findAllMatches();
            t = board[r][c]; board[r][c] = board[r+1][c]; board[r+1][c] = t;
            if (m.length > 0) return true;
        }
    }
}
return false;
}

function shuffleBoard() {
setMessage("Нет ходов! Перемешивание...");
busy = true;
setTimeout(() => {
    let attempts = 0;
    let items = [];
    for(let r=0; r<SIZE; r++) for(let c=0; c<SIZE; c++) items.push(board[r][c]);
    do {
        items.sort(() => Math.random() - 0.5);
        let idx = 0;
        for(let r=0; r<SIZE; r++) for(let c=0; c<SIZE; c++) board[r][c] = items[idx++];
        attempts++;
        if (attempts > 50) { createBoard(); break; } // fallback
    } while(findAllMatches().length > 0 || !hasPossibleMoves());
    
    renderBoard();
    setTimeout(() => { if(!finished) { busy = false; setMessage("Свайпни фрукты!"); } }, 500);
}, 800);
}

// === ВИКТОРИНА И ОКОНЧАНИЕ ИГРЫ ===
let currentQuizContext = null;
const QUIZ_LEVEL_FAIL = [ 
{ q: "Как называется профессия человека, выращивающего урожай?", a: ["Агроном", "Ветеринар", "Зоотехник"], correct: 0 },
{ q: "Для чего нужен капельный полив?", a: ["Охлаждать растения", "Экономить воду", "Смывать вредителей"], correct: 1 } 
];

function checkGameEnd() { 
updateUI(); let lvl = LEVELS_DATA[selectedLevelIndex]; 
if (collectedCount >= lvl.targetCount) { 
    finished = true; addCoins(50); 
    if (selectedLevelIndex + 1 >= maxUnlockedLevel) { 
        maxUnlockedLevel = Math.min(selectedLevelIndex + 2, LEVELS_DATA.length); 
        localStorage.setItem('kz_max_level', maxUnlockedLevel); 
    } 
    let isCheckpoint = lvl.isCheckpoint || lvl.id % 10 === 0; let rewardText = "Заработано: 50 🪙"; 
    let hasCollectionReward = lvl.reward && !unlockedItems.includes(lvl.reward); 
    if (hasCollectionReward) { unlockedItems.push(lvl.reward); localStorage.setItem('kz_unlocked', JSON.stringify(unlockedItems)); rewardText += "\nОткрыта новая карточка коллекции!"; document.getElementById("reward-box").style.display = "flex"; document.getElementById("reward-box").innerHTML = `<div style="width: 100%; height: 100%;">${getImgTag(lvl.reward)}</div>`; } else { document.getElementById("reward-box").style.display = "none"; } 
    if (isCheckpoint) { showModal("Сюжетный чекпоинт!", "Ты дошел до важного этапа.\n" + rewardText, "Смотреть видео", () => { closeModal(); showScreen('screen-levels'); }); } else { showModal("Уровень пройден!", `Отличная работа!\n${rewardText}`, "К уровню", () => { closeModal(); showScreen('screen-levels'); }); } 
} else if (moves <= 0) { 
    finished = true; document.getElementById("reward-box").style.display = "none"; 
    if (!quizUsed) { showLevelFailQuiz(); } else { showModal("Ходы закончились", "Попробуй еще раз!", "Заново", () => { closeModal(); initLevel(); }); }
} 
}

function showLevelFailQuiz() {
currentQuizContext = 'level_fail'; 
const q = QUIZ_LEVEL_FAIL[Math.floor(Math.random() * QUIZ_LEVEL_FAIL.length)];
document.getElementById("quiz-modal-title").innerText = "Второй шанс! 🌱";
document.getElementById("quiz-modal-desc").innerHTML = "У тебя кончились ходы. Ответь на вопрос правильно, чтобы получить <b style='color:#436932;'>+3 хода</b> бесплатно!";
document.getElementById("quiz-close-btn").innerText = "Сдаться"; 
document.getElementById("quiz-q").innerText = q.q;

const opts = document.getElementById("quiz-options"); opts.innerHTML = "";
q.a.forEach((ans, i) => { 
    let b = document.createElement("button"); b.className = "btn"; b.style.marginBottom = "8px"; b.style.backgroundColor = "#F5F5F5"; b.style.color = "#333"; b.style.boxShadow = "none"; b.style.border = "1px solid #CCC"; b.innerText = ans; 
    b.onclick = () => handleQuizAnswer(i === q.correct); opts.appendChild(b); 
});
document.getElementById("quiz-modal").style.display = "flex";
}

function handleQuizAnswer(isCorrect) {
document.getElementById("quiz-modal").style.display = "none";
if (currentQuizContext === 'level_fail') {
    quizUsed = true;
    if (isCorrect) { finished = false; busy = false; moves += 3; updateUI(); setMessage("Правильно! +3 хода"); } 
    else { showModal("Неверно 😔", "Правильный ответ был другой. Ходы закончились.", "Заново", () => { closeModal(); initLevel(); }); }
}
}

function failQuiz() { document.getElementById("quiz-modal").style.display = "none"; showModal("Сдался?", "Ходы закончились. Попробуй еще раз!", "Заново", () => { closeModal(); initLevel(); }); }

function showModal(title, text, btnText, callback, secondaryBtnText = null, secondaryCallback = null) { 
document.getElementById("modal-title").innerText = title; 
document.getElementById("modal-text").innerHTML = text; 
let btn1 = document.getElementById("modal-btn"); btn1.innerText = btnText; btn1.onclick = callback; 
let btn2 = document.getElementById("modal-btn-secondary"); if (secondaryBtnText) { btn2.style.display = "block"; btn2.innerText = secondaryBtnText; btn2.onclick = secondaryCallback ? secondaryCallback : () => { closeModal(); }; } else { btn2.style.display = "none"; } 
document.getElementById("modal").style.display = "flex"; 
}

function closeModal() { 
document.getElementById("modal").style.display = "none"; 
document.getElementById("modal-title").innerText = "..."; 
}

updateCoinsUI(); checkDailyBonus();
