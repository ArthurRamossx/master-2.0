// MASTER LEAGUE - Sistema de Apostas eFootball 2026
// Imports do Firebase (ES6 modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

// Estado global da aplicação
let appState = {
  isAdmin: false,
  selectedGameId: "",
  selectedBetType: "",
  selectedOdd: 0,
  games: [],
  bets: []
};

// Constantes
const ADMIN_PASSWORD = "MASTER2025";
const BET_LIMITS = { MIN: 500000, MAX: 5000000 };

// Inicializar Firebase
let app, database;
let useFirebase = false;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  useFirebase = true;
  console.log("✅ Firebase conectado com sucesso");
} catch (error) {
  console.warn("⚠️ Firebase não disponível, usando localStorage:", error.message);
  useFirebase = false;
}

// Utilitários
const Utils = {
  generateId: () => `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
  
  formatCurrency: (value) => {
    const num = parseFloat(value) || 0;
    return `€${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },
  
  show: (element) => {
    if (element) element.classList.remove("hidden");
  },
  
  hide: (element) => {
    if (element) element.classList.add("hidden");
  },
  
  parseAmount: (value) => {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/\./g, '').replace(',', '.')) || 0;
  }
};

// Sistema de notificações
function showNotification(message, type = 'info') {
  const notification = document.getElementById("notification");
  const text = document.getElementById("notificationText");
  
  if (notification && text) {
    text.textContent = message;
    notification.className = `notification ${type}`;
    Utils.show(notification);
    
    setTimeout(() => Utils.hide(notification), 4000);
  }
}

window.closeNotification = () => {
  Utils.hide(document.getElementById("notification"));
};

// FUNÇÕES DE ADMINISTRAÇÃO

window.loginAdmin = function() {
  const passwordInput = document.getElementById("adminPassword");
  const password = passwordInput.value.trim();
  
  if (password === ADMIN_PASSWORD) {
    appState.isAdmin = true;
    localStorage.setItem("adminSession", "active");
    
    Utils.show(document.getElementById("adminPanel"));
    Utils.hide(document.getElementById("adminLogin"));
    passwordInput.value = "";
    
    loadData();
    showNotification("✅ Login admin realizado com sucesso!", 'success');
  } else {
    passwordInput.value = "";
    showNotification("❌ Senha incorreta!", 'error');
  }
};

window.logoutAdmin = function() {
  appState.isAdmin = false;
  localStorage.removeItem("adminSession");
  
  Utils.hide(document.getElementById("adminPanel"));
  Utils.show(document.getElementById("adminLogin"));
  
  showNotification("⚠️ Logout realizado", 'warning');
};

// GERENCIAMENTO DE JOGOS

window.addGame = function(event) {
  event.preventDefault();
  
  if (!appState.isAdmin) {
    showNotification("❌ Acesso negado!", 'error');
    return;
  }
  
  const gameName = document.getElementById("gameName").value.trim();
  const homeTeam = document.getElementById("homeTeam").value.trim();
  const awayTeam = document.getElementById("awayTeam").value.trim();
  const homeOdd = parseFloat(document.getElementById("homeOdd").value);
  const drawOdd = parseFloat(document.getElementById("drawOdd").value);
  const awayOdd = parseFloat(document.getElementById("awayOdd").value);
  
  // Validações
  if (!gameName || !homeTeam || !awayTeam) {
    showNotification("❌ Preencha todos os campos de texto!", 'error');
    return;
  }
  
  if (isNaN(homeOdd) || isNaN(drawOdd) || isNaN(awayOdd) || 
      homeOdd < 1.01 || drawOdd < 1.01 || awayOdd < 1.01) {
    showNotification("❌ Todas as odds devem ser números maiores que 1.01!", 'error');
    return;
  }
  
  // Criar novo jogo
  const gameId = Utils.generateId();
  const newGame = {
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
    createdAt: new Date().toISOString()
  };
  
  // Salvar jogo
  saveGame(newGame);
  
  // Limpar formulário
  document.getElementById("addGameForm").reset();
};

window.removeGame = function(gameId) {
  if (!appState.isAdmin) {
    showNotification("❌ Acesso negado!", 'error');
    return;
  }
  
  if (!confirm("Tem certeza que deseja remover este jogo?")) {
    return;
  }
  
  deleteGame(gameId);
};

// SISTEMA DE APOSTAS

window.selectGame = function() {
  const gameSelect = document.getElementById("gameSelect");
  const gameId = gameSelect.value;
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
  
  // Gerar botões de odds
  oddsButtons.innerHTML = `
    <div class="odd-button" onclick="selectBetType(event, 'home', ${game.odds.home})">
      <div class="team">${game.homeTeam}</div>
      <div class="odd-value">${game.odds.home}</div>
    </div>
    <div class="odd-button" onclick="selectBetType(event, 'draw', ${game.odds.draw})">
      <div class="team">Empate</div>
      <div class="odd-value">${game.odds.draw}</div>
    </div>
    <div class="odd-button" onclick="selectBetType(event, 'away', ${game.odds.away})">
      <div class="team">${game.awayTeam}</div>
      <div class="odd-value">${game.odds.away}</div>
    </div>
  `;
  
  Utils.show(oddsContainer);
  calculatePossibleWin();
};

window.selectBetType = function(event, betType, odd) {
  appState.selectedBetType = betType;
  appState.selectedOdd = odd;
  
  // Remover seleção anterior
  document.querySelectorAll('.odd-button').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Adicionar seleção ao botão clicado
  event.target.closest('.odd-button').classList.add('selected');
  
  calculatePossibleWin();
};

window.formatBetAmount = function(input) {
  let value = input.value.replace(/[^\d]/g, '');
  
  if (value) {
    const numValue = parseInt(value);
    input.value = numValue.toLocaleString('pt-BR');
  }
  
  calculatePossibleWin();
};

function calculatePossibleWin() {
  const betAmountInput = document.getElementById("betAmount");
  const possibleWinDisplay = document.getElementById("possibleWinDisplay");
  const possibleWinAmount = document.getElementById("possibleWinAmount");
  
  const betAmount = Utils.parseAmount(betAmountInput.value);
  
  if (betAmount > 0 && appState.selectedOdd > 0) {
    const possibleWin = betAmount * appState.selectedOdd;
    possibleWinAmount.textContent = Utils.formatCurrency(possibleWin);
    Utils.show(possibleWinDisplay);
  } else {
    Utils.hide(possibleWinDisplay);
  }
}

window.placeBet = function(event) {
  event.preventDefault();
  
  const playerName = document.getElementById("playerName").value.trim();
  const gameId = appState.selectedGameId;
  const betType = appState.selectedBetType;
  const betAmount = Utils.parseAmount(document.getElementById("betAmount").value);
  
  // Validações
  if (!playerName) {
    showNotification("❌ Digite seu nome!", 'error');
    return;
  }
  
  if (!gameId) {
    showNotification("❌ Selecione um jogo!", 'error');
    return;
  }
  
  if (!betType) {
    showNotification("❌ Escolha seu palpite!", 'error');
    return;
  }
  
  if (betAmount < BET_LIMITS.MIN || betAmount > BET_LIMITS.MAX) {
    showNotification(`❌ Valor deve estar entre ${Utils.formatCurrency(BET_LIMITS.MIN)} e ${Utils.formatCurrency(BET_LIMITS.MAX)}!`, 'error');
    return;
  }
  
  const game = appState.games.find(g => g.id === gameId);
  if (!game) {
    showNotification("❌ Jogo não encontrado!", 'error');
    return;
  }
  
  // Criar aposta
  const betId = Utils.generateId();
  const newBet = {
    id: betId,
    player: playerName,
    gameId: gameId,
    gameName: game.name,
    type: betType,
    amount: betAmount,
    odd: appState.selectedOdd,
    possibleWin: betAmount * appState.selectedOdd,
    status: 'pending',
    createdAt: new Date().toISOString(),
    gameDetails: {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam
    }
  };
  
  // Salvar aposta
  saveBet(newBet);
  
  // Reset do formulário
  document.getElementById("betForm").reset();
  appState.selectedGameId = "";
  appState.selectedBetType = "";
  appState.selectedOdd = 0;
  Utils.hide(document.getElementById("oddsContainer"));
  Utils.hide(document.getElementById("possibleWinDisplay"));
};

// GERENCIAMENTO DE APOSTAS (ADMIN)

window.updateBetStatus = function(betId, newStatus) {
  if (!appState.isAdmin) {
    showNotification("❌ Acesso negado!", 'error');
    return;
  }
  
  const betIndex = appState.bets.findIndex(bet => bet.id === betId);
  if (betIndex !== -1) {
    appState.bets[betIndex].status = newStatus;
    updateBetInStorage(betId, newStatus);
    renderBetsTable();
    showNotification(`✅ Status da aposta atualizado para: ${newStatus}`, 'success');
  }
};

window.removeBet = function(betId) {
  if (!appState.isAdmin) {
    showNotification("❌ Acesso negado!", 'error');
    return;
  }
  
  if (!confirm("Tem certeza que deseja remover esta aposta?")) {
    return;
  }
  
  deleteBet(betId);
};

// FUNÇÕES DE PERSISTÊNCIA

function saveGame(game) {
  appState.games.push(game);
  
  if (useFirebase) {
    set(ref(database, `games/${game.id}`), game)
      .then(() => {
        showNotification("✅ Jogo adicionado com sucesso!", 'success');
      })
      .catch(error => {
        console.error("Erro Firebase:", error);
        saveToLocalStorage();
        showNotification("✅ Jogo adicionado (modo offline)!", 'success');
      });
  } else {
    saveToLocalStorage();
    showNotification("✅ Jogo adicionado com sucesso!", 'success');
  }
  
  renderGamesTable();
  updateGameSelect();
}

function deleteGame(gameId) {
  appState.games = appState.games.filter(game => game.id !== gameId);
  
  if (useFirebase) {
    remove(ref(database, `games/${gameId}`))
      .then(() => {
        showNotification("✅ Jogo removido com sucesso!", 'success');
      })
      .catch(error => {
        console.error("Erro Firebase:", error);
        saveToLocalStorage();
        showNotification("✅ Jogo removido (modo offline)!", 'success');
      });
  } else {
    saveToLocalStorage();
    showNotification("✅ Jogo removido com sucesso!", 'success');
  }
  
  renderGamesTable();
  updateGameSelect();
}

function saveBet(bet) {
  appState.bets.push(bet);
  
  if (useFirebase) {
    set(ref(database, `bets/${bet.id}`), bet)
      .then(() => {
        showNotification("✅ Aposta realizada com sucesso!", 'success');
      })
      .catch(error => {
        console.error("Erro Firebase:", error);
        saveToLocalStorage();
        showNotification("✅ Aposta realizada (modo offline)!", 'success');
      });
  } else {
    saveToLocalStorage();
    showNotification("✅ Aposta realizada com sucesso!", 'success');
  }
  
  renderBetsTable();
}

function updateBetInStorage(betId, status) {
  if (useFirebase) {
    set(ref(database, `bets/${betId}/status`), status)
      .catch(error => {
        console.error("Erro Firebase:", error);
        saveToLocalStorage();
      });
  } else {
    saveToLocalStorage();
  }
}

function deleteBet(betId) {
  appState.bets = appState.bets.filter(bet => bet.id !== betId);
  
  if (useFirebase) {
    remove(ref(database, `bets/${betId}`))
      .then(() => {
        showNotification("✅ Aposta removida com sucesso!", 'success');
      })
      .catch(error => {
        console.error("Erro Firebase:", error);
        saveToLocalStorage();
        showNotification("✅ Aposta removida (modo offline)!", 'success');
      });
  } else {
    saveToLocalStorage();
    showNotification("✅ Aposta removida com sucesso!", 'success');
  }
  
  renderBetsTable();
}

function saveToLocalStorage() {
  localStorage.setItem('games', JSON.stringify(appState.games));
  localStorage.setItem('bets', JSON.stringify(appState.bets));
}

function loadFromLocalStorage() {
  const games = localStorage.getItem('games');
  const bets = localStorage.getItem('bets');
  
  if (games) appState.games = JSON.parse(games);
  if (bets) appState.bets = JSON.parse(bets);
}

// RENDERIZAÇÃO

function renderGamesTable() {
  const tbody = document.querySelector("#gamesTable tbody");
  if (!tbody) return;
  
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
        <button class="btn btn-danger" onclick="removeGame('${game.id}')" 
                style="padding: 5px 10px; font-size: 0.8rem;">
          🗑️ Remover
        </button>
      </td>
    `;
  });
}

function renderBetsTable() {
  const tbody = document.querySelector("#betsTable tbody");
  if (!tbody) return;
  
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
    
    let betTypeText = '';
    if (bet.type === 'home') {
      betTypeText = bet.gameDetails?.homeTeam || 'Casa';
    } else if (bet.type === 'away') {
      betTypeText = bet.gameDetails?.awayTeam || 'Fora';
    } else {
      betTypeText = 'Empate';
    }
    
    const statusText = {
      'pending': 'Pendente',
      'won': 'Ganhou',
      'lost': 'Perdeu'
    }[bet.status] || 'Pendente';
    
    row.innerHTML = `
      <td>${bet.player}</td>
      <td>${bet.gameName}</td>
      <td>${betTypeText}</td>
      <td>${Utils.formatCurrency(bet.amount)}</td>
      <td>${bet.odd}</td>
      <td>${Utils.formatCurrency(bet.possibleWin)}</td>
      <td>
        <span class="status-${bet.status}">${statusText}</span>
      </td>
      <td>
        ${appState.isAdmin ? `
          <div style="display: flex; gap: 5px; align-items: center;">
            <select onchange="updateBetStatus('${bet.id}', this.value)" 
                    style="padding: 2px; font-size: 0.8rem;">
              <option value="pending" ${bet.status === 'pending' ? 'selected' : ''}>Pendente</option>
              <option value="won" ${bet.status === 'won' ? 'selected' : ''}>Ganhou</option>
              <option value="lost" ${bet.status === 'lost' ? 'selected' : ''}>Perdeu</option>
            </select>
            <button class="btn btn-danger" onclick="removeBet('${bet.id}')" 
                    style="padding: 2px 6px; font-size: 0.7rem;">
              🗑️
            </button>
          </div>
        ` : 'N/A'}
      </td>
    `;
  });
}

function updateGameSelect() {
  const select = document.getElementById("gameSelect");
  if (!select) return;
  
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
  if (useFirebase) {
    // Listeners em tempo real
    const gamesRef = ref(database, 'games');
    onValue(gamesRef, (snapshot) => {
      const data = snapshot.val();
      appState.games = data ? Object.values(data) : [];
      renderGamesTable();
      updateGameSelect();
    }, (error) => {
      console.warn("Erro ao carregar jogos do Firebase:", error);
      loadFromLocalStorage();
      renderGamesTable();
      updateGameSelect();
    });
    
    const betsRef = ref(database, 'bets');
    onValue(betsRef, (snapshot) => {
      const data = snapshot.val();
      appState.bets = data ? Object.values(data) : [];
      renderBetsTable();
    }, (error) => {
      console.warn("Erro ao carregar apostas do Firebase:", error);
      loadFromLocalStorage();
      renderBetsTable();
    });
  } else {
    loadFromLocalStorage();
    renderGamesTable();
    updateGameSelect();
    renderBetsTable();
  }
}

// RELATÓRIOS

window.generatePDFReport = async function() {
  if (!appState.isAdmin) {
    showNotification("❌ Acesso negado!", 'error');
    return;
  }
  
  try {
    showNotification("📄 Gerando relatório PDF...", 'info');
    
    const response = await fetch('/generate-pdf-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bets: appState.bets,
        games: appState.games
      })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_apostas_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification("✅ Relatório PDF gerado com sucesso!", 'success');
    } else {
      throw new Error('Erro do servidor');
    }
  } catch (error) {
    showNotification(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
  }
};

window.generateWordReport = async function() {
  if (!appState.isAdmin) {
    showNotification("❌ Acesso negado!", 'error');
    return;
  }
  
  try {
    showNotification("📝 Gerando relatório Word...", 'info');
    
    const response = await fetch('/generate-word-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bets: appState.bets,
        games: appState.games
      })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_apostas_${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification("✅ Relatório Word gerado com sucesso!", 'success');
    } else {
      throw new Error('Erro do servidor');
    }
  } catch (error) {
    showNotification(`❌ Erro ao gerar Word: ${error.message}`, 'error');
  }
};

// INICIALIZAÇÃO

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Inicializando MASTER LEAGUE...");
  
  // Verificar sessão admin
  if (localStorage.getItem("adminSession") === "active") {
    appState.isAdmin = true;
    Utils.show(document.getElementById("adminPanel"));
    Utils.hide(document.getElementById("adminLogin"));
  }
  
  // Carregar dados
  loadData();
  
  // Event listener para Enter na senha admin
  const adminPasswordInput = document.getElementById("adminPassword");
  if (adminPasswordInput) {
    adminPasswordInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        window.loginAdmin();
      }
    });
  }
  
  showNotification("🚀 Sistema carregado com sucesso!", 'success');
});