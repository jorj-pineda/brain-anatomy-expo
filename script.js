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
// Match these keys to the "child.name" of your 3D parts!
const brainData = {
    "Cerebrum": "The largest part of the brain, responsible for higher functions like interpreting touch, vision, and hearing, as well as speech, reasoning, and emotions.",
    "Cerebellum": "Located under the cerebrum. Its function is to coordinate muscle movements, maintain posture, and balance.",
    "Brainstem": "Acts as a relay center connecting the cerebrum and cerebellum to the spinal cord. It performs many automatic functions such as breathing and heart rate.",
};

// --- LOAD MODEL ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let brainModel;

const loader = new GLTFLoader();
loader.load('brain_project.glb', (gltf) => {
    brainModel = gltf.scene;
    scene.add(brainModel);
    console.log("Model Loaded. Ready to click.");
});

camera.position.z = 3;
const controls = new OrbitControls(camera, renderer.domElement);

// --- CLICK DETECTION ---
window.addEventListener('click', (event) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const clickedPart = intersects[0].object;
        const partName = clickedPart.name;
        
        // Update the UI
        document.getElementById('part-name').innerText = partName;
        document.getElementById('part-description').innerText = brainData[partName] || "No data available for this section.";
        
        // Visual Feedback: Highlight the part
        clickedPart.material.emissive.setHex(0x333333); 
        setTimeout(() => clickedPart.material.emissive.setHex(0x000000), 500);
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