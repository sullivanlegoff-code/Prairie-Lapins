/**
 * Order System - Manages customer orders and timing
 */

class Order {
    constructor(dishId, dishName, timeLimit = 60) {
        this.id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.dishId = dishId;
        this.dishName = dishName;
        this.timeLimit = timeLimit * 1000; // Convert to milliseconds
        this.createdAt = Date.now();
        this.isComplete = false;
        this.isActive = false;
        this.rating = null; // Will be 'perfect', 'good', or 'bad'
        this.element = null;
    }

    // Get remaining time in seconds
    getRemainingTime() {
        const elapsed = Date.now() - this.createdAt;
        const remaining = Math.max(0, this.timeLimit - elapsed);
        return Math.ceil(remaining / 1000);
    }

    // Check if order is expired
    isExpired() {
        return this.getRemainingTime() <= 0;
    }

    // Get time urgency level
    getUrgencyLevel() {
        const remaining = this.getRemainingTime();
        const total = this.timeLimit / 1000;
        
        if (remaining <= total * 0.25) return 'critical';
        if (remaining <= total * 0.5) return 'urgent';
        return 'normal';
    }

    // Complete the order with a rating
    complete(rating = 'good') {
        this.isComplete = true;
        this.rating = rating;
        return this;
    }
}

class OrderSystem {
    constructor(dishSystem) {
        this.dishSystem = dishSystem;
        this.activeOrders = new Map();
        this.completedOrders = [];
        this.maxActiveOrders = 5;
        this.orderSpawnRate = 10000; // 10 seconds between orders
        this.orderSpawnTimer = null;
        this.isRunning = false;
        
        // Score tracking
        this.totalScore = 0;
        this.ordersCompleted = 0;
        this.perfectOrders = 0;
        
        this.ordersContainer = document.getElementById('active-orders');
        this.scoreElement = document.getElementById('score');
        this.ordersCompletedElement = document.getElementById('orders-completed');
    }

    // Start the order system
    start() {
        this.isRunning = true;
        this.spawnOrder(); // Spawn first order immediately
        this.startSpawning();
        this.updateDisplay();
        console.log(`Order system started! Spawning orders every ${this.orderSpawnRate/1000} seconds`);
    }

    // Stop the order system
    stop() {
        this.isRunning = false;
        if (this.orderSpawnTimer) {
            clearInterval(this.orderSpawnTimer);
            this.orderSpawnTimer = null;
        }
        console.log('Order system stopped');
    }

    // Start the automatic order spawning timer
    startSpawning() {
        if (this.orderSpawnTimer) return;
        
        console.log(`Setting up order spawning timer: ${this.orderSpawnRate}ms`);
        this.orderSpawnTimer = setInterval(() => {
            console.log(`Timer tick - Active orders: ${this.activeOrders.size}/${this.maxActiveOrders}`);
            if (this.isRunning && this.activeOrders.size < this.maxActiveOrders) {
                console.log('Spawning new order...');
                this.spawnOrder();
            } else {
                console.log('Not spawning - either not running or max orders reached');
            }
        }, this.orderSpawnRate);
    }

    // Spawn a new random order
    spawnOrder() {
        if (this.activeOrders.size >= this.maxActiveOrders) {
            console.log(`Cannot spawn order - at max capacity (${this.maxActiveOrders})`);
            return null;
        }
        
        const availableDishes = this.dishSystem.getAllDishes();
        const randomDish = availableDishes[Math.floor(Math.random() * availableDishes.length)];
        
        // Calculate time limit based on dish difficulty
        const baseTime = 45;
        const difficultyModifier = randomDish.difficulty * 10;
        const timeLimit = baseTime + difficultyModifier + Math.random() * 20;
        
        const order = new Order(randomDish.id, randomDish.name, timeLimit);
        this.activeOrders.set(order.id, order);
        
        this.createOrderElement(order);
        this.updateDisplay();
        
        console.log(`Spawned new order: ${randomDish.name} (${order.id}) - Active orders: ${this.activeOrders.size}`);
        
        return order;
    }

    // Create DOM element for an order
    createOrderElement(order) {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-item';
        orderElement.id = `order-${order.id}`;
        orderElement.dataset.orderId = order.id;
        
        const dish = this.dishSystem.getDish(order.dishId);
        
        orderElement.innerHTML = `
            <div class="dish-name" style="background-color: ${dish.baseColor}">${order.dishName}</div>
            <div class="order-details">
                <div class="order-id">#${order.id.substr(-4)}</div>
                <div class="timer" data-time-limit="${order.timeLimit}">
                    ${order.getRemainingTime()}s
                </div>
            </div>
        `;
        
        orderElement.addEventListener('click', () => {
            this.selectOrder(order.id);
        });
        
        order.element = orderElement;
        
        if (this.ordersContainer) {
            this.ordersContainer.appendChild(orderElement);
        }
        
        // Start timer updates for this order
        this.startOrderTimer(order);
    }

    // Start timer updates for a specific order
    startOrderTimer(order) {
        const updateTimer = () => {
            if (order.isComplete || !this.activeOrders.has(order.id)) return;
            
            const remainingTime = order.getRemainingTime();
            const urgency = order.getUrgencyLevel();
            
            if (order.element) {
                const timerElement = order.element.querySelector('.timer');
                if (timerElement) {
                    timerElement.textContent = `${remainingTime}s`;
                    timerElement.className = `timer ${urgency}`;
                }
            }
            
            if (remainingTime > 0) {
                setTimeout(updateTimer, 1000);
            } else {
                // Order expired
                this.expireOrder(order.id);
            }
        };
        
        setTimeout(updateTimer, 1000);
    }

    // Select an order (make it active)
    selectOrder(orderId) {
        const order = this.activeOrders.get(orderId);
        if (!order) return false;
        
        // Deselect previous active order
        const previousActive = Array.from(this.activeOrders.values()).find(o => o.isActive);
        if (previousActive) {
            previousActive.isActive = false;
            if (previousActive.element) {
                previousActive.element.classList.remove('active');
            }
        }
        
        // Activate new order
        order.isActive = true;
        if (order.element) {
            order.element.classList.add('active');
        }
        
        return order;
    }

    // Get currently active order
    getActiveOrder() {
        return Array.from(this.activeOrders.values()).find(order => order.isActive);
    }

    // Complete an order
    completeOrder(orderId, dishValid = true) {
        const order = this.activeOrders.get(orderId);
        if (!order) return null;
        
        // Determine rating based on timing and validity
        let rating = 'bad';
        let score = 0;
        
        if (dishValid) {
            const remainingTime = order.getRemainingTime();
            const totalTime = order.timeLimit / 1000;
            const timeRatio = remainingTime / totalTime;
            
            if (timeRatio > 0.75) {
                rating = 'perfect';
                score = 100;
                this.perfectOrders++;
            } else if (timeRatio > 0.25) {
                rating = 'good';
                score = 60;
            } else if (remainingTime > 0) {
                rating = 'average';
                score = 30;
            }
        }
        
        order.complete(rating);
        this.completedOrders.push(order);
        this.totalScore += score;
        this.ordersCompleted++;
        
        // Remove from active orders
        this.activeOrders.delete(orderId);
        
        // Remove from DOM
        if (order.element) {
            order.element.classList.add('completed');
            setTimeout(() => {
                order.element.remove();
            }, 1000);
        }
        
        this.updateDisplay();
        this.showOrderFeedback(order, score);
        
        return order;
    }

    // Expire an order
    expireOrder(orderId) {
        const order = this.activeOrders.get(orderId);
        if (!order) return null;
        
        order.complete('failed');
        this.completedOrders.push(order);
        this.activeOrders.delete(orderId);
        
        // Deduct points for failed order
        this.totalScore -= 20;
        
        // Remove from DOM with expired styling
        if (order.element) {
            order.element.classList.add('expired');
            setTimeout(() => {
                order.element.remove();
            }, 2000);
        }
        
        this.updateDisplay();
        this.showOrderFeedback(order, -20);
        
        return order;
    }

    // Show order completion feedback
    showOrderFeedback(order, score) {
        const feedback = document.createElement('div');
        feedback.className = `order-feedback ${order.rating}`;
        feedback.textContent = `${order.dishName}: ${order.rating.toUpperCase()} ${score > 0 ? '+' : ''}${score}`;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }

    // Update score and stats display
    updateDisplay() {
        if (this.scoreElement) {
            this.scoreElement.textContent = this.totalScore;
        }
        
        if (this.ordersCompletedElement) {
            this.ordersCompletedElement.textContent = this.ordersCompleted;
        }
    }

    // Get order by ID
    getOrder(orderId) {
        return this.activeOrders.get(orderId);
    }

    // Get all active orders
    getActiveOrders() {
        return Array.from(this.activeOrders.values());
    }

    // Get order statistics
    getStats() {
        return {
            totalScore: this.totalScore,
            ordersCompleted: this.ordersCompleted,
            perfectOrders: this.perfectOrders,
            activeOrders: this.activeOrders.size,
            averageScore: this.ordersCompleted > 0 ? Math.round(this.totalScore / this.ordersCompleted) : 0,
            perfectRate: this.ordersCompleted > 0 ? Math.round((this.perfectOrders / this.ordersCompleted) * 100) : 0
        };
    }

    // Set order spawn rate (milliseconds between orders)
    setSpawnRate(rate) {
        this.orderSpawnRate = rate;
        
        if (this.orderSpawnTimer) {
            clearInterval(this.orderSpawnTimer);
            this.startSpawning();
        }
    }

    // Clear all orders (useful for game reset)
    clearAllOrders() {
        this.activeOrders.clear();
        this.completedOrders = [];
        this.totalScore = 0;
        this.ordersCompleted = 0;
        this.perfectOrders = 0;
        
        if (this.ordersContainer) {
            this.ordersContainer.innerHTML = '';
        }
        
        this.updateDisplay();
    }
}

// Global order system will be initialized by the game
window.OrderSystem = OrderSystem;
