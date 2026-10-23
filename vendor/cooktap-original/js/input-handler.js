/**
 * Input Handler - Manages keyboard input and key mappings
 */

class InputHandler {
    constructor(game) {
        this.game = game;
        this.keyMappings = new Map();
        this.isListening = false;
        this.pressedKeys = new Set();
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            if (!this.isListening) return;
            
            // Prevent default browser behavior for game keys
            if (this.isGameKey(event.key)) {
                event.preventDefault();
            }
            
            this.handleKeyDown(event);
        });

        document.addEventListener('keyup', (event) => {
            if (!this.isListening) return;
            this.handleKeyUp(event);
        });

        // Handle number keys for order selection
        for (let i = 1; i <= 9; i++) {
            document.addEventListener('keydown', (event) => {
                if (!this.isListening) return;
                if (event.key === i.toString()) {
                    this.handleOrderSelection(i);
                }
            });
        }
    }

    // Start listening for input
    startListening() {
        this.isListening = true;
    }

    // Stop listening for input
    stopListening() {
        this.isListening = false;
        this.pressedKeys.clear();
    }

    // Check if a key is a game key
    isGameKey(key) {
        const gameKeys = [
            'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
            'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
            'z', 'x', 'c', 'v', 'b', 'n', 'm',
            '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
            ' ', 'Escape', 'Enter', 'Delete', 'Backspace', ',', '.', ';', "'", '[', ']'
        ];
        return gameKeys.includes(key.toLowerCase()) || gameKeys.includes(key);
    }

    // Handle key down events
    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        
        // Avoid key repeat
        if (this.pressedKeys.has(key)) return;
        this.pressedKeys.add(key);

        // Handle special keys
        if (key === 'escape') {
            this.game.cancelCurrentDish();
            return;
        }

        if (key === ' ') {
            this.game.serveDish();
            return;
        }

        if (key === 'enter') {
            this.game.retrieveCookedItems();
            return;
        }
        
        // Handle cleaning (both Delete and Backspace for Mac compatibility)
        if (key === 'delete' || key === 'backspace') {
            this.game.cleanStation();
            return;
        }

        // Handle dish-specific keys
        const activeOrder = this.game.orderSystem.getActiveOrder();
        if (!activeOrder) return;

        const keyMappings = this.game.dishSystem.getDishKeyMappings(activeOrder.dishId);
        const mapping = keyMappings.get(key);
        
        if (mapping) {
            console.log(`Key pressed: ${key}, mapping:`, mapping);
            
            if (mapping.type === 'ingredient') {
                this.game.addIngredient(activeOrder.dishId, mapping.id);
            } else if (mapping.type === 'tool') {
                this.game.useTool(activeOrder.dishId, mapping.id);
            }
            
            // Update key hints
            this.updateKeyHints(activeOrder.dishId);
        } else {
            console.log(`No mapping found for key: ${key}`);
            console.log('Available mappings:', Array.from(keyMappings.keys()));
        }
    }

    // Handle key up events
    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        this.pressedKeys.delete(key);
    }

    // Handle order selection (1-9 keys)
    handleOrderSelection(orderNumber) {
        const activeOrders = this.game.orderSystem.getActiveOrders();
        const orderIndex = orderNumber - 1;
        
        if (orderIndex >= 0 && orderIndex < activeOrders.length) {
            const order = activeOrders[orderIndex];
            this.game.selectOrder(order.id);
        }
    }

    // Update key hints display
    updateKeyHints(dishId) {
        const keyHintsElement = document.getElementById('recipe-keys');
        if (!keyHintsElement) return;

        const dish = this.game.dishSystem.getDish(dishId);
        if (!dish) {
            keyHintsElement.innerHTML = '<span class="key-hint">Select a dish to see controls</span>';
            return;
        }

        const hints = [];
        
        // Show ingredient keys for missing required ingredients
        const requiredIngredients = dish.ingredients.filter(ing => ing.required);
        const remainingRequired = requiredIngredients.filter(ing => !dish.currentIngredients.has(ing.id));
        
        remainingRequired.forEach(ing => {
            const ingredientData = this.game.dishSystem.getIngredient(ing.id);
            if (ingredientData) {
                hints.push(`
                    <span class="key-combo priority">
                        <kbd>${ingredientData.key.toUpperCase()}</kbd> ${ingredientData.name} *
                    </span>
                `);
            }
        });

        // Show ingredient prep steps that need to be done
        dish.ingredients.forEach(ingredient => {
            if (!dish.currentIngredients.has(ingredient.id)) return;
            
            const ingredientState = dish.ingredientStates.get(ingredient.id);
            if (!ingredientState || ingredientState.isReady) return;
            
            if (ingredient.prepSteps && ingredient.prepSteps.length > 0) {
                const nextStep = ingredient.prepSteps[ingredientState.prepStepsCompleted];
                if (nextStep) {
                    hints.push(`
                        <span class="key-combo next-step">
                            <kbd>${nextStep.key.toUpperCase()}</kbd> ${nextStep.description}
                        </span>
                    `);
                }
            }
        });

        // Show final assembly steps if ready
        const allRequiredReady = requiredIngredients.every(ing => {
            const state = dish.ingredientStates.get(ing.id);
            return state && state.isReady;
        });

        if (allRequiredReady && dish.finalSteps && dish.finalStepsProgress < dish.finalSteps.length) {
            const currentStep = dish.finalSteps[dish.finalStepsProgress];
            if (currentStep) {
                hints.push(`
                    <span class="key-combo next-step">
                        <kbd>${currentStep.key.toUpperCase()}</kbd> ${currentStep.description}
                    </span>
                `);
            }
        }

        // Show optional ingredients
        const optionalIngredients = dish.ingredients.filter(ing => !ing.required && !dish.currentIngredients.has(ing.id));
        optionalIngredients.forEach(ing => {
            const ingredientData = this.game.dishSystem.getIngredient(ing.id);
            if (ingredientData) {
                hints.push(`
                    <span class="key-combo optional">
                        <kbd>${ingredientData.key.toUpperCase()}</kbd> ${ingredientData.name}
                    </span>
                `);
            }
        });

        // Show completed ingredients
        dish.ingredients.forEach(ing => {
            if (dish.currentIngredients.has(ing.id)) {
                const ingredientState = dish.ingredientStates.get(ing.id);
                if (ingredientState && ingredientState.isReady) {
                    const ingredientData = this.game.dishSystem.getIngredient(ing.id);
                    if (ingredientData) {
                        hints.push(`
                            <span class="key-combo completed">
                                <kbd>${ingredientData.key.toUpperCase()}</kbd> ${ingredientData.name} ✓
                            </span>
                        `);
                    }
                }
            }
        });

        keyHintsElement.innerHTML = hints.length > 0 ? hints.join('') : 
            '<span class="key-hint">Select a dish to see controls</span>';
    }

    // Clear key hints
    clearKeyHints() {
        const keyHintsElement = document.getElementById('recipe-keys');
        if (keyHintsElement) {
            keyHintsElement.innerHTML = '<span class="key-hint">Select a dish to see controls</span>';
        }
    }

    // Get current key mappings for active dish
    getCurrentKeyMappings() {
        const activeOrder = this.game.orderSystem.getActiveOrder();
        if (!activeOrder) return new Map();
        
        return this.game.dishSystem.getDishKeyMappings(activeOrder.dishId);
    }

    // Show key press feedback
    showKeyFeedback(key, success = true) {
        const feedback = document.createElement('div');
        feedback.className = `key-feedback ${success ? 'success' : 'error'}`;
        feedback.textContent = key.toUpperCase();
        
        // Position near the center of the screen
        feedback.style.position = 'fixed';
        feedback.style.left = '50%';
        feedback.style.top = '50%';
        feedback.style.transform = 'translate(-50%, -50%)';
        feedback.style.zIndex = '1000';
        feedback.style.padding = '10px 20px';
        feedback.style.borderRadius = '8px';
        feedback.style.fontWeight = 'bold';
        feedback.style.fontSize = '1.5rem';
        feedback.style.pointerEvents = 'none';
        
        if (success) {
            feedback.style.background = '#28a745';
            feedback.style.color = 'white';
        } else {
            feedback.style.background = '#dc3545';
            feedback.style.color = 'white';
        }
        
        document.body.appendChild(feedback);
        
        // Animate and remove
        feedback.style.opacity = '1';
        feedback.style.transform = 'translate(-50%, -50%) scale(1)';
        
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translate(-50%, -60%) scale(0.8)';
            feedback.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                feedback.remove();
            }, 300);
        }, 800);
    }

    // Get help text for current dish
    getHelpText() {
        const activeOrder = this.game.orderSystem.getActiveOrder();
        if (!activeOrder) {
            return 'Select an order (1-9) to start cooking!';
        }

        const dish = this.game.dishSystem.getDish(activeOrder.dishId);
        if (!dish) return '';

        const keyMappings = this.getCurrentKeyMappings();
        const requiredIngredients = dish.ingredients.filter(ing => ing.required);
        const remainingRequired = requiredIngredients.filter(ing => !dish.currentIngredients.has(ing.id));

        // Check for ingredients that need to be added
        const missingRequired = dish.ingredients.filter(ing => 
            ing.required && !dish.currentIngredients.has(ing.id)
        );
        
        if (missingRequired.length > 0) {
            const ingredientNames = missingRequired.map(ing => {
                const ingredientData = this.game.dishSystem.getIngredient(ing.id);
                const key = ingredientData ? ingredientData.key.toUpperCase() : '?';
                return `${ingredientData.name} (${key})`;
            }).join(', ');
            
            return `Add required ingredients: ${ingredientNames}`;
        }

        // Check for ingredients that need preparation
        for (const ingredient of dish.ingredients) {
            if (!dish.currentIngredients.has(ingredient.id)) continue;
            
            const ingredientState = dish.ingredientStates.get(ingredient.id);
            if (ingredientState && !ingredientState.isReady) {
                const nextStep = ingredient.prepSteps[ingredientState.prepStepsCompleted];
                return `Prepare ${this.game.dishSystem.getIngredient(ingredient.id).name}: ${nextStep.description} (${nextStep.key.toUpperCase()})`;
            }
        }

        // Check for final assembly steps
        if (dish.finalSteps && dish.finalStepsProgress < dish.finalSteps.length) {
            const currentStep = dish.finalSteps[dish.finalStepsProgress];
            return `${currentStep.description} (${currentStep.key.toUpperCase()})`;
        }

        if (dish.isComplete) {
            return 'Dish ready! Press SPACE to serve.';
        }

        return 'All ingredients ready! Proceed to final assembly.';
    }

    // Update help display
    updateHelpDisplay() {
        const helpElement = document.querySelector('.help-text');
        if (helpElement) {
            helpElement.textContent = this.getHelpText();
        }
    }
}

// Global input handler will be initialized by the game
window.InputHandler = InputHandler;
