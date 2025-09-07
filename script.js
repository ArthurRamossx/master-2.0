// Sistema de apostas MASTER LEAGUE - Versão Final
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// State global da aplicação
let appState = { 
  isAdmin: false, 
  selectedGameId: "", 
  selectedBetType: "", 
  selectedOdd: 0,
  games: [], 
  bets: [] 
};

const ADMIN_PASSWORD = "MASTER2025";
const BET_LIMITS = { MIN: 500000, MAX: 5000000 };

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC-UdxQ9KqX8r7ZGNj2P1eTMXiYcKcQFdM",
  authDomain: "master-league-bets.firebaseapp.com",
  databaseURL: "https://master-league-bets-default-rtdb.firebaseio.com/",
  projectId: "master-league-bets",
  storageBucket: "master-league-bets.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

let app, database;
let useLocalStorage = true; // Flag para usar localStorage por padrão

// Inicializar Firebase
try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  console.log("Firebase inicializado com sucesso");
  useLocalStorage = false;
} catch (error) {
  console.warn("Firebase não disponível, usando localStorage:", error);
  useLocalStorage = true;
}

// Utilitários
const Utils = {
  generateId: () => `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
  formatCurrency: (num) => {
    const number = Number(num);
    return `€${number.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },
  show: (el) => el.classList.remove("hidden"),
  hide: (el) => el.classList.add("hidden"),
};

// Sistema de notificações
function notify(msg, type = 'info') {
  const box = document.getElementById("notification");
  const textEl = document.getElementById("notificationText");
  textEl.textContent = msg;
  box.className = `notification ${type}`;
  Utils.show(box);
  setTimeout(() => Utils.hide(box), 4000);
}

window.closeNotification = () => Utils.hide(document.getElementById("notification"));

// FUNÇÕES ADMIN
window.loginAdmin = function () {
  const pass = document.getElementById("adminPassword").value.trim();
  if (pass === ADMIN_PASSWORD) {
    appState.isAdmin = true;
    localStorage.setItem("isAdminSession", "true");
    Utils.show(document.getElementById("adminPanel"));
    Utils.hide(document.getElementById("adminLogin"));
    document.getElementById("adminPassword").value = "";
    loadData();
    notify("✔️ Login admin bem-sucedido!", 'success');
  } else {
    notify("❌ Senha incorreta!", 'error');
    document.getElementById("adminPassword").value = "";
  }
};

window.logoutAdmin = function () {
  appState.isAdmin = false;
  localStorage.removeItem("isAdminSession");
  Utils.hide(document.getElementById("adminPanel"));
  Utils.show(document.getElementById("adminLogin"));
  notify("⚠️ Logout realizado.", 'warning');
};

// GERENCIAMENTO DE JOGOS
window.addGame = function (event) {
  event.preventDefault();
  
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  const gameName = document.getElementById("gameName").value.trim();
  const homeTeam = document.getElementById("homeTeam").value.trim();
  const awayTeam = document.getElementById("awayTeam").value.trim();
  const homeOdd = parseFloat(document.getElementById("homeOdd").value);
  const drawOdd = parseFloat(document.getElementById("drawOdd").value);
  const awayOdd = parseFloat(document.getElementById("awayOdd").value);

  if (!gameName || !homeTeam || !awayTeam) {
    notify("❌ Preencha todos os campos de texto!", 'error');
    return;
  }

  if (isNaN(homeOdd) || isNaN(drawOdd) || isNaN(awayOdd) || homeOdd < 1.01 || drawOdd < 1.01 || awayOdd < 1.01) {
    notify("❌ Odds devem ser números maiores que 1.01!", 'error');
    return;
  }

  const gameId = Utils.generateId();
  const gameData = {
    id: gameId,
    name: gameName,
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    odds: {
      home: homeOdd,
      draw: drawOdd,
      away: awayOdd
    },
    status: 'active',
    created: new Date().toISOString()
  };

  // Salvar jogo
  saveGame(gameData);
  document.getElementById("addGameForm").reset();
};

window.removeGame = function (gameId) {
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  if (confirm("Tem certeza que deseja remover este jogo?")) {
    deleteGame(gameId);
  }
};

// SISTEMA DE APOSTAS
window.selectGame = function () {
  const gameId = document.getElementById("gameSelect").value;
  const oddsContainer = document.getElementById("oddsContainer");
  const oddsButtons = document.getElementById("oddsButtons");
  
  if (!gameId) {
    Utils.hide(oddsContainer);
    return;
  }

  appState.selectedGameId = gameId;
  const game = appState.games.find(g => g.id === gameId);
  
  if (!game) {
    Utils.hide(oddsContainer);
    return;
  }

  oddsButtons.innerHTML = `
    <div class="odd-button" onclick="selectBetType('home', ${game.odds.home})">
      <div class="team">${game.homeTeam}</div>
      <div class="odd-value">${game.odds.home}</div>
    </div>
    <div class="odd-button" onclick="selectBetType('draw', ${game.odds.draw})">
      <div class="team">Empate</div>
      <div class="odd-value">${game.odds.draw}</div>
    </div>
    <div class="odd-button" onclick="selectBetType('away', ${game.odds.away})">
      <div class="team">${game.awayTeam}</div>
      <div class="odd-value">${game.odds.away}</div>
    </div>
  `;

  Utils.show(oddsContainer);
  calculatePossibleWin();
};

window.selectBetType = function (type, odd) {
  appState.selectedBetType = type;
  appState.selectedOdd = odd;
  
  document.querySelectorAll('.odd-button').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  event.target.closest('.odd-button').classList.add('selected');
  calculatePossibleWin();
};

window.formatBetAmount = function (input) {
  let value = input.value.replace(/[^\d]/g, '');
  
  if (value) {
    const numValue = parseInt(value);
    const formatted = numValue.toLocaleString("pt-BR");
    input.value = formatted;
  }
  
  calculatePossibleWin();
};

function calculatePossibleWin() {
  const betAmountInput = document.getElementById("betAmount");
  const possibleWinDisplay = document.getElementById("possibleWinDisplay");
  const possibleWinAmount = document.getElementById("possibleWinAmount");
  
  const betAmount = parseFloat(betAmountInput.value.replace(/\./g, '').replace(',', '.')) || 0;
  
  if (betAmount > 0 && appState.selectedOdd > 0) {
    const possibleWin = betAmount * appState.selectedOdd;
    possibleWinAmount.textContent = Utils.formatCurrency(possibleWin);
    Utils.show(possibleWinDisplay);
  } else {
    Utils.hide(possibleWinDisplay);
  }
}

window.placeBet = function (event) {
  event.preventDefault();
  
  const playerName = document.getElementById("playerName").value.trim();
  const gameId = appState.selectedGameId;
  const betType = appState.selectedBetType;
  const betAmountStr = document.getElementById("betAmount").value;
  const betAmount = parseFloat(betAmountStr.replace(/\./g, '').replace(',', '.')) || 0;
  
  if (!playerName) {
    notify("❌ Digite seu nome!", 'error');
    return;
  }
  
  if (!gameId) {
    notify("❌ Selecione um jogo!", 'error');
    return;
  }
  
  if (!betType) {
    notify("❌ Selecione um palpite!", 'error');
    return;
  }
  
  if (betAmount < BET_LIMITS.MIN || betAmount > BET_LIMITS.MAX) {
    notify(`❌ Valor deve estar entre ${Utils.formatCurrency(BET_LIMITS.MIN)} e ${Utils.formatCurrency(BET_LIMITS.MAX)}!`, 'error');
    return;
  }

  const game = appState.games.find(g => g.id === gameId);
  if (!game) {
    notify("❌ Jogo não encontrado!", 'error');
    return;
  }

  const betId = Utils.generateId();
  const betData = {
    id: betId,
    player: playerName,
    gameId: gameId,
    gameName: game.name,
    type: betType,
    amount: betAmount,
    odd: appState.selectedOdd,
    possibleWin: betAmount * appState.selectedOdd,
    status: 'pending',
    created: new Date().toISOString(),
    gameDetails: {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam
    }
  };

  saveBet(betData);
  
  document.getElementById("betForm").reset();
  appState.selectedGameId = "";
  appState.selectedBetType = "";
  appState.selectedOdd = 0;
  Utils.hide(document.getElementById("oddsContainer"));
  Utils.hide(document.getElementById("possibleWinDisplay"));
};

// GERENCIAMENTO DE APOSTAS (ADMIN)
window.updateBetStatus = function (betId, status) {
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  const betIndex = appState.bets.findIndex(bet => bet.id === betId);
  if (betIndex !== -1) {
    appState.bets[betIndex].status = status;
    saveBetStatus(betId, status);
    notify(`✔️ Status da aposta atualizado para: ${status}`, 'success');
  }
};

window.removeBet = function (betId) {
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  if (confirm("Tem certeza que deseja remover esta aposta?")) {
    deleteBet(betId);
  }
};

// FUNÇÕES DE PERSISTÊNCIA DE DADOS
function saveGame(gameData) {
  appState.games.push(gameData);
  
  if (useLocalStorage) {
    localStorage.setItem('games', JSON.stringify(appState.games));
    notify("✔️ Jogo adicionado com sucesso!", 'success');
    renderGamesTable();
    updateGameSelect();
  } else {
    set(ref(database, `games/${gameData.id}`), gameData)
      .then(() => {
        notify("✔️ Jogo adicionado com sucesso!", 'success');
      })
      .catch((error) => {
        console.error("Erro ao salvar no Firebase:", error);
        localStorage.setItem('games', JSON.stringify(appState.games));
        notify("✔️ Jogo adicionado com sucesso!", 'success');
        renderGamesTable();
        updateGameSelect();
      });
  }
}

function deleteGame(gameId) {
  appState.games = appState.games.filter(game => game.id !== gameId);
  
  if (useLocalStorage) {
    localStorage.setItem('games', JSON.stringify(appState.games));
    notify("✔️ Jogo removido com sucesso!", 'success');
    renderGamesTable();
    updateGameSelect();
  } else {
    remove(ref(database, `games/${gameId}`))
      .then(() => {
        notify("✔️ Jogo removido com sucesso!", 'success');
      })
      .catch((error) => {
        console.error("Erro ao remover do Firebase:", error);
        localStorage.setItem('games', JSON.stringify(appState.games));
        notify("✔️ Jogo removido com sucesso!", 'success');
        renderGamesTable();
        updateGameSelect();
      });
  }
}

function saveBet(betData) {
  appState.bets.push(betData);
  
  if (useLocalStorage) {
    localStorage.setItem('bets', JSON.stringify(appState.bets));
    notify("✔️ Aposta realizada com sucesso!", 'success');
    renderBetsTable();
  } else {
    set(ref(database, `bets/${betData.id}`), betData)
      .then(() => {
        notify("✔️ Aposta realizada com sucesso!", 'success');
      })
      .catch((error) => {
        console.error("Erro ao salvar aposta no Firebase:", error);
        localStorage.setItem('bets', JSON.stringify(appState.bets));
        notify("✔️ Aposta realizada com sucesso!", 'success');
        renderBetsTable();
      });
  }
}

function saveBetStatus(betId, status) {
  if (useLocalStorage) {
    localStorage.setItem('bets', JSON.stringify(appState.bets));
    renderBetsTable();
  } else {
    set(ref(database, `bets/${betId}/status`), status)
      .catch((error) => {
        console.error("Erro ao atualizar status no Firebase:", error);
        localStorage.setItem('bets', JSON.stringify(appState.bets));
        renderBetsTable();
      });
  }
}

function deleteBet(betId) {
  appState.bets = appState.bets.filter(bet => bet.id !== betId);
  
  if (useLocalStorage) {
    localStorage.setItem('bets', JSON.stringify(appState.bets));
    notify("✔️ Aposta removida com sucesso!", 'success');
    renderBetsTable();
  } else {
    remove(ref(database, `bets/${betId}`))
      .then(() => {
        notify("✔️ Aposta removida com sucesso!", 'success');
      })
      .catch((error) => {
        console.error("Erro ao remover aposta do Firebase:", error);
        localStorage.setItem('bets', JSON.stringify(appState.bets));
        notify("✔️ Aposta removida com sucesso!", 'success');
        renderBetsTable();
      });
  }
}

// FUNÇÕES DE RENDERIZAÇÃO
function renderGamesTable() {
  const tbody = document.querySelector("#gamesTable tbody");
  tbody.innerHTML = "";
  
  if (appState.games.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; opacity: 0.7;">
          Nenhum jogo cadastrado
        </td>
      </tr>
    `;
    return;
  }

  appState.games.forEach(game => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${game.name}</td>
      <td>${game.homeTeam} vs ${game.awayTeam}</td>
      <td>${game.odds.home}</td>
      <td>${game.odds.draw}</td>
      <td>${game.odds.away}</td>
      <td>
        <button class="btn btn-danger" onclick="removeGame('${game.id}')" style="padding: 5px 10px; font-size: 0.8rem;">
          🗑️ Remover
        </button>
      </td>
    `;
  });
}

function renderBetsTable() {
  const tbody = document.querySelector("#betsTable tbody");
  tbody.innerHTML = "";
  
  if (appState.bets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; opacity: 0.7;">
          Nenhuma aposta registrada
        </td>
      </tr>
    `;
    return;
  }

  appState.bets.forEach(bet => {
    const row = tbody.insertRow();
    const betTypeText = bet.type === 'home' ? bet.gameDetails.homeTeam : 
                       bet.type === 'away' ? bet.gameDetails.awayTeam : 'Empate';
    
    row.innerHTML = `
      <td>${bet.player}</td>
      <td>${bet.gameName}</td>
      <td>${betTypeText}</td>
      <td>${Utils.formatCurrency(bet.amount)}</td>
      <td>${bet.odd}</td>
      <td>${Utils.formatCurrency(bet.possibleWin)}</td>
      <td>
        <span class="status-${bet.status}">
          ${bet.status === 'pending' ? 'Pendente' : bet.status === 'won' ? 'Ganhou' : 'Perdeu'}
        </span>
      </td>
      <td>
        ${appState.isAdmin ? `
          <select onchange="updateBetStatus('${bet.id}', this.value)" style="margin-right: 5px; padding: 2px;">
            <option value="pending" ${bet.status === 'pending' ? 'selected' : ''}>Pendente</option>
            <option value="won" ${bet.status === 'won' ? 'selected' : ''}>Ganhou</option>
            <option value="lost" ${bet.status === 'lost' ? 'selected' : ''}>Perdeu</option>
          </select>
          <button class="btn btn-danger" onclick="removeBet('${bet.id}')" style="padding: 2px 8px; font-size: 0.7rem;">
            🗑️
          </button>
        ` : 'N/A'}
      </td>
    `;
  });
}

function updateGameSelect() {
  const select = document.getElementById("gameSelect");
  select.innerHTML = '<option value="">Selecione um jogo...</option>';
  
  appState.games.forEach(game => {
    const option = document.createElement("option");
    option.value = game.id;
    option.textContent = `${game.name} - ${game.homeTeam} vs ${game.awayTeam}`;
    select.appendChild(option);
  });
}

// CARREGAMENTO DE DADOS
function loadData() {
  if (useLocalStorage) {
    const savedGames = localStorage.getItem('games');
    const savedBets = localStorage.getItem('bets');
    
    if (savedGames) {
      appState.games = JSON.parse(savedGames);
    }
    
    if (savedBets) {
      appState.bets = JSON.parse(savedBets);
    }
    
    renderGamesTable();
    updateGameSelect();
    renderBetsTable();
  } else {
    // Firebase listeners
    const gamesRef = ref(database, 'games');
    onValue(gamesRef, (snapshot) => {
      const data = snapshot.val();
      appState.games = data ? Object.values(data) : [];
      renderGamesTable();
      updateGameSelect();
    });

    const betsRef = ref(database, 'bets');
    onValue(betsRef, (snapshot) => {
      const data = snapshot.val();
      appState.bets = data ? Object.values(data) : [];
      renderBetsTable();
    });
  }
}

// GERAÇÃO DE RELATÓRIOS
window.generatePDFReport = async function() {
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  try {
    notify("📄 Gerando relatório PDF...", 'info');
    
    const response = await fetch('/generate-pdf-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bets: appState.bets,
        games: appState.games
      })
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `relatorio_apostas_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify("✔️ Relatório PDF gerado com sucesso!", 'success');
    } else {
      throw new Error('Erro ao gerar PDF');
    }
  } catch (error) {
    notify("❌ Erro ao gerar relatório PDF: " + error.message, 'error');
  }
};

window.generateWordReport = async function() {
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  try {
    notify("📝 Gerando relatório Word...", 'info');
    
    const response = await fetch('/generate-word-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bets: appState.bets,
        games: appState.games
      })
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `relatorio_apostas_${new Date().toISOString().slice(0,10)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify("✔️ Relatório Word gerado com sucesso!", 'success');
    } else {
      throw new Error('Erro ao gerar Word');
    }
  } catch (error) {
    notify("❌ Erro ao gerar relatório Word: " + error.message, 'error');
  }
};

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
  // Verificar sessão admin
  if (localStorage.getItem("isAdminSession") === "true") {
    appState.isAdmin = true;
    Utils.show(document.getElementById("adminPanel"));
    Utils.hide(document.getElementById("adminLogin"));
  }
  
  // Carregar dados
  loadData();
  
  // Event listener para Enter no campo de senha
  document.getElementById("adminPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      window.loginAdmin();
    }
  });
  
  notify("🚀 Sistema carregado com sucesso!", 'success');
});