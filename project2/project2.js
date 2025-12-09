
//Global Variables
var gl, program, canvas;

//chair variables
var chairPos = { x: 2.0, y: 0, z: 0 };
var chairRotY = Math.PI/2;
var chairScale = 1.0; 

// Camera state
var camAngleX = 0.5;
var camAngleY = 0.5;
var camRadius = 2.2;

// Light positions
var light1Pos = [2.0, 2.0, 2.0];
var light2Pos = [-2.0, 1.5, -2.0];

// GPU resources
var buffers = {};
var uniforms = {};
var textures = {};

// global variables for different shapes of geometry
var sphereBuffer = {};
var cylinderBuffer = {};
var coneBuffer = {};
var torusBuffer = {};
 

// Geometry for cube shapes
function createCubeGeometry() {
    // Create vertices and texture coordinates per face (not shared)
    var vertices = [];
    var textcoords = [];
    var indices = [];
    
    // Define the 8 corner positions
    var positions = [
        vec4(-0.5, -0.5,  0.5, 1), vec4(0.5, -0.5,  0.5, 1),
        vec4(0.5,  0.5,  0.5, 1), vec4(-0.5,  0.5,  0.5, 1),
        vec4(-0.5, -0.5, -0.5, 1), vec4(0.5, -0.5, -0.5, 1),
        vec4(0.5,  0.5, -0.5, 1), vec4(-0.5,  0.5, -0.5, 1)
    ];
    
    // Define faces with proper texture coordinates for each
    var faces = [
        // Front face
        [0, 1, 2, 3],
        // Right face
        [1, 5, 6, 2],
        // Back face
        [5, 4, 7, 6],
        // Left face
        [4, 0, 3, 7],
        // Top face
        [3, 2, 6, 7],
        // Bottom face
        [4, 5, 1, 0]
    ];
    
    var faceTexCoords = [
        [0, 0], [1, 0], [1, 1], [0, 1]
    ];
    
    var idx = 0;
    for (var f = 0; f < faces.length; f++) {
        var face = faces[f];
        for (var v = 0; v < 4; v++) {
            vertices.push(positions[face[v]]);
            textcoords.push(faceTexCoords[v]);
        }
        // Two triangles per face
        indices.push(idx, idx+1, idx+2);
        indices.push(idx, idx+2, idx+3);
        idx += 4;
    }
    
    return { vertices: vertices, texcoords: textcoords, indices: indices };
}

//geometry for sphere shapes
function createSphereGeometry(radius, latBands, longBands) {
    var vertices = [];
    var normals = [];
    var texcoords = [];
    var indices = [];
    // math calculations for sphere
    // Only goes from 0 to PI/2 (90 degrees) for latitude to create hemisphere
    for (var lat = 0; lat <= latBands / 2; lat++) {  // Changed: divide latBands by 2
        var theta = lat * Math.PI / latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        
        for (var long = 0; long <= longBands; long++) {
            var phi = long * 2 * Math.PI / longBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            
            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            
            vertices.push(vec4(radius * x, radius * y, radius * z, 1.0));
            normals.push(vec3(x, y, z));
            texcoords.push([long / longBands, lat / (latBands / 2)]);
        }
    }
    
    // Adjusted indices for hemisphere instead of full sphere for bowl shape
    for (var lat = 0; lat < latBands / 2; lat++) { //latBand/2 since it is half of what we need for sphere
        for (var long = 0; long < longBands; long++) {
            var first = lat * (longBands + 1) + long;
            var second = first + longBands + 1;
            
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    
    return { vertices: vertices, normals: normals, texcoords: texcoords, indices: indices };
}

//For cylinder shapes  for the lamp rod
function createCylinderGeometry(radius, height, segments) {
    var vertices = [];
    var indices = [];
    var textcoords = [];
    
    // Bottom circle
    for (var i = 0; i <= segments; i++) {
        var angle = (i / segments) * 2 * Math.PI;
        vertices.push(vec4(radius * Math.cos(angle), 0, radius * Math.sin(angle), 1));
        textcoords.push([i / segments, 0]);
    }
    
    // Top circle
    for (var i = 0; i <= segments; i++) {
        var angle = (i / segments) * 2 * Math.PI;
        vertices.push(vec4(radius * Math.cos(angle), height, radius * Math.sin(angle), 1));
        textcoords.push([i / segments, 1]);
    }
    
    // Side faces
    for (var i = 0; i < segments; i++) {
        indices.push(i, i + 1, i + segments + 1);
        indices.push(i, i + segments + 1, i + segments);
    }
    
    // Compute normals for cylinder
    var normals = [];
    for (var i = 0; i < vertices.length; i++) {
        var v = vertices[i];
        normals.push(normalize(vec3(v[0], 0, v[2])));
    }
    
    return { vertices: vertices, indices: indices, normals: normals, texcoords: textcoords };
}
//For cone shapes for the lamp shade
function createConeGeometry(radius, height, segments) {
    var vertices = [];
    var indices = [];
    var textcoords = [];
    
    // Base circle
    for (var i = 0; i <= segments; i++) {
        var angle = (i / segments) * 2 * Math.PI;
        vertices.push(vec4(radius * Math.cos(angle), 0, radius * Math.sin(angle), 1));
        textcoords.push([i / segments, 0]);
    }
    
    // Apex
    vertices.push(vec4(0, height, 0, 1));
    textcoords.push([0.5, 1]);
    
    // Side faces
    var apexIdx = vertices.length - 1;
    for (var i = 0; i < segments; i++) {
        indices.push(i, apexIdx, i + 1);
    }
    
    // Compute normals for cone
    var normals = [];
    for (var i = 0; i < vertices.length; i++) {
        normals.push(vec3(0, 1, 0)); 
    }
    
    return { vertices: vertices, indices: indices, normals: normals, texcoords: textcoords };
}

// To compute normals for shapes without predefined normals
function computeNormals(vertices, indices) {
    var vertexNormals = [];
    
    // For each triangle, compute its normal and assign to all 3 vertices
    for (var i = 0; i < indices.length; i += 3) {
        var p0 = vec3(vertices[indices[i]][0], vertices[indices[i]][1], vertices[indices[i]][2]);
        var p1 = vec3(vertices[indices[i+1]][0], vertices[indices[i+1]][1], vertices[indices[i+1]][2]);
        var p2 = vec3(vertices[indices[i+2]][0], vertices[indices[i+2]][1], vertices[indices[i+2]][2]);
        var n = normalize(cross(subtract(p1, p0), subtract(p2, p0)));
        
        // Since we now have per-face vertices, just assign the face normal directly
        if (!vertexNormals[indices[i]]) vertexNormals[indices[i]] = n;
        if (!vertexNormals[indices[i+1]]) vertexNormals[indices[i+1]] = n;
        if (!vertexNormals[indices[i+2]]) vertexNormals[indices[i+2]] = n;
    }
    
    return vertexNormals;
}

// Geometry for donut shapes 
function createTorusGeometry(majorRadius, minorRadius, majorSegments, minorSegments) {
    var vertices = [];
    var normals = [];
    var texcoords = [];
    var indices = [];
    
    for (var i = 0; i <= majorSegments; i++) {
        var u = i / majorSegments * 2 * Math.PI;
        var cosU = Math.cos(u);
        var sinU = Math.sin(u);
        
        for (var j = 0; j <= minorSegments; j++) {
            var v = j / minorSegments * 2 * Math.PI;
            var cosV = Math.cos(v);
            var sinV = Math.sin(v);
            
            var x = (majorRadius + minorRadius * cosV) * cosU;
            var y = minorRadius * sinV;
            var z = (majorRadius + minorRadius * cosV) * sinU;
            
            vertices.push(vec4(x, y, z, 1.0));
            
            var nx = cosV * cosU;
            var ny = sinV;
            var nz = cosV * sinU;
            normals.push(vec3(nx, ny, nz));
            
            texcoords.push([i / majorSegments, j / minorSegments]);
        }
    }
    
    for (var i = 0; i < majorSegments; i++) {
        for (var j = 0; j < minorSegments; j++) {
            var first = i * (minorSegments + 1) + j;
            var second = first + minorSegments + 1;
            
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    
    return { vertices: vertices, normals: normals, texcoords: texcoords, indices: indices };
}

// matrix helpers to build model, view, projection matrices
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

// to build camera view matrix
function getCameraMatrix() {
    var eye = vec3(
        camRadius * Math.sin(camAngleX) * Math.cos(camAngleY),
        camRadius * Math.sin(camAngleY) + 1.0,
        camRadius * Math.cos(camAngleX) * Math.cos(camAngleY)
    );
    
    // Calculate look-at point based on camera direction (always look toward center)
    var at = vec3(0.0, 0.75, 0.0); // Look at center of scene
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

//
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

// ==================================== TEXTURE HELPERS =======================================

// Solid color texture generator
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

// Checkerboard texture generator with black and white squares
function createCheckerboardTexture() {
    var size = 64;
    var data = new Uint8Array(size * size * 4);
    var index = 0;
    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            // it applies the color to even number index and leaves the odd number index unchnaged
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

// For the wood texture
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

// ==================================== DRAWING HELPERS =======================================

// function to draw cubes shapes using the cube geometry specified in the function createCubeGeometry above.
function drawCube(translate, scale, color, rotX, rotY, textureId) {
    rotX = rotX || 0;
    rotY = rotY || 0;
    textureId = textureId || 'wood';

    var model = buildModelMatrix(translate, scale, rotX, rotY);
    gl.uniformMatrix4fv(uniforms.uModel, false, flatten(model));
    gl.uniform3fv(uniforms.uK, color);
    gl.uniform1f(uniforms.uShininess, 20.0);
    
    // Bind cube buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeVertices);
    gl.vertexAttribPointer(buffers.positionLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeTexCoords);
    gl.vertexAttribPointer(buffers.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeNormals);
    gl.vertexAttribPointer(buffers.normalLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.cubeIndices);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[textureId]);
    gl.uniform1i(uniforms.uTexture, 0);
    
    gl.drawElements(gl.TRIANGLES, buffers.cubeNumIndices, gl.UNSIGNED_SHORT, 0);
}

// draws sphere shapes using the sphere geometry specified in the function createSphereGeometry above.
function drawSphere(translate, radius, color, rotX, rotY, textureId) {
    rotX = rotX || 0;
    rotY = rotY || 0;
    textureId = textureId || 'yellow';
    
    var scale = [radius, radius, radius];
    var model = buildModelMatrix(translate, scale, rotX, rotY);
    gl.uniformMatrix4fv(uniforms.uModel, false, flatten(model));
    gl.uniform3fv(uniforms.uK, color);
    gl.uniform1f(uniforms.uShininess, 25.0);
    
    // Bind sphere buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer.vertices);
    gl.vertexAttribPointer(buffers.positionLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer.texcoords);
    gl.vertexAttribPointer(buffers.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer.normals);
    gl.vertexAttribPointer(buffers.normalLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffer.indices);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[textureId]);
    gl.uniform1i(uniforms.uTexture, 0);
    
    gl.drawElements(gl.TRIANGLES, sphereBuffer.numIndices, gl.UNSIGNED_SHORT, 0);
}

// draws cylinder shapes using the cylinder geometry specified in the function createCylinderGeometry above.
function drawCylinder(translate, radius, height, color, rotX, rotY) {
    var scale = [radius, height, radius];
    var model = buildModelMatrix(translate, scale, rotX, rotY);
    gl.uniformMatrix4fv(uniforms.uModel, false, flatten(model));
    gl.uniform3fv(uniforms.uK, color);
    gl.uniform1f(uniforms.uShininess, 20.0);
    
    // Bind cylinder buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer.vertices);
    gl.vertexAttribPointer(buffers.positionLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer.texcoords);
    gl.vertexAttribPointer(buffers.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer.normals);
    gl.vertexAttribPointer(buffers.normalLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderBuffer.indices);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures['silver']);
    gl.uniform1i(uniforms.uTexture, 0);
    
    gl.drawElements(gl.TRIANGLES, cylinderBuffer.numIndices, gl.UNSIGNED_SHORT, 0);
}

//draws cone shapes using the cone geometry specified in the function createConeGeometry above.
function drawCone(translate, radius, height, color, rotX, rotY) {
    var scale = [radius, height, radius];
    var model = buildModelMatrix(translate, scale, rotX, rotY);
    gl.uniformMatrix4fv(uniforms.uModel, false, flatten(model));
    gl.uniform3fv(uniforms.uK, color);
    gl.uniform1f(uniforms.uShininess, 15.0);
    
    // Bind cone buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffer.vertices);
    gl.vertexAttribPointer(buffers.positionLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffer.texcoords);
    gl.vertexAttribPointer(buffers.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffer.normals);
    gl.vertexAttribPointer(buffers.normalLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, coneBuffer.indices);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures['yellow']);
    gl.uniform1i(uniforms.uTexture, 0);
    
    gl.drawElements(gl.TRIANGLES, coneBuffer.numIndices, gl.UNSIGNED_SHORT, 0);
}

// draws torus shapes using the torus geometry specified in the function createTorusGeometry above.
function drawTorus(translate, majorRadius, minorRadius, color, rotX, rotY, textureId) {
    rotX = rotX || 0;
    rotY = rotY || 0;
    textureId = textureId || 'yellow';
    
    var scale = [0.25, 0.25, 0.25];
    var model = buildModelMatrix(translate, scale, rotX, rotY);
    gl.uniformMatrix4fv(uniforms.uModel, false, flatten(model));
    gl.uniform3fv(uniforms.uK, color);
    gl.uniform1f(uniforms.uShininess, 30.0);
    
    // Bind torus buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, torusBuffer.vertices);
    gl.vertexAttribPointer(buffers.positionLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, torusBuffer.texcoords);
    gl.vertexAttribPointer(buffers.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, torusBuffer.normals);
    gl.vertexAttribPointer(buffers.normalLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusBuffer.indices);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[textureId]);
    gl.uniform1i(uniforms.uTexture, 0);
    
    gl.drawElements(gl.TRIANGLES, torusBuffer.numIndices, gl.UNSIGNED_SHORT, 0);
}


// ==================================== SCENE DRAWING defined FUNCTIONS =======================================

// Draw table top with height of 0.55 from the floor
function drawTableTop() {
    drawCube([0, 0.55, 0], [3.0, 0.15, 1.5], [1.0, 1.0, 1.0], 0, 0, 'woodgrain');
}

// Draw table legs at specified (x, z) positions
function drawTableLeg(x, z) {
    drawCube([x, 0.3, z], [0.25, 0.5, 0.25], [0.47, 0.30, 0.18], 0, 0, 'wood');
}

// Draw a chair at specified position, rotation, texture, and scale
function drawChair(translate, rotY, textureId, scale) {
    rotY = rotY || 0;
    scale = scale || 1.0;  // Default scale is 1.0
    var woodColor = [0.75, 0.35, 0.15];
    var darkWoodColor = [0.4, 0.25, 0.12];
    
    // Chair seat 
    drawCube([translate[0], translate[1] + 0.35 * scale, translate[2]], 
             [0.35 * scale, 0.08 * scale, 0.35 * scale], woodColor, 0, rotY, textureId);
    
    // Chair backrest 
    var backrestLocalZ = 0.17 * scale;
    var backrestX = translate[0] + backrestLocalZ * Math.sin(rotY);
    var backrestZ = translate[2] + backrestLocalZ * Math.cos(rotY);
    drawCube([backrestX, translate[1] + 0.55 * scale, backrestZ], 
             [0.35 * scale, 0.35 * scale, 0.08 * scale], woodColor, 0, rotY, textureId);
    
    // Chair legs
    var legOffset = 0.12 * scale;
    var legPositions = [
        [-legOffset, -legOffset],
        [legOffset, -legOffset],
        [-legOffset, legOffset],
        [legOffset, legOffset]
    ];
    
    for (var i = 0; i < 4; i++) {
        var legX = translate[0] + legPositions[i][0] * Math.cos(rotY) - legPositions[i][1] * Math.sin(rotY);
        var legZ = translate[2] + legPositions[i][0] * Math.sin(rotY) + legPositions[i][1] * Math.cos(rotY);
        drawCube([legX, translate[1] + 0.15 * scale, legZ], 
                 [0.08 * scale, 0.3 * scale, 0.08 * scale], darkWoodColor, 0, rotY, 'wood');
    }
}

// this function defines the size, color, and position of the plate on the table by calling drawcube to draw the shape accordingly
function drawPlate(x, z) {
    drawCube([x, 0.63, z], [0.35, 0.02, 0.35], [1, 1, 1], 0, 0, "plate");
    drawCube([x, 0.64, z], [0.38, 0.01, 0.38], [1, 1, 1], 0, 0, "plate");
}

// this function defines the size, color, and position of the cup on the table by calling drawcube to draw the shape accordingly
function drawCup(x, z) {
    drawCube([x, 0.68, z], [0.12, 0.20, 0.12], [0.9, 0.9, 1.0], 0, 0, "cup");
}

// this function defines the size, color, and position of the utensils on the table by calling drawcube to draw the shape accordingly
function drawUtensils(x, z) {
    drawCube([x - 0.15, 0.63, z], [0.25, 0.01, 0.04], [0.8, 0.8, 0.8], 0, 0, "silver");
}

// Draw the floor of the room with checkboard texture 
function drawFloor() {
    drawCube([0, -0.02, 0], [5.0, 0.04, 5.0], [1.0, 1.0, 1.0], 0, 0, 'checkerboard');
}

// calls drawsphere function to draw bowls on the table with specified positions, sizes, colors, and rotations
function drawBowls() {
    // Hemispherical bowls  rotated to face upward to look like actual bowls
    drawSphere([-0.5, 0.74, 0.0], 0.12, [1.0, 0.8, 0.2], Math.PI, 0, 'yellow');
    drawSphere([-0.2, 0.77, 0.0], 0.15, [0.8, 0.3, 0.2], Math.PI, 0, 'green');
    drawSphere([0.2, 0.77, 0.0], 0.15, [0.8, 0.3, 0.2], Math.PI, 0, 'red');
    drawSphere([0.5, 0.74, 0.0], 0.12, [1.0, 0.8, 0.2], Math.PI, 0, 'white'); //orange kind of color
}

// Draw the ceiling of the room
function drawCeiling() {
    const roomSize = 5.0;
    const CEILING_THICKNESS = 0.1;
    const CEILING_HEIGHT = 2.5;

    drawCube([0, CEILING_HEIGHT, 0], [roomSize, CEILING_THICKNESS, roomSize], [1, 1, 1], 0, 0, "ceiling");
}

// Draw the walls of the room with specified dimensions and colors and texture
function drawWalls() {
    const wall_Height = 2.5;
    const wall_Thickness = 0.1;
    const roomSize = 5.0;

    // Back wall
    drawCube([0, wall_Height / 2, roomSize / 2], [roomSize, wall_Height, wall_Thickness], [0.8, 0.8, 0.9], 0, 0, "wall");
    // Front wall
    drawCube([0, wall_Height / 2, -roomSize / 2], [roomSize, wall_Height, wall_Thickness], [0.8, 0.8, 0.9], 0, 0, "wall");
    // Left wall
    drawCube([-roomSize / 2, wall_Height / 2, 0], [wall_Thickness, wall_Height, roomSize], [0.8, 0.8, 0.9], 0, 0, "wall");
    // Right wall
    drawCube([roomSize / 2, wall_Height / 2, 0], [wall_Thickness, wall_Height, roomSize], [0.8, 0.8, 0.9], 0, 0, "wall");
}

//
function drawHangingLamp() {
    const lampHeight = 2.3;
    const rodLength = 0.5;
    const rodRadius = 0.03;
    const shade_radius = 0.25;
    const shade_height = 0.25;

    // Rod (cylinder shape)
    drawCylinder([0, lampHeight - 0.25, 0], rodRadius, rodLength, [0.6, 0.6, 0.6], 0, 0);
    // Lamp shade (cone pointing down)
    drawCone([0, lampHeight - 0.15, 0], shade_radius, shade_height, [1.0, 1.0, 0.7], Math.PI, 0);

    // Light bulb (small sphere inside the lamp shade facing upward like a open bowl)
    drawSphere([0, lampHeight - 0.37, 0], 0.08, [1.5, 1.5, 1.2], Math.PI, 0, 'white');
}

// to draw donuts on each plate on the table
function drawFood() {
    drawTorus([-0.5, 0.64, 0.3], 0.05, 0.05, [0.9, 0.7, 0.1], Math.PI , 0, 'yellow');
    drawTorus([0.5, 0.64, 0.3], 0.05, 0.05, [0.9, 0.7, 0.1], Math.PI , 0, 'yellow');
    drawTorus([0.5, 0.64, -0.3], 0.05, 0.05, [0.9, 0.7, 0.1], Math.PI , 0, 'yellow');    
    drawTorus([-0.5, 0.64, -0.3], 0.05, 0.05, [0.9, 0.7, 0.1], Math.PI , 0, 'yellow');
    drawTorus([1.1, 0.64, 0], 0.05, 0.05, [0.9, 0.7, 0.1], Math.PI , 0, 'yellow');
    drawTorus([-1.1, 0.64, 0], 0.05, 0.05, [0.9, 0.7, 0.1], Math.PI , 0, 'yellow');
}

// calls all the individual scene drawing functions to render the complete scene
function drawSceneObjects() {
    drawWalls();
    drawCeiling();
    drawFloor();
    drawHangingLamp();
    drawTableTop();
    drawFood();

    // ----------------Static dinnerware on table ----------------

    // on front right side table
    drawPlate(0.5, 0.40);
    drawCup(0.8, 0.40);
    drawUtensils(0.5, 0.65);

    //  on front left side table
    drawPlate(-0.4, 0.40);
    drawCup(-0.1, 0.40);
    drawUtensils(-0.4, 0.65);

    //  on back right side table
    drawPlate(-0.5, -0.40);
    drawCup(-0.8, -0.35);
    drawUtensils(-0.5, -0.65);

//  on back left side table
    drawPlate(0.4, -0.40);
    drawCup(0.1, -0.35);
    drawUtensils(0.4, -0.65);

//  on right side table
    drawPlate(1.2, 0);
    drawCup(1.0, -0.3);
    drawUtensils(1.2, 0.3);

    //  on left side table
    drawPlate(-1.2, 0);
    drawCup(-1.0, 0.35);
    drawUtensils(-1.2, -0.3);

    // Table legs
    drawTableLeg(1.0, 0.5); // front right
    drawTableLeg(-1.0, 0.5); // front left
    drawTableLeg(1.0, -0.5);// back right
    drawTableLeg(-1.0, -0.5); // back left

    // Chairs
    drawChair([-0.4, 0, 1.2], 0, 'wood', 1.0); // chair on front left side
    drawChair([0.5, 0, 1.2], 0, 'wood', 1.0); // chair on front right side
    drawChair([-0.5, 0, -1.2], Math.PI, 'wood', 1.0); // chair on back left side
    drawChair([0.4, 0, -1.2], Math.PI, 'wood', 1.0); // chair on back right side
    drawChair([chairPos.x, chairPos.y, chairPos.z], chairRotY, 'red', chairScale);  // moveable chair
    drawChair([-2.0, 0, 0], -Math.PI / 2, 'wood', 1.0); // chair on left side

    drawBowls();
}

// ======================== RENDERING FUNCTION ==============================
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

    //creates canvas and initializes webgl
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL is not available");
        return false;
    }
    // Set the viewport and clear color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.25, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // Initializes shaders
    program = initShaders(gl, "view-vertex-shader", "view-fragment-shader");
    if (!program) {
        alert("Shader init failed");
        return false;
    }
    gl.useProgram(program);

    // Get attribute locations
    buffers.positionLoc = gl.getAttribLocation(program, "vertexPosition");
    buffers.texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
    buffers.normalLoc = gl.getAttribLocation(program, "nv");
    
    gl.enableVertexAttribArray(buffers.positionLoc);
    gl.enableVertexAttribArray(buffers.texCoordLoc);
    gl.enableVertexAttribArray(buffers.normalLoc);

    // Create cube geometry and buffers
    var geom = createCubeGeometry();
    var vertices = geom.vertices;
    var indices = geom.indices;
    var vertexNormals = computeNormals(vertices, indices);

    buffers.cubeVertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeVertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    buffers.cubeTexCoords = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeTexCoords);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geom.texcoords), gl.STATIC_DRAW);

    buffers.cubeNormals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeNormals);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexNormals), gl.STATIC_DRAW);

    buffers.cubeIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.cubeIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    buffers.cubeNumIndices = indices.length;

    // Create sphere geometry and buffers
    var sphereGeom = createSphereGeometry(1.0, 20, 20);
    sphereBuffer.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereGeom.vertices), gl.STATIC_DRAW);
    
    sphereBuffer.normals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer.normals);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereGeom.normals), gl.STATIC_DRAW);
    
    sphereBuffer.texcoords = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer.texcoords);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereGeom.texcoords), gl.STATIC_DRAW);
    
    sphereBuffer.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffer.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereGeom.indices), gl.STATIC_DRAW);
    sphereBuffer.numIndices = sphereGeom.indices.length;

    // Create cylinder geometry and buffers
    var cylGeom = createCylinderGeometry(1.0, 1.0, 32);
    cylinderBuffer.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cylGeom.vertices), gl.STATIC_DRAW);
    
    cylinderBuffer.normals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer.normals);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cylGeom.normals), gl.STATIC_DRAW);
    
    cylinderBuffer.texcoords = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cylinderBuffer.texcoords);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cylGeom.texcoords), gl.STATIC_DRAW);
    
    cylinderBuffer.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cylinderBuffer.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cylGeom.indices), gl.STATIC_DRAW);
    cylinderBuffer.numIndices = cylGeom.indices.length;

    // Create cone geometry and bufers
    var coneGeom = createConeGeometry(1.0, 1.0, 32);
    coneBuffer.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffer.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(coneGeom.vertices), gl.STATIC_DRAW);
    
    coneBuffer.normals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffer.normals);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(coneGeom.normals), gl.STATIC_DRAW);
    
    coneBuffer.texcoords = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuffer.texcoords);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(coneGeom.texcoords), gl.STATIC_DRAW);
    
    coneBuffer.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, coneBuffer.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(coneGeom.indices), gl.STATIC_DRAW);
    coneBuffer.numIndices = coneGeom.indices.length;

    // Create torus geometry and buffers
    var torusGeom = createTorusGeometry(0.15, 0.05, 30, 20);
    torusBuffer.vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, torusBuffer.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(torusGeom.vertices), gl.STATIC_DRAW);
    
    torusBuffer.normals = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, torusBuffer.normals);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(torusGeom.normals), gl.STATIC_DRAW);
    
    torusBuffer.texcoords = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, torusBuffer.texcoords);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(torusGeom.texcoords), gl.STATIC_DRAW);
    
    torusBuffer.indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusBuffer.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(torusGeom.indices), gl.STATIC_DRAW);
    torusBuffer.numIndices = torusGeom.indices.length;

    // Create textures for each material
    textures['wood'] = createSolidColorTexture(0.47, 0.30, 0.18); // for table legs and chaiirs
    textures['checkerboard'] = createCheckerboardTexture(); // for floor
    textures['woodgrain'] = createWoodGrainTexture(); // for table top
    textures['red'] = createSolidColorTexture(0.9, 0.08, 0.08); // for bowls and movable chair
    textures['green'] = createSolidColorTexture(0.05, 0.55, 0.18); // for bowls
    textures['yellow'] = createSolidColorTexture(0.94, 0.82, 0.12); // for cone and bowls
    textures['white'] = createSolidColorTexture(1.0, 1.0, 1.0); // for light bulb 
    textures['plate'] = createSolidColorTexture(0.95, 0.95, 0.95); // for plates
    textures['cup'] = createSolidColorTexture(0.9, 0.9, 1.0);// for cups
    textures['silver'] = createSolidColorTexture(0.8, 0.8, 0.8);// for utensils
    textures['wall'] = createSolidColorTexture(0.78, 0.88, 1.0);// for walls
    textures['ceiling'] = createSolidColorTexture(0.88, 0.88, 0.88);// for ceiling

    // Cache uniform locations for all used uniforms
    uniforms = {
        uModel: gl.getUniformLocation(program, "uModel"), // model matrix
        uView: gl.getUniformLocation(program, "uView"),// view matrix
        uProjection: gl.getUniformLocation(program, "uProjection"),// projection matrix
        uK: gl.getUniformLocation(program, "k"),// material color
        uTexture: gl.getUniformLocation(program, "uTexture"),// texture sampler
        uLight1Pos: gl.getUniformLocation(program, "light1Pos"),// light 1 position
        uLight2Pos: gl.getUniformLocation(program, "light2Pos"),//  light 2 position
        uShininess: gl.getUniformLocation(program, "uShininess")// material shininess
    };

    if (!uniforms.uModel || !uniforms.uView || !uniforms.uProjection || !uniforms.uK) {
        console.error("Missing uniform locations");
        return false;
    }

    return true;
}

// ==================== INPUT HANDLING ====================
window.addEventListener("keydown", function(e) {
    
    switch (e.key) {
        case "y": case "Y": chairRotY += 0.05; break; // Rotate chair clockwise
        case "x": case "X": chairRotY -= 0.05; break;// Rotate chair counter-clockwise
        case "a": case "A": if(chairPos.x > 1.4) chairPos.x -= 0.05; break;// Pmoves forward
        case "d": case "D": chairPos.x += 0.05; break;// Move backward
        case "w": case "W": chairPos.z -= 0.05; break;//   Move right
        case "s": case "S": chairPos.z += 0.05; break;// Move left
        case "q": case "Q": chairPos.y += 0.05; break; // move up
        case "e": case "E": chairPos.y -= 0.05; break;// move down
        case "z": case "Z": chairScale = Math.max(0.3, chairScale - 0.05); break;  // Scale down
        case "c": case "C": chairScale = Math.min(2.0, chairScale + 0.05); break;   // Scale up
        case "i": case "I": camRadius -= 0.1; break; // zoom in
        case "o": case "O": camRadius += 0.1; break; // zoom out
        case "r": case "R": // teset chair and camera position
            camAngleX = 0.5;
            camAngleY = 0.5;
            camRadius = 2.2;
            chairPos = { x: 2.0, y: 0, z: 0 };
            chairScale = 1.0;  // Reset scale
            chairRotY = Math.PI/2;  // Reset rotation
            break;
        case "ArrowLeft": camAngleX -= 0.05; break; // rotate camera left
        case "ArrowRight": camAngleX += 0.05; break;// rotate camera right
        case "ArrowUp": camAngleY += 0.05; break; // rotate camera up
        case "ArrowDown": camAngleY -= 0.05; break;// rotate camera down
    }

    camAngleY = Math.min(Math.max(camAngleY, -Math.PI / 2 + 0.1), Math.PI / 2 - 0.1);
    render();
});

// ==================== STARTUP ====================
window.addEventListener("load", function() {
    if (init()) {
        render();
    }
});
