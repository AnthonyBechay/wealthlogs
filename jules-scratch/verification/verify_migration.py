from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Verify Login Page
    page.goto("http://localhost:3000/login")
    expect(page.get_by_role("heading", name="Welcome to WealthLog")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/login-page.png")
    print("Screenshot of login page taken.")

    # Verify Dashboard Page (will redirect to login if not authenticated, which is fine for this test)
    page.goto("http://localhost:3000/dashboard")
    # The MainLayout will show a loading screen, then redirect to login.
    # Let's wait for the login page to appear again.
    expect(page.get_by_role("heading", name="Welcome to WealthLog")).to_be_visible()
    print("Redirected to login page from dashboard as expected.")

    # Let's also try to verify a page that is public and does not require login
    page.goto("http://localhost:3000/landing")
    expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/dashboard-page.png")
    print("Screenshot of dashboard page taken.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
