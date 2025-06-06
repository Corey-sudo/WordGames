console.log("SCRIPT JS RUNNING"); // Simple, direct log at the very top

function initializeGame() {
  console.log("script.js: initializeGame() function called.");
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
  const NUM_TILES = 16; 
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
      'E': 12, 'A': 8, 'I': 8, 'O': 8, 'U': 4, 
      'T': 8, 'N': 8, 'R': 8, 'S': 8,         
      'D': 4, 'L': 4, 'H': 4, 'C': 4,         
      'G': 3, 'B': 3, 'F': 3, 'M': 3, 'P': 3, 'W': 3, 'Y': 3, 
      'V': 2, 'K': 2,                         
      'J': 1, 'X': 1, 'Q': 1, 'Z': 1          
  };


  // --- Global Game State Variables ---
  // These need to be outside initializeGame if other functions (like startGame, etc.) 
  // are also outside initializeGame and need to access them.
  // For now, keeping them here as per the previous structure that was being debugged.
  // If they were meant to be truly global to the script, they should be at the top level.
  // This might be the source of the "ReferenceError" if page.evaluate tries to access them
  // and they are scoped within initializeGame.
  // However, the functions like startGame, resetGame are defined *within* initializeGame in this structure,
  // so they would have access. The issue is page.evaluate.
  // Let's assume for now they are intended to be accessible by functions within this DOMContentLoaded scope.

  let timerInterval;        
  let timeElapsed;             
  let gridInitialized = false; 
  let gameHasBeenPlayed = false; 
  let letterPool = []; 
  let isDailyGame = false;
  let gamePaused = false;       
  let savedTimeElapsed = -1;     
  let gameTimedOut = false;       
  let untimedPracticeMode = false; 
  let inExchangeMode = false;
  let draggedTile = null;     
  let initialTouchX = 0;      
  let initialTouchY = 0;      
  let offsetX = 0;            
  let offsetY = 0;            
  let originalParent = null;  
  let lcg_seed; 

  // --- Function Definitions ---
  function hashStringSeed(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; 
    }
    return hash;
  }

  function initializeSeededRNG(seedStr) {
    lcg_seed = hashStringSeed(seedStr);
    if (lcg_seed === 0) {
      lcg_seed = 1013904223; 
    }
  }

  function getNextRandom() {
    if (typeof lcg_seed === 'undefined') {
      console.warn("Seeded RNG not initialized. Using Math.random() as fallback.");
      return Math.random();
    }
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    lcg_seed = (a * lcg_seed + c) % m;
    return lcg_seed / m; 
  }

  function getDailySeed() {
    const now = new Date();
    const estOptions = { timeZone: 'America/New_York' };
    let year = now.toLocaleString('en-US', { ...estOptions, year: 'numeric' });
    let month = now.toLocaleString('en-US', { ...estOptions, month: '2-digit' });
    let day = now.toLocaleString('en-US', { ...estOptions, day: '2-digit' });
    const hour = parseInt(now.toLocaleString('en-US', { ...estOptions, hour: '2-digit', hour12: false }), 10);
    if (hour < 3) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      year = yesterday.toLocaleString('en-US', { ...estOptions, year: 'numeric' });
      month = yesterday.toLocaleString('en-US', { ...estOptions, month: '2-digit' });
      day = yesterday.toLocaleString('en-US', { ...estOptions, day: '2-digit' });
    }
    return `${year}${month}${day}`;
  }

  function resetLetterPool() {
    console.log("script.js: resetLetterPool() called.");
    if (isDailyGame) {
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
    console.log("script.js: resetLetterPool() finished. letterPool length:", letterPool.length);
  }

  function resetGame() {
    console.log("script.js: resetGame() called.");
    isDailyGame = false; 
    const gridCells = document.querySelectorAll('#game-board .grid-cell');
    gridCells.forEach(cell => { cell.innerHTML = ''; });
    if(tileContainer) tileContainer.innerHTML = '';
    if (timerInterval) clearInterval(timerInterval);
    timeElapsed = 0; 
    if(timerDisplay) {
        timerDisplay.textContent = formatTime(timeElapsed);
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
        exchangeButton.disabled = true; 
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
    console.log("script.js: resetGame() finished. letterPool length (after calling resetLetterPool):", letterPool.length);
  }

  function updateDailyPuzzleCountdown() {
    const now = new Date();
    const estOptions = { timeZone: 'America/New_York' };
    let nextReset = new Date(now.toLocaleString('en-US', estOptions));
    nextReset.setHours(3, 0, 0, 0);
    if (now.getTime() >= nextReset.getTime()) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    const diff = nextReset.getTime() - now.getTime();
    if (diff <= 0) {
      if(dailyResetCountdown) dailyResetCountdown.textContent = "New puzzle available!";
      initializeGameStatus(); 
      return; 
    }
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    if(dailyResetCountdown) {
      dailyResetCountdown.textContent = `Next puzzle in: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  function startDailyGame() {
    console.log("script.js: startDailyGame() called.");
    const currentDailySeed = getDailySeed();
    if (localStorage.getItem('dailyPuzzlePlayed_' + currentDailySeed)) {
      if (feedbackArea) feedbackArea.textContent = "You have already played today's daily puzzle. Please come back tomorrow!";
      return;
    }
    if ((gameHasBeenPlayed && !gamePaused && !untimedPracticeMode) || gamePaused) {
      if (!confirm("Start a new daily puzzle? Any current regular game progress will be lost.")) {
        return;
      }
    }
    isDailyGame = true;
    resetGame(); 
    isDailyGame = true; 
    if (!gridInitialized) createGameBoard();
    generateDailyTiles(); 
    startTimer();
    if (playButton) playButton.disabled = true;
    if (dailyPuzzleButton) dailyPuzzleButton.disabled = true;
    if (doneButton) doneButton.disabled = false;
    if (exchangeButton) {
        exchangeButton.disabled = false;
        if (letterPool.length < 3) { 
            exchangeButton.disabled = true;
        }
    }
    if (feedbackArea) feedbackArea.innerHTML = '';
    if (dailyPlayedStatus) dailyPlayedStatus.textContent = "Daily Puzzle Played: No (In Progress)";
    gameHasBeenPlayed = true;
  }

  function createGameBoard() {
    console.log("script.js: createGameBoard() called.");
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
    console.log("script.js: createGameBoard() finished.");
  }

  function generateDailyTiles() {
    console.log("script.js: generateDailyTiles() called.");
    const dailySeed = getDailySeed();
    initializeSeededRNG(dailySeed);
    let tempPool = [];
    for (const letter in FULL_LETTER_POOL_FREQUENCIES) {
      for (let i = 0; i < FULL_LETTER_POOL_FREQUENCIES[letter]; i++) {
        tempPool.push(letter);
      }
    }
    let currentIndex = tempPool.length, randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(getNextRandom() * currentIndex);
      currentIndex--;
      [tempPool[currentIndex], tempPool[randomIndex]] = [tempPool[randomIndex], tempPool[currentIndex]];
    }
    letterPool = tempPool; 
    console.log("script.js: Daily letterPool generated, length:", letterPool.length);
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
      tile.id = `tile-daily-${Date.now()}-${i}`;
      tile.textContent = letter;
      tile.addEventListener('dragstart', handleDragStart);
      tile.addEventListener('dragend', (event) => { event.target.classList.remove('dragging'); });
      tile.addEventListener('touchstart', handleTouchStart, { passive: false }); 
      tileContainer.appendChild(tile);
    });
    console.log("script.js: generateDailyTiles() finished, tiles added to container:", handLetters.length);
  }

  function generateRandomTiles() {
    console.log("script.js: generateRandomTiles() called. letterPool length:", letterPool.length, "INITIAL_HAND_SIZE:", INITIAL_HAND_SIZE);
    if(!tileContainer) {
      console.error("script.js: tileContainer is null in generateRandomTiles!");
      return;
    }
    tileContainer.innerHTML = ''; 
    const selectedLetters = [];
    for(let i=0; i < INITIAL_HAND_SIZE; i++){
        if(letterPool.length > 0) {
            selectedLetters.push(letterPool.pop()); 
        } else {
            console.warn("Not enough letters in pool to deal initial hand.");
            break; 
        }
    }
    console.log("script.js: Selected letters for hand:", selectedLetters);
    selectedLetters.forEach((letter, i) => {
      if (!letter) return; 
      const tile = document.createElement('div');
      tile.classList.add('letter-tile');
      tile.draggable = true; 
      tile.id = `tile-${Date.now()}-${i}`; 
      tile.textContent = letter;
      tile.addEventListener('dragstart', handleDragStart);
      tile.addEventListener('dragend', (event) => { event.target.classList.remove('dragging'); });
      tile.addEventListener('touchstart', handleTouchStart, { passive: false }); 
      tileContainer.appendChild(tile);
    });
    console.log("script.js: generateRandomTiles() finished, tiles added to container:", selectedLetters.length);
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

  function startTimer() { 
    console.log("script.js: startTimer() called.");
    if(untimedPracticeMode && timerDisplay) {
        timerDisplay.textContent = "Untimed Mode";
        return; 
    }
    if(timerInterval) clearInterval(timerInterval); 
    if(timerDisplay) timerDisplay.textContent = formatTime(timeElapsed);
    timerInterval = setInterval(() => {
      timeElapsed++; 
      if(timerDisplay) timerDisplay.textContent = formatTime(timeElapsed);
    }, 1000);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function startGame() {
    console.log("script.js: startGame() called.");
    if ((gameHasBeenPlayed && !gamePaused && !untimedPracticeMode) || gamePaused) { 
      if (!confirm("Start a new game? Any current progress will be lost.")) return; 
    }
    isDailyGame = false; 
    if (feedbackArea) feedbackArea.innerHTML = ''; 
    gamePaused = false;
    savedTimeElapsed = -1;
    gameTimedOut = false;       
    untimedPracticeMode = false; 
    resetGame(); 
    if (!gridInitialized) createGameBoard(); 
    generateRandomTiles(); 
    startTimer(); 
    if(playButton) playButton.disabled = true;
    if(dailyPuzzleButton) dailyPuzzleButton.disabled = false; 
    if(doneButton) doneButton.disabled = false;
    if(exchangeButton) {
        exchangeButton.disabled = false; 
        if (letterPool.length < 3) { 
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
    console.log("script.js: startGame() finished.");
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
             if (scoreDisplay) scoreDisplay.textContent = 'Score: 0';
            return; 
        }

        if (checkedWordsResult.valid && checkedWordsResult.valid.length > 0) {
            checkedWordsResult.valid.forEach(item => currentWordsScore += item.score);
        }
        const tilesInContainerCount = tileContainer ? tileContainer.querySelectorAll('.letter-tile').length : 0;
        let timeBonus = 0;
        let gameSuccessfullyCompleted = false;
        const wordScoreBeforeBonus = currentWordsScore;
        if (checkedWordsResult.invalid.length === 0 && tilesInContainerCount === 0 && checkedWordsResult.valid.length > 0) {
            gameSuccessfullyCompleted = true;
            if (INITIAL_GAME_TIME > 0) { 
                timeBonus = Math.floor(Math.max(0, 100 - (timeElapsed / INITIAL_GAME_TIME) * 100));
            } else {
                timeBonus = 0; 
            }
            currentWordsScore += timeBonus; 
            console.log("Time bonus awarded:", timeBonus);
        }
        const canContinue = tilesInContainerCount > 0 || (checkedWordsResult.invalid && checkedWordsResult.invalid.length > 0);
        if (feedbackArea) { feedbackArea.innerHTML = ''; feedbackArea.className = ''; }
        if (canContinue) { 
            gamePaused = true;
            savedTimeElapsed = timeElapsed; 
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
            savedTimeElapsed = -1; 
            if (feedbackArea) { 
                if (gameSuccessfullyCompleted) {
                    let breakdownHTML = "<h3>Score Breakdown</h3><ul>";
                    checkedWordsResult.valid.forEach(item => {
                        breakdownHTML += `<li><strong>${item.word.toUpperCase()}:</strong> ${calculateWordScore(item.word)} points</li>`; 
                    });
                    breakdownHTML += "</ul>";
                    breakdownHTML += `<p><strong>Subtotal for Words:</strong> ${wordScoreBeforeBonus} points</p>`;
                    if (timeBonus > 0) {
                        breakdownHTML += `<p><strong>Time Bonus:</strong> +${timeBonus} points</p>`;
                    }
                    breakdownHTML += "<hr>";
                    breakdownHTML += `<p><strong>Total Score: ${currentWordsScore} points</strong></p>`;
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
      localStorage.setItem('dailyPuzzlePlayed_' + currentDailySeed, 'true');
      localStorage.setItem('dailyPuzzleScore_' + currentDailySeed, currentWordsScore);
      const dailyHighScoreKey = `todaysDailyHighScore_${currentDailySeed}`;
      const storedDailyHighScore = localStorage.getItem(dailyHighScoreKey);
      let currentDailyHighScore = parseInt(storedDailyHighScore, 10) || 0;
      if (currentWordsScore > currentDailyHighScore) {
          localStorage.setItem(dailyHighScoreKey, currentWordsScore.toString());
      }
      if (dailyPlayedStatus) dailyPlayedStatus.textContent = "Daily Puzzle Played: Yes";
      if (dailyPuzzleButton) dailyPuzzleButton.disabled = true;
      isDailyGame = false; 
    } else { 
        if (gameSuccessfullyCompleted && !untimedPracticeMode) {
            const generalHighScoreKey = "generalGameHighScore";
            let currentGeneralHighScore = parseInt(localStorage.getItem(generalHighScoreKey), 10) || 0;
            if (currentWordsScore > currentGeneralHighScore) {
                localStorage.setItem(generalHighScoreKey, currentWordsScore.toString());
                if (typeof loadAndDisplayGeneralHighScore === 'function') loadAndDisplayGeneralHighScore();
            }
            let highScores = JSON.parse(localStorage.getItem(REGULAR_HIGH_SCORES_KEY)) || [];
            const newScoreEntry = { score: currentWordsScore, date: new Date().toISOString().split('T')[0] };
            highScores.push(newScoreEntry);
            highScores.sort((a, b) => b.score - a.score);
            highScores = highScores.slice(0, MAX_REGULAR_HIGH_SCORES);
            localStorage.setItem(REGULAR_HIGH_SCORES_KEY, JSON.stringify(highScores));
            displayRegularHighScores();
        }
        if (drawTileButton) drawTileButton.disabled = true;
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
            drawTileButton.style.display = 'inline-block';
            drawTileButton.disabled = true;
          }
          if(gameBoard) gameBoard.classList.remove('game-over'); 
          if(tileContainer) tileContainer.classList.remove('game-over');
      } else if (gamePaused && savedTimeElapsed > -1 && !isDailyGame) { 
          gamePaused = false;
          timeElapsed = savedTimeElapsed; 
          startTimer(); 
          if (doneButton) doneButton.disabled = false;
          if (playButton) playButton.disabled = true; 
          if (continueButton) continueButton.style.display = 'none';
          if (exchangeButton) {
            exchangeButton.disabled = false; 
            if (letterPool.length < 3) { 
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
      } else if (isDailyGame && gamePaused) { 
          gamePaused = false;
          timeElapsed = savedTimeElapsed;
          startTimer();
          if (doneButton) doneButton.disabled = false;
          if (playButton) playButton.disabled = true;
          if (dailyPuzzleButton) dailyPuzzleButton.disabled = true;
          if (continueButton) continueButton.style.display = 'none';
          if (exchangeButton) {
            exchangeButton.disabled = false;
            if (letterPool.length < 3) { 
                exchangeButton.disabled = true;
            }
          }
           if (drawTileButton) drawTileButton.style.display = 'none'; 
          if (feedbackArea) feedbackArea.innerHTML = '';
          if(gameBoard) gameBoard.classList.remove('game-over');
          if(tileContainer) tileContainer.classList.remove('game-over');
      }
  }
  
  function drawTileFromPool() {
    if (isDailyGame) return; 
    if (letterPool.length === 0) {
      if (drawTileButton) drawTileButton.disabled = true;
      if (feedbackArea) feedbackArea.textContent = "Letter pool is empty.";
      return;
    }
    const letter = letterPool.pop();
    if (!letter) { 
        if (drawTileButton) drawTileButton.disabled = (letterPool.length === 0);
        return;
    }
    const tile = document.createElement('div');
    tile.classList.add('letter-tile');
    tile.draggable = true;
    tile.id = `tile-${Date.now()}-drawn-${Math.random().toString(36).substr(2, 5)}`;
    tile.textContent = letter;
    tile.addEventListener('dragstart', handleDragStart); 
    tile.addEventListener('touchstart', handleTouchStart, { passive: false });
    if (tileContainer) tileContainer.appendChild(tile);
    if (letterPool.length === 0) {
      if (drawTileButton) drawTileButton.disabled = true;
    }
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
    if (!untimedPracticeMode && !gamePaused) { 
         if(doneButton) doneButton.disabled = false; 
         if(playButton) playButton.disabled = true; 
    } else if (gamePaused) { 
        if(playButton) playButton.disabled = false; 
        if(doneButton) doneButton.disabled = true; 
        if(continueButton && savedTimeElapsed > -1) continueButton.style.display = 'inline-block';
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
    const requiredLettersForExchange = selectedTiles.length * 3;
    if (letterPool.length < requiredLettersForExchange && letterPool.length < selectedTiles.length) { 
         if(feedbackArea) feedbackArea.textContent = "Not enough letters in pool to complete this exchange.";
         exitExchangeMode(true);
         return;
    }
    let exchangedCount = 0;
    let newTilesAddedCount = 0;
    if (!isDailyGame) {
        selectedTiles.forEach(tile => {
            if(tileContainer) tileContainer.removeChild(tile); 
            for (let i = 0; i < 3; i++) { 
                if (letterPool.length === 0) {
                    if(feedbackArea && !feedbackArea.textContent.includes("Letter pool ran out")) {
                        feedbackArea.textContent = (feedbackArea.textContent || "") + " Letter pool ran out during exchange!";
                    }
                    break; 
                }
                const newLetter = letterPool.pop(); 
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
        selectedTiles.forEach(tile => {
            const exchangedLetter = tile.textContent;
            if(tileContainer) tileContainer.removeChild(tile); 
            for (let i = 0; i < 3; i++) { 
                if (letterPool.length === 0) break; 
                let newLetter;
                let attempts = 0;
                const initialPoolSizeForAttempt = letterPool.length; 
                do { 
                    const randomIndex = Math.floor(getNextRandom() * letterPool.length);
                    newLetter = letterPool.splice(randomIndex, 1)[0]; 
                    attempts++;
                } while (newLetter === exchangedLetter && attempts < initialPoolSizeForAttempt + 5 && letterPool.length > 0);
                if (newLetter === exchangedLetter && attempts >= initialPoolSizeForAttempt + 5) {
                    if (newLetter) letterPool.push(newLetter); 
                    continue; 
                }
                if (newLetter) { 
                    const newTile = document.createElement('div');
                    newTile.classList.add('letter-tile');
                    newTile.textContent = newLetter;
                    newTile.draggable = true; 
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
  }

  function displayRegularHighScores() {
    const highScores = JSON.parse(localStorage.getItem(REGULAR_HIGH_SCORES_KEY)) || [];
    const highScoresListElement = document.getElementById('regular-high-scores-list');
    if (highScoresListElement) {
      highScoresListElement.innerHTML = ''; 
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
    console.log("script.js: initializeGameStatus() called.");
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
    displayRegularHighScores(); 
    console.log("script.js: initializeGameStatus() finished.");
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
  if (drawTileButton) {
    drawTileButton.style.display = 'none';
    drawTileButton.disabled = true;
  }
  if (timerDisplay) timerDisplay.textContent = formatTime(0); 
  if (scoreDisplay) scoreDisplay.textContent = 'Score: 0';
}

// --- TEST HELPER FUNCTIONS ---
// (These functions are for manual testing via browser console)
// ... (rest of the test helper functions remain the same)
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

console.log("script.js: Setting up DOMContentLoaded listener or calling initializeGame directly.");
if (document.readyState === 'loading') {
    console.log("script.js: Document is loading, adding DOMContentLoaded listener.");
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    console.log("script.js: Document already loaded, calling initializeGame() directly.");
    initializeGame();
}
console.log("script.js: End of script top-level execution, after initializeGame setup.");
