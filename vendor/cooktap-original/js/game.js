/**
 * Main Game Controller - Orchestrates all game systems
 */

class CookTapGame {
    constructor() {
        this.dishSystem = window.dishSystem;
        
        this.isRunning = false;
        this.gameTime = 0;
        this.gameTimer = null;
        
        this.setupUI();
        this.setupCleaningEventListeners();
        this.initializeGame();
    }
    
    async waitForDishSystem() {
        // Wait for dish system to load configuration
        let attempts = 0;
        while ((!this.dishSystem.ingredients.size || !this.dishSystem.dishes.size) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= 50) {
            console.error('Dish system failed to load within timeout');
            return false;
        }
        
        return true;
    }
    
    setupCleaningEventListeners() {
        // Listen for cleaning complete events from all stations
        const stations = ['grill', 'fryer', 'stove'];
        stations.forEach(stationId => {
            const stationElement = document.getElementById(`${stationId}-station`);
            if (stationElement) {
                stationElement.addEventListener('cleaningComplete', (event) => {
                    console.log(`Cleaning completed for ${event.detail.stationId}`);
                    // Update display if this station is currently active
                    if (this.cookingStationManager.activeStation && 
                        this.cookingStationManager.activeStation.id === event.detail.stationId) {
                        
                        // Update cleanliness display regardless of whether there's a dish
                        this.cookingStationManager.updateStationCleanliness(this.cookingStationManager.activeStation);
                        
                        // Also update dish display if there's a current dish
                        if (this.cookingStationManager.currentDish) {
                            this.cookingStationManager.updateStationDisplay(event.detail.stationId, this.cookingStationManager.currentDish);
                        }
                    }
                });
            }
        });
    }

    setupUI() {
        // Update game time display
        this.gameTimeElement = document.getElementById('game-time');
        
        // Add help text element
        const controlsInfo = document.querySelector('.controls-info');
        if (controlsInfo) {
            const helpSection = document.createElement('div');
            helpSection.className = 'controls-section help-section';
            helpSection.innerHTML = `
                <h4>Current Task:</h4>
                <div class="help-text">Select an order (1-9) to start cooking!</div>
            `;
            controlsInfo.insertBefore(helpSection, controlsInfo.firstChild);
        }

        // Add game control buttons
        this.addGameControls();
    }

    addGameControls() {
        // Check if controls already exist to prevent duplicates
        if (document.querySelector('.game-controls')) {
            console.log('Game controls already exist, skipping creation');
            return;
        }
        
        const header = document.querySelector('.game-header .stats');
        if (header) {
            const controls = document.createElement('div');
            controls.className = 'game-controls';
            controls.innerHTML = `
                <button id="start-game-btn" class="btn btn-success">Start Game</button>
                <button id="pause-game-btn" class="btn btn-warning" style="display: none;">Pause</button>
                <button id="reset-game-btn" class="btn btn-secondary">Reset</button>
            `;
            header.appendChild(controls);

            // Add event listeners
            document.getElementById('start-game-btn').addEventListener('click', () => {
                this.startGame();
            });

            document.getElementById('pause-game-btn').addEventListener('click', () => {
                this.pauseGame();
            });

            document.getElementById('reset-game-btn').addEventListener('click', () => {
                this.resetGame();
            });
            
            console.log('Game controls created successfully');
        }

        // Add CSS for buttons
        const style = document.createElement('style');
        style.textContent = `
            .game-controls {
                display: flex;
                gap: 0.5rem;
                margin-left: 2rem;
            }
            
            .btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                transition: background-color 0.2s;
            }
            
            .btn-success {
                background-color: #28a745;
                color: white;
            }
            
            .btn-success:hover {
                background-color: #218838;
            }
            
            .btn-warning {
                background-color: #ffc107;
                color: #212529;
            }
            
            .btn-warning:hover {
                background-color: #e0a800;
            }
            
            .btn-secondary {
                background-color: #6c757d;
                color: white;
            }
            
            .btn-secondary:hover {
                background-color: #5a6268;
            }
            
            .help-section {
                min-width: 300px;
            }
            
            .help-text {
                background: #495057;
                color: white;
                padding: 0.5rem;
                border-radius: 4px;
                font-size: 0.9rem;
                min-height: 1.5rem;
            }
            
            .key-combo.completed {
                opacity: 0.6;
                text-decoration: line-through;
            }
            
            .order-feedback {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid;
                border-radius: 8px;
                padding: 1rem 2rem;
                font-weight: bold;
                font-size: 1.2rem;
                z-index: 1000;
                animation: feedbackPop 3s ease forwards;
            }
            
            .order-feedback.perfect {
                border-color: #28a745;
                color: #28a745;
                background: #d4edda;
            }
            
            .order-feedback.good {
                border-color: #007bff;
                color: #007bff;
                background: #d1ecf1;
            }
            
            .order-feedback.average {
                border-color: #ffc107;
                color: #856404;
                background: #fff3cd;
            }
            
            .order-feedback.bad, .order-feedback.failed {
                border-color: #dc3545;
                color: #dc3545;
                background: #f8d7da;
            }
            
            @keyframes feedbackPop {
                0% {
                    transform: translate(-50%, -50%) scale(0.5);
                    opacity: 0;
                }
                15% {
                    transform: translate(-50%, -50%) scale(1.1);
                    opacity: 1;
                }
                30% {
                    transform: translate(-50%, -50%) scale(1);
                }
                90% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                }
            }
            
            .order-item.expired {
                background: #f8d7da;
                border-color: #dc3545;
                opacity: 0.7;
            }
            
            .order-item.completed {
                background: #d4edda;
                border-color: #28a745;
                transform: translateX(20px);
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }

    async initializeGame() {
        console.log('Initializing Cook Tap Game...');
        
        // Wait for dish system to load
        const loaded = await this.waitForDishSystem();
        if (!loaded) {
            console.error('Failed to initialize game - dish system not loaded');
            return;
        }
        
        // Initialize other systems after dish system is ready
        this.cookingStationManager = new CookingStationManager(this.dishSystem);
        this.orderSystem = new OrderSystem(this.dishSystem);
        this.inputHandler = new InputHandler(this);
        
        // Initialize cooking stations display
        this.cookingStationManager.initializeStations();
        
        // Show initial help
        this.updateHelpDisplay();
        
        console.log('Cook Tap Game initialized!');
        console.log('Available dishes:', this.dishSystem.getAllDishes().map(d => d.name));
    }

    async start() {
        return this.startGame();
    }
    
    async startGame() {
        if (this.isRunning) return;
        
        // Ensure game is properly initialized
        if (!this.orderSystem) {
            console.log('Game not ready yet, initializing...');
            await this.initializeGame();
        }
        
        if (!this.orderSystem) {
            console.error('Cannot start game - initialization failed');
            return;
        }
        
        this.isRunning = true;
        this.gameTime = 0;
        
        // Start systems
        this.orderSystem.start();
        this.inputHandler.startListening();
        
        // Start game timer
        this.gameTimer = setInterval(() => {
            this.gameTime++;
            this.updateGameTimeDisplay();
        }, 1000);
        
        // Update UI
        document.getElementById('start-game-btn').style.display = 'none';
        document.getElementById('pause-game-btn').style.display = 'inline-block';
        
        console.log('Game started!');
    }

    pauseGame() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        // Stop systems
        this.orderSystem.stop();
        this.inputHandler.stopListening();
        
        // Stop game timer
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        // Update UI
        document.getElementById('start-game-btn').style.display = 'inline-block';
        document.getElementById('pause-game-btn').style.display = 'none';
        document.getElementById('start-game-btn').textContent = 'Resume';
        
        console.log('Game paused!');
    }

    resetGame() {
        this.pauseGame();
        
        // Reset all systems
        this.orderSystem.clearAllOrders();
        this.cookingStationManager.clearCurrentDish();
        
        // Reset dishes
        for (const dish of this.dishSystem.getAllDishes()) {
            this.dishSystem.resetDish(dish.id);
        }
        
        // Reset game state
        this.gameTime = 0;
        this.updateGameTimeDisplay();
        
        // Update UI
        document.getElementById('start-game-btn').textContent = 'Start Game';
        this.inputHandler.clearKeyHints();
        this.updateHelpDisplay();
        
        console.log('Game reset!');
    }

    updateGameTimeDisplay() {
        if (this.gameTimeElement) {
            const minutes = Math.floor(this.gameTime / 60);
            const seconds = this.gameTime % 60;
            this.gameTimeElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // Select an order to work on
    selectOrder(orderId) {
        const order = this.orderSystem.selectOrder(orderId);
        if (!order) return false;
        
        // Set up cooking station for this dish
        this.cookingStationManager.setActiveDish(order.dishId);
        
        // Update key hints
        this.inputHandler.updateKeyHints(order.dishId);
        this.updateHelpDisplay();
        
        console.log(`Selected order: ${order.dishName}`);
        return true;
    }

    // Add ingredient to current dish
    addIngredient(dishId, ingredientId) {
        const success = this.dishSystem.addIngredientToDish(dishId, ingredientId);
        
        if (success) {
            // Update station display
            const currentStation = this.cookingStationManager.activeStation;
            if (currentStation) {
                this.cookingStationManager.updateStationDisplay(currentStation.id, dishId);
            }
            
            // Show feedback
            const ingredient = this.dishSystem.getIngredient(ingredientId);
            if (ingredient) {
                this.inputHandler.showKeyFeedback(ingredient.key, true);
                console.log(`Added ingredient: ${ingredient.name}`);
            }
        } else {
            // Show failure feedback
            console.log(`Failed to add ingredient: ${ingredientId}`);
            this.inputHandler.showKeyFeedback('invalid', false);
        }
        
        this.updateHelpDisplay();
        return success;
    }

    // Use tool on current dish
    useTool(dishId, toolId) {
        const dish = this.dishSystem.getDish(dishId);
        if (!dish) {
            console.log(`Dish not found: ${dishId}`);
            return false;
        }
        
        const tool = this.dishSystem.getTool(toolId);
        if (!tool) {
            console.log(`Tool not found: ${toolId}`);
            return false;
        }
        
        console.log(`Using tool ${toolId} (${tool.name}) on dish ${dishId}`);
        
        // Use the updated dish system workflow
        const success = this.dishSystem.useToolOnDish(dishId, toolId);
        
        if (success) {
            this.inputHandler.showKeyFeedback(tool.key, true);
            console.log(`Successfully used tool: ${tool.name}`);
            
            // Handle cooking actions that require station switches
            // Check if this tool triggers a cooking station action
            
            // First check ingredient prep steps
            for (const ingredient of dish.ingredients) {
                if (!dish.currentIngredients.has(ingredient.id)) continue;

                const ingredientState = dish.ingredientStates.get(ingredient.id);
                if (!ingredientState || ingredientState.isReady) continue;

                // Check if we just completed a prep step that requires a cooking station
                if (ingredient.prepSteps && ingredient.prepSteps.length > ingredientState.prepStepsCompleted - 1) {
                    const completedStep = ingredient.prepSteps[ingredientState.prepStepsCompleted - 1];
                    
                    if (completedStep && completedStep.action === toolId && completedStep.station && completedStep.station !== 'prep') {
                        // Switch to cooking station and start cooking
                        this.cookingStationManager.setActiveDish(dishId, completedStep.station);

                        this.cookingStationManager.handleCookingAction(
                            toolId,
                            ingredient.id
                        );

                        console.log(`Started cooking: ${toolId} on ${completedStep.station} station`);
                        return success; // Exit early since we switched stations
                    }
                }
            }
            
            // Then check final steps (for things like baking pizza)
            if (dish.finalSteps && dish.finalStepsProgress < dish.finalSteps.length) {
                const currentFinalStep = dish.finalSteps[dish.finalStepsProgress - 1]; // We just completed this step
                
                if (currentFinalStep && currentFinalStep.action === toolId && currentFinalStep.station && currentFinalStep.station !== 'prep') {
                    // Switch to cooking station and start cooking
                    this.cookingStationManager.setActiveDish(dishId, currentFinalStep.station);

                    this.cookingStationManager.handleCookingAction(
                        toolId,
                        dishId // Use dishId instead of ingredient for final steps
                    );

                    console.log(`Started cooking final step: ${toolId} on ${currentFinalStep.station} station`);
                }
            }
        } else {
            this.inputHandler.showKeyFeedback(tool.key, false);
            console.log(`Failed to use tool: ${tool.name}`);
        }
        
        // Update displays
        const currentStation = this.cookingStationManager.activeStation;
        if (currentStation) {
            this.cookingStationManager.updateStationDisplay(currentStation.id, dishId);
        }
        this.updateHelpDisplay();
        
        return success;
    }

    // Serve completed dish
    serveDish() {
        const activeOrder = this.orderSystem.getActiveOrder();
        if (!activeOrder) {
            console.log('No active order to serve');
            return false;
        }
        
        const dish = this.dishSystem.getDish(activeOrder.dishId);
        if (!dish) return false;
        
        // Check if dish is valid and ready
        const isValid = this.dishSystem.isDishValid(activeOrder.dishId);
        const isComplete = dish.isComplete;
        
        if (!isValid) {
            console.log('Dish is missing required ingredients');
            this.inputHandler.showKeyFeedback('space', false);
            return false;
        }
        
        // Complete the order
        const rating = isComplete ? 'perfect' : 'good';
        this.orderSystem.completeOrder(activeOrder.id, isValid);
        
        // Reset dish state
        this.dishSystem.resetDish(activeOrder.dishId);
        this.cookingStationManager.clearCurrentDish();
        
        // Clear input hints
        this.inputHandler.clearKeyHints();
        this.updateHelpDisplay();
        
        console.log(`Served dish: ${activeOrder.dishName} (${rating})`);
        return true;
    }

    // Cancel current dish
    cancelCurrentDish() {
        const activeOrder = this.orderSystem.getActiveOrder();
        if (!activeOrder) return;
        
        // Reset dish state
        this.dishSystem.resetDish(activeOrder.dishId);
        this.cookingStationManager.clearCurrentDish();
        
        // Deselect order
        activeOrder.isActive = false;
        if (activeOrder.element) {
            activeOrder.element.classList.remove('active');
        }
        
        // Clear input hints
        this.inputHandler.clearKeyHints();
        this.updateHelpDisplay();
        
        console.log('Cancelled current dish');
    }

    // Retrieve cooked items from stations
    retrieveCookedItems() {
        const readyItems = this.cookingStationManager.getReadyItems();
        
        if (readyItems.length === 0) {
            console.log('No cooked items ready to retrieve');
            return false;
        }
        
        const activeOrder = this.orderSystem.getActiveOrder();
        if (!activeOrder) {
            console.log('No active order to retrieve items for');
            return false;
        }
        
        const dish = this.dishSystem.getDish(activeOrder.dishId);
        if (!dish) {
            console.log(`Dish not found: ${activeOrder.dishId}`);
            return false;
        }
        
        // Retrieve all ready items
        let retrieved = 0;
        readyItems.forEach(({stationId, slotIndex, item}) => {
            const success = this.cookingStationManager.removeCookedItem(stationId, slotIndex);
            if (success) {
                retrieved++;
                console.log(`Retrieved ${item.name} from ${stationId} station`);
                
                // Mark the ingredient as ready in the dish, OR mark dish as complete for final steps
                if (item.ingredient) {
                    // This is an ingredient that was cooking (like pasta, chicken)
                    const ingredientState = dish.ingredientStates.get(item.ingredient);
                    if (ingredientState) {
                        ingredientState.isReady = true;
                        console.log(`Marked ingredient ${item.ingredient} as ready`);
                    }
                } else if (item.name === dish.name || item.action) {
                    // This is a final step cooking (like baking pizza)
                    if (dish.finalSteps && dish.finalStepsProgress === dish.finalSteps.length) {
                        dish.isComplete = true;
                        console.log(`Marked dish ${dish.name} as complete after retrieving from cooking`);
                    }
                }
            }
        });
        
        if (retrieved > 0) {
            this.inputHandler.showKeyFeedback('Enter', true);
            console.log(`Retrieved ${retrieved} cooked items`);
            
            // Switch back to prep station so user can continue assembly
            this.cookingStationManager.setActiveDish(activeOrder.dishId, 'prep');
            
            // Update displays
            const currentStation = this.cookingStationManager.activeStation;
            if (currentStation) {
                this.cookingStationManager.updateStationDisplay(currentStation.id, activeOrder.dishId);
            }
            this.updateHelpDisplay();
        }
        
        return retrieved > 0;
    }
    
    // Clean current station
    cleanStation() {
        const success = this.cookingStationManager.cleanCurrentStation();
        
        if (success) {
            this.inputHandler.showKeyFeedback('Clean', true);
            console.log('Started cleaning station...');
        } else {
            this.inputHandler.showKeyFeedback('Clean', false);
            console.log('Cannot clean station');
        }
        
        return success;
    }

    // Update help display
    updateHelpDisplay() {
        this.inputHandler.updateHelpDisplay();
    }

    // Get game statistics
    getStats() {
        return {
            gameTime: this.gameTime,
            ...this.orderSystem.getStats()
        };
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new CookTapGame();
    
    // Development helper - expose game to console
    if (typeof window !== 'undefined') {
        window.cookTap = {
            game: window.game,
            dishSystem: window.dishSystem,
            startGame: () => window.game.startGame(),
            getStats: () => window.game.getStats(),
            help: () => {
                console.log('Cook Tap Game Commands:');
                console.log('- cookTap.startGame() - Start the game');
                console.log('- cookTap.getStats() - Get game statistics');
                console.log('- cookTap.dishSystem.getAllDishes() - List all dishes');
                console.log('- Press 1-9 to select orders');
                console.log('- Press ingredient/tool keys to cook');
                console.log('- Press SPACE to serve dishes');
                console.log('- Press ESC to cancel current dish');
            }
        };
    }
});

// Log initialization
console.log('🍳 Cook Tap Game loaded! Type cookTap.help() for commands.');
