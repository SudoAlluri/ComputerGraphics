var gl;
var program;

function start() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL not available"); return; }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.2, 0.25, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // ---- SIMPLE TABLE TOP (rectangle) ----
    // Coordinates in NDC-ish space (z = -1 to show up)
    var vertices = new Float32Array([
        -0.5,  0.2, -1.0, 1.0,
         0.5,  0.2, -1.0, 1.0,
         0.5, -0.2, -1.0, 1.0,
        -0.5, -0.2, -1.0, 1.0
    ]);

    var indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3
    ]);

    // Buffer for vertices
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var vPos = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPos, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPos);

    // Index buffer
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // ---- MANUAL MODELVIEW MATRIX (identity) ----
    var M = new Float32Array([
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,0,1
    ]);

    // ---- SIMPLE ORTHO PROJECTION (manual) ----
    // NO MV.JS ortho()
    var P = new Float32Array([
        2/2, 0,   0,    0,
        0,   2/2, 0,    0,
        0,   0,  -2/10, 0,
        0,   0,  -1.2,  1
    ]);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "M"), false, M);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "P"), false, P);

    draw();
}

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}
