document.addEventListener('DOMContentLoaded', () => {
  // Global Variables/Constants
  const gameBoard = document.getElementById('game-board');
  const tileContainer = document.getElementById('tile-container');
  const playButton = document.getElementById('play-button');
  const doneButton = document.getElementById('done-button');
  const timerDisplay = document.getElementById('timer-display');

  const GRID_SIZE = 12;
  const NUM_TILES = 21; // As per requirement, though 7-10 is more typical for Scrabble-like games
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

  let timerInterval;
  let timeLeft;
  let gameBoardInitialized = false;

  // --- `createGameBoard()` function ---
  function createGameBoard() {
    if (gameBoardInitialized) return;

    gameBoard.innerHTML = ''; // Clear previous board if any (e.g., on restart)
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell'); // For styling and identification
      // cell.dataset.row = Math.floor(i / GRID_SIZE);
      // cell.dataset.col = i % GRID_SIZE;

      // Drag and Drop Event Listeners for Grid Cells
      cell.addEventListener('dragover', (event) => {
        event.preventDefault(); // Allow drop
        cell.classList.add('drag-over'); // Optional: visual feedback
      });

      cell.addEventListener('dragleave', (event) => {
        cell.classList.remove('drag-over'); // Optional: visual feedback
      });

      cell.addEventListener('drop', (event) => {
        event.preventDefault();
        cell.classList.remove('drag-over'); // Optional: visual feedback
        const draggedTileId = event.dataTransfer.getData('text/plain');
        const draggedTile = document.getElementById(draggedTileId);

        if (draggedTile && event.target.classList.contains('grid-cell') && event.target.children.length === 0) {
          // If the target is a grid cell and it's empty
          const originalParent = draggedTile.parentElement;
          event.target.appendChild(draggedTile);
          // Check if the original parent was another grid cell, make it droppable again
          if (originalParent && originalParent.classList.contains('grid-cell')) {
            // No specific action needed here unless we add specific occupied states
          }
        } else if (draggedTile && event.target.classList.contains('letter-tile')) {
          // If dropping on another tile in the grid (optional: swap or prevent)
          // For now, let's prevent dropping on an occupied tile by doing nothing or
          // moving the tile back to the container if it came from there
        }
      });
      gameBoard.appendChild(cell);
    }
    gameBoardInitialized = true;
  }

  // --- `generateRandomTiles()` function ---
  function generateRandomTiles() {
    tileContainer.innerHTML = ''; // Clear existing tiles
    for (let i = 0; i < NUM_TILES; i++) {
      const tile = document.createElement('div');
      tile.classList.add('letter-tile');
      tile.draggable = true;
      tile.id = `tile-${Date.now()}-${i}`; // Unique ID
      tile.textContent = LETTERS[Math.floor(Math.random() * LETTERS.length)];

      tile.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', event.target.id);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            event.target.classList.add('dragging'); // Optional: style the dragged tile
        }, 0);
      });

      tile.addEventListener('dragend', (event) => {
        event.target.classList.remove('dragging'); // Optional: remove style
      });

      tileContainer.appendChild(tile);
    }
  }

  // --- Event listener for tile container to allow dropping tiles back ---
  tileContainer.addEventListener('dragover', (event) => {
    event.preventDefault(); // Allow drop
    tileContainer.classList.add('drag-over');
  });

  tileContainer.addEventListener('dragleave', (event) => {
    tileContainer.classList.remove('drag-over');
  });

  tileContainer.addEventListener('drop', (event) => {
    event.preventDefault();
    tileContainer.classList.remove('drag-over');
    const draggedTileId = event.dataTransfer.getData('text/plain');
    const draggedTile = document.getElementById(draggedTileId);

    if (draggedTile) {
      // If the tile is coming from a grid cell or just being reordered in the container
      const originalParent = draggedTile.parentElement;
      tileContainer.appendChild(draggedTile); // Simply append back
      // If original parent was a grid cell, it's now empty and ready for a new tile
      if (originalParent && originalParent.classList.contains('grid-cell')) {
        // originalParent is now implicitly empty
      }
    }
  });


  // --- `startTimer(duration)` function ---
  function startTimer(duration) {
    clearInterval(timerInterval); // Clear any existing timer
    timeLeft = duration;
    timerDisplay.textContent = formatTime(timeLeft);

    timerInterval = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = formatTime(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        stopGame();
        alert("Time's up!"); // Or some other indication
      }
    }, 1000);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // --- `startGame()` function ---
  function startGame() {
    createGameBoard(); // Ensure board is created
    generateRandomTiles();
    startTimer(180); // 3 minutes
    playButton.disabled = true;
    doneButton.disabled = false;
    gameBoard.classList.remove('game-over'); // In case it was set
    tileContainer.classList.remove('game-over'); // In case it was set
  }

  // --- `stopGame()` function ---
  function stopGame() {
    clearInterval(timerInterval);
    playButton.disabled = false;
    doneButton.disabled = true;
    // Add class to visually indicate game is over (e.g., disable further tile drops)
    gameBoard.classList.add('game-over');
    tileContainer.classList.add('game-over');
    // Word checking logic will be added later
    console.log("Game stopped. Word checking to be implemented.");
  }

  // --- Event Listeners for Buttons ---
  playButton.addEventListener('click', startGame);
  doneButton.addEventListener('click', stopGame);

  // --- Initial setup ---
  doneButton.disabled = true; // Done button should be disabled initially
});
