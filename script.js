import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
keyLight.position.set(4, 6, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x99bbff, 0.5);
fillLight.position.set(-6, 2, -2);
scene.add(fillLight);

// --- BRAIN REGION DATA ---
// `aliases` let a region match either mesh names OR material names.
const regionConfig = {
    frontal: {
        title: 'Frontal Lobe',
        description: 'Controls planning, decision-making, speech production, personality, and voluntary movement.',
        aliases: ['frontal', 'frontallobe', 'brain_part_02'],
    },
    parietal: {
        title: 'Parietal Lobe',
        description: 'Processes touch, pressure, temperature, pain, and spatial awareness.',
        aliases: ['parietal', 'parietallobe', 'brain_part_04'],
    },
    occipital: {
        title: 'Occipital Lobe',
        description: 'Primary visual processing center that interprets shape, color, and motion.',
        aliases: ['occipital', 'occipitallobe', 'brain_part_05'],
    },
    temporal: {
        title: 'Temporal Lobe',
        description: 'Supports hearing, language comprehension, memory formation, and emotion processing.',
        aliases: ['temporal', 'temporallobe', 'brain_part_06'],
    },
    cerebellum: {
        title: 'Cerebellum',
        description: 'Coordinates balance, posture, and fine motor control for smooth movement.',
        aliases: ['cerebellum', 'brain_part_01'],
    },
};

const infoName = document.getElementById('part-name');
const infoDescription = document.getElementById('part-description');

// --- PICKING STATE ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickStart = new THREE.Vector2();

let brainModel;
let pickableMeshes = [];
let highlightedMesh = null;
let previousEmissive = null;

function normalize(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '');
}

function getMaterialName(material) {
    if (!material) return '';

    if (Array.isArray(material)) {
        return material
            .map((m) => m?.name || '')
            .join(' ');
    }

    return material.name || '';
}

function findRegionData(mesh) {
    const hierarchyNames = [];
    let current = mesh;

    // Capture the full parent chain, because many GLB models put semantic names on parent nodes.
    while (current) {
        hierarchyNames.push(current.name || '');
        current = current.parent;
    }

    const searchable = normalize(`${hierarchyNames.join(' ')} ${getMaterialName(mesh.material)}`);

    for (const region of Object.values(regionConfig)) {
        if (region.aliases.some((alias) => searchable.includes(normalize(alias)))) {
            return region;
        }
    }

    return null;
}

function setSelection(mesh, region) {
    // Clear previous highlight.
    if (highlightedMesh?.material?.emissive && previousEmissive !== null) {
        highlightedMesh.material.emissive.setHex(previousEmissive);
    }

    highlightedMesh = null;
    previousEmissive = null;

    if (mesh?.material?.emissive) {
        highlightedMesh = mesh;
        previousEmissive = mesh.material.emissive.getHex();
        mesh.material.emissive.setHex(0x333333);
    }

    if (region) {
        infoName.innerText = region.title;
        infoDescription.innerText = region.description;
        return;
    }

    const hierarchy = [];
    let current = mesh;

    while (current) {
        if (current.name) hierarchy.push(current.name);
        current = current.parent;
    }

    infoName.innerText = 'Region Selected';
    infoDescription.innerText = `No mapped region yet. Mesh: ${mesh.name || 'unnamed'}. Material: ${getMaterialName(mesh.material) || 'unnamed'}.`;

    console.log('[Unmapped Selection]');
    console.log('Mesh name:', mesh.name);
    console.log('Material:', getMaterialName(mesh.material));
    console.log('Hierarchy:', hierarchy.join(' > '));
}

function updatePointerFromEvent(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickAtPointer(event) {
    if (!brainModel || pickableMeshes.length === 0) return;

    updatePointerFromEvent(event);
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(pickableMeshes, false);
    if (hits.length === 0) return;

    const selectedMesh = hits[0].object;
    const region = findRegionData(selectedMesh);
    setSelection(selectedMesh, region);
}

// --- MODEL LOADING ---
const loader = new GLTFLoader();
loader.load(
    'brain_project.glb',
    (gltf) => {
        brainModel = gltf.scene;
        scene.add(brainModel);

        const bounds = new THREE.Box3().setFromObject(brainModel);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());

        brainModel.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const distance = maxDim * 1.6;

        camera.position.set(0, size.y * 0.05, distance);
        camera.near = Math.max(0.01, distance / 100);
        camera.far = distance * 20;
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.update();

        pickableMeshes = [];
        console.log('--- Brain Mesh Index ---');

        brainModel.traverse((child) => {
            if (!child.isMesh) return;

            child.castShadow = false;
            child.receiveShadow = false;

            if (Array.isArray(child.material)) {
                child.material = child.material.map((m) => m.clone());
            } else if (child.material) {
                child.material = child.material.clone();
            }

            pickableMeshes.push(child);

            console.log({
                mesh: child.name || '(unnamed mesh)',
                material: getMaterialName(child.material) || '(unnamed material)',
                parent: child.parent?.name || '(no parent)',
            });
        });

        console.log('--- End Brain Mesh Index ---');
    },
    undefined,
    (error) => {
        console.error('Error loading model:', error);
        infoName.innerText = 'Model failed to load';
        infoDescription.innerText = 'Check console for error details.';
    },
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.7;
controls.maxDistance = 8;
controls.enablePan = false;

renderer.domElement.addEventListener('pointerdown', (event) => {
    clickStart.set(event.clientX, event.clientY);
});

renderer.domElement.addEventListener('pointerup', (event) => {
    const dragDistance = clickStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY));

    // Ignore drags so orbiting the brain doesn't trigger false clicks.
    if (dragDistance > 6) return;

    pickAtPointer(event);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
