package com.example.salesforce.pages;

import java.time.Duration;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class LoginPage {
    private static final Duration WAIT_TIMEOUT = Duration.ofSeconds(15);

    private final WebDriver driver;
    private final WebDriverWait wait;

    @FindBy(xpath = "//input[@id='username']")
    private WebElement usernameInput;

    @FindBy(xpath = "//input[@id='password']")
    private WebElement passwordInput;

    @FindBy(xpath = "//input[@id='Login']")
    private WebElement loginButton;

    @FindBy(xpath = "//input[@id='rememberUn']")
    private WebElement rememberMeCheckbox;

    @FindBy(xpath = "//div[@id='error']")
    private WebElement loginError;

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, WAIT_TIMEOUT);
        PageFactory.initElements(driver, this);
    }

    public void waitForLoginForm() {
        wait.until(ExpectedConditions.visibilityOf(usernameInput));
        wait.until(ExpectedConditions.elementToBeClickable(loginButton));
    }

    public void login(String username, String password) {
        wait.until(ExpectedConditions.visibilityOf(usernameInput)).clear();
        usernameInput.sendKeys(username);
        wait.until(ExpectedConditions.elementToBeClickable(loginButton)).click();
        wait.until(ExpectedConditions.visibilityOf(passwordInput)).clear();
        passwordInput.sendKeys(password);
        wait.until(ExpectedConditions.elementToBeClickable(loginButton)).click();
    }

    public void setRememberMe(boolean selected) {
        WebElement checkbox = wait.until(ExpectedConditions.elementToBeClickable(rememberMeCheckbox));
        if (checkbox.isSelected() != selected) {
            checkbox.click();
        }
    }

    public boolean isRememberMeSelected() {
        return wait.until(ExpectedConditions.visibilityOf(rememberMeCheckbox)).isSelected();
    }

    public String waitForLoginError() {
        try {
            return wait.until(driver -> {
                String message = loginError.getText();
                return loginError.isDisplayed() && !message.isBlank() ? message : null;
            });
        } catch (TimeoutException exception) {
            throw new AssertionError("Salesforce did not display a login error after invalid credentials.", exception);
        }
    }

    public String getCurrentUrl() {
        return driver.getCurrentUrl();
    }
}
