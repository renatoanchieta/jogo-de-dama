const board = document.getElementById("board");
const playerScoreEl = document.getElementById("playerScore");
const computerScoreEl = document.getElementById("computerScore");

let cells = [];
let pieces = [];
let playerScore = 0;
let computerScore = 0;
let currentPlayer = "player";
let selectedPiece = null;

function createBoard() {
  board.innerHTML = "";
  cells = [];
  for (let row = 0; row < 8; row++) {
    let rowCells = [];
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
  for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) if ((row + col) % 2 !== 0) addPiece(row, col, "computer");
  for (let row = 5; row < 8; row++) for (let col = 0; col < 8; col++) if ((row + col) % 2 !== 0) addPiece(row, col, "player");
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
  if (owner === "player") piece.addEventListener("click", () => selectPiece(piece));
}

function selectPiece(piece) {
  if (currentPlayer !== "player") return;
  selectedPiece = piece;
  clearHighlights();
  const moves = getAvailableMoves(piece);
  moves.forEach(({row, col, captured}) => {
    const cell = cells[row][col];
    cell.classList.add("highlight");
    cell.onclick = () => movePiece(piece, row, col, captured);
  });
}

function getAvailableMoves(piece) {
  const moves = [];
  const row = parseInt(piece.dataset.row);
  const col = parseInt(piece.dataset.col);
  const owner = piece.dataset.owner;
  const isKing = piece.dataset.king === "true";
  const directions = isKing ? [[-1,-1],[-1,1],[1,-1],[1,1]] : owner === "player" ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];

  directions.forEach(([dr,dc])=>{
    let r=row+dr;
    let c=col+dc;
    while(r>=0&&r<8&&c>=0&&c<8){
      const cell=cells[r][c];
      if(cell.children.length===0){
        moves.push({row:r,col:c,captured:null});
      } else if(cell.children[0].dataset.owner !== owner){
        let jumpR=r+dr,jumpC=c+dc;
        while(jumpR>=0&&jumpR<8&&jumpC>=0&&jumpC<8 && cells[jumpR][jumpC].children.length===0){
          moves.push({row:jumpR,col:jumpC,captured:cell.children[0]});
          if(!isKing) break;
          jumpR+=dr;jumpC+=dc;
        }
        break;
      } else break;
      if(!isKing) break;
      r+=dr;c+=dc;
    }
  });
  return moves;
}

function clearHighlights(){
  cells.flat().forEach(cell=>{
    cell.classList.remove('highlight');
    cell.onclick=null;
  });
}

function movePiece(piece,row,col,capturedPiece=null){
  clearHighlights();
  const oldRow=parseInt(piece.dataset.row);
  const oldCol=parseInt(piece.dataset.col);
  cells[oldRow][oldCol].removeChild(piece);
  cells[row][col].appendChild(piece);
  piece.dataset.row=row;
  piece.dataset.col=col;
  if(capturedPiece){
    const r=parseInt(capturedPiece.dataset.row);
    const c=parseInt(capturedPiece.dataset.col);
    cells[r][c].removeChild(capturedPiece);
    pieces=pieces.filter(p=>p!==capturedPiece);
  }
  if((piece.dataset.owner==='player'&&row===0)||(piece.dataset.owner==='computer'&&row===7)){
    piece.dataset.king='true';
    piece.classList.add('king');
  }
  checkEndGame();
  currentPlayer=currentPlayer==='player'?'computer':'player';
  if(currentPlayer==='computer') setTimeout(computerMove,800);
}

function computerMove(){
  let computerPieces=pieces.filter(p=>p.dataset.owner==='computer');
  let captureMoves=[];
  computerPieces.forEach(piece=>{
    const moves=getAvailableMoves(piece).filter(m=>m.captured);
    captureMoves.push(...moves.map(m=>({...m,piece})));
  });
  if(captureMoves.length>0){
    const move=captureMoves[Math.floor(Math.random()*captureMoves.length)];
    movePiece(move.piece,move.row,move.col,move.captured);
  }else{
    let possibleMoves=[];
    computerPieces.forEach(piece=>{
      const moves=getAvailableMoves(piece).filter(m=>!m.captured);
      possibleMoves.push(...moves.map(m=>({...m,piece})));
    });
    if(possibleMoves.length>0){
      const move=possibleMoves[Math.floor(Math.random()*possibleMoves.length)];
      movePiece(move.piece,move.row,move.col);
    }else currentPlayer='player';
  }
}

function checkEndGame(){
  const playerPieces=pieces.filter(p=>p.dataset.owner==='player');
  const computerPieces=pieces.filter(p=>p.dataset.owner==='computer');
  if(playerPieces.length===0){
    computerScore++;
    updateScores();
    alert('Derrota!');
    startGame();
  } else if(computerPieces.length===0){
    playerScore++;
    updateScores();
    alert('Vitória!');
    startGame();
  }
}

function startGame(){
  createBoard();
  placePieces();
  currentPlayer='player';
}

function restartGame(){
  createBoard();
  placePieces();
  currentPlayer='player';
}

function updateScores(){
  playerScoreEl.textContent=playerScore;
  computerScoreEl.textContent=computerScore;
}

startGame();