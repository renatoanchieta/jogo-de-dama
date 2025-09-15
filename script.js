const board = document.getElementById("board");
const playerScoreEl = document.getElementById("playerScore");
const computerScoreEl = document.getElementById("computerScore");

let cells = [];
let pieces = [];
let playerScore = 0;
let computerScore = 0;
let currentPlayer = "player";
let selectedPiece = null;
let capturingPiece = null; // peça em sequência obrigatória de captura

// Inicialização do tabuleiro
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

// Posicionamento das peças
function placePieces() {
  pieces = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 8; col++)
      if ((row + col) % 2 !== 0) addPiece(row, col, "computer");
  for (let row = 5; row < 8; row++)
    for (let col = 0; col < 8; col++)
      if ((row + col) % 2 !== 0) addPiece(row, col, "player");
}

// Adiciona uma peça
function addPiece(row, col, owner) {
  const piece = document.createElement("div");
  piece.classList.add("piece", owner);
  piece.dataset.row = row;
  piece.dataset.col = col;
  piece.dataset.owner = owner;
  piece.dataset.king = "false";
  cells[row][col].appendChild(piece);
  pieces.push(piece);

  if (owner === "player") piece.addEventListener("click", () => selectPiece(piece));
}

// Seleção de peça pelo jogador
function selectPiece(piece) {
  if (currentPlayer !== "player") return;

  if (capturingPiece && piece !== capturingPiece) return; // só continua a sequência obrigatória

  selectedPiece = piece;
  clearHighlights();

  const allCaptures = getAllCaptures(currentPlayer);

  let moves = [];
  if (allCaptures.length > 0) {
    // Captura obrigatória
    moves = getAvailableMoves(piece).filter(m => m.captured);
    if (moves.length === 0) return; // não pode mover outra peça
  } else {
    moves = getAvailableMoves(piece); // movimentos normais
  }

  moves.forEach(({ row, col, captured }) => {
    const cell = cells[row][col];
    cell.classList.add("highlight");
    cell.onclick = () => movePiece(piece, row, col, captured);
  });
}

// Obtém movimentos possíveis
function getAvailableMoves(piece) {
  const moves = [];
  const row = parseInt(piece.dataset.row);
  const col = parseInt(piece.dataset.col);
  const owner = piece.dataset.owner;
  const isKing = piece.dataset.king === "true";

  const directions = isKing
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] // dama: todas as diagonais
    : owner === "player"
    ? [[-1, -1], [-1, 1]] // jogador normal: sobe
    : [[1, -1], [1, 1]];  // computador normal: desce

  directions.forEach(([dr, dc]) => {
    let r = row + dr;
    let c = col + dc;
    let captured = null;

    if (isKing) {
      // ✅ lógica da dama: pode andar várias casas
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const cell = cells[r][c];

        if (cell.children.length === 0) {
          if (!captured) {
            moves.push({ row: r, col: c, captured: null }); // movimento livre
          } else {
            moves.push({ row: r, col: c, captured }); // movimento após captura
          }
        } else {
          const occupant = cell.children[0];
          if (occupant.dataset.owner !== owner && !captured) {
            // achou inimigo → verificar casas seguintes para pulo
            let jumpR = r + dr;
            let jumpC = c + dc;
            while (
              jumpR >= 0 && jumpR < 8 &&
              jumpC >= 0 && jumpC < 8 &&
              cells[jumpR][jumpC].children.length === 0
            ) {
              moves.push({ row: jumpR, col: jumpC, captured: occupant });
              jumpR += dr;
              jumpC += dc;
            }
          }
          break; // para dama, só pode pular 1 inimigo por direção
        }

        r += dr;
        c += dc;
      }
    } else {
      // ✅ lógica de peça normal: só 1 casa ou captura imediata
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const cell = cells[r][c];
        if (cell.children.length === 0) {
          moves.push({ row: r, col: c, captured: null });
        } else {
          const occupant = cell.children[0];
          if (occupant.dataset.owner !== owner) {
            const jumpR = r + dr;
            const jumpC = c + dc;
            if (
              jumpR >= 0 && jumpR < 8 &&
              jumpC >= 0 && jumpC < 8 &&
              cells[jumpR][jumpC].children.length === 0
            ) {
              moves.push({ row: jumpR, col: jumpC, captured: occupant });
            }
          }
        }
      }
    }
  });

  return moves;
}

// Retorna todas capturas possíveis de um jogador
function getAllCaptures(player) {
  const allCaptures = [];
  const playerPieces = pieces.filter(p => p.dataset.owner === player);
  playerPieces.forEach(piece => {
    const moves = getAvailableMoves(piece).filter(m => m.captured);
    if (moves.length > 0) allCaptures.push({ piece, moves });
  });
  return allCaptures;
}

// Limpa destaques
function clearHighlights() {
  cells.flat().forEach(cell => {
    cell.classList.remove("highlight");
    cell.onclick = null;
  });
}

// Movimento de peça
function movePiece(piece, row, col, capturedPiece = null) {
  clearHighlights();

  const oldRow = parseInt(piece.dataset.row);
  const oldCol = parseInt(piece.dataset.col);
  cells[oldRow][oldCol].removeChild(piece);
  cells[row][col].appendChild(piece);
  piece.dataset.row = row;
  piece.dataset.col = col;

  if (capturedPiece) {
    const r = parseInt(capturedPiece.dataset.row);
    const c = parseInt(capturedPiece.dataset.col);
    if (cells[r][c].contains(capturedPiece)) cells[r][c].removeChild(capturedPiece);
    pieces = pieces.filter(p => p !== capturedPiece);
  }

  // Promoção a rei
  if ((piece.dataset.owner === "player" && row === 0) || (piece.dataset.owner === "computer" && row === 7)) {
    piece.dataset.king = "true";
    piece.classList.add("king");
  }

  // Captura múltipla
  const nextCaptures = getAvailableMoves(piece).filter(m => m.captured);
  if (capturedPiece && nextCaptures.length > 0) {
    capturingPiece = piece;
    if (currentPlayer === "player") {
      selectPiece(piece);
    } else {
      setTimeout(() => continueComputerCaptures(piece), 400);
    }
    return;
  }

  // encerra turno
  capturingPiece = null;
  selectedPiece = null;
  currentPlayer = currentPlayer === "player" ? "computer" : "player";
  checkEndGame();

  if (currentPlayer === "computer") setTimeout(computerMove, 500);
}

// Movimento do computador
function computerMove() {
  const allCaptures = getAllCaptures("computer");
  if (allCaptures.length > 0) {
    // captura obrigatória
    const { piece, moves } = allCaptures[Math.floor(Math.random() * allCaptures.length)];
    const move = moves[Math.floor(Math.random() * moves.length)];
    movePiece(piece, move.row, move.col, move.captured);
    return;
  }

  // movimentos normais
  const computerPieces = pieces.filter(p => p.dataset.owner === "computer");
  let possibleMoves = [];
  computerPieces.forEach(piece => {
    const moves = getAvailableMoves(piece).filter(m => !m.captured);
    possibleMoves.push(...moves.map(m => ({ ...m, piece })));
  });

  if (possibleMoves.length > 0) {
    const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    movePiece(move.piece, move.row, move.col);
  } else {
    currentPlayer = "player"; // sem jogadas → passa turno
  }
}

// Função auxiliar para capturas múltiplas da IA
function continueComputerCaptures(piece) {
  const nextCaptures = getAvailableMoves(piece).filter(m => m.captured);
  if (nextCaptures.length > 0 && piece.dataset.owner === "computer") {
    const move = nextCaptures[Math.floor(Math.random() * nextCaptures.length)];
    movePiece(piece, move.row, move.col, move.captured);
  } else {
    currentPlayer = "player";
  }
}

// Verifica fim de jogo
function checkEndGame() {
  const playerPieces = pieces.filter(p => p.dataset.owner === "player");
  const computerPieces = pieces.filter(p => p.dataset.owner === "computer");

  if (playerPieces.length === 0) {
    computerScore++;
    updateScores();
    alert("Você perdeu!");
    startGame();
  } else if (computerPieces.length === 0) {
    playerScore++;
    updateScores();
    alert("Você venceu!");
    startGame();
  }
}

// Inicia o jogo
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

// ✅ inicialização
startGame();
