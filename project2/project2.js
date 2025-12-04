// ==================== GLOBALS ====================
var gl, program, canvas;

// Player/cube state
var cubeRotX = 0.0, cubeRotY = 0.0;
var cubePosX = 0.0, cubePosY = 0.5, cubePosZ = 0.0;
var cubeScale = 0.25;
var scaleStep = 0.05;

// Camera state
var camAngleX = -0.5;
var camAngleY = 1.50;
var camRadius = 2.2;

// Constants
var TABLE_MIN = -0.65;
var TABLE_MAX = 0.65;

// Light positions
var light1Pos = [2.0, 2.0, 2.0];
var light2Pos = [-2.0, 1.5, -2.0];

// GPU resources
var buffers = {};
var uniforms = {};
var textures = {};


// ==================== GEOMETRY ====================
function createCubeGeometry() {
    var vertices = [
        vec4(-0.5, -0.5,  0.5, 1), vec4(0.5, -0.5,  0.5, 1),
        vec4(0.5,  0.5,  0.5, 1), vec4(-0.5,  0.5,  0.5, 1),
        vec4(-0.5, -0.5, -0.5, 1), vec4(0.5, -0.5, -0.5, 1),
        vec4(0.5,  0.5, -0.5, 1), vec4(-0.5,  0.5, -0.5, 1)
    ];

    var textcoords = [
        [0,0], [1,0], [1,1], [0,1],
        [0,0], [1,0], [1,1], [0,1]
    ];

    var indices = [
        0,1,2, 0,2,3,
        1,5,6, 1,6,2,
        5,4,7, 5,7,6,
        4,0,3, 4,3,7,
        3,2,6, 3,6,7,
        4,5,1, 4,1,0
    ];
    return { vertices: vertices, texcoords: textcoords, indices: indices };
}

function computeNormals(vertices, indices) {
    var faceNormals = [];
    for (var i = 0; i < 12; i++) {
        var p0 = vec3(vertices[indices[3*i]][0], vertices[indices[3*i]][1], vertices[indices[3*i]][2]);
        var p1 = vec3(vertices[indices[3*i+1]][0], vertices[indices[3*i+1]][1], vertices[indices[3*i+1]][2]);
        var p2 = vec3(vertices[indices[3*i+2]][0], vertices[indices[3*i+2]][1], vertices[indices[3*i+2]][2]);
        var n = normalize(cross(subtract(p1, p0), subtract(p2, p0)));
        faceNormals.push(n);
    }
    var vertexNormals = [];
    for (var v = 0; v < 8; v++) {
        var sum = vec3(0, 0, 0);
        for (var f = 0; f < 12; f++) {
            if (indices[3*f] === v || indices[3*f+1] === v || indices[3*f+2] === v) {
                sum = add(sum, faceNormals[f]);
            }
        }
        vertexNormals.push(normalize(sum));
    }
    return vertexNormals;
}


// ==================== MATRIX HELPERS ====================
function buildModelMatrix(translate, scale, rotX, rotY) {
    var T = mat4();
    T[0][3] = translate[0];
    T[1][3] = translate[1];
    T[2][3] = translate[2];

    var S = mat4(
        scale[0], 0, 0, 0,
        0, scale[1], 0, 0,
        0, 0, scale[2], 0,
        0, 0, 0, 1
    );

    var Rx = mat4(
        1, 0, 0, 0,
        0, Math.cos(rotX), -Math.sin(rotX), 0,
        0, Math.sin(rotX), Math.cos(rotX), 0,
        0, 0, 0, 1
    );

    var Ry = mat4(
        Math.cos(rotY), 0, Math.sin(rotY), 0,
        0, 1, 0, 0,
        -Math.sin(rotY), 0, Math.cos(rotY), 0,
        0, 0, 0, 1
    );

    return mult(T, mult(Ry, mult(Rx, S)));
}

function getCameraMatrix() {
    var eye = vec3(
        camRadius * Math.sin(camAngleX) * Math.cos(camAngleY),
        camRadius * Math.sin(camAngleY) + 1.0,
        camRadius * Math.cos(camAngleX) * Math.cos(camAngleY)
    );
    var at = vec3(0.25, 0.50, 0.0);
    var vup = vec3(0, 1, 0);

    var nVec = normalize(subtract(eye, at));
    var uVec = normalize(cross(vup, nVec));
    var vVec = cross(nVec, uVec);

    return [
        uVec[0], vVec[0], nVec[0], 0,
        uVec[1], vVec[1], nVec[1], 0,
        uVec[2], vVec[2], nVec[2], 0,
        -dot(uVec, eye), -dot(vVec, eye), -dot(nVec, eye), 1
    ];
}

function getProjectionMatrix() {
    var fovy = 45 * Math.PI / 90.0;
    var aspect = canvas.width / canvas.height;
    var near = 0.1;
    var far = 100.0;
    var f = 1.0 / Math.tan(fovy / 2.0);

    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0
    ];
}

// ==================== TEXTURE HELPERS ====================
function createSolidColorTexture(r, g, b) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    var data = new Uint8Array([
        Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255), 255
    ]);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    return texture;
}

function createCheckerboardTexture() {
    var size = 64;
    var data = new Uint8Array(size * size * 4);
    var index = 0;
    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            var isWhite = ((Math.floor(i / 8) + Math.floor(j / 8)) % 2) === 0;
            data[index++] = isWhite ? 255 : 100;
            data[index++] = isWhite ? 255 : 100;
            data[index++] = isWhite ? 255 : 100;
            data[index++] = 255;
        }
    }
    
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    
    return texture;
}

function createWoodGrainTexture() {
    var size = 128;
    var data = new Uint8Array(size * size * 4);
    var index = 0;
    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            // Create wood grain effect with varying horizontal stripes
            var stripe = Math.floor(i / 4) % 8;
            var variation = Math.sin(j * 0.05 + stripe * 0.5) * 20;
            var baseColor = 160 + variation;
            var r = Math.floor(baseColor * 0.8);
            var g = Math.floor(baseColor * 0.6);
            var b = Math.floor(baseColor * 0.3);
            
            data[index++] = Math.max(0, Math.min(255, r));
            data[index++] = Math.max(0, Math.min(255, g));
            data[index++] = Math.max(0, Math.min(255, b));
            data[index++] = 255;
        }
    }
    
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    
    return texture;
}

// ==================== RENDERING ====================
function drawCube(translate, scale, color, rotX, rotY, textureId) {
    rotX = rotX || 0;
    rotY = rotY || 0;
    textureId = textureId || 'wood';

    var model = buildModelMatrix(translate, scale, rotX, rotY);
    gl.uniformMatrix4fv(uniforms.uModel, false, flatten(model));
    gl.uniform3fv(uniforms.uK, color);
    gl.uniform1f(uniforms.uShininess, 20.0);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[textureId]);
    gl.uniform1i(uniforms.uTexture, 0);
    
    gl.drawElements(gl.TRIANGLES, buffers.numIndices, gl.UNSIGNED_BYTE, 0);
}

function drawChair(translate, rotY, textureId) {
    rotY = rotY || 0;
    textureId = textureId || 'wood';
    
    // Chair seat
    drawCube([translate[0], translate[1] + 0.35, translate[2]], [0.35, 0.08, 0.35], [0.55, 0.35, 0.15], 0, rotY, textureId);
    
    // Chair backrest drawcube(translate, scale, color, rotX, rotY, textureId)
    //drawCube([translate[0], translate[1] + 0.50, translate[2] - 0.15], [0.35, 0.4, 0.08], [0.55, 0.35, 0.15], 0, rotY, textureId);
    
    // Chair backrest - positioned in front of seat, facing outward from table
    // Offset is always in the -Z direction in local chair space, then rotated
    var backrestLocalZ = 0.17;
    var backrestX = translate[0] + backrestLocalZ * Math.sin(rotY);
    var backrestZ = translate[2] + backrestLocalZ * Math.cos(rotY);
    drawCube([backrestX, translate[1] + 0.55, backrestZ], [0.35, 0.35, 0.08], [0.55, 0.35, 0.15], 0, rotY, textureId);



    // Chair legs (4 small cubes)
    var legOffset = 0.12;
    drawCube([translate[0] - legOffset, translate[1] + 0.15, translate[2] - legOffset], [0.08, 0.3, 0.08], [0.4, 0.25, 0.12], 0, rotY, textureId); // Front-left leg
    drawCube([translate[0] + legOffset, translate[1] + 0.15, translate[2] - legOffset], [0.08, 0.3, 0.08], [0.4, 0.25, 0.12], 0, rotY, textureId); // Front-right leg
    drawCube([translate[0] - legOffset, translate[1] + 0.15, translate[2] + legOffset], [0.08, 0.3, 0.08], [0.4, 0.25, 0.12], 0, rotY, textureId); // Back-left leg
    drawCube([translate[0] + legOffset, translate[1] + 0.15, translate[2] + legOffset], [0.08, 0.3, 0.08], [0.4, 0.25, 0.12], 0, rotY, textureId); // Back-right leg

}


function drawSceneObjects() {
    // Floor
    drawCube([0, -0.02, 0], [5.0, 0.04, 5.0], [0.7, 0.7, 0.7], 0, 0, 'checkerboard');

    // Table top
    drawCube([0, 0.55, 0], [3.0, 0.15, 1.5], [1.0, 1.0, 1.0], 0, 0, 'woodgrain');

    // Table legs
    var legScale = [0.25, 1.0, 0.25];
    var legY = 0.05;
    drawCube([1.0, legY, 0.5], legScale, [0.47, 0.30, 0.18], 0, 0, 'wood');
    drawCube([-1.0, legY, 0.5], legScale, [0.47, 0.30, 0.18], 0, 0, 'wood');
    drawCube([1.0, legY, -0.5], legScale, [0.47, 0.30, 0.18], 0, 0, 'wood');
    drawCube([-1.0, legY, -0.5], legScale, [0.47, 0.30, 0.18], 0, 0, 'wood');

    // Chairs around the table
    drawChair([0, 0, 1.2], 0, 'wood');                    // Front chair
    drawChair([0, 0, -1.2], Math.PI, 'wood');             // Back chair
    drawChair([2.0, 0, 0], Math.PI / 2, 'wood');          // Right chair
    drawChair([-2.0, 0, 0], -Math.PI / 2, 'wood');        // Left chair

    // Player cube (red)
    drawCube([cubePosX, 0.65, cubePosZ], [cubeScale, cubeScale, cubeScale], [0.9, 0.08, 0.08], cubeRotX, cubeRotY, 'red');

    // Static cubes
    drawCube([0.3, 0.65, 0.0], [0.25, 0.25, 0.25], [0.05, 0.55, 0.18], 0, 0, 'green');
    drawCube([0.6, 0.65, 0.0], [0.25, 0.25, 0.25], [0.94, 0.82, 0.12], 0, 0, 'yellow');

    // Goal outline
    var goalCenter = [0.5, 0.65, 0.3];
    var stripThickness = [0.28, 0.02, 0.02];
    var stripVert = [0.02, 0.02, 0.28];
    drawCube([goalCenter[0], goalCenter[1], goalCenter[2] - 0.14], stripThickness, [1, 1, 1], 0, 0, 'white');
    drawCube([goalCenter[0], goalCenter[1], goalCenter[2] + 0.14], stripThickness, [1, 1, 1], 0, 0, 'white');
    drawCube([goalCenter[0] - 0.14, goalCenter[1], goalCenter[2]], stripVert, [1, 1, 1], 0, 0, 'white');
    drawCube([goalCenter[0] + 0.14, goalCenter[1], goalCenter[2]], stripVert, [1, 1, 1], 0, 0, 'white');
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var V = getCameraMatrix();
    var P = getProjectionMatrix();
    gl.uniformMatrix4fv(uniforms.uView, false, flatten(V));
    gl.uniformMatrix4fv(uniforms.uProjection, false, flatten(P));
    gl.uniform3fv(uniforms.uLight1Pos, light1Pos);
    gl.uniform3fv(uniforms.uLight2Pos, light2Pos);
    drawSceneObjects();
}


// ==================== INITIALIZATION ====================
function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL is not available");
        return false;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.94, 0.94, 0.94, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "view-vertex-shader", "view-fragment-shader");
    if (!program) {
        alert("Shader init failed");
        return false;
    }
    gl.useProgram(program);

    // Create geometry
    var geom = createCubeGeometry();
    var vertices = geom.vertices;
    var indices = geom.indices;
    var vertexNormals = computeNormals(vertices, indices);

    // Setup vertex position buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, "vertexPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    // Setup texture coordinate buffer
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geom.texcoords), gl.STATIC_DRAW);

    var texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordLoc);

    // Setup normal buffer
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexNormals), gl.STATIC_DRAW);

    var normalLoc = gl.getAttribLocation(program, "nv");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    // Setup index buffer
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

    // Create textures
    textures['wood'] = createSolidColorTexture(0.47, 0.30, 0.18);
    textures['checkerboard'] = createCheckerboardTexture();
    textures['woodgrain'] = createWoodGrainTexture();
    textures['red'] = createSolidColorTexture(0.9, 0.08, 0.08);
    textures['green'] = createSolidColorTexture(0.05, 0.55, 0.18);
    textures['yellow'] = createSolidColorTexture(0.94, 0.82, 0.12);
    textures['white'] = createSolidColorTexture(1.0, 1.0, 1.0);

    // Cache uniform locations
    uniforms = {
        uModel: gl.getUniformLocation(program, "uModel"),
        uView: gl.getUniformLocation(program, "uView"),
        uProjection: gl.getUniformLocation(program, "uProjection"),
        uK: gl.getUniformLocation(program, "k"),
        uTexture: gl.getUniformLocation(program, "uTexture"),
        uLight1Pos: gl.getUniformLocation(program, "light1Pos"),
        uLight2Pos: gl.getUniformLocation(program, "light2Pos"),
        uShininess: gl.getUniformLocation(program, "uShininess")
    };

    if (!uniforms.uModel || !uniforms.uView || !uniforms.uProjection || !uniforms.uK) {
        console.error("Missing uniform locations");
        return false;
    }

    buffers.numIndices = indices.length;

    return true;
}


// ==================== INPUT HANDLING ====================
window.addEventListener("keydown", function(e) {
    switch (e.key) {
        case "y": cubeRotY += 0.05; break;
        case "x": cubeRotX += 0.05; break;
        case "a": cubePosX -= 0.05; break;
        case "d": cubePosX += 0.05; break;
        case "q": cubePosY += 0.05; break;
        case "e": cubePosY -= 0.05; break;
        case "w": cubePosZ -= 0.05; break;
        case "s": cubePosZ += 0.05; break;
        case "z": cubeScale = Math.max(0.05, cubeScale - scaleStep); break;
        case "c": cubeScale = Math.min(2.0, cubeScale + scaleStep); break;
        case "ArrowLeft":  camAngleX -= 0.05; break;
        case "ArrowRight": camAngleX += 0.05; break;
        case "ArrowUp":    camAngleY += 0.05; break;
        case "ArrowDown":  camAngleY -= 0.05; break;
    }

    // Clamp player to table bounds
    cubePosX = Math.min(Math.max(cubePosX, TABLE_MIN + 0.15), TABLE_MAX - 0.15);
    cubePosZ = Math.min(Math.max(cubePosZ, TABLE_MIN + 0.15), TABLE_MAX - 0.15);
    camAngleY = Math.min(Math.max(camAngleY, -Math.PI / 4), Math.PI / 4);

    render();
});


// ==================== STARTUP ====================
window.addEventListener("load", function() {
    if (init()) {
        render();
    }
});
