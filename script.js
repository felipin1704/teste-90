function iniciarTreinoAutomatico(){

  const objetivo = document.getElementById("goalSelect").value;
  const nivel = document.getElementById("levelSelect").value;
  const tipo = document.getElementById("focusSelect").value;

  alert(
    "Treino recomendado:\n\n" +
    "Tipo: " + tipo + "\n" +
    "Objetivo: " + objetivo + "\n" +
    "Nível: " + nivel
  );

}

function montarTreino(){
  alert("Abrindo montagem de treino...");
}

function abrirTreinosSalvos(){
  alert("Abrindo treinos salvos...");
}
