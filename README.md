# ComputerGraphics
Repo for cs 4500 for all labs and projects

## Project 1 - Color Catching
Color Catcher is a 2D WebGL game where the player controls a white bucket at the bottom of the screen to catch falling triangles that match 
the current target color shown at the top. The game begins with a start screen containing instructions and a “Start Game” button. 
Once the game starts, triangles fall from the top, and the player must catch only the triangles that match the target color.
The player uses the left and right arrow keys to move the bucket horizontally across the canvas.

Each correctly caught triangle matching the target color earns +1 point. Catching the wrong color or missing a triangle of the correct 
color results in -1 point and adds a strike. If the player reaches 15 points, they win the game. If the player accumulates 5 misses, 
the game ends with a GAME OVER message.
