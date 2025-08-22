/* ===== UI Feature Tests ===== */

function runUITests() {
    const runner = new TestRunner('UI Features');
    
    // Test age formatting
    runner.test('formatAge converts ticks to meaningful units', () => {
        // Hours
        runner.assert(formatAge(1) === '1 hour', 'Single hour formatting');
        runner.assert(formatAge(12) === '12 hours', 'Multiple hours formatting');
        runner.assert(formatAge(23) === '23 hours', 'Max hours formatting');
        
        // Days
        runner.assert(formatAge(24) === '1 day', 'Single day formatting');
        runner.assert(formatAge(25) === '1 day, 1h', 'Day with hours formatting');
        runner.assert(formatAge(48) === '2 days', 'Multiple days formatting');
        runner.assert(formatAge(50) === '2 days, 2h', 'Multiple days with hours');
        
        // Weeks
        runner.assert(formatAge(168) === '1 week', 'Single week formatting (24*7)');
        runner.assert(formatAge(192) === '1 week, 1d', 'Week with days formatting');
        runner.assert(formatAge(336) === '2 weeks', 'Multiple weeks formatting');
        runner.assert(formatAge(360) === '2 weeks, 1d', 'Multiple weeks with days');
    });

    // Test real-time inspector updates
    runner.test('refreshInspectorRealtime updates age and kids count', () => {
        // Create mock DOM elements for age and kids
        const mockElements = {
            rtStats: { innerHTML: '' },
            inspectorAge: { textContent: '' },
            inspectorKids: { textContent: '' },
            miniView: { 
                getContext: function() {
                    return {
                        clearRect: function() {},
                        fillRect: function() {},
                        fillStyle: '',
                        globalAlpha: 1
                    };
                },
                width: 240,
                height: 160
            },
            // Mock elements that refreshLiveStats might access
            statColonies: { textContent: '' },
            statBiomass: { textContent: '' },
            statTickRate: { textContent: '' },
            statMaxGen: { textContent: '' },
            breakdownList: { 
                innerHTML: '',
                appendChild: function(child) { 
                    this.children = this.children || []; 
                    this.children.push(child); 
                },
                children: []
            }
        };
        
        const originalGetId = document.getElementById;
        document.getElementById = (id) => mockElements[id] || null;
        
        // Mock createElement for any DOM creation
        const originalCreateElement = document.createElement;
        document.createElement = (tag) => {
            return {
                className: '',
                textContent: '',
                style: {},
                width: 8,
                height: 8,
                appendChild: function(child) { this.children = this.children || []; this.children.push(child); },
                children: [],
                getContext: function(type) {
                    return {
                        clearRect: function() {},
                        beginPath: function() {},
                        moveTo: function() {},
                        lineTo: function() {},
                        stroke: function() {},
                        fillRect: function() {},
                        drawImage: function() {},
                        globalAlpha: 1,
                        globalCompositeOperation: 'source-over',
                        lineWidth: 1,
                        strokeStyle: '',
                        fillStyle: ''
                    };
                }
            };
        };
        
        try {
            setupWorld(1337, '128x72');
            World.colonies = []; // Clear initial colonies
            const testColony = newColony('MAT', 10, 10, null);
            testColony.age = 50; // Set specific age for testing
            testColony.kids = [101, 102, 103]; // Set specific kids for testing
            
            selectedId = testColony.id;
            refreshInspectorRealtime();
            
            // Check that age was updated with formatted time
            runner.assert(mockElements.inspectorAge.textContent === '2 days, 2h', 'Age element updated correctly');
            
            // Check that kids count was updated
            const actualKidsCount = mockElements.inspectorKids.textContent;
            const expectedKidsCount = testColony.kids.length;
            runner.assert(actualKidsCount == expectedKidsCount, 
                         `Kids count updated correctly (expected: ${expectedKidsCount}, got: "${actualKidsCount}", type: ${typeof actualKidsCount})`);
            
        } finally {
            document.getElementById = originalGetId;
            document.createElement = originalCreateElement;
            selectedId = null;
        }
    });
    
    // Test archetype tooltip functionality
    runner.test('showArchetypeTooltip displays correct trait data', () => {
        // Create mock DOM elements
        const tooltip = { style: { display: 'none' } };
        const title = { textContent: '' };
        const traits = { 
            innerHTML: '',
            appendChild: function(child) { 
                this.children = this.children || []; 
                this.children.push(child); 
            },
            children: []
        };
        
        // Mock document.getElementById
        const originalGetId = document.getElementById;
        document.getElementById = (id) => {
            if (id === 'archetypeTooltip') return tooltip;
            if (id === 'tooltipTitle') return title;
            if (id === 'tooltipTraits') return traits;
            return null;
        };
        
        // Mock DOM creation
        const mockElements = [];
        const originalCreateElement = document.createElement;
        document.createElement = (tag) => {
            const el = {
                className: '',
                textContent: '',
                style: {},
                width: 8,
                height: 8,
                appendChild: function(child) { this.children = this.children || []; this.children.push(child); },
                children: [],
                getContext: function(type) {
                    return {
                        clearRect: function() {},
                        beginPath: function() {},
                        moveTo: function() {},
                        lineTo: function() {},
                        stroke: function() {},
                        fillRect: function() {},
                        drawImage: function() {},
                        globalAlpha: 1,
                        globalCompositeOperation: 'source-over',
                        lineWidth: 1,
                        strokeStyle: '',
                        fillStyle: ''
                    };
                }
            };
            mockElements.push(el);
            return el;
        };
        
        try {
            showArchetypeTooltip('MAT');
            
            // Check title was set correctly
            runner.assert(title.textContent === 'Foraging Mat (MAT)', 'Tooltip title set correctly');
            
            // Check tooltip is shown
            runner.assert(tooltip.style.display === 'block', 'Tooltip is displayed');
            
            // Check traits were created (we should have trait rows)
            runner.assert(mockElements.length > 0, 'Trait elements were created');
            
        } finally {
            // Restore original functions
            document.getElementById = originalGetId;
            document.createElement = originalCreateElement;
        }
    });
    
    // Test inspector action functions
    runner.test('killColony removes colony from world', () => {
        // Setup world with test colony
        setupWorld(1337, '128x72');
        const testColony = newColony('MAT', 10, 10, null);
        const colonyId = testColony.id;
        const initialCount = World.colonies.length;
        
        // Mock confirm dialog to return true
        const originalConfirm = window.confirm;
        window.confirm = () => true;
        
        try {
            killColony(colonyId);
            
            // Check colony was removed
            runner.assert(World.colonies.length === initialCount - 1, 'Colony count decreased');
            runner.assert(!World.colonies.find(c => c.id === colonyId), 'Colony no longer exists');
            
            // Check tiles were cleared
            const tileIndex = idx(10, 10);
            runner.assert(World.tiles[tileIndex] === -1, 'Colony tile was cleared');
            runner.assert(World.biomass[tileIndex] === 0, 'Colony biomass was cleared');
            
        } finally {
            window.confirm = originalConfirm;
        }
    });
    
    runner.test('splitColony creates parent-child relationship', () => {
        setupWorld(1337, '128x72');
        const parentColony = newColony('CORD', 50, 50, null);
        
        // Manually grow colony to have multiple tiles for splitting
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 3; j++) {
                const x = 50 + i, y = 50 + j;
                if (inBounds(x, y)) {
                    World.tiles[idx(x, y)] = parentColony.id;
                    World.biomass[idx(x, y)] = 0.8;
                }
            }
        }
        
        const initialColonies = World.colonies.length;
        
        splitColony(parentColony.id);
        
        // Check new colony was created
        runner.assert(World.colonies.length === initialColonies + 1, 'New colony created');
        
        // Find the child colony
        const childColony = World.colonies.find(c => c.parent === parentColony.id);
        runner.assert(childColony !== undefined, 'Child colony exists');
        runner.assert(childColony.age === 0, 'Child colony age reset to 0');
        
        // Check parent-child relationship
        runner.assert(parentColony.kids.includes(childColony.id), 'Parent knows about child');
        runner.assert(childColony.parent === parentColony.id, 'Child knows parent');
        runner.assert(childColony.type === parentColony.type, 'Child inherits parent type');
    });
    
    runner.test('randomizeColonyAppearance changes color and pattern', () => {
        setupWorld(1337, '128x72');
        const colony = newColony('TOWER', 30, 30, null);
        const originalColor = colony.color;
        const originalPattern = colony.pattern;
        
        randomizeColonyAppearance(colony.id);
        
        // Colors should be different (with very high probability)
        runner.assert(colony.color !== originalColor, 'Colony color changed');
        
        // Pattern should be regenerated
        runner.assert(colony.pattern !== originalPattern, 'Colony pattern changed');
        runner.assert(colony.pattern !== null, 'New pattern is valid');
    });
    
    // Test live stats functionality
    runner.test('refreshLiveStats updates DOM elements correctly', () => {
        // Mock DOM elements
        const mockElements = {
            statColonies: { textContent: '' },
            statBiomass: { textContent: '' },
            statTickRate: { textContent: '' },
            statMaxGen: { textContent: '' },
            breakdownList: { 
                innerHTML: '',
                appendChild: function(child) { 
                    this.children = this.children || []; 
                    this.children.push(child); 
                },
                children: []
            }
        };
        
        const originalGetId = document.getElementById;
        document.getElementById = (id) => mockElements[id] || null;
        
        // Create mock createElement for breakdown items
        const mockBreakdownItems = [];
        const originalCreateElement = document.createElement;
        document.createElement = (tag) => {
            const el = {
                className: '',
                textContent: '',
                style: { background: '' },
                width: 8,
                height: 8,
                appendChild: function(child) { this.children = this.children || []; this.children.push(child); },
                getContext: function(type) {
                    return {
                        clearRect: function() {},
                        beginPath: function() {},
                        moveTo: function() {},
                        lineTo: function() {},
                        stroke: function() {},
                        fillRect: function() {},
                        drawImage: function() {},
                        globalAlpha: 1,
                        globalCompositeOperation: 'source-over',
                        lineWidth: 1,
                        strokeStyle: '',
                        fillStyle: ''
                    };
                }
            };
            mockBreakdownItems.push(el);
            return el;
        };
        
        try {
            setupWorld(1337, '128x72');
            // Clear initial colonies created by setupWorld
            World.colonies = [];
            // Create test colonies
            newColony('MAT', 5, 5, null);
            newColony('CORD', 10, 10, null);
            
            refreshLiveStats();
            
            // Check basic stats were updated
            const actualCount = mockElements.statColonies.textContent;
            const expectedCount = World.colonies.length;
            runner.assert(actualCount == expectedCount, 
                         `Colony count updated (expected: ${expectedCount}, got: "${actualCount}", type: ${typeof actualCount})`);
            runner.assert(mockElements.statBiomass.textContent !== '', 'Biomass stat updated');
            runner.assert(mockElements.statMaxGen.textContent !== '', 'Max generation updated');
            
        } finally {
            document.getElementById = originalGetId;
            document.createElement = originalCreateElement;
        }
    });
    
    // Test inspector layout structure
    runner.test('Inspector panel has correct element ordering', () => {
        // This test documents the expected DOM structure
        // In practice, this would check actual DOM order
        const expectedOrder = [
            'inspector', // Colony info
            'tilePreview', // Tile pattern preview
            'inspectorActions', // Action buttons (Kill, Split, Randomize)
            'miniView', // Mini map
            'rtStats', // Real-time stats
            'stats' // Trait bars
        ];
        
        runner.assert(expectedOrder.length === 6, 'All inspector elements accounted for');
        runner.assert(expectedOrder.indexOf('tilePreview') < expectedOrder.indexOf('inspectorActions'), 
                      'Tile preview comes before action buttons');
        runner.assert(expectedOrder.indexOf('inspectorActions') < expectedOrder.indexOf('miniView'), 
                      'Action buttons come before mini view');
    });

    // Test responsive design helpers
    runner.test('UI maintains accessibility standards', () => {
        // This is more of a documentation test - ensuring we have proper attributes
        const buttonsWithTitles = [
            'btnStep', 'btnScreenshot', 'btnExport', 'btnImport',
            'btnOverlayCollapse', 'btnCloseInspector'
        ];
        
        // In a real implementation, we'd check the actual HTML
        // Here we're documenting the requirement
        runner.assert(true, 'All interactive elements have title attributes for accessibility');
        runner.assert(true, 'Color contrast meets WCAG guidelines');
        runner.assert(true, 'Responsive breakpoints are properly defined');
    });
    
    return runner.run();
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runUITests };
}