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
    # If both assertions pass, it means script.js is running and logging.
    # The next step would be to restore script.js and debug its internal logic.
    pass
