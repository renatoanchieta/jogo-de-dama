// jogo-damas.js
const board = document.getElementById("board");
const playerScoreEl = document.getElementById("playerScore");
const computerScoreEl = document.getElementById("computerScore");
const restartBtn = document.getElementById("restart");
const difficultySelect = document.getElementById("difficulty");

let cells = [];
let pieces = [];
let playerScore = 0;
let computerScore = 0;
let currentPlayer = "player";
let selectedPiece = null;
let capturingPiece = null;
let difficulty = "easy"; // easy | medium | hard

// === Inicialização do tabuleiro ===
function createBoard() {
  board.innerHTML = "";
  cells = [];
  for (let row = 0; row < 8; row++) {
    const rowCells = [];
    for (let col = 0; col < 8; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell", (row + col) % 2 === 0 ? "white" : "black");
      cell.dataset.row = row;
      cell.dataset.col = col;
      board.appendChild(cell);
      rowCells.push(cell);
    }
    cells.push(rowCells);
  }
}

// === Peças ===
function placePieces() {
  pieces = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 !== 0) addPiece(row, col, "computer");
    }
  }
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 !== 0) addPiece(row, col, "player");
    }
  }
}

function addPiece(row, col, owner) {
  const piece = document.createElement("div");
  piece.classList.add("piece", owner);
  piece.dataset.row = row;
  piece.dataset.col = col;
  piece.dataset.owner = owner;
  piece.dataset.king = "false";
  cells[row][col].appendChild(piece);
  pieces.push(piece);

  if (owner === "player") {
    piece.addEventListener("click", () => selectPiece(piece));
  }
}

// === Highlights ===
function clearHighlights() {
  // remove classe e handlers onclick (para evitar handlers antigos)
  cells.flat().forEach(cell => {
    cell.classList.remove("highlight");
    cell.onclick = null;
  });
}

// === Movimentos possíveis ===
function getAvailableMoves(piece) {
  const moves = [];
  const row = parseInt(piece.dataset.row, 10);
  const col = parseInt(piece.dataset.col, 10);
  const owner = piece.dataset.owner;
  const isKing = piece.dataset.king === "true";

  const directions = isKing
    ? [[-1,-1],[-1,1],[1,-1],[1,1]]
    : owner === "player"
    ? [[-1,-1],[-1,1]]
    : [[1,-1],[1,1]];

  directions.forEach(([dr, dc]) => {
    let r = row + dr;
    let c = col + dc;

    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const cell = cells[r][c];
      if (cell.children.length === 0) {
        // quadrado vazio
        moves.push({ row: r, col: c, captured: null });
      } else if (cell.children[0].dataset.owner !== owner) {
        // peça adversária -> ver salto
        const jumpR = r + dr;
        const jumpC = c + dc;
        if (
          jumpR >= 0 &&
          jumpR < 8 &&
          jumpC >= 0 &&
          jumpC < 8 &&
          cells[jumpR][jumpC].children.length === 0
        ) {
          moves.push({ row: jumpR, col: jumpC, captured: cell.children[0] });
        }
        break; // não passa por cima de outras peças
      } else {
        break; // peça própria bloqueando
      }
      if (!isKing) break; // peão não anda em distância
      r += dr;
      c += dc;
    }
  });

  return moves;
}

function getAllCaptures(owner) {
  const allCaptures = [];
  const ownerPieces = pieces.filter(p => p.dataset.owner === owner);
  ownerPieces.forEach(piece => {
    const moves = getAvailableMoves(piece).filter(m => m.captured);
    if (moves.length > 0) allCaptures.push({ piece, moves });
  });
  return allCaptures;
}

// === Seleção do jogador ===
function selectPiece(piece) {
  if (currentPlayer !== "player") return;
  if (capturingPiece && piece !== capturingPiece) return;

  selectedPiece = piece;
  clearHighlights();

  const allCaptures = getAllCaptures("player");

  let moves = [];
  if (allCaptures.length > 0) {
    // obrigatoriedade de captura
    moves = getAvailableMoves(piece).filter(m => m.captured);
    if (moves.length === 0) return; // peça não pode capturar -> não selecionável
  } else {
    moves = getAvailableMoves(piece);
  }

  moves.forEach(({ row, col, captured }) => {
    const cell = cells[row][col];
    cell.classList.add("highlight");
    cell.onclick = () => handlePlayerMove(piece, row, col, captured);
  });
}

// === Executa a movimentação (sem lógica de turno) ===
function movePiece(piece, row, col, capturedPiece = null) {
  // remove highlights antigos
  clearHighlights();

  const oldRow = parseInt(piece.dataset.row, 10);
  const oldCol = parseInt(piece.dataset.col, 10);

  // move DOM
  if (cells[oldRow][oldCol].contains(piece)) {
    cells[oldRow][oldCol].removeChild(piece);
  }
  cells[row][col].appendChild(piece);

  // atualiza dataset
  piece.dataset.row = row;
  piece.dataset.col = col;

  // remove peça capturada (se houver)
  let didCapture = false;
  if (capturedPiece) {
    const r = parseInt(capturedPiece.dataset.row, 10);
    const c = parseInt(capturedPiece.dataset.col, 10);
    if (cells[r][c] && cells[r][c].contains(capturedPiece)) {
      cells[r][c].removeChild(capturedPiece);
    }
    pieces = pieces.filter(p => p !== capturedPiece);
    didCapture = true;
  }

  // promoção a dama
  if ((piece.dataset.owner === "player" && row === 0) || (piece.dataset.owner === "computer" && row === 7)) {
    piece.dataset.king = "true";
    piece.classList.add("king");
  }

  return didCapture;
}

// === Fluxo do jogador (usa movePiece + checa sequência de capturas) ===
function handlePlayerMove(piece, row, col, capturedPiece) {
  if (currentPlayer !== "player") return;

  const didCapture = movePiece(piece, row, col, capturedPiece);

  if (didCapture) {
    const nextCaptures = getAvailableMoves(piece).filter(m => m.captured);
    if (nextCaptures.length > 0) {
      // jogador obrigado a continuar com a mesma peça
      capturingPiece = piece;
      // mostra novas opções (selectPiece cuidará da restrição)
      selectPiece(piece);
      return;
    }
  }

  // fim do movimento do jogador -> passa a vez
  capturingPiece = null;
  selectedPiece = null;
  currentPlayer = "computer";
  checkEndGame();
  if (currentPlayer === "computer") {
    setTimeout(() => computerMove(), 400);
  }
}

// === Movimento do computador (suporta múltiplas capturas recursivas) ===
function computerMove(pieceInSequence = null) {
  // Se estamos no meio de uma sequência (após uma captura anterior) -> continuar
  if (pieceInSequence) {
    const nextCaptures = getAvailableMoves(pieceInSequence).filter(m => m.captured);
    if (nextCaptures.length > 0) {
      // escolhe uma das capturas (aleatória; estratégia pode ser melhorada)
      const move = nextCaptures[Math.floor(Math.random() * nextCaptures.length)];
      movePiece(pieceInSequence, move.row, move.col, move.captured);
      // aguarda animação pequena antes de continuar
      setTimeout(() => computerMove(pieceInSequence), 350);
      return;
    } else {
      // acabou a sequência de capturas -> volta pro jogador
      currentPlayer = "player";
      checkEndGame();
      return;
    }
  }

  // 1) verifica se existe alguma captura obrigatória
  const allCaptures = getAllCaptures("computer");
  if (allCaptures.length > 0) {
    let moveData;
    if (difficulty === "hard") {
      // heurística simples: escolhe o conjunto com mais opções imediatas
      moveData = allCaptures.reduce((best, option) =>
        option.moves.length > best.moves.length ? option : best, allCaptures[0]);
    } else {
      moveData = allCaptures[Math.floor(Math.random() * allCaptures.length)];
    }

    const move = moveData.moves[Math.floor(Math.random() * moveData.moves.length)];
    // executa a primeira captura
    movePiece(moveData.piece, move.row, move.col, move.captured);

    // continua a sequência com a mesma peça
    setTimeout(() => computerMove(moveData.piece), 350);
    return;
  }

  // 2) sem capturas: movimenta normalmente
  const computerPieces = pieces.filter(p => p.dataset.owner === "computer");
  let possibleMoves = [];
  computerPieces.forEach(piece => {
    const moves = getAvailableMoves(piece).filter(m => !m.captured);
    possibleMoves.push(...moves.map(m => ({ ...m, piece })));
  });

  if (possibleMoves.length > 0) {
    let move;
    if (difficulty === "medium" || difficulty === "hard") {
      // tenta promover se possível (ex.: chegar à última linha)
      move = possibleMoves.find(m => m.row === 7) || possibleMoves[0];
    } else {
      move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }
    movePiece(move.piece, move.row, move.col);
  }

  // fim do turno do computador
  currentPlayer = "player";
  checkEndGame();
}

// === Fim de jogo ===
function checkEndGame() {
  const playerPieces = pieces.filter(p => p.dataset.owner === "player");
  const computerPieces = pieces.filter(p => p.dataset.owner === "computer");

  if (playerPieces.length === 0) {
    computerScore++;
    updateScores();
    alert("Você perdeu!");
    startGame();
    return true;
  } else if (computerPieces.length === 0) {
    playerScore++;
    updateScores();
    alert("Você venceu!");
    startGame();
    return true;
  }
  return false;
}

// === Início / reinício ===
function startGame() {
  createBoard();
  placePieces();
  currentPlayer = "player";
  selectedPiece = null;
  capturingPiece = null;
  updateScores();
}

function updateScores() {
  playerScoreEl.textContent = playerScore;
  computerScoreEl.textContent = computerScore;
}

// === Eventos UI ===
restartBtn.addEventListener("click", () => {
  playerScore = 0;
  computerScore = 0;
  startGame();
});

difficultySelect.addEventListener("change", (e) => {
  difficulty = e.target.value;
});

// inicializa
startGame();
