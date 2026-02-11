import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
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

// --- BRAIN DATA ---
const regionData = {
    "Frontal Lobe": {
        description: "Controls planning, decision-making, speech, and voluntary movement."
    },
    "Parietal Lobe": {
        description: "Processes touch, pressure, temperature, pain, and spatial awareness."
    },
    "Occipital Lobe": {
        description: "The visual processing center. Interprets shape, color, and depth."
    },
    "Temporal Lobe": {
        description: "Vital for long-term memory, hearing, and language comprehension."
    },
    "Cerebellum": {
        description: "Coordinates voluntary movements such as posture, balance, and coordination."
    },
    "Brain Stem": {
        description: "Controls automatic functions like breathing, heart rate, and sleep cycles."
    },
    "Pituitary Gland": {
        description: "The master gland regulating growth and metabolism."
    }
};

const infoName = document.getElementById('part-name');
const infoDescription = document.getElementById('part-description');

// --- INTERACTION STATE ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let brainModel;
let brainBox = new THREE.Box3();
let brainCenter = new THREE.Vector3();
let brainSize = new THREE.Vector3();

// --- LOGIC: GUESS PART BASED ON POSITION ---
function getRegionFromPosition(point) {
    // Calculate relative position (-1 to +1) from the center
    const localZ = (point.z - brainCenter.z) / (brainSize.z / 2);
    const localY = (point.y - brainCenter.y) / (brainSize.y / 2);

    console.log(`Debug Click -> Z: ${localZ.toFixed(2)}, Y: ${localY.toFixed(2)}`);

    // --- TUNED VALUES BASED ON YOUR DATA ---
    
    // 1. Frontal Lobe (Your data showed lowest Z was 0.22)
    if (localZ > 0.20) {
        return "Frontal Lobe";
    } 
    
    // 2. Occipital Lobe (The exact opposite of Frontal)
    else if (localZ < -0.4) {
        return "Occipital Lobe";
    } 
    
    // 3. Parietal vs Temporal (Split by height)
    // If it's NOT Front and NOT Back, check Height (Y)
    else {
        if (localY > 0.1) {
            return "Parietal Lobe"; // Top Middle
        } else {
            return "Temporal Lobe"; // Bottom Middle
        }
    }
}

function handleClick(mesh, point) {
    let regionKey = null;
    const meshName = mesh.name.toLowerCase();

    // Case A: Specific Organs
    if (meshName.includes('cerebellum')) regionKey = "Cerebellum";
    else if (meshName.includes('stem')) regionKey = "Brain Stem";
    else if (meshName.includes('pituitary')) regionKey = "Pituitary Gland";
    
    // Case B: Fused Hemispheres (Use the Math!)
    else {
        regionKey = getRegionFromPosition(point);
    }

    console.log("Region Detected:", regionKey); // Check console if UI fails

    // Update UI
    if (regionKey && regionData[regionKey]) {
        infoName.innerText = regionKey;
        infoDescription.innerText = regionData[regionKey].description;
        
        // Highlight logic
        const originalEmissive = mesh.material.emissive.getHex();
        mesh.material.emissive.setHex(0x333333);
        setTimeout(() => {
            mesh.material.emissive.setHex(originalEmissive);
        }, 300);
    }
}

// --- LOADER ---
const loader = new GLTFLoader();
loader.load('brain_project.glb', (gltf) => {
    brainModel = gltf.scene;
    scene.add(brainModel);

    // Calculate dimensions for the math logic
    brainBox.setFromObject(brainModel);
    brainBox.getCenter(brainCenter);
    brainBox.getSize(brainSize);
    
    // Center the model
    brainModel.position.sub(brainCenter);
    
    // Update our math references since we moved the model
    brainBox.setFromObject(brainModel);
    brainBox.getCenter(brainCenter);
    brainBox.getSize(brainSize);

}, undefined, (e) => console.error(e));

// --- EVENTS ---
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 0, 4);

window.addEventListener('click', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    
    if (brainModel) {
        const intersects = raycaster.intersectObject(brainModel, true);
        if (intersects.length > 0) {
            handleClick(intersects[0].object, intersects[0].point);
        }
    }
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