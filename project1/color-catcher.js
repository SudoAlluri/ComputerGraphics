//Anuja Alluri

// global variables
var gl;
var program;
var uTranslationLoc;
var canvas;

// gameplay variables
var bucketX = 0.0;
var bucketSpeed = 0.03;
var keys = {};
var score = 0;
var misses = 0;
var gameOver = false;
var gameWon = false;
var gameStarted = false; 

// triangles
var triangles = [];
var numTriangles = 4;

// color logic
var targetColor = [0.0, 1.0, 0.0];
var colorsList = [
  { name: "Red", rgb: [1.0, 0.0, 0.0] },
  { name: "Green", rgb: [0.0, 1.0, 0.0] },
  { name: "Blue", rgb: [0.0, 0.0, 1.0] },
  { name: "Yellow", rgb: [1.0, 1.0, 0.0] },
  { name: "Magenta", rgb: [1.0, 0.0, 1.0] },
  { name: "Cyan", rgb: [0.0, 1.0, 1.0] }
];

// scaling
var bucketWidth = 0.15;
var bucketHeight = 0.1;
var triSize = 0.05;

// main buffers + attribs
var mainVBuffer = null;
var mainCBuffer = null;
var vPositionLoc = null;
var vColorLoc = null;

// packed geometry
var BUCKET_VERTS = 0;
var TRI_VERTS = 0;
var TRI_START = 0;

// power up variables
var circlePowerUp = null;
var diamondPowerUp = null;
var lastCircleTime = 0;
var lastDiamondTime = 0;
var circleInterval = 25000;   // drop every 15s
var diamondInterval = 10000;   // drop every 5s
var circleVBuffer = null;
var circleCBuffer = null;
var diamondVBuffer = null;
var diamondCBuffer = null;

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");
  resizeCanvas();

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL not available...");
    return;
  }

  setupGame();
  window.addEventListener("resize", resizeCanvas);
};

// canvs set up
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
}

// game set up
function setupGame() {
  var points = [];
  var colors = [];

  // bucket verts
  var bucketVertsLocal = [
    vec2(-bucketWidth, -1.0 + bucketHeight * 0.3),
    vec2(bucketWidth, -1.0 + bucketHeight * 0.3),
    vec2(bucketWidth, -1.0 + bucketHeight * 2.0),
    vec2(-bucketWidth, -1.0 + bucketHeight * 2.0)
  ];
  bucketVertsLocal.forEach(v => { points.push(v); colors.push(vec3(1.0, 1.0, 1.0)); });
  BUCKET_VERTS = bucketVertsLocal.length;

  // triangle verts
  var triVertsLocal = [
    vec2(0.0, triSize),
    vec2(triSize, -triSize),
    vec2(-triSize, -triSize)
  ];
  triVertsLocal.forEach(v => { points.push(v); colors.push(vec3(1.0, 0.0, 0.0)); });
  TRI_VERTS = triVertsLocal.length;
  TRI_START = BUCKET_VERTS;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);
  uTranslationLoc = gl.getUniformLocation(program, "uTranslation");

  vPositionLoc = gl.getAttribLocation(program, "vPosition");
  vColorLoc = gl.getAttribLocation(program, "vColor");

  mainVBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mainVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
  gl.vertexAttribPointer(vPositionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPositionLoc);

  mainCBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mainCBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(vColorLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColorLoc);

  window.addEventListener("keydown", e => keys[e.key] = true);
  window.addEventListener("keyup", e => keys[e.key] = false);

  setupUI();
  //updateTargetColor();

  for (let i = 0; i < numTriangles; i++) triangles.push(createTriangle());

  lastCircleTime = performance.now();
  lastDiamondTime = performance.now();
}

// game objects
function createTriangle() {
  let newTri;
  let valid = false;
  let minDistance = 0.25; // minimum distance between triangles

  while (!valid) {
    newTri = {
      x: (Math.random() * 1.8) - 0.9, // full width range
      y: 1.0 + Math.random() * 1.5,   // higher range to spread vertically
      color: colorsList[Math.floor(Math.random() * colorsList.length)].rgb,
      speed: 0.004 + Math.random() * 0.002 // slower fall
    };

    valid = true;
    for (let t of triangles) {
      const dx = newTri.x - t.x;
      const dy = newTri.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        valid = false;
        break;
      }
    }
  }

  return newTri;
}


// user interface
function setupUI() {
  ["scoreDisplay","missDisplay","targetDisplay","gameMessage","playAgain","startScreen"].forEach(id=>{
    const old = document.getElementById(id); if (old) old.remove();
  });

  //  press play to start screen 
  const startScreen = document.createElement("div");
  startScreen.id = "startScreen";
  Object.assign(startScreen.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    color: "white",
    fontFamily: "monospace",
    background: "rgba(0,0,0,0.7)",
    padding: "40px",
    borderRadius: "12px"
  });

  const title = document.createElement("h1");
  title.innerText = "Color Catcher";
  Object.assign(title.style, {
    fontSize: "64px",
    marginBottom: "20px"
  });
  startScreen.appendChild(title);

  const startButton = document.createElement("button");
  startButton.innerText = "Start Game";
  Object.assign(startButton.style, {
    fontSize: "28px",
    padding: "12px 24px",
    cursor: "pointer",
    background: "#fff",
    color: "#000",
    border: "2px solid #fff"
  });
  startButton.onclick = function () {
    gameStarted = true;
    startScreen.style.display = "none";
    document.getElementById("targetDisplay").style.display = "block";
  updateTargetColor(); 
    requestAnimationFrame(render);
  };
  startScreen.appendChild(startButton);
  document.body.appendChild(startScreen);
  // instructions text
const instructions = document.createElement("div");
instructions.innerHTML = `
  <h2>How to Play</h2>
  <p>△ Catch triangles that match the <b>TARGET COLOR</b> shown at the top right.</p>
  <p>⚠️ The target color <b>changes</b> every time you catch the correct triangle!</p>
  <p>❌ Missing or catching the wrong color increases your strikes.</p>
  <p>Use the <b>←</b> and <b>→</b> arrow keys to move the bucket.</p>
  <p>Reach 15 points to win. 5 misses = Game Over.</p>
  <p> <b>Bonus Power-Ups: </b></p>
  <div style="margin-left: 20px;">
  <p>⚪<b> White Circle:</b> Removes one strike.</p>
  <p> ♢  <b>White Diamond:</b> Adds +3 score points.</p>
  </div>
  

`;
Object.assign(instructions.style, {
  fontSize: "18px",
  color: "white",
  fontFamily: "monospace",
  textAlign: "left",
  marginTop: "20px",
  background: "rgba(255, 255, 255, 0.1)",
  padding: "15px",
  borderRadius: "10px",
  lineHeight: "1.5em",
});

startScreen.appendChild(instructions);


  // messages
  // dsplay the score
  const scoreDisplay = document.createElement("div");
  scoreDisplay.id = "scoreDisplay";
  Object.assign(scoreDisplay.style, {position:"absolute", top:"20px", left:"30px", fontSize:"24px", fontFamily:"monospace", color:"white"});
  scoreDisplay.innerText = "Score: 0";
  document.body.appendChild(scoreDisplay);

  // display missing strikes
  const missDisplay = document.createElement("div");
  missDisplay.id = "missDisplay";
  Object.assign(missDisplay.style, {position:"absolute", top:"20px", left:"200px", fontSize:"28px", fontFamily:"monospace", color:"red"});
  document.body.appendChild(missDisplay);

  // display target color
  const targetDisplay = document.createElement("div");
  targetDisplay.id = "targetDisplay";
  Object.assign(targetDisplay.style, {position:"absolute", top:"20px", right:"40px", fontSize:"24px", fontFamily:"monospace", fontWeight:"bold", color:"white"});
  targetDisplay.style.display = "none"; // hide target color until game starts
  document.body.appendChild(targetDisplay);



  const gameMessage = document.createElement("div");
  gameMessage.id = "gameMessage";
  Object.assign(gameMessage.style, {position:"absolute", top:"45%", left:"50%", transform:"translate(-50%, -50%)", fontSize:"64px", fontWeight:"bold", fontFamily:"monospace", display:"none", color:"white"});
  document.body.appendChild(gameMessage);

  // display play again screen
  const playAgain = document.createElement("button");
  playAgain.id = "playAgain";
  playAgain.innerText = "Play Again";
  Object.assign(playAgain.style, {position:"absolute", top:"60%", left:"50%", transform:"translate(-50%, -50%)", fontSize:"28px", padding:"12px 24px", display:"none", cursor:"pointer", background:"#fff", color:"#000", border:"2px solid #fff"});
  document.body.appendChild(playAgain);

  playAgain.onclick = function() {
    score = 0;
    misses = 0;
    triangles = [];
    for (let i = 0; i < numTriangles; i++) triangles.push(createTriangle());
    circlePowerUp = null;
    diamondPowerUp = null;
    lastCircleTime = performance.now();
    lastDiamondTime = performance.now();
    gameOver = false;
    gameWon = false;
    updateScore();
    updateMissDisplay();
    updateTargetColor();
    gameMessage.style.display = "none";
    playAgain.style.display = "none";
    requestAnimationFrame(render);
  };
}

// logic for powerups
function spawnCirclePowerUp() {
  circlePowerUp = {
    x: (Math.random() * 1.8) - 0.9,
    y: 1.0,
    radius: triSize * 1.2,
    speed: 0.004,
    active: true,
    vertsCount: 0
  };

  const verts = [vec2(0, 0)];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    verts.push(vec2(Math.cos(angle) * circlePowerUp.radius, Math.sin(angle) * circlePowerUp.radius));
  }
  circlePowerUp.vertsCount = verts.length;
const colors = Array(verts.length).fill([1.0, 1.0, 1.0]); // gold color
  circleVBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);

  circleCBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleCBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

  lastCircleTime = performance.now();
}

function spawnDiamondPowerUp() {
  diamondPowerUp = {
    x: (Math.random() * 1.8) - 0.9,
    y: 1.0,
    radius: triSize * 1.4,
    speed: 0.004,
    active: true,
    vertsCount: 0,
    color: [1.0,1.0,1.0] // white
  };

  const r = diamondPowerUp.radius;
  const verts = [
    vec2(0, r),
    vec2(r, 0),
    vec2(0, -r),
    vec2(-r, 0)
  ];
  diamondPowerUp.vertsCount = verts.length;
  const colors = Array(verts.length).fill(diamondPowerUp.color);

  diamondVBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, diamondVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);

  diamondCBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, diamondCBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

  lastDiamondTime = performance.now();
}

// render loop
function render() {
  if (!gameStarted) return; 
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (gameOver || gameWon) {
    drawScene();
    return;
  }

  if (keys["ArrowLeft"])  bucketX = Math.max(bucketX - bucketSpeed, -1 + bucketWidth);
  if (keys["ArrowRight"]) bucketX = Math.min(bucketX + bucketSpeed,  1 - bucketWidth);

  if ((!circlePowerUp || !circlePowerUp.active) &&
      performance.now() - lastCircleTime > circleInterval) {
    spawnCirclePowerUp();
  }

  if ((!diamondPowerUp || !diamondPowerUp.active) &&
      performance.now() - lastDiamondTime > diamondInterval) {
    spawnDiamondPowerUp();
  }

  // update triangles
  for (let t of triangles) {
    t.y -= t.speed;

    if (checkCollision(t)) {
      if (colorsMatch(t.color, targetColor)) {
        score++;
        updateScore();
        updateTargetColor();
        triangles.forEach(tri => {
          if (tri !== t && colorsMatch(tri.color, targetColor)) Object.assign(tri, createTriangle());
        });
      } else {
        score = Math.max(0, score - 1);
        misses++;
        updateScore();
        updateMissDisplay();
        if (misses >= 5) { gameOver = true; showMessage("GAME OVER","red"); return; }
      }
      Object.assign(t, createTriangle());
      if (score >= 15) { gameWon = true; showMessage("YOU WIN!","green"); return; }
    }

    if (t.y < -1.1) {
      if (colorsMatch(t.color, targetColor)) {
        misses++; score = Math.max(0, score - 1);
        updateMissDisplay(); updateScore();
        if (misses >= 5) { gameOver = true; showMessage("GAME OVER","red"); return; }
      }
      Object.assign(t, createTriangle());
    }
  }

  // update circle power-up
  if (circlePowerUp && circlePowerUp.active) {
    circlePowerUp.y -= circlePowerUp.speed;
    if (checkPowerUpCollision(circlePowerUp)) {
      if (misses > 0) { misses--; updateMissDisplay(); }
      circlePowerUp.active = false;
    } else if (circlePowerUp.y < -1.1) {
      circlePowerUp.active = false;
    }
  }

  // update diamond power-up
  if (diamondPowerUp && diamondPowerUp.active) {
    diamondPowerUp.y -= diamondPowerUp.speed;
    if (checkPowerUpCollision(diamondPowerUp)) {
      score += 3;
      updateScore();
      updateTargetColor();
      diamondPowerUp.active = false;
    } else if (diamondPowerUp.y < -1.1) {
      diamondPowerUp.active = false;
    }
  }

  drawScene();
  requestAnimationFrame(render);
}

// draw scene
function drawScene() {
  bindMainBuffers();

  // draw bucket
  gl.uniformMatrix4fv(uTranslationLoc, false, flatten(translate(bucketX, 0.0, 0.0)));
  gl.drawArrays(gl.TRIANGLE_FAN, 0, BUCKET_VERTS);

  // draw triangles
  gl.bindBuffer(gl.ARRAY_BUFFER, mainCBuffer);
  const triColorOffsetBytes = BUCKET_VERTS * 3 * 4;
  for (let t of triangles) {
    const triColors = [];
    for (let i = 0; i < TRI_VERTS; i++) triColors.push(t.color);
    gl.bufferSubData(gl.ARRAY_BUFFER, triColorOffsetBytes, flatten(triColors));

    gl.uniformMatrix4fv(uTranslationLoc, false, flatten(translate(t.x, t.y, 0.0)));
    gl.drawArrays(gl.TRIANGLES, TRI_START, TRI_VERTS);
  }

  // draw circle power-up
  if (circlePowerUp && circlePowerUp.active) {
    gl.bindBuffer(gl.ARRAY_BUFFER, circleCBuffer);
    gl.vertexAttribPointer(vColorLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColorLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, circleVBuffer);
    gl.vertexAttribPointer(vPositionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPositionLoc);

    gl.uniformMatrix4fv(uTranslationLoc, false, flatten(translate(circlePowerUp.x, circlePowerUp.y, 0.0)));
    gl.drawArrays(gl.TRIANGLE_FAN, 0, circlePowerUp.vertsCount);
  }

  // draw diamond power-up
  if (diamondPowerUp && diamondPowerUp.active) {
    gl.bindBuffer(gl.ARRAY_BUFFER, diamondCBuffer);
    gl.vertexAttribPointer(vColorLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColorLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, diamondVBuffer);
    gl.vertexAttribPointer(vPositionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPositionLoc);

    gl.uniformMatrix4fv(uTranslationLoc, false, flatten(translate(diamondPowerUp.x, diamondPowerUp.y, 0.0)));
    gl.drawArrays(gl.TRIANGLE_FAN, 0, diamondPowerUp.vertsCount);
  }
}

// collisions logic
// check if collision with bucket
function checkCollision(tri) {
  var bucketLeft = bucketX - bucketWidth;
  var bucketRight = bucketX + bucketWidth;
  var bucketTop = -1.0 + bucketHeight * 2;
  var triLeft = tri.x - triSize;
  var triRight = tri.x + triSize;
  var triBottom = tri.y - triSize;
  return triBottom <= bucketTop && triRight >= bucketLeft && triLeft <= bucketRight;
}

// check if powerup is what collided with bucket
function checkPowerUpCollision(p) {
  var bucketLeft = bucketX - bucketWidth;
  var bucketRight = bucketX + bucketWidth;
  var bucketTop = -1.0 + bucketHeight * 2;
  var left = p.x - p.radius;
  var right = p.x + p.radius;
  var bottom = p.y - p.radius;
  return bottom <= bucketTop && right >= bucketLeft && left <= bucketRight;
}

// update score constantly
function updateScore() {
  document.getElementById("scoreDisplay").innerText = "Score: " + score;
}

// update missed constantly
function updateMissDisplay() {
  document.getElementById("missDisplay").innerText = "❌ ".repeat(misses);
}

// update target color constantly
function updateTargetColor() {
  var newTarget = colorsList[Math.floor(Math.random() * colorsList.length)];
  targetColor = newTarget.rgb;
  var text = "TARGET: " + newTarget.name.toUpperCase();
  var targetDisplay = document.getElementById("targetDisplay");
  targetDisplay.innerText = text;
  targetDisplay.style.color = newTarget.name.toLowerCase();
}

// show play again message at the end
function showMessage(text, color) {
  const msg = document.getElementById("gameMessage");
  msg.innerText = text;
  msg.style.color = color;
  msg.style.display = "block";
  document.getElementById("playAgain").style.display = "block";
}

function bindMainBuffers() {
  gl.bindBuffer(gl.ARRAY_BUFFER, mainVBuffer);
  gl.vertexAttribPointer(vPositionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPositionLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, mainCBuffer);
  gl.vertexAttribPointer(vColorLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColorLoc);
}

function colorsMatch(a, b) {
  return Math.abs(a[0] - b[0]) < 0.1 &&
         Math.abs(a[1] - b[1]) < 0.1 &&
         Math.abs(a[2] - b[2]) < 0.1;
}
