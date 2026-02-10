import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(light);
const topLight = new THREE.DirectionalLight(0xffffff, 1);
topLight.position.set(5, 10, 5);
scene.add(topLight);

// --- DATA FOR THE BRAIN ---
// Replace these IDs with the exact "Found ID" names from your console
const brainData = {
    "Brain_Part_02_Colour_Brain_Texture": {
        title: "Frontal Lobe",
        description: "Controls cognitive skills like emotional expression, problem solving, memory, and language."
    },
    "Brain_Part_04_Colour_Brain_Texture": {
        title: "Parietal Lobe",
        description: "Processes sensory information regarding the location of parts of the body as well as interpreting visual information."
    },
    "Brain_Part_05_Colour_Brain_Texture": {
        title: "Occipital Lobe",
        description: "The visual processing center of the mammalian brain containing most of the anatomical region of the visual cortex."
    },
    "Brain_Part_06_Colour_Brain_Texture": {
        title: "Temporal Lobe",
        description: "Involved in primary auditory perception, such as hearing, and holds the primary auditory cortex."
    },
    // Add your 5th part here once you find the ID in the console!
    "Brain_Part_01_Colour_Brain_Texture": {
        title: "Cerebellum",
        description: "Coordinates voluntary movements such as posture, balance, coordination, and speech."
    }
};

// --- LOAD MODEL ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let brainModel;

const loader = new GLTFLoader();
loader.load('brain_project.glb', (gltf) => {
    brainModel = gltf.scene;
    scene.add(brainModel);
    
    console.log("--- START OF BRAIN PART LIST ---");
    brainModel.traverse((child) => {
        if (child.isMesh) {
            console.log("Found ID:", child.name);
        }
    });
    console.log("--- END OF BRAIN PART LIST ---");
    
}, undefined, (error) => {
    console.error("Error loading model:", error);
});

camera.position.z = 3;
const controls = new OrbitControls(camera, renderer.domElement);

// --- SINGLE CLICK DETECTION ---
window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // Always check against brainModel with 'true' for accuracy
    if (brainModel) {
        const intersects = raycaster.intersectObject(brainModel, true);

        if (intersects.length > 0) {
            const clickedPart = intersects[0].object;
            const partName = clickedPart.name;
            console.log("You clicked:", partName);
            
            const data = brainData[partName];

            if (data) {
                document.getElementById('part-name').innerText = data.title;
                document.getElementById('part-description').innerText = data.description;
            } else {
                document.getElementById('part-name').innerText = "Region Selected";
                document.getElementById('part-description').innerText = "ID: " + partName + ". (Map this in brainData!)";
            }
            
            // Visual Feedback: Flash the part
            if (clickedPart.material.emissive) {
                clickedPart.material.emissive.setHex(0x444444); 
                setTimeout(() => clickedPart.material.emissive.setHex(0x000000), 300);
            }
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