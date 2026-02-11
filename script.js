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

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); 
scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(4, 6, 5);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x99bbff, 0.5);
fillLight.position.set(-6, 2, -2);
scene.add(fillLight);

// --- BRAIN DATA (Expanded) ---
const regionData = {
    "Frontal Lobe": {
        description: "The 'Control Panel' of our personality and ability to communicate. \n\nFunctions:\n• Cognitive skills (planning, problem-solving)\n• Emotional expression and personality\n• Voluntary movement (Motor Cortex)\n• Language production (Broca's Area)\n\nDid you know? This is the last part of the brain to fully mature, often not until your mid-20s!"
    },
    "Parietal Lobe": {
        description: "The 'Sensory Manager' that processes information about the world around us. \n\nFunctions:\n• Sensation (touch, temperature, pain)\n• Spatial awareness and navigation\n• Reading and arithmetic\n• Hand-eye coordination\n\nDid you know? Damage to this area can lead to 'Hemispatial Neglect,' where a person simply ignores one half of their visual field."
    },
    "Occipital Lobe": {
        description: "The 'Visual Processing Center' located at the very back of the brain. \n\nFunctions:\n• Visual perception\n• Color recognition\n• Depth perception\n• Motion detection\n\nDid you know? Even if your eyes are perfectly healthy, damage here can cause 'Cortical Blindness' because the brain can't process what it sees."
    },
    "Temporal Lobe": {
        description: "The 'Data Center' for sound and memory. \n\nFunctions:\n• Processing auditory information (hearing)\n• Encoding memory (Hippocampus)\n• Language comprehension (Wernicke's Area)\n• Emotion regulation\n\nDid you know? This region houses the Hippocampus, which acts as the 'Save Button' for new memories."
    },
    "Cerebellum": {
        description: "Latin for 'Little Brain.' It contains more neurons than the rest of the brain combined! \n\nFunctions:\n• Coordination and balance\n• Fine motor control\n• Muscle memory (like riding a bike)\n• Posture maintenance\n\nDid you know? While it only takes up 10% of brain volume, it holds over 50% of the brain's total neurons."
    },
    "Brain Stem": {
        description: "The 'Life Support' system connecting the brain to the spinal cord. \n\nFunctions:\n• Breathing and heart rate\n• Blood pressure regulation\n• Sleep cycles (consciousness)\n• Swallowing and digestion\n\nDid you know? Because it controls vital functions, injuries here are often the most life-threatening."
    },
    "Pituitary Gland": {
        description: "The 'Master Gland' regarding hormone regulation. \n\nFunctions:\n• Growth hormones\n• Metabolism regulation\n• Stress response (Cortisol)\n• Reproduction hormones\n\nDid you know? It is only the size of a pea but controls almost every other hormone-secreting gland in the body."
    }
};

const infoName = document.getElementById('part-name');
const infoDescription = document.getElementById('part-description');

// --- INTERACTION STATE ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let brainModel;
let brainMeshes = []; // List to store ALL parts of the brain
let brainBox = new THREE.Box3();
let brainCenter = new THREE.Vector3();
let brainSize = new THREE.Vector3();

// --- LOGIC: MAP COORDINATES TO REGIONS ---
function getRegionFromPosition(point) {
    const localZ = (point.z - brainCenter.z) / (brainSize.z / 2);
    const localY = (point.y - brainCenter.y) / (brainSize.y / 2);

    // 1. BRAIN STEM
    if (localY < -0.45 && localZ > -0.4 && localZ < 0.15) return "Brain Stem";

    // 2. CEREBELLUM
    if (localY < -0.38 && localZ < -0.1) return "Cerebellum";

    // 3. PITUITARY GLAND
    if (localY < -0.25 && localY > -0.5 && localZ > 0.0 && localZ < 0.30) return "Pituitary Gland";

    // 4. OCCIPITAL LOBE
    if (localZ < -0.4 && localY < 0.28) return "Occipital Lobe";

    // 5. PARIETAL LOBE
    if (localY > 0.15 && localZ < 0.35) return "Parietal Lobe";

    // 6. TEMPORAL LOBE
    if (localY < 0.15 && localZ < 0.6) return "Temporal Lobe";

    // 7. FRONTAL LOBE
    return "Frontal Lobe";
}

// --- VERTEX PAINTING LOGIC (The Glow Effect) ---
function highlightRegion(targetRegion) {
    // Loop through ALL meshes (Cerebellum, Stem, Hemispheres)
    brainMeshes.forEach(mesh => {
        const geometry = mesh.geometry;
        const colorAttribute = geometry.attributes.color;
        const positionAttribute = geometry.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < positionAttribute.count; i++) {
            // 1. Get vertex position
            vertex.fromBufferAttribute(positionAttribute, i);
            vertex.applyMatrix4(mesh.matrixWorld); // Use THIS mesh's world matrix

            // 2. Check region
            const region = getRegionFromPosition(vertex);

            if (region === targetRegion) {
                // SELECTED: 1.5 brightness (Slight Glow)
                colorAttribute.setXYZ(i, 1.5, 1.5, 1.5); 
            } else {
                // UNSELECTED: 1.0 brightness (Original Color - No Shadow)
                colorAttribute.setXYZ(i, 1.0, 1.0, 1.0); 
            }
        }
        colorAttribute.needsUpdate = true;
    });
}

function handleClick(mesh, point) {
    // 1. Identify the region
    let regionKey = mesh.name.toLowerCase();
    
    // Use math logic for most parts
    if (!regionKey.includes('cerebellum') && !regionKey.includes('stem')) {
        regionKey = getRegionFromPosition(point);
    } else {
        if(regionKey.includes('cerebellum')) regionKey = "Cerebellum";
        if(regionKey.includes('stem')) regionKey = "Brain Stem";
    }

    // 2. Update Info & Trigger Highlight
    if (regionKey && regionData[regionKey]) {
        infoName.innerText = regionKey;
        infoDescription.innerText = regionData[regionKey].description;
        highlightRegion(regionKey);
    } else {
        highlightRegion(null); // Clear highlights if clicking background
    }
}

// --- LOADER ---
const loader = new GLTFLoader();
loader.load('brain_project.glb', (gltf) => {
    brainModel = gltf.scene;
    scene.add(brainModel);

    // Setup Dimensions
    brainBox.setFromObject(brainModel);
    brainBox.getCenter(brainCenter);
    brainBox.getSize(brainSize);
    brainModel.position.sub(brainCenter);
    brainBox.setFromObject(brainModel); 
    brainBox.getCenter(brainCenter);
    brainBox.getSize(brainSize);

    // --- PREPARE ALL MESHES ---
    brainModel.traverse((child) => {
        if (child.isMesh) {
            brainMeshes.push(child); // Add to our list

            // Enable vertex colors
            child.material = child.material.clone(); // Clone to avoid conflicts
            child.material.vertexColors = true; 
            
            // Create white color buffer (Default = No Highlight)
            if (!child.geometry.attributes.color) {
                const count = child.geometry.attributes.position.count;
                const colors = new Float32Array(count * 3);
                for(let i=0; i<count*3; i++) colors[i] = 1.0; 
                child.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }
        }
    });

}, undefined, (e) => console.error(e));

// --- EVENTS ---
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 0, 4);

window.addEventListener('click', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    
    if (brainModel) {
        // Intersect recursive=true to catch everything
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