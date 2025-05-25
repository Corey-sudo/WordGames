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

  // VALID_WORDS_ARRAY and VALID_WORDS_SET removed as per subtask.
  // The checkWords function will be updated in a subsequent step to fetch words.

  let timerInterval;
  let timeLeft;
  let gridInitialized = false; // Renamed from gameBoardInitialized
  let gameHasBeenPlayed = false; // Tracks if a game cycle has been completed or is in progress

  // --- Touch Drag State Variables ---
  let draggedTile = null;
  let initialTouchX = 0;
  let initialTouchY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let originalParent = null;

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

      // Add touchstart listener for touch-based drag and drop
      tile.addEventListener('touchstart', handleTouchStart); 

      tileContainer.appendChild(tile);
    }
  }

  // --- Touch Event Handlers ---
  function handleTouchStart(event) {
    // Only allow dragging if the game is active (e.g., timer is running or game is in a playable state)
    // You might need to check a flag like `gameInProgress` or if the `doneButton` is enabled.
    // For now, let's assume if a tile is touched, it can be dragged.
    // Consider if dragging should be allowed when the timer is stopped or before game starts.

    // Check if game is in progress by seeing if doneButton is enabled
    if (doneButton.disabled) { // If doneButton is disabled, game is not actively in play
        // console.log("Touch drag disabled: Game not in progress.");
        return; 
    }

    if (event.target.classList.contains('letter-tile')) {
        draggedTile = event.target;

        // Prevent default touch behavior (e.g., scrolling, pinch zoom)
        // Important: May need to be conditional if other touch interactions are desired on tiles.
        event.preventDefault(); 

        originalParent = draggedTile.parentNode; // Store original parent

        // Get initial touch position
        const touch = event.touches[0];
        initialTouchX = touch.clientX;
        initialTouchY = touch.clientY;

        // Calculate offset from tile's top-left to the touch point
        const rect = draggedTile.getBoundingClientRect();
        offsetX = initialTouchX - rect.left;
        offsetY = initialTouchY - rect.top;

        // Style the tile for dragging
        draggedTile.style.position = 'fixed'; // Use 'fixed' or 'absolute' for free movement
        draggedTile.style.zIndex = '1000'; // Ensure it's above other elements
        // Move the tile's visual position to match the touch point immediately
        // This accounts for the offset, so the tile doesn't "jump"
        draggedTile.style.left = `${initialTouchX - offsetX}px`;
        draggedTile.style.top = `${initialTouchY - offsetY}px`;
        
        draggedTile.classList.add('dragging'); // Add class for visual feedback (e.g. opacity)

        // Add global listeners for touchmove and touchend
        // These are added to 'document' to capture movement/release anywhere on the screen
        document.addEventListener('touchmove', handleTouchMove, { passive: false }); // passive: false for preventDefault
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd); // Also handle touchcancel
    }
  }

  function handleTouchMove(event) {
    if (draggedTile) {
        // Prevent default scrolling behavior while dragging the tile
        event.preventDefault();

        const touch = event.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;

        // Update the tile's position using the pre-calculated offsetX and offsetY
        // This ensures the tile moves relative to the initial touch point on the tile,
        // not just its top-left corner jumping to the finger.
        draggedTile.style.left = `${currentX - offsetX}px`;
        draggedTile.style.top = `${currentY - offsetY}px`;
    }
  }

  function handleTouchEnd(event) {
    if (draggedTile) {
        // Remove the global listeners for touchmove and touchend/touchcancel
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);

        // Make the tile temporarily invisible to get the element underneath
        draggedTile.style.visibility = 'hidden';
        const endX = event.changedTouches[0].clientX;
        const endY = event.changedTouches[0].clientY;
        let dropTarget = document.elementFromPoint(endX, endY);
        draggedTile.style.visibility = 'visible'; // Make it visible again

        // Reset tile's inline styles related to dragging position
        draggedTile.style.position = ''; // Or 'static' if it was that before
        draggedTile.style.left = '';
        draggedTile.style.top = '';
        draggedTile.style.zIndex = '';
        draggedTile.classList.remove('dragging');

        let successfullyDropped = false;

        if (dropTarget) {
            // Check if dropping onto a grid cell
            if (dropTarget.classList.contains('grid-cell') && !dropTarget.hasChildNodes()) {
                dropTarget.appendChild(draggedTile);
                successfullyDropped = true;
            } 
            // Check if dropping onto the tile container (or a specific droppable area within it)
            else if (dropTarget === tileContainer || tileContainer.contains(dropTarget)) {
                // If dropTarget is a tile within tileContainer, append to tileContainer itself
                if (dropTarget.classList.contains('letter-tile') && dropTarget.parentNode === tileContainer) {
                    tileContainer.appendChild(draggedTile);
                } else if (dropTarget === tileContainer) { // Directly on tileContainer
                     tileContainer.appendChild(draggedTile);
                } else if (dropTarget.classList.contains('grid-cell') && dropTarget.hasChildNodes() && originalParent === tileContainer) {
                    // If dropped on an occupied grid cell AND came from tile container, put it back in tile container
                    tileContainer.appendChild(draggedTile);
                }
                // If it's dropped onto an occupied cell, it might bubble up to game-board or body.
                // In such cases, if not a valid drop, it will go to originalParent.
                // For now, simple append to tileContainer if it's generally in that area.
                successfullyDropped = true; 
            }
            // If dropped on a tile within a grid cell, try to place it back in original parent
            // or tile container (this logic might need refinement based on desired UX)
            else if (dropTarget.classList.contains('letter-tile') && dropTarget.parentNode.classList.contains('grid-cell')) {
                // Target is an occupied grid cell's tile. Revert to original parent or tile container.
                // This is handled by the fallback logic below if successfullyDropped remains false.
            }
        }

        // If not successfully dropped on a valid target, return to original parent
        if (!successfullyDropped && originalParent) {
            originalParent.appendChild(draggedTile);
        } else if (!successfullyDropped) {
            // Fallback if originalParent is somehow null (e.g., if it was dynamically created and removed)
            // For robustness, append to tileContainer if no other place.
            tileContainer.appendChild(draggedTile);
        }
        
        // Clear the drag state variables
        draggedTile = null;
        originalParent = null;
        // offsetX, offsetY, initialTouchX, initialTouchY don't need to be cleared here
        // as they are reset in handleTouchStart.
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
  async function stopGame() {
    clearInterval(timerInterval); // Stop the timer
    playButton.disabled = false; // Allow player to start a new game
    doneButton.disabled = true; // Disable "Done" as the game is over

    // Add class to visually indicate game is over (e.g., disable further tile drops)
    // These should ideally be applied after successful validation or if user stops early,
    // but for now, let's keep them here. The main point is that game interaction stops.
    gameBoard.classList.add('game-over');
    tileContainer.classList.add('game-over');
    
    gameHasBeenPlayed = true; // Mark that a game cycle was completed.

    const potentialWords = extractWordsFromBoard();
    console.log("Potential words found on board:", potentialWords);

    if (feedbackArea) {
        feedbackArea.innerHTML = ''; // Clear previous messages
        feedbackArea.className = 'feedback-neutral'; // Default/loading style
    }

    if (potentialWords.length === 0) {
        if (feedbackArea) {
            feedbackArea.textContent = "No words found on the board. Try placing some tiles!";
        } else {
            console.log("No words found on the board.");
        }
        // No API call needed if no words are formed.
        return; // Exit early
    }

    if (feedbackArea) {
        feedbackArea.textContent = "Validating words, please wait..."; // Loading message
    }

    try {
        const checkedWordsResult = await checkWords(potentialWords); // API call happens here

        if (feedbackArea) {
            feedbackArea.innerHTML = ''; // Clear loading message
            feedbackArea.className = ''; // Reset classes for result styling

            if (checkedWordsResult.invalid.length > 0) {
                let message = `Invalid words: ${checkedWordsResult.invalid.join(', ')}. `;
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
                // This case implies potentialWords were found, but none were deemed valid by the API
                // (e.g., all were gibberish, or checkWords returned empty arrays due to an internal error).
                feedbackArea.textContent = "No valid words were recognized by the dictionary. Ensure words are at least 2 letters long.";
                feedbackArea.classList.add('feedback-error'); 
            }
        } else {
            // Fallback to console if feedbackArea is not found
            console.log("Valid words:", checkedWordsResult.valid);
            console.log("Invalid words:", checkedWordsResult.invalid);
        }

    } catch (error) {
        console.error("Error during word validation in stopGame:", error);
        if (feedbackArea) {
            feedbackArea.innerHTML = ''; // Clear loading message
            feedbackArea.textContent = "Could not validate words. Please check your internet connection or try again.";
            feedbackArea.classList.add('feedback-error');
        } else {
            console.error("Word validation failed. Check connection or try again.");
        }
    }
    // Scoring will be implemented later based on valid words.
  }

  // --- `isValidWordAPI(word)` function ---
  async function isValidWordAPI(word) {
    // Ensure word is a non-empty string and potentially URL-encode it if necessary,
    // though for simple English words, direct embedding should be fine.
    if (!word || typeof word !== 'string' || word.trim() === '') {
        return false; // Or handle as an error
    }
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`; // API seems to prefer lowercase

    try {
        const response = await fetch(apiUrl);
        if (response.ok) { // Status 200-299
            // Optional: You could further check the content of response.json() if needed,
            // but for this API, a 200 response usually means the word is found.
            // const data = await response.json(); // Example: if you need to inspect data
            // console.log(`API success for ${word}:`, data);
            return true; // Word is considered valid
        } else if (response.status === 404) {
            // const errorData = await response.json(); // Contains { title: "No Definitions Found", ... }
            // console.log(`API 404 for ${word}:`, errorData);
            return false; // Word not found in dictionary
        } else {
            // Handle other non-ok statuses (e.g., 500, 403)
            console.error(`API error for ${word}: ${response.status} - ${response.statusText}`);
            // const errorText = await response.text();
            // console.error('Error details:', errorText);
            return false; // Treat other errors as word invalid for simplicity, or could throw
        }
    } catch (error) {
        // Handle network errors (e.g., no internet, DNS issues)
        console.error(`Network error or exception for ${word}:`, error);
        return false; // Treat network errors as word invalid for simplicity
    }
  }

  // --- `checkWords(wordsArray)` function ---
  async function checkWords(wordsArray) {
    if (!wordsArray || wordsArray.length === 0) {
        return { valid: [], invalid: [] };
    }

    const validWords = [];
    const invalidWords = [];

    // Create an array of promises by calling isValidWordAPI for each word
    const validationPromises = wordsArray.map(word => isValidWordAPI(word));

    try {
        // Wait for all API calls to complete
        const results = await Promise.all(validationPromises);

        // Iterate through the original words and their corresponding results
        results.forEach((isValid, index) => {
            const originalWord = wordsArray[index];
            if (isValid) {
                validWords.push(originalWord);
            } else {
                invalidWords.push(originalWord);
            }
        });

        return { valid: validWords, invalid: invalidWords };

    } catch (error) {
        // This catch block would handle errors if Promise.all itself fails
        // (e.g., due to an unhandled rejection from one of the promises,
        // though isValidWordAPI is designed to return true/false rather than throw).
        // Or if there's an error in the setup of Promise.all.
        console.error("Error during Promise.all in checkWords:", error);
        // As a fallback, consider all words invalid or re-throw to be handled by stopGame
        // For now, let's return all as invalid if Promise.all fails catastrophically.
        return { valid: [], invalid: wordsArray.slice() }; // Or throw error;
    }
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
