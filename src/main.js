"use strict";

class EPoint
{
	constructor(x, y, z)
	{
		this.x = x;
		this.y = y;
		this.z = z;
	}
}

class EFace
{
	constructor(p1, p2, p3, p4)
	{
		this.p1 = p1;
		this.p2 = p2;
		this.p3 = p3;
		this.p4 = p4;
		this.groupIndex = 0;
	}
}

class EGroup
{
	constructor(materialIndex)
	{
		this.materialIndex = materialIndex;
		
		this.cloneCount = 0;
		this.clonePadX = 0;
		this.clonePadY = 0;
		this.clonePadZ = 0;
		this.cloneRotateX = 0;
		this.cloneRotateY = 0;
		this.cloneRotateZ = 0;
	}
}

class EMaterial
{
	constructor(r, g, b, a)
	{
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}
}

let _lastFrameRenderTime;
let _canvas;
let _engine;
let _scene;
let _camera;

let _shadowGenerator;

let _currentPoint;
let _hoveredPoint;
let _currentPointA;

let _currentFace;
let _currentFaceA;

let _currentGroupIndex;
let _currentGroupA;

let _faceRedefinitionStep;
let _groupRedefinitionStep;

let _mesh;

let _selectionSpheres;
let _pointSphereBase;
let _pointSpheres;

let _model;

let _modelDefaults = {
	scale: 10,
	points: [],
	faces: [],
	groups: [],
	flatShaded: false
};

let _materials = [
];

// the one to be processed by bjs
let _finalModel;

function _copy(obj)
{
	return JSON.parse(JSON.stringify(obj));
}

function clamp(min, max, x)
{
	return Math.min(Math.max(x, min), max);
}

function setDefaults(obj, defaults)
{
	let i;
	
	for (i in defaults)
	{
		if (!defaults.hasOwnProperty(i))
		{
			continue;
		}
		
		if (obj.hasOwnProperty(i))
		{
			continue;
		}
		
		obj[i] = defaults[i];
	}
}

function quickMaterial(r, g, b, a, scene)
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
	
	scene = new BABYLON.Scene(_engine);
	
	scene.clearColor = new BABYLON.Color3(98/255, 193/255, 229/255);
	scene.ambientColor = new BABYLON.Color3(98/255, 193/255, 229/255);
	
	light1 = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(-200, 200, -200), scene);
	light1.intensity = 0.8;
	
	light2 = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(200, 200, -200), scene);
	light2.intensity = 0.5;
	
	_camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 1, 0.8, 150, new BABYLON.Vector3(0, 0, 0), scene);
	_camera.lowerBetaLimit = 0.01;
	_camera.upperBetaLimit = (Math.PI / 2) * 0.999;
	_camera.lowerRadiusLimit = 1;
	_camera.minZ = 0.2;
	_camera.inertia = 0.7;
	
	_camera.attachControl(_canvas);
	
	material = new BABYLON.MultiMaterial("", scene);
	material.subMaterials.push(quickMaterial(0.5, 0.5, 0.5, 1.0, scene));
	material.subMaterials.push(quickMaterial(1.0, 0, 0, 1.0, scene));
	material.subMaterials.push(quickMaterial(0, 1.0, 0, 1.0, scene));
	material.subMaterials.push(quickMaterial(0, 0, 1.0, 1.0, scene));
	
	_mesh = new BABYLON.Mesh("custom", scene);
	_mesh.material = material;
	_mesh.isPickable = false;
	
	shadowGenerator1 = new BABYLON.ShadowGenerator(1024, light1);
	shadowGenerator1.useBlurExponentialShadowMap = true;
	shadowGenerator1.blurKernel = 32;
	shadowGenerator1.addShadowCaster(_mesh, true);
	
	plane = BABYLON.Mesh.CreatePlane("ground", 150, scene);
	plane.rotation.x = Math.PI / 2;
	plane.position.y = -0.1;
	plane.receiveShadows = true;
	plane.material = quickMaterial(98/255*0.3, 193/255*0.3, 229/255*0.3, 1, scene);
	plane.isPickable = false;
	
	_selectionSpheres[0] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 2 }, scene);
	_selectionSpheres[0].material = quickMaterial(1.0, 0.5, 0.0, 0.7, scene);
	_selectionSpheres[0].isPickable = false;
	
	_selectionSpheres[1] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);
	_selectionSpheres[1].material = quickMaterial(1.0, 0.0, 0.0, 0.7, scene);
	_selectionSpheres[1].isPickable = false;
	
	_selectionSpheres[2] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);
	_selectionSpheres[2].material = quickMaterial(1.0, 0.0, 0.5, 0.7, scene);
	_selectionSpheres[2].isPickable = false;
	
	_selectionSpheres[3] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);
	_selectionSpheres[3].material = quickMaterial(0.4, 0.0, 1.0, 0.7, scene);
	_selectionSpheres[3].isPickable = false;
	
	_selectionSpheres[4] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);
	_selectionSpheres[4].material = quickMaterial(0.0, 0.2, 1.0, 0.7, scene);
	_selectionSpheres[4].isPickable = false;
	
	_selectionSpheres[5] = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);
	_selectionSpheres[5].material = quickMaterial(0.0, 1.0, 0.0, 0.7, scene);
	_selectionSpheres[5].isPickable = false;
	
	_pointSphereBase = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.1 }, scene);
	_pointSphereBase.material = quickMaterial(0.5, 0.5, 0.5, 0.7, scene);
	_pointSphereBase.setEnabled(false);
	
	return scene;
	
	// Enable VR
	let vrHelper = scene.createDefaultVRExperience({ createDeviceOrientationCamera:true });
	
	return scene;
}

function localstorageSave()
{
	localStorage.setItem("editor:model", JSON.stringify(_model));
}

function localstorageLoad()
{
	_model = JSON.parse(localStorage.getItem("editor:model")) || null;
	
	if (_model == null)
	{
		_model = {};
		
		clearModel();
	}
	
	setDefaults(_model, _modelDefaults);
}

function onRenderLoop()
{
	let now;
	
	if (!_scene)
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
	
	_scene.render();
}

function onResize()
{
	_canvas.width = window.innerWidth - 200;
	_canvas.height = window.innerHeight;
	_engine.resize();
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
	
	event.target.value = clamp(0, 100, Math.round(event.target.value * 1) + change);
	
	onChange(event);
}

function onClick(event)
{
	let a;
	
	a = _scene.pick(_scene.pointerX, _scene.pointerY);
	
	if (!a.pickedMesh || a.pickedMesh.pointIndex === undefined)
	{
		return;
	}
	
	selectPoint({ target: { dataset: { pointIndex: a.pickedMesh.pointIndex }}});
}

function onMouseMove(event)
{
	let a;
	
	a = _scene.pick(_scene.pointerX, _scene.pointerY);
	
	if (!a.pickedMesh || a.pickedMesh.pointIndex === undefined)
	{
		unhighlightPoint();
		return;
	}
	
	highlightPoint({ target: { dataset: { pointIndex: a.pickedMesh.pointIndex }}});
}

function onChange(event)
{
	updateCurrentPoint();
	updateCurrentGroup();
	updateModel();
}

function onKeyDown(event)
{
	let change;
	
	if (event.code == "ArrowDown")
	{
		change = -1;
	}
	else if (event.code == "ArrowUp")
	{
		change = +1;
	}
	else
	{
		return;
	}
	
	event.target.value = clamp(0, 100, Math.round(event.target.value * 1) + change);
	event.preventDefault();
	event.stopPropagation();
	
	onChange(event);
}

function updateScale()
{
	_model.scale = document.getElementById("scale_edit").value * 1;
}

function updateMesh()
{
	let positions, indices, normals, vertexData, multimaterial, i;
	
	positions = [];
	indices = [];
	normals = [];
	
	for (i=0; i<_finalModel.points.length; i++)
	{
		positions.push(_finalModel.points[i] * 1 - (i % 3 != 1 ? 50 : 0)); // pad all positions except Y
	}
	
	for (i=0; i<_finalModel.faces.length; i += 4)
	{
		indices.push(_finalModel.faces[i] * 1);
		indices.push(_finalModel.faces[i + 1] * 1);
		indices.push(_finalModel.faces[i + 2] * 1);
		
		indices.push(_finalModel.faces[i + 2] * 1);
		indices.push(_finalModel.faces[i + 3] * 1);
		indices.push(_finalModel.faces[i] * 1);
	}
	
	BABYLON.VertexData.ComputeNormals(positions, indices, normals);
	
	vertexData = new BABYLON.VertexData();
	vertexData.positions = positions;
	vertexData.indices = indices;
	vertexData.normals = normals;
	
	vertexData.applyToMesh(_mesh);
	
	if (_finalModel.flatShaded)
	{
		_mesh.convertToFlatShadedMesh();
	}
	
	_mesh.subMeshes = [];
	
	for (i=0; i<_finalModel.groups.length; i += 10)
	{
		 _mesh.subMeshes.push(new BABYLON.SubMesh(_finalModel.groups[i] * 1, 0, _finalModel.points.length, _finalModel.groups[i + 1] * 1 * 6, (_finalModel.groups[i + 2] * 1 - _finalModel.groups[i + 1] * 1 + 1) * 6, _mesh));
	}
}

function updateSelections()
{
	let a, i;
	
	moveSelectionSphere(0, null);
	moveSelectionSphere(1, null);
	moveSelectionSphere(2, null);
	moveSelectionSphere(3, null);
	moveSelectionSphere(4, null);
	moveSelectionSphere(5, null);
	
	a = document.getElementById("points").getElementsByTagName("a");
	
	for (i=0; i<a.length; i++)
	{
		a[i].className = "";
		
		if (_currentFace)
		{
			if (_currentFace.p1 == a[i].dataset.pointIndex)
			{
				a[i].className = "selected_p1";
			}
			else if (_currentFace.p2 == a[i].dataset.pointIndex)
			{
				a[i].className = "selected_p2";
			}
			else if (_currentFace.p3 == a[i].dataset.pointIndex)
			{
				a[i].className = "selected_p3";
			}
			else if (_currentFace.p4 == a[i].dataset.pointIndex)
			{
				a[i].className = "selected_p4";
			}
		}
	}
	
	a = document.getElementById("faces").getElementsByTagName("a");
	
	for (i=0; i<a.length; i++)
	{
		a[i].className = "";
		
		if (_currentGroupIndex != -1)
		{
			if (_model.faces[a[i].dataset.faceIndex].groupIndex == _currentGroupIndex)
			{
				a[i].className = "selected";
			}
		}
	}
	a = document.getElementById("groups").getElementsByTagName("a");
	
	for (i=0; i<a.length; i++)
	{
		a[i].className = "";
	}
	
	if (_hoveredPoint !== null)
	{
		moveSelectionSphere(0, _hoveredPoint);
	}
	
	if (_currentPoint)
	{
		moveSelectionSphere(5, _currentPoint);
		_currentPointA.className = "selected";
	}
	
	if (_currentFace)
	{
		if (_currentFace.p1 !== null)
		{
			moveSelectionSphere(1, _model.points[_currentFace.p1]);
		}
		
		if (_currentFace.p2 !== null)
		{
			moveSelectionSphere(2, _model.points[_currentFace.p2]);
		}
		
		if (_currentFace.p3 !== null)
		{
			moveSelectionSphere(3, _model.points[_currentFace.p3]);
		}
		
		if (_currentFace.p4 !== null)
		{
			moveSelectionSphere(4, _model.points[_currentFace.p4]);
		}
		
		_currentFaceA.className = "selected";
	}
	
	if (_currentGroupIndex != -1)
	{
		_currentGroupA.className = "selected";
	}
	
	for (i=0; i<_pointSpheres.length; i++)
	{
		_pointSpheres[i].setEnabled(false);
	}
	
	for (i=0; i<_model.points.length; i++)
	{
		if (_pointSpheres.length <= i)
		{
			_pointSpheres.push(_pointSphereBase.createInstance());
		}
		
		_pointSpheres[i].setEnabled(true);
		_pointSpheres[i].pointIndex = i;
		_pointSpheres[i].position.x = _model.points[i].x - 50;
		_pointSpheres[i].position.y = _model.points[i].y;
		_pointSpheres[i].position.z = _model.points[i].z - 50;
	}
}

function updateGroups()
{
	let i;
	
	for (i=0; i<_model.faces.length; i++)
	{
		if (_model.faces[i].groupIndex === undefined)
		{
			_model.faces[i].groupIndex = 0;
		}
	}
}

function updateModel()
{
	updateScale();
	updateCurrentPoint();
	updateGroups();
	
	convertEditableModelToFinal();
	
	updateMesh();
	updateSidebar();
	
	localstorageSave();
}

function getFinalModelData()
{
	let i, j, s, group, min, max, faces;
	
	faces = _copy(_model.faces);
	
	faces.sort(function(a, b) { return b.groupIndex - a.groupIndex });
	
	s = "";
	s += (_model.flatShaded ? 1 : 0) + "  ";
	s += _model.scale + "  ";
	
	for (i=0; i<_model.points.length; i++)
	{
		s += _model.points[i].x + " " + _model.points[i].y + " " + _model.points[i].z + " ";
	}
	s = s.trim();
	
	s += "  ";
	
	for (i=0; i<faces.length; i++)
	{
		s += faces[i].p1 + " " + faces[i].p2 + " " + faces[i].p3 + " " + faces[i].p4 + " ";
	}
	s = s.trim();
	
	s += "  ";
	
	for (i=0; i<_model.groups.length; i++)
	{
		group = _model.groups[i];
		
		min = 999999;
		max = -1;
		
		for (j=0; j<faces.length; j++)
		{
			if (faces[j].groupIndex == i)
			{
				min = Math.min(min, j);
				max = Math.max(max, j);
			}
		}
		
		// if no faces use this group
		if (max == -1)
		{
			// discard it
			continue;
		}
		
		s += group.materialIndex + " ";
		s += min + " ";
		s += max + " ";
		s += group.cloneCount + " ";
		s += group.clonePadX + " ";
		s += group.clonePadY + " ";
		s += group.clonePadZ + " ";
		s += group.cloneRotateX + " ";
		s += group.cloneRotateY + " ";
		s += group.cloneRotateZ + " ";
	}
	s = s.trim();
	
	return s;
}

function groupAdd()
{
	_model.groups.push(new EGroup(0));
}

function parseFinalModelData(s)
{
	let a;
	
	a = s.split("  ");
	
	return {
		flatShaded: a[0] * 1,
		scale: a[1],
		points: a[2].split(" "),
		faces: a[3].split(" "),
		groups: a[4].split(" ")
	};
}

function convertFinalModelToEditable()
{
	let a, b, i;
	
	_model = _copy(_modelDefaults);
	_model.flatShaded = _finalModel.flatShaded * 1;
	_model.scale = _finalModel.scale * 1;
	
	for (i=0; i<_finalModel.points.length; i+=3)
	{
		_model.points.push(new EPoint(
			_finalModel.points[i] * 1,
			_finalModel.points[i + 1] * 1,
			_finalModel.points[i + 2] * 1
		));
	}
	
	for (i=0; i<_finalModel.faces.length; i+=4)
	{
		_model.faces.push(new EFace(
			_finalModel.faces[i] * 1,
			_finalModel.faces[i + 1] * 1,
			_finalModel.faces[i + 2] * 1,
			_finalModel.faces[i + 3] * 1
		));
	}
}

function convertEditableModelToFinal()
{
	_finalModel = parseFinalModelData(getFinalModelData());
}

function updateSidebar()
{
	let i, obj, tmp, s;
	
	obj = document.getElementById("points");
	
	obj.innerHTML = "";
	
	for (i=0; i<_model.points.length; i++)
	{
		tmp = document.createElement("a");
		tmp.dataset.pointIndex = i;
		tmp.href = "#";
		tmp.id = "point-" + i;
		tmp.onclick = selectPoint;
		tmp.onmouseover = highlightPoint;
		tmp.onmouseout = unhighlightPoint;
		tmp.innerHTML = i;
		
		obj.appendChild(tmp);
	}
	
	obj = document.getElementById("faces");
	
	obj.innerHTML = "";
	
	for (i=0; i<_model.faces.length; i++)
	{
		tmp = document.createElement("a");
		tmp.dataset.faceIndex = i;
		tmp.href = "#";
		tmp.id = "face-" + i;
		tmp.onclick = selectFace;
		tmp.innerHTML = i;
		
		obj.appendChild(tmp);
	}
	
	obj = document.getElementById("groups");
	
	obj.innerHTML = "";
	
	for (i=0; i<_model.groups.length; i++)
	{
		tmp = document.createElement("a");
		tmp.dataset.groupIndex = i;
		tmp.href = "#";
		tmp.id = "group-" + i;
		tmp.onclick = selectGroup;
		tmp.innerHTML = i;
		
		obj.appendChild(tmp);
	}
	
	
	s = getFinalModelData();
	
	obj = document.getElementById("data").value = s;
	obj = document.getElementById("data_size").innerHTML = s.length + " characters";
	
	updateSelections();
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
	
	updateSelections();
}

function unselectFace()
{
	if (_currentFaceA)
	{
		_currentFaceA.className = "";
	}
	
	_currentFaceA = null;
	_currentFace = null;
	
	updateSelections();
}

function unselectAll()
{
	unselectPoint();
	unselectFace();
	unselectGroup();
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
		_currentFace.p1 = obj.dataset.pointIndex;
		selectCurrentFacePoints();
		_faceRedefinitionStep = 2;
		setStatus("Select second point.");
		return;
	}
	else if (_faceRedefinitionStep == 2)
	{
		_currentFace.p2 = obj.dataset.pointIndex;
		selectCurrentFacePoints();
		_faceRedefinitionStep = 3;
		setStatus("Select third point.");
		return;
	}
	else if (_faceRedefinitionStep == 3)
	{
		_currentFace.p3 = obj.dataset.pointIndex;
		selectCurrentFacePoints();
		_faceRedefinitionStep = 4;
		setStatus("Select fourth point.");
		return;
	}
	else if (_faceRedefinitionStep == 4)
	{
		_currentFace.p4 = obj.dataset.pointIndex;
		selectCurrentFacePoints();
		updateCurrentFace();
		updateModel();
		updateSidebar();
		_faceRedefinitionStep = 0;
		setStatus("Ready.");
		return;
	}
	
	unselectAll();
	
	_currentPoint = _model.points[obj.dataset.pointIndex];
	
	_currentPointA = obj;
	
	document.getElementById("point_edit_x").value = _currentPoint.x;
	document.getElementById("point_edit_y").value = _currentPoint.y;
	document.getElementById("point_edit_z").value = _currentPoint.z;
	
	setStatus("Point selected for edit.");
	
	updateSelections();
}

function selectPointByIndex(index)
{
	unselectAll();
	
	_currentPoint = _model.points[index];
	
	_currentPointA = document.getElementById("point-" + index);
	
	document.getElementById("point_edit_x").value = _currentPoint.x;
	document.getElementById("point_edit_y").value = _currentPoint.y;
	document.getElementById("point_edit_z").value = _currentPoint.z;
	
	setStatus("Point selected for edit.");
	
	updateSelections();
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
	
	_hoveredPoint = _model.points[event.target.dataset.pointIndex];
	
	updateSelections();
}

function unhighlightPoint(event)
{
	_hoveredPoint = null;
	
	updateSelections();
}

function addPoint()
{
	if (_currentPoint)
	{
		_model.points.push(new EPoint(_currentPoint.x, _currentPoint.y, _currentPoint.z));
	}
	else
	{
		_model.points.push(new EPoint(0, 0, 0));
	}
	
	updateSidebar();
	
	// select last element
	selectPointByIndex(_model.points.length - 1);
}

function updateCurrentFace()
{
}

function selectFace(event)
{
	let a;
	
	a = _model.faces[event.target.dataset.faceIndex];
	
	if (_groupRedefinitionStep == 1)
	{
		if (a.groupIndex == 1)
		{
			a.groupIndex = _currentGroupIndex;
		}
		else
		{
			a.groupIndex = 1;
		}
		
		updateModel();
		
		return;
	}
	
	unselectAll();
	
	_currentFace = a;
	
	_currentFaceA = event.target;
	
	selectCurrentFacePoints();
	updateSelections();
}

function selectFaceByIndex(index)
{
	unselectAll();
	
	_currentFace = _model.faces[index];
	
	_currentFaceA = document.getElementById("face-" + index);
	
	selectCurrentFacePoints();
	updateSelections();
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
	_model.faces.push(new EFace(null, null, null, null));
	updateSidebar();
	
	// select last element
	selectFaceByIndex(_model.faces.length - 1);
	redefineFace();
}

function deleteCurrentFace()
{
}

function editGroupFaces()
{
	unselectPoint();
	unselectFace();
	
	_groupRedefinitionStep = 1;
	setStatus("Select faces to add/remove.");
}

function finishGroupFaces()
{
	_groupRedefinitionStep = 0;
	updateModel();
	setStatus("Ready.");
}

function updateCurrentGroup()
{
	let a;
	
	if (_currentGroupIndex == -1)
	{
		return;
	}
	
	a = _model.groups[_currentGroupIndex];
	
	a.materialIndex = document.getElementById("group_edit_material").value * 1;
	a.cloneCount = document.getElementById("group_edit_count").value * 1;
	a.clonePadX = document.getElementById("group_edit_px").value * 1;
	a.clonePadY = document.getElementById("group_edit_py").value * 1;
	a.clonePadZ = document.getElementById("group_edit_pz").value * 1;
	a.cloneRotateX = document.getElementById("group_edit_rx").value * 1;
	a.cloneRotateY = document.getElementById("group_edit_ry").value * 1;
	a.cloneRotateZ = document.getElementById("group_edit_rz").value * 1;
	
	updateModel();
}

function unselectGroup()
{
	_currentGroupIndex = -1;
	
	document.getElementById("group_edit_material").value = "-";
	document.getElementById("group_edit_count").value = "-";
	document.getElementById("group_edit_px").value = "-";
	document.getElementById("group_edit_py").value = "-";
	document.getElementById("group_edit_pz").value = "-";
	document.getElementById("group_edit_rx").value = "-";
	document.getElementById("group_edit_ry").value = "-";
	document.getElementById("group_edit_rz").value = "-";
}

function selectGroup(event)
{
	let a;
	
	unselectAll();
	
	if (_currentGroupA)
	{
		_currentGroupA.className = "";
	}
	
	_currentGroupIndex = event.target.dataset.groupIndex;
	_currentGroupA = event.target;
	_currentGroupA.className = "selected";
	
	a = _model.groups[_currentGroupIndex];
	
	document.getElementById("group_edit_material").value = a.materialIndex;
	document.getElementById("group_edit_count").value = a.cloneCount;
	document.getElementById("group_edit_px").value  = a.clonePadX;
	document.getElementById("group_edit_py").value  = a.clonePadY;
	document.getElementById("group_edit_pz").value  = a.clonePadZ;
	document.getElementById("group_edit_rx").value  = a.cloneRotateX;
	document.getElementById("group_edit_ry").value  = a.cloneRotateY;
	document.getElementById("group_edit_rz").value  = a.cloneRotateZ;
	
	updateSelections();
}

function setStatus(s)
{
	let obj;
	
	obj = document.getElementById("status");
	obj.style.animationName = "updated";
	obj.addEventListener("webkitAnimationEnd", function(element) { element.target.style.animationName = ""; });
	
	obj.innerHTML = s;
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
	_model.flatShaded = !_model.flatShaded;
	
	if (_model.flatShaded)
	{
		setStatus("Flat shading. Ready.");
	}
	else
	{
		setStatus("Auto shading. Ready.");
	}
	
	updateModel();
}

function resetView()
{
	_scene.activeCamera.alpha = -Math.PI / 2;
	_scene.activeCamera.beta = Math.PI / 2 * 0.7;
}

function loadModelFromTextarea()
{
	unselectAll();
	
	_finalModel = parseFinalModelData(document.getElementById("data").value);
	convertFinalModelToEditable();
	
	updateSidebar();
	updateModel();
}

function clearModel()
{
	_model = _copy(_modelDefaults);
	
	_model.points.push(new EPoint(0, 0, 0));
	_model.points.push(new EPoint(10, 0, 0));
	_model.points.push(new EPoint(10, 10, 0));
	_model.points.push(new EPoint(0, 10, 0));
	
	_model.faces.push(new EFace(0, 1, 2, 3));
	
	_model.groups.push(new EGroup(0));
	
	updateModel();
}

function registerInputEvents(obj)
{
	obj.addEventListener("change", onChange);
	obj.addEventListener("keyup", onChange);
	obj.addEventListener("keydown", onKeyDown);
	obj.addEventListener("wheel", onWheel);
}

function init()
{
	_lastFrameRenderTime = 0;
	_faceRedefinitionStep = 0;
	_groupRedefinitionStep = 0;
	_currentGroupIndex = -1;
	_selectionSpheres = [];
	_pointSpheres = [];
	
	_canvas = document.getElementById("renderCanvas")
	_engine = new BABYLON.Engine(_canvas, true, { preserveDrawingBuffer: true, stencil: true });
	_scene = createScene();
	
	registerInputEvents(document.getElementById("point_edit_x"));
	registerInputEvents(document.getElementById("point_edit_y"));
	registerInputEvents(document.getElementById("point_edit_z"));
	registerInputEvents(document.getElementById("scale_edit"));
	
	registerInputEvents(document.getElementById("group_edit_material"));
	registerInputEvents(document.getElementById("group_edit_count"));
	registerInputEvents(document.getElementById("group_edit_px"));
	registerInputEvents(document.getElementById("group_edit_py"));
	registerInputEvents(document.getElementById("group_edit_pz"));
	registerInputEvents(document.getElementById("group_edit_rx"));
	registerInputEvents(document.getElementById("group_edit_ry"));
	registerInputEvents(document.getElementById("group_edit_rz"));
	
	_engine.runRenderLoop(onRenderLoop);
	window.addEventListener("resize", onResize);
	_canvas.addEventListener("mousemove", onMouseMove);
	_canvas.addEventListener("click", onClick);
	onResize();
	
	localstorageLoad();
	updateSidebar();
	unselectAll();
	updateModel();
	resetView();
	
	setStatus("Ready.");
}

window.addEventListener("load", init);
