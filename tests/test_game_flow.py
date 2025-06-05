import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:8000/index.html"

def test_script_execution_and_logging(page: Page):
    console_messages = []
    # Setup console listener before navigation
    page.on("console", lambda msg: console_messages.append(f"CONSOLE {msg.type}: {msg.text}"))

    page.goto(BASE_URL)
    
    # Wait for events to ensure scripts have a chance to run and logs to be processed
    page.wait_for_load_state('domcontentloaded') # Wait for DOMContentLoaded
    page.wait_for_timeout(500) # Additional small buffer

    print("\nCaptured console messages:")
    if console_messages:
        for msg_idx, msg_content in enumerate(console_messages):
            print(f"  Msg {msg_idx}: {msg_content}")
    else:
        print("  No console messages were captured.")

    # Check for inline script log
    inline_script_ran = any("INLINE_SCRIPT_TEST" in msg for msg in console_messages)
    print(f"Was 'INLINE_SCRIPT_TEST' message captured? {inline_script_ran}")
    assert inline_script_ran, "CRITICAL: 'INLINE_SCRIPT_TEST' log from inline script was not captured."

    # Check for external script.js log
    external_script_ran = any("SCRIPT_JS_EXECUTED_SUCCESSFULLY" in msg for msg in console_messages)
    print(f"Was 'SCRIPT_JS_EXECUTED_SUCCESSFULLY' message captured? {external_script_ran}")
    assert external_script_ran, "CRITICAL: 'SCRIPT_JS_EXECUTED_SUCCESSFULLY' log from external script.js was not captured."

    print("\n--- Script execution and console logging test passed ---")
    pass


def test_play_button_starts_game(page: Page):
    page.goto(BASE_URL)
    page.wait_for_load_state('domcontentloaded')

    play_button = page.locator("#play-button")
    done_button = page.locator("#done-button")
    tile_container = page.locator("#tile-container")

    expect(play_button).to_be_enabled()
    expect(done_button).to_be_disabled()

    play_button.click()

    game_has_been_played = page.evaluate("() => window.gameHasBeenPlayed")
    assert game_has_been_played is True, "gameHasBeenPlayed should be true after starting game"

    is_daily_game = page.evaluate("() => window.isDailyGame")
    assert is_daily_game is False, "isDailyGame should be false for a regular game"

    # NUM_TILES is 16 (used by generateDailyTiles), INITIAL_HAND_SIZE is 16 (used by generateRandomTiles)
    expect(tile_container.locator(".letter-tile")).to_have_count(16, timeout=2000)

    expect(play_button).to_be_disabled()
    expect(done_button).to_be_enabled()

    page.wait_for_timeout(1100)
    time_elapsed = page.evaluate("() => window.timeElapsed")
    assert time_elapsed > 0, "timeElapsed should be greater than 0 after timer starts"

    timer_interval_exists = page.evaluate("() => window.timerInterval !== undefined && window.timerInterval !== null")
    assert timer_interval_exists is True, "timerInterval should be set"

    grid_initialized = page.evaluate("() => window.gridInitialized")
    assert grid_initialized is True, "gridInitialized should be true"

    game_board_cells = page.locator("#game-board .grid-cell")
    expect(game_board_cells).to_have_count(144) # GRID_SIZE is 12

    print("\n--- Play button and startGame() test passed ---")
    pass


def test_daily_puzzle_button_starts_daily_game(page: Page):
    page.goto(BASE_URL)
    page.wait_for_load_state('domcontentloaded')

    daily_puzzle_button_locator = page.locator("#daily-puzzle-button")
    play_button_locator = page.locator("#play-button")
    done_button_locator = page.locator("#done-button")
    tile_container_locator = page.locator("#tile-container")
    feedback_area_locator = page.locator("#feedback-area")
    draw_tile_button_locator = page.locator("#draw-tile-button")

    page.evaluate("() => { const dailySeed = getDailySeed(); localStorage.removeItem('dailyPuzzlePlayed_' + dailySeed); }")
    page.reload()
    page.wait_for_load_state('domcontentloaded')

    expect(daily_puzzle_button_locator).to_be_enabled()
    daily_puzzle_button_locator.click()

    expect(play_button_locator).to_be_disabled()
    expect(daily_puzzle_button_locator).to_be_disabled()
    expect(done_button_locator).to_be_enabled()
    expect(tile_container_locator.locator(".letter-tile")).to_have_count(16, timeout=2000) # NUM_TILES
    expect(feedback_area_locator).to_have_text('')
    expect(draw_tile_button_locator).to_be_hidden()

    is_daily_game = page.evaluate("() => window.isDailyGame")
    assert is_daily_game is True, "isDailyGame should be true for a daily game"

    game_has_been_played = page.evaluate("() => window.gameHasBeenPlayed")
    assert game_has_been_played is True, "gameHasBeenPlayed should be true after starting daily game"

    page.wait_for_timeout(1100)
    time_elapsed_daily = page.evaluate("() => window.timeElapsed")
    assert time_elapsed_daily > 0, "timeElapsed should be greater than 0 after daily game timer starts"

    timer_interval_exists_daily = page.evaluate("() => window.timerInterval !== undefined && window.timerInterval !== null")
    assert timer_interval_exists_daily is True, "timerInterval should be set for daily game"

    print("\n--- Daily Puzzle button and startDailyGame() test passed ---")
    pass

def test_exchange_letters_mode(page: Page):
    page.goto(BASE_URL)
    page.wait_for_load_state('domcontentloaded')

    play_button_locator = page.locator("#play-button")
    exchange_button_locator = page.locator("#exchange-button")
    confirm_exchange_button_locator = page.locator("#confirm-exchange-button")
    cancel_exchange_button_locator = page.locator("#cancel-exchange-button")
    done_button_locator = page.locator("#done-button")
    feedback_area_locator = page.locator("#feedback-area")
    tile_container_locator = page.locator("#tile-container")

    # Start a regular game
    play_button_locator.click()
    expect(exchange_button_locator).to_be_enabled(timeout=1000) # Should be enabled after game starts

    # --- Test entering and cancelling exchange mode ---
    exchange_button_locator.click()

    expect(exchange_button_locator).to_be_hidden()
    expect(confirm_exchange_button_locator).to_be_visible()
    expect(cancel_exchange_button_locator).to_be_visible()
    expect(done_button_locator).to_be_disabled()
    expect(feedback_area_locator).to_have_text("Select tiles to exchange (from your rack), then confirm or cancel.")

    in_exchange_mode_true = page.evaluate("() => window.inExchangeMode")
    assert in_exchange_mode_true is True, "inExchangeMode should be true after clicking Exchange Letters"

    cancel_exchange_button_locator.click()

    expect(exchange_button_locator).to_be_visible()
    # exchange_button might be disabled if letterPool < 3 after resetGame and generateRandomTiles.
    # For this test, assume initial pool is large enough. startGame() enables it.
    expect(exchange_button_locator).to_be_enabled()
    expect(confirm_exchange_button_locator).to_be_hidden()
    expect(cancel_exchange_button_locator).to_be_hidden()
    expect(done_button_locator).to_be_enabled() # Re-enabled after cancelling exchange
    expect(feedback_area_locator).to_have_text("Letter exchange cancelled.")

    in_exchange_mode_false = page.evaluate("() => window.inExchangeMode")
    assert in_exchange_mode_false is False, "inExchangeMode should be false after cancelling"

    # --- Test confirming exchange (optional part) ---
    # Re-enter exchange mode
    exchange_button_locator.click()
    expect(confirm_exchange_button_locator).to_be_visible() # Wait for it

    initial_tile_count = tile_container_locator.locator(".letter-tile").count()
    if initial_tile_count == 0:
        print("Skipping confirm exchange part: No tiles in hand to select.")
        # Cancel out of exchange mode to leave test in a clean state
        cancel_exchange_button_locator.click()
        expect(confirm_exchange_button_locator).to_be_hidden()

    else:
        first_tile = tile_container_locator.locator(".letter-tile").first
        first_tile.click()
        expect(first_tile).to_have_class("letter-tile selected-for-exchange")

        # Check if letterPool has enough for exchange (at least 3 letters)
        # This is tricky to check directly without exposing letterPool size globally.
        # We'll proceed and rely on the game's own checks. If it fails, feedback will indicate.

        confirm_exchange_button_locator.click()

        # Assertions for after confirming exchange:
        # Feedback area shows success and penalty
        # Example: "1 tile(s) exchanged. 3 new tile(s) added to your hand. Time penalty: +15 seconds."
        expect(feedback_area_locator).to_contain_text("tile(s) exchanged.")
        expect(feedback_area_locator).to_contain_text("new tile(s) added")
        expect(feedback_area_locator).to_contain_text("Time penalty:")

        # Number of tiles in hand changed (1 removed, 3 added = net +2)
        # This assumes the letter pool had enough letters.
        # INITIAL_HAND_SIZE (16) - 1 (exchanged) + 3 (drawn) = 18
        # This check is highly dependent on the letter pool having enough letters.
        # A more robust check might be to see if the count simply changed, or if specific tiles were added/removed.
        # For now, we expect it to be initial_tile_count - 1 + 3 if successful
        # This might be flaky if pool doesn't have 3 letters.
        # The game's confirmLetterExchange has a check:
        # `if (letterPool.length < requiredLettersForExchange && letterPool.length < selectedTiles.length)`
        # If this check fails, it calls `exitExchangeMode(true)` and feedback "Not enough letters..."
        # So, we might get that feedback instead if pool is small.

        # Let's check if the feedback indicates success or failure of the exchange itself
        exchange_successful = "Not enough letters" not in feedback_area_locator.input_value()

        if exchange_successful:
             expect(tile_container_locator.locator(".letter-tile")).to_have_count(initial_tile_count + 2, timeout=1000)
        else:
            print(f"Exchange could not be confirmed due to: {feedback_area_locator.input_value()}")
            # If exchange failed due to lack of letters, it would have called exitExchangeMode(true)
            expect(exchange_button_locator).to_be_visible()
            expect(exchange_button_locator).to_be_disabled() # Because pool is < 3
            expect(confirm_exchange_button_locator).to_be_hidden()
            expect(cancel_exchange_button_locator).to_be_hidden()


    print("\n--- Exchange Letters button test passed (or skipped confirm if no tiles) ---")
    pass
