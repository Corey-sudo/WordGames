document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element References ---
  const gameBoard = document.getElementById('game-board');
  const tileContainer = document.getElementById('tile-container');
  const playButton = document.getElementById('play-button');
  const doneButton = document.getElementById('done-button');
  const continueButton = document.getElementById('continue-button'); 
  const timerDisplay = document.getElementById('timer-display');
  const feedbackArea = document.getElementById('feedback-area'); 
  const scoreDisplay = document.getElementById('score-display'); 

  // --- Global Game Constants ---
  const GRID_SIZE = 12;
  const NUM_TILES = 16; 
  const LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1,
    'F': 4, 'G': 2, 'H': 4, 'I': 1, 'J': 8,
    'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1,
    'P': 3, 'Q': 10, 'R': 1, 'S': 1, 'U': 1,
    'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
  };

  // --- Global Game State Variables ---
  let timerInterval;        // Holds the interval ID for the game timer
  let timeLeft;             // Current time left in seconds
  let gridInitialized = false; // Flag to ensure game board grid is created only once
  let gameHasBeenPlayed = false; // Flag to track if a game cycle (start to end/pause) has occurred
  
  // --- Game State Variables for Pause/Continue ---
  let gamePaused = false;       // Flag to indicate if the game is currently paused
  let savedTimeLeft = -1;     // Stores the timer value when a game is paused

  // --- Touch Drag State Variables ---
  let draggedTile = null;     // Reference to the tile element being dragged
  let initialTouchX = 0;      // Initial X coordinate of a touch event
  let initialTouchY = 0;      // Initial Y coordinate of a touch event
  let offsetX = 0;            // X offset between touch point and tile's top-left corner
  let offsetY = 0;            // Y offset between touch point and tile's top-left corner
  let originalParent = null;  // Original parent of the dragged tile

  // --- Game Setup and Reset Functions ---

  /**
   * Resets the game state to its initial settings.
   * Clears the game board, tile container, timer, and score.
   * Resets button states and game state flags.
   */
  function resetGame() {
    // Clear letter tiles from grid cells
    const gridCells = document.querySelectorAll('#game-board .grid-cell');
    gridCells.forEach(cell => {
      cell.innerHTML = ''; 
    });

    // Clear letter tiles from the player's rack
    if(tileContainer) tileContainer.innerHTML = '';

    // Clear and reset timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    timeLeft = 0; 
    if(timerDisplay) timerDisplay.textContent = formatTime(timeLeft);

    // Reset buttons to initial state
    if (playButton) {
      playButton.disabled = false;
      playButton.textContent = 'Play';
    }
    if (doneButton) doneButton.disabled = true;
    if (continueButton) continueButton.style.display = 'none';

    // Reset game state flags
    gamePaused = false;
    savedTimeLeft = -1;
    if (scoreDisplay) scoreDisplay.textContent = 'Score: 0'; 
    
    // Remove game-over visual cues
    if(gameBoard) gameBoard.classList.remove('game-over');
    if(tileContainer) tileContainer.classList.remove('game-over');
  }

  /**
   * Creates the 12x12 game board grid cells.
   * Adds drag-and-drop event listeners for mouse interactions to each cell.
   * Ensures the grid is initialized only once.
   */
  function createGameBoard() {
    if (gridInitialized || !gameBoard) return;

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell'); 

      // Mouse Drag & Drop Listeners for Grid Cells
      cell.addEventListener('dragover', (event) => {
        event.preventDefault(); 
        cell.classList.add('drag-over'); 
      });
      cell.addEventListener('dragleave', (event) => {
        cell.classList.remove('drag-over'); 
      });
      cell.addEventListener('drop', (event) => {
        event.preventDefault();
        cell.classList.remove('drag-over'); 
        const draggedTileId = event.dataTransfer.getData('text/plain');
        const draggedTileElement = document.getElementById(draggedTileId);
        if (draggedTileElement && event.target.classList.contains('grid-cell') && event.target.children.length === 0) {
          // const originalTileParent = draggedTileElement.parentElement; // Could be used for more complex logic
          event.target.appendChild(draggedTileElement);
        } 
      });
      gameBoard.appendChild(cell);
    }
    gridInitialized = true;
  }

  /**
   * Generates a new set of random letter tiles for the player.
   * Uses a weighted distribution for letter frequency.
   * Adds dragstart, dragend (for mouse), and touchstart (for touch) event listeners to each tile.
   */
  function generateRandomTiles() {
    if(!tileContainer) return;
    tileContainer.innerHTML = ''; 

    const letterFrequencies = { // Standard Scrabble-like letter frequencies
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
    // Shuffle the pool
    for (let i = letterPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letterPool[i], letterPool[j]] = [letterPool[j], letterPool[i]];
    }

    const selectedLetters = letterPool.slice(0, NUM_TILES);
    for (let i = 0; i < selectedLetters.length; i++) {
      const tile = document.createElement('div');
      tile.classList.add('letter-tile');
      tile.draggable = true; // For mouse-based drag
      tile.id = `tile-${Date.now()}-${i}`; // Unique ID for drag identification
      tile.textContent = selectedLetters[i];

      // Mouse Drag & Drop Listeners for Tiles
      tile.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', event.target.id);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { // Timeout ensures the style is applied after drag operation starts
            event.target.classList.add('dragging'); 
        }, 0);
      });
      tile.addEventListener('dragend', (event) => {
        event.target.classList.remove('dragging'); 
      });

      // Touch Event Listener for Tiles
      tile.addEventListener('touchstart', handleTouchStart, { passive: false }); // passive: false for preventDefault
      
      tileContainer.appendChild(tile);
    }
  }

  // --- Touch Event Handlers ---

  /**
   * Handles the start of a touch drag on a letter tile.
   * @param {TouchEvent} event - The touchstart event.
   */
  function handleTouchStart(event) {
    // Allow dragging only if the game is active (Done button is not disabled)
    if (doneButton && doneButton.disabled) { 
        return; 
    }
    if (event.target.classList.contains('letter-tile')) {
        draggedTile = event.target;
        event.preventDefault(); // Prevent default touch behaviors (like scrolling)
        originalParent = draggedTile.parentNode; 
        const touch = event.touches[0];
        initialTouchX = touch.clientX;
        initialTouchY = touch.clientY;
        const rect = draggedTile.getBoundingClientRect();
        offsetX = initialTouchX - rect.left;
        offsetY = initialTouchY - rect.top;

        // Style tile for dragging
        draggedTile.style.position = 'fixed'; 
        draggedTile.style.zIndex = '1000'; 
        draggedTile.style.left = `${initialTouchX - offsetX}px`;
        draggedTile.style.top = `${initialTouchY - offsetY}px`;
        draggedTile.classList.add('dragging'); 

        // Add global listeners for move and end events
        document.addEventListener('touchmove', handleTouchMove, { passive: false }); 
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd); 
    }
  }

  /**
   * Handles the movement of a touch-dragged letter tile.
   * @param {TouchEvent} event - The touchmove event.
   */
  function handleTouchMove(event) {
    if (draggedTile) {
        event.preventDefault(); // Prevent scrolling during drag
        const touch = event.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        // Update tile position based on touch movement and initial offset
        draggedTile.style.left = `${currentX - offsetX}px`;
        draggedTile.style.top = `${currentY - offsetY}px`;
    }
  }

  /**
   * Handles the end of a touch drag on a letter tile (drop logic).
   * @param {TouchEvent} event - The touchend or touchcancel event.
   */
  function handleTouchEnd(event) {
    if (draggedTile) {
        // Clean up global event listeners
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);

        // Determine drop target
        draggedTile.style.visibility = 'hidden'; // Temporarily hide to get element underneath
        const endX = event.changedTouches[0].clientX;
        const endY = event.changedTouches[0].clientY;
        let dropTarget = document.elementFromPoint(endX, endY);
        draggedTile.style.visibility = 'visible'; // Restore visibility

        // Reset tile's dragging styles
        draggedTile.style.position = ''; 
        draggedTile.style.left = '';
        draggedTile.style.top = '';
        draggedTile.style.zIndex = '';
        draggedTile.classList.remove('dragging');

        let successfullyDropped = false;
        if (dropTarget) {
            // Dropping onto an empty grid cell
            if (dropTarget.classList.contains('grid-cell') && !dropTarget.hasChildNodes()) {
                dropTarget.appendChild(draggedTile);
                successfullyDropped = true;
            } 
            // Dropping onto the tile container or an element within it
            else if (dropTarget === tileContainer || (tileContainer && tileContainer.contains(dropTarget))) {
                if (dropTarget.classList.contains('letter-tile') && dropTarget.parentNode === tileContainer) {
                    tileContainer.appendChild(draggedTile); // Reorder within container
                } else if (dropTarget === tileContainer) { 
                     tileContainer.appendChild(draggedTile); // Drop directly on container
                } else if (dropTarget.classList.contains('grid-cell') && dropTarget.hasChildNodes() && originalParent === tileContainer) {
                    // If dropped on an occupied grid cell AND came from tile container, put it back in tile container
                    tileContainer.appendChild(draggedTile);
                }
                successfullyDropped = true; 
            }
        }

        // If not successfully dropped, return to original parent or tile container as fallback
        if (!successfullyDropped && originalParent) {
            originalParent.appendChild(draggedTile);
        } else if (!successfullyDropped && tileContainer) { // Fallback if originalParent is null
            tileContainer.appendChild(draggedTile);
        }
        
        // Clear drag state variables
        draggedTile = null;
        originalParent = null;
    }
  }

  // --- Mouse Drag & Drop Listeners for Tile Container (Fallback for Tiles) ---
  if(tileContainer) {
    tileContainer.addEventListener('dragover', (event) => {
      event.preventDefault(); 
      tileContainer.classList.add('drag-over');
    });
    tileContainer.addEventListener('dragleave', (event) => {
      tileContainer.classList.remove('drag-over');
    });
    tileContainer.addEventListener('drop', (event) => {
      event.preventDefault();
      tileContainer.classList.remove('drag-over');
      const draggedTileId = event.dataTransfer.getData('text/plain');
      const draggedTileElement = document.getElementById(draggedTileId);
      if (draggedTileElement) {
        // const originalTileParent = draggedTileElement.parentElement; // Could be used for more complex logic
        tileContainer.appendChild(draggedTileElement); 
      }
    });
  }

  // --- Timer Functions ---

  /**
   * Starts or resumes the game timer.
   * @param {number} duration - The time in seconds for the timer.
   */
  function startTimer(duration) {
    if(timerInterval) clearInterval(timerInterval); 
    timeLeft = duration;
    if(timerDisplay) timerDisplay.textContent = formatTime(timeLeft);
    timerInterval = setInterval(() => {
      timeLeft--;
      if(timerDisplay) timerDisplay.textContent = formatTime(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        stopGame(); // Automatically stop game when time is up
        alert("Time's up!"); 
      }
    }, 1000);
  }

  /**
   * Formats time in seconds to a MM:SS string.
   * @param {number} seconds - The time in seconds.
   * @returns {string} The formatted time string.
   */
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // --- Game Control Functions ---

  /**
   * Starts a new game.
   * Prompts for confirmation if a game has been played or is paused.
   * Resets game state, generates new tiles, and starts the timer.
   */
  function startGame() {
    // Confirm starting a new game if a previous game was played or is currently paused
    if ((gameHasBeenPlayed && !gamePaused) || gamePaused) { 
      if (!confirm("Start a new game? Any current progress will be lost.")) {
        return; 
      }
    }
    if (feedbackArea) feedbackArea.innerHTML = ''; 
    
    // Reset core game states for a new game
    gamePaused = false;
    savedTimeLeft = -1;
    
    resetGame(); // Resets board, tiles, timer, buttons, score display
    
    if (!gridInitialized) {
      createGameBoard(); 
    }
    generateRandomTiles(); 
    startTimer(180); // Start a 3-minute timer
    
    if(playButton) playButton.disabled = true;
    if(doneButton) doneButton.disabled = false;
    
    if(gameBoard) gameBoard.classList.remove('game-over'); 
    if(tileContainer) tileContainer.classList.remove('game-over'); 
    gameHasBeenPlayed = true; // Mark that a game attempt has started
  }

  /**
   * Calculates the score for a given word based on letter values and length bonuses.
   * @param {string} word - The word to score.
   * @returns {number} The calculated score for the word.
   */
  function calculateWordScore(word) {
    let score = 0;
    for (const letter of word.toUpperCase()) { 
        score += LETTER_VALUES[letter] || 0; 
    }
    if (word.length >= 7) { // Bonus for 7+ letter words
        score += 25; 
    } else if (word.length >= 5) { // Bonus for 5-6 letter words
        score += 10;
    }
    return score;
  }

  /**
   * Validates a word against an external dictionary API.
   * @param {string} word - The word to validate.
   * @returns {Promise<boolean>} True if the word is valid, false otherwise.
   */
  async function isValidWordAPI(word) {
    if (!word || typeof word !== 'string' || word.trim() === '') {
        return false; 
    }
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`; 
    try {
        const response = await fetch(apiUrl);
        if (response.ok) { 
            return true; 
        } else if (response.status === 404) { // Word not found by API
            return false; 
        } else { // Other API errors
            console.error(`API error for "${word}": ${response.status} - ${response.statusText}`);
            return false; 
        }
    } catch (error) { // Network errors or exceptions during fetch
        console.error(`Network error or exception for "${word}":`, error);
        return false; 
    }
  }

  /**
   * Checks an array of words using the dictionary API and scores valid words.
   * @param {string[]} wordsArray - An array of words to check.
   * @returns {Promise<object>} An object with `valid` (array of {word, score}) and `invalid` (array of strings) words.
   */
  async function checkWords(wordsArray) {
    if (!wordsArray || wordsArray.length === 0) {
        return { valid: [], invalid: [] };
    }
    const validWordStrings = []; 
    const invalidWords = [];
    // Create an array of promises for API validation calls
    const validationPromises = wordsArray.map(word => isValidWordAPI(word));
    try {
        const results = await Promise.all(validationPromises); // Wait for all API calls
        results.forEach((isValid, index) => {
            const originalWord = wordsArray[index];
            if (isValid) {
                validWordStrings.push(originalWord);
            } else {
                invalidWords.push(originalWord);
            }
        });
        // Score the successfully validated words
        const scoredValidWords = [];
        for (const validWord of validWordStrings) {
            const wordScore = calculateWordScore(validWord);
            scoredValidWords.push({ word: validWord, score: wordScore });
        }
        return { valid: scoredValidWords, invalid: invalidWords };
    } catch (error) { // Handle errors from Promise.all or within the mapping (though isValidWordAPI handles its own errors)
        console.error("Error during Promise.all in checkWords:", error);
        return { valid: [], invalid: wordsArray.slice() }; // Fallback: treat all as invalid
    }
  }
  
  /**
   * Handles the game ending or pausing when the "Done" button is clicked.
   * Extracts words, validates them, calculates scores, and updates UI.
   */
  async function stopGame() {
    clearInterval(timerInterval); 
    if(playButton) playButton.disabled = false; 
    if(doneButton) doneButton.disabled = true; 
    
    gameHasBeenPlayed = true; // Mark that a game cycle has been attempted/completed

    const potentialWords = extractWordsFromBoard();
    // console.log("Potential words found on board:", potentialWords); // Debugging, removed for cleanup

    // Initial feedback while validating
    if (feedbackArea) {
        feedbackArea.innerHTML = ''; 
        feedbackArea.className = 'feedback-neutral'; 
        if (potentialWords.length > 0) { 
            feedbackArea.textContent = "Validating words, please wait...";
        } else {
            feedbackArea.textContent = "No words found on the board. Try placing some tiles!";
            if(gameBoard) gameBoard.classList.add('game-over');
            if(tileContainer) tileContainer.classList.add('game-over');
            if(playButton) playButton.textContent = 'New Game'; 
            if(scoreDisplay) scoreDisplay.textContent = 'Score: 0'; // Ensure score is 0 if no words
            return; 
        }
    } else if (potentialWords.length === 0) { // Fallback if feedbackArea is not found
        console.log("No words found on the board.");
        if(gameBoard) gameBoard.classList.add('game-over');
        if(tileContainer) tileContainer.classList.add('game-over');
        if(playButton) playButton.textContent = 'New Game';
        if(scoreDisplay) scoreDisplay.textContent = 'Score: 0';
        return;
    }

    let checkedWordsResult; 
    let currentWordsScore = 0; // Initialize score

    try {
        checkedWordsResult = await checkWords(potentialWords); 

        // Calculate score from valid words
        if (checkedWordsResult.valid && checkedWordsResult.valid.length > 0) {
            checkedWordsResult.valid.forEach(item => { 
                currentWordsScore += item.score;
            });
        }
        // console.log("Total score from words (before bonus):", currentWordsScore); // Kept for debugging/info

        const tilesInContainerCount = tileContainer ? tileContainer.querySelectorAll('.letter-tile').length : 0;
        
        let timeBonus = 0;
        let gameSuccessfullyCompleted = false;
        const wordScoreBeforeBonus = currentWordsScore;

        // Check for successful game completion to award time bonus
        if (checkedWordsResult.invalid.length === 0 && tilesInContainerCount === 0 && checkedWordsResult.valid.length > 0) {
            gameSuccessfullyCompleted = true;
            timeBonus = Math.floor(timeLeft / 2); 
            currentWordsScore += timeBonus; 
            console.log("Time bonus awarded:", timeBonus);
        }

        const canContinue = tilesInContainerCount > 0 || (checkedWordsResult.invalid && checkedWordsResult.invalid.length > 0);

        if (feedbackArea) {
            feedbackArea.innerHTML = ''; 
            feedbackArea.className = ''; 
        }

        if (canContinue) { // Game is paused or needs correction
            gamePaused = true;
            savedTimeLeft = timeLeft; 
            
            if (feedbackArea) { 
                if (checkedWordsResult.invalid.length > 0) {
                    let message = `Invalid words: ${checkedWordsResult.invalid.join(', ')}. `;
                    if (checkedWordsResult.valid.length > 0) message += `Valid words score: ${wordScoreBeforeBonus}. `;
                    message += "You can continue playing or start a new game.";
                    feedbackArea.textContent = message;
                    feedbackArea.classList.add('feedback-error');
                } else if (tilesInContainerCount > 0 && checkedWordsResult.valid.length > 0) { 
                     feedbackArea.textContent = `Valid words: ${checkedWordsResult.valid.map(item => item.word).join(', ')}. Score: ${wordScoreBeforeBonus}. You still have tiles in your rack. Continue playing or start over.`;
                     feedbackArea.classList.add('feedback-neutral'); 
                } else if (tilesInContainerCount > 0) { 
                    feedbackArea.textContent = "No valid words found, but you still have tiles in your rack. Place all tiles to complete the game.";
                    feedbackArea.classList.add('feedback-neutral');
                } else { 
                     feedbackArea.textContent = "Review your words or place remaining tiles. Score so far: " + wordScoreBeforeBonus;
                     feedbackArea.classList.add('feedback-neutral');
                }
            }
            if (continueButton) continueButton.style.display = 'inline-block';
            if (playButton) playButton.textContent = 'New Game';

        } else { // Game successfully completed OR no invalid words and no tiles left
            gamePaused = false;
            savedTimeLeft = -1;
            if (feedbackArea) { 
                if (gameSuccessfullyCompleted) {
                    let successMessage = `Great job! All words are valid. Word Score: ${wordScoreBeforeBonus}. `;
                    if (timeBonus > 0) {
                        successMessage += `Time Bonus: +${timeBonus}. `;
                    }
                    successMessage += `Total Score: ${currentWordsScore}.`;
                    const wordList = checkedWordsResult.valid.map(item => item.word).join(', ');
                    successMessage += ` Words: ${wordList}. Game Over!`;
                    feedbackArea.textContent = successMessage;
                    feedbackArea.classList.add('feedback-success');
                } else if (checkedWordsResult.valid.length > 0) { 
                    feedbackArea.textContent = `Congratulations! All words are valid: ${checkedWordsResult.valid.map(item => item.word).join(', ')}. Total Word Score: ${currentWordsScore}. Game Over!`;
                    feedbackArea.classList.add('feedback-success');
                } else { 
                    feedbackArea.textContent = "Board cleared, but no valid words formed. Game Over. Score: 0.";
                    feedbackArea.classList.add('feedback-neutral');
                }
            }
            if (playButton) playButton.textContent = 'New Game';
            if (continueButton) continueButton.style.display = 'none';
            if(gameBoard) gameBoard.classList.add('game-over'); 
            if(tileContainer) tileContainer.classList.add('game-over');
        }
    } catch (error) { // Catch errors from checkWords or other issues in the try block
        console.error("Error during word validation/scoring in stopGame:", error);
        if (feedbackArea) {
            feedbackArea.innerHTML = ''; 
            feedbackArea.textContent = "Could not validate words. Please check your internet connection or try again.";
            feedbackArea.classList.add('feedback-error');
        }
        if (playButton) playButton.textContent = 'New Game';
        if (continueButton) continueButton.style.display = 'none'; 
        if(gameBoard) gameBoard.classList.add('game-over');
        if(tileContainer) tileContainer.classList.add('game-over');
    }
    // Update the score display with the final score
    if (scoreDisplay) scoreDisplay.textContent = `Score: ${currentWordsScore}`;
  }

  /**
   * Handles continuing a paused game.
   * Restarts the timer and updates button states.
   */
  function handleContinueGame() {
      if (gamePaused && savedTimeLeft > -1) {
          gamePaused = false;
          startTimer(savedTimeLeft); 
          if (doneButton) doneButton.disabled = false;
          if (playButton) {
            playButton.disabled = true; 
          }
          if (continueButton) continueButton.style.display = 'none';
          if (feedbackArea) feedbackArea.innerHTML = ''; 
          if(gameBoard) gameBoard.classList.remove('game-over'); 
          if(tileContainer) tileContainer.classList.remove('game-over');
      }
  }
  
  /**
   * Extracts all horizontal and vertical sequences of letters from the game board.
   * @returns {string[]} An array of unique potential words (length >= MIN_WORD_LENGTH).
   */
  function extractWordsFromBoard() {
    const MIN_WORD_LENGTH = 2;
    const boardRepresentation = [];
    const gridCells = gameBoard ? gameBoard.querySelectorAll('.grid-cell') : [];

    if (!gridCells.length) return []; // Return empty if no grid cells

    // Create 2D board representation from DOM
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
      if (currentWord.length >= MIN_WORD_LENGTH) { // Check word at end of row
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
      if (currentWord.length >= MIN_WORD_LENGTH) { // Check word at end of column
        foundWordsSet.add(currentWord);
      }
    }
    return Array.from(foundWordsSet);
  }

  // --- Event Listeners for Buttons ---
  if (playButton) playButton.addEventListener('click', startGame);
  if (doneButton) doneButton.addEventListener('click', stopGame);
  if (continueButton) continueButton.addEventListener('click', handleContinueGame);

  // --- Initial Setup ---
  if (doneButton) doneButton.disabled = true; 
  if (continueButton) continueButton.style.display = 'none';
  if (playButton) playButton.disabled = false; 
  if (timerDisplay) timerDisplay.textContent = formatTime(0); // Initialize timer display
  if (scoreDisplay) scoreDisplay.textContent = 'Score: 0'; // Initialize score display
});
