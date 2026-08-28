/** @type {import('jest').Config} */
export default {
    testEnvironment: "node",
    // No transform: files run as native ESM via Node's --experimental-vm-modules
    // flag (see the "test" script in package.json), not through Babel/ts-jest.
    transform: {},
    testMatch: ["**/tests/**/*.test.js"],
    // Tests share one mongodb-memory-server instance and one imported Express
    // app (see tests/setup.js) — verbose output makes it obvious which test
    // in that shared state actually failed.
    verbose: true,
};