#!/usr/bin/env node
/* ===== Fallback Test Runner (No Dependencies) ===== */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class FallbackTestRunner {
    constructor() {
        this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    }

    async openBrowser() {
        const testRunnerPath = path.join(__dirname, 'test-runner.html');
        const testRunnerUrl = 'file://' + testRunnerPath.replace(/\\/g, '/');
        
        console.log('🧪 Opening test-runner.html in your default browser...');
        console.log('📍 URL:', testRunnerUrl);
        console.log('');
        console.log('⚠️  This is a fallback method. For automated CLI testing, install puppeteer:');
        console.log('   npm install puppeteer');
        console.log('');
        console.log('🔍 Check your browser for test results.');
        
        // Try to open browser on different platforms
        let command, args;
        
        switch (process.platform) {
            case 'darwin':
                command = 'open';
                args = [testRunnerUrl];
                break;
            case 'win32':
                command = 'start';
                args = ['', testRunnerUrl];
                break;
            default:
                command = 'xdg-open';
                args = [testRunnerUrl];
                break;
        }
        
        try {
            spawn(command, args, { detached: true, stdio: 'ignore' });
        } catch (error) {
            console.log('❌ Could not open browser automatically.');
            console.log('📋 Please manually open: ' + testRunnerUrl);
        }
    }

    async start() {
        await this.openBrowser();
        console.log('');
        console.log('✨ For full CLI integration with exit codes and CI support,');
        console.log('   install puppeteer and run "npm test" again.');
        process.exit(0);
    }
}

if (require.main === module) {
    const runner = new FallbackTestRunner();
    runner.start().catch(error => {
        console.error('Failed to start fallback test runner:', error);
        process.exit(1);
    });
}

module.exports = FallbackTestRunner;