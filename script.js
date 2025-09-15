(function () {
  // inicializa quando DOM estiver pronto
  function setup() {
    const board = document.getElementById("board");
    const playerScoreEl = document.getElementById("playerScore");
    const computerScoreEl = document.getElementById("computerScore");

    if (!board) {
      console.error("Elemento #board não encontrado. Certifique-se de que o HTML contém <div id='board'></div>.");
    }

    // estado do jogo
    let cells = [];
    let pieces = [];
    let playerScore = 0;
    let computerScore = 0;
    let currentPlayer = "player";
    let selectedPiece = null;
    let capturingPiece = null;

    // gerenciamento de timeouts para podermos cancelar ao reiniciar
    let activeTimeouts = [];
    function schedule(fn, ms) {
      const id = setTimeout(fn, ms);
      activeTimeouts.push(id);
      return id;
    }
    function clearActiveTimeouts() {
      activeTimeouts.forEach(id => clearTimeout(id));
      activeTimeouts = [];
    }

    /* ----------------------------
       Funções do jogo
    -----------------------------*/

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

    function selectPiece(piece) {
      if (currentPlayer !== "player") return;
      if (capturingPiece && piece !== capturingPiece) return; // só a peça em sequência pode continuar
      selectedPiece = piece;
      clearHighlights();

      const allCaptures = getAllCaptures(currentPlayer);
      let moves = [];
      if (allCaptures.length > 0) {
        moves = getAvailableMoves(piece).filter(m => m.captured);
        if (moves.length === 0) return; // não pode mover outra peça
      } else {
        moves = getAvailableMoves(piece);
      }

      moves.forEach(({ row, col, captured }) => {
        const cell = cells[row][col];
        cell.classList.add("highlight");
        cell.onclick = () => movePiece(piece, row, col, captured);
      });
    }

    function getAvailableMoves(piece) {
      const moves = [];
      const row = parseInt(piece.dataset.row, 10);
      const col = parseInt(piece.dataset.col, 10);
      const owner = piece.dataset.owner;
      const isKing = piece.dataset.king === "true";

      const directions = isKing
        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        : owner === "player"
          ? [[-1, -1], [-1, 1]]
          : [[1, -1], [1, 1]];

      directions.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;

        if (isKing) {
          // dama: percorre múltiplas casas na diagonal
          while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const cell = cells[r][c];
            if (cell.children.length === 0) {
              // movimento livre (apenas se não estiver "pulando" peça nesse momento)
              moves.push({ row: r, col: c, captured: null });
            } else {
              const occupant = cell.children[0];
              if (occupant.dataset.owner !== owner) {
                // encontrou inimigo => buscar posições vazias após ele para salto
                let jumpR = r + dr;
                let jumpC = c + dc;
                while (jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8) {
                  if (cells[jumpR][jumpC].children.length === 0) {
                    moves.push({ row: jumpR, col: jumpC, captured: occupant });
                  } else {
                    break; // bloqueado
                  }
                  jumpR += dr;
                  jumpC += dc;
                }
              }
              break; // independente de ter encontrado amigo/inimigo, para esta direção
            }
            r += dr;
            c += dc;
          }
        } else {
          // peça normal: uma casa ou captura imediata
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const cell = cells[r][c];
            if (cell.children.length === 0) {
              moves.push({ row: r, col: c, captured: null });
            } else {
              const occupant = cell.children[0];
              if (occupant.dataset.owner !== owner) {
                const jumpR = r + dr;
                const jumpC = c + dc;
                if (jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8 && cells[jumpR][jumpC].children.length === 0) {
                  moves.push({ row: jumpR, col: jumpC, captured: occupant });
                }
              }
            }
          }
        }
      });

      return moves;
    }

    function getAllCaptures(player) {
      const allCaptures = [];
      const playerPieces = pieces.filter(p => p.dataset.owner === player);
      playerPieces.forEach(piece => {
        const moves = getAvailableMoves(piece).filter(m => m.captured);
        if (moves.length > 0) allCaptures.push({ piece, moves });
      });
      return allCaptures;
    }

    function clearHighlights() {
      cells.flat().forEach(cell => {
        cell.classList.remove("highlight");
        cell.onclick = null;
      });
    }

    function movePiece(piece, row, col, capturedPiece = null) {
      clearHighlights();

      const oldRow = parseInt(piece.dataset.row, 10);
      const oldCol = parseInt(piece.dataset.col, 10);

      // remove segurança (se ainda estiver)
      if (cells[oldRow] && cells[oldRow][oldCol] && cells[oldRow][oldCol].contains(piece)) {
        cells[oldRow][oldCol].removeChild(piece);
      }

      cells[row][col].appendChild(piece);
      piece.dataset.row = row;
      piece.dataset.col = col;

      if (capturedPiece) {
        if (capturedPiece.parentNode) capturedPiece.parentNode.removeChild(capturedPiece);
        pieces = pieces.filter(p => p !== capturedPiece);
      }

      // promoção
      if ((piece.dataset.owner === "player" && row === 0) || (piece.dataset.owner === "computer" && row === 7)) {
        if (piece.dataset.king !== "true") {
          piece.dataset.king = "true";
          piece.classList.add("king");
        }
      }

      // captura múltipla
      const nextCaptures = getAvailableMoves(piece).filter(m => m.captured);
      if (capturedPiece && nextCaptures.length > 0) {
        capturingPiece = piece;
        if (currentPlayer === "player") {
          selectPiece(piece);
        } else {
          schedule(() => continueComputerCaptures(piece), 300);
        }
        return;
      }

      // encerra turno
      capturingPiece = null;
      selectedPiece = null;
      currentPlayer = currentPlayer === "player" ? "computer" : "player";
      checkEndGame();

      if (currentPlayer === "computer") schedule(computerMove, 350);
    }

    function computerMove() {
      // se reiniciar foi chamado e timeouts limpos, talvez o jogo já tenha sido reiniciado.
      // verificamos que há peças do computador ainda.
      const computerPieces = pieces.filter(p => p.dataset.owner === "computer");
      if (computerPieces.length === 0) {
        currentPlayer = "player";
        return;
      }

      const allCaptures = getAllCaptures("computer");
      if (allCaptures.length > 0) {
        const { piece, moves } = allCaptures[Math.floor(Math.random() * allCaptures.length)];
        const move = moves[Math.floor(Math.random() * moves.length)];
        movePiece(piece, move.row, move.col, move.captured);
        return;
      }

      let possibleMoves = [];
      computerPieces.forEach(piece => {
        const moves = getAvailableMoves(piece).filter(m => !m.captured);
        possibleMoves.push(...moves.map(m => ({ ...m, piece })));
      });

      if (possibleMoves.length > 0) {
        const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        movePiece(move.piece, move.row, move.col);
      } else {
        currentPlayer = "player";
      }
    }

    function continueComputerCaptures(piece) {
      const nextCaptures = getAvailableMoves(piece).filter(m => m.captured);
      if (nextCaptures.length > 0 && piece.dataset.owner === "computer") {
        const move = nextCaptures[Math.floor(Math.random() * nextCaptures.length)];
        movePiece(piece, move.row, move.col, move.captured);
      } else {
        currentPlayer = "player";
      }
    }

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

    function startGame(options = {}) {
      // cancela timeouts pendentes ANTES de reconstruir o tabuleiro
      clearActiveTimeouts();

      // se passado resetScores:true, zera os placares
      if (options.resetScores) {
        playerScore = 0;
        computerScore = 0;
      }

      createBoard();
      placePieces();
      currentPlayer = "player";
      selectedPiece = null;
      capturingPiece = null;
      updateScores();
    }

    function updateScores() {
      if (playerScoreEl) playerScoreEl.textContent = playerScore;
      if (computerScoreEl) computerScoreEl.textContent = computerScore;
    }

    /* ----------------------------
       Controles / restart
    -----------------------------*/

    // expomos para debug/uso externo
    window.restartGame = function (resetScores = false) {
      startGame({ resetScores });
    };

    function initControls() {
      // Procura botão por id, ou por data-action
      const restartBtn =
        document.getElementById("restartBtn") ||
        document.querySelector('button[data-action="restart"]') ||
        document.querySelector('#controls button') ||
        null;

      if (restartBtn) {
        restartBtn.addEventListener("click", (ev) => {
          // se houver data-reset-scores="true" no botão, zera placar
          const resetScores = restartBtn.dataset.resetScores === "true";
          startGame({ resetScores });
        });
      } else {
        console.warn("Botão de reiniciar não encontrado. Adicione <button id='restartBtn'>Reiniciar</button> ou <button data-action='restart'>Reiniciar</button>");
      }
    }

    // inicializa tudo
    initControls();
    startGame();
  } // fim setup

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
