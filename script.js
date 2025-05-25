document.addEventListener('DOMContentLoaded', () => {
  // Global Variables/Constants
  const gameBoard = document.getElementById('game-board');
  const tileContainer = document.getElementById('tile-container');
  const playButton = document.getElementById('play-button');
  const doneButton = document.getElementById('done-button');
  const timerDisplay = document.getElementById('timer-display');
  const feedbackArea = document.getElementById('feedback-area'); // Added reference to feedback-area

  const GRID_SIZE = 12;
  const NUM_TILES = 16; // Updated number of tiles
  // const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''); // Replaced by weighted distribution

  // --- Simple Dictionary for Word Validation ---
  const VALID_WORDS_ARRAY = [
    "HELLO", "WORLD", "GAME", "PLAYER", "TILE", "WORD", "CODE", "YES", "NO", "FUN", "PLAY", "GRID", "TIME", "MAKE",
    "VALID", "APPLE", "BANANA", "CAT", "DOG", "ELEPHANT", "ICE", "JUMP", "KING", "LION", "MANGO", "NEST", "ORANGE",
    "QUEEN", "RUN", "SUN", "UMBRELLA", "VAN", "XYLOPHONE", "ZEBRA", "TIMER", "VALIDATE", "SCRIPT", "BOARD", "BUTTON",
    "EVENT", "DRAG", "DROP", "CELL", "LIST", "ARRAY", "OBJECT", "CLASS", "STYLE", "HTML", "BODY", "HEAD", "TEXT", "LINK",
    "PAGE", "TEST", "USER", "ITEM", "MENU", "AREA", "BOOK", "CARD", "CITY", "DATE", "DOOR", "EAST", "FISH", "FOOD",
    "GOLD", "HAND", "HOME", "IDEA", "JOIN", "LAND", "LIFE", "LINE", "LOVE", "MAPS", "MILK", "MIND", "MOON", "NAME",
    "NEWS", "OPEN", "PARK", "PART", "PINE", "POST", "READ", "ROAD", "ROCK", "ROOM", "SAND", "SEAT", "SHOP", "SIDE",
    "SIGN", "STAR", "STEP", "TASK", "TEAM", "TOUR", "TREE", "UNIT", "VIEW", "WALL", "WARM", "WAVE", "WEEK", "WEST",
    "WIND", "WINE", "WOOD", "YEAR"
  ];
  const VALID_WORDS_SET = new Set(VALID_WORDS_ARRAY);

  let timerInterval;
  let timeLeft;
  let gridInitialized = false; // Renamed from gameBoardInitialized
  let gameHasBeenPlayed = false; // Tracks if a game cycle has been completed or is in progress

  // --- `resetGame()` function ---
  function resetGame() {
    // Clear tiles from game board cells
    const gridCells = document.querySelectorAll('#game-board .grid-cell');
    gridCells.forEach(cell => {
      cell.innerHTML = ''; // Remove any tile elements
    });

    // Clear tiles from tile container
    tileContainer.innerHTML = '';

    // Reset timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    // timeLeft = 180; // Reset to initial duration or 0 if preferred
    // timerDisplay.textContent = formatTime(timeLeft); 
    // Let startGame handle setting the timer display when it starts a new timer.
    // For now, just clear it or set to a default.
    timeLeft = 0; 
    timerDisplay.textContent = formatTime(timeLeft);


    // Reset button states
    playButton.disabled = false;
    doneButton.disabled = true;

    gameBoard.classList.remove('game-over');
    tileContainer.classList.remove('game-over');
    // gameHasBeenPlayed will be set to true again by startGame or stopGame.
  }

  // --- `createGameBoard()` function ---
  function createGameBoard() {
    if (gridInitialized) return;

    // gameBoard.innerHTML = ''; // This should not be here if we want to preserve the grid structure.
    // If grid cells are added dynamically, this is fine. If they are static in HTML, this line is wrong.
    // Based on current implementation, it dynamically creates cells, so clearing is fine if this is called only once.
    // However, the intention is to create the grid structure once.
    // The current code for createGameBoard already clears and rebuilds, which is okay as long as gridInitialized prevents re-entry.
    
    // Ensuring it's truly empty before adding new cells if this were to be callable multiple times without the guard.
    // For now, the guard `if (gridInitialized) return;` is the primary mechanism.
    // And `gameBoard.innerHTML = '';` is within the guarded block.

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
    gridInitialized = true;
  }

  // --- `generateRandomTiles()` function ---
  function generateRandomTiles() {
    tileContainer.innerHTML = ''; // Clear existing tiles

    const letterFrequencies = {
      'E': 12, 'A': 9, 'I': 9, 'O': 8, 'N': 6, 'R': 6, 'T': 6, 'L': 4, 'S': 4, 'U': 4,
      'D': 4, 'G': 3, 'B': 2, 'C': 2, 'M': 2, 'P': 2, 'F': 2, 'H': 2, 'V': 2, 'W': 2, 'Y': 2,
      'K': 1, 'J': 1, 'X': 1, 'Q': 1, 'Z': 1
    };

    let letterPool = [];
    for (const letter in letterFrequencies) {
      for (let i = 0; i < letterFrequencies[letter]; i++) {
        letterPool.push(letter);
      }
    }

    // Shuffle the letter pool to ensure randomness
    for (let i = letterPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letterPool[i], letterPool[j]] = [letterPool[j], letterPool[i]];
    }

    // Select NUM_TILES from the shuffled pool (without replacement from the start of the shuffled array)
    const selectedLetters = letterPool.slice(0, NUM_TILES);

    for (let i = 0; i < selectedLetters.length; i++) {
      const tile = document.createElement('div');
      tile.classList.add('letter-tile');
      tile.draggable = true;
      tile.id = `tile-${Date.now()}-${i}`; // Unique ID
      tile.textContent = selectedLetters[i];

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
    if (gameHasBeenPlayed) {
      if (!confirm("Start a new game? Any current progress will be lost.")) {
        return; // User cancelled
      }
    }

    // Reset game state if a game has been played or is in progress.
    // This ensures a clean slate before starting a new game.
    if (feedbackArea) feedbackArea.innerHTML = ''; // Clear feedback area at game start
    resetGame(); // Clears board, tiles, timer, resets buttons

    if (!gridInitialized) {
      createGameBoard(); // Builds the physical grid cells only once
      // gridInitialized = true; // createGameBoard sets this internally
    }
    // If grid was already initialized, resetGame has cleared the tiles from cells.

    generateRandomTiles(); // Generates new tiles for the player
    startTimer(180); // Start the timer for 3 minutes

    playButton.disabled = true;
    doneButton.disabled = false;
    gameBoard.classList.remove('game-over'); // Ensure visual state is active
    tileContainer.classList.remove('game-over'); // Ensure visual state is active
    gameHasBeenPlayed = true; // Mark that a game has now been initiated/played
  }

  // --- `stopGame()` function ---
  function stopGame() {
    clearInterval(timerInterval); // Stop the timer
    playButton.disabled = false; // Allow player to start a new game
    doneButton.disabled = true; // Disable "Done" as the game is over

    // Add class to visually indicate game is over (e.g., disable further tile drops)
    gameBoard.classList.add('game-over');
    tileContainer.classList.add('game-over');
    
    gameHasBeenPlayed = true; // Mark that a game cycle was completed.
                              // Next click on "Play" should prompt for a new game.

    const potentialWords = extractWordsFromBoard();
    console.log("Potential words found on board:", potentialWords);

    const checkedWordsResult = checkWords(potentialWords);
    // console.log("Valid words:", checkedWordsResult.valid); // Will be displayed in feedback area
    // console.log("Invalid words:", checkedWordsResult.invalid); // Will be displayed in feedback area

    if (feedbackArea) {
      feedbackArea.innerHTML = ''; // Clear previous feedback
      feedbackArea.className = ''; // Reset classes

      if (checkedWordsResult.invalid.length > 0) {
        let message = `Some words are not valid: ${checkedWordsResult.invalid.join(', ')}. `;
        if (checkedWordsResult.valid.length > 0) {
          message += `Valid words found: ${checkedWordsResult.valid.join(', ')}.`;
        } else {
          message += "No valid words were found.";
        }
        feedbackArea.textContent = message;
        feedbackArea.classList.add('feedback-error');
      } else if (checkedWordsResult.valid.length > 0) {
        feedbackArea.textContent = `Great job! All words are valid: ${checkedWordsResult.valid.join(', ')}.`;
        feedbackArea.classList.add('feedback-success');
      } else {
        // This case means potentialWords was empty or all words in it were invalid (and invalid.length was 0, which is unlikely if potentialWords wasn't empty)
        // Or, potentialWords was empty.
        if (potentialWords.length > 0) { // Means all words were invalid, but checkWords didn't categorize them as such (e.g. too short before check)
             feedbackArea.textContent = "No valid words formed. Remember, words must be at least 2 letters long.";
             feedbackArea.classList.add('feedback-error'); // Still an error/non-success state
        } else {
             feedbackArea.textContent = "No words found on the board. Try placing some tiles!";
             feedbackArea.classList.add('feedback-neutral');
        }
      }
    } else {
      // Fallback to console if feedbackArea is not found (should not happen with correct HTML)
      console.log("Valid words:", checkedWordsResult.valid);
      console.log("Invalid words:", checkedWordsResult.invalid);
    }
    // Scoring will be implemented later based on valid words.
  }

  // --- `checkWords(wordsArray)` function ---
  function checkWords(wordsArray) {
    const validWords = [];
    const invalidWords = [];
    for (const word of wordsArray) {
      if (VALID_WORDS_SET.has(word)) {
        validWords.push(word);
      } else {
        invalidWords.push(word);
      }
    }
    return { valid: validWords, invalid: invalidWords };
  }

  // --- `extractWordsFromBoard()` function ---
  function extractWordsFromBoard() {
    const MIN_WORD_LENGTH = 2;
    const boardRepresentation = [];
    const gridCells = document.querySelectorAll('#game-board .grid-cell');

    // Create 2D board representation
    for (let r = 0; r < GRID_SIZE; r++) {
      boardRepresentation[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const cellIndex = r * GRID_SIZE + c;
        const cell = gridCells[cellIndex];
        const tile = cell ? cell.querySelector('.letter-tile') : null;
        boardRepresentation[r][c] = tile ? tile.textContent.toUpperCase() : null;
      }
    }

    const foundWordsSet = new Set();

    // Extract Horizontal Words
    for (let r = 0; r < GRID_SIZE; r++) {
      let currentWord = "";
      for (let c = 0; c < GRID_SIZE; c++) {
        const letter = boardRepresentation[r][c];
        if (letter) {
          currentWord += letter;
        } else {
          if (currentWord.length >= MIN_WORD_LENGTH) {
            foundWordsSet.add(currentWord);
          }
          currentWord = "";
        }
      }
      // After iterating through columns, check if there's a pending word
      if (currentWord.length >= MIN_WORD_LENGTH) {
        foundWordsSet.add(currentWord);
      }
    }

    // Extract Vertical Words
    for (let c = 0; c < GRID_SIZE; c++) {
      let currentWord = "";
      for (let r = 0; r < GRID_SIZE; r++) {
        const letter = boardRepresentation[r][c];
        if (letter) {
          currentWord += letter;
        } else {
          if (currentWord.length >= MIN_WORD_LENGTH) {
            foundWordsSet.add(currentWord);
          }
          currentWord = "";
        }
      }
      // After iterating through rows, check if there's a pending word
      if (currentWord.length >= MIN_WORD_LENGTH) {
        foundWordsSet.add(currentWord);
      }
    }

    return Array.from(foundWordsSet);
  }

  // --- Event Listeners for Buttons ---
  playButton.addEventListener('click', startGame);
  doneButton.addEventListener('click', stopGame);

  // --- Initial setup ---
  doneButton.disabled = true; // Done button should be disabled initially
});
