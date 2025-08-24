#!/usr/bin/env node
/* ===== CLI Test Runner using Headless Browser ===== */

const fs = require('fs');
const path = require('path');

class CLITestRunner {
    constructor() {
        this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
        this.watch = process.argv.includes('--watch') || process.argv.includes('-w');
        this.puppeteer = null;
        this.browser = null;
        this.page = null;
    }

    async setupBrowser() {
        try {
            this.puppeteer = require('puppeteer');
        } catch (error) {
            console.log('⚠️  Puppeteer not available, falling back to browser-based testing...');
            const FallbackTestRunner = require('./fallback-test-runner');
            const fallback = new FallbackTestRunner();
            await fallback.start();
            return;
        }

        this.browser = await this.puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Handle console output from the browser
        this.page.on('console', msg => {
            const type = msg.type();
            const args = msg.args();
            
            if (type === 'log' && args.length > 0) {
                args[0].jsonValue().then(text => {
                    if (typeof text === 'string') {
                        if (text.startsWith('✅') || text.startsWith('❌') || text.startsWith('📋') || text.startsWith('🧪')) {
                            console.log(text);
                        } else if (this.verbose || text.includes('failed') || text.includes('error')) {
                            console.log('Browser Log:', text);
                        }
                    }
                });
            } else if (type === 'error') {
                args[0].jsonValue().then(text => console.error('Browser Error:', text));
            } else if (type === 'warn') {
                args[0].jsonValue().then(text => console.warn('Browser Warn:', text));
            }
        });

        // Handle errors
        this.page.on('pageerror', error => {
            console.error('Page Error:', error.message);
        });
    }

    async createTestHTML() {
        const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SlimeWorld CLI Tests</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        #testOutput { white-space: pre-line; }
    </style>
</head>
<body>
    <h1>SlimeWorld Test Suite</h1>
    <div id="testOutput"></div>
    <canvas id="canvas" width="800" height="600"></canvas>
    <canvas id="tileCanvas" width="32" height="32"></canvas>
    <canvas id="miniView" width="100" height="100"></canvas>
    
    <!-- Elements that UI functions might reference -->
    <div id="notifications"></div>
    <div id="inspector"></div>
    <div id="rtStats"></div>
    <div id="inspectorAge"></div>
    <div id="inspectorKids"></div>
    <div id="stats"></div>
    <div id="inspectorActions"></div>
    <div id="tilePreview"></div>
    <div id="overlay"></div>
    <div id="alert" style="display: none;"></div>
    <button id="btnPause">Pause</button>
    <input id="seed" value="1337" />
    <select id="worldSize"><option value="128x72">128x72</option></select>
    <div id="statColonies">0</div>
    <div id="statBiomass">0</div>
    <div id="statTickRate">0</div>
    <div id="statMaxGen">0</div>
    <div id="breakdownList"></div>
    <div id="traits"></div>
    
    <!-- Load all source files -->
    <script src="../src/js/utils.js"></script>
    <script src="../src/js/world.js"></script>
    <script src="../src/js/archetypes.js"></script>
    <script src="../src/js/colonies.js"></script>
    <script src="../src/js/environment.js"></script>
    <script src="../src/js/ecosystem.js"></script>
    <script src="../src/js/renderer.js"></script>
    <script src="../src/js/ui.js"></script>
    <script src="../src/js/trait-system.js"></script>
    <script src="../src/js/extended-archetypes.js"></script>
    <script src="../src/js/integration.js"></script>
    <script src="../src/js/diagnostics.js"></script>
    
    <!-- Setup test environment globals -->
    <script>
        // Ensure global variables needed by tests exist
        if (typeof stepping === 'undefined') {
            window.stepping = false;
        }
        if (typeof clearOverlayCache === 'undefined') {
            window.clearOverlayCache = function() {
                needRedraw = true;
            };
        }
    </script>
    
    <!-- Load all test files -->
    <script src="test-utils.js"></script>
    <script src="test-core.js"></script>
    <script src="test-colonies.js"></script>
    <script src="test-ecosystem.js"></script>
    <script src="test-environment.js"></script>
    <script src="test-bugfixes.js"></script>
    <script src="test-ui.js"></script>
    <script src="test-signals.js"></script>
    <script src="test-colony-states.js"></script>
    <script src="test-trait-system.js"></script>

    <script>
        // Override console.log to capture test output
        const originalLog = console.log;
        const testOutput = document.getElementById('testOutput');
        
        console.log = function(...args) {
            const message = args.join(' ');
            testOutput.textContent += message + '\\n';
            originalLog.apply(console, args);
        };

        // Run all tests
        async function runAllTests() {
            console.log('🧪 SlimeWorld Test Suite');
            console.log('========================\\n');

            let totalPassed = 0;
            let totalFailed = 0;

            const testSuites = [
                { name: 'Core Tests', fn: runCoreTests },
                { name: 'Colony Tests', fn: runColonyTests },
                { name: 'Ecosystem Tests', fn: runEcosystemTests },
                { name: 'Environment Tests', fn: runEnvironmentTests },
                { name: 'Bug Fix Tests', fn: runBugFixTests },
                { name: 'UI Tests', fn: runUITests },
                { name: 'Signal Tests', fn: runSignalTests },
                { name: 'Colony State Tests', fn: runColonyStateTests },
                { name: 'Trait System Tests', fn: runTraitSystemTests }
            ].filter(suite => typeof suite.fn === 'function');

            for (const suite of testSuites) {
                console.log('📋 Running ' + suite.name + '...');
                try {
                    const results = await suite.fn();
                    totalPassed += results.passed;
                    totalFailed += results.failed;
                    
                    if (results.failed > 0) {
                        console.log('❌ ' + suite.name + ': ' + results.passed + ' passed, ' + results.failed + ' failed');
                        if (results.errors && results.errors.length > 0) {
                            results.errors.forEach(error => {
                                console.log('   - ' + error.test + ': ' + error.error.message);
                            });
                        } else {
                            console.log('   (Error details not captured - check browser console)');
                        }
                    } else {
                        console.log('✅ ' + suite.name + ': All ' + results.passed + ' tests passed');
                    }
                } catch (error) {
                    console.log('💥 ' + suite.name + ' failed to run: ' + error.message);
                    totalFailed++;
                }
                console.log('');
            }

            console.log('📊 Test Summary');
            console.log('================');
            console.log('✅ Passed: ' + totalPassed);
            console.log('❌ Failed: ' + totalFailed);
            console.log('📈 Success Rate: ' + (totalPassed + totalFailed > 0 ? Math.round(100 * totalPassed / (totalPassed + totalFailed)) : 0) + '%');

            // Return results for Node.js
            window.testResults = {
                passed: totalPassed,
                failed: totalFailed,
                success: totalFailed === 0
            };

            if (totalFailed > 0) {
                console.log('\\n❌ Some tests failed!');
            } else {
                console.log('\\n🎉 All tests passed!');
            }
        }

        // Auto-run tests when page loads
        window.addEventListener('load', runAllTests);
    </script>
</body>
</html>`;

        const testFilePath = path.join(__dirname, 'cli-test-page.html');
        fs.writeFileSync(testFilePath, testHTML);
        return testFilePath;
    }

    async runTests() {
        await this.setupBrowser();
        
        const testFilePath = await this.createTestHTML();
        const fileUrl = 'file://' + testFilePath.replace(/\\/g, '/');
        
        await this.page.goto(fileUrl);
        
        // Wait for tests to complete
        await this.page.waitForFunction(
            () => window.testResults !== undefined,
            { timeout: 30000 }
        );

        const results = await this.page.evaluate(() => window.testResults);
        
        // Clean up
        fs.unlinkSync(testFilePath);
        await this.browser.close();

        return results;
    }

    async watchMode() {
        console.log('👀 Watch mode enabled - tests will re-run when files change\\n');
        
        const watchDirs = [
            path.join(__dirname, '../src/js'),
            __dirname
        ];

        // Run tests initially
        let results = await this.runTests();

        // Set up file watchers
        for (const dir of watchDirs) {
            if (fs.existsSync(dir)) {
                fs.watch(dir, { recursive: false }, async (eventType, filename) => {
                    if (filename && filename.endsWith('.js')) {
                        console.log('\\n📁 File changed: ' + filename);
                        console.log('🔄 Re-running tests...\\n');
                        
                        try {
                            results = await this.runTests();
                        } catch (error) {
                            console.error('Error re-running tests:', error.message);
                        }
                    }
                });
            }
        }

        // Keep process alive
        setInterval(() => {}, 1000);
    }

    async start() {
        try {
            if (this.watch) {
                await this.watchMode();
            } else {
                const results = await this.runTests();
                process.exit(results.success ? 0 : 1);
            }
        } catch (error) {
            console.error('Failed to run tests:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new CLITestRunner();
    runner.start().catch(error => {
        console.error('Failed to start test runner:', error);
        process.exit(1);
    });
}

module.exports = CLITestRunner;