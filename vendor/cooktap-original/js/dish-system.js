/**
 * Dish System - Core recipe and ingredient management
 * Handles dish definitions, ingredients, tools, and preparation steps
 */

class DishSystem {
    constructor() {
        this.dishes = new Map();
        this.ingredients = new Map();
        this.tools = new Map();
        this.cookingStations = new Map();
        
        this.menuConfig = null;
        this.loadConfiguration();
    }

    async loadConfiguration() {
        try {
            const response = await fetch('./config/menu.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.menuConfig = await response.json();
            
            this.initializeFromConfig();
            console.log('Menu configuration loaded successfully');
        } catch (error) {
            console.error('Failed to load menu configuration:', error);
            // Fallback to hardcoded data if needed
            this.initializeFallback();
        }
    }

    initializeFromConfig() {
        if (!this.menuConfig) return;
        
        // Load ingredients
        this.menuConfig.ingredients.forEach(ingredient => {
            this.addIngredient(ingredient.id, ingredient.name, ingredient.category, ingredient.baseColor, ingredient.key);
        });
        
        // Load tools
        this.menuConfig.tools.forEach(tool => {
            this.addTool(tool.id, tool.name, tool.category, tool.baseColor, tool.key);
        });
        
        // Load cooking stations
        for (const [stationId, config] of Object.entries(this.menuConfig.cookingStations)) {
            this.cookingStations.set(stationId, config);
        }
        
        // Load dishes
        this.menuConfig.dishes.forEach(dish => {
            this.addDish(dish.id, dish);
        });
    }
    
    initializeFallback() {
        console.warn('Using fallback hardcoded menu data');
        // Keep original hardcoded initialization as backup
        this.initializeIngredientsHardcoded();
        this.initializeToolsHardcoded();
        this.initializeCookingStationsHardcoded();
        this.initializeDishesHardcoded();
    }

    initializeIngredientsHardcoded() {
        // Meat ingredients
        this.addIngredient('beef_patty', 'Beef Patty', 'meat', '#ffcccb', 'b');
        this.addIngredient('chicken_breast', 'Chicken Breast', 'meat', '#ffcccb', 'c');
        this.addIngredient('bacon', 'Bacon', 'meat', '#ffcccb', 'n');
        
        // Vegetables
        this.addIngredient('lettuce', 'Lettuce', 'vegetable', '#90ee90', 'l');
        this.addIngredient('tomato', 'Tomato', 'vegetable', '#90ee90', 't');
        this.addIngredient('onion', 'Onion', 'vegetable', '#90ee90', 'o');
        this.addIngredient('pickles', 'Pickles', 'vegetable', '#90ee90', 'p');
        this.addIngredient('mushrooms', 'Mushrooms', 'vegetable', '#90ee90', 'm');
        this.addIngredient('bell_pepper', 'Bell Pepper', 'vegetable', '#90ee90', 'e');
        
        // Dairy
        this.addIngredient('cheese', 'Cheese', 'dairy', '#fffacd', 'h');
        this.addIngredient('mozzarella', 'Mozzarella', 'dairy', '#fffacd', 'z');
        this.addIngredient('butter', 'Butter', 'dairy', '#fffacd', 'u');
        
        // Grains
        this.addIngredient('burger_bun', 'Burger Bun', 'grain', '#daa520', 'j');
        this.addIngredient('pizza_dough', 'Pizza Dough', 'grain', '#daa520', 'd');
        this.addIngredient('pasta', 'Pasta', 'grain', '#daa520', 'a');
        
        // Sauces
        this.addIngredient('ketchup', 'Ketchup', 'sauce', '#ff6347', 'k');
        this.addIngredient('mustard', 'Mustard', 'sauce', '#ff6347', 'y');
        this.addIngredient('mayo', 'Mayo', 'sauce', '#ff6347', 'w');
        this.addIngredient('tomato_sauce', 'Tomato Sauce', 'sauce', '#ff6347', 's');
        
        // Seasonings
        this.addIngredient('salt', 'Salt', 'seasoning', '#dda0dd', 'i');
        this.addIngredient('pepper', 'Pepper', 'seasoning', '#dda0dd', 'r');
        this.addIngredient('oregano', 'Oregano', 'seasoning', '#dda0dd', 'g');
    }

    initializeToolsHardcoded() {
        // Cutting tools
        this.addTool('chop', 'Chop', 'cut', '#c0c0c0', 'x');
        this.addTool('slice', 'Slice', 'cut', '#c0c0c0', 'v');
        
        // Cooking tools
        this.addTool('grill', 'Grill', 'cook', '#ffa500', 'q');
        this.addTool('fry', 'Deep Fry', 'cook', '#ffa500', 'f');
        this.addTool('boil', 'Boil', 'cook', '#ffa500', ',');
        this.addTool('bake', 'Bake', 'cook', '#ffa500', '.');
        
        // Mixing tools
        this.addTool('mix', 'Mix', 'mix', '#87ceeb', ';');
        this.addTool('toss', 'Toss', 'mix', '#87ceeb', "'");
        this.addTool('assemble', 'Assemble', 'mix', '#87ceeb', '[');
        
        // Serving tools
        this.addTool('plate', 'Plate', 'serve', '#98fb98', 'space');
    }

    initializeCookingStationsHardcoded() {
        this.cookingStations.set('prep', {
            name: 'Prep Station',
            allowedActions: ['chop', 'slice', 'mix', 'toss', 'assemble', 'plate'],
            color: '#28a745'
        });
        
        this.cookingStations.set('grill', {
            name: 'Grill Station',
            allowedActions: ['grill'],
            color: '#fd7e14',
            cookingSlots: 3
        });
        
        this.cookingStations.set('fryer', {
            name: 'Deep Fryer',
            allowedActions: ['fry'],
            color: '#ffc107',
            cookingSlots: 2
        });
        
        this.cookingStations.set('stove', {
            name: 'Stove/Oven Station',
            allowedActions: ['boil', 'bake'],
            color: '#6f42c1',
            cookingSlots: 4
        });
    }

    initializeDishesHardcoded() {
        // Classic Burger
        this.addDish('classic_burger', {
            name: 'Classic Burger',
            station: 'prep',
            baseColor: '#ffb3ba',
            ingredients: [
                { 
                    id: 'burger_bun', 
                    required: true,
                    prepSteps: [
                        { action: 'slice', description: 'Slice bun in half', key: 'v' }
                    ]
                },
                { 
                    id: 'beef_patty', 
                    required: true,
                    prepSteps: [
                        { action: 'grill', description: 'Grill patty', station: 'grill', time: 3000, key: 'q' }
                    ]
                },
                { 
                    id: 'lettuce', 
                    required: false,
                    prepSteps: [
                        { action: 'chop', description: 'Chop lettuce', key: 'x' }
                    ]
                },
                { 
                    id: 'tomato', 
                    required: false,
                    prepSteps: [
                        { action: 'slice', description: 'Slice tomato', key: 'v' }
                    ]
                },
                { id: 'cheese', required: false, prepSteps: [] },
                { id: 'pickles', required: false, prepSteps: [] },
                { id: 'ketchup', required: false, prepSteps: [] },
                { id: 'mustard', required: false, prepSteps: [] }
            ],
            finalSteps: [
                { action: 'assemble', description: 'Assemble burger', key: '[' },
                { action: 'plate', description: 'Plate and serve', key: 'space' }
            ],
            difficulty: 2,
            prepTime: 45
        });

        // Margherita Pizza
        this.addDish('margherita_pizza', {
            name: 'Margherita Pizza',
            station: 'prep',
            baseColor: '#ffdfba',
            ingredients: [
                { 
                    id: 'pizza_dough', 
                    required: true,
                    prepSteps: []
                },
                { 
                    id: 'tomato_sauce', 
                    required: true,
                    prepSteps: [
                        { action: 'mix', description: 'Mix sauce', key: ';' }
                    ]
                },
                { 
                    id: 'mozzarella', 
                    required: true,
                    prepSteps: []
                },
                { 
                    id: 'oregano', 
                    required: false,
                    prepSteps: []
                }
            ],
            finalSteps: [
                { action: 'bake', description: 'Bake pizza', station: 'stove', time: 8000, key: '.' },
                { action: 'plate', description: 'Plate and serve', key: 'space' }
            ],
            difficulty: 3,
            prepTime: 60
        });

        // Fried Chicken
        this.addDish('fried_chicken', {
            name: 'Fried Chicken',
            station: 'prep',
            baseColor: '#ffffba',
            ingredients: [
                { 
                    id: 'chicken_breast', 
                    required: true,
                    prepSteps: [
                        { action: 'fry', description: 'Fry chicken', station: 'fryer', time: 5000, key: 'f' }
                    ]
                },
                { 
                    id: 'salt', 
                    required: true,
                    prepSteps: []
                },
                { 
                    id: 'pepper', 
                    required: true,
                    prepSteps: []
                }
            ],
            finalSteps: [
                { action: 'plate', description: 'Plate and serve', key: 'space' }
            ],
            difficulty: 2,
            prepTime: 35
        });

        // Chicken Caesar Salad
        this.addDish('caesar_salad', {
            name: 'Caesar Salad',
            station: 'prep',
            baseColor: '#baffc9',
            ingredients: [
                { 
                    id: 'lettuce', 
                    required: true,
                    prepSteps: [
                        { action: 'chop', description: 'Chop lettuce', key: 'x' }
                    ]
                },
                { 
                    id: 'chicken_breast', 
                    required: true,
                    prepSteps: [
                        { action: 'grill', description: 'Grill chicken', station: 'grill', time: 4000, key: 'q' },
                        { action: 'slice', description: 'Slice chicken', key: 'v' }
                    ]
                },
                { 
                    id: 'cheese', 
                    required: false,
                    prepSteps: []
                },
                { 
                    id: 'mayo', 
                    required: false,
                    prepSteps: []
                }
            ],
            finalSteps: [
                { action: 'toss', description: 'Toss salad', key: "'" },
                { action: 'plate', description: 'Plate and serve', key: 'space' }
            ],
            difficulty: 3,
            prepTime: 50
        });

        // Simple Pasta
        this.addDish('pasta_marinara', {
            name: 'Pasta Marinara',
            station: 'prep',
            baseColor: '#ffb3ff',
            ingredients: [
                { 
                    id: 'pasta', 
                    required: true,
                    prepSteps: [
                        { action: 'boil', description: 'Boil pasta', station: 'stove', time: 6000, key: ',' }
                    ]
                },
                { 
                    id: 'tomato_sauce', 
                    required: true,
                    prepSteps: []
                },
                { 
                    id: 'oregano', 
                    required: false,
                    prepSteps: []
                },
                { 
                    id: 'cheese', 
                    required: false,
                    prepSteps: []
                }
            ],
            finalSteps: [
                { action: 'mix', description: 'Mix pasta with sauce', key: ';' },
                { action: 'plate', description: 'Plate and serve', key: 'space' }
            ],
            difficulty: 2,
            prepTime: 40
        });
    }

    addIngredient(id, name, type, color, key) {
        this.ingredients.set(id, {
            id,
            name,
            type,
            color,
            key,
            className: `ingredient-${type}`
        });
    }

    addTool(id, name, type, color, key) {
        this.tools.set(id, {
            id,
            name,
            type,
            color,
            key,
            className: `tool-${type}`
        });
    }

    addDish(id, dishData) {
        this.dishes.set(id, {
            id,
            ...dishData,
            currentIngredients: new Set(),
            ingredientStates: new Map(), // Track prep state of each ingredient
            finalStepsProgress: 0,
            isComplete: false
        });
    }

    getDish(id) {
        return this.dishes.get(id);
    }

    getAllDishes() {
        return Array.from(this.dishes.values());
    }

    getIngredient(id) {
        return this.ingredients.get(id);
    }

    getTool(id) {
        return this.tools.get(id);
    }

    getCookingStation(id) {
        return this.cookingStations.get(id);
    }

    // Get available ingredients for a specific dish
    getDishIngredients(dishId) {
        const dish = this.getDish(dishId);
        if (!dish) return [];
        
        return dish.ingredients.map(ing => {
            const ingredientData = this.getIngredient(ing.id);
            if (!ingredientData) return null;
            
            return {
                ...ingredientData,
                required: ing.required,
                prepSteps: ing.prepSteps || [],
                added: dish.currentIngredients.has(ing.id)
            };
        }).filter(ingredient => ingredient !== null);
    }

    // Get available tools for a specific dish
    getDishTools(dishId) {
        const dish = this.getDish(dishId);
        if (!dish) return [];
        
        const tools = new Set();
        
        // Add tools from ingredient preparation steps
        dish.ingredients.forEach(ingredient => {
            if (ingredient.prepSteps) {
                ingredient.prepSteps.forEach(step => {
                    tools.add(step.action);
                });
            }
        });
        
        // Add tools from final assembly steps
        if (dish.finalSteps) {
            dish.finalSteps.forEach(step => {
                tools.add(step.action);
            });
        }
        
        return Array.from(tools).map(toolId => {
            const tool = this.getTool(toolId);
            if (!tool) return null;
            
            // Check if tool has been used (simplified for now)
            return {
                ...tool,
                used: false // We'll update this logic later if needed
            };
        }).filter(tool => tool !== null);
    }

    // Add ingredient to current dish
    addIngredientToDish(dishId, ingredientId) {
        const dish = this.getDish(dishId);
        if (!dish) {
            console.log(`Dish not found: ${dishId}`);
            return false;
        }
        
        const ingredient = dish.ingredients.find(ing => ing.id === ingredientId);
        if (!ingredient) {
            console.log(`Ingredient ${ingredientId} not found in dish ${dishId}`);
            console.log('Available ingredients:', dish.ingredients.map(ing => ing.id));
            return false;
        }
        
        // Don't add if already added
        if (dish.currentIngredients.has(ingredientId)) {
            console.log(`Ingredient ${ingredientId} already added`);
            return false;
        }
        
        dish.currentIngredients.add(ingredientId);
        
        // Initialize ingredient state tracking
        dish.ingredientStates.set(ingredientId, {
            added: true,
            prepStepsCompleted: 0,
            isReady: (ingredient.prepSteps && ingredient.prepSteps.length === 0) || !ingredient.prepSteps // Ready if no prep steps
        });
        
        console.log(`Successfully added ingredient: ${ingredientId} to ${dishId}`);
        return true;
    }

    // Use tool on ingredient or final assembly
    useToolOnDish(dishId, toolId) {
        const dish = this.getDish(dishId);
        if (!dish) return false;
        
        // Check if this tool is for ingredient preparation
        let toolUsed = false;
        
        for (const ingredient of dish.ingredients) {
            if (!dish.currentIngredients.has(ingredient.id)) continue;
            
            const ingredientState = dish.ingredientStates.get(ingredient.id);
            if (!ingredientState || ingredientState.isReady) continue;
            
            const currentPrepStep = ingredient.prepSteps[ingredientState.prepStepsCompleted];
            if (currentPrepStep && currentPrepStep.action === toolId) {
                ingredientState.prepStepsCompleted++;
                
                // Only mark as ready if all prep steps are done AND the last step doesn't require cooking
                if (ingredientState.prepStepsCompleted >= ingredient.prepSteps.length) {
                    const lastStep = ingredient.prepSteps[ingredient.prepSteps.length - 1];
                    // Mark ready only if last step doesn't require a cooking station
                    if (!lastStep.station || lastStep.station === 'prep') {
                        ingredientState.isReady = true;
                    }
                    // If last step requires cooking station, ingredient stays not ready until retrieved
                }
                
                toolUsed = true;
                break;
            }
        }
        
        // Check if this tool is for final assembly steps
        if (!toolUsed && dish.finalSteps) {
            const currentFinalStep = dish.finalSteps[dish.finalStepsProgress];
            if (currentFinalStep && currentFinalStep.action === toolId) {
                dish.finalStepsProgress++;
                
                // Only mark dish as complete if we've finished all steps AND the last step doesn't require cooking
                if (dish.finalStepsProgress >= dish.finalSteps.length) {
                    const lastStep = dish.finalSteps[dish.finalSteps.length - 1];
                    // Mark complete only if last step doesn't require a cooking station
                    if (!lastStep.station || lastStep.station === 'prep') {
                        dish.isComplete = true;
                    }
                    // If last step requires cooking, dish stays incomplete until retrieved
                }
                
                toolUsed = true;
            }
        }
        
        return toolUsed;
    }

    // Check if dish meets minimum requirements
    isDishValid(dishId) {
        const dish = this.getDish(dishId);
        if (!dish) return false;
        
        // Check required ingredients are added and prepared
        const requiredIngredients = dish.ingredients.filter(ing => ing.required);
        for (const ingredient of requiredIngredients) {
            if (!dish.currentIngredients.has(ingredient.id)) {
                return false;
            }
            
            const ingredientState = dish.ingredientStates.get(ingredient.id);
            if (!ingredientState || !ingredientState.isReady) {
                return false;
            }
        }
        
        return true;
    }

    // Reset dish state
    resetDish(dishId) {
        const dish = this.getDish(dishId);
        if (!dish) return false;
        
        dish.currentIngredients.clear();
        dish.ingredientStates.clear();
        dish.finalStepsProgress = 0;
        dish.isComplete = false;
        
        return true;
    }

    // Get key mappings for a dish
    getDishKeyMappings(dishId) {
        const keyMappings = new Map();
        const dish = this.getDish(dishId);
        if (!dish) return keyMappings;
        
        // Add ingredient keys
        dish.ingredients.forEach(ingredient => {
            const ingredientData = this.getIngredient(ingredient.id);
            if (ingredientData && ingredientData.key) {
                keyMappings.set(ingredientData.key.toLowerCase(), {
                    type: 'ingredient',
                    id: ingredient.id,
                    name: ingredientData.name,
                    added: dish.currentIngredients.has(ingredient.id)
                });
            }
            
            // Add keys for ingredient prep steps
            if (ingredient.prepSteps) {
                ingredient.prepSteps.forEach(step => {
                    if (step.key) {
                        keyMappings.set(step.key.toLowerCase(), {
                            type: 'tool',
                            id: step.action,
                            name: step.description,
                            ingredientId: ingredient.id
                        });
                    }
                });
            }
        });
        
        // Add keys for final assembly steps
        if (dish.finalSteps) {
            dish.finalSteps.forEach(step => {
                if (step.key && step.key !== 'space') {
                    keyMappings.set(step.key.toLowerCase(), {
                        type: 'tool',
                        id: step.action,
                        name: step.description
                    });
                }
            });
        }
        
        return keyMappings;
    }
}

// Global dish system instance
window.dishSystem = new DishSystem();
