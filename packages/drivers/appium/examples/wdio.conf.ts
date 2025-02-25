import path from "path";

export const config = {
  runner: "local",
  specs: ["./**/*.test.ts"],
  maxInstances: 1,

  capabilities: [
    {
      platformName: "iOS",
      "appium:deviceName": "iPhone 15 Pro",
      "appium:automationName": "XCUITest",
      "appium:app": path.resolve(
        __dirname,
        "../../detox/ExampleApp/ios/build/Build/Products/Release-iphonesimulator/ExampleApp.app",
      ),
    },
  ],

  logLevel: "info",
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
