// tests/test-suite.js - Automated Test Suite Registration Module

function getTestSuiteSummary() {
    return {
        totalSuites: 7,
        modules: [
            '/import',
            '/data-quality',
            '/energy',
            '/agnes',
            '/export',
            '/ui',
            '/tests'
        ]
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getTestSuiteSummary };
}
