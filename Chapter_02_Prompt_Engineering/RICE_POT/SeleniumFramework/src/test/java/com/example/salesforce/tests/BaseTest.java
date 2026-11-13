package com.example.salesforce.tests;

import com.example.salesforce.pages.LoginPage;
import java.time.Duration;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebDriverException;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.SkipException;

public abstract class BaseTest {
    protected static final String LOGIN_URL = "https://login.salesforce.com/?locale=in";
    protected WebDriver driver;
    protected LoginPage loginPage;

    @BeforeClass
    public void setUp() {
        if (!shouldStartBrowser()) {
            throw new SkipException("Set SALESFORCE_USERNAME and SALESFORCE_PASSWORD to run the valid-login test.");
        }

        ChromeOptions options = new ChromeOptions();
        options.addArguments("--window-size=1440,1000");

        try {
            driver = new ChromeDriver(options);
            driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(45));
            loginPage = new LoginPage(driver);
            driver.get(LOGIN_URL);
            loginPage.waitForLoginForm();
        } catch (WebDriverException exception) {
            closeDriverAfterSetupFailure(exception);
            throw new IllegalStateException("Unable to start headed Chrome or load the Salesforce login form.", exception);
        }
    }

    protected boolean shouldStartBrowser() {
        return true;
    }

    @AfterClass(alwaysRun = true)
    public void tearDown() {
        if (driver != null) {
            try {
                driver.quit();
            } catch (WebDriverException exception) {
                throw new IllegalStateException("Unable to close the Chrome WebDriver session.", exception);
            } finally {
                driver = null;
            }
        }
    }

    private void closeDriverAfterSetupFailure(WebDriverException setupException) {
        if (driver != null) {
            try {
                driver.quit();
            } catch (WebDriverException teardownException) {
                setupException.addSuppressed(teardownException);
            } finally {
                driver = null;
            }
        }
    }
}
