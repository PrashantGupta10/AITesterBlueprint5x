package com.example.salesforce.tests;

import io.qameta.allure.Description;
import io.qameta.allure.testng.AllureTestNg;
import org.testng.Assert;
import org.testng.annotations.Listeners;
import org.testng.annotations.Test;

@Listeners(AllureTestNg.class)
public class ValidLoginTest extends BaseTest {
    @Override
    protected boolean shouldStartBrowser() {
        String username = System.getenv("SALESFORCE_USERNAME");
        String password = System.getenv("SALESFORCE_PASSWORD");
        return username != null && !username.isBlank() && password != null && !password.isBlank();
    }

    @Test(priority = 2)
    @Description("Verifies a valid Salesforce login using credentials provided through environment variables.")
    public void shouldAuthenticateWithValidCredentials() {
        String username = System.getenv("SALESFORCE_USERNAME");
        String password = System.getenv("SALESFORCE_PASSWORD");

        loginPage.login(username, password);
        Assert.assertFalse(
                loginPage.getCurrentUrl().contains("login.salesforce.com"),
                "A successful login should navigate away from the Salesforce login page.");
    }
}
