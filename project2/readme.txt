DINING ROOM SCENE - README
=========================================

PROJECT OVERVIEW
----------------
An interactive 3D dining room scene rendered using WebGL with multiple polyhedron types,
procedural textures, Phong lighting with two light sources, and camera controls.

SCENE DESCRIPTION
-----------------
- Complete dining room with walls, ceiling, and floor
- Wooden dining table (with wood grain texture) and 4 table legs
- 6 chairs around the table (5 static brown wood chairs + 1 movable red chair)
- Place settings: 6 plates, 6 cups, 6 utensil sets
- 4 spherical food bowls on the table
- Hanging lamp fixture (cylinder rod + cone shade + sphere bulb)
- 6 torus rings shape donuts on the each plate
- All objects properly lit with ambient + diffuse + specular lighting

POLYHEDRON TYPES USED (5 TYPES)
-------------------------------
1. Cubes - table, chairs, walls, ceiling, floor, plates, cups, utensils (40+ instances)
2. SemiSpheres - food bowls, lamp bulb (5 instances)
3. Cylinders - lamp rod (1 instance)
4. Cones - lamp shade (1 instance)
5. Torus - decorative rings (6 instances)
Total: 50+ polyhedra across 5 distinct geometric types

DISTINCT PIECES (20+ pieces, exceeds requirement of 3)
-------------------------------------------------------
1. Dining table (table top + 4 legs)
2. Chair #1 (brown, static)
3. Chair #2 (brown, static)
4. Chair #3 (brown, static)
5. Chair #4 (brown, static)
6. Chair #5 (brown, static)
7. Chair #6 (red, movable - USER INTERACTIVE PIECE)
8. Hanging lamp (rod + shade + bulb)
9-14. Six complete place settings (plates + cups + utensils)
15-18. Four food bowls
19-24. Six torus decorations
Plus: walls, ceiling, floor (environment)

CONTROLS
--------
All keys are case insensitive.
Camera Movement:
  - Arrow Keys (Up/Down/Left/Right) : Rotate camera around scene
  - I : Zoom in (decrease camera radius)
  - O : Zoom out (increase camera radius)

Red Chair Movement:
  - W : Move chair forward (-Z direction)
  - S : Move chair backward (+Z direction)
  - A : Move chair left (-X direction, only when x > 1.4)
  - D : Move chair right (+X direction)
  - Q: Move chair up (+Y direction)
  - E: Move chair down (-Y direction)
  - Z : Scale chair size down (Makes it small)
  - C : Scale chair size up (Makes it bigger)

Red Chair Rotation:
  - Y : Rotate chair clockwise around Y-axis
  - X : Rotate chair counterclockwise around Y-axis

Reset:
  - R : Reset camera and red chair to initial positions

TECHNICAL IMPLEMENTATION
------------------------
NO FORBIDDEN FUNCTIONS USED:
  - Did NOT use lookAt(), rotate(), scale(), translate() from MV.js
  - Did NOT use frustum(), ortho(), or perspective() from MV.js
  - All transformations implemented manually using matrix mathematics

Rendering:
  - Manual perspective projection matrix (not used code from MV.js perspective())
  - Manual view/camera matrix using lookAt math
  - Model transformations: translation, rotation (X & Y axes), scaling
  - Proper buffer management for multiple geometry types

Lighting (Phong Model):
  - TWO LIGHT SOURCES (meets requirement):
    * Light 1: Position [2.0, 2.0, 2.0]
    * Light 2: Position [-2.0, 1.5, -2.0]
  - SPECULAR REFLECTION IMPLEMENTED (meets requirement)
  - Ambient component: 0.65 (for better visibility and brighter scene)
  - Diffuse component: weighted combination from both lights (0.6 + 0.4)
  - Specular component: per-light specular highlights (0.4 + 0.3)
  - Shininess: varies by object type (15-30)

Textures:
  - Texture #1: Procedural wood grain texture (128x128) - applied to table top
  - Texture #2: Procedural checkerboard texture (64x64) - applied to floor
  - Additional solid color textures for variety - all other objects
  - All textures with proper wrapping and filtering

Geometry:
  - Cube: 8 vertices, 36 indices (12 triangles)
  - Sphere: parametric generation for semisphere that only goes till PI/2(90 degrees)(10 lat × 20 long bands)
  - Cylinder: circular cross-sections (32 segments)
  - Cone: circular base + apex (32 segments)
  - Torus: swept circle (30 major × 20 minor segments)
  - All with computed/provided normals for lighting

Shaders:
  - Vertex shader: transforms vertices, passes normals and tex coords
  - Fragment shader: Phong lighting with 2 lights + texture mapping

HOW TO RUN
----------
1. Ensure file structure:
   project2/
     ├── project2.html
     ├── project2.js
     └── README.txt
   Common/
     ├── webgl-utils.js
     ├── initShaders.js
     ├── initShaders2.js
     └── MV.js

2. Serve via local HTTP server (required for WebGL):
   - Python 3: python -m http.server 8000
   - Python 2: python -m SimpleHTTPServer 8000
   - Manually: Open project2.html file in firefox/google using "CMD+ O" or "CTRL + O"

3. Navigate to: http://localhost:8000/project2/project2.html

4. Use controls to explore the scene

FEATURES IMPLEMENTED
--------------------
✓ Multiple polyhedron types (5+ required, 5 implemented)
✓ Hierarchical modeling (chairs with seats, backrests, legs)
✓ Procedural textures (wood grain, checkerboard)
✓ Two-light Phong illumination
✓ Interactive camera controls
✓ Interactive object manipulation (red chair)
✓ Proper depth testing and buffer management
✓ Well-organized code with helper functions
