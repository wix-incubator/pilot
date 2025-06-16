export const config = {
  runner: "local",
  specs: ["./**/*.test.ts"],
  maxInstances: 1,

  capabilities: [
    {
      platformName: "iOS",
      "appium:deviceName": "iPhone 16 Pro",
      "appium:automationName": "XCUITest",
      "appium:app":
        "/Users/lironsh/Development/pilot/packages/drivers/appium/NewApp/ios/build/simulator/NewApp.app",
    },
  ],

  logLevel: "warn",
  bail: 0,
  baseUrl: "http://localhost",
  waitforTimeout: 10000,
  connectionRetryTimeout: 900000,
  connectionRetryCount: 3,

  services: ["appium"],
  appium: {
    command: "appium",
  },

  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 600000,
  },
};
