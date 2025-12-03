var gl;
var myShaderProgramLight;
var myShaderProgramView;
var alpha, beta;

function drawTable() {

    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL is not available"); }

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    alpha = 0.6;
    beta = 0.0;

    myShaderProgramView = initShaders(gl, "view-vertex-shader", "view-fragment-shader");
    //myShaderProgramLight = initShaders(gl, "light-vertex-shader", "light-fragment-shader");
    gl.useProgram(myShaderProgramView);

    // ---------- Table Geometry ----------
    // Table top and four legs as cubes
    var vertices = [
        vec4(-0.5, -0.5,  0.5, 1), vec4(0.5, -0.5, 0.5, 1),
        vec4(0.5, 0.5, 0.5, 1), vec4(-0.5, 0.5, 0.5, 1),
        vec4(-0.5, -0.5, -0.5, 1), vec4(0.5, -0.5, -0.5, 1),
        vec4(0.5, 0.5, -0.5, 1), vec4(-0.5, 0.5, -0.5, 1)
    ];

    var indices = [
        0,1,2, 0,2,3,  // front
        1,5,6, 1,6,2,  // right
        5,4,7, 5,7,6,  // back
        4,0,3, 4,3,7,  // left
        3,2,6, 3,6,7,  // top
        4,5,1, 4,1,0   // bottom
    ];

    // ---------- Colors ----------
    var cuber = 0.65, cubeg = 0.45, cubeb = 0.2; // brown
    var coefficients = [];
    for (var i = 0; i < 8; i++) {
        coefficients.push(vec3(cuber,cubeg,cubeb));
    }

    // ---------- Normals ----------
    function getFaceNormals(vertices, indexList, numTriangles) {
        var faceNormals = [];
        for (var i=0; i<numTriangles; i++) {
            var p0 = vec3(vertices[indexList[3*i]][0], vertices[indexList[3*i]][1], vertices[indexList[3*i]][2]);
            var p1 = vec3(vertices[indexList[3*i+1]][0], vertices[indexList[3*i+1]][1], vertices[indexList[3*i+1]][2]);
            var p2 = vec3(vertices[indexList[3*i+2]][0], vertices[indexList[3*i+2]][1], vertices[indexList[3*i+2]][2]);
            var n = normalize(cross(subtract(p1,p0), subtract(p2,p0)));
            faceNormals.push(n);
        }
        return faceNormals;
    }

    function getVertexNormals(indexList, faceNormals, numVertices, numTriangles) {
        var vertexNormals = [];
        for (var j=0; j<numVertices; j++) {
            var vn = vec3(0,0,0);
            for (var i=0; i<numTriangles; i++) {
                if (indexList[3*i]==j || indexList[3*i+1]==j || indexList[3*i+2]==j) {
                    vn = add(vn, faceNormals[i]);
                }
            }
            vn = normalize(vn);
            vertexNormals.push(vn);
        }
        return vertexNormals;
    }

    var faceNormals = getFaceNormals(vertices, indices, 12);
    var vertexNormals = getVertexNormals(indices, faceNormals, 8, 12);

    // ---------- Buffers ----------
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

    var vertexPosition = gl.getAttribLocation(myShaderProgramView, "vertexPosition");
    gl.vertexAttribPointer(vertexPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPosition);

    var nvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexNormals), gl.STATIC_DRAW);

    var nv = gl.getAttribLocation(myShaderProgramView, "nv");
    gl.vertexAttribPointer(nv, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(nv);

    var kBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, kBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(coefficients), gl.STATIC_DRAW);

    var k = gl.getAttribLocation(myShaderProgramView, "k");
    gl.vertexAttribPointer(k, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(k);

    // ---------- Camera ----------
    var eye = vec3(2.0, 3.0, 2.0); // higher and slightly to the side
    var at  = vec3(0.0, 0.3, 0.0); // looking at the center of the table
    var vup = vec3(0,0,-1.0);
    var n = normalize(subtract(eye,at));
    var u = normalize(cross(vup,n));
    var v = cross(n,u);

    var M = [
        u[0], v[0], n[0], 0,
        u[1], v[1], n[1], 0,
        u[2], v[2], n[2], 0,
        -dot(u,eye), -dot(v,eye), -dot(n,eye), 1
    ];

    var near = 0.1, far = 10.0;
    var right = 1, top = 1;
    var P = [
        near/right,0,0,0,
        0,near/top,0,0,
        0,0,-(far+near)/(far-near), -1,
        0,0,-2*far*near/(far-near),0
    ];

    var uModel = gl.getUniformLocation(myShaderProgramView,"M");
    var uView = gl.getUniformLocation(myShaderProgramView,"M");
    var uProjection = gl.getUniformLocation(myShaderProgramView,"P");
    var uColor = gl.getUniformLocation(myShaderProgramView,"ka"); // for simplicity

    gl.uniformMatrix4fv(uView,false,flatten(M));
    gl.uniformMatrix4fv(uProjection,false,flatten(P));

    // ---------- Draw Table ----------
    function drawCubeModel(translateVec, scaleVec) {
        var T = mat4();
        T[0][3] = translateVec[0];
        T[1][3] = translateVec[1];
        T[2][3] = translateVec[2];
        var S = mat4(
            scaleVec[0],0,0,0,
            0,scaleVec[1],0,0,
            0,0,scaleVec[2],0,
            0,0,0,1
        );
        var model = mult(T,S);
        gl.uniformMatrix4fv(uModel,false,flatten(model));
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
    }

    // Table top (centered)
    drawCubeModel([0, 0.55, 0], [1.5, 0.1, 1]);

    // Legs
    drawCubeModel([0.65, 0.25, 0.45], [0.1, 0.5, 0.1]);
    drawCubeModel([-0.65, 0.25, 0.45], [0.1, 0.5, 0.1]);
    drawCubeModel([0.65, 0.25, -0.45], [0.1, 0.5, 0.1]);
    drawCubeModel([-0.65, 0.25, -0.45], [0.1, 0.5, 0.1]);

}
