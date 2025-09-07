// Firebase config
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const { ref, set, onValue } = firebase.database;

const appState = {
  selectedGameId: null,
  selectedBetType: null,
  bets: [],
  isAdmin: false
};

// Utilitários
const Utils = {
  generateId: () => Math.random().toString(36).substr(2, 9),
  show: el => el.style.display = "block",
  hide: el => el.style.display = "none"
};

function notify(msg) {
  alert(msg); // substitua por seu sistema de notificação se quiser
}

// Função para selecionar jogo
window.selectGame = function (gameId) {
  appState.selectedGameId = gameId;
  Utils.show(document.getElementById("oddsContainer"));
}

// Função para selecionar tipo de aposta
window.selectBetType = function (type) {
  appState.selectedBetType = type;
}

// Função para registrar aposta
window.placeBet = function (e) {
  e.preventDefault();

  const name = document.getElementById("playerName").value.trim();
  const amount = Number(document.getElementById("betAmount").value.replace(/\D/g, ""));
  const betType = appState.selectedBetType;
  const gameId = appState.selectedGameId;

  if (!name || !amount || !betType || !gameId) {
    notify("❌ Preencha todos os campos corretamente!");
    return;
  }

  const bet = {
    id: Utils.generateId(),
    player: name,
    amount,
    type: betType,
    gameId,
    status: "Pendente",
    timestamp: Date.now()
  };

  set(ref(db, `bets/${bet.id}`), bet)
    .then(() => {
      notify("✅ Aposta registrada com sucesso!");
      document.getElementById("betForm").reset();
      Utils.hide(document.getElementById("oddsContainer"));
    })
    .catch((err) => notify("❌ Erro ao salvar aposta: " + err.message));
};

// Leitura em tempo real das apostas
onValue(ref(db, "bets"), (snapshot) => {
  const data = snapshot.val();
  appState.bets = data ? Object.values(data) : [];
  renderBetsTable();
});

// Renderizar apostas na tabela
function renderBetsTable() {
  const table = document.getElementById("betsTable");
  if (!table) return;

  table.innerHTML = `
    <tr>
      <th>Jogador</th>
      <th>Jogo</th>
      <th>Tipo</th>
      <th>Valor</th>
      <th>Status</th>
    </tr>
  `;

  appState.bets.forEach(bet => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${bet.player}</td>
      <td>${bet.gameId}</td>
      <td>${bet.type}</td>
      <td>R$ ${bet.amount}</td>
      <td>${bet.status}</td>
    `;
    table.appendChild(row);
  });
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  Utils.hide(document.getElementById("oddsContainer"));
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js")
      .then(() => console.log("✅ Service Worker registrado"))
      .catch((err) => console.error("❌ Erro ao registrar SW", err));
  }
});
