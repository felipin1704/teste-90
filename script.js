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


/** ============================
 *  PROGRAMAS (Objetivo + Nível) ✅
 *  Opção B: troca automática de exercícios / reps / descanso
 *  ============================ */

const TREINO_LABELS = {"Inferior 1": "Treino Completo Inferior 1", "Inferior 2": "Treino Completo Inferior 2", "Superior 1": "Treino Completo Superior 1", "Superior 2": "Treino Completo Superior 2"};
function friendlyNomeTreino(t){ return TREINO_LABELS[t] || t; }

// ✅ Banco de exercícios (para reaproveitar GIFs)
const EX_DB = {
  "Agachamento livre": { gif:"assets/gifs/agachamento-livre.gif" },
  "Leg press": { gif:"assets/gifs/leg-press.gif" },
  "Cadeira extensora": { gif:"assets/gifs/cadeira-extensora.gif" },
  "Mesa flexora": { gif:"assets/gifs/mesa-flexora.gif" },
  "Panturrilha em pé": { gif:"assets/gifs/panturrilha-em-pe.gif" },

  "Supino reto": { gif:"assets/gifs/supino-reto.gif" },
  "Puxada na frente": { gif:"assets/gifs/puxada-frente.gif" },
  "Desenvolvimento ombro": { gif:"assets/gifs/desenvolvimento-ombro.gif" },
  "Remada baixa": { gif:"assets/gifs/remada-baixa.gif" },
  "Tríceps corda": { gif:"assets/gifs/triceps-corda.gif" },

  "Levantamento terra": { gif:"assets/gifs/levantamento-terra.gif" },
  "bulgaro": { gif:"assets/gifs/bulgaro.gif" },
  "cadeira-abdutora": { gif:"assets/gifs/cadeira-abdutora.gif" },
  "stiff-halteres": { gif:"assets/gifs/stiff-halteres.gif" },
  "Panturrilha sentado": { gif:"assets/gifs/panturrilha-sentado.gif" },

  "Supino inclinado": { gif:"assets/gifs/supino-inclinado.gif" },
  "Remada curvada": { gif:"assets/gifs/remada-curvada.gif" },
  "Elevação lateral": { gif:"assets/gifs/elevacao-lateral.gif" },
  "Rosca direta": { gif:"assets/gifs/rosca-direta.gif" },
  "Tríceps testa": { gif:"assets/gifs/triceps-testa.gif" },

  "Supino declinado barra": { gif:"assets/gifs/supino-declinado-barra.gif" },
  "Crucifixo máquina": { gif:"assets/gifs/crucifixo-maquina.gif" },
  "Cross over polia alta": { gif:"assets/gifs/cross-over-polia-alta.gif" },
  "Peck deck": { gif:"assets/gifs/peck-deck.gif" },
  "Pulldown pegada aberta": { gif:"assets/gifs/pulldown-pegada-aberta.gif" },
  "Pulldown pegada neutra": { gif:"assets/gifs/pulldown-pegada-neutra.gif" },
  "Remada cavalinho": { gif:"assets/gifs/remada-cavalinho.gif" },
  "Remada articulada unilateral": { gif:"assets/gifs/remada-articulada-unilateral.gif" },
  "Desenvolvimento arnold": { gif:"assets/gifs/desenvolvimento-arnold.gif" },
  "Elevação lateral na polia": { gif:"assets/gifs/elevacao-lateral-na-polia.gif" },
  "Elevação posterior máquina": { gif:"assets/gifs/elevacao-posterior-maquina.gif" },
  "Rosca scott barra": { gif:"assets/gifs/rosca-scott-barra.gif" },
  "Rosca concentrada": { gif:"assets/gifs/rosca-concentrada.gif" },
  "Rosca cabo": { gif:"assets/gifs/rosca-cabo.gif" },
  "Tríceps banco": { gif:"assets/gifs/triceps-banco.gif" },
  "Tríceps francês halter": { gif:"assets/gifs/triceps-frances-halter.gif" },
  "Tríceps pulley barra": { gif:"assets/gifs/triceps-pulley-barra.gif" },
  "Agachamento hack": { gif:"assets/gifs/agachamento-hack.gif" },
  "Passada no smith": { gif:"assets/gifs/passada-no-smith.gif" },
  "Sissy squat": { gif:"assets/gifs/sissy-squat.gif" },
  "Good morning barra": { gif:"assets/gifs/good-morning-barra.gif" },
  "Flexora em pé": { gif:"assets/gifs/flexora-em-pe.gif" },
  "Nordic curl": { gif:"assets/gifs/nordic-curl.gif" },
  "Glute bridge": { gif:"assets/gifs/glute-bridge.gif" },
  "Step up banco": { gif:"assets/gifs/step-up-banco.gif" },
  "Abdução cabo": { gif:"assets/gifs/abducao-cabo.gif" },
  "Panturrilha no leg press": { gif:"assets/gifs/panturrilha-no-leg-press.gif" },
  "Panturrilha unilateral": { gif:"assets/gifs/panturrilha-unilateral.gif" },
  "Prancha lateral": { gif:"assets/gifs/prancha-lateral.gif" },
  "Abdominal bicicleta": { gif:"assets/gifs/abdominal-bicicleta.gif" },
  "Abdominal supra": { gif:"assets/gifs/abdominal-supra.gif" },
  "Dragon flag": { gif:"assets/gifs/dragon-flag.gif" },
  "Box jump": { gif:"assets/gifs/box-jump.gif" },
  "Slam ball": { gif:"assets/gifs/slam-ball.gif" },
  "Battle rope": { gif:"assets/gifs/battle-rope.gif" },
  "Mountain climber": { gif:"assets/gifs/mountain-climber.gif" },
  "Farmer walk": { gif:"assets/gifs/farmer-walk.gif" },
  "Jump squat barra": { gif:"assets/gifs/jump-squat-barra.gif" },
  "Swing kettlebell alternado": { gif:"assets/gifs/swing-kettlebell-alternado.gif" },
  "Afundo com salto": { gif:"assets/gifs/afundo-com-salto.gif" },
};

// Helper para criar exercício com gif automático
function ex(nome, series, repsAlvo, descansoSeg){
  const gif = EX_DB[nome]?.gif || "";
  return { nome, series, repsAlvo, descansoSeg, gif };
}

/**
 * ✅ PROGRAMA
 * - hipertrofia: reps moderadas, descanso moderado
 * - forca: reps baixas, descanso maior
 * - emagrecimento: reps mais altas, descanso menor
 *
 * ✅ Níveis
 * - iniciante: menos séries e exercícios mais “simples”
 * - intermediario: padrão
 * - avancado: mais volume e/ou mais pesado
 */
const PROGRAMAS = {
  hipertrofia: {
    iniciante: {
      "Inferior 1": [
        ex("Leg press", 3, "10-12", 75),
        ex("Cadeira extensora", 3, "12-15", 60),
        ex("Mesa flexora", 3, "10-12", 60),
        ex("Agachamento livre", 2, "10-12", 90),
        ex("Panturrilha em pé", 3, "12-15", 45),
      ],
      "Superior 1": [
        ex("Supino reto", 3, "8-10", 75),
        ex("Puxada na frente", 3, "10-12", 75),
        ex("Remada baixa", 3, "10-12", 60),
        ex("Tríceps corda", 3, "12-15", 60),
        ex("Elevação lateral", 3, "12-15", 45),
      ],
      "Inferior 2": [
        ex("stiff-halteres", 3, "10-12", 75),
        ex("bulgaro", 3, "10-12", 75),
        ex("cadeira-abdutora", 3, "12-15", 60),
        ex("Mesa flexora", 3, "10-12", 60),
        ex("Panturrilha sentado", 3, "12-15", 45),
      ],
      "Superior 2": [
        ex("Supino inclinado", 3, "10-12", 75),
        ex("Remada curvada", 3, "8-10", 90),
        ex("Rosca direta", 3, "10-12", 60),
        ex("Tríceps testa", 3, "10-12", 60),
        ex("Elevação lateral", 3, "12-15", 45),
      ],
    },
    intermediario: {
      "Inferior 1": [
        ex("Agachamento livre", 3, "8-10", 90),
        ex("Leg press", 3, "10-12", 75),
        ex("Cadeira extensora", 3, "12-15", 60),
        ex("Mesa flexora", 3, "10-12", 60),
        ex("Panturrilha em pé", 4, "10-15", 45),
      ],
      "Superior 1": [
        ex("Supino reto", 3, "6-8", 90),
        ex("Puxada na frente", 3, "8-10", 75),
        ex("Desenvolvimento ombro", 3, "8-10", 75),
        ex("Remada baixa", 3, "10-12", 60),
        ex("Tríceps corda", 3, "10-12", 60),
      ],
      "Inferior 2": [
        ex("Levantamento terra", 3, "8-10", 90),
        ex("bulgaro", 3, "10-12", 75),
        ex("cadeira-abdutora", 3, "12-15", 60),
        ex("stiff-halteres", 3, "12-15", 60),
        ex("Panturrilha sentado", 4, "10-15", 45),
      ],
      "Superior 2": [
        ex("Supino inclinado", 3, "8-10", 75),
        ex("Remada curvada", 3, "6-8", 90),
        ex("Elevação lateral", 4, "12-15", 45),
        ex("Rosca direta", 3, "8-10", 60),
        ex("Tríceps testa", 3, "8-10", 60),
      ],
    },
    avancado: {
      "Inferior 1": [
        ex("Agachamento livre", 4, "6-8", 120),
        ex("Leg press", 4, "8-10", 90),
        ex("Cadeira extensora", 4, "10-12", 75),
        ex("Mesa flexora", 4, "8-10", 75),
        ex("Panturrilha em pé", 5, "10-15", 45),
      ],
      "Superior 1": [
        ex("Supino reto", 4, "5-7", 120),
        ex("Puxada na frente", 4, "6-8", 90),
        ex("Desenvolvimento ombro", 4, "6-8", 90),
        ex("Remada baixa", 4, "8-10", 75),
        ex("Tríceps corda", 4, "10-12", 60),
      ],
      "Inferior 2": [
        ex("Levantamento terra", 4, "5-7", 120),
        ex("bulgaro", 4, "8-10", 90),
        ex("stiff-halteres", 4, "8-10", 75),
        ex("cadeira-abdutora", 4, "12-15", 60),
        ex("Panturrilha sentado", 5, "10-15", 45),
      ],
      "Superior 2": [
        ex("Supino inclinado", 4, "6-8", 90),
        ex("Remada curvada", 4, "5-7", 120),
        ex("Elevação lateral", 5, "12-15", 45),
        ex("Rosca direta", 4, "8-10", 60),
        ex("Tríceps testa", 4, "8-10", 60),
      ],
    }
  },

  forca: {
    iniciante: {
      "Inferior 1": [
        ex("Agachamento livre", 3, "5-6", 120),
        ex("Leg press", 3, "6-8", 120),
        ex("Cadeira extensora", 2, "8-10", 90),
        ex("Mesa flexora", 2, "8-10", 90),
        ex("Panturrilha em pé", 3, "8-12", 60),
      ],
      "Superior 1": [
        ex("Supino reto", 3, "4-6", 150),
        ex("Puxada na frente", 3, "5-7", 120),
        ex("Remada baixa", 3, "6-8", 120),
        ex("Desenvolvimento ombro", 2, "6-8", 120),
        ex("Tríceps corda", 2, "8-10", 90),
      ],
      "Inferior 2": [
        ex("Levantamento terra", 3, "4-6", 150),
        ex("stiff-halteres", 3, "6-8", 120),
        ex("bulgaro", 2, "6-8", 120),
        ex("cadeira-abdutora", 2, "10-12", 75),
        ex("Panturrilha sentado", 3, "8-12", 60),
      ],
      "Superior 2": [
        ex("Supino inclinado", 3, "5-7", 120),
        ex("Remada curvada", 3, "4-6", 150),
        ex("Rosca direta", 2, "6-8", 90),
        ex("Tríceps testa", 2, "6-8", 90),
        ex("Elevação lateral", 2, "10-12", 60),
      ],
    },
    intermediario: {
      "Inferior 1": [
        ex("Agachamento livre", 4, "4-6", 150),
        ex("Leg press", 4, "6-8", 120),
        ex("Cadeira extensora", 3, "8-10", 90),
        ex("Mesa flexora", 3, "8-10", 90),
        ex("Panturrilha em pé", 4, "8-12", 60),
      ],
      "Superior 1": [
        ex("Supino reto", 4, "3-5", 180),
        ex("Puxada na frente", 4, "4-6", 150),
        ex("Desenvolvimento ombro", 3, "4-6", 150),
        ex("Remada baixa", 4, "6-8", 120),
        ex("Tríceps corda", 3, "8-10", 90),
      ],
      "Inferior 2": [
        ex("Levantamento terra", 4, "3-5", 180),
        ex("bulgaro", 3, "6-8", 120),
        ex("stiff-halteres", 4, "6-8", 120),
        ex("cadeira-abdutora", 3, "10-12", 75),
        ex("Panturrilha sentado", 4, "8-12", 60),
      ],
      "Superior 2": [
        ex("Supino inclinado", 4, "4-6", 150),
        ex("Remada curvada", 4, "3-5", 180),
        ex("Elevação lateral", 3, "10-12", 60),
        ex("Rosca direta", 3, "6-8", 90),
        ex("Tríceps testa", 3, "6-8", 90),
      ],
    },
    avancado: {
      "Inferior 1": [
        ex("Agachamento livre", 5, "3-5", 180),
        ex("Leg press", 5, "5-7", 150),
        ex("Cadeira extensora", 4, "6-8", 120),
        ex("Mesa flexora", 4, "6-8", 120),
        ex("Panturrilha em pé", 5, "8-12", 60),
      ],
      "Superior 1": [
        ex("Supino reto", 5, "2-4", 210),
        ex("Puxada na frente", 5, "3-5", 180),
        ex("Desenvolvimento ombro", 4, "3-5", 180),
        ex("Remada baixa", 5, "5-7", 150),
        ex("Tríceps corda", 4, "6-8", 120),
      ],
      "Inferior 2": [
        ex("Levantamento terra", 5, "2-4", 210),
        ex("bulgaro", 4, "5-7", 150),
        ex("stiff-halteres", 5, "5-7", 150),
        ex("cadeira-abdutora", 4, "10-12", 75),
        ex("Panturrilha sentado", 5, "8-12", 60),
      ],
      "Superior 2": [
        ex("Supino inclinado", 5, "3-5", 180),
        ex("Remada curvada", 5, "2-4", 210),
        ex("Elevação lateral", 4, "10-12", 60),
        ex("Rosca direta", 4, "6-8", 120),
        ex("Tríceps testa", 4, "6-8", 120),
      ],
    }
  },

  emagrecimento: {
    iniciante: {
      "Inferior 1": [
        ex("Leg press", 3, "12-15", 45),
        ex("Cadeira extensora", 3, "15-20", 45),
        ex("Mesa flexora", 3, "12-15", 45),
        ex("Agachamento livre", 2, "12-15", 60),
        ex("Panturrilha em pé", 3, "15-20", 40),
      ],
      "Superior 1": [
        ex("Supino reto", 3, "10-12", 60),
        ex("Puxada na frente", 3, "12-15", 60),
        ex("Remada baixa", 3, "12-15", 50),
        ex("Tríceps corda", 3, "15-20", 45),
        ex("Elevação lateral", 3, "15-20", 40),
      ],
      "Inferior 2": [
        ex("stiff-halteres", 3, "12-15", 60),
        ex("bulgaro", 3, "12-15", 60),
        ex("cadeira-abdutora", 3, "15-20", 45),
        ex("Mesa flexora", 3, "12-15", 45),
        ex("Panturrilha sentado", 3, "15-20", 40),
      ],
      "Superior 2": [
        ex("Supino inclinado", 3, "12-15", 60),
        ex("Remada curvada", 3, "10-12", 75),
        ex("Rosca direta", 3, "12-15", 45),
        ex("Tríceps testa", 3, "12-15", 45),
        ex("Elevação lateral", 3, "15-20", 40),
      ],
    },
    intermediario: {
      "Inferior 1": [
        ex("Agachamento livre", 3, "10-12", 75),
        ex("Leg press", 4, "12-15", 60),
        ex("Cadeira extensora", 4, "15-20", 45),
        ex("Mesa flexora", 4, "12-15", 45),
        ex("Panturrilha em pé", 4, "15-20", 40),
      ],
      "Superior 1": [
        ex("Supino reto", 4, "10-12", 60),
        ex("Puxada na frente", 4, "12-15", 60),
        ex("Desenvolvimento ombro", 3, "12-15", 60),
        ex("Remada baixa", 4, "12-15", 50),
        ex("Tríceps corda", 4, "15-20", 45),
      ],
      "Inferior 2": [
        ex("Levantamento terra", 3, "8-10", 90),
        ex("bulgaro", 4, "12-15", 60),
        ex("stiff-halteres", 4, "12-15", 60),
        ex("cadeira-abdutora", 4, "15-20", 45),
        ex("Panturrilha sentado", 4, "15-20", 40),
      ],
      "Superior 2": [
        ex("Supino inclinado", 4, "12-15", 60),
        ex("Remada curvada", 3, "8-10", 90),
        ex("Elevação lateral", 4, "15-20", 40),
        ex("Rosca direta", 4, "12-15", 45),
        ex("Tríceps testa", 4, "12-15", 45),
      ],
    },
    avancado: {
      "Inferior 1": [
        ex("Agachamento livre", 4, "8-10", 90),
        ex("Leg press", 5, "12-15", 60),
        ex("Cadeira extensora", 5, "15-20", 45),
        ex("Mesa flexora", 5, "12-15", 45),
        ex("Panturrilha em pé", 5, "15-20", 40),
      ],
      "Superior 1": [
        ex("Supino reto", 5, "8-10", 75),
        ex("Puxada na frente", 5, "10-12", 75),
        ex("Desenvolvimento ombro", 4, "10-12", 75),
        ex("Remada baixa", 5, "10-12", 60),
        ex("Tríceps corda", 5, "12-15", 45),
      ],
      "Inferior 2": [
        ex("Levantamento terra", 4, "6-8", 120),
        ex("bulgaro", 5, "10-12", 60),
        ex("stiff-halteres", 5, "10-12", 60),
        ex("cadeira-abdutora", 5, "15-20", 45),
        ex("Panturrilha sentado", 5, "15-20", 40),
      ],
      "Superior 2": [
        ex("Supino inclinado", 5, "10-12", 75),
        ex("Remada curvada", 4, "6-8", 120),
        ex("Elevação lateral", 5, "15-20", 40),
        ex("Rosca direta", 5, "10-12", 45),
        ex("Tríceps testa", 5, "10-12", 45),
      ],
    }
  }
};

let programaAtual = { objetivo: "hipertrofia", nivel: "intermediario" };
let TREINOS_ATIVOS = PROGRAMAS[programaAtual.objetivo][programaAtual.nivel];

// garante compatibilidade com o resto do app
function getTreinosAtivos(){ return TREINOS_ATIVOS; }


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



/* ===========================
   PROGRAMA (Objetivo + Nível) ✅
   =========================== */

function setPrograma(objetivo, nivel){
  const okObj = PROGRAMAS[objetivo];
  const okNivel = okObj ? okObj[nivel] : null;
  if (!okObj || !okNivel) return;

  programaAtual = { objetivo, nivel };
  TREINOS_ATIVOS = okNivel;

  // reseta seleção da home para evitar começar treino “errado”
  treinoSelecionadoHome = null;
  document.querySelectorAll("#listaTreinos .train").forEach(b=>b.classList.remove("is-selected"));

  const btn = document.getElementById("btnComecarTreino");
  if (btn){ btn.classList.add("is-disabled"); btn.textContent = "🚀 Começar treino"; }

  const lbl = document.getElementById("treinoSelecionadoLabel");
  if (lbl) lbl.textContent = "Selecione um treino abaixo 👇";

  atualizarHomeStats();
}

window.setProgramaFromUI = function(){
  const selObj = document.getElementById("selObjetivo");
  const selNivel = document.getElementById("selNivel");
  const objetivo = selObj?.value || "hipertrofia";
  const nivel = selNivel?.value || "intermediario";
  setPrograma(objetivo, nivel);
};

/* ===========================
   META SEMANAL / HOME STATS ✅
   =========================== */
const STORAGE_WEEKLY_GOAL = "treino_weekly_goal_v1";

function getWeeklyGoal(){
  const raw = localStorage.getItem(STORAGE_WEEKLY_GOAL);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 4;
}
function setWeeklyGoal(n){
  const v = Math.max(1, Math.floor(Number(n) || 4));
  localStorage.setItem(STORAGE_WEEKLY_GOAL, String(v));
  return v;
}
function startOfWeekISO(dateObj){
  const d = new Date(dateObj);
  const day = d.getDay(); // 0 dom, 1 seg...
  const diff = (day === 0 ? -6 : 1) - day; // segunda como início
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}
function endOfWeekISO(dateObj){
  const s = startOfWeekISO(dateObj);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23,59,59,999);
  return e;
}
function parseISODate(iso){
  const [y,m,d] = String(iso||"").split("-").map(Number);
  if (!y||!m||!d) return null;
  const dt = new Date(y, m-1, d);
  dt.setHours(12,0,0,0);
  return dt;
}

window.atualizarHomeStats = function(){
  const inp = document.getElementById("weeklyGoal");
  const goal = setWeeklyGoal(inp?.value || getWeeklyGoal());
  if (inp) inp.value = goal;

  const now = new Date();
  const s = startOfWeekISO(now);
  const e = endOfWeekISO(now);

  const hist = loadHistory();
  const daSemana = hist.filter(h => {
    const dt = parseISODate(h.data);
    return dt && dt >= s && dt <= e;
  });

  const treinosFeitos = daSemana.length;
  const vol = daSemana.reduce((a,h)=>a+(Number(h.volumeTotal)||0),0);

  const resumo = document.getElementById("hsResumo");
  const volEl = document.getElementById("hsVolume");
  const fill = document.getElementById("hsFill");

  const pct = Math.min(100, Math.round((treinosFeitos / goal) * 100));

  if (resumo) resumo.textContent = `${treinosFeitos}/${goal} treinos • ${pct}%`;
  if (volEl) volEl.textContent = `${Math.round(vol).toLocaleString("pt-BR")} kg`;
  if (fill) fill.style.width = `${pct}%`;
};

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
  Object.keys(getTreinosAtivos()).forEach(tn => {
    getTreinosAtivos()[tn].forEach(ex => {
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
  try { toggleFocusMode(false); } catch {}

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
  const exercicios = getTreinosAtivos()[nomeTreino].map(ex => ({
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
    const base = (getTreinosAtivos()[treinoAtual] && getTreinosAtivos()[treinoAtual][exIndex]) ? getTreinosAtivos()[treinoAtual][exIndex] : null;
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
  if (focusMode) updateFocusUI();
}


/* ===========================
   MODO FOCO (Treino ao vivo) ✅
   =========================== */
let focusMode = false;
let focusPtr = { exIndex: 0, serieIndex: 0 };

function findNextPending(startEx=0, startSerie=0){
  if (!treinoDraft?.exercicios?.length) return null;
  for (let ei = startEx; ei < treinoDraft.exercicios.length; ei++){
    const ex = treinoDraft.exercicios[ei];
    for (let si = (ei===startEx? startSerie:0); si < ex.series.length; si++){
      if (!ex.series[si].ok) return { exIndex: ei, serieIndex: si };
    }
  }
  // se não achar a partir do ponteiro, tenta do começo
  for (let ei = 0; ei < treinoDraft.exercicios.length; ei++){
    const ex = treinoDraft.exercicios[ei];
    for (let si = 0; si < ex.series.length; si++){
      if (!ex.series[si].ok) return { exIndex: ei, serieIndex: si };
    }
  }
  return null;
}

function updateFocusUI(){
  const panel = document.getElementById("focusPanel");
  if (!panel) return;

  if (!focusMode || !treinoDraft){
    panel.style.display = "none";
    panel.setAttribute("aria-hidden","true");
    return;
  }

  const ptr = focusPtr;
  const ex = treinoDraft.exercicios?.[ptr.exIndex];
  const s = ex?.series?.[ptr.serieIndex];
  if (!ex || !s){
    const next = findNextPending(0,0);
    if (next){ focusPtr = next; return updateFocusUI(); }
    // tudo concluído
    panel.style.display = "none";
    panel.setAttribute("aria-hidden","true");
    return;
  }

  panel.style.display = "block";
  panel.setAttribute("aria-hidden","false");

  const title = document.getElementById("focusTitle");
  const sub = document.getElementById("focusSub");
  const kicker = document.getElementById("focusKicker");
  const inpPeso = document.getElementById("focusPeso");
  const inpReps = document.getElementById("focusReps");

  const totalSeriesEx = ex.series.length;
  const doneEx = ex.series.filter(x=>x.ok).length;
  if (kicker) kicker.textContent = `🎯 ${treinoAtual || "Treino"} • ${doneEx}/${totalSeriesEx} séries feitas`;

  if (title) title.textContent = ex.nome;
  if (sub) sub.textContent = `Série ${ptr.serieIndex + 1}/${totalSeriesEx} • alvo ${ex.repsAlvo} • descanso ${ex.descansoSeg}s`;

  if (inpPeso) inpPeso.value = (s.peso ?? "") === null ? "" : String(s.peso ?? "");
  if (inpReps) inpReps.value = (s.reps ?? "") === null ? "" : String(s.reps ?? "");
}

window.toggleFocusMode = function(force){
  if (!treinoDraft){ return; }
  focusMode = (typeof force === "boolean") ? force : !focusMode;

  if (focusMode){
    const next = findNextPending(0,0);
    if (next) focusPtr = next;
    updateFocusUI();
    try { navigator.vibrate?.(20); } catch {}
  } else {
    updateFocusUI();
  }
};

function clampPtr(){
  if (!treinoDraft?.exercicios?.length) return;
  focusPtr.exIndex = Math.max(0, Math.min(focusPtr.exIndex, treinoDraft.exercicios.length-1));
  const ex = treinoDraft.exercicios[focusPtr.exIndex];
  focusPtr.serieIndex = Math.max(0, Math.min(focusPtr.serieIndex, ex.series.length-1));
}

window.focusPrev = function(){
  if (!treinoDraft) return;
  clampPtr();
  // volta série
  focusPtr.serieIndex -= 1;
  if (focusPtr.serieIndex < 0){
    focusPtr.exIndex -= 1;
    if (focusPtr.exIndex < 0) focusPtr.exIndex = 0;
    const ex = treinoDraft.exercicios[focusPtr.exIndex];
    focusPtr.serieIndex = Math.max(0, ex.series.length-1);
  }
  updateFocusUI();
};

window.focusNext = function(){
  if (!treinoDraft) return;
  clampPtr();
  focusPtr.serieIndex += 1;
  const ex = treinoDraft.exercicios[focusPtr.exIndex];
  if (focusPtr.serieIndex >= ex.series.length){
    focusPtr.exIndex += 1;
    if (focusPtr.exIndex >= treinoDraft.exercicios.length) focusPtr.exIndex = treinoDraft.exercicios.length-1;
    focusPtr.serieIndex = 0;
  }
  updateFocusUI();
};

window.focusFeito = function(){
  if (!treinoDraft) return;
  clampPtr();

  const inpPeso = document.getElementById("focusPeso");
  const inpReps = document.getElementById("focusReps");
  const peso = inpPeso?.value === "" ? null : Number(inpPeso?.value);
  const reps = inpReps?.value === "" ? null : Number(inpReps?.value);

  const ex = treinoDraft.exercicios[focusPtr.exIndex];
  const s = ex.series[focusPtr.serieIndex];

  s.peso = Number.isFinite(peso) ? peso : null;
  s.reps = Number.isFinite(reps) ? reps : null;
  s.ok = true;

  saveDraft(treinoDraft);

  // atualiza tela normal sem perder o foco
  atualizarMetricas();
  renderMiniChart();

  // descanso automático
  liberarAudioUmaVez();
  iniciarDescanso(Number(ex.descansoSeg) || 60);

  // pula pro próximo pendente
  const next = findNextPending(focusPtr.exIndex, focusPtr.serieIndex);
  if (next) focusPtr = next;

  updateFocusUI();
  try { navigator.vibrate?.(30); } catch {}
};


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
  try { atualizarHomeStats(); } catch {}
  alert("✅ Treino salvo no histórico!");
};

window.finalizarTreino = function(){
  try { toggleFocusMode(false); } catch {}
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


/* ===========================
   INIT (defer) ✅
   =========================== */
(function initApp(){
  try {
    // set weekly goal input from storage
    const inp = document.getElementById("weeklyGoal");
    if (inp) inp.value = getWeeklyGoal();

    // aplica programa inicial (padrão: hipertrofia / intermediário)
    const selObj = document.getElementById("selObjetivo");
    const selNivel = document.getElementById("selNivel");
    if (selObj) selObj.value = programaAtual.objetivo;
    if (selNivel) selNivel.value = programaAtual.nivel;

    setPrograma(programaAtual.objetivo, programaAtual.nivel);

    definirFraseMotivacional();
    atualizarHomeStats();
    renderMiniChart();
  } catch (e) {
    console.warn("Init error:", e);
  }
})();



/* ===============================
   ➕ EXERCÍCIOS PROFISSIONAIS ADICIONADOS
   =============================== */

if (typeof EX_DB !== "undefined") {
  EX_DB.push(
    { id:"supino-declinado", nome:"Supino declinado barra", tipo:"superior" },
    { id:"crucifixo-maquina", nome:"Crucifixo máquina", tipo:"superior" },
    { id:"cross-alto", nome:"Cross over polia alta", tipo:"superior" },
    { id:"peck-deck", nome:"Peck deck", tipo:"superior" },

    { id:"pulldown-aberto", nome:"Pulldown pegada aberta", tipo:"superior" },
    { id:"pulldown-neutro", nome:"Pulldown pegada neutra", tipo:"superior" },
    { id:"remada-cavalinho", nome:"Remada cavalinho", tipo:"superior" },
    { id:"remada-unilateral-maq", nome:"Remada articulada unilateral", tipo:"superior" },

    { id:"desenvolvimento-arnold", nome:"Desenvolvimento arnold", tipo:"superior" },
    { id:"elevacao-lateral-polia", nome:"Elevação lateral na polia", tipo:"superior" },
    { id:"elevacao-posterior-maq", nome:"Elevação posterior máquina", tipo:"superior" },

    { id:"rosca-scott", nome:"Rosca scott barra", tipo:"superior" },
    { id:"rosca-concentrada", nome:"Rosca concentrada", tipo:"superior" },
    { id:"rosca-cabo", nome:"Rosca cabo", tipo:"superior" },

    { id:"triceps-banco", nome:"Tríceps banco", tipo:"superior" },
    { id:"triceps-frances", nome:"Tríceps francês halter", tipo:"superior" },
    { id:"triceps-pulley-barra", nome:"Tríceps pulley barra", tipo:"superior" },

    { id:"agachamento-hack", nome:"Agachamento hack", tipo:"inferior" },
    { id:"passada-smith", nome:"Passada no smith", tipo:"inferior" },
    { id:"sissy-squat", nome:"Sissy squat", tipo:"inferior" },

    { id:"good-morning", nome:"Good morning barra", tipo:"inferior" },
    { id:"flexora-em-pe", nome:"Flexora em pé", tipo:"inferior" },
    { id:"nordic-curl", nome:"Nordic curl", tipo:"inferior" },

    { id:"glute-bridge", nome:"Glute bridge", tipo:"inferior" },
    { id:"step-up", nome:"Step up banco", tipo:"inferior" },
    { id:"abducao-cabo", nome:"Abdução cabo", tipo:"inferior" },

    { id:"panturrilha-leg", nome:"Panturrilha no leg press", tipo:"inferior" },
    { id:"panturrilha-unilateral", nome:"Panturrilha unilateral", tipo:"inferior" },

    { id:"prancha-lateral", nome:"Prancha lateral", tipo:"inferior" },
    { id:"abdominal-bicicleta", nome:"Abdominal bicicleta", tipo:"inferior" },
    { id:"abdominal-supra", nome:"Abdominal supra", tipo:"inferior" },
    { id:"dragon-flag", nome:"Dragon flag", tipo:"inferior" },

    { id:"box-jump", nome:"Box jump", tipo:"inferior" },
    { id:"slam-ball", nome:"Slam ball", tipo:"inferior" },
    { id:"battle-rope", nome:"Battle rope", tipo:"inferior" },
    { id:"mountain-climber", nome:"Mountain climber", tipo:"inferior" },
    { id:"farmer-walk", nome:"Farmer walk", tipo:"inferior" },
    { id:"jump-squat-barra", nome:"Jump squat barra", tipo:"inferior" },
    { id:"swing-alternado", nome:"Swing kettlebell alternado", tipo:"inferior" },
    { id:"afundo-salto", nome:"Afundo com salto", tipo:"inferior" }
  );
}
