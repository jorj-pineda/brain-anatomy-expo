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

// --- HIGHLIGHTER ORB ---
// An invisible sphere that jumps to the click location and glows
const highlightGeometry = new THREE.SphereGeometry(0.25, 32, 32); 
const highlightMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffff00, // Yellow glow
    transparent: true, 
    opacity: 0.0 
});
const highlightOrb = new THREE.Mesh(highlightGeometry, highlightMaterial);
scene.add(highlightOrb);

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

// --- LOGIC: MAP COORDINATES TO REGIONS ---
function getRegionFromPosition(point) {
    // Calculate relative position (-1 to +1) from the center
    // Note: Z is Front(+)/Back(-), Y is Top(+)/Bottom(-)
    const localZ = (point.z - brainCenter.z) / (brainSize.z / 2);
    const localY = (point.y - brainCenter.y) / (brainSize.y / 2);

    console.log(`Debug Click -> Z: ${localZ.toFixed(2)}, Y: ${localY.toFixed(2)}`);

    // 1. BRAIN STEM (Deep Low, Central Z)
    if (localY < -0.45 && localZ > -0.4 && localZ < 0.15) {
        return "Brain Stem";
    }

    // 2. CEREBELLUM (Low Y, Back Z)
    // Your data: Y < -0.38, Z < -0.1
    if (localY < -0.38 && localZ < -0.1) {
        return "Cerebellum";
    }

    // 3. PITUITARY GLAND (Specific small box)
    // Your data: Z 0.08 to 0.28, Y -0.30 to -0.42
    if (localY < -0.25 && localY > -0.5 && localZ > 0.0 && localZ < 0.30) {
        return "Pituitary Gland";
    }

    // 4. OCCIPITAL LOBE (Back)
    // Your data: Z < -0.4, Y < 0.28 (Upper limit separates from Parietal)
    if (localZ < -0.4 && localY < 0.28) {
        return "Occipital Lobe";
    }

    // 5. PARIETAL LOBE (Top Middle/Back)
    // Your data: Y > 0.15, Z can go back to -0.9 (if high) or forward to 0.32
    if (localY > 0.15 && localZ < 0.35) {
        return "Parietal Lobe";
    }

    // 6. TEMPORAL LOBE (Bottom/Side Middle)
    // Your data: Y < 0.15, Z < 0.6
    if (localY < 0.15 && localZ < 0.6) {
        return "Temporal Lobe";
    }

    // 7. FRONTAL LOBE (The Rest - Front)
    return "Frontal Lobe";
}

function handleClick(mesh, point) {
    let regionKey = null;
    
    // Always use the math logic now, as it's more accurate than the mesh names
    regionKey = getRegionFromPosition(point);

    console.log("Region Detected:", regionKey); 

    // Update UI
    if (regionKey && regionData[regionKey]) {
        infoName.innerText = regionKey;
        infoDescription.innerText = regionData[regionKey].description;
        
        // --- HIGHLIGHT ORB LOGIC ---
        // 1. Move orb to click position
        highlightOrb.position.copy(point);
        highlightOrb.visible = true;
        
        // 2. Pulse Animation
        let opacity = 0.8;
        highlightOrb.material.opacity = opacity;
        
        function fade() {
            opacity -= 0.04; // Fade speed
            highlightOrb.material.opacity = opacity;
            if (opacity > 0) {
                requestAnimationFrame(fade);
            } else {
                highlightOrb.visible = false;
            }
        }
        fade();
    }
}

// --- LOADER ---
const loader = new GLTFLoader();
loader.load('brain_project.glb', (gltf) => {
    brainModel = gltf.scene;
    scene.add(brainModel);

    // Calculate dimensions
    brainBox.setFromObject(brainModel);
    brainBox.getCenter(brainCenter);
    brainBox.getSize(brainSize);
    
    // Center the model
    brainModel.position.sub(brainCenter);
    
    // Update references
    brainBox.setFromObject(brainModel);
    brainBox.getCenter(brainCenter);
    brainBox.getSize(brainSize);

}, undefined, (e) => console.error(e));

// --- EVENTS ---
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 0, 4);

window.addEventListener('click', (event) => {
    // Standardize mouse coordinates
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