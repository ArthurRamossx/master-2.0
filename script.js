import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Firebase configuration - using environment variable fallback
const firebaseConfig = {
  apiKey: "AIzaSyDemoKey123456789",
  authDomain: "master-league-demo.firebaseapp.com",
  databaseURL: "https://master-league-demo-default-rtdb.firebaseio.com/",
  projectId: "master-league-demo",
  storageBucket: "master-league-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

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

const Utils = {
  generateId: () => `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
  formatCurrency: (num) => {
    const number = Number(num);
    return `€${number.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },
  parseCurrency: (str) => {
    return parseFloat(str.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  },
  show: (el) => el.classList.remove("hidden"),
  hide: (el) => el.classList.add("hidden"),
};

function notify(msg, type = 'info') {
  const box = document.getElementById("notification");
  const textEl = document.getElementById("notificationText");
  textEl.textContent = msg;
  
  // Update notification style based on type
  box.className = `notification ${type}`;
  
  Utils.show(box);
  setTimeout(() => Utils.hide(box), 4000);
}

window.closeNotification = () => Utils.hide(document.getElementById("notification"));

// Admin functions
window.loginAdmin = function () {
  const pass = document.getElementById("adminPassword").value.trim();
  if (pass === ADMIN_PASSWORD) {
    appState.isAdmin = true;
    localStorage.setItem("isAdminSession", "true");
    Utils.show(document.getElementById("adminPanel"));
    Utils.hide(document.getElementById("adminLogin"));
    document.getElementById("adminPassword").value = "";
    renderGamesTable();
    renderBetsTable();
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

// Game management
window.addGame = function (event) {
  event.preventDefault();
  
  console.log("addGame chamada - iniciando");
  
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  const gameName = document.getElementById("gameName").value.trim();
  const homeTeam = document.getElementById("homeTeam").value.trim();
  const awayTeam = document.getElementById("awayTeam").value.trim();
  const homeOddValue = document.getElementById("homeOdd").value;
  const drawOddValue = document.getElementById("drawOdd").value;
  const awayOddValue = document.getElementById("awayOdd").value;
  
  console.log("Valores:", { gameName, homeTeam, awayTeam, homeOddValue, drawOddValue, awayOddValue });

  if (!gameName || !homeTeam || !awayTeam) {
    notify("❌ Preencha todos os campos de texto!", 'error');
    return;
  }

  const homeOdd = parseFloat(homeOddValue);
  const drawOdd = parseFloat(drawOddValue);
  const awayOdd = parseFloat(awayOddValue);
  
  console.log("Odds parseadas:", { homeOdd, drawOdd, awayOdd });

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

  console.log("gameData criado:", gameData);

  // Usar localStorage diretamente (Firebase está com problemas)
  appState.games.push(gameData);
  localStorage.setItem('games', JSON.stringify(appState.games));
  
  notify("✔️ Jogo adicionado com sucesso!", 'success');
  document.getElementById("addGameForm").reset();
  renderGamesTable();
  updateGameSelect();
  
  console.log("Jogo adicionado, appState.games:", appState.games.length);
};

window.removeGame = function (gameId) {
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  if (confirm("Tem certeza que deseja remover este jogo?")) {
    // Remove do localStorage
    appState.games = appState.games.filter(game => game.id !== gameId);
    localStorage.setItem('games', JSON.stringify(appState.games));
    
    notify("✔️ Jogo removido com sucesso!", 'success');
    renderGamesTable();
    updateGameSelect();
  }
};

// Betting functions
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

  // Create odds buttons
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
  
  // Update button styles
  document.querySelectorAll('.odd-button').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  event.target.closest('.odd-button').classList.add('selected');
  
  calculatePossibleWin();
};

window.formatBetAmount = function (input) {
  let value = input.value.replace(/[^\d]/g, '');
  
  if (value) {
    // Convert to number and format with Brazilian punctuation
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
  
  // Parse Brazilian formatted number
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
  
  // Validation
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
    playerName: playerName,
    gameId: gameId,
    gameName: game.name,
    betType: betType,
    betAmount: betAmount,
    odd: appState.selectedOdd,
    possibleWin: betAmount * appState.selectedOdd,
    status: 'pending',
    created: new Date().toISOString(),
    gameDetails: {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam
    }
  };

  // Save to Firebase with localStorage fallback
  try {
    set(ref(database, `bets/${betId}`), betData)
      .then(() => {
        notify("✔️ Aposta realizada com sucesso!", 'success');
        document.getElementById("betForm").reset();
        appState.selectedGameId = "";
        appState.selectedBetType = "";
        appState.selectedOdd = 0;
        Utils.hide(document.getElementById("oddsContainer"));
        Utils.hide(document.getElementById("possibleWinDisplay"));
        renderBetsTable();
      })
      .catch((error) => {
        console.warn("Firebase erro, usando localStorage:", error);
        // Fallback to localStorage
        appState.bets.push(betData);
        localStorage.setItem('bets', JSON.stringify(appState.bets));
        notify("✔️ Aposta realizada com sucesso!", 'success');
        document.getElementById("betForm").reset();
        appState.selectedGameId = "";
        appState.selectedBetType = "";
        appState.selectedOdd = 0;
        Utils.hide(document.getElementById("oddsContainer"));
        Utils.hide(document.getElementById("possibleWinDisplay"));
        renderBetsTable();
      });
  } catch (error) {
    console.warn("Firebase não disponível, usando localStorage:", error);
    // Fallback to localStorage
    appState.bets.push(betData);
    localStorage.setItem('bets', JSON.stringify(appState.bets));
    notify("✔️ Aposta realizada com sucesso!", 'success');
    document.getElementById("betForm").reset();
    appState.selectedGameId = "";
    appState.selectedBetType = "";
    appState.selectedOdd = 0;
    Utils.hide(document.getElementById("oddsContainer"));
    Utils.hide(document.getElementById("possibleWinDisplay"));
    renderBetsTable();
  }
};

// Bet management for admin
window.updateBetStatus = function (betId, status) {
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  const betRef = ref(database, `bets/${betId}/status`);
  set(betRef, status)
    .then(() => {
      notify(`✔️ Status da aposta atualizado para: ${status}`, 'success');
      renderBetsTable();
    })
    .catch((error) => {
      notify("❌ Erro ao atualizar status: " + error.message, 'error');
    });
};

window.removeBet = function (betId) {
  if (!appState.isAdmin) {
    notify("❌ Acesso negado!", 'error');
    return;
  }

  if (confirm("Tem certeza que deseja remover esta aposta?")) {
    remove(ref(database, `bets/${betId}`))
      .then(() => {
        notify("✔️ Aposta removida com sucesso!", 'success');
        renderBetsTable();
      })
      .catch((error) => {
        notify("❌ Erro ao remover aposta: " + error.message, 'error');
      });
  }
};

// Rendering functions
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
    const betTypeText = bet.betType === 'home' ? bet.gameDetails.homeTeam : 
                       bet.betType === 'away' ? bet.gameDetails.awayTeam : 'Empate';
    
    row.innerHTML = `
      <td>${bet.playerName}</td>
      <td>${bet.gameName}</td>
      <td>${betTypeText}</td>
      <td>${Utils.formatCurrency(bet.betAmount)}</td>
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

// Firebase listeners with localStorage fallback
function initializeFirebaseListeners() {
  try {
    // Listen to games
    const gamesRef = ref(database, 'games');
    onValue(gamesRef, (snapshot) => {
      const data = snapshot.val();
      appState.games = data ? Object.values(data) : [];
      renderGamesTable();
      updateGameSelect();
    }, (error) => {
      console.warn("Firebase games listener erro, usando localStorage:", error);
      loadFromLocalStorage();
    });

    // Listen to bets
    const betsRef = ref(database, 'bets');
    onValue(betsRef, (snapshot) => {
      const data = snapshot.val();
      appState.bets = data ? Object.values(data) : [];
      renderBetsTable();
    }, (error) => {
      console.warn("Firebase bets listener erro, usando localStorage:", error);
      loadFromLocalStorage();
    });
  } catch (error) {
    console.warn("Firebase não disponível, usando localStorage:", error);
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  // Load games from localStorage
  const savedGames = localStorage.getItem('games');
  if (savedGames) {
    appState.games = JSON.parse(savedGames);
  }
  
  // Load bets from localStorage
  const savedBets = localStorage.getItem('bets');
  if (savedBets) {
    appState.bets = JSON.parse(savedBets);
  }
  
  renderGamesTable();
  updateGameSelect();
  renderBetsTable();
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  // Check admin session
  if (localStorage.getItem("isAdminSession") === "true") {
    appState.isAdmin = true;
    Utils.show(document.getElementById("adminPanel"));
    Utils.hide(document.getElementById("adminLogin"));
  }
  
  // Initialize Firebase listeners
  initializeFirebaseListeners();
  
  // Handle Enter key on admin password
  document.getElementById("adminPassword").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      window.loginAdmin();
    }
  });
  
  notify("🚀 Sistema carregado com sucesso!", 'success');
});

// Report generation functions
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

// Error handling for Firebase connection
window.addEventListener('error', (e) => {
  if (e.message.includes('Firebase')) {
    notify("⚠️ Conexão com Firebase falhando. Usando modo offline.", 'warning');
  }
});
