/***********************
 * App de Treino PRO
 * - Carga por série
 * - Progressão automática
 * - Histórico por data + por exercício
 * - GIF por exercício (MODAL) ✅
 ***********************/

const STORAGE_HISTORY = "treino_history_v1";
const STORAGE_DRAFT = "treino_draft_v1";
const STORAGE_BUILDER = "treino_builder_v1";
const STORAGE_FAVS = "treino_favs_v1";
const STORAGE_SAVED_WORKOUTS = "treino_saved_workouts_v1";

let treinoAtual = null; // nome do treino
let treinoDraft = null; // estado atual (inputs/checkbox)
let descansoInterval = null;

// 🔊 Som quando o descanso acaba (coloque o arquivo em: assets/audio/beep.wav)
const somDescanso = new Audio("./assets/audio/beep.wav");
somDescanso.preload = "auto";

// ✅ iPhone/Safari: libera áudio após a 1ª interação do usuário
let audioLiberado = false;
function liberarAudioUmaVez(){
  if (audioLiberado) return;
  audioLiberado = true;
  try {
    somDescanso.volume = 1;
    somDescanso.currentTime = 0;
    // play/pause rápido para “destravar” o áudio no iOS
    const p = somDescanso.play();
    if (p && typeof p.then === "function") {
      p.then(() => { somDescanso.pause(); somDescanso.currentTime = 0; }).catch(() => {});
    } else {
      somDescanso.pause();
      somDescanso.currentTime = 0;
    }
  } catch {}
  window.removeEventListener("pointerdown", liberarAudioUmaVez);
  window.removeEventListener("touchstart", liberarAudioUmaVez);
}
window.addEventListener("pointerdown", liberarAudioUmaVez, { once: true });
window.addEventListener("touchstart", liberarAudioUmaVez, { once: true });

/** Ajuste aqui seus treinos/exercícios
 *  Coloque seus GIFs em: assets/gifs/
 *  Exemplo: assets/gifs/agachamento-livre.gif
 */

const TREINO_LABELS = {"Inferior 1": "Treino Completo Inferior 1", "Inferior 2": "Treino Completo Inferior 2", "Superior 1": "Treino Completo Superior 1", "Superior 2": "Treino Completo Superior 2"};
function friendlyNomeTreino(t){ return TREINO_LABELS[t] || t; }

const TREINOS = {
  "Inferior 1": [
    mkEx("Agachamento livre", 3, "8-10", 90, "assets/gifs/agachamento-livre.gif"),
    mkEx("Leg press", 3, "10-12", 75, "assets/gifs/leg-press.gif"),
    mkEx("Cadeira extensora", 3, "12-15", 60, "assets/gifs/cadeira-extensora.gif"),
    mkEx("Mesa flexora", 3, "10-12", 60, "assets/gifs/mesa-flexora.gif"),
    mkEx("Panturrilha em pé", 4, "10-15", 45, "assets/gifs/panturrilha-em-pe.gif"),
  ],
  "Superior 1": [
    mkEx("Supino reto", 3, "6-8", 90, "assets/gifs/supino-reto.gif"),
    mkEx("Puxada na frente", 3, "8-10", 75, "assets/gifs/puxada-frente.gif"),
    mkEx("Desenvolvimento ombro", 3, "8-10", 75, "assets/gifs/desenvolvimento-ombro.gif"),
    mkEx("Remada baixa", 3, "10-12", 60, "assets/gifs/remada-baixa.gif"),
    mkEx("Tríceps corda", 3, "10-12", 60, "assets/gifs/triceps-corda.gif"),
  ],
  "Inferior 2": [
    mkEx("Levantamento terra", 3, "8-10", 90, "assets/gifs/levantamento-terra.gif"),
    mkEx("bulgaro", 3, "10-12", 75, "assets/gifs/bulgaro.gif"),
    mkEx("cadeira-abdutora", 3, "12-15", 60, "assets/gifs/cadeira-abdutora.gif"),
    mkEx("stiff-halteres", 3, "12-15", 60, "assets/gifs/stiff-halteres.gif"),
    mkEx("Panturrilha sentado", 4, "10-15", 45, "assets/gifs/panturrilha-sentado.gif"),
  ],
  "Superior 2": [
    mkEx("Supino inclinado", 3, "8-10", 75, "assets/gifs/supino-inclinado.gif"),
    mkEx("Remada curvada", 3, "6-8", 90, "assets/gifs/remada-curvada.gif"),
    mkEx("Elevação lateral", 4, "12-15", 45, "assets/gifs/elevacao-lateral.gif"),
    mkEx("Rosca direta", 3, "8-10", 60, "assets/gifs/rosca-direta.gif"),
    mkEx("Tríceps testa", 3, "8-10", 60, "assets/gifs/triceps-testa.gif"),
  ],
};


/* ✅ Exercícios extras (somente para Biblioteca/Builder) */
const EXTRAS_BIBLIOTECA = [
  mkEx("Supino declinado barra", 3, "8-10", 75, "assets/gifs/supino-declinado-barra.gif"),
  mkEx("Crucifixo máquina", 3, "10-12", 60, "assets/gifs/crucifixo-maquina.gif"),
  mkEx("Peck deck", 3, "10-12", 60, "assets/gifs/peck-deck.gif"),
  mkEx("Cross over polia alta", 3, "12-15", 45, "assets/gifs/cross-over-polia-alta.gif"),
  mkEx("Cross over polia baixa", 3, "12-15", 45, "assets/gifs/cross-over-polia-baixa.gif"),
  mkEx("Pullover halter", 3, "10-12", 60, "assets/gifs/pullover-halter.gif"),
  mkEx("Remada cavalinho", 3, "8-10", 75, "assets/gifs/remada-cavalinho.gif"),
  mkEx("Remada unilateral halter", 3, "10-12", 60, "assets/gifs/remada-unilateral-halter.gif"),
  mkEx("Barra fixa", 3, "6-10", 90, "assets/gifs/barra-fixa.gif"),
  mkEx("Puxada neutra", 3, "8-10", 75, "assets/gifs/puxada-neutra.gif"),
  mkEx("Face pull", 3, "12-15", 45, "assets/gifs/face-pull.gif"),
  mkEx("Encolhimento ombros barra", 3, "10-12", 60, "assets/gifs/encolhimento-ombros-barra.gif"),
  mkEx("Elevação frontal halter", 3, "12-15", 45, "assets/gifs/elevacao-frontal-halter.gif"),
  mkEx("Elevação lateral polia", 3, "12-15", 45, "assets/gifs/elevacao-lateral-polia.gif"),
  mkEx("Crucifixo inverso máquina", 3, "12-15", 45, "assets/gifs/crucifixo-inverso-maquina.gif"),
  mkEx("Desenvolvimento arnold", 3, "8-10", 75, "assets/gifs/desenvolvimento-arnold.gif"),
  mkEx("Rosca scott", 3, "8-10", 60, "assets/gifs/rosca-scott.gif"),
  mkEx("Rosca concentrada", 3, "10-12", 60, "assets/gifs/rosca-concentrada.gif"),
  mkEx("Rosca martelo", 3, "10-12", 60, "assets/gifs/rosca-martelo.gif"),
  mkEx("Tríceps francês halter", 3, "10-12", 60, "assets/gifs/triceps-frances-halter.gif"),
  mkEx("Passada smith", 3, "10-12", 75, "assets/gifs/passada-smith.gif"),
  mkEx("Sissy squat", 3, "12-15", 60, "assets/gifs/sissy-squat.gif"),
  mkEx("Agachamento smith", 3, "8-10", 90, "assets/gifs/agachamento-smith.gif"),
  mkEx("Good morning barra", 3, "8-10", 90, "assets/gifs/good-morning-barra.gif"),
  mkEx("Flexora em pé", 3, "10-12", 60, "assets/gifs/flexora-em-pe.gif"),
  mkEx("Nordic curl", 3, "6-10", 90, "assets/gifs/nordic-curl.gif"),
  mkEx("Glute bridge", 3, "10-12", 60, "assets/gifs/glute-bridge.gif"),
  mkEx("Elevação pélvica barra", 3, "8-10", 90, "assets/gifs/elevacao-pelvica-barra.gif"),
  mkEx("Step up banco", 3, "10-12", 60, "assets/gifs/step-up-banco.gif"),
  mkEx("Abdução cabo", 3, "12-15", 45, "assets/gifs/abducao-cabo.gif"),
  mkEx("Panturrilha no leg press", 4, "10-15", 45, "assets/gifs/panturrilha-no-leg-press.gif"),
  mkEx("Panturrilha unilateral", 4, "10-15", 45, "assets/gifs/panturrilha-unilateral.gif"),
  mkEx("Prancha lateral", 3, "30-45s", 45, "assets/gifs/prancha-lateral.gif"),
  mkEx("Abdominal bicicleta", 3, "15-20", 45, "assets/gifs/abdominal-bicicleta.gif"),
  mkEx("Abdominal supra", 3, "15-20", 45, "assets/gifs/abdominal-supra.gif"),
  mkEx("Elevação de pernas barra", 3, "10-15", 60, "assets/gifs/elevacao-de-pernas-barra.gif"),
  mkEx("Dragon flag", 3, "6-10", 90, "assets/gifs/dragon-flag.gif"),
  mkEx("Box jump", 3, "8-12", 60, "assets/gifs/box-jump.gif"),
  mkEx("Slam ball", 3, "12-15", 45, "assets/gifs/slam-ball.gif"),
  mkEx("Kettlebell swing", 3, "15-20", 45, "assets/gifs/kettlebell-swing.gif"),
];

function mkEx(nome, series, repsAlvo, descansoSeg, gif = "") {
  return { nome, series, repsAlvo, descansoSeg, gif };
}

/** Helpers */
function hojeISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function formatBR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]"); }
  catch { return []; }
}
function saveHistory(arr) {
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(arr));
}
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(STORAGE_DRAFT) || "null"); }
  catch { return null; }
}
function saveDraft(draft) {
  localStorage.setItem(STORAGE_DRAFT, JSON.stringify(draft));
}
function clearDraft() {
  localStorage.removeItem(STORAGE_DRAFT);
}

/** Pega o último registro do exercício no histórico */
function getUltimoRegistroExercicio(exNome) {
  const hist = loadHistory();
  for (let i = hist.length - 1; i >= 0; i--) {
    const sessao = hist[i];
    const ex = sessao.exercicios?.find(e => e.nome === exNome);
    if (ex) return ex;
  }
  return null;
}

/** Sugere próxima carga baseado no último treino (progressão simples e eficiente) */
function sugerirProximaCarga(exNome, repsAlvoStr) {
  const last = getUltimoRegistroExercicio(exNome);
  if (!last) return { sugestao: "", tag: "Sem histórico" };

  const faixa = parseFaixaReps(repsAlvoStr);
  const feitas = last.series.map(s => s.reps).filter(n => Number.isFinite(n));
  const pesos = last.series.map(s => s.peso).filter(n => Number.isFinite(n));

  if (!feitas.length || !pesos.length) return { sugestao: "", tag: "Sem dados" };

  const pesoRef = round2(media(pesos));

  const minReps = Math.min(...feitas);
  const maxReps = Math.max(...feitas);

  let novo = pesoRef;

  if (minReps >= faixa.max) {
    novo = aplicarAumento(pesoRef);
    return { sugestao: `${novo} kg`, tag: "🟢 Subir carga" };
  }

  if (maxReps < faixa.min) {
    novo = round2(pesoRef * 0.95);
    return { sugestao: `${novo} kg`, tag: "🔴 Reduzir 5%" };
  }

  return { sugestao: `${pesoRef} kg`, tag: "🟡 Manter" };
}

function aplicarAumento(peso) {
  let novo = peso * 1.025;
  if (peso <= 40) novo = peso + 2;
  return round2(novo);
}
function round2(n) { return Math.round(n * 2) / 2; }
function media(arr) { return arr.reduce((a,b)=>a+b,0)/arr.length; }
function parseFaixaReps(s) {
  const m = String(s).match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return { min: 8, max: 10 };
  return { min: Number(m[1]), max: Number(m[2]) };
}

/* ===========================
   FRASE MOTIVACIONAL (muda ao entrar) ✅
   =========================== */
const FRASES_MOTIVACIONAIS = [
  "Disciplina > motivação. Só vai. 💪",
  "Fez o básico bem feito? Já venceu hoje. ✅",
  "Constância constrói o corpo e a mente. 🧠",
  "Um treino de cada vez. Um passo de cada vez. 🚀",
  "Você não precisa de vontade. Precisa de hábito. 🔥",
  "Treino feito é ansiedade a menos. 🌿",
  "Hoje você treina. Amanhã você agradece. 🏆",
  "Pequenas ações, grandes resultados. 📈",
  "Seu futuro eu tá contando com você. ✨",
  "Sem pressa. Só consistência. 🧱"
];

function definirFraseMotivacional(){
  const elFrase = document.getElementById("fraseMotivacional");
  if (!elFrase) return;

  // evita repetir a mesma frase em sequência
  const last = Number(localStorage.getItem("motd_last") || "-1");
  let idx = Math.floor(Math.random() * FRASES_MOTIVACIONAIS.length);
  if (FRASES_MOTIVACIONAIS.length > 1 && idx === last) {
    idx = (idx + 1) % FRASES_MOTIVACIONAIS.length;
  }
  localStorage.setItem("motd_last", String(idx));

  elFrase.textContent = `“${FRASES_MOTIVACIONAIS[idx]}”`;
}

/** UI */
function el(id){ return document.getElementById(id); }

/* ==============================
   NAVEGAÇÃO HOME <-> WORKAREA ✅
   ============================== */

let treinoSelecionadoHome = null; // seleção na tela inicial

let builderState = { aberto:false, filtro:"Todos", busca:"", selecionados:{}, ordem:[] };

window.selecionarTreino = function(nomeTreino){
  treinoSelecionadoHome = nomeTreino;

  // marca visualmente
  document.querySelectorAll("#listaTreinos .train").forEach(btn => {
    const ativo = btn.dataset.treino === nomeTreino;
    btn.classList.toggle("is-selected", ativo);
    btn.setAttribute("aria-pressed", ativo ? "true" : "false");
  });

  // atualiza label e botão
  const label = document.getElementById("treinoSelecionadoLabel");
  if (label) label.textContent = `Selecionado: ${nomeTreino}`;

  const btn = document.getElementById("btnComecarTreino");
  if (btn) {
    btn.classList.remove("is-disabled");
    btn.textContent = `🚀 Começar: ${nomeTreino}`;
  }

  // feedback tátil no mobile
  try { navigator.vibrate?.(20); } catch {}
};

window.iniciarTreinoSelecionado = function(){
  if (!treinoSelecionadoHome){
    // sem seleção -> desce pra lista e avisa
    const el = document.getElementById("listaTreinos");
    if (el) el.scrollIntoView({behavior:"smooth", block:"start"});
    alert("Selecione um treino (Inferior/Superior) e depois clique em Começar.");
    return;
  }
  carregarTreino(treinoSelecionadoHome);
};


/* ===========================
   BIBLIOTECA + MONTAR TREINO DO DIA ✅
   =========================== */
function categoriaPorNomeEx(nome){
  const n = String(nome||"").toLowerCase();

  if (/(agach|leg press|panturrilha|cadeira extens|mesa flex|stiff|terra|bulgar|abdutor|glúteo|gluteo)/.test(n)) return "Inferior";
  if (/(supino|puxada|remada|rosca|tr[íi]ceps|ombro|eleva[cç][aã]o|b[íi]ceps)/.test(n)) return "Superior";
  return "Geral";
}

function montarBiblioteca(){
  const map = new Map();
  Object.keys(TREINOS).forEach(tn => {
    TREINOS[tn].forEach(ex => {
      const key = ex.nome.trim().toLowerCase();
      if (!map.has(key)){
        map.set(key, {
          nome: ex.nome,
          series: ex.series,
          repsAlvo: ex.repsAlvo,
          descansoSeg: ex.descansoSeg,
          gif: ex.gif || "",
          cat: categoriaPorNomeEx(ex.nome)
        });
      }
    });
  });
  // ➕ inclui exercícios extras (sem repetir)
  (EXTRAS_BIBLIOTECA || []).forEach(ex => {
    const key = ex.nome.trim().toLowerCase();
    if (!map.has(key)){
      map.set(key, {
        nome: ex.nome,
        series: ex.series,
        repsAlvo: ex.repsAlvo,
        descansoSeg: ex.descansoSeg,
        gif: ex.gif || "",
        cat: categoriaPorNomeEx(ex.nome)
      });
    }
  });
  const favs = loadFavs();
  return Array.from(map.values()).sort((a,b)=>{
    const fa = favs[a.nome.trim().toLowerCase()] ? 1 : 0;
    const fb = favs[b.nome.trim().toLowerCase()] ? 1 : 0;
    if (fa !== fb) return fb - fa; // favoritos primeiro
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

function salvarBuilder(){
  try { localStorage.setItem(STORAGE_BUILDER, JSON.stringify(builderState)); } catch {}
}
function carregarBuilder(){
  try {
    const raw = localStorage.getItem(STORAGE_BUILDER);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") builderState = { ...builderState, ...obj };
  } catch {}
}

/* ===== Favoritos (⭐) ===== */
function loadFavs(){
  try { return JSON.parse(localStorage.getItem(STORAGE_FAVS) || "{}"); }
  catch { return {}; }
}
function saveFavs(obj){
  try { localStorage.setItem(STORAGE_FAVS, JSON.stringify(obj || {})); } catch {}
}
function toggleFav(exId){
  const favs = loadFavs();
  favs[exId] = !favs[exId];
  if (!favs[exId]) delete favs[exId];
  saveFavs(favs);
}

/* ===== Treinos salvos (montador) ===== */
function loadSavedWorkouts(){
  try { return JSON.parse(localStorage.getItem(STORAGE_SAVED_WORKOUTS) || "[]"); }
  catch { return []; }
}
function saveSavedWorkouts(arr){
  try { localStorage.setItem(STORAGE_SAVED_WORKOUTS, JSON.stringify(arr || [])); } catch {}
}
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}


window.abrirBiblioteca = function(){
  carregarBuilder();
  builderState.aberto = true;

  // abre como MODAL (overlay)
  document.body.classList.remove("mode-home","mode-work");
  document.body.classList.add("mode-builder");
  document.body.classList.add("builder-lock");

  // acessibilidade
  const modal = document.getElementById("builderModal");
  if (modal) modal.setAttribute("aria-hidden", "false");

  // mantém Home por trás, mas some Workarea
  el("home").style.display = "block";
  el("workarea").style.display = "none";

  renderBiblioteca(true);
  renderTreinosSalvos();
  salvarBuilder();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.fecharBiblioteca = function(){
  builderState.aberto = false;
  document.body.classList.remove("mode-builder","mode-work");
  document.body.classList.add("mode-home");
  document.body.classList.remove("builder-lock");

  const modal = document.getElementById("builderModal");
  if (modal) modal.setAttribute("aria-hidden", "true");
  renderBiblioteca(false);
  salvarBuilder();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Abre direto na seção de "Treinos salvos" (botão da Home)
window.abrirTreinosSalvos = function(){
  window.abrirBiblioteca();
  setTimeout(() => {
    const alvo = document.getElementById("builderSavedWrap");
    if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
};

// Fecha ao clicar no fundo do modal
window.addEventListener("click", (e) => {
  const modal = document.getElementById("builderModal");
  if (!modal) return;
  if (!document.body.classList.contains("mode-builder")) return;
  if (e.target === modal) window.fecharBiblioteca();
});

window.limparBiblioteca = function(){
  builderState.selecionados = {};
  builderState.ordem = [];
  renderBiblioteca(false);
  salvarBuilder();
};

function renderFiltrosBiblioteca(){
  const wrap = document.getElementById("builderFilters");
  if (!wrap) return;

  const filtros = ["Todos","Inferior","Superior","Geral"];
  wrap.innerHTML = "";
  filtros.forEach(f => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "filter-chip" + (builderState.filtro === f ? " is-active" : "");
    b.textContent = f;
    b.onclick = () => {
      builderState.filtro = f;
      renderBiblioteca(false);
      salvarBuilder();
    };
    wrap.appendChild(b);
  });
}

function moverSelecionado(id, dir){
  const i = builderState.ordem.indexOf(id);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= builderState.ordem.length) return;
  const arr = builderState.ordem.slice();
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
  builderState.ordem = arr;
  renderBiblioteca(false);
  salvarBuilder();
  try { navigator.vibrate?.(10); } catch {}
}

function renderBiblioteca(scrollTop){
  const sec = document.getElementById("builder");
  if (!sec) return;
  sec.setAttribute("aria-hidden", builderState.aberto ? "false" : "true");

  const search = document.getElementById("builderSearch");
  if (search){
    search.value = builderState.busca || "";
    search.oninput = (e) => {
      builderState.busca = e.target.value || "";
      renderBiblioteca(false);
      salvarBuilder();
    };
  }

  renderFiltrosBiblioteca();

  const list = document.getElementById("builderList");
  const count = document.getElementById("builderCount");
  const btnStart = document.getElementById("btnComecarMontado");
  if (!list || !count || !btnStart) return;

  const lib = montarBiblioteca();
  const termo = String(builderState.busca || "").trim().toLowerCase();
  const filtro = builderState.filtro || "Todos";

  const itens = lib.filter(ex => {
    const okFiltro = (filtro === "Todos") ? true : ex.cat === filtro;
    const okBusca = !termo ? true : ex.nome.toLowerCase().includes(termo);
    return okFiltro && okBusca;
  });

  list.innerHTML = "";
  itens.forEach(ex => {
    const id = ex.nome.trim().toLowerCase();
    const checked = !!builderState.selecionados[id];

    const row = document.createElement("div");
    row.className = "ex-item" + (checked ? " is-checked" : "");
    const favs = loadFavs();
    const isFav = !!favs[id];

    row.innerHTML = `
      <input class="ex-check" type="checkbox" ${checked ? "checked" : ""}/>
      <div class="ex-main">
        <p class="ex-name">${ex.nome}</p>
        <p class="ex-meta">Padrão: ${ex.series}x • ${ex.repsAlvo} • descanso ${ex.descansoSeg}s</p>
        <div class="ex-badge-row">
          <span class="ex-tag">${ex.cat}</span>
          <img class="ex-demo" src="${ex.gif || ""}" alt="Demonstração" style="${ex.gif ? "" : "display:none"}" onerror="this.style.display='none'"/>
        </div>
      </div>
      <div class="ex-actions">
        <button class="star-btn ${isFav ? "is-on" : ""}" type="button" aria-label="Favoritar">${isFav ? "⭐" : "☆"}</button>
        ${checked ? `<button class="move-btn" type="button" aria-label="Mover para cima">↑</button><button class="move-btn" type="button" aria-label="Mover para baixo">↓</button>` : ``}
      </div>
    `;

    const cb = row.querySelector("input");
    cb.onchange = () => {
      if (cb.checked){
        builderState.selecionados[id] = ex;
        if (!builderState.ordem.includes(id)) builderState.ordem.push(id);
      } else {
        delete builderState.selecionados[id];
        builderState.ordem = builderState.ordem.filter(x => x !== id);
      }
      renderBiblioteca(false);
      renderTreinosSalvos();
      salvarBuilder();
      try { navigator.vibrate?.(15); } catch {}
    };

    row.onclick = (e) => {
      if (e.target && (e.target.classList?.contains("star-btn") || e.target.classList?.contains("move-btn"))) return;
      if (e.target && e.target.tagName === "INPUT") return;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event("change"));
    };

    // ⭐ favorito
    const star = row.querySelector(".star-btn");
    if (star){
      star.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        toggleFav(id);
        renderBiblioteca(false);
        salvarBuilder();
      };
    }

    // ordem (↑ ↓) só quando está selecionado
    const moves = row.querySelectorAll(".move-btn");
    if (moves && moves.length === 2){
      moves[0].onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); moverSelecionado(id, -1); };
      moves[1].onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); moverSelecionado(id, +1); };
    }

    list.appendChild(row);
  });

  const selCount = Object.keys(builderState.selecionados).length;
  count.textContent = `${selCount} selecionados`;

  btnStart.disabled = selCount === 0;

  if (scrollTop) window.scrollTo({ top: 0, behavior: "smooth" });
}

window.comecarTreinoMontado = function(){
  const selectedMap = builderState.selecionados || {};
  const idsOrdenados = (builderState.ordem && builderState.ordem.length)
    ? builderState.ordem.filter(id => !!selectedMap[id])
    : Object.keys(selectedMap);
  // fallback: se algo ficou fora da ordem
  Object.keys(selectedMap).forEach(id => { if (!idsOrdenados.includes(id)) idsOrdenados.push(id); });
  const selecionados = idsOrdenados.map(id => selectedMap[id]).filter(Boolean);
  if (!selecionados.length){
    alert("Selecione pelo menos 1 exercício para começar.");
    return;
  }

  treinoAtual = "Treino do dia";
  entrarWorkarea(treinoAtual);

  treinoDraft = {
    data: hojeISO(),
    treino: treinoAtual,
    exercicios: selecionados.map(ex => ({
      nome: ex.nome,
      repsAlvo: ex.repsAlvo,
      descansoSeg: ex.descansoSeg,
      gif: ex.gif || "",
      series: Array.from({length: ex.series}).map(() => ({ peso:null, reps:null, ok:false }))
    }))
  };

  saveDraft(treinoDraft);

  document.body.classList.remove("mode-builder","mode-home");
  document.body.classList.add("mode-work");
  el("home").style.display = "none";
  el("workarea").style.display = "block";

  renderTreino();
};

window.salvarTreinoMontado = function(){
  const selectedMap = builderState.selecionados || {};
  const idsOrdenados = (builderState.ordem && builderState.ordem.length)
    ? builderState.ordem.filter(id => !!selectedMap[id])
    : Object.keys(selectedMap);
  if (!idsOrdenados.length){
    alert("Selecione pelo menos 1 exercício antes de salvar.");
    return;
  }

  const inp = document.getElementById("builderWorkoutName");
  const nome = String(inp?.value || "").trim();
  if (!nome){
    alert("Digite um nome para salvar (ex: Pernas A).");
    return;
  }

  const saved = loadSavedWorkouts();
  // se já existe com mesmo nome, substitui
  const idx = saved.findIndex(s => String(s.nome).toLowerCase() === nome.toLowerCase());
  const item = {
    id: (idx >= 0 ? saved[idx].id : uid()),
    nome,
    ids: idsOrdenados,
    createdAt: Date.now()
  };
  if (idx >= 0) saved[idx] = item;
  else saved.unshift(item);

  saveSavedWorkouts(saved);
  if (inp) inp.value = "";
  renderTreinosSalvos();
  try { navigator.vibrate?.(30); } catch {}
  alert("⭐ Treino salvo! Agora ele aparece em 'Treinos salvos'.");
};

function renderTreinosSalvos(){
  const wrap = document.getElementById("builderSavedWrap");
  const list = document.getElementById("builderSavedList");
  if (!wrap || !list) return;

  const saved = loadSavedWorkouts();
  if (!saved.length){
    list.innerHTML = `<div class="saved-card"><div><div class="saved-name">Nenhum treino salvo</div><div class="saved-meta">Salve um treino montado para não montar do zero.</div></div></div>`;
    return;
  }

  list.innerHTML = "";
  saved.forEach(s => {
    const card = document.createElement("div");
    card.className = "saved-card";
    const qtd = Array.isArray(s.ids) ? s.ids.length : 0;
    card.innerHTML = `
      <div>
        <div class="saved-name">⭐ ${escapeHtml(s.nome || "Treino")}</div>
        <div class="saved-meta">${qtd} exercícios • toque em “Carregar”</div>
      </div>
      <div class="saved-actions">
        <button class="small-btn primary" type="button">Carregar</button>
        <button class="small-btn" type="button">Começar</button>
        <button class="small-btn bad" type="button">Excluir</button>
      </div>
    `;

    const btns = card.querySelectorAll("button");
    btns[0].onclick = () => carregarTreinoSalvo(s.id, false);
    btns[1].onclick = () => carregarTreinoSalvo(s.id, true);
    btns[2].onclick = () => excluirTreinoSalvo(s.id);

    list.appendChild(card);
  });
}

function carregarTreinoSalvo(id, iniciar){
  const saved = loadSavedWorkouts();
  const item = saved.find(s => s.id === id);
  if (!item){ alert("Treino salvo não encontrado."); return; }

  const lib = montarBiblioteca();
  const byId = new Map(lib.map(ex => [ex.nome.trim().toLowerCase(), ex]));

  builderState.selecionados = {};
  builderState.ordem = [];
  (item.ids || []).forEach(exId => {
    const ex = byId.get(String(exId).toLowerCase());
    if (ex){
      builderState.selecionados[String(exId).toLowerCase()] = ex;
      builderState.ordem.push(String(exId).toLowerCase());
    }
  });

  renderBiblioteca(false);
  salvarBuilder();

  if (iniciar){
    comecarTreinoMontado();
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function excluirTreinoSalvo(id){
  const saved = loadSavedWorkouts();
  const novo = saved.filter(s => s.id !== id);
  saveSavedWorkouts(novo);
  renderTreinosSalvos();
}

window.limparTreinosSalvos = function(){
  if (!confirm("Quer apagar TODOS os treinos salvos?")) return;
  saveSavedWorkouts([]);
  renderTreinosSalvos();
};

/* tiny helper */
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

function setChipHome(textoFort = "Escolha um treino") {
  const chip = document.querySelector(".chip.chip-accent");
  if (!chip) return;
  chip.innerHTML = `
    <span class="chip-muted">Home</span>
    <span class="chip-strong">${textoFort}</span>
  `;
}

window.mostrarHome = function () {
  document.body.classList.add("mode-home");
  document.body.classList.remove("mode-work","mode-builder");
  try { pararDescanso(); } catch {}

  document.body.classList.add("is-home");
  document.body.classList.remove("is-workarea");

  // Não apaga histórico nem draft salvo, só reseta a tela
  treinoAtual = null;
  treinoDraft = null;

  el("home").style.display = "block";
  el("workarea").style.display = "none";

  // limpa a área do treino pra não ficar “resto” renderizado
  el("treino").innerHTML = "";

  el("progressoGeral").style.display = "none";
  el("acoes").style.display = "none";
  el("cronometro").style.display = "none";

  setChipHome("Escolha um treino");
  setBottomNavActive("home");
  setFabsVisible({ save:false, top:false });
  // reset seleção da Home
  treinoSelecionadoHome = null;
  document.querySelectorAll("#listaTreinos .train").forEach(b=>b.classList.remove("is-selected"));
  const btn = document.getElementById("btnComecarTreino");
  if (btn){ btn.classList.add("is-disabled"); btn.textContent = "🚀 Começar treino"; }
  const lbl = document.getElementById("treinoSelecionadoLabel");
  if (lbl) lbl.textContent = "Selecione um treino abaixo 👇";

  definirFraseMotivacional();
  renderMiniChart();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

function entrarWorkarea(tituloChip) {
  document.body.classList.add("mode-work");
  document.body.classList.remove("mode-home","mode-builder");
  document.body.classList.add("is-workarea");
  document.body.classList.remove("is-home");
  el("home").style.display = "none";
  el("workarea").style.display = "block";
  setChipHome(tituloChip);
  setBottomNavActive(tituloChip === "Histórico" ? "hist" : "treino");
  setFabsVisible({ save: tituloChip !== "Histórico" && !!treinoAtual, top:false });
  renderMiniChart();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setBottomNavActive(which){
  const ids = ["bnHome","bnTreino","bnHist"];
  ids.forEach(id => document.getElementById(id)?.classList.remove("is-active"));
  if (which === "home") document.getElementById("bnHome")?.classList.add("is-active");
  if (which === "treino") document.getElementById("bnTreino")?.classList.add("is-active");
  if (which === "hist") document.getElementById("bnHist")?.classList.add("is-active");
}

function setFabsVisible({ save=false, top=false } = {}){
  const fabSave = document.getElementById("fabSave");
  const fabTop = document.getElementById("fabTop");
  if (fabSave) fabSave.style.display = save ? "flex" : "none";
  if (fabTop) fabTop.style.display = top ? "flex" : "none";
}

// botão “Treino” da barra inferior: volta pro último treino aberto (se existir)
window.voltarTreinoAtual = function(){
  if (treinoAtual) {
    carregarTreino(treinoAtual);
  } else {
    mostrarHome();
  }
};

// mostra/oculta “Topo” ao rolar no mobile
window.addEventListener("scroll", () => {
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  if (!isMobile) return;
  setFabsVisible({
    save: el("workarea")?.style.display === "block" && treinoAtual && el("acoes")?.style.display !== "none",
    top: window.scrollY > 600
  });
}, { passive: true });

window.carregarTreino = function(nomeTreino) {
  treinoAtual = nomeTreino;

  // ✅ entra na tela de treino
  entrarWorkarea(nomeTreino);

  const draft = loadDraft();
  if (draft && draft.treino === nomeTreino && draft.data === hojeISO()) {
    treinoDraft = draft;
  } else {
    treinoDraft = criarDraftVazio(nomeTreino);
    saveDraft(treinoDraft);
  }

  renderTreino();
};

function criarDraftVazio(nomeTreino){
  const data = hojeISO();
  const exercicios = TREINOS[nomeTreino].map(ex => ({
    nome: ex.nome,
    repsAlvo: ex.repsAlvo,
    descansoSeg: ex.descansoSeg,
      gif: ex.gif || "",
      series: Array.from({length: ex.series}).map(() => ({
      peso: null,
      reps: null,
      ok: false
    }))
  }));
  return { data, treino: nomeTreino, exercicios };
}

function renderTreino(){
  const treinoDiv = el("treino");
  treinoDiv.innerHTML = "";

  el("progressoGeral").style.display = "block";
  el("acoes").style.display = "flex";

  const titulo = document.createElement("div");
  titulo.className = "card treino-header";
  titulo.innerHTML = `
    <div class="card-top">
      <div>
        <h2 class="titulo">${treinoAtual} • ${formatBR(treinoDraft.data)}</h2>
        <div class="miniinfo">Preencha carga e reps. Clique ✅ quando concluir a série.</div>
      </div>
      <div class="badges">
        <span class="badge">Auto-progressão</span>
        <span class="badge">Histórico</span>
      </div>
    </div>
    <div class="small">Dica: se você bater o topo da faixa em todas as séries, eu vou sugerir subir a carga no próximo treino.</div>
  `;
  treinoDiv.appendChild(titulo);

  treinoDraft.exercicios.forEach((ex, exIndex) => {
    const base = (TREINOS[treinoAtual] && TREINOS[treinoAtual][exIndex]) ? TREINOS[treinoAtual][exIndex] : null;
    const descansoSeg = base ? base.descansoSeg : ex.descansoSeg;
    const gifSrc = base ? (base.gif || "") : (ex.gif || "");
    const sug = sugerirProximaCarga(ex.nome, ex.repsAlvo);

    const card = document.createElement("section");
    card.className = "card";

    const gifBtn = gifSrc ? `
      <div style="margin-top:10px;">
        <button class="sec mini" type="button" onclick="abrirModalGif('${gifSrc}', '${ex.nome.replace(/'/g,"\\'")}')">
          🎥 Ver execução
        </button>
      </div>
    ` : ``;

    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3 class="titulo">${ex.nome}</h3>
          <div class="miniinfo">Alvo: <b>${ex.repsAlvo}</b> • Descanso padrão: <b>${descansoSeg}s</b></div>
          <div class="miniinfo">Sugestão próxima carga: <b>${sug.sugestao || "--"}</b></div>
          ${gifBtn}
        </div>
        <div class="badges">
          <span class="badge">${sug.tag}</span>
          <span class="badge">Séries: ${ex.series.length}</span>
        </div>
      </div>

      <div class="series" id="series-${exIndex}"></div>
      <div class="small">Volume do exercício: <b id="vol-ex-${exIndex}">0 kg</b></div>
    `;

    treinoDiv.appendChild(card);

    const seriesWrap = card.querySelector(`#series-${exIndex}`);

    ex.series.forEach((s, sIndex) => {
      const row = document.createElement("div");
      row.className = "serie";
      row.innerHTML = `
        <div class="slabel">Série ${sIndex + 1}</div>
        <input type="number" inputmode="decimal" min="0" step="0.5" placeholder="Carga (kg)" value="${s.peso ?? ""}" data-ex="${exIndex}" data-serie="${sIndex}" data-type="peso"/>
        <input type="number" inputmode="numeric" min="0" step="1" placeholder="Reps feitas" value="${s.reps ?? ""}" data-ex="${exIndex}" data-serie="${sIndex}" data-type="reps"/>
        <div class="btns">
          <button class="rest" type="button" onclick="liberarAudioUmaVez(); iniciarDescanso(${descansoSeg})">⏱ ${descansoSeg}s</button>
          <button class="ok" type="button" onclick="toggleOk(${exIndex}, ${sIndex})">${s.ok ? "✅ Feito" : "✅"}</button>
        </div>
        <div class="slabel">${s.ok ? "Concluída" : "Pendente"}</div>
      `;
      seriesWrap.appendChild(row);
    });
  });

  document.querySelectorAll("input[data-type]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const exi = Number(e.target.dataset.ex);
      const si = Number(e.target.dataset.serie);
      const t = e.target.dataset.type;
      const val = e.target.value === "" ? null : Number(e.target.value);

      if (!treinoDraft?.exercicios?.[exi]?.series?.[si]) return;
      treinoDraft.exercicios[exi].series[si][t] = Number.isFinite(val) ? val : null;

      saveDraft(treinoDraft);
      atualizarMetricas();
    });
  });

  atualizarMetricas();
  renderMiniChart();
}

window.toggleOk = function(exIndex, serieIndex){
  const s = treinoDraft.exercicios[exIndex].series[serieIndex];
  s.ok = !s.ok;
  saveDraft(treinoDraft);
  renderTreino();
};

function atualizarMetricas(){
  const allSeries = treinoDraft.exercicios.flatMap(e => e.series);
  const total = allSeries.length;
  const done = allSeries.filter(s => s.ok).length;
  const pct = total ? Math.round((done/total)*100) : 0;

  el("progressoTexto").textContent = `Progresso: ${done}/${total} séries`;
  el("progressoPct").textContent = `${pct}%`;
  el("progressoFill").style.width = `${pct}%`;

  let volTotal = 0;
  treinoDraft.exercicios.forEach((ex, exi) => {
    let volEx = 0;
    ex.series.forEach(s => {
      const peso = Number(s.peso);
      const reps = Number(s.reps);
      if (Number.isFinite(peso) && Number.isFinite(reps)) volEx += peso * reps;
    });
    volTotal += volEx;

    const elVol = document.getElementById(`vol-ex-${exi}`);
    if (elVol) elVol.textContent = `${Math.round(volEx)} kg`;
  });

  el("volumeTotalChip").textContent = `🔥 Volume do dia: ${Math.round(volTotal)} kg`;
  renderMiniChart();
}

function renderMiniChart(){
  const canvas = document.getElementById("miniChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const hist = loadHistory().slice().sort((a,b)=> (a.data > b.data ? 1 : -1));
  let series = hist;

  // se estiver em um treino específico, filtra só ele
  if (treinoAtual) series = hist.filter(h => h.treino === treinoAtual);

  // pega os últimos 7 registros
  series = series.slice(-7);

  // limpa
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // ✅ Sem histórico? esconde o miniChart (remove "pontilhado" feio no iPhone)
  if (!series.length) {
    canvas.style.display = "none";
    return;
  }

  // Tem dados -> mostra
  canvas.style.display = "block";

  const values = series.map(s => Number(s.volumeTotal) || 0);
  const max = Math.max(1, ...values);

  const pad = 10;
  const w = canvas.width - pad*2;
  const h = canvas.height - pad*2;
  const gap = 6;
  const barW = (w - gap*(values.length-1)) / values.length;

  // fundo
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.globalAlpha = 1;

  // barras
  values.forEach((v,i)=>{
    const bh = Math.max(3, (v/max) * (h-10));
    const x = pad + i*(barW+gap);
    const y = pad + (h - bh);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(x,y,barW,bh);
  });

  // texto (volume do último)
  const last = values[values.length-1];
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#0b0b0c";
  ctx.font = "bold 11px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`${Math.round(last)}kg`, pad, canvas.height-8);
  ctx.globalAlpha = 1;
}

/** Descanso */
window.iniciarDescanso = function(seg){
  el("cronometro").style.display = "block";
  let restante = Number(seg);
  const total = restante;

  if (descansoInterval) clearInterval(descansoInterval);

  const tick = () => {
    el("cronometroTexto").textContent = `⏱️ Descanso: ${restante}s`;
    const pct = total ? Math.round(((total - restante) / total) * 100) : 0;
    el("barraProgresso").style.width = `${pct}%`;

    if (restante <= 0) {
      clearInterval(descansoInterval);
      descansoInterval = null;

      el("cronometroTexto").textContent = `✅ Descanso finalizado!`;
      el("barraProgresso").style.width = `100%`;

      // 📳 Vibra (Android). No iPhone pode não vibrar mesmo.
      try { navigator.vibrate?.(200); } catch {}

      // 🔊 Som (iOS/Android) — precisa do arquivo em assets/audio/beep.wav
      try {
        somDescanso.currentTime = 0;
        somDescanso.play();
      } catch {}

      return; // para o tick aqui
    }

    restante -= 1;
  };

  tick();
  descansoInterval = setInterval(tick, 1000);
};

window.pararDescanso = function(){
  if (descansoInterval) clearInterval(descansoInterval);
  descansoInterval = null;
  el("cronometro").style.display = "none";
  el("barraProgresso").style.width = "0%";
};

/** Salvar e finalizar */
window.salvarSessao = function(){
  if (!treinoDraft) return;

  const temAlgo = treinoDraft.exercicios.some(ex =>
    ex.series.some(s => s.ok || (Number.isFinite(s.peso) && Number.isFinite(s.reps)))
  );
  if (!temAlgo) {
    alert("Preencha pelo menos uma série (carga/reps) ou marque ✅ em alguma série antes de salvar.");
    return;
  }

  const sessao = montarSessaoParaHistorico(treinoDraft);
  const hist = loadHistory();

  const idx = hist.findIndex(h => h.data === sessao.data && h.treino === sessao.treino);
  if (idx >= 0) hist[idx] = sessao;
  else hist.push(sessao);

  saveHistory(hist);
  alert("✅ Treino salvo no histórico!");
};

window.finalizarTreino = function(){
  salvarSessao();
  clearDraft();
  treinoAtual = null;
  treinoDraft = null;
  el("treino").innerHTML = `<div class="card"><h2 class="h-title">✅ Treino finalizado!</h2><p class="sub">Abra o histórico para ver evolução e volume.</p></div>`;
  el("progressoGeral").style.display = "none";
  el("acoes").style.display = "none";
  el("cronometro").style.display = "none";
  setFabsVisible({ save:false, top:false });
  definirFraseMotivacional();
  renderMiniChart();
};

function montarSessaoParaHistorico(draft){
  const exercicios = draft.exercicios.map(ex => {
    const series = ex.series.map(s => ({
      peso: Number.isFinite(Number(s.peso)) ? Number(s.peso) : null,
      reps: Number.isFinite(Number(s.reps)) ? Number(s.reps) : null,
      ok: !!s.ok
    }));

    let volume = 0;
    series.forEach(s => {
      if (Number.isFinite(s.peso) && Number.isFinite(s.reps)) volume += s.peso * s.reps;
    });

    const topPeso = Math.max(...series.map(s => Number.isFinite(s.peso) ? s.peso : -Infinity));
    const topReps = Math.max(...series.map(s => Number.isFinite(s.reps) ? s.reps : -Infinity));

    return {
      nome: ex.nome,
      repsAlvo: ex.repsAlvo,
      descansoSeg: ex.descansoSeg,
      series,
      volume: Math.round(volume),
      recorde: {
        maiorPeso: isFinite(topPeso) ? topPeso : null,
        maiorReps: isFinite(topReps) ? topReps : null
      }
    };
  });

  const volumeTotal = exercicios.reduce((a,e)=>a+e.volume,0);

  return {
    data: draft.data,
    treino: draft.treino,
    volumeTotal: Math.round(volumeTotal),
    exercicios
  };
}

/** Histórico */
window.verHistorico = function(){
  // ✅ entra na tela de histórico (workarea)
  entrarWorkarea("Histórico");

  const hist = loadHistory().slice().sort((a,b) => (a.data > b.data ? -1 : 1));
  const treinoDiv = el("treino");
  treinoDiv.innerHTML = "";
  el("progressoGeral").style.display = "none";
  el("acoes").style.display = "none";
  el("cronometro").style.display = "none";

  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.innerHTML = `
    <div class="card-top">
      <div>
        <h2 class="h-title">📊 Histórico</h2>
        <div class="miniinfo">Aqui fica salvo por data, com volume e recordes.</div>
      </div>
      <div class="badges">
        <button class="sec" onclick="limparHistorico()">🗑 Limpar</button>
      </div>
    </div>
  `;
  treinoDiv.appendChild(wrap);

  if (!hist.length) {
    treinoDiv.appendChild(criarInfo("Sem histórico ainda. Salve um treino para começar a acompanhar evolução."));
    renderMiniChart();
    return;
  }

  hist.forEach(sessao => {
    const box = document.createElement("div");
    box.className = "hist-item";
    box.innerHTML = `
      <div class="hist-top">
        <div><b>${sessao.treino}</b> • ${formatBR(sessao.data)}</div>
        <div>🔥 Volume total: <b>${sessao.volumeTotal} kg</b></div>
      </div>
      <div class="hist-ex"></div>
    `;
    treinoDiv.appendChild(box);

    const list = box.querySelector(".hist-ex");
    sessao.exercicios.forEach(ex => {
      const badge = detectarStatusProgressao(ex.nome, ex.repsAlvo, ex);
      const row = document.createElement("div");
      row.className = "hist-ex-row";
      row.innerHTML = `
        <div><b>${ex.nome}</b> <span class="badge ${badge.classe}">${badge.texto}</span></div>
        <div>Vol: <b>${ex.volume} kg</b> • PR Peso: <b>${ex.recorde.maiorPeso ?? "--"}</b> • PR Reps: <b>${ex.recorde.maiorReps ?? "--"}</b></div>
      `;
      list.appendChild(row);
    });
  });

  renderMiniChart();
};

function detectarStatusProgressao(exNome, repsAlvoStr, exSessaoAtual){
  const hist = loadHistory();

  const registros = [];
  for (let i = 0; i < hist.length; i++) {
    const ex = hist[i].exercicios?.find(e => e.nome === exNome);
    if (ex) registros.push({ data: hist[i].data, ex });
  }
  if (registros.length < 2) {
    return { classe: "", texto: "Primeiro registro" };
  }

  const last = registros[registros.length - 1].ex;
  const prev = registros[registros.length - 2].ex;

  const lastPesos = last.series.map(s => s.peso).filter(Number.isFinite);
  const prevPesos = prev.series.map(s => s.peso).filter(Number.isFinite);
  if (!lastPesos.length || !prevPesos.length) return { classe: "", texto: "Sem comparação" };

  const mLast = media(lastPesos);
  const mPrev = media(prevPesos);

  if (mLast > mPrev + 0.25) return { classe: "good", texto: "🟢 Subiu" };
  if (mLast < mPrev - 0.25) return { classe: "bad", texto: "🔴 Caiu" };
  return { classe: "warn", texto: "🟡 Manteve" };
}

window.limparHistorico = function(){
  if (confirm("Tem certeza que deseja apagar todo o histórico?")) {
    localStorage.removeItem(STORAGE_HISTORY);
    alert("Histórico apagado.");
    verHistorico();
  }
};

function criarInfo(msg){
  const d = document.createElement("div");
  d.className = "card";
  d.innerHTML = `<p class="sub">${msg}</p>`;
  return d;
}

/***********************
 * MODAL GIF (NOVO) ✅
 ***********************/
function garantirModalGif(){
  let modal = document.getElementById("modalGif");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "modalGif";
  modal.className = "modal-gif";
  modal.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title" id="modalGifTitulo">Exercício</h3>
        <button class="modal-close" type="button" onclick="fecharModalGif()">✖ Fechar</button>
      </div>
      <div class="modal-body">
        <img id="modalGifImg" src="" alt="Demonstração do exercício" loading="lazy"/>
      </div>
    </div>
  `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModalGif();
  });

  // swipe down no celular para fechar
  let startY = null;
  const content = modal.querySelector(".modal-content");
  content?.addEventListener("touchstart", (e) => {
    startY = e.touches?.[0]?.clientY ?? null;
  }, { passive: true });

  content?.addEventListener("touchmove", (e) => {
    if (startY == null) return;
    const y = e.touches?.[0]?.clientY ?? startY;
    const dy = y - startY;
    if (dy > 90) {
      startY = null;
      fecharModalGif();
    }
  }, { passive: true });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModalGif();
  });

  document.body.appendChild(modal);
  return modal;
}

window.abrirModalGif = function(src, nome){
  const modal = garantirModalGif();
  const title = document.getElementById("modalGifTitulo");
  const img = document.getElementById("modalGifImg");

  title.textContent = nome || "Exercício";

  // tenta resolver diferenças de pasta/maiúsculas (GitHub/Vercel é case-sensitive)
  const tryList = [];
  const clean = String(src || "").replace(/^\.?\//,"");
  const base = "./" + clean;

  function addTry(s){
    if (!s) return;
    if (!tryList.includes(s)) tryList.push(s);
  }

  addTry(src);
  addTry(base);
  addTry(base.replace("/gifs/","/Gifs/"));
  addTry(base.replace("/Gifs/","/gifs/"));

  // também tenta capitalizar a primeira letra do arquivo (ex: agachamento-livre.gif -> Agachamento-livre.gif)
  const parts = base.split("/");
  const file = parts.pop() || "";
  if (file) {
    const cap = file.charAt(0).toUpperCase() + file.slice(1);
    addTry(parts.concat([cap]).join("/"));
    addTry(parts.concat([cap]).join("/").replace("/gifs/","/Gifs/"));
  }

  let idx = 0;

  img.onload = () => { /* ok */ };
  img.onerror = () => {
    idx += 1;
    if (idx < tryList.length) {
      img.src = encodeURI(tryList[idx]);
    } else {
      // falhou tudo: mostra aviso (sem quebrar layout)
      img.removeAttribute("src");
      img.alt = "GIF não encontrado. Verifique o nome/arquivo na pasta assets/gifs.";
    }
  };

  // primeira tentativa
  img.src = encodeURI(tryList[0] || "");

  modal.style.display = "flex";
};

window.fecharModalGif = function(){
  const modal = document.getElementById("modalGif");
  if (!modal) return;
  modal.style.display = "none";

  const img = document.getElementById("modalGifImg");
  if (img) img.src = "";
};

/** Ao abrir, começa no HOME ✅ */
(function init(){
  carregarBuilder();
  document.body.classList.add("mode-home");
  document.body.classList.remove("mode-work");
  document.body.classList.add("is-home");
  document.body.classList.remove("is-workarea");
  // Home hero: começa sem seleção
  treinoSelecionadoHome = null;
  const btn = document.getElementById("btnComecarTreino");
  if (btn){ btn.classList.add("is-disabled"); btn.textContent = "🚀 Começar treino"; }
  const lbl = document.getElementById("treinoSelecionadoLabel");
  if (lbl) lbl.textContent = "Selecione um treino abaixo 👇";
  el("home").style.display = "block";
  el("workarea").style.display = "none";
  setChipHome("Escolha um treino");
  setBottomNavActive("home");
  setFabsVisible({ save:false, top:false });
  renderMiniChart();
})();


/* =====================================================
   TREINO INTELIGENTE (Objetivo/Nível/Tipo) ✅
   - muda exercícios (não só reps/descanso)
   - evita repetir sempre os mesmos
   - cria "Treino do dia" sem depender dos TREINOS fixos
   ===================================================== */

const STORAGE_LAST_PICK = "treino_last_pick_v1";

function _seedKey(goal, level, focus){ return `${goal}|${level}|${focus}`; }

function _loadLastPick(key){
  try { return (JSON.parse(localStorage.getItem(STORAGE_LAST_PICK) || "{}")[key]) || []; }
  catch { return []; }
}
function _saveLastPick(key, arr){
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_LAST_PICK) || "{}");
    all[key] = arr || [];
    localStorage.setItem(STORAGE_LAST_PICK, JSON.stringify(all));
  } catch {}
}

function _shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _pick(pool, { prefer=[], avoid=[], notIn=[] } = {}){
  const used = new Set((notIn||[]).map(s => String(s).toLowerCase()));
  const ok = pool.filter(ex => {
    const n = String(ex.nome||"").toLowerCase();
    if (used.has(n)) return false;
    if (avoid.some(rx => rx.test(n))) return false;
    return true;
  });

  for (const rx of prefer){
    const hits = ok.filter(ex => rx.test(String(ex.nome||"").toLowerCase()));
    if (hits.length) return _shuffle(hits)[0];
  }
  return ok.length ? _shuffle(ok)[0] : null;
}

function _tunePorObjetivo(ex, goal){
  const e = { ...ex };

  if (goal === "forca"){
    e.repsAlvo = "4-6";
    e.descansoSeg = Math.max(75, (e.descansoSeg || 60) + 30);
    e.series = Math.min(5, Math.max(3, e.series || 3));
  } else if (goal === "emagrecimento"){
    e.repsAlvo = "12-15";
    e.descansoSeg = Math.max(30, (e.descansoSeg || 60) - 15);
    e.series = Math.min(4, Math.max(2, e.series || 3));
  } else { // hipertrofia
    e.repsAlvo = "8-12";
    e.descansoSeg = Math.max(45, (e.descansoSeg || 60));
    e.series = Math.min(4, Math.max(3, e.series || 3));
  }

  return e;
}

function _plan({ focus, goal, level }){
  const isAdv = level === "avancado";
  const isBeg = level === "iniciante";

  const RX = {
    squat: /(agach|hack|sissy|smith)/,
    pressLeg: /(leg press)/,
    hinge: /(terra|stiff|good morning)/,
    glute: /(glute|glúteo|eleva[cç][aã]o p[ée]lvica|hip thrust|bridge)/,
    quadIso: /(extensora)/,
    hamIso: /(flexora|mesa flexora|nordic)/,
    abductor: /(abdutor|abdu[cç][aã]o)/,
    calf: /(panturrilha)/,

    press: /(supino|peck|crucifixo|cross over)/,
    vPull: /(puxada|barra fixa|pullover)/,
    row: /(remada)/,
    shoulder: /(desenvolvimento|eleva[cç][aã]o lateral|eleva[cç][aã]o frontal|face pull|arnold)/,
    biceps: /(rosca)/,
    triceps: /(tr[íi]ceps)/,

    core: /(abdominal|prancha)/,
    cardio: /(box jump|slam ball|kettlebell swing)/,
  };

  const qtd =
    goal === "forca" ? (isAdv ? 5 : 4) :
    goal === "emagrecimento" ? 6 :
    5;

  if (focus === "inferior"){
    const mainPrefer = isBeg ? [RX.pressLeg, RX.squat] : [RX.squat, RX.pressLeg];
    const blocks = [
      { prefer: mainPrefer },      // agacho/leg
      { prefer: [RX.hinge] },      // hinge
      { prefer: [RX.quadIso] },    // quadríceps
      { prefer: [RX.hamIso] },     // posterior
      { prefer: [RX.calf] },       // panturrilha
    ];
    if (qtd >= 6) blocks.splice(4, 0, { prefer: [RX.glute, RX.abductor] }); // + glúteo/abdutor
    if (goal === "forca"){
      return [
        { prefer: mainPrefer },
        { prefer: [RX.hinge] },
        { prefer: [RX.glute, RX.abductor, RX.hamIso] },
        { prefer: [RX.calf] },
        ...(isAdv ? [{ prefer: [RX.quadIso, RX.hamIso] }] : [])
      ].slice(0, qtd);
    }
    return blocks.slice(0, qtd);
  }

  // superior
  const pressPrefer = isBeg ? [/(supino reto|peck deck|crucifixo)/, RX.press] : [RX.press];
  const vPullPrefer = isBeg ? [/(puxada)/, RX.vPull] : [RX.vPull];
  const rowPrefer   = isBeg ? [/(remada baixa|unilateral)/, RX.row] : [RX.row];

  const blocks = [
    { prefer: pressPrefer },
    { prefer: vPullPrefer },
    { prefer: rowPrefer },
    { prefer: [RX.shoulder] },
    { prefer: [RX.triceps, RX.biceps] },
  ];
  if (qtd >= 6) blocks.push({ prefer: [RX.core, RX.cardio] });

  if (goal === "forca"){
    return [
      { prefer: pressPrefer },
      { prefer: vPullPrefer },
      { prefer: rowPrefer },
      { prefer: [RX.shoulder] },
      ...(isAdv ? [{ prefer: [RX.triceps, RX.biceps] }] : [])
    ].slice(0, qtd);
  }
  return blocks.slice(0, qtd);
}

function montarTreinoInteligente({ goal, level, focus }){
  const lib = montarBiblioteca(); // sua biblioteca completa (treinos + extras)
  const pool = lib.filter(ex => {
    if (focus === "inferior") return ex.cat === "Inferior" || ex.cat === "Geral";
    return ex.cat === "Superior" || ex.cat === "Geral";
  });

  const key = _seedKey(goal, level, focus);
  const lastPick = _loadLastPick(key);

  const chosen = [];
  const chosenNames = [];

  const steps = _plan({ goal, level, focus });

  steps.forEach(step => {
    const ex = _pick(pool, { prefer: step.prefer || [], avoid: step.avoid || [], notIn: chosenNames.concat(lastPick) });
    if (ex){
      const tuned = _tunePorObjetivo({
        nome: ex.nome,
        series: ex.series,
        repsAlvo: ex.repsAlvo,
        descansoSeg: ex.descansoSeg,
        gif: ex.gif || ""
      }, goal);
      chosen.push(tuned);
      chosenNames.push(String(tuned.nome).toLowerCase());
    }
  });

  // completa se faltar
  while (chosen.length < steps.length){
    const ex = _pick(pool, { notIn: chosenNames.concat(lastPick) });
    if (!ex) break;
    const tuned = _tunePorObjetivo({
      nome: ex.nome,
      series: ex.series,
      repsAlvo: ex.repsAlvo,
      descansoSeg: ex.descansoSeg,
      gif: ex.gif || ""
    }, goal);
    chosen.push(tuned);
    chosenNames.push(String(tuned.nome).toLowerCase());
  }

  _saveLastPick(key, chosenNames);
  return chosen;
}

// Botão principal da Home (recomendado):
// - se tiver um card selecionado, começa aquele treino
// - se não tiver, monta um treino inteligente pelo objetivo/nível/tipo
window.iniciarTreinoHome = function(){
  if (treinoSelecionadoHome){
    window.iniciarTreinoSelecionado();
    return;
  }
  window.iniciarTreinoPrincipal();
};

// Começar treino pelo objetivo/nível/tipo (Treino do dia)
window.iniciarTreinoPrincipal = function(){
  const goal  = document.getElementById("goalSelect")?.value;
  const level = document.getElementById("levelSelect")?.value;
  const focus = document.getElementById("focusSelect")?.value;

  if (!goal || !level || !focus){
    alert("Selecione objetivo, nível e tipo.");
    return;
  }

  const exercicios = montarTreinoInteligente({ goal, level, focus });
  if (!exercicios.length){
    alert("Não consegui montar o treino. (Biblioteca vazia?)");
    return;
  }

  treinoAtual = "Treino do dia";
  entrarWorkarea(treinoAtual);

  treinoDraft = {
    data: hojeISO(),
    treino: treinoAtual,
    exercicios: exercicios.map(ex => ({
      nome: ex.nome,
      repsAlvo: ex.repsAlvo,
      descansoSeg: ex.descansoSeg,
      gif: ex.gif || "",
      series: Array.from({ length: ex.series }).map(() => ({ peso:null, reps:null, ok:false }))
    }))
  };

  saveDraft(treinoDraft);
  renderTreino();
};
