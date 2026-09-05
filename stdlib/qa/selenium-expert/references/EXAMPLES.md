# Selenium Expert — Implementation Examples

Reference material for the `selenium-expert` skill. See [SKILL.md](../SKILL.md).

## Implementation Examples

### Basic WebDriver Setup (Python)

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import pytest

class TestLogin:
    @pytest.fixture(scope="function")
    def driver(self):
        """Setup and teardown WebDriver"""
        driver = webdriver.Chrome()
        driver.implicitly_wait(10)
        driver.maximize_window()
        yield driver
        driver.quit()

    def test_successful_login(self, driver):
        """Test successful login with valid credentials"""
        driver.get("https://example.com/login")

        # Find and fill elements
        email_input = driver.find_element(By.NAME, "email")
        password_input = driver.find_element(By.NAME, "password")
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")

        email_input.send_keys("user@example.com")
        password_input.send_keys("SecurePass123")
        submit_button.click()

        # Wait for redirect
        WebDriverWait(driver, 10).until(
            EC.url_contains("dashboard")
        )

        # Verify login success
        assert "dashboard" in driver.current_url
        user_menu = driver.find_element(By.CLASS_NAME, "user-menu")
        assert user_menu.is_displayed()

    def test_invalid_credentials(self, driver):
        """Test login with invalid credentials"""
        driver.get("https://example.com/login")

        driver.find_element(By.NAME, "email").send_keys("invalid@example.com")
        driver.find_element(By.NAME, "password").send_keys("WrongPassword")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # Wait for error message
        error_message = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.CLASS_NAME, "error-message"))
        )

        assert error_message.is_displayed()
        assert "Invalid" in error_message.text
```

### Page Object Model (Python)

```python

# pages/base_page.py
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def find_element(self, locator):
        return self.wait.until(EC.presence_of_element_located(locator))

    def find_elements(self, locator):
        return self.driver.find_elements(*locator)

    def click(self, locator):
        element = self.wait.until(EC.element_to_be_clickable(locator))
        element.click()

    def type(self, locator, text):
        element = self.find_element(locator)
        element.clear()
        element.send_keys(text)

    def get_text(self, locator):
        element = self.find_element(locator)
        return element.text

    def is_displayed(self, locator):
        try:
            element = self.find_element(locator)
            return element.is_displayed()
        except TimeoutException:
            return False

    def wait_for_url_contains(self, text):
        self.wait.until(EC.url_contains(text))

    def execute_script(self, script, *args):
        return self.driver.execute_script(script, *args)

# pages/login_page.py
from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class LoginPage(BasePage):
    # Locators
    EMAIL_INPUT = (By.NAME, "email")
    PASSWORD_INPUT = (By.NAME, "password")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    ERROR_MESSAGE = (By.CLASS_NAME, "error-message")
    REMEMBER_CHECKBOX = (By.ID, "remember-me")

    def __init__(self, driver):
        super().__init__(driver)
        self.url = "https://example.com/login"

    def open(self):
        self.driver.get(self.url)

    def login(self, email, password):
        self.type(self.EMAIL_INPUT, email)
        self.type(self.PASSWORD_INPUT, password)
        self.click(self.SUBMIT_BUTTON)

    def get_error_message(self):
        return self.get_text(self.ERROR_MESSAGE)

    def is_error_displayed(self):
        return self.is_displayed(self.ERROR_MESSAGE)

    def check_remember_me(self):
        self.click(self.REMEMBER_CHECKBOX)

# pages/dashboard_page.py
from selenium.webdriver.common.by import By
from pages.base_page import BasePage

class DashboardPage(BasePage):
    USER_MENU = (By.CLASS_NAME, "user-menu")
    WELCOME_MESSAGE = (By.TAG_NAME, "h1")
    LOGOUT_BUTTON = (By.XPATH, "//button[contains(text(), 'Logout')]")

    def is_loaded(self):
        self.wait_for_url_contains("dashboard")
        return self.is_displayed(self.USER_MENU)

    def get_welcome_message(self):
        return self.get_text(self.WELCOME_MESSAGE)

    def logout(self):
        self.click(self.USER_MENU)
        self.click(self.LOGOUT_BUTTON)

# tests/test_login_pom.py
import pytest
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage

class TestLoginWithPOM:
    @pytest.fixture(scope="function")
    def driver(self):
        driver = webdriver.Chrome()
        driver.implicitly_wait(10)
        yield driver
        driver.quit()

    def test_successful_login_flow(self, driver):
        login_page = LoginPage(driver)
        dashboard_page = DashboardPage(driver)

        login_page.open()
        login_page.login("user@example.com", "SecurePass123")

        assert dashboard_page.is_loaded()
        assert "Welcome" in dashboard_page.get_welcome_message()
```

### Java WebDriver Example

```java
// BasePage.java
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public class BasePage {
    protected WebDriver driver;
    protected WebDriverWait wait;

    public BasePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    protected WebElement findElement(By locator) {
        return wait.until(ExpectedConditions.presenceOfElementLocated(locator));
    }

    protected void click(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    }

    protected void type(By locator, String text) {
        WebElement element = findElement(locator);
        element.clear();
        element.sendKeys(text);
    }

    protected String getText(By locator) {
        return findElement(locator).getText();
    }

    protected boolean isDisplayed(By locator) {
        try {
            return findElement(locator).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }
}

// LoginPage.java
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class LoginPage extends BasePage {
    private static final By EMAIL_INPUT = By.name("email");
    private static final By PASSWORD_INPUT = By.name("password");
    private static final By SUBMIT_BUTTON = By.cssSelector("button[type='submit']");
    private static final By ERROR_MESSAGE = By.className("error-message");

    public LoginPage(WebDriver driver) {
        super(driver);
    }

    public void open() {
        driver.get("https://example.com/login");
    }

    public void login(String email, String password) {
        type(EMAIL_INPUT, email);
        type(PASSWORD_INPUT, password);
        click(SUBMIT_BUTTON);
    }

    public String getErrorMessage() {
        return getText(ERROR_MESSAGE);
    }

    public boolean isErrorDisplayed() {
        return isDisplayed(ERROR_MESSAGE);
    }
}

// LoginTest.java
import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import static org.junit.jupiter.api.Assertions.*;

public class LoginTest {
    private WebDriver driver;
    private LoginPage loginPage;

    @BeforeEach
    public void setUp() {
        driver = new ChromeDriver();
        driver.manage().window().maximize();
        loginPage = new LoginPage(driver);
    }

    @Test
    public void testSuccessfulLogin() {
        loginPage.open();
        loginPage.login("user@example.com", "SecurePass123");

        assertTrue(driver.getCurrentUrl().contains("dashboard"));
    }

    @Test
    public void testInvalidCredentials() {
        loginPage.open();
        loginPage.login("invalid@example.com", "WrongPassword");

        assertTrue(loginPage.isErrorDisplayed());
        assertTrue(loginPage.getErrorMessage().contains("Invalid"));
    }

    @AfterEach
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
```

### Selenium Grid Configuration

```yaml
# docker-compose.yml for Selenium Grid
version: '3'
services:
  selenium-hub:
    image: selenium/hub:latest
    container_name: selenium-hub
    ports:
      - '4444:4444'
      - '4442:4442'
      - '4443:4443'

  chrome:
    image: selenium/node-chrome:latest
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
    ports:
      - '5900:5900'

  firefox:
    image: selenium/node-firefox:latest
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
    ports:
      - '5901:5900'
```

```python

# Using Selenium Grid
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

# Connect to Grid Hub
driver = webdriver.Remote(
    command_executor='http://localhost:4444/wd/hub',
    desired_capabilities=DesiredCapabilities.CHROME
)

# Run tests
driver.get("https://example.com")

# ... test code ...

driver.quit()
```

### Advanced Waits and Actions

```python
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys

# Explicit Wait Examples
def wait_for_element_visible(driver, locator, timeout=10):
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.visibility_of_element_located(locator))

def wait_for_element_clickable(driver, locator, timeout=10):
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.element_to_be_clickable(locator))

def wait_for_text_in_element(driver, locator, text, timeout=10):
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.text_to_be_present_in_element(locator, text))

# Actions API Examples
def perform_hover(driver, element):
    actions = ActionChains(driver)
    actions.move_to_element(element).perform()

def perform_drag_and_drop(driver, source, target):
    actions = ActionChains(driver)
    actions.drag_and_drop(source, target).perform()

def perform_double_click(driver, element):
    actions = ActionChains(driver)
    actions.double_click(element).perform()

def perform_context_click(driver, element):
    actions = ActionChains(driver)
    actions.context_click(element).perform()

def send_keys_with_modifier(driver, element, text):
    actions = ActionChains(driver)
    actions.key_down(Keys.CONTROL)\
           .send_keys('a')\
           .key_up(Keys.CONTROL)\
           .send_keys(text)\
           .perform()
```
