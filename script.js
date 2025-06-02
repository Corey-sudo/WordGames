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
  const exchangeButton = document.getElementById('exchange-button');
  const confirmExchangeButton = document.getElementById('confirm-exchange-button');
  const cancelExchangeButton = document.getElementById('cancel-exchange-button');
  const dailyPuzzleButton = document.getElementById('daily-puzzle-button');
  const dailyPlayedStatus = document.getElementById('daily-played-status');
  const dailyResetCountdown = document.getElementById('daily-reset-countdown');
  const drawTileButton = document.getElementById('draw-tile-button');

  // --- High Score Constants ---
  const MAX_REGULAR_HIGH_SCORES = 5;
  const REGULAR_HIGH_SCORES_KEY = 'regularHighScores';

  // --- Global Game Constants ---
  const GRID_SIZE = 12;
  const NUM_TILES = 16; // This might be superseded or used alongside INITIAL_HAND_SIZE
  const INITIAL_HAND_SIZE = 16;
  const LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1,
    'F': 4, 'G': 2, 'H': 4, 'I': 1, 'J': 8,
    'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1,
    'P': 3, 'Q': 10, 'R': 1, 'S': 1, 'U': 1,
    'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
  };
  const INITIAL_GAME_TIME = 180; // 3 minutes in seconds
  const FULL_LETTER_POOL_FREQUENCIES = {
      'E': 12, 'A': 8, 'I': 8, 'O': 8, 'U': 4, // Vowels: 40
      'T': 8, 'N': 8, 'R': 8, 'S': 8,         // High-freq Consonants
      'D': 4, 'L': 4, 'H': 4, 'C': 4,         // Mid-freq Consonants
      'G': 3, 'B': 3, 'F': 3, 'M': 3, 'P': 3, 'W': 3, 'Y': 3, // Low-freq Consonants
      'V': 2, 'K': 2,                         // Very low-freq Consonants
      'J': 1, 'X': 1, 'Q': 1, 'Z': 1          // Rare Consonants
  };


  // --- Global Game State Variables ---
  let timerInterval;        
  let timeElapsed;             
  let gridInitialized = false; 
  let gameHasBeenPlayed = false; 
  let letterPool = []; 
  let isDailyGame = false;

  // --- Game State Variables for Pause/Continue & Untimed Mode ---
  let gamePaused = false;       
  let savedTimeElapsed = -1;     
  let gameTimedOut = false;       
  let untimedPracticeMode = false; 

  // --- Exchange Mode State ---
  let inExchangeMode = false;

  // --- Touch Drag State Variables ---
  let draggedTile = null;     
  let initialTouchX = 0;      
  let initialTouchY = 0;      
  let offsetX = 0;            
  let offsetY = 0;            
  let originalParent = null;  

  // --- Daily Puzzle Seed Function ---
  let lcg_seed; // Stores the current state for LCG

  function hashStringSeed(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  function initializeSeededRNG(seedStr) {
    lcg_seed = hashStringSeed(seedStr);
    // If hash is 0, which can happen for certain strings or an empty string,
    // set it to a default non-zero value to ensure the LCG sequence isn't trivial.
    if (lcg_seed === 0) {
      lcg_seed = 1013904223; // Using 'c' as a default non-zero seed
    }
  }

  function getNextRandom() {
    if (typeof lcg_seed === 'undefined') {
      console.warn("Seeded RNG not initialized. Using Math.random() as fallback.");
      return Math.random();
    }
    // LCG parameters
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32); // Modulus (2^32)

    lcg_seed = (a * lcg_seed + c) % m;
    return lcg_seed / m; // Returns a value between 0 (inclusive) and 1 (exclusive)
  }

  function getDailySeed() {
    const now = new Date();
    const estOptions = { timeZone: 'America/New_York' };

    let year = now.toLocaleString('en-US', { ...estOptions, year: 'numeric' });
    let month = now.toLocaleString('en-US', { ...estOptions, month: '2-digit' });
    let day = now.toLocaleString('en-US', { ...estOptions, day: '2-digit' });
    const hour = parseInt(now.toLocaleString('en-US', { ...estOptions, hour: '2-digit', hour12: false }), 10);

    // Puzzle day resets at 3:00 AM EST/EDT
    if (hour < 3) {
      // If before 3 AM, use yesterday's date for the puzzle
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      year = yesterday.toLocaleString('en-US', { ...estOptions, year: 'numeric' });
      month = yesterday.toLocaleString('en-US', { ...estOptions, month: '2-digit' });
      day = yesterday.toLocaleString('en-US', { ...estOptions, day: '2-digit' });
    }
    return `${year}${month}${day}`;
  }

  // --- Game Setup and Reset Functions ---
  function resetLetterPool() {
    // This function is primarily for non-seeded games.
    // For daily games, generateDailyTiles will create the specific letterPool.
    if (isDailyGame) {
      // For daily games, letterPool is set by generateDailyTiles, so this might be redundant
      // or could be skipped. However, having a defined pool is good.
      // console.log("resetLetterPool called during daily game setup, letterPool will be overwritten by generateDailyTiles.");
      // No random shuffle here for daily games if this were the source.
      // But generateDailyTiles handles the deterministic pool creation.
      return; 
    }
    letterPool = [];
    for (const letter in FULL_LETTER_POOL_FREQUENCIES) {
      for (let i = 0; i < FULL_LETTER_POOL_FREQUENCIES[letter]; i++) {
        letterPool.push(letter);
      }
    }
    for (let i = letterPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letterPool[i], letterPool[j]] = [letterPool[j], letterPool[i]];
    }
  }

  function resetGame() {
    isDailyGame = false; // Default to not a daily game unless startDailyGame sets it.
    const gridCells = document.querySelectorAll('#game-board .grid-cell');
    gridCells.forEach(cell => { cell.innerHTML = ''; });
    if(tileContainer) tileContainer.innerHTML = '';
    if (timerInterval) clearInterval(timerInterval);
    timeElapsed = 0; 
    if(timerDisplay) {
        timerDisplay.textContent = formatTime(timeElapsed); // Changed from INITIAL_GAME_TIME
        timerDisplay.style.display = 'block'; 
    }

    if (playButton) {
      playButton.disabled = false;
      playButton.textContent = 'Play';
    }
    if (doneButton) doneButton.disabled = true;
    if (continueButton) continueButton.style.display = 'none';
    if (exchangeButton) {
        exchangeButton.style.display = 'inline-block'; 
        exchangeButton.disabled = true; // Disabled until game starts
    }
    if (confirmExchangeButton) confirmExchangeButton.style.display = 'none';
    if (cancelExchangeButton) cancelExchangeButton.style.display = 'none';

    gamePaused = false;
    savedTimeElapsed = -1;
    gameTimedOut = false;
    untimedPracticeMode = false;
    inExchangeMode = false; 
    if (scoreDisplay) scoreDisplay.textContent = 'Score: 0'; 
    
    if(gameBoard) gameBoard.classList.remove('game-over');
    if(tileContainer) tileContainer.classList.remove('game-over');
    resetLetterPool(); 
  }

  // --- Daily Puzzle Game Functions ---
  function updateDailyPuzzleCountdown() {
    const now = new Date();
    const estOptions = { timeZone: 'America/New_York' };

    let nextReset = new Date(now.toLocaleString('en-US', estOptions));
    nextReset.setHours(3, 0, 0, 0); // Set to 3:00:00.000 AM

    if (now.getTime() >= nextReset.getTime()) {
      // If current time is past 3:00 AM today, next reset is 3:00 AM tomorrow
      nextReset.setDate(nextReset.getDate() + 1);
    }

    const diff = nextReset.getTime() - now.getTime();

    if (diff <= 0) {
      // Time for a new puzzle
      if(dailyResetCountdown) dailyResetCountdown.textContent = "New puzzle available!";
      initializeGameStatus(); // Re-check status for the new day
      // The setInterval will continue to call this, and it will then schedule for the *next* day.
      return; // Avoid negative countdown display briefly
    }

    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if(dailyResetCountdown) {
      dailyResetCountdown.textContent = `Next puzzle in: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }


  function startDailyGame() {
    const currentDailySeed = getDailySeed();
    // initializeGameStatus will typically handle disabling button if already played.
    // This check here is a redundant safeguard.
    if (localStorage.getItem('dailyPuzzlePlayed_' + currentDailySeed)) {
      if (feedbackArea) feedbackArea.textContent = "You have already played today's daily puzzle. Please come back tomorrow!";
      // dailyPuzzleButton should already be disabled by initializeGameStatus
      return;
    }

    if ((gameHasBeenPlayed && !gamePaused && !untimedPracticeMode) || gamePaused) {
      if (!confirm("Start a new daily puzzle? Any current regular game progress will be lost.")) {
        return;
      }
    }
    
    isDailyGame = true;
    resetGame(); // Resets state, and importantly, sets isDailyGame = false, so we set it true again.
    isDailyGame = true; // Explicitly set again after resetGame

    if (!gridInitialized) createGameBoard();
    generateDailyTiles(); // This sets up the deterministic letterPool

    startTimer();

    if (playButton) playButton.disabled = true;
    if (dailyPuzzleButton) dailyPuzzleButton.disabled = true; // Disable after starting
    if (doneButton) doneButton.disabled = false;
    if (exchangeButton) {
        exchangeButton.disabled = false;
        if (letterPool.length < 3) { // Check for exchange button
            exchangeButton.disabled = true;
        }
    }

    if (feedbackArea) feedbackArea.innerHTML = '';
    if (dailyPlayedStatus) dailyPlayedStatus.textContent = "Daily Puzzle Played: No (In Progress)";
    
    gameHasBeenPlayed = true;
  }

  function createGameBoard() {
    if (gridInitialized || !gameBoard) return;
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell'); 
      cell.addEventListener('dragover', (event) => { event.preventDefault(); cell.classList.add('drag-over'); });
      cell.addEventListener('dragleave', (event) => { cell.classList.remove('drag-over'); });
      cell.addEventListener('drop', (event) => {
        event.preventDefault();
        cell.classList.remove('drag-over'); 
        const draggedTileId = event.dataTransfer.getData('text/plain');
        const draggedTileElement = document.getElementById(draggedTileId);
        if (draggedTileElement && event.target.classList.contains('grid-cell') && event.target.children.length === 0) {
          event.target.appendChild(draggedTileElement);
        } 
      });
      gameBoard.appendChild(cell);
    }
    gridInitialized = true;
  }

  function generateDailyTiles() {
    const dailySeed = getDailySeed();
    initializeSeededRNG(dailySeed);

    let tempPool = [];
    for (const letter in FULL_LETTER_POOL_FREQUENCIES) {
      for (let i = 0; i < FULL_LETTER_POOL_FREQUENCIES[letter]; i++) {
        tempPool.push(letter);
      }
    }

    // Seeded Fisher-Yates shuffle
    let currentIndex = tempPool.length, randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(getNextRandom() * currentIndex);
      currentIndex--;
      [tempPool[currentIndex], tempPool[randomIndex]] = [
        tempPool[randomIndex], tempPool[currentIndex]];
    }
    
    letterPool = tempPool; // Assign to global letterPool

    const handLetters = [];
    for (let i = 0; i < NUM_TILES; i++) {
      if (letterPool.length === 0) {
        console.warn("Letter pool exhausted while generating daily hand.");
        break;
      }
      const pluckIndex = Math.floor(getNextRandom() * letterPool.length);
      const letter = letterPool.splice(pluckIndex, 1)[0];
      handLetters.push(letter);
    }

    if(!tileContainer) return;
    tileContainer.innerHTML = ''; 

    handLetters.forEach((letter, i) => {
      if (!letter) return; 
      const tile = document.createElement('div');
      tile.classList.add('letter-tile');
      tile.draggable = true; 
      tile.id = `tile-daily-${Date.now()}-${i}`; // Unique ID for daily tiles
      tile.textContent = letter;
      tile.addEventListener('dragstart', (event) => { // Re-using existing handler logic
        event.dataTransfer.setData('text/plain', event.target.id);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { event.target.classList.add('dragging'); }, 0);
      });
      tile.addEventListener('dragend', (event) => { event.target.classList.remove('dragging'); });
      tile.addEventListener('touchstart', handleTouchStart, { passive: false }); 
      tileContainer.appendChild(tile);
    });
  }

  function generateRandomTiles() {
    if(!tileContainer) return;
    tileContainer.innerHTML = ''; // Clear any existing tiles

    const selectedLetters = [];
    // For regular games, deal an initial hand of INITIAL_HAND_SIZE tiles.
    // letterPool should have been populated and shuffled by resetLetterPool() called in resetGame().
    for(let i=0; i < INITIAL_HAND_SIZE; i++){
        if(letterPool.length > 0) {
            selectedLetters.push(letterPool.pop()); 
        } else {
            // Not enough letters in the pool, should ideally not happen with a full pool
            console.warn("Not enough letters in pool to deal initial hand.");
            break; 
        }
    }

    selectedLetters.forEach((letter, i) => {
      if (!letter) return; 
      const tile = document.createElement('div');
      tile.classList.add('letter-tile');
      tile.draggable = true; 
      tile.id = `tile-${Date.now()}-${i}`; 
      tile.textContent = letter;
      tile.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', event.target.id);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { event.target.classList.add('dragging'); }, 0);
      });
      tile.addEventListener('dragend', (event) => { event.target.classList.remove('dragging'); });
      tile.addEventListener('touchstart', handleTouchStart, { passive: false }); 
      tileContainer.appendChild(tile);
    });
  }

  function handleDragStart(event) { 
    event.dataTransfer.setData('text/plain', event.target.id);
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { event.target.classList.add('dragging'); }, 0);
  }

  function handleTouchStart(event) {
    if (inExchangeMode) { 
        handleTileSelectionForExchange(event);
        return; 
    }
    const gameIsOver = gameBoard && gameBoard.classList.contains('game-over');
    if ((doneButton && doneButton.disabled && !untimedPracticeMode) || gameIsOver) { 
        return; 
    }
    
    if (event.target.classList.contains('letter-tile')) {
        draggedTile = event.target;
        event.preventDefault(); 
        originalParent = draggedTile.parentNode; 
        const touch = event.touches[0];
        initialTouchX = touch.clientX;
        initialTouchY = touch.clientY;
        const rect = draggedTile.getBoundingClientRect();
        offsetX = initialTouchX - rect.left;
        offsetY = initialTouchY - rect.top;
        draggedTile.style.position = 'fixed'; 
        draggedTile.style.zIndex = '1000'; 
        draggedTile.style.left = `${initialTouchX - offsetX}px`;
        draggedTile.style.top = `${initialTouchY - offsetY}px`;
        draggedTile.classList.add('dragging'); 
        document.addEventListener('touchmove', handleTouchMove, { passive: false }); 
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd); 
    }
  }

  function handleTouchMove(event) {
    if (draggedTile) {
        event.preventDefault();
        const touch = event.touches[0];
        draggedTile.style.left = `${touch.clientX - offsetX}px`;
        draggedTile.style.top = `${touch.clientY - offsetY}px`;
    }
  }

  function handleTouchEnd(event) {
    if (draggedTile) {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
        draggedTile.style.visibility = 'hidden';
        const endX = event.changedTouches[0].clientX;
        const endY = event.changedTouches[0].clientY;
        let dropTarget = document.elementFromPoint(endX, endY);
        draggedTile.style.visibility = 'visible'; 
        draggedTile.style.position = ''; 
        draggedTile.style.left = '';
        draggedTile.style.top = '';
        draggedTile.style.zIndex = '';
        draggedTile.classList.remove('dragging');
        let successfullyDropped = false;
        if (dropTarget) {
            if (dropTarget.classList.contains('grid-cell') && !dropTarget.hasChildNodes()) {
                dropTarget.appendChild(draggedTile);
                successfullyDropped = true;
            } 
            else if (dropTarget === tileContainer || (tileContainer && tileContainer.contains(dropTarget))) {
                if (dropTarget.classList.contains('letter-tile') && dropTarget.parentNode === tileContainer) {
                    tileContainer.appendChild(draggedTile); 
                } else if (dropTarget === tileContainer) { 
                     tileContainer.appendChild(draggedTile); 
                } else if (dropTarget.classList.contains('grid-cell') && dropTarget.hasChildNodes() && originalParent === tileContainer) {
                    tileContainer.appendChild(draggedTile);
                }
                successfullyDropped = true; 
            }
        }
        if (!successfullyDropped && originalParent) {
            originalParent.appendChild(draggedTile);
        } else if (!successfullyDropped && tileContainer) { 
            tileContainer.appendChild(draggedTile);
        }
        draggedTile = null;
        originalParent = null;
    }
  }

  if(tileContainer) {
    tileContainer.addEventListener('dragover', (event) => { event.preventDefault(); tileContainer.classList.add('drag-over'); });
    tileContainer.addEventListener('dragleave', (event) => { tileContainer.classList.remove('drag-over'); });
    tileContainer.addEventListener('drop', (event) => {
      event.preventDefault();
      tileContainer.classList.remove('drag-over');
      const draggedTileId = event.dataTransfer.getData('text/plain');
      const draggedTileElement = document.getElementById(draggedTileId);
      if (draggedTileElement) tileContainer.appendChild(draggedTileElement); 
    });
  }

  function startTimer() { // Duration parameter removed
    if(untimedPracticeMode && timerDisplay) {
        timerDisplay.textContent = "Untimed Mode";
        return; 
    }
    if(timerInterval) clearInterval(timerInterval); 
    // timeElapsed is already initialized to 0 in resetGame or set from savedTimeElapsed
    if(timerDisplay) timerDisplay.textContent = formatTime(timeElapsed);
    timerInterval = setInterval(() => {
      timeElapsed++; // Changed from timeElapsed--
      if(timerDisplay) timerDisplay.textContent = formatTime(timeElapsed);
      // Removed timeLeft <= 0 check, game stop logic, and alert
    }, 1000);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function startGame() {
    if ((gameHasBeenPlayed && !gamePaused && !untimedPracticeMode) || gamePaused) { 
      if (!confirm("Start a new game? Any current progress will be lost.")) return; 
    }
    
    isDailyGame = false; // Ensure it's a regular game
    if (feedbackArea) feedbackArea.innerHTML = ''; 
    gamePaused = false;
    savedTimeElapsed = -1;
    gameTimedOut = false;       
    untimedPracticeMode = false; 
    resetGame(); // Calls resetLetterPool which shuffles the full pool
    if (!gridInitialized) createGameBoard(); 
    
    generateRandomTiles(); // Deal the initial hand for a regular game.

    startTimer(); 
    if(playButton) playButton.disabled = true;
    if(dailyPuzzleButton) dailyPuzzleButton.disabled = false; // Re-enable if it was disabled by daily game
    if(doneButton) doneButton.disabled = false;
    if(exchangeButton) {
        exchangeButton.disabled = false; 
        if (letterPool.length < 3) { // Check for exchange button
            exchangeButton.disabled = true;
        }
    }
    
    if (drawTileButton) {
        drawTileButton.style.display = 'inline-block';
        drawTileButton.disabled = (letterPool.length === 0);
    }

    if(gameBoard) gameBoard.classList.remove('game-over'); 
    if(tileContainer) tileContainer.classList.remove('game-over'); 
    gameHasBeenPlayed = true; 
  }

  function calculateWordScore(word) {
    let score = 0;
    for (const letter of word.toUpperCase()) score += LETTER_VALUES[letter] || 0; 
    if (word.length >= 7) score += 25; 
    else if (word.length >= 5) score += 10;
    return score;
  }

  async function isValidWordAPI(word) {
    if (!word || typeof word !== 'string' || word.trim() === '') return false; 
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`; 
    try {
        const response = await fetch(apiUrl);
        if (response.ok) return true; 
        if (response.status === 404) return false; 
        console.error(`API error for "${word}": ${response.status} - ${response.statusText}`);
        return false; 
    } catch (error) { 
        console.error(`Network error or exception for "${word}":`, error);
        return false; 
    }
  }

  async function checkWords(wordsArray) {
    if (!wordsArray || wordsArray.length === 0) return { valid: [], invalid: [] };
    const validWordStrings = []; 
    const invalidWords = [];
    const validationPromises = wordsArray.map(word => isValidWordAPI(word));
    try {
        const results = await Promise.all(validationPromises);
        results.forEach((isValid, index) => {
            const originalWord = wordsArray[index];
            if (isValid) validWordStrings.push(originalWord);
            else invalidWords.push(originalWord);
        });
        const scoredValidWords = [];
        for (const validWord of validWordStrings) {
            const wordScore = calculateWordScore(validWord);
            scoredValidWords.push({ word: validWord, score: wordScore });
        }
        return { valid: scoredValidWords, invalid: invalidWords };
    } catch (error) { 
        console.error("Error during Promise.all in checkWords:", error);
        return { valid: [], invalid: wordsArray.slice() }; 
    }
  }
  
  async function stopGame() {
    // Removed: if (timeElapsed <= 0 && !gamePaused && !untimedPracticeMode) gameTimedOut = true;
    clearInterval(timerInterval); 

    if(playButton) playButton.disabled = false; 
    if(doneButton) doneButton.disabled = true; 
    if(exchangeButton) exchangeButton.disabled = true; 
    
    gameHasBeenPlayed = true; 
    const potentialWords = extractWordsFromBoard();
    
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
            if(scoreDisplay) scoreDisplay.textContent = 'Score: 0';
            if(untimedPracticeMode) { 
                untimedPracticeMode = false; 
                gameTimedOut = false; 
                if(exchangeButton) exchangeButton.disabled = false; 
            } else {
                if(exchangeButton) exchangeButton.disabled = true; 
            }
            return; 
        }
    } else if (potentialWords.length === 0) {
        console.log("No words found on the board.");
        if(gameBoard) gameBoard.classList.add('game-over');
        if(tileContainer) tileContainer.classList.add('game-over');
        if(playButton) playButton.textContent = 'New Game';
        if(scoreDisplay) scoreDisplay.textContent = 'Score: 0';
        if(untimedPracticeMode) {
            untimedPracticeMode = false; 
            gameTimedOut = false;
             if(exchangeButton) exchangeButton.disabled = false;
        } else {
            if(exchangeButton) exchangeButton.disabled = true;
        }
        return;
    }

    let checkedWordsResult; 
    let currentWordsScore = 0; 

    try {
        checkedWordsResult = await checkWords(potentialWords); 

        if (untimedPracticeMode) {
            if (feedbackArea) {
                feedbackArea.innerHTML = '';
                feedbackArea.className = '';
                if (checkedWordsResult.invalid.length > 0) {
                    feedbackArea.textContent = `Invalid words (untimed): ${checkedWordsResult.invalid.join(', ')}. Valid: ${checkedWordsResult.valid.map(item => item.word).join(', ')}. Try again or start a new game.`;
                    feedbackArea.classList.add('feedback-error');
                } else if (checkedWordsResult.valid.length > 0) {
                    feedbackArea.textContent = `All words valid (untimed): ${checkedWordsResult.valid.map(item => item.word).join(', ')}. Well done!`;
                    feedbackArea.classList.add('feedback-success');
                } else {
                    feedbackArea.textContent = "No valid words formed (untimed). Try again or start a new game.";
                    feedbackArea.classList.add('feedback-neutral');
                }
            }
            if(playButton) playButton.textContent = 'New Game';
            if(exchangeButton) exchangeButton.disabled = false; 
            if(gameBoard) gameBoard.classList.add('game-over'); 
            if(tileContainer) tileContainer.classList.add('game-over');
             if (scoreDisplay) scoreDisplay.textContent = 'Score: 0'; // No score in untimed
            return; 
        }

        if (checkedWordsResult.valid && checkedWordsResult.valid.length > 0) {
            checkedWordsResult.valid.forEach(item => currentWordsScore += item.score);
        }
        // console.log("Score from words:", currentWordsScore); // Keep for debug if needed

        const tilesInContainerCount = tileContainer ? tileContainer.querySelectorAll('.letter-tile').length : 0;
        let timeBonus = 0;
        let gameSuccessfullyCompleted = false;
        const wordScoreBeforeBonus = currentWordsScore;

        if (checkedWordsResult.invalid.length === 0 && tilesInContainerCount === 0 && checkedWordsResult.valid.length > 0) {
            gameSuccessfullyCompleted = true;
            // Calculate timeBonus based on timeElapsed
            if (INITIAL_GAME_TIME > 0) { // Avoid division by zero if INITIAL_GAME_TIME is not set (though it is)
                timeBonus = Math.floor(Math.max(0, 100 - (timeElapsed / INITIAL_GAME_TIME) * 100));
            } else {
                timeBonus = 0; // Default to 0 if INITIAL_GAME_TIME is 0 or less
            }
            currentWordsScore += timeBonus; 
            console.log("Time bonus awarded:", timeBonus);
        }

        const canContinue = tilesInContainerCount > 0 || (checkedWordsResult.invalid && checkedWordsResult.invalid.length > 0);

        if (feedbackArea) { feedbackArea.innerHTML = ''; feedbackArea.className = ''; }

        // gameTimedOut condition is removed here as the timer doesn't cause a timeout.
        // Other conditions for pausing or ending the game remain.
        if (canContinue) { 
            gamePaused = true;
            savedTimeElapsed = timeElapsed; // timeElapsed will be > 0 if game was running
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
                }
            }
            if (continueButton) continueButton.style.display = 'inline-block';
            if (playButton) playButton.textContent = 'New Game';
            if (exchangeButton) exchangeButton.disabled = false; 
        } else { 
            gamePaused = false;
            savedTimeElapsed = -1; // Corrected from savedTimeLeft
            if (feedbackArea) { 
                if (gameSuccessfullyCompleted) {
                    let breakdownHTML = "<h3>Score Breakdown</h3><ul>";
                    checkedWordsResult.valid.forEach(item => {
                        // Ensure wordScoreBeforeBonus is used correctly if it represents score without any bonus
                        // The calculation for item.score might already include some bonuses not related to time
                        // For simplicity, using item.score directly as the score for that word as returned by calculateWordScore
                        breakdownHTML += `<li><strong>${item.word.toUpperCase()}:</strong> ${calculateWordScore(item.word)} points</li>`; 
                    });
                    breakdownHTML += "</ul>";
                    breakdownHTML += `<p><strong>Subtotal for Words:</strong> ${wordScoreBeforeBonus} points</p>`; // wordScoreBeforeBonus should be sum of calculateWordScore(word.word)
                    if (timeBonus > 0) {
                        breakdownHTML += `<p><strong>Time Bonus:</strong> +${timeBonus} points</p>`;
                    }
                    breakdownHTML += "<hr>";
                    breakdownHTML += `<p><strong>Total Score: ${currentWordsScore} points</strong></p>`; // currentWordsScore includes timeBonus
                    feedbackArea.innerHTML = breakdownHTML;
                    feedbackArea.className = 'feedback-success';
                } else if (checkedWordsResult.valid.length > 0) { 
                    feedbackArea.textContent = `Game Over! Valid words: ${checkedWordsResult.valid.map(item => item.word).join(', ')}. Total Score: ${currentWordsScore}.`;
                    feedbackArea.classList.add(checkedWordsResult.invalid.length > 0 ? 'feedback-error' : 'feedback-success'); 
                } else { 
                    feedbackArea.textContent = "Game Over. No valid words formed. Score: 0.";
                    feedbackArea.classList.add('feedback-neutral');
                }
            }
            if (playButton) playButton.textContent = 'New Game';
            if (continueButton) continueButton.style.display = 'none';
            if (exchangeButton) exchangeButton.disabled = true; 
            if(gameBoard) gameBoard.classList.add('game-over'); 
            if(tileContainer) tileContainer.classList.add('game-over');
        }
    } catch (error) { 
        console.error("Error during word validation/scoring in stopGame:", error);
        if (feedbackArea) {
            feedbackArea.innerHTML = ''; 
            feedbackArea.textContent = "Could not validate words. Please check your internet connection or try again.";
            feedbackArea.classList.add('feedback-error');
        }
        if (playButton) playButton.textContent = 'New Game';
        if (continueButton) continueButton.style.display = 'none'; 
        if (exchangeButton) exchangeButton.disabled = true; 
        if(gameBoard) gameBoard.classList.add('game-over');
        if(tileContainer) tileContainer.classList.add('game-over');
    }
    if (scoreDisplay) scoreDisplay.textContent = `Score: ${currentWordsScore}`;

    if (isDailyGame) {
      const currentDailySeed = getDailySeed();
      console.log('Attempting to save daily puzzle score. Details:', {
        isDailyGame,
        currentDailySeed,
        currentWordsScore
      });
      localStorage.setItem('dailyPuzzlePlayed_' + currentDailySeed, 'true');
      console.log('Successfully saved dailyPuzzlePlayed_ status for seed:', currentDailySeed);
      localStorage.setItem('dailyPuzzleScore_' + currentDailySeed, currentWordsScore);

      const dailyHighScoreKey = `todaysDailyHighScore_${currentDailySeed}`;
      const storedDailyHighScore = localStorage.getItem(dailyHighScoreKey);
      let currentDailyHighScore = parseInt(storedDailyHighScore, 10);
      if (isNaN(currentDailyHighScore)) {
          currentDailyHighScore = 0;
      }

      if (currentWordsScore > currentDailyHighScore) {
          localStorage.setItem(dailyHighScoreKey, currentWordsScore.toString());
      }

      console.log('Successfully saved dailyPuzzleScore_ for seed:', currentDailySeed, 'Score:', currentWordsScore);

      if (dailyPlayedStatus) dailyPlayedStatus.textContent = "Daily Puzzle Played: Yes";
      if (dailyPuzzleButton) dailyPuzzleButton.disabled = true;
      // updateDailyCountdown(); // Call when available
      isDailyGame = false; // Reset for the next game session

    } else { // Regular game
        if (gameSuccessfullyCompleted && !untimedPracticeMode) {
            const generalHighScoreKey = "generalGameHighScore";
            const storedGeneralHighScore = localStorage.getItem(generalHighScoreKey);
            let currentGeneralHighScore = parseInt(storedGeneralHighScore, 10);
            if (isNaN(currentGeneralHighScore)) {
                currentGeneralHighScore = 0;
            }
            if (currentWordsScore > currentGeneralHighScore) {
                localStorage.setItem(generalHighScoreKey, currentWordsScore.toString());
                if (typeof loadAndDisplayGeneralHighScore === 'function') {
                    loadAndDisplayGeneralHighScore();
                }
            }
        }
        // Regular game ended or paused
        if (drawTileButton) drawTileButton.disabled = true;

    } else {
      // Regular game ended or paused
      if (drawTileButton) drawTileButton.disabled = true;

      // --- Regular High Score Logic ---
      // Check if the game has truly ended (not just paused) and it's not untimed mode
      if (!gamePaused && !untimedPracticeMode && currentWordsScore > 0) {
        let highScores = JSON.parse(localStorage.getItem(REGULAR_HIGH_SCORES_KEY)) || [];
        const newScoreEntry = { score: currentWordsScore, date: new Date().toISOString().split('T')[0] };

        highScores.push(newScoreEntry);
        highScores.sort((a, b) => b.score - a.score); // Sort descending
        highScores = highScores.slice(0, MAX_REGULAR_HIGH_SCORES); // Keep only top N

        localStorage.setItem(REGULAR_HIGH_SCORES_KEY, JSON.stringify(highScores));
        displayRegularHighScores(); // Update the displayed scores
      }
    }
  }

  function handleContinueGame() {
      if (gameTimedOut) { 
          untimedPracticeMode = true;
          gamePaused = false; 
          savedTimeElapsed = -1; 
          gameTimedOut = false; 

          if (timerDisplay) timerDisplay.textContent = "Untimed Mode";
          if (feedbackArea) {
              feedbackArea.textContent = "Continuing in untimed practice mode. No score will be recorded.";
              feedbackArea.className = 'feedback-neutral';
          }
          if (doneButton) doneButton.disabled = false; 
          if (continueButton) continueButton.style.display = 'none';
          if (playButton) {
            playButton.textContent = 'New Game'; 
            playButton.disabled = false; 
          }
          if (exchangeButton) exchangeButton.disabled = true; 
          if (drawTileButton) {
            drawTileButton.style.display = 'inline-block'; // Should be visible but disabled
            drawTileButton.disabled = true;
          }
          if(gameBoard) gameBoard.classList.remove('game-over'); 
          if(tileContainer) tileContainer.classList.remove('game-over');

      } else if (gamePaused && savedTimeElapsed > -1 && !isDailyGame) { // Added !isDailyGame for clarity
          gamePaused = false;
          timeElapsed = savedTimeElapsed; 
          startTimer(); 
          if (doneButton) doneButton.disabled = false;
          if (playButton) playButton.disabled = true; 
          if (continueButton) continueButton.style.display = 'none';
          if (exchangeButton) {
            exchangeButton.disabled = false; 
            if (letterPool.length < 3) { // Check for exchange button
                exchangeButton.disabled = true;
            }
          }
          if (drawTileButton) {
            drawTileButton.style.display = 'inline-block';
            drawTileButton.disabled = (letterPool.length === 0);
          }
          if (feedbackArea) feedbackArea.innerHTML = ''; 
          if(gameBoard) gameBoard.classList.remove('game-over'); 
          if(tileContainer) tileContainer.classList.remove('game-over');
      } else if (isDailyGame && gamePaused) { // Handle continuing a daily game (though less common path for draw tile)
          gamePaused = false;
          timeElapsed = savedTimeElapsed;
          startTimer();
          if (doneButton) doneButton.disabled = false;
          if (playButton) playButton.disabled = true;
          if (dailyPuzzleButton) dailyPuzzleButton.disabled = true;
          if (continueButton) continueButton.style.display = 'none';
          if (exchangeButton) {
            exchangeButton.disabled = false;
            if (letterPool.length < 3) { // Check for exchange button (Daily game continue)
                exchangeButton.disabled = true;
            }
          }
           if (drawTileButton) drawTileButton.style.display = 'none'; // Ensure hidden in daily game
          if (feedbackArea) feedbackArea.innerHTML = '';
          if(gameBoard) gameBoard.classList.remove('game-over');
          if(tileContainer) tileContainer.classList.remove('game-over');
      }
  }
  
  // --- Letter Drawing Function ---
  function drawTileFromPool() {
    if (isDailyGame) return; // Safeguard: Not for daily games

    if (letterPool.length === 0) {
      if (drawTileButton) drawTileButton.disabled = true;
      if (feedbackArea) feedbackArea.textContent = "Letter pool is empty.";
      return;
    }

    const letter = letterPool.pop();
    if (!letter) { // Should not happen if length > 0, but good check
        if (drawTileButton) drawTileButton.disabled = (letterPool.length === 0);
        return;
    }

    const tile = document.createElement('div');
    tile.classList.add('letter-tile');
    tile.draggable = true;
    tile.id = `tile-${Date.now()}-drawn-${Math.random().toString(36).substr(2, 5)}`; // More unique ID
    tile.textContent = letter;
    tile.addEventListener('dragstart', handleDragStart); // Re-use existing dragstart
    tile.addEventListener('touchstart', handleTouchStart, { passive: false });

    if (tileContainer) tileContainer.appendChild(tile);

    if (letterPool.length === 0) {
      if (drawTileButton) drawTileButton.disabled = true;
    }
    // Check for exchange button after drawing a tile
    if (exchangeButton && letterPool.length < 3) {
        exchangeButton.disabled = true;
    }
  }

  function extractWordsFromBoard() {
    const MIN_WORD_LENGTH = 2;
    const boardRepresentation = [];
    const gridCells = gameBoard ? gameBoard.querySelectorAll('.grid-cell') : [];
    if (!gridCells.length) return []; 
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
    for (let r = 0; r < GRID_SIZE; r++) {
      let currentWord = "";
      for (let c = 0; c < GRID_SIZE; c++) {
        const letter = boardRepresentation[r][c];
        if (letter) currentWord += letter;
        else { if (currentWord.length >= MIN_WORD_LENGTH) foundWordsSet.add(currentWord); currentWord = ""; }
      }
      if (currentWord.length >= MIN_WORD_LENGTH) foundWordsSet.add(currentWord);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      let currentWord = "";
      for (let r = 0; r < GRID_SIZE; r++) {
        const letter = boardRepresentation[r][c];
        if (letter) currentWord += letter;
        else { if (currentWord.length >= MIN_WORD_LENGTH) foundWordsSet.add(currentWord); currentWord = ""; }
      }
      if (currentWord.length >= MIN_WORD_LENGTH) foundWordsSet.add(currentWord);
    }
    return Array.from(foundWordsSet);
  }

  function enterExchangeMode() {
    if (untimedPracticeMode) {
        if(feedbackArea) {
            feedbackArea.textContent = "Letter exchange is not available in untimed practice mode.";
            feedbackArea.className = 'feedback-neutral';
        }
        return;
    }
    if (doneButton && !doneButton.disabled && !inExchangeMode) { 
        const potentialLettersNeeded = 3; 
        if (letterPool.length < potentialLettersNeeded) { 
            if(feedbackArea) {
                feedbackArea.textContent = "Not enough letters remaining in the pool to exchange.";
                feedbackArea.className = 'feedback-neutral';
            }
            return;
        }
        inExchangeMode = true;
        if(exchangeButton) exchangeButton.style.display = 'none';
        if(confirmExchangeButton) confirmExchangeButton.style.display = 'inline-block';
        if(cancelExchangeButton) cancelExchangeButton.style.display = 'inline-block';
        if(doneButton) doneButton.disabled = true; 
        if(playButton) playButton.disabled = true; 
        if(feedbackArea) {
            feedbackArea.textContent = "Select tiles to exchange (from your rack), then confirm or cancel.";
            feedbackArea.className = 'feedback-neutral';
        }
        const tilesInHand = tileContainer ? tileContainer.querySelectorAll('.letter-tile') : [];
        tilesInHand.forEach(tile => {
            tile.addEventListener('click', handleTileSelectionForExchange);
            tile.style.cursor = 'pointer'; 
        });
    } else if (!inExchangeMode) { 
        if(feedbackArea) {
            feedbackArea.textContent = "Start or continue a game to exchange letters.";
            feedbackArea.className = 'feedback-neutral';
        }
    }
  }

  function handleTileSelectionForExchange(event) {
    if (!inExchangeMode) return;
    const tile = event.currentTarget; 
    tile.classList.toggle('selected-for-exchange');
    const selectedTilesCount = tileContainer ? tileContainer.querySelectorAll('.selected-for-exchange').length : 0;
    const maxCanSelect = Math.floor(letterPool.length / 3); 
    if (selectedTilesCount > maxCanSelect) {
        if(feedbackArea) {
            feedbackArea.textContent = `Not enough letters in pool for ${selectedTilesCount} exchange(s). Max ${maxCanSelect} allowed. Deselect some.`;
            feedbackArea.className = 'feedback-error';
        }
    } else if (feedbackArea) {
         feedbackArea.textContent = `${selectedTilesCount} tile(s) selected for exchange.`;
         feedbackArea.className = 'feedback-neutral';
    }
  }

  function exitExchangeMode(isCancel) {
    inExchangeMode = false;
    if(exchangeButton) {
        exchangeButton.style.display = 'inline-block';
        if (untimedPracticeMode || (doneButton && doneButton.disabled) || gamePaused || gameTimedOut) {
            exchangeButton.disabled = true;
        } else {
            exchangeButton.disabled = false;
        }
    }
    if(confirmExchangeButton) confirmExchangeButton.style.display = 'none';
    if(cancelExchangeButton) cancelExchangeButton.style.display = 'none';

    // Removed gameTimedOut from this condition
    if (!untimedPracticeMode && !gamePaused) { 
         if(doneButton) doneButton.disabled = false; 
         if(playButton) playButton.disabled = true; 
    } else if (gamePaused) { 
        if(playButton) playButton.disabled = false; 
        if(doneButton) doneButton.disabled = true; 
        if(continueButton && savedTimeElapsed > -1) continueButton.style.display = 'inline-block'; // Check against -1
    } else { 
        if(playButton) playButton.disabled = false;
        if(doneButton) doneButton.disabled = true;
    }
    const tilesInHand = tileContainer ? tileContainer.querySelectorAll('.letter-tile') : [];
    tilesInHand.forEach(tile => {
        if (isCancel) tile.classList.remove('selected-for-exchange');
        tile.removeEventListener('click', handleTileSelectionForExchange);
        tile.style.cursor = 'grab'; 
    });
    if (feedbackArea) {
        if (isCancel) feedbackArea.textContent = "Letter exchange cancelled.";
    }
    // At the end of exitExchangeMode
    if (letterPool.length < 3) {
        if(exchangeButton) exchangeButton.disabled = true;
    }
  }

  function confirmLetterExchange() {
    if (!inExchangeMode) return;
    const selectedTiles = tileContainer ? Array.from(tileContainer.querySelectorAll('.selected-for-exchange')) : [];
    if (selectedTiles.length === 0) {
        if(feedbackArea) feedbackArea.textContent = "No tiles selected to exchange.";
        exitExchangeMode(true); 
        return;
    }

    // This check in enterExchangeMode should already gate this, but as a safeguard:
    const requiredLettersForExchange = selectedTiles.length * 3;
    if (letterPool.length < requiredLettersForExchange && letterPool.length < selectedTiles.length) { // Ensure enough for at least 1 per exchange if not 3
         if(feedbackArea) feedbackArea.textContent = "Not enough letters in pool to complete this exchange.";
         exitExchangeMode(true);
         return;
    }
    
    let exchangedCount = 0;
    let newTilesAddedCount = 0;

    if (!isDailyGame) {
        // REGULAR GAME LOGIC
        selectedTiles.forEach(tile => {
            if(tileContainer) tileContainer.removeChild(tile); // Tile removed from hand, not added back to letterPool

            for (let i = 0; i < 3; i++) { 
                if (letterPool.length === 0) {
                    if(feedbackArea && !feedbackArea.textContent.includes("Letter pool ran out")) {
                        feedbackArea.textContent = (feedbackArea.textContent || "") + " Letter pool ran out during exchange!";
                    }
                    break; 
                }
                const newLetter = letterPool.pop(); // Draw from the global, random letter pool
                if (newLetter) {
                    const newTile = document.createElement('div');
                    newTile.classList.add('letter-tile');
                    newTile.textContent = newLetter;
                    newTile.draggable = true; 
                    newTile.id = `tile-regular-${Date.now()}-exchanged-${i}-${exchangedCount}`;
                    newTile.addEventListener('dragstart', handleDragStart); 
                    newTile.addEventListener('touchstart', handleTouchStart, { passive: false }); 
                    if(tileContainer) {
                        tileContainer.appendChild(newTile);
                        newTilesAddedCount++;
                    }
                }
            }
            exchangedCount++;
        });
    } else {
        // DAILY GAME LOGIC (Original logic using seeded RNG and daily letter pool)
        selectedTiles.forEach(tile => {
            const exchangedLetter = tile.textContent;
            if(tileContainer) tileContainer.removeChild(tile); 
            for (let i = 0; i < 3; i++) { 
                if (letterPool.length === 0) break; 
                let newLetter;
                let attempts = 0;
                const initialPoolSizeForAttempt = letterPool.length; 
                do { 
                    // For Daily game, letterPool is the seeded one. Use getNextRandom() for deterministic splice.
                    const randomIndex = Math.floor(getNextRandom() * letterPool.length);
                    newLetter = letterPool.splice(randomIndex, 1)[0]; 
                    attempts++;
                } while (newLetter === exchangedLetter && attempts < initialPoolSizeForAttempt + 5 && letterPool.length > 0);
                
                if (newLetter === exchangedLetter && attempts >= initialPoolSizeForAttempt + 5) {
                    if (newLetter) letterPool.push(newLetter); // Put it back only if it's the same and no other options
                    // console.warn(`Could not find a different letter for ${exchangedLetter}. Re-adding to pool for daily.`);
                    continue; 
                }
                if (newLetter) { 
                    const newTile = document.createElement('div');
                    newTile.classList.add('letter-tile');
                    newTile.textContent = newLetter;
                    newTile.draggable = true; 
                    // Using a slightly different ID scheme for daily exchanged tiles for clarity, if needed
                    newTile.id = `tile-daily-${Date.now()}-exchanged-${i}-${exchangedCount}`; 
                    newTile.addEventListener('dragstart', handleDragStart); 
                    newTile.addEventListener('touchstart', handleTouchStart, { passive: false }); 
                    if(tileContainer) {
                        tileContainer.appendChild(newTile);
                        newTilesAddedCount++;
                    }
                }
            }
            exchangedCount++;
        });
    }

    const penaltyPerTile = 15;
    const totalPenalty = exchangedCount * penaltyPerTile;
    timeElapsed += totalPenalty;

    // Update timer display immediately if it's visible and not in untimed mode
    if (timerDisplay && !untimedPracticeMode) {
        timerDisplay.textContent = formatTime(timeElapsed);
    }

    if(feedbackArea) {
        let feedbackMessage = `${exchangedCount} tile(s) exchanged. ${newTilesAddedCount} new tile(s) added to your hand.`;
        if (totalPenalty > 0) {
            feedbackMessage += ` Time penalty: +${totalPenalty} seconds.`;
        }
        feedbackArea.textContent = feedbackMessage;
        feedbackArea.className = 'feedback-success';
    }
    exitExchangeMode(false); 
  }

  // --- Event Listeners for Buttons ---
  if (playButton) playButton.addEventListener('click', startGame);
  if (doneButton) doneButton.addEventListener('click', stopGame);
  if (continueButton) continueButton.addEventListener('click', handleContinueGame);
  if (exchangeButton) exchangeButton.addEventListener('click', enterExchangeMode);
  if (confirmExchangeButton) confirmExchangeButton.addEventListener('click', confirmLetterExchange);
  if (cancelExchangeButton) cancelExchangeButton.addEventListener('click', () => exitExchangeMode(true));
  if (dailyPuzzleButton) dailyPuzzleButton.addEventListener('click', startDailyGame);
  if (drawTileButton) drawTileButton.addEventListener('click', drawTileFromPool);

  // --- Initial Setup ---

  function loadAndDisplayGeneralHighScore() {
      const generalHighScoreValueElement = document.getElementById('general-high-score-value');
      if (generalHighScoreValueElement) {
          const generalHighScoreKey = "generalGameHighScore";
          const storedGeneralHighScore = localStorage.getItem(generalHighScoreKey);
          if (storedGeneralHighScore !== null) {
              generalHighScoreValueElement.textContent = storedGeneralHighScore;
          } else {
              generalHighScoreValueElement.textContent = "N/A";
          }
      }

  function displayRegularHighScores() {
    const highScores = JSON.parse(localStorage.getItem(REGULAR_HIGH_SCORES_KEY)) || [];
    const highScoresListElement = document.getElementById('regular-high-scores-list');

    if (highScoresListElement) {
      highScoresListElement.innerHTML = ''; // Clear previous scores

      if (highScores.length === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = "No high scores yet.";
        highScoresListElement.appendChild(listItem);
      } else {
        highScores.forEach((scoreEntry, index) => {
          const listItem = document.createElement('li');
          listItem.textContent = `${index + 1}. ${scoreEntry.score} points (${scoreEntry.date})`;
          highScoresListElement.appendChild(listItem);
        });
      }
    } else {
      console.warn("High scores display element 'regular-high-scores-list' not found.");
    }
  }

  function initializeGameStatus() {
    const currentDailySeed = getDailySeed();
    if (localStorage.getItem('dailyPuzzlePlayed_' + currentDailySeed)) {
      if (dailyPuzzleButton) dailyPuzzleButton.disabled = true;
      if (dailyPlayedStatus) {
        const score = localStorage.getItem('dailyPuzzleScore_' + currentDailySeed);
        dailyPlayedStatus.textContent = `Daily Puzzle Played: Yes (Score: ${score ? score : "N/A"})`;
      }
    } else {
      if (dailyPlayedStatus) dailyPlayedStatus.textContent = "Daily Puzzle Played: No";
      if (dailyPuzzleButton) dailyPuzzleButton.disabled = false;
      localStorage.removeItem('dailyPuzzleScore_' + currentDailySeed);
    }

    const dailyHighScoreValueElement = document.getElementById('todays-daily-high-score-value');
    const dailyHighScoreKey = `todaysDailyHighScore_${currentDailySeed}`;
    const storedDailyHighScore = localStorage.getItem(dailyHighScoreKey);

    if (dailyHighScoreValueElement) {
        if (storedDailyHighScore !== null) {
            dailyHighScoreValueElement.textContent = storedDailyHighScore;
        } else {
            dailyHighScoreValueElement.textContent = "N/A";
        }
    }
    loadAndDisplayGeneralHighScore();
    updateDailyPuzzleCountdown(); 
     displayRegularHighScores(); // Display regular high scores on initial load
  }

  // Initial button states
  if (doneButton) doneButton.disabled = true; 
  if (continueButton) continueButton.style.display = 'none';
  if (playButton) playButton.disabled = false; 
  if (exchangeButton) { 
      exchangeButton.style.display = 'inline-block';
      exchangeButton.disabled = true; 
  }
  if (confirmExchangeButton) confirmExchangeButton.style.display = 'none';
  if (cancelExchangeButton) cancelExchangeButton.style.display = 'none';
  if (drawTileButton) { // Initial state for Draw Tile button
    drawTileButton.style.display = 'none';
    drawTileButton.disabled = true;
  }
  if (timerDisplay) timerDisplay.textContent = formatTime(0); 
  if (scoreDisplay) scoreDisplay.textContent = 'Score: 0'; 
  
  resetGame(); // Call resetGame to ensure clean initial state, including for drawTileButton
  initializeGameStatus(); 
  setInterval(updateDailyPuzzleCountdown, 1000); 
});

// --- TEST HELPER FUNCTIONS ---
// (These functions are for manual testing via browser console)

function test_simulateDailyGameEnd(score, dateSeed) {
    // Simulates the relevant parts of stopGame() for daily scores
    console.log(`Simulating end of daily game for seed ${dateSeed} with score ${score}`);
    localStorage.setItem('dailyPuzzlePlayed_' + dateSeed, 'true');
    localStorage.setItem('dailyPuzzleScore_' + dateSeed, score.toString());
    console.log('Daily score and played flag saved for seed ' + dateSeed);
    // Manually call initializeGameStatus() from console after this to check display
}

function test_checkDailyScore(dateSeed) {
    const played = localStorage.getItem('dailyPuzzlePlayed_' + dateSeed);
    const score = localStorage.getItem('dailyPuzzleScore_' + dateSeed);
    console.log(`Daily Test Check for seed ${dateSeed}:`);
    console.log(`  Played Flag: ${played === 'true' ? 'Correctly True' : 'Incorrect or Not Set (' + played + ')'}`);
    console.log(`  Score: ${score ? score : 'Not Set or N/A'}`);
    // You would then visually check the UI if initializeGameStatus() was run
}

function test_clearDailyTestData(dateSeed) {
    localStorage.removeItem('dailyPuzzlePlayed_' + dateSeed);
    localStorage.removeItem('dailyPuzzleScore_' + dateSeed);
    console.log(`Cleared daily test data for seed ${dateSeed}`);
}

// (Continue in TEST HELPER FUNCTIONS section)

const TEST_REGULAR_HIGH_SCORES_KEY = 'regularHighScores'; // Use the same key as in the main code
const TEST_MAX_SCORES = 5; // Use the same max as in the main code

function test_addRegularScore(scoreValue) {
    console.log(`Simulating adding regular score: ${scoreValue}`);
    let highScores = JSON.parse(localStorage.getItem(TEST_REGULAR_HIGH_SCORES_KEY)) || [];
    const newScoreEntry = { score: scoreValue, date: new Date().toISOString().split('T')[0] };

    if (scoreValue > 0) { // Similar logic to stopGame
        highScores.push(newScoreEntry);
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, TEST_MAX_SCORES);
        localStorage.setItem(TEST_REGULAR_HIGH_SCORES_KEY, JSON.stringify(highScores));
        console.log('Regular high scores updated.');
    } else {
        console.log('Score was 0, not added to regular high scores.');
    }
    // Manually call displayRegularHighScores() from console after this to check display
}

function test_checkRegularHighScores() {
    const highScores = JSON.parse(localStorage.getItem(TEST_REGULAR_HIGH_SCORES_KEY)) || [];
    console.log('Regular High Scores Test Check:');
    if (highScores.length === 0) {
        console.log('  No regular high scores saved.');
        return;
    }
    highScores.forEach((entry, index) => {
        console.log(`  ${index + 1}. Score: ${entry.score}, Date: ${entry.date}`);
    });
    // You would then visually check the UI if displayRegularHighScores() was run
}

function test_clearRegularHighScores() {
    localStorage.removeItem(TEST_REGULAR_HIGH_SCORES_KEY);
    console.log('Cleared regular high scores test data.');
}

// Example usage instructions for the console (as comments):
/*
--- How to use Test Helper Functions from Browser Console ---

1. Daily Puzzle Tests:
   - test_clearDailyTestData('YYYYMMDD'); // Replace YYYYMMDD with a test seed, e.g., '20230101'
   - test_simulateDailyGameEnd(150, '20230101');
   - test_checkDailyScore('20230101');
   - initializeGameStatus(); // To update UI display based on saved data
   - // To clean up: test_clearDailyTestData('20230101');

2. Regular High Score Tests:
   - test_clearRegularHighScores();
   - test_addRegularScore(100);
   - test_addRegularScore(50);
   - test_addRegularScore(120);
   - test_addRegularScore(80);
   - test_addRegularScore(150); // This should be the highest
   - test_addRegularScore(20);  // This should not make it to top 5 if list is full
   - test_addRegularScore(130); // This should push out the 50
   - test_checkRegularHighScores();
   - displayRegularHighScores(); // To update UI display
   - // To clean up: test_clearRegularHighScores();
*/
