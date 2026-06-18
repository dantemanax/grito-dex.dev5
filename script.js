const GEN_RANGES = {
    "1": { min: 1, max: 151 },
    "2": { min: 152, max: 251 },
    "3": { min: 252, max: 386 },
    "4": { min: 387, max: 493 },
    "5": { min: 494, max: 649 },
    "all": { min: 1, max: 649 }
};

const appBody = document.getElementById('app-body');
const genSelect = document.getElementById('gen-select');
const optionsContainer = document.getElementById('options-container');
const playBtn = document.getElementById('play-btn');
const feedback = document.getElementById('feedback');
const message = document.getElementById('message');
const nextBtn = document.getElementById('next-btn');
const statusLight = document.getElementById('status-light');
const gritodexList = document.getElementById('gritodex-list');
const countLabel = document.getElementById('count');
const navBtns = { game: document.getElementById('btn-game'), dex: document.getElementById('btn-view-gritodex') };
const views = { game: document.getElementById('game-view'), dex: document.getElementById('gritodex-view') };

let currentTarget = null;
let hasGuessed = false;
let cryAudio = null;

function applyTheme(value) {
    appBody.className = `theme-${value}`;
}

function saveToGritodex(pkmn) {
    let dex = JSON.parse(localStorage.getItem('gritodex') || '[]');
    if (!dex.find(item => item.id === pkmn.id)) {
        dex.push({ id: pkmn.id, name: pkmn.spanishName || pkmn.name, sprite: pkmn.sprite });
        dex.sort((a, b) => a.id - b.id);
        localStorage.setItem('gritodex', JSON.stringify(dex));
    }
}

function renderGritodex() {
    const dex = JSON.parse(localStorage.getItem('gritodex') || '[]');
    if(countLabel) countLabel.innerText = dex.length;
    gritodexList.innerHTML = dex.map(p => `
        <div class="gritodex-item">
            <img src="${p.sprite}" alt="${p.name}">
            <span>#${p.id}<br>${p.name}</span>
        </div>
    `).join('');
}

navBtns.game.onclick = () => {
    views.game.classList.remove('hidden'); views.dex.classList.add('hidden');
    navBtns.game.classList.add('active'); navBtns.dex.classList.remove('active');
};

navBtns.dex.onclick = () => {
    views.game.classList.add('hidden'); views.dex.classList.remove('hidden');
    navBtns.dex.classList.add('active'); navBtns.game.classList.remove('active');
    renderGritodex();
};

async function startNewRound() {
    hasGuessed = false;
    feedback.classList.add('hidden');
    statusLight.classList.add('loading-light');
    optionsContainer.innerHTML = '<p style="font-size:10px">CARGANDO...</p>';
    applyTheme(genSelect.value);

    const { min, max } = GEN_RANGES[genSelect.value];
    const ids = [];
    while(ids.length < 5) {
        const id = Math.floor(Math.random() * (max - min + 1)) + min;
        if(!ids.includes(id)) ids.push(id);
    }

    try {
        const pokemons = await Promise.all(ids.map(async id => {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            const data = await res.json();
            return {
                id: data.id,
                name: data.name.toUpperCase(),
                cry: data.cries.latest || data.cries.legacy,
                sprite: data.sprites.front_default
            };
        }));

        currentTarget = pokemons[Math.floor(Math.random() * 5)];
        const sRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${currentTarget.id}`);
        const sData = await sRes.json();
        currentTarget.spanishName = sData.names.find(n => n.language.name === "es")?.name.toUpperCase();

        cryAudio = new Audio(currentTarget.cry);
        renderOptions(pokemons);
        statusLight.classList.remove('loading-light');
    } catch (e) {
        optionsContainer.innerHTML = 'ERROR API';
        statusLight.classList.remove('loading-light');
    }
}

function renderOptions(pokemons) {
    optionsContainer.innerHTML = pokemons.map(p => `
        <button class="option-btn" data-id="${p.id}" onclick="handleGuess(${p.id}, this)">
            <img src="${p.sprite}" style="width:40px; height:40px; margin-right:10px; image-rendering:pixelated">
            <span>${p.name}</span>
        </button>
    `).join('');
}

function handleGuess(id, btn) {
    if (hasGuessed) return;
    hasGuessed = true;
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);

    if (id === currentTarget.id) {
        btn.classList.add('correct-choice');
        message.innerText = `¡CORRECTO!`;
        document.getElementById('snd-success').play().catch(()=>{});
        saveToGritodex(currentTarget);
    } else {
        btn.classList.add('wrong-choice');
        buttons.forEach(b => {
            if(parseInt(b.dataset.id) === currentTarget.id) b.classList.add('correct-choice');
        });
        message.innerText = `ERA ${currentTarget.spanishName || currentTarget.name}`;
        document.getElementById('snd-error').play().catch(()=>{});
    }
    feedback.classList.remove('hidden');
}

playBtn.onclick = () => cryAudio?.play();
nextBtn.onclick = startNewRound;
genSelect.onchange = startNewRound;

startNewRound();
