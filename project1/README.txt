=================================================================================================================================================

Project Name: Color Catcher
Team Members: Kalli Koppin, Anuja Alluri

=================================================================================================================================================

Game Description:
Color Catcher is a 2D WebGL game where the player controls a white bucket at the bottom of the screen to catch falling triangles that match 
the current target color shown at the top. The game begins with a start screen containing instructions and a “Start Game” button. 
Once the game starts, triangles fall from the top, and the player must catch only the triangles that match the target color.
The player uses the left and right arrow keys to move the bucket horizontally across the canvas.

Each correctly caught triangle matching the target color earns +1 point. Catching the wrong color or missing a triangle of the correct 
color results in -1 point and adds a strike. If the player reaches 15 points, they win the game. If the player accumulates 5 misses, 
the game ends with a GAME OVER message.

=================================================================================================================================================

Controls:
- Left Arrow (←): Move the bucket to the left.
- Right Arrow (→): Move the bucket to the right.
- Start Button: Begins the game.
- Play Again Button: Appears after win/lose to restart.

=================================================================================================================================================

Implementation:

-------------------------------------------------------------------------------------------------------------------------------------------------

Gameplay Logic
- setupGame()
    - Initializes triangles, bucket, colors, and timers.
- render():
    - The core game loop called using `requestAnimationFrame()`:
    - Moves the bucket based on keyboard input.
    - Updates triangle positions and checks collisions. 
    - Handles scoring, misses, win/loss logic.
    - Spawns power-ups periodically.
- createTriangle()
    - Generates a triangle with random x-position, speed, and color.

-------------------------------------------------------------------------------------------------------------------------------------------------

Scoring System:
- Score increases for catching correct triangles.
- Score decreases and misses increment for catching the wrong color or missing the correct target.
- Diamond power-up adds 3 points.
- Circle power-up removes one strike.

-------------------------------------------------------------------------------------------------------------------------------------------------

Win/Loss Conditions:
- Score ≥ 15 → “YOU WIN!” message, game stops.
- Misses ≥ 5 → “GAME OVER” message, game stops.

-------------------------------------------------------------------------------------------------------------------------------------------------

UI Logic:
- setupUI():
    - Builds the Start Screen.
    - Creates on-screen elements for Score, Misses, Target Color, Game Message, and Play Again button.
    - Handles resetting all UI on restart.
- updateScore() and updateMissDisplay():
    - Continuously update the score and number of strikes (x) on the screen.
- updateTargetColor():  
    - Chooses a random color from a 6-color list and updates the target display and game logic simultaneously.\
- showMessage():
    - Displays end-of-game text (“YOU WIN!” or “GAME OVER”) and shows “Play Again” button.

-------------------------------------------------------------------------------------------------------------------------------------------------

WebGL & Rendering:
Polygons:
- Rectangle (Bucket): Rectangle drawn using a TRIANGLE_FAN
- Triangles (Falling Objects to catch): 3-vertex polygons with random colors
- Circle (Power-Up): Approximated with multiple vertices in a fan shape (24 segments).
- Diamond (Power-Up): 4 vertices arranged in a diamond shape.

-------------------------------------------------------------------------------------------------------------------------------------------------

Colors:
- Red (Triangle)
- Green (Triangle)
- Blue (Triangle)
- Cyan (Triangle)
- Magenta (Triangle)
- Yellow (Triangle)
- White (Circle, Diamond, Rectangle)

-------------------------------------------------------------------------------------------------------------------------------------------------

Shaders:
- Vertex Shader: Applies translation matrix and passes color to the fragment shader.
- Fragment Shader: Renders the interpolated color per pixel.
- setupGame(): 
    - Creates vertex/color buffers for the bucket and triangle geometry.
- drawScene():
    - Draws the bucket at its translated position.
    - Updates triangle colors dynamically with bufferSubData.
    - Draws all triangles, then draws circle and diamond power-ups if active.
- bindMainBuffers(): 
    - Rebinds main buffers after drawing power-ups to restore the primary geometry state.

-------------------------------------------------------------------------------------------------------------------------------------------------

Power-Up System:
- spawnCirclePowerUp():
    - Creates vertices for a filled circle using TRIANGLE_FAN
    - Drops every twenty-five seconds
    - On collision, remove a strike if any
- spawnDiamondPowerUp():
    - Creates vertices for a diamond shape.
    - Drops every ten seconds
    - On collision, add three points to the score
- updateCirclePowerUp() & updateDiamondPowerUp():
    - Move power-ups down the screen each frame.  
    - Disable them if they go off-screen or are collected.

-------------------------------------------------------------------------------------------------------------------------------------------------

Collision & Scoring:
- checkCollision(triangle):
    - Compares the triangle’s bottom and horizontal extents against the bucket’s top and sides.
- checkPowerUpCollision(powerUp):
    - Checks circle/diamond position against the bucket bounds.
- colorsMatch(a, b):
    - Compares RGB values with a small tolerance to determine if a triangle matches the target color.

=================================================================================================================================================

Key Implementation Features:
- The bucket and triangles are represented as 2D polygons stored in vertex buffers.
- Triangles are continuously animated to fall down the screen with varying speeds.
- Collision detection between the bucket and triangles (or power-ups) is implemented through coordinate comparisons.
- The target color is randomly chosen from a list of six colors.
- The UI is managed through HTML elements (score, target color, misses, messages).
- A clear separation of concerns is maintained between HTML, CSS, and JS files.
- The game logic includes scoring, win/lose conditions, power-up effects, and restart functionality.

=================================================================================================================================================

How to Run:
1. Place all files and the `Common/` folder in a single directory named project1/.
2. Open `index.html` in a browser that supports WebGL (e.g., Chrome or Firefox).
3. Click **Start Game** to begin.
4. Use the arrow keys to control the bucket and collect the target color of the triangle
5. Catch power-ups to earn extra points or remove strikes.
6. Win by reaching 15 points or lose by getting 5 strikes.

=================================================================================================================================================

Environment:
- WebGL (Vertex & Fragment Shaders)
- JavaScript (game logic)
- HTML & CSS (UI and layout)

=================================================================================================================================================
