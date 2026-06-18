const GEN_RANGES = {
    "1": { min: 1, max: 151 },
    "2": { min: 152, max: 251 },
    "3": { min: 252, max: 386 },
    "4": { min: 387, max: 493 },
    "5": { min: 494, max: 649 },
    "6": { min: 650, max: 721 },
    "7": { min: 722, max: 809 },
    "8": { min: 810, max: 905 },
    "9": { min: 906, max: 1025 },
    "all": { min: 1, max: 1025 }
};

const appBody = document.getElementById('app-body');
const genSelect = document.getElementById('gen-select');
const optionsContainer = document.getElementById('main-screen');
const playBtn = document.getElementById('play-btn');
const feedback = document.getElementById('feedback');
const message = document.getElementById('message');
const nextBtn = document.getElementById('next-btn');
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
    views.game.classList.remove('hidden');
    views.dex.classList.add('hidden');
    navBtns.game.classList.add('active');
    navBtns.dex.classList.remove('active');
};

navBtns.dex.onclick = () => {
    views.game.classList.add('hidden');
    views.dex.classList.remove('hidden');
    navBtns.dex.classList.add('active');
    navBtns.game.classList.remove('active');
    renderGritodex();
};

async function startNewRound() {
    hasGuessed = false;
    feedback.classList.add('hidden');
    optionsContainer.innerHTML = '<p class="loading-text">CARGANDO...</p>';

    try {
        const currentGen = genSelect.value;
        applyTheme(currentGen);

        if (!GEN_RANGES[currentGen]) throw new Error("Gen no soportada");

        const { min, max } = GEN_RANGES[currentGen];
        const ids = [];
        while(ids.length < 5) {
            const id = Math.floor(Math.random() * (max - min + 1)) + min;
            if(!ids.includes(id)) ids.push(id);
        }

        const pokemons = await Promise.all(ids.map(async id => {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            if(!res.ok) throw new Error("Error API");
            const data = await res.json();
            const safeCry = data.cries ? (data.cries.latest || data.cries.legacy) : null;
            
            return {
                id: data.id,
                name: data.name.toUpperCase(),
                cry: safeCry,
                sprite: data.sprites?.front_default || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
            };
        }));

        currentTarget = pokemons[Math.floor(Math.random() * 5)];

        try {
            const sRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${currentTarget.id}`);
            if (sRes.ok) {
                const sData = await sRes.json();
                const matchName = sData.names?.find(n => n.language.name === "es")?.name;
                currentTarget.spanishName = matchName ? matchName.toUpperCase() : currentTarget.name;
            } else {
                currentTarget.spanishName = currentTarget.name;
            }
        } catch(e) {
            currentTarget.spanishName = currentTarget.name;
        }

        if (cryAudio) {
            cryAudio.pause();
            cryAudio.src = "";
        }
        
        if (currentTarget.cry) {
            cryAudio = new Audio(currentTarget.cry);
            cryAudio.play().catch(() => {});
        }

        renderOptions(pokemons);

    } catch (error) {
        optionsContainer.innerHTML = '<p class="loading-text" style="color:#ff4d4d;">FALLÓ CONEXIÓN</p>';
        setTimeout(startNewRound, 2500);
    }
}

function renderOptions(pokemons) {
    optionsContainer.innerHTML = pokemons.map(p => `
        <button class="option-btn" data-id="${p.id}" onclick="handleGuess(${p.id}, this)">
            <img src="${p.sprite}" alt="${p.name}">
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

playBtn.onclick = () => {
    if (cryAudio) {
        cryAudio.currentTime = 0;
        cryAudio.play().catch(() => {});
    }
};

nextBtn.onclick = startNewRound;
genSelect.onchange = startNewRound;

startNewRound();
