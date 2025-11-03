// --- Kezdő adatok ---
const initialSampleNames = ['Anna','Béla','Csaba','Dorina','Endre'];
const initialCountries = [
  { name: 'Germany', strength: 9 }, { name: 'Soviet Union', strength: 9 }, 
  { name: 'United States', strength: 8 }, { name: 'United Kingdom', strength: 7 },
  { name: 'Japan', strength: 7 }, { name: 'France', strength: 6 }, 
  { name: 'Italy', strength: 6 }, { name: 'China', strength: 5 },
  { name: 'Canada', strength: 4 }, { name: 'Australia', strength: 3 },
  { name: 'India', strength: 3 }, { name: 'Spain', strength: 4 }, 
  { name: 'Poland', strength: 5 }, { name: 'Romania', strength: 4 },
  { name: 'Hungary', strength: 4 }, { name: 'Czechoslovakia', strength: 3 },
  { name: 'Yugoslavia', strength: 3 }, { name: 'Greece', strength: 2 },
  { name: 'Turkey', strength: 3 }, { name: 'Brazil', strength: 2 },
  { name: 'Mexico', strength: 2 }, { name: 'Argentina', strength: 2 },
  { name: 'South Africa', strength: 2 }, { name: 'Portugal', strength: 2 },
  { name: 'Sweden', strength: 3 }, { name: 'Finland', strength: 2 },
  { name: 'Bulgaria', strength: 2 }, { name: 'Netherlands', strength: 3 },
  { name: 'Belgium', strength: 2 }, { name: 'Persia', strength: 2 }
];

let players = [];
let countries = []; 
let editingPlayerIndex = -1; 
let editingCountryIndex = -1; 

let selected1 = []; 
let selected2 = []; 
let selC1 = [];     
let selC2 = [];     
let tNames = [];    
let playerAssignmentCounter = 0; 
let countriesEligibleForDraft = []; 
let cnt = 0; 

let balanceCountriesEnabled = true; 
let countryStrengthSums = [0, 0];
let currentlyZoomedGridWrapper = null;


function FNV1aHash(str) { 
    let hash = 0x811c9dc5; 
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0; 
}

function updateListCounts() {
    const playerListCountEl = document.getElementById('playerListCount');
    const countryListCountEl = document.getElementById('countryListCount');
    // ÚJ: Számláló az "Országok" box főcímében is
    const countryBoxCountEl = document.getElementById('countryBoxCount');


    if (playerListCountEl) playerListCountEl.textContent = `(${players.length})`;
    if (countryListCountEl) countryListCountEl.textContent = `(${countries.length})`;
    if (countryBoxCountEl) countryBoxCountEl.textContent = `(${countries.length})`; // Frissítjük ezt is
}

function updateAssignmentCounts() {
    const t1pc = document.getElementById('team1PlayerCount');
    const t2pc = document.getElementById('team2PlayerCount');
    const t1cc = document.getElementById('team1CountryCount');
    const t2cc = document.getElementById('team2CountryCount');

    if (t1pc) t1pc.textContent = `(${selected1.length})`;
    if (t2pc) t2pc.textContent = `(${selected2.length})`;
    if (t1cc) t1cc.textContent = `(${selC1.length}/9)`;
    if (t2cc) t2cc.textContent = `(${selC2.length}/9)`;
}

function updateLastPicked(type, name) { 
    if (type === 'player') {
        const el = document.getElementById('lastPickedPlayer');
        if (el) el.textContent = name || '-';
    } else if (type === 'country') {
        const el = document.getElementById('lastPickedCountry');
        if (el) el.textContent = name || '-';
    }
}

function initializeApp() {
    players = initialSampleNames.map(n => ({ name: n, skill: Math.ceil(Math.random() * 10) }));
    countries = initialCountries.map(c => ({...c})); 

    renderPlayersList(); 
    renderCountriesList(); 
    updateListCounts(); 

    initPlayerBaskets();
    ['countrySlots1','countrySlots2'].forEach(initCountrySlots);
    updateAssignmentCounts(); 
    
    drawDynamicTeamWheel();
    drawDynamicCountryWheel();

    selected1 = []; selected2 = []; selC1 = []; selC2 = [];
    tNames = []; 
    playerAssignmentCounter = 0; 
    countriesEligibleForDraft = []; 
    cnt = 0;
    countryStrengthSums = [0, 0]; 
    const balanceCheckbox = document.getElementById('balanceCountriesByStrength');
    if (balanceCheckbox) {
        balanceCountriesEnabled = balanceCheckbox.checked;
    }

    window.teamRot = 0; window.countryRot = 0;
    
    const spinTeamBtn = document.getElementById('spinTeamBtn');
    const spinCountryBtn = document.getElementById('spinCountryBtn');
    if (spinTeamBtn) spinTeamBtn.disabled = players.length === 0;
    if (spinCountryBtn) spinCountryBtn.disabled = countries.length === 0;
    
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    if (addPlayerBtn) addPlayerBtn.textContent = 'Hozzáadás';
    editingPlayerIndex = -1;
    const playerNameInput = document.getElementById('playerName');
    const playerSkillInput = document.getElementById('playerSkill');
    if (playerNameInput) playerNameInput.value = '';
    if (playerSkillInput) playerSkillInput.value = '';

    const addCountryBtn = document.getElementById('addCountryBtn');
    if (addCountryBtn) addCountryBtn.textContent = 'Hozzáadás'; 
    editingCountryIndex = -1; 
    const countryNameInput = document.getElementById('countryName');
    const countryStrengthInput = document.getElementById('countryStrength');
    if (countryNameInput) countryNameInput.value = ''; 
    if (countryStrengthInput) countryStrengthInput.value = ''; 

    updateLastPicked('player', '-'); 
    updateLastPicked('country', '-');

    const spinResultOverlay = document.getElementById('spinResultOverlay');
    const spunItemDisplay = document.getElementById('spunItemDisplay');
    const nextSpinStepButton = document.getElementById('nextSpinStepButton');
    if(spinResultOverlay) spinResultOverlay.style.display = 'none';
    if(spunItemDisplay) spunItemDisplay.style.display = 'none';
    if(nextSpinStepButton) nextSpinStepButton.style.display = 'none';

    unzoomCurrentlyZoomedGrid(); 
}

function resetAllDraft() {
    if (!confirm("Biztosan teljesen visszaállítasz mindent az alapértelmezett értékekre (beleértve a játékos és ország listákat is)?")) {
        return;
    }
    initializeApp(); 
    alert("Minden sorsolási adat és lista visszaállítva az alapértelmezettre!");
}


function clearWheel(wheelId) {
    const canvas = document.getElementById(wheelId);
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function renderPlayersList(){ 
  const ul = document.getElementById('playersList');
  if (!ul) return;
  ul.innerHTML = '';
  players.forEach((player, index)=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${player.name} (${player.skill})</span> 
                    <div class="player-actions">
                        <button class="edit-btn" onclick="editPlayer(${index})" title="Szerkesztés">✏️</button>
                        <button class="remove-btn" onclick="removePlayer(${index})" title="Törlés">🗑️</button>
                    </div>`;
    ul.appendChild(li);
  });
  updateListCounts(); 
}

function renderCountriesList(){ 
  const ul = document.getElementById('countriesList');
  if (!ul) return;
  ul.innerHTML = '';
  countries.forEach((country, index) =>{ 
    const li = document.createElement('li');
    li.innerHTML = `<span>${country.name} (Erő: ${country.strength})</span> 
                    <div class="country-actions">
                        <button class="edit-btn" onclick="editCountry(${index})" title="Szerkesztés">✏️</button>
                        <button class="remove-btn" onclick="removeCountry(${index})" title="Törlés">🗑️</button>
                    </div>`;
    ul.appendChild(li);
  });
  updateListCounts(); 
}

function handlePlayerSubmit(){ 
    const nInput = document.getElementById('playerName');
    const sInput = document.getElementById('playerSkill');
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    if (!nInput || !sInput || !addPlayerBtn) return;

    const name = nInput.value.trim();
    const skill = +sInput.value;

    if (!name || skill < 1 || skill > 10) {
        alert('Adj meg egy nevet és egy 1–10 közötti képesség értéket!');
        return;
    }

    if (editingPlayerIndex > -1) { 
        if (players.some((p, idx) => p.name.toLowerCase() === name.toLowerCase() && idx !== editingPlayerIndex)) {
            alert("Ez a játékosnév már létezik!");
            return;
        }
        players[editingPlayerIndex].name = name;
        players[editingPlayerIndex].skill = skill;
        editingPlayerIndex = -1; 
        addPlayerBtn.textContent = 'Hozzáadás';
    } else { 
        if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert("Ez a játékos már szerepel a listán!");
            return;
        }
        players.push({ name, skill });
    }

    renderPlayersList(); 
    drawDynamicTeamWheel(); 
    nInput.value = '';
    sInput.value = '';
    const spinBtn = document.getElementById('spinTeamBtn');
    if(spinBtn) spinBtn.disabled = players.length === 0;
}

function editPlayer(index) {
    if (!players[index]) return;
    const player = players[index];
    const nInput = document.getElementById('playerName');
    const sInput = document.getElementById('playerSkill');
    const addPlayerBtn = document.getElementById('addPlayerBtn');

    if (nInput) nInput.value = player.name;
    if (sInput) sInput.value = player.skill;
    editingPlayerIndex = index;
    if (addPlayerBtn) addPlayerBtn.textContent = 'Módosítás mentése';
    if (nInput) nInput.focus(); 
}

function removePlayer(index) {
    if (!players[index]) return; 
    if (!confirm(`Biztosan törlöd ${players[index].name} játékost?`)) return;
    
    players.splice(index, 1);
    renderPlayersList();
    drawDynamicTeamWheel();

    if (editingPlayerIndex === index) { 
        editingPlayerIndex = -1;
        const nInput = document.getElementById('playerName');
        const sInput = document.getElementById('playerSkill');
        const addPlayerBtn = document.getElementById('addPlayerBtn');
        if (nInput) nInput.value = '';
        if (sInput) sInput.value = '';
        if (addPlayerBtn) addPlayerBtn.textContent = 'Hozzáadás';
    } else if (editingPlayerIndex > index) {
        editingPlayerIndex--;
    }
    const spinBtn = document.getElementById('spinTeamBtn');
    if(spinBtn) spinBtn.disabled = players.length === 0;
}

function handleCountrySubmit() {
    const nInput = document.getElementById('countryName');
    const sInput = document.getElementById('countryStrength'); 
    const addCountryBtn = document.getElementById('addCountryBtn');
    if (!nInput || !sInput || !addCountryBtn) return;

    const name = nInput.value.trim();
    const strength = +sInput.value; 

    if (!name || strength < 1 || strength > 10) { 
        alert('Írj be egy országnevet és egy 1-10 közötti erősséget!');
        return;
    }

    const countryData = { name, strength };

    if (editingCountryIndex > -1) { 
        if (countries.some((c, idx) => c.name.toLowerCase() === name.toLowerCase() && idx !== editingCountryIndex)) {
            alert("Ez az országnév már létezik!");
            return;
        }
        countries[editingCountryIndex] = countryData;
        editingCountryIndex = -1;
        addCountryBtn.textContent = 'Hozzáadás';
    } else { 
        if (countries.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            alert("Ez az ország már szerepel a listán!");
            return;
        }
        countries.push(countryData);
    }
    renderCountriesList();
    drawDynamicCountryWheel();
    nInput.value = '';
    sInput.value = ''; 
    const spinBtn = document.getElementById('spinCountryBtn');
    if(spinBtn) spinBtn.disabled = countries.length === 0;
}

function editCountry(index) { 
    if(!countries[index]) return;
    const country = countries[index]; 
    const nInput = document.getElementById('countryName');
    const sInput = document.getElementById('countryStrength');
    const addCountryBtn = document.getElementById('addCountryBtn');

    if (nInput) nInput.value = country.name;
    if (sInput) sInput.value = country.strength; 
    editingCountryIndex = index;
    if (addCountryBtn) addCountryBtn.textContent = 'Módosítás mentése';
    if (nInput) nInput.focus();
}

function removeCountry(index) { 
    if (!countries[index]) return;
    if (!confirm(`Biztosan törlöd ${countries[index].name} országot?`)) return;

    countries.splice(index, 1);
    renderCountriesList();
    drawDynamicCountryWheel();

    if (editingCountryIndex === index) {
        editingCountryIndex = -1;
        const nInput = document.getElementById('countryName');
        const sInput = document.getElementById('countryStrength');
        const addCountryBtn = document.getElementById('addCountryBtn');
        if (nInput) nInput.value = '';
        if (sInput) sInput.value = '';
        if (addCountryBtn) addCountryBtn.textContent = 'Hozzáadás';
    } else if (editingCountryIndex > index) {
        editingCountryIndex--;
    }
    const spinBtn = document.getElementById('spinCountryBtn');
    if (spinBtn) spinBtn.disabled = countries.length === 0;
}

function drawDynamicTeamWheel() {
    if (tNames.length === 0) { 
        drawWheel(players.map(p => p.name), 'teamWheel');
    }
}
function drawDynamicCountryWheel() {
    if (countriesEligibleForDraft.length === 0) { 
        drawWheel(countries.map(c => c.name), 'countryWheel'); 
    }
}

function initCountrySlots(id){ 
  const c = document.getElementById(id);
  if(c) {
    c.innerHTML = ''; 
    for(let i=0;i<9;i++){
        const cell = document.createElement('div');
        cell.className = 'basket-cell';
        c.appendChild(cell);
    }
  }
}
function initPlayerBaskets() { 
    const pb1 = document.getElementById('playerBasket1');
    const pb2 = document.getElementById('playerBasket2');
    if(pb1) pb1.innerHTML = '';
    if(pb2) pb2.innerHTML = '';
}

// --- Rács zoomoló/kicsinyítő függvények ---
function zoomGridWrapper(wrapperElement) {
    if (currentlyZoomedGridWrapper && currentlyZoomedGridWrapper !== wrapperElement) {
        unzoomCurrentlyZoomedGrid(); 
    }
    if (wrapperElement) {
        wrapperElement.classList.add('zoomed');
        document.body.classList.add('grid-zoomed-active'); 
        currentlyZoomedGridWrapper = wrapperElement;
        document.addEventListener('keydown', handleEscForGridZoom);
    }
}

function unzoomCurrentlyZoomedGrid() {
    if (currentlyZoomedGridWrapper) {
        currentlyZoomedGridWrapper.classList.remove('zoomed');
        currentlyZoomedGridWrapper = null;
    }
    document.body.classList.remove('grid-zoomed-active');
    document.removeEventListener('keydown', handleEscForGridZoom);
}

function handleEscForGridZoom(event) {
    if (event.key === 'Escape') {
        unzoomCurrentlyZoomedGrid();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp(); 
    const resetBtn = document.getElementById('resetAllBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetAllDraft);
    
    const balanceCheckbox = document.getElementById('balanceCountriesByStrength');
    if(balanceCheckbox) {
        balanceCountriesEnabled = balanceCheckbox.checked; 
        balanceCheckbox.addEventListener('change', (event) => {
            balanceCountriesEnabled = event.target.checked;
        });
    }

    const nextButton = document.getElementById('nextSpinStepButton');
    if (nextButton) {
        nextButton.addEventListener('click', function() { 
            const data = this._unzoomData; 
            if (!data) { return; }

            const spinResultOverlay = document.getElementById('spinResultOverlay');
            if(spinResultOverlay) spinResultOverlay.style.display = 'none'; 
            if (data.spunItemDisplayElement) data.spunItemDisplayElement.style.display = 'none';
            this.style.display = 'none'; 

            if (data.containerElement) data.containerElement.classList.remove('zoomed');

            if (data.canvasElement) {
                data.canvasElement.width = data.originalCanvasWidth;
                data.canvasElement.height = data.originalCanvasHeight;
            }

            if (data.wheelId === 'teamWheel') {
                if (data.namesArrStillToPickFrom.length === 0) { 
                    drawDynamicTeamWheel(); 
                } else {
                    drawWheel(data.namesArrStillToPickFrom, data.wheelId); 
                }
            } else { 
                drawWheel(countries.map(c => c.name), data.wheelId); 
            }

            const mainSpinBtn = document.getElementById(data.mainSpinBtnId);
            if (mainSpinBtn) mainSpinBtn.disabled = data.namesArrStillToPickFrom.length === 0;
            
            this._unzoomData = null; 
        });
    }

    document.querySelectorAll('.grid-zoom-btn').forEach(button => {
        button.addEventListener('click', function() {
            const wrapperIdToZoom = this.dataset.targetwrapper; 
            const wrapperElement = document.getElementById(wrapperIdToZoom);
            if (wrapperElement) {
                if (wrapperElement.classList.contains('zoomed')) {
                    unzoomCurrentlyZoomedGrid();
                } else {
                    zoomGridWrapper(wrapperElement);
                }
            }
        });
    });
});

function shuffle(a){ return a.slice().sort(()=>Math.random()-0.5); }

function drawWheel(namesArr, wheelId){
  const c   = document.getElementById(wheelId),
        ctx = c.getContext('2d'),
        w   = c.width,  
        h   = c.height, 
        cx  = w/2, cy = h/2,
        r   = Math.min(w,h)/2 - (w / 28); 

  if (!c || !ctx) { return; }
  
  ctx.clearRect(0,0,w,h); 
  if (namesArr.length === 0) {
    return; 
  }
  const seg = 2*Math.PI / namesArr.length; 

  const baseFontSize = Math.max(8, Math.min(16, Math.floor(w / 30))); 
  const textRadiusOffset = r * 0.40; 
  const lineWidth = Math.max(1, Math.floor(w / 150)); 

  namesArr.forEach((nmStr,i)=>{ 
    const nameString = String(nmStr); 
    const startAngle = i * seg;
    const endAngle = startAngle + seg;
    const midAngleRad = startAngle + seg / 2; 

    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,endAngle);
    ctx.closePath();

    const hue = FNV1aHash(nameString) % 360;
    ctx.fillStyle = `hsl(${hue}, 75%, 40%)`; 
    
    ctx.fill();
    ctx.strokeStyle='#3b2e1a'; 
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy); 
    ctx.rotate(midAngleRad); 
    
    const textX = r - textRadiusOffset; 
    const textY = 0;
    let textToDraw = nameString; 
    const maxTextLength = Math.max(7, Math.floor(w / 40)); 
    if (textToDraw.length > maxTextLength) { 
        textToDraw = textToDraw.substring(0, maxTextLength - 2) + "..";
    }
    
    if (midAngleRad > Math.PI / 2 && midAngleRad < 3 * Math.PI / 2) {
        ctx.translate(textX, textY); 
        ctx.rotate(Math.PI); 
        ctx.translate(-textX, -textY); 
    }

    ctx.fillStyle='#f5e6a6'; 
    ctx.font=`bold ${baseFontSize}px sans-serif`; 
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(textToDraw, textX, textY); 
    ctx.restore();
  });
}

function flyToSlot(text, containerId, slotIndexOrMinusOne, wheelId){ 
  const f = document.createElement('div');
  f.className='flyer'; f.textContent=text;
  document.body.appendChild(f);

  const wheelContainer = document.getElementById(wheelId+'Container');
  if (!wheelContainer) {
      if (f.parentNode) document.body.removeChild(f); return;
  }
  const pointerElement = wheelContainer.querySelector('.pointer');
  if (!pointerElement) {
      if (f.parentNode) document.body.removeChild(f); return;
  }
  
  const ptrRect = pointerElement.getBoundingClientRect();
  const flyerRect = f.getBoundingClientRect(); 
  const startX = ptrRect.left + ptrRect.width / 2 - flyerRect.width / 2 ; 
  const startY = ptrRect.top + ptrRect.height / 2 - flyerRect.height / 2;
  f.style.left = `${startX}px`; 
  f.style.top = `${startY}px`;

  const targetElement = document.getElementById(containerId);
  if (!targetElement) {
      if (f.parentNode) document.body.removeChild(f); return;
  }

  let targetX, targetY;
  const isPlayerBasket = (containerId === 'playerBasket1' || containerId === 'playerBasket2');

  if (isPlayerBasket) {
    const basketRect = targetElement.getBoundingClientRect();
    targetX = basketRect.left + basketRect.width / 2 - flyerRect.width / 2; 
    targetY = basketRect.top + basketRect.height / 2 - flyerRect.height / 2; 
  } else { 
    if (slotIndexOrMinusOne < 0 || slotIndexOrMinusOne >= targetElement.children.length) {
      if (f.parentNode) document.body.removeChild(f); return;
    }
    const slotRect = targetElement.children[slotIndexOrMinusOne].getBoundingClientRect();
    targetX = slotRect.left + slotRect.width / 2 - flyerRect.width / 2; 
    targetY = slotRect.top + slotRect.height / 2 - flyerRect.height / 2;
  }
  
  requestAnimationFrame(() => {
    f.style.transform = `translate(${targetX - startX}px, ${targetY - startY}px) scale(0.8)`;
    f.style.opacity = '0';
  });

  f.addEventListener('transitionend',()=>{
    let itemAddedToDOM = false;
    if (isPlayerBasket) {
        const li = document.createElement('li');
        li.textContent = text;
        targetElement.appendChild(li);
        targetElement.scrollTop = targetElement.scrollHeight; 
        itemAddedToDOM = true;
    } else {
        if (slotIndexOrMinusOne >= 0 && slotIndexOrMinusOne < targetElement.children.length) {
            const cell = targetElement.children[slotIndexOrMinusOne];
            cell.textContent = text; 
            cell.classList.add('filled');
            itemAddedToDOM = true;
        }
    }
    if (f.parentNode === document.body) {
        document.body.removeChild(f);
    }
    updateAssignmentCounts(); 

    if (itemAddedToDOM && typeof confetti === 'function') {
        let confettiOriginElement = targetElement; 
        if(!isPlayerBasket && slotIndexOrMinusOne >=0 && slotIndexOrMinusOne < targetElement.children.length) {
            confettiOriginElement = targetElement.children[slotIndexOrMinusOne]; 
        }
        const finalRect = confettiOriginElement.getBoundingClientRect();

        const confettiX = (finalRect.left + finalRect.width / 2) / window.innerWidth;
        const confettiY = (finalRect.top + finalRect.height / 2) / window.innerHeight;
        
        confetti({
            particleCount: 80, 
            spread: 70, 
            origin: { x: confettiX, y: confettiY },
            zIndex: 2010 
        });
    }
  },{once:true});
}

function spinWheel(wheelId, namesArrToPickFrom, mapUnused, containerIdArg, selectedArrArg){
  const mainProcessBtn = wheelId === 'teamWheel' ? document.getElementById('spinTeamBtn') : document.getElementById('spinCountryBtn');
  if (mainProcessBtn) mainProcessBtn.disabled = true;

  const cont = document.getElementById(wheelId+'Container');
  const canvas = document.getElementById(wheelId);
  if (!cont || !canvas) { if(mainProcessBtn) mainProcessBtn.disabled = false; return;}

  canvas._originalWidth = canvas.width;
  canvas._originalHeight = canvas.height;
  const zoomedSize = 650; 

  canvas.width = zoomedSize;
  canvas.height = zoomedSize;
  
  let namesToDrawOnZoomedWheel; 
  let visualSegmentArray; 

  if (wheelId === 'teamWheel') {
      namesToDrawOnZoomedWheel = tNames.length > 0 ? tNames : players.map(p => p.name);
      visualSegmentArray = namesToDrawOnZoomedWheel;
  } else { 
      namesToDrawOnZoomedWheel = countries.map(c => c.name); 
      visualSegmentArray = namesToDrawOnZoomedWheel;
  }
  drawWheel(namesToDrawOnZoomedWheel, wheelId); 
  
  requestAnimationFrame(() => { 
    cont.classList.add('zoomed');

    const randomI_from_pickList = Math.floor(Math.random() * namesArrToPickFrom.length); 
    const chosenItemObjectOrName = namesArrToPickFrom[randomI_from_pickList]; 
    const itemNameForWheelDisplay = (typeof chosenItemObjectOrName === 'object' && chosenItemObjectOrName.name) ? chosenItemObjectOrName.name : chosenItemObjectOrName;

    let visualIndex = visualSegmentArray.indexOf(itemNameForWheelDisplay);
    if (visualIndex === -1) { visualIndex = 0; }

    const segDeg = 360 / visualSegmentArray.length; 
    const segmentStartDeg = visualIndex * segDeg;
    const randomOffsetInSegment = (Math.random() * 0.8 + 0.1) * segDeg; 
    const actualLandingPointOnCanvasDeg = segmentStartDeg + randomOffsetInSegment;
    
    const POINTER_SCREEN_ANGLE = 0; 
    const key    = wheelId==='teamWheel'?'teamRot':'countryRot';
    const currentCanvasRotationMod360 = window[key] || 0;

    const targetCanvasFinalAngleMod360 = (POINTER_SCREEN_ANGLE - actualLandingPointOnCanvasDeg + 360) % 360;
    const rotationAmountNeededMod360 = (targetCanvasFinalAngleMod360 - currentCanvasRotationMod360 + 360) % 360;
    
    const spins = 4; 
    const totalSpinDelta = rotationAmountNeededMod360 + 360 * spins;
    const tgt = currentCanvasRotationMod360 + totalSpinDelta;

    canvas.style.transition = 'transform 11s cubic-bezier(0.23, 1, 0.32, 1)'; 
    canvas.style.transform  = `rotate(${tgt}deg)`;

    canvas.addEventListener('transitionend',()=>{
      let actualContainerId = containerIdArg;
      let actualSelectedArr = selectedArrArg; 
      let itemDisplayNameForFlyer = itemNameForWheelDisplay; 

      if (wheelId === 'teamWheel') { 
          const targetTeamNum = playerAssignmentCounter % 2 === 0 ? 1 : 2;
          actualContainerId = targetTeamNum === 1 ? 'playerBasket1' : 'playerBasket2';
          actualSelectedArr = targetTeamNum === 1 ? selected1 : selected2;
      } else if (wheelId === 'countryWheel' && balanceCountriesEnabled) {
          const countryStrength = chosenItemObjectOrName.strength || 1; 
          if (countryStrengthSums[0] <= countryStrengthSums[1] && selC1.length < 9) {
              actualContainerId = 'countrySlots1'; actualSelectedArr = selC1;
              countryStrengthSums[0] += countryStrength;
          } else if (selC2.length < 9) {
              actualContainerId = 'countrySlots2'; actualSelectedArr = selC2;
              countryStrengthSums[1] += countryStrength;
          } else if (selC1.length < 9) { 
              actualContainerId = 'countrySlots1'; actualSelectedArr = selC1;
              countryStrengthSums[0] += countryStrength;
          } else { /* Grid tele, a click handlernek kellene ezt megelőznie */ }
          itemDisplayNameForFlyer = `${itemNameForWheelDisplay} (Erő: ${countryStrength})`;
      } else if (wheelId === 'countryWheel' && !balanceCountriesEnabled) {
          const countryStrength = chosenItemObjectOrName.strength || 0;
          itemDisplayNameForFlyer = `${itemNameForWheelDisplay}${countryStrength > 0 ? ' (Erő: ' + countryStrength + ')' : ''}`;
      }
      
      if (!actualContainerId || !actualSelectedArr) {
        if(cont) cont.classList.remove('zoomed'); 
        canvas.width = canvas._originalWidth; canvas.height = canvas._originalHeight;
        drawWheel(namesToDrawOnZoomedWheel, wheelId); 
        if (mainProcessBtn) mainProcessBtn.disabled = namesArrToPickFrom.length === 0; 
        return;
      }

      actualSelectedArr.push(chosenItemObjectOrName); 
      const isPlayerBasket = (actualContainerId === 'playerBasket1' || actualContainerId === 'playerBasket2');
      const slotIndexForFlyer = isPlayerBasket ? -1 : actualSelectedArr.length - 1;
      
      if ( (isPlayerBasket) || (!isPlayerBasket && slotIndexForFlyer < 9) ) {
        flyToSlot(itemDisplayNameForFlyer, actualContainerId, slotIndexForFlyer, wheelId); 
        if (wheelId === 'teamWheel') updateLastPicked('player', itemNameForWheelDisplay); 
        else if (wheelId === 'countryWheel') updateLastPicked('country', itemNameForWheelDisplay); 
      }
      
      const spinResultOverlay = document.getElementById('spinResultOverlay');
      const spunItemDisplay = document.getElementById('spunItemDisplay');
      if (spunItemDisplay) {
          spunItemDisplay.textContent = `${itemNameForWheelDisplay}`; 
          spunItemDisplay.style.display = 'block';
      }
      if (spinResultOverlay) spinResultOverlay.style.display = 'flex';

      const indexInPickList = namesArrToPickFrom.indexOf(chosenItemObjectOrName);
      if (indexInPickList !== -1) {
          namesArrToPickFrom.splice(indexInPickList, 1);
      }
      
      const finalRestingAngle = tgt % 360; 
      canvas.style.transition='none';  
      canvas.style.transform=`rotate(${finalRestingAngle}deg)`;
      window[key] = finalRestingAngle; 

      if (wheelId === 'teamWheel') { 
          playerAssignmentCounter++;
      }

      const nextButton = document.getElementById('nextSpinStepButton');
      if (nextButton) {
          nextButton.style.display = 'block';
          nextButton._unzoomData = {
              wheelId: wheelId,
              namesArrStillToPickFrom: [...namesArrToPickFrom], 
              originalCanvasWidth: canvas._originalWidth,
              originalCanvasHeight: canvas._originalHeight,
              mainSpinBtnId: mainProcessBtn ? mainProcessBtn.id : null,
              canvasElement: canvas,
              containerElement: cont,
              spunItemDisplayElement: spunItemDisplay 
          };
      }
    },{once:true});
  }); 
}

function autoAssignItem(wheelId, itemObjectOrName, mapUnused, containerIdArg, selectedArrArg, namesArrToPickFromRef) {
    const btn = wheelId === 'teamWheel' ? document.getElementById('spinTeamBtn') : document.getElementById('spinCountryBtn');
    if(btn) btn.disabled = true;

    let actualContainerId = containerIdArg;
    let actualSelectedArr = selectedArrArg;
    const itemNameForDisplay = (typeof itemObjectOrName === 'object' && itemObjectOrName.name) ? itemObjectOrName.name : itemObjectOrName;
    let itemDisplayNameForFlyer = itemNameForDisplay;

    if (wheelId === 'teamWheel') { 
        const targetTeamNum = playerAssignmentCounter % 2 === 0 ? 1 : 2;
        actualContainerId = targetTeamNum === 1 ? 'playerBasket1' : 'playerBasket2';
        actualSelectedArr = targetTeamNum === 1 ? selected1 : selected2;
    } else if (wheelId === 'countryWheel' && balanceCountriesEnabled) {
        const countryStrength = itemObjectOrName.strength || 1;
        if (countryStrengthSums[0] <= countryStrengthSums[1] && selC1.length < 9) {
            actualContainerId = 'countrySlots1'; actualSelectedArr = selC1;
            countryStrengthSums[0] += countryStrength;
        } else if (selC2.length < 9) {
            actualContainerId = 'countrySlots2'; actualSelectedArr = selC2;
            countryStrengthSums[1] += countryStrength;
        } else if (selC1.length < 9) { 
             actualContainerId = 'countrySlots1'; actualSelectedArr = selC1;
             countryStrengthSums[0] += countryStrength;
        } else { 
            alert("Hiba az auto-assign során: Mindkét ország grid tele.");
            if (btn) btn.disabled = namesArrToPickFromRef.length === 0; 
            return; 
        }
        itemDisplayNameForFlyer = `${itemNameForDisplay} (Erő: ${countryStrength})`;
    } else if (wheelId === 'countryWheel' && !balanceCountriesEnabled) {
        const countryStrength = itemObjectOrName.strength || 0;
        itemDisplayNameForFlyer = `${itemNameForDisplay}${countryStrength > 0 ? ' (Erő: ' + countryStrength + ')' : ''}`;
    }
    
    if (!actualContainerId || !actualSelectedArr) {
        if(btn) btn.disabled = true; return;
    }

    actualSelectedArr.push(itemObjectOrName); 
    const isPlayerBasket = (actualContainerId === 'playerBasket1' || actualContainerId === 'playerBasket2');
    const slotIndexForFlyer = isPlayerBasket ? -1 : actualSelectedArr.length - 1;
    
    if ( (isPlayerBasket) || (!isPlayerBasket && slotIndexForFlyer < 9) ) {
        flyToSlot(itemDisplayNameForFlyer, actualContainerId, slotIndexForFlyer, wheelId); 
        if (wheelId === 'teamWheel') updateLastPicked('player', itemNameForDisplay); 
        else if (wheelId === 'countryWheel') updateLastPicked('country', itemNameForDisplay); 
    }

    const itemIndexInPickList = namesArrToPickFromRef.indexOf(itemObjectOrName);
    if (itemIndexInPickList !== -1) {
        namesArrToPickFromRef.splice(itemIndexInPickList, 1); 
    }

    if (wheelId === 'teamWheel') { 
        playerAssignmentCounter++;
    }
    
    if (wheelId === 'teamWheel') {
        if (namesArrToPickFromRef.length > 0) drawWheel(namesArrToPickFromRef, wheelId); 
        else drawDynamicTeamWheel(); 
    } else { 
        drawWheel(countries.map(c => c.name), 'countryWheel'); 
    }
    window[wheelId === 'teamWheel' ? 'teamRot' : 'countryRot'] = 0; 
    
    if(btn) btn.disabled = namesArrToPickFromRef.length === 0;
    if (wheelId === 'teamWheel' && players.length === 0 && namesArrToPickFromRef.length === 0) if(btn) btn.disabled = true;
    if (wheelId === 'countryWheel' && countries.length === 0 && namesArrToPickFromRef.length === 0) if(btn) btn.disabled = true;
}

document.getElementById('spinTeamBtn').onclick=()=>{
  const btn = document.getElementById('spinTeamBtn');
  if(!tNames.length && players.length > 0){ 
    selected1 = []; selected2 = []; 
    initPlayerBaskets(); 
    updateAssignmentCounts(); 
    playerAssignmentCounter = 0; 
    tNames = players.map(p => p.name); 
    shuffle(tNames); 
    drawWheel(tNames,'teamWheel'); 
    window.teamRot=0;
    if (tNames.length === 1) { 
        autoAssignItem('teamWheel', tNames[0], null, null, null, tNames); 
    } else if (btn) { btn.disabled = tNames.length === 0; }
  } else if (tNames.length === 1) { 
    autoAssignItem('teamWheel', tNames[0], null, null, null, tNames); 
  } else if (tNames.length > 0) { 
    spinWheel('teamWheel', tNames, null, null, null); 
  } else if (players.length === 0) {
      alert("Nincsenek játékosok a sorsoláshoz!");
      if(btn) btn.disabled = true;
  } else { 
      alert("Minden játékos ki lett sorsolva a csapatokba ebben a körben!");
      if(btn) btn.disabled = true;
  }
};

document.getElementById('spinCountryBtn').onclick=()=>{
  const btn = document.getElementById('spinCountryBtn');
  balanceCountriesEnabled = document.getElementById('balanceCountriesByStrength').checked; 

  if(countriesEligibleForDraft.length === 0 && countries.length > 0){ 
    selC1 = []; selC2 = []; 
    ['countrySlots1','countrySlots2'].forEach(initCountrySlots);
    updateAssignmentCounts(); 
    countryStrengthSums = [0, 0]; 
    
    if (countries.length > 0) {
        countriesEligibleForDraft = shuffle([...countries]).slice(0, Math.min(countries.length, 18)); 
    }
    
    if (countriesEligibleForDraft.length === 0) {
        alert(countries.length > 0 ? "Nem sikerült országokat kiválasztani a drafthoz!" : "Adjon hozzá országokat!");
        if(btn) btn.disabled = true; return;
    }

    drawWheel(countries.map(c => c.name),'countryWheel'); 
    window.countryRot=0;
    cnt=0; 
    
    if (countriesEligibleForDraft.length === 1) { 
        let targetContainer, targetSelectedArray;
        const countryToAssignObject = countriesEligibleForDraft[0];
        if (balanceCountriesEnabled) {
            const countryStrength = countryToAssignObject.strength || 1;
            if (countryStrengthSums[0] <= countryStrengthSums[1] && selC1.length < 9) {
                targetContainer = 'countrySlots1'; targetSelectedArray = selC1;
            } else if (selC2.length < 9) {
                targetContainer = 'countrySlots2'; targetSelectedArray = selC2;
            } else if (selC1.length < 9) { 
                targetContainer = 'countrySlots1'; targetSelectedArray = selC1;
            }
        } else {
            const teamNum = cnt % 2 === 0 ? 1 : 2; 
            targetContainer = teamNum === 1 ? 'countrySlots1' : 'countrySlots2';
            targetSelectedArray = teamNum === 1 ? selC1 : selC2;
        }

        if (targetContainer && targetSelectedArray && targetSelectedArray.length < 9) {
             autoAssignItem('countryWheel', countryToAssignObject, null, targetContainer, targetSelectedArray, countriesEligibleForDraft);
             if (!balanceCountriesEnabled) cnt++;
        } else {
             alert("Mindkét csapat gridje tele van az utolsó országhoz (első auto-assign).");
             if(btn) btn.disabled = true;
        }
    } else if(btn) {
        btn.disabled = countriesEligibleForDraft.length === 0;
    }
  } else if (countriesEligibleForDraft.length === 1) { 
    const countryToAssignObject = countriesEligibleForDraft[0];
    let assigned = false;
    let finalTargetContainer, finalTargetSelectedArray;

    if (balanceCountriesEnabled) {
        const countryStrength = countryToAssignObject.strength || 1;
        if (countryStrengthSums[0] <= countryStrengthSums[1] && selC1.length < 9) {
            finalTargetContainer = 'countrySlots1'; finalTargetSelectedArray = selC1;
        } else if (selC2.length < 9) {
            finalTargetContainer = 'countrySlots2'; finalTargetSelectedArray = selC2;
        } else if (selC1.length < 9) {
             finalTargetContainer = 'countrySlots1'; finalTargetSelectedArray = selC1;
        }
    } else { 
        for (let attempt = 0; attempt < 2; attempt++) { 
            const teamNum = (cnt + attempt) % 2 === 0 ? 1 : 2; 
            const tempTargetContainer = teamNum === 1 ? 'countrySlots1' : 'countrySlots2';
            const tempTargetSelectedArray = teamNum === 1 ? selC1 : selC2;
            if (tempTargetSelectedArray.length < 9) {
                finalTargetContainer = tempTargetContainer;
                finalTargetSelectedArray = tempTargetSelectedArray;
                cnt = (cnt + attempt); 
                break;
            }
        }
    }

    if (finalTargetContainer && finalTargetSelectedArray) {
        autoAssignItem('countryWheel', countryToAssignObject, null, finalTargetContainer, finalTargetSelectedArray, countriesEligibleForDraft);
        if (!balanceCountriesEnabled) cnt++;
        assigned = true;
    }

    if (!assigned && btn) {
        alert("Mindkét csapat ország gridje megtelt, az utolsó ország nem helyezhető el.");
        btn.disabled = true; 
    }
  } else if (countriesEligibleForDraft.length > 0) { 
    let assignedToTeam = -1; 
    
    if (balanceCountriesEnabled) {
        spinWheel('countryWheel', countriesEligibleForDraft, null, null, null); 
        assignedToTeam = 1; 
    } else { 
        for (let attempt = 0; attempt < 2; attempt++) { 
            const teamNum = (cnt + attempt) % 2 === 0 ? 1 : 2;
            const targetContainer = teamNum === 1 ? 'countrySlots1' : 'countrySlots2';
            const targetSelectedArray = teamNum === 1 ? selC1 : selC2;
            if (targetSelectedArray.length < 9) {
                spinWheel('countryWheel', countriesEligibleForDraft, null, targetContainer, targetSelectedArray);
                cnt = (cnt + attempt) + 1; 
                assignedToTeam = teamNum;
                break;
            }
        }
    }
    if (assignedToTeam === -1 && !balanceCountriesEnabled && btn) { 
        alert("Mindkét csapat ország gridje megtelt!");
        btn.disabled = countriesEligibleForDraft.length === 0; 
    } else if (assignedToTeam === -1 && balanceCountriesEnabled && btn) {
         if (countriesEligibleForDraft.every(c =>{ // Nagyon egyszerűsített ellenőrzés
            const countryStr = c.strength || 1;
            return !((selC1.length < 9 && countryStrengthSums[0] + countryStr <= countryStrengthSums[1] + (selC2.length < 9 ? 0 : countryStr )) || 
                     (selC2.length < 9 && countryStrengthSums[1] + countryStr <= countryStrengthSums[0] + (selC1.length < 9 ? 0 : countryStr )));
         } )) {
            alert("Úgy tűnik, egyik csapat sem tud több országot fogadni a kiegyensúlyozás miatt, vagy a gridek telítettek.");
        }
        btn.disabled = countriesEligibleForDraft.length === 0;
    }
  } else if (countries.length === 0) { 
      alert("Nincsenek országok a sorsoláshoz!");
      if(btn) btn.disabled = true;
  } else { 
      alert("Minden ország ki lett sorsolva a jelenlegi draft körben!");
      if(btn) btn.disabled = true;
  }
};