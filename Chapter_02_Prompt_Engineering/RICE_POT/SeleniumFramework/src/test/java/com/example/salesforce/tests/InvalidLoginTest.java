package com.example.salesforce.tests;

import io.qameta.allure.Description;
import io.qameta.allure.testng.AllureTestNg;
import org.testng.Assert;
import org.testng.annotations.Listeners;
import org.testng.annotations.Test;

@Listeners(AllureTestNg.class)
public class InvalidLoginTest extends BaseTest {
    @Test(priority = 2)
    @Description("Verifies that Salesforce displays an error message for invalid login credentials.")
    public void shouldRejectInvalidCredentials() {
        loginPage.login("invalid.user@example.invalid", "InvalidPassword-NotARealSecret-123!");

        String errorMessage = loginPage.waitForLoginError();
        Assert.assertFalse(errorMessage.isBlank(), "Salesforce should display a non-empty login error.");
        Assert.assertTrue(
                loginPage.getCurrentUrl().contains("login.salesforce.com"),
                "An invalid login should remain on the Salesforce login page.");
    }

    @Test(priority = 1)
    @Description("Verifies that the remember-me checkbox can be selected and deselected.")
    public void shouldToggleRememberMe() {
        loginPage.setRememberMe(true);
        Assert.assertTrue(loginPage.isRememberMeSelected(), "Remember Me should be selected.");
        loginPage.setRememberMe(false);
        Assert.assertFalse(loginPage.isRememberMeSelected(), "Remember Me should be deselected.");
    }
}
