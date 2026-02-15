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
const STORAGE_PREFS = "treino_prefs_v1";
// ===========================
// TREINO AUTOMÁTICO (Objetivo / Nível / Tipo) ✅
// - Seleciona EXERCÍCIOS diferentes (não só muda séries)
// - Evita repetir os últimos exercícios gerados
// - Ajusta séries/reps/descanso pelo objetivo + nível
// ===========================
const STORAGE_AUTO_LAST = "treino_auto_last_v1";
const STORAGE_AUTO_ROTATION = "treino_auto_rotation_v1";

// Exercícios "compostos" (mais pesados) -> prioridade em Força/Hipertrofia
const EX_COMPOSTOS = new Set([
  "agachamento livre",
  "levantamento terra",
  "leg press",
  "supino reto",
  "supino inclinado",
  "remada curvada",
  "remada baixa",
  "puxada na frente",
  "desenvolvimento ombro",
  "stiff-halteres",
  "bulgaro"
]);

function cap(str){
  const s = String(str||"").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function labelObjetivo(goal){
  const g = String(goal||"").toLowerCase();
  if (g === "forca") return "Força";
  if (g === "emagrecimento") return "Emagrecimento";
  return "Hipertrofia";
}
function labelNivel(level){
  const l = String(level||"").toLowerCase();
  if (l === "iniciante") return "Iniciante";
  if (l === "avancado") return "Avançado";
  return "Intermediário";
}
function labelTipo(focus){
  const f = String(focus||"").toLowerCase();
  return (f === "superior") ? "Superior" : "Inferior";
}

function shuffle(arr){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function uniq(arr){
  const set = new Set();
  const out = [];
  arr.forEach(x=>{
    const k = String(x||"").trim().toLowerCase();
    if (!k || set.has(k)) return;
    set.add(k);
    out.push(x);
  });
  return out;
}

function loadAutoRotation(){
  try { return JSON.parse(localStorage.getItem(STORAGE_AUTO_ROTATION) || "{}"); }
  catch { return {}; }
}
function saveAutoRotation(obj){
  localStorage.setItem(STORAGE_AUTO_ROTATION, JSON.stringify(obj||{}));
}
function loadAutoLast(){
  try { return JSON.parse(localStorage.getItem(STORAGE_AUTO_LAST) || "null"); }
  catch { return null; }
}
function saveAutoLast(obj){
  localStorage.setItem(STORAGE_AUTO_LAST, JSON.stringify(obj||null));
}

// Pega gif/meta pelo nome do exercício (usando a biblioteca existente)
function getExMetaMap(){
  const lib = montarBiblioteca();
  const map = new Map();
  lib.forEach(ex=>{
    map.set(String(ex.nome||"").trim().toLowerCase(), ex);
  });
  return map;
}

// Escolhe quantos exercícios por nível/objetivo
function qtdExercicios(goal, level){
  const g = String(goal||"").toLowerCase();
  const l = String(level||"").toLowerCase();
  if (g === "forca"){
    if (l === "iniciante") return 4;
    if (l === "avancado") return 5;
    return 5;
  }
  if (g === "emagrecimento"){
    if (l === "iniciante") return 5;
    if (l === "avancado") return 7;
    return 6;
  }
  // hipertrofia
  if (l === "iniciante") return 5;
  if (l === "avancado") return 7;
  return 6;
}

// Define séries/reps/descanso
function parametrosEx(goal, level, nomeEx){
  const g = String(goal||"").toLowerCase();
  const l = String(level||"").toLowerCase();
  const isComp = EX_COMPOSTOS.has(String(nomeEx||"").toLowerCase());

  // defaults
  let series = 3;
  let repsAlvo = "8-12";
  let descansoSeg = 75;

  if (g === "forca"){
    repsAlvo = isComp ? "3-6" : "6-8";
    descansoSeg = isComp ? 180 : 120;
    series = isComp ? 4 : 3;
  } else if (g === "emagrecimento"){
    repsAlvo = isComp ? "10-15" : "12-20";
    descansoSeg = 45;
    series = isComp ? 3 : 3;
  } else { // hipertrofia
    repsAlvo = isComp ? "6-10" : "10-15";
    descansoSeg = isComp ? 90 : 60;
    series = isComp ? 4 : 3;
  }

  // Ajuste por nível
  if (l === "iniciante"){
    // menos volume e mais controle
    series = Math.max(2, series-1);
    descansoSeg = Math.min(descansoSeg, g==="forca" ? 150 : 75);
  }
  if (l === "avancado"){
    // um pouco mais de volume
    series = Math.min(5, series+1);
    // descanso mantém, mas não precisa aumentar
  }

  return { series, repsAlvo, descansoSeg };
}

// Pool por tipo e por objetivo (só com os exercícios que você já tem no app)
function poolPorPrefs(goal, focus){
  const g = String(goal||"").toLowerCase();
  const f = String(focus||"").toLowerCase();

  const superiorBase = [
    "Supino reto",
    "Supino inclinado",
    "Puxada na frente",
    "Remada baixa",
    "Remada curvada",
    "Desenvolvimento ombro",
    "Elevação lateral",
    "Rosca direta",
    "Tríceps corda",
    "Tríceps testa",
  ];

  const inferiorBase = [
    "Agachamento livre",
    "Leg press",
    "Levantamento terra",
    "stiff-halteres",
    "bulgaro",
    "Cadeira extensora",
    "Mesa flexora",
    "cadeira-abdutora",
    "Panturrilha em pé",
    "Panturrilha sentado",
  ];

  let pool = (f === "superior") ? superiorBase : inferiorBase;

  // Ajuste do pool por objetivo (prioriza compostos em força e hipertrofia)
  if (g === "forca"){
    pool = (f === "superior")
      ? ["Supino reto","Remada curvada","Puxada na frente","Desenvolvimento ombro","Supino inclinado","Remada baixa","Tríceps testa","Rosca direta"]
      : ["Agachamento livre","Levantamento terra","Leg press","stiff-halteres","bulgaro","Cadeira extensora","Mesa flexora","Panturrilha em pé"];
  } else if (g === "emagrecimento"){
    pool = (f === "superior")
      ? ["Puxada na frente","Remada baixa","Supino inclinado","Elevação lateral","Rosca direta","Tríceps corda","Supino reto","Remada curvada"]
      : ["Leg press","bulgaro","Mesa flexora","Cadeira extensora","cadeira-abdutora","Panturrilha em pé","Agachamento livre","stiff-halteres"];
  } else {
    // hipertrofia (mix)
    pool = (f === "superior")
      ? ["Supino inclinado","Puxada na frente","Remada baixa","Desenvolvimento ombro","Elevação lateral","Rosca direta","Tríceps corda","Supino reto","Remada curvada","Tríceps testa"]
      : ["Agachamento livre","Leg press","Cadeira extensora","Mesa flexora","bulgaro","stiff-halteres","cadeira-abdutora","Panturrilha em pé","Panturrilha sentado","Levantamento terra"];
  }

  return uniq(pool);
}

// Evita repetição: não usar exercícios que apareceram nas últimas gerações para aquela combinação
function escolherExerciciosSemRepetir(goal, level, focus){
  const key = `${String(goal||"").toLowerCase()}|${String(level||"").toLowerCase()}|${String(focus||"").toLowerCase()}`;
  const rot = loadAutoRotation();
  const recentes = (rot[key] || []).map(x=>String(x).toLowerCase());

  const pool = poolPorPrefs(goal, focus);
  const qtd = Math.min(qtdExercicios(goal, level), pool.length);

  // 1) tenta pegar do pool excluindo recentes
  const semRecentes = pool.filter(n => !recentes.includes(String(n).toLowerCase()));
  let escolhidos = shuffle(semRecentes).slice(0, qtd);

  // 2) se não deu, completa com o pool completo embaralhado
  if (escolhidos.length < qtd){
    const faltam = qtd - escolhidos.length;
    const resto = shuffle(pool.filter(n => !escolhidos.map(x=>String(x).toLowerCase()).includes(String(n).toLowerCase())));
    escolhidos = escolhidos.concat(resto.slice(0, faltam));
  }

  // Atualiza rotação (guarda os últimos 12 nomes)
  rot[key] = (escolhidos.map(x=>String(x))).concat(rot[key] || []).slice(0, 12);
  saveAutoRotation(rot);

  return escolhidos;
}

// Gera um treino "Auto" e injeta no TREINOS
function gerarTreinoAutomatico(prefs){
  const goal = prefs.goal || "hipertrofia";
  const level = prefs.level || "intermediario";
  const focus = prefs.focus || "inferior";

  const nomeTreino = `Auto • ${labelTipo(focus)} • ${labelObjetivo(goal)} • ${labelNivel(level)}`;

  const metaMap = getExMetaMap();
  const nomes = escolherExerciciosSemRepetir(goal, level, focus);

  const exercicios = nomes.map(nomeEx => {
    const meta = metaMap.get(String(nomeEx).trim().toLowerCase());
    const p = parametrosEx(goal, level, nomeEx);
    const gif = meta?.gif || "";
    return mkEx(meta?.nome || nomeEx, p.series, p.repsAlvo, p.descansoSeg, gif);
  });

  TREINOS[nomeTreino] = exercicios;

  // guarda para reconstruir após refresh
  saveAutoLast({
    nomeTreino,
    data: hojeISO(),
    prefs: { goal, level, focus },
    exercicios: exercicios.map(e => ({
      nome: e.nome,
      series: e.series,
      repsAlvo: e.repsAlvo,
      descansoSeg: e.descansoSeg,
      gif: e.gif || ""
    }))
  });

  return nomeTreino;
}

// Recria o último treino automático ao abrir o app (evita erro se a pessoa voltar nele)
function restaurarUltimoTreinoAutomatico(){
  const last = loadAutoLast();
  if (!last || !last.nomeTreino || !Array.isArray(last.exercicios)) return;
  if (TREINOS[last.nomeTreino]) return;

  TREINOS[last.nomeTreino] = last.exercicios.map(e => mkEx(
    e.nome, Number(e.series)||3, String(e.repsAlvo||"8-12"), Number(e.descansoSeg)||60, e.gif||""
  ));
}

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
/** Preferências da Home (objetivo / nível / tipo) */
function loadPrefs(){
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFS) || "{}"); }
  catch { return {}; }
}
function savePrefs(prefs){
  try { localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs || {})); } catch {}
}
function getHomePrefs(){
  const goal = document.getElementById("goalSelect")?.value || "";
  const level = document.getElementById("levelSelect")?.value || "";
  const focus = document.getElementById("focusSelect")?.value || "";
  const prefs = { goal, level, focus };
  savePrefs(prefs);
  return prefs;
}
function initHomePrefs(){
  restaurarUltimoTreinoAutomatico();
  const prefs = loadPrefs();
  const goal = document.getElementById("goalSelect");
  const level = document.getElementById("levelSelect");
  const focus = document.getElementById("focusSelect");

  if (goal && prefs.goal) goal.value = prefs.goal;
  if (level && prefs.level) level.value = prefs.level;
  if (focus && prefs.focus) focus.value = prefs.focus;

  [goal, level, focus].forEach(elSel => {
    if (!elSel) return;
    elSel.addEventListener("change", () => getHomePrefs());
  });
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
    btn.classList.toggle("is-selected", btn.dataset.treino === nomeTreino);
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
/** Começar: se você selecionou um treino manualmente, ele tem prioridade.
    Senão, usa a recomendação baseada em Objetivo/Nível/Tipo. */
window.iniciarTreinoPrincipal = function(){
  if (treinoSelecionadoHome){
    carregarTreino(treinoSelecionadoHome);
    return;
  }
  iniciarTreinoAutomatico();
};

/** ✅ Começar treino baseado nas escolhas (Objetivo / Nível / Tipo) */
window.iniciarTreinoAutomatico = function(){
  const prefs = getHomePrefs();

  // ✅ gera um treino novo (com exercícios diferentes) baseado em Objetivo/Nível/Tipo
  const recomendado = gerarTreinoAutomatico(prefs);

  // feedback na Home
  treinoSelecionadoHome = recomendado;
  const lbl = document.getElementById("treinoSelecionadoLabel");
  if (lbl){
    lbl.textContent = `Recomendado: ${recomendado}`;
  }

  carregarTreino(recomendado);
};

/** ✅ Abre direto a parte de "Treinos salvos" (sem apagar nada) */
window.abrirTreinosSalvos = function(){
  abrirBiblioteca();
  setTimeout(() => {
    const wrap = document.getElementById("builderSavedWrap");
    if (wrap) wrap.scrollIntoView({ behavior:"smooth", block:"start" });
  }, 50);
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

  document.body.classList.remove("mode-home","mode-work");
  document.body.classList.add("mode-builder");

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
  renderBiblioteca(false);
  salvarBuilder();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

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
  if (btn){ btn.classList.remove("is-disabled"); btn.textContent = "🚀 Começar treino"; }
  const lbl = document.getElementById("treinoSelecionadoLabel");
  if (lbl) lbl.textContent = "Dica: escolha objetivo, nível e tipo para recomendar seu treino.";

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
  if (!TREINOS[nomeTreino] || !Array.isArray(TREINOS[nomeTreino])) {
    alert('Treino não encontrado (talvez você atualizou o projeto). Volte para a Home e escolha novamente.');
    try { mostrarHome(); } catch {}
    return;
  }

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
  const base = TREINOS[nomeTreino];
  if (!base || !Array.isArray(base)) return { data: hojeISO(), treino: nomeTreino, exercicios: [] };
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
  document.body.classList.remove("mode-work","mode-builder");
  document.body.classList.add("is-home");
  document.body.classList.remove("is-workarea");

  // Home: inicia selects e frase motivacional
  initHomePrefs();
  definirFraseMotivacional();

  // botão Começar (não fica desabilitado)
  const btn = document.getElementById("btnComecarTreino");
  if (btn){
    btn.classList.remove("is-disabled");
    // o onclick está no HTML (iniciarTreinoAutomatico)
  }

  // label inferior (dica / recomendado)
  const lbl = document.getElementById("treinoSelecionadoLabel");
  if (lbl) lbl.textContent = "Dica: escolha objetivo, nível e tipo para recomendar seu treino.";

  el("home").style.display = "block";
  el("workarea").style.display = "none";

  setChipHome("Escolha seu treino");
  setBottomNavActive("home");
  setFabsVisible({ save:false, top:false });
  renderMiniChart();
})();

