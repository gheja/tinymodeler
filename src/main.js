"use strict";

let _lastFrameRenderTime = 0;
let canvas = document.getElementById("renderCanvas");
let engine;
let scene;
let camera;
let sphere;
let n = 0;

let _a;
let _material;
let _loader;
let _box;
let _boxes;
let _shadowGenerator;
let _light;

let _scale;
let _flatShading;

let _points;
let _currentPoint;
let _hoveredPoint;
let _currentPointA;

let _faces;
let _currentFace;
let _currentFaceA;

let _faceRedefinitionStep = 0;

let _mesh;

let _selectionSpheres = [];

function clamp(min, max, x)
{
	return Math.min(Math.max(x, min), max);
}

function quickMaterial(r, g, b, a)
{
	let material;
	
	material = new BABYLON.StandardMaterial("", scene);
	material.diffuseColor = new BABYLON.Color3(r, g, b);
	material.ambientColor = new BABYLON.Color3(r * 0.8, g * 0.8, b * 0.8);
	if (a !== undefined)
	{
		material.alpha = a;
	}
	
	return material;
}

function createScene()
{
	// Create scene
	let scene, plane, material, light1, light2, shadowGenerator1, shadowGenerator2;
	
	scene = new BABYLON.Scene(engine);
	
	scene.clearColor = new BABYLON.Color3(98/255, 193/255, 229/255);
	scene.ambientColor = new BABYLON.Color3(98/255, 193/255, 229/255);
	// scene.fogColor = new BABYLON.Color3(98/255, 193/255, 229/255);
	
	// scene.createDefaultEnvironment();
	
	light1 = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(-200, 200, -200), scene);
	light1.intensity = 0.8;
	
	light2 = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(200, 200, -200), scene);
	light2.intensity = 0.5;
	
	camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 1, 0.8, 150, new BABYLON.Vector3(0, 0, 0), scene);
	camera.lowerBetaLimit = 0.01;
	camera.upperBetaLimit = (Math.PI / 2) * 0.999;
	camera.lowerRadiusLimit = 1;
	camera.minZ = 0.2;
	camera.inertia = 0.7;
	
	camera.attachControl(canvas);
	
	_mesh = new BABYLON.Mesh("custom", scene);
	_mesh.material = quickMaterial(0.5, 0.5, 0.5);
	// var box1 = BABYLON.Mesh.CreateBox("b1", 1.0, scene);
	
	shadowGenerator1 = new BABYLON.ShadowGenerator(1024, light1);
	shadowGenerator1.useBlurExponentialShadowMap = true;
	shadowGenerator1.blurKernel = 32;
	shadowGenerator1.addShadowCaster(_mesh, true);
	
//	shadowGenerator2 = new BABYLON.ShadowGenerator(1024, light2);
//	shadowGenerator2.useBlurExponentialShadowMap = true;
//	shadowGenerator2.blurKernel = 32;
//	shadowGenerator2.addShadowCaster(_mesh, true);
	
	plane = BABYLON.Mesh.CreatePlane("ground", 150, scene);
	plane.rotation.x = Math.PI / 2;
	plane.position.y = 0;
	plane.receiveShadows = true;
	plane.material = quickMaterial(98/255*0.3, 193/255*0.3, 229/255*0.3);
	
	_selectionSpheres[0] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 2 }, scene);
	_selectionSpheres[0].material = quickMaterial(1.0, 0.5, 0.0, 0.7);
	
	_selectionSpheres[1] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);
	_selectionSpheres[1].material = quickMaterial(1.0, 0.0, 0.0, 0.7);
	
	_selectionSpheres[2] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);
	_selectionSpheres[2].material = quickMaterial(1.0, 0.0, 0.5, 0.7);
	
	_selectionSpheres[3] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);
	_selectionSpheres[3].material = quickMaterial(0.6, 0.0, 1.0, 0.7);
	
	_selectionSpheres[4] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);
	_selectionSpheres[4].material = quickMaterial(0.0, 0.5, 1.0, 0.7);
	
	return scene;
	
	// Enable VR
	let vrHelper = scene.createDefaultVRExperience({ createDeviceOrientationCamera:true });
	
	return scene;
}

function localstorageSave()
{
	localStorage.setItem("editor:points", JSON.stringify(_points));
	localStorage.setItem("editor:faces", JSON.stringify(_faces));
}

function localstorageLoad()
{
	_points = JSON.parse(localStorage.getItem("editor:points")) || [];
	_faces = JSON.parse(localStorage.getItem("editor:faces")) || [];
}

function onRenderLoop()
{
	let now;
	
	if (!scene)
	{
		return;
	}
	
	now = (new Date()).getTime();
	
	if (FPS_LIMIT)
	{
		if (_lastFrameRenderTime + 1000/FPS > now)
		{
			return;
		}
		
		_lastFrameRenderTime = now;
	}
	
	scene.render();
}

function onResize()
{
	canvas.width = window.innerWidth - 200;
	canvas.height = window.innerHeight;
	engine.resize();
}

function onUpdate()
{
}

function onWheel(event)
{
	let change;
	
	change = 0;
	
	if (event.deltaY > 0)
	{
		change = -1;
	}
	else if (event.deltaY < 0)
	{
		change = 1;
	}
	
//	event.target.value = Math.floor((event.target.value * 1 + change) * 100) / 100;
	event.target.value = clamp(0, 100, Math.round(event.target.value * 1) + change);
	
	updateModel();
}

function onChange(event)
{
	updateModel();
}

function updateScale()
{
	_scale = document.getElementById("scale_edit").value * 1;
}

function updateMesh()
{
	let positions, indices, normals, vertexData, i;
	
	// positions = [-5, 2, -3, -7, -2, -3, -3, -2, -3, 5, 2, 3, 7, -2, 3, 3, -2, 3];
	// indices = [0, 1, 2, 3, 4, 5];
	// normals = [];
	
	positions = [];
	indices = [];
	normals = [];
	
	for (i=0; i<_points.length; i++)
	{
		positions.push(_points[i].x * 1 - 50);
		positions.push(_points[i].y * 1);
		positions.push(_points[i].z * 1 - 50);
	}
	
	for (i=0; i<_faces.length; i++)
	{
		indices.push(_faces[i].p1 * 1);
		indices.push(_faces[i].p2 * 1);
		indices.push(_faces[i].p3 * 1);
		
		indices.push(_faces[i].p3 * 1);
		indices.push(_faces[i].p4 * 1);
		indices.push(_faces[i].p1 * 1);
	}
	
	BABYLON.VertexData.ComputeNormals(positions, indices, normals);
	
	vertexData = new BABYLON.VertexData();
	vertexData.positions = positions;
	vertexData.indices = indices;
	vertexData.normals = normals;
	
	vertexData.applyToMesh(_mesh);
	
	if (_flatShading)
	{
		_mesh.convertToFlatShadedMesh();
	}
	
	localstorageSave();
}

function updateSelectionPoints()
{
	moveSelectionSphere(0, null);
	moveSelectionSphere(1, null);
	moveSelectionSphere(2, null);
	moveSelectionSphere(3, null);
	moveSelectionSphere(4, null);
	
	if (_hoveredPoint !== null)
	{
		moveSelectionSphere(0, _hoveredPoint);
	}
	
	if (_currentFace)
	{
		if (_currentFace.p1 !== null)
		{
			moveSelectionSphere(1, _points[_currentFace.p1]);
			// TODO: highlight point selector
		}
		
		if (_currentFace.p2 !== null)
		{
			moveSelectionSphere(2, _points[_currentFace.p2]);
		}
		
		if (_currentFace.p3 !== null)
		{
			moveSelectionSphere(3, _points[_currentFace.p3]);
		}
		
		if (_currentFace.p4 !== null)
		{
			moveSelectionSphere(4, _points[_currentFace.p4]);
		}
	}
}

function updateModel()
{
	updateScale();
	updateCurrentPoint();
	updateSelectionPoints();
	updateMesh();
}

function updateSidebar()
{
	let i, obj, tmp, s;
	
	obj = document.getElementById("points");
	
	obj.innerHTML = "";
	
	for (i=0; i<_points.length; i++)
	{
		tmp = document.createElement("a");
		tmp.dataset.pointId = i;
		tmp.href = "#";
		tmp.id = "point-" + i;
		tmp.onclick = selectPoint;
		tmp.onmouseover = highlightPoint;
		tmp.onmouseout = unhighlightPoint;
		tmp.innerHTML = i + 1;
		
		obj.appendChild(tmp);
	}
	
	obj = document.getElementById("faces");
	
	obj.innerHTML = "";
	
	for (i=0; i<_faces.length; i++)
	{
		tmp = document.createElement("a");
		tmp.dataset.pointId = i;
		tmp.href = "#";
		tmp.id = "face-" + i;
		tmp.onclick = selectFace;
		tmp.innerHTML = i + 1;
		
		obj.appendChild(tmp);
	}
	
	
	s = "";
	
	s += _scale + "/";
	
	for (i=0; i<_points.length; i++)
	{
		s += _points[i].x + " " + _points[i].y + " " + _points[i].z + " ";
	}
	
	s += "/";
	
	for (i=0; i<_faces.length; i++)
	{
		s += _faces[i].p1 + " " + _faces[i].p2 + " " + _faces[i].p3 + " "+ _faces[i].p4 + " ";
	}
	
	obj = document.getElementById("data");
	
	obj.innerHTML = s;
}

function unselectPoint()
{
	if (_currentPointA)
	{
		_currentPointA.className = "";
	}
	
	_currentPoint = null;
	
	document.getElementById("point_edit_x").value = "-";
	document.getElementById("point_edit_y").value = "-";
	document.getElementById("point_edit_z").value = "-";
	
	updateSelectionPoints();
}

function unselectFace()
{
	if (_currentFaceA)
	{
		_currentFaceA.className = "";
	}
	
	_currentFaceA = null;
	_currentFace = null;
	
	updateSelectionPoints();
}

function unselectAll()
{
	unselectPoint();
	unselectFace();
}

function updateCurrentPoint()
{
	if (!_currentPoint)
	{
		return;
	}
	
	_currentPoint.x = document.getElementById("point_edit_x").value * 1;
	_currentPoint.y = document.getElementById("point_edit_y").value * 1;
	_currentPoint.z = document.getElementById("point_edit_z").value * 1;
	
	updateMesh();
}

function selectCurrentFacePoints()
{
	// _currentFace.p1 = obj.dataset.pointId;
}

function selectPoint(event)
{
	let obj;
	
	obj = event.target;
	
	if (_faceRedefinitionStep == 1)
	{
		_currentFace.p1 = obj.dataset.pointId;
		selectCurrentFacePoints();
		_faceRedefinitionStep = 2;
		setStatus("Select second point.");
		return;
	}
	else if (_faceRedefinitionStep == 2)
	{
		_currentFace.p2 = obj.dataset.pointId;
		selectCurrentFacePoints();
		_faceRedefinitionStep = 3;
		setStatus("Select third point.");
		return;
	}
	else if (_faceRedefinitionStep == 3)
	{
		_currentFace.p3 = obj.dataset.pointId;
		selectCurrentFacePoints();
		_faceRedefinitionStep = 4;
		setStatus("Select fourth point.");
		return;
	}
	else if (_faceRedefinitionStep == 4)
	{
		_currentFace.p4 = obj.dataset.pointId;
		selectCurrentFacePoints();
		updateCurrentFace();
		updateModel();
		updateSidebar();
		_faceRedefinitionStep = 0;
		setStatus("Ready.");
		return;
	}
	
	unselectAll();
	
	_currentPoint = _points[obj.dataset.pointId];
	
	_currentPointA = obj;
	_currentPointA.className = "selected";
	
	document.getElementById("point_edit_x").value = _currentPoint.x;
	document.getElementById("point_edit_y").value = _currentPoint.y;
	document.getElementById("point_edit_z").value = _currentPoint.z;
	
	setStatus("Point selected for edit.");
	
	updateSelectionPoints();
}

function selectPointByIndex(index)
{
	unselectAll();
	
	_currentPoint = _points[index];
	
	_currentPointA = document.getElementById("point-" + index);
	_currentPointA.className = "selected";
	
	document.getElementById("point_edit_x").value = _currentPoint.x;
	document.getElementById("point_edit_y").value = _currentPoint.y;
	document.getElementById("point_edit_z").value = _currentPoint.z;
	
	setStatus("Point selected for edit.");
	
	updateSelectionPoints();
}

function moveSelectionSphere(i, point)
{
	if (point)
	{
		_selectionSpheres[i].setEnabled(true);
		_selectionSpheres[i].position.x = point.x - 50;
		_selectionSpheres[i].position.y = point.y;
		_selectionSpheres[i].position.z = point.z - 50;
	}
	else
	{
		_selectionSpheres[i].setEnabled(false);
	}
}

function highlightPoint(event)
{
	
	_hoveredPoint = _points[event.target.dataset.pointId];
	updateSelectionPoints();
}

function unhighlightPoint(event)
{
	_hoveredPoint = null;
	updateSelectionPoints();
}

function addPoint()
{
	if (_currentPoint)
	{
		_points.push({ x: _currentPoint.x, y: _currentPoint.y, z: _currentPoint.z });
	}
	else
	{
		_points.push({ x: 0, y: 0, z: 0 });
	}
	
	updateSidebar();
	
	// select last element
	selectPointByIndex(_points.length - 1);
}

function updateCurrentFace()
{
}

function selectFace(event)
{
	unselectAll();
	
	_currentFace = _faces[event.target.dataset.pointId];
	
	_currentFaceA = event.target;
	_currentFaceA.className = "selected";
	
	selectCurrentFacePoints();
	updateSelectionPoints();
}

function selectFaceByIndex(index)
{
	unselectAll();
	
	_currentFace = _faces[index];
	
	_currentFaceA = document.getElementById("face-" + index);
	_currentFaceA.className = "selected";
	
	selectCurrentFacePoints();
	updateSelectionPoints();
}

function redefineFace()
{
	_faceRedefinitionStep = 1;
	unselectPoint();
	setStatus("Select first point.");
}

function redefineFaceCancel()
{
	unselectAll();
	_faceRedefinitionStep = 0;
	setStatus("Ready.");
}

function addFace()
{
	_faces.push({ p1: null, p2: null, p3: null, p4: null });
	updateSidebar();
	
	// select last element
	selectFaceByIndex(_faces.length - 1);
	redefineFace();
}

function deleteCurrentFace()
{
}

function setStatus(s)
{
	document.getElementById("status").innerHTML = s;
}

function toggleWireframe()
{
	_mesh.material.wireframe = !_mesh.material.wireframe;
	
	if (_mesh.material.wireframe)
	{
		setStatus("Wireframe display. Ready.");
	}
	else
	{
		setStatus("Shaded display. Ready.");
	}
}

function toggleShading()
{
	_flatShading = !_flatShading;
	
	if (_flatShading)
	{
		setStatus("Flat shading. Ready.");
	}
	else
	{
		setStatus("Auto shading. Ready.");
	}
	
	updateMesh();
}

function resetView()
{
	scene.activeCamera.alpha = -Math.PI / 2;
	scene.activeCamera.beta = Math.PI / 2 * 0.7;
}

function registerInputEvents(obj)
{
	obj.addEventListener("change", onChange);
	obj.addEventListener("keyup", onChange);
	obj.addEventListener("wheel", onWheel);
}

function init()
{
	engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
	scene = createScene();
	_scale = 10;
	_points = [];
	_faces = [];
	
	registerInputEvents(document.getElementById("point_edit_x"));
	registerInputEvents(document.getElementById("point_edit_y"));
	registerInputEvents(document.getElementById("point_edit_z"));
	registerInputEvents(document.getElementById("scale_edit"));
	
	engine.runRenderLoop(onRenderLoop);
	window.addEventListener("resize", onResize);
	onResize();
	
	localstorageLoad();
	updateSidebar();
	unselectAll();
	updateMesh();
	resetView();
	
	setStatus("Ready.");
}

window.addEventListener("load", init);
