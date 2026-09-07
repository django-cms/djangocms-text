module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/js/setup-tests.js'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/tests/js/__mocks__/styleMock.js',
        '\\.(gif|ttf|eot|svg)$': '<rootDir>/tests/js/__mocks__/fileMock.js'
    },
    testMatch: [
        '**/tests/js/**/*.test.js'
    ],
    // marked is ESM-only; let babel-jest transform it for Jest's CommonJS
    // runtime while keeping the rest of node_modules excluded.
    transformIgnorePatterns: ['/node_modules/(?!marked/)'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'private/js/**/*.js',
        '!private/js/ckeditor4/**',
        '!private/js/ckeditor4_plugins/**',
        '!private/js/ckeditor5_plugins/**',
        '!**/node_modules/**'
    ]
};
