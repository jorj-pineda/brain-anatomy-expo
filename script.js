import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Lighting
const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);
const topLight = new THREE.DirectionalLight(0xffffff, 2);
topLight.position.set(5, 5, 5);
scene.add(topLight);

// 3. Load YOUR Brain Model
const loader = new GLTFLoader();
loader.load('brain_project.glb', (gltf) => {
    const brain = gltf.scene;
    scene.add(brain);
    brain.position.y = 0;
    console.log("Brain loaded successfully!");
}, undefined, (error) => {
    console.error("Error loading model:", error);
});

camera.position.z = 5;
const controls = new OrbitControls(camera, renderer.domElement);

// 4. Animation Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});