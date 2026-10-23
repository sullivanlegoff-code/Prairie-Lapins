# Cook Tap - Restaurant Simulation Game

A web-based cooking game inspired by Cook Serve Delicious, built with vanilla HTML, CSS, and JavaScript.

## Game Overview

Cook Tap is a fast-paced restaurant simulation where you prepare dishes by pressing specific keys for ingredients and cooking tools. Manage multiple orders simultaneously while racing against the clock!

## Features

- **Key-based cooking system**: Each ingredient and tool is mapped to specific keyboard keys
- **Multiple cooking stations**: Prep Station, Grill, Deep Fryer, and Stove
- **Order management**: Handle multiple customer orders with time pressure
- **5 different dishes** with varying complexity levels
- **Real-time scoring** with Perfect/Good/Average/Bad ratings
- **Visual feedback** with colored ingredient/tool categories

## How to Play

1. **Start the game**: Click "Start Game" button
2. **Select an order**: Press number keys 1-9 to select customer orders
3. **Add ingredients**: Press the corresponding letter keys to add ingredients
4. **Use tools**: Press tool keys to cook, chop, mix, etc.
5. **Serve dishes**: Press SPACE when the dish is complete
6. **Cancel**: Press ESC to cancel current dish

## Available Dishes

### 1. Classic Burger 🍔
- **Ingredients**: Bun (J), Beef Patty (B), Lettuce (L), Tomato (T), Cheese (H), Pickles (P), Ketchup (K), Mustard (Y)
- **Tools**: Grill (Q), Slice (V), Plate (SPACE)
- **Difficulty**: 2/5

### 2. Margherita Pizza 🍕
- **Ingredients**: Pizza Dough (D), Tomato Sauce (S), Mozzarella (Z), Oregano (G)
- **Tools**: Mix (3), Bake (2), Plate (SPACE)
- **Difficulty**: 3/5

### 3. Fried Chicken 🍗
- **Ingredients**: Chicken Breast (C), Salt (I), Pepper (R)
- **Tools**: Fry (F), Plate (SPACE)
- **Difficulty**: 2/5

### 4. Caesar Salad 🥗
- **Ingredients**: Lettuce (L), Chicken Breast (C), Cheese (H), Mayo (W)
- **Tools**: Grill (Q), Chop (X), Slice (V), Toss (4), Plate (SPACE)
- **Difficulty**: 3/5

### 5. Pasta Marinara 🍝
- **Ingredients**: Pasta (A), Tomato Sauce (S), Oregano (G), Cheese (H)
- **Tools**: Boil (1), Mix (3), Plate (SPACE)
- **Difficulty**: 2/5

## Ingredient Categories

- **Meat** (Red): Beef, Chicken, Bacon
- **Vegetables** (Green): Lettuce, Tomato, Onion, Pickles, Mushrooms, Bell Pepper
- **Dairy** (Yellow): Cheese, Mozzarella, Butter
- **Grains** (Brown): Buns, Pizza Dough, Pasta
- **Sauces** (Orange): Ketchup, Mustard, Mayo, Tomato Sauce
- **Seasonings** (Purple): Salt, Pepper, Oregano

## Cooking Stations

### Prep Station (Green)
- Add ingredients and perform basic preparation
- Actions: Chop, Slice, Mix, Toss, Plate

### Grill Station (Orange)
- Cook meats and some vegetables
- Actions: Grill
- Capacity: 3 items

### Deep Fryer (Yellow)
- Fry chicken, potatoes, and other fried foods
- Actions: Deep Fry
- Capacity: 2 items

### Stove Station (Purple)
- Boil pasta and bake pizza
- Actions: Boil, Bake
- Capacity: 4 items

## Scoring System

- **Perfect**: Complete within 75% of time limit - 100 points
- **Good**: Complete within 25-75% of time limit - 60 points
- **Average**: Complete with less than 25% time remaining - 30 points
- **Bad**: Incomplete or missing ingredients - 0 points
- **Failed**: Order expires - -20 points

## Controls

- **1-9**: Select customer orders
- **A-Z**: Ingredient and tool keys (see dish recipes)
- **SPACE**: Serve completed dish
- **ESC**: Cancel current dish preparation

## Technical Architecture

### Core Systems

1. **DishSystem**: Manages recipes, ingredients, tools, and cooking stations
2. **OrderSystem**: Handles customer orders, timing, and scoring
3. **CookingStationManager**: Manages cooking stations and their states
4. **InputHandler**: Processes keyboard input and key mappings
5. **CookTapGame**: Main game controller that orchestrates all systems

### File Structure
```
cooktap/
├── index.html              # Main game page
├── styles.css              # Game styling
├── js/
│   ├── dish-system.js      # Recipe and ingredient management
│   ├── cooking-stations.js # Cooking station logic
│   ├── order-system.js     # Order and scoring system
│   ├── input-handler.js    # Keyboard input handling
│   └── game.js             # Main game controller
└── README.md               # This file
```

## Development

The game is built with vanilla web technologies:
- **HTML5** for structure
- **CSS3** with Grid and Flexbox for layout
- **Vanilla JavaScript** with ES6+ features
- **Modular architecture** with separate systems

### Adding New Dishes

1. Open `js/dish-system.js`
2. Add ingredients to `initializeIngredients()`
3. Add tools to `initializeTools()` if needed
4. Add dish definition to `initializeDishes()`

### Adding New Cooking Stations

1. Add station config to `initializeCookingStations()`
2. Update HTML structure in `index.html`
3. Add station-specific CSS in `styles.css`

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Future Enhancements

- [ ] More dishes and ingredients
- [ ] Sound effects and music
- [ ] Animation and visual effects
- [ ] Achievement system
- [ ] Difficulty levels
- [ ] Save/load game progress
- [ ] Multiplayer support

## License

This project is open source and available under the MIT License.

---

**Cook Tap** - Master the kitchen, one keypress at a time! 🍳

