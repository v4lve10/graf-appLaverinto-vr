import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// Variables globales
let scene, camera, renderer, controls;
let keys = [];
let keysCollected = 0;
const totalKeys = 3;
let audioListener, windSound, victorySound;
let gameStarted = false;

// Variables para controles VR
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let controllerModelFactory;
let isInVR = false;

// Elementos DOM
let startScreen, gameContainer, startButton;
let keyCounter, victoryPanel, restartButton, backToMenuButton, exitVRButton;

// ==================== INICIALIZACIÓN ====================
async function init() {
    console.log('🎮 Configurando controles Meta Quest...');
    
    // Configurar elementos DOM
    startScreen = document.getElementById('start-screen');
    gameContainer = document.getElementById('game-container');
    startButton = document.getElementById('start-button');
    keyCounter = document.getElementById('key-counter');
    victoryPanel = document.getElementById('victory-panel');
    restartButton = document.getElementById('restart-button');
    backToMenuButton = document.getElementById('back-to-menu');
    exitVRButton = document.getElementById('exit-vr-button');
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
    backToMenuButton.addEventListener('click', backToMenu);
    exitVRButton.addEventListener('click', exitVR);
    
    updateKeyCounter();
    createParticles();
}

function startGame() {
    startScreen.style.opacity = '0';
    startScreen.style.transition = 'opacity 0.8s ease';
    
    setTimeout(() => {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        
        initThreeJS();
        initGame();
    }, 800);
}

function initThreeJS() {
    // Escena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a12, 10, 50);

    // Cámara (altura de persona: 1.6m)
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 3);

    // Renderer con WebXR habilitado
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true; // <-- IMPORTANTE para VR
    renderer.xr.setReferenceSpaceType('local-floor'); // <-- Para Meta Quest
    
    gameContainer.appendChild(renderer.domElement);

    // Controles para modo escritorio
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.enableDamping = true;

    // Botón VR de Three.js
    const vrButton = VRButton.createButton(renderer);
    vrButton.style.position = 'absolute';
    vrButton.style.bottom = '20px';
    vrButton.style.right = '20px';
    vrButton.style.zIndex = '1000';
    document.body.appendChild(vrButton);

    // Configurar controles VR
    setupVRControllers();

    // Eventos
    window.addEventListener('resize', onWindowResize);
    
    // Iniciar animación
    renderer.setAnimationLoop(animate);
}

// ==================== CONFIGURACIÓN DE CONTROLES META QUEST ====================
function setupVRControllers() {
    console.log('🎮 Configurando controles Meta Quest...');
    
    // Crear modelo de controladores
    controllerModelFactory = new XRControllerModelFactory();
    
    // Controlador 1 (mano izquierda/ derecha)
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    controller1.addEventListener('squeezestart', onSqueezeStart);
    controller1.addEventListener('squeezeend', onSqueezeEnd);
    scene.add(controller1);
    
    // Grip para el controlador 1 (modelo 3D real)
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);
    
    // Controlador 2
    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    scene.add(controller2);
    
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
    
    // Rayo desde controladores (para apuntar)
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);
    
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 }));
    line.name = 'line';
    line.scale.z = 5;
    
    controller1.add(line.clone());
    controller2.add(line.clone());
    
    console.log('✅ Controles VR configurados para Meta Quest');
}

// ==================== EVENTOS DE CONTROLES VR ====================
function onSelectStart(event) {
    const controller = event.target;
    console.log('🎮 Trigger presionado en controlador VR');
    
    // Lanzar rayo para detectar objetos
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(controller.quaternion);
    
    raycaster.set(controller.position, direction);
    
    // Buscar llaves
    const keyIntersects = raycaster.intersectObjects(keys.filter(k => !k.userData.collected));
    if (keyIntersects.length > 0) {
        collectKey(keyIntersects[0].object);
        return;
    }
    
    // Buscar paredes u otros objetos
    const wallIntersects = raycaster.intersectObjects(scene.children.filter(obj => obj.name === 'wall'));
    if (wallIntersects.length > 0) {
        console.log('🧱 Apuntando a pared');
        // Podrías añadir interacción con paredes aquí
    }
    
    // Efecto visual al presionar trigger
    const line = controller.getObjectByName('line');
    if (line) {
        line.material.color.setHex(0xff0000);
        line.scale.z = 3;
    }
}

function onSelectEnd(event) {
    const controller = event.target;
    
    // Restaurar línea
    const line = controller.getObjectByName('line');
    if (line) {
        line.material.color.setHex(0x00ff00);
        line.scale.z = 5;
    }
}

function onSqueezeStart(event) {
    console.log('🎮 Grip presionado - Movimiento en VR');
    // El grip se usa para moverte en algunas apps de VR
}

function onSqueezeEnd(event) {
    console.log('🎮 Grip liberado');
}

// ==================== MOVIMIENTO EN VR ====================
function updateVRMovement() {
    if (!isInVR || !renderer.xr.isPresenting) return;
    
    // Obtener información de los joysticks
    const session = renderer.xr.getSession();
    if (!session) return;
    
    // Para Meta Quest, el movimiento se maneja con el joystick
    // Esta función se llamaría en cada frame para actualizar posición
}

// ==================== JUEGO ====================
async function initGame() {
    await loadEnvironment();
    loadAudio();
    createMaze();
    createKeys();
    createLighting();
    gameStarted = true;
    
    console.log('✅ Juego listo para Meta Quest');
    console.log('🎯 Usa el trigger para recoger llaves');
    console.log('🎮 Los controladores deben ser visibles');
}

async function loadEnvironment() {
    const rgbeLoader = new RGBELoader();
    try {
        const texture = await rgbeLoader.loadAsync('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/kloofendal_48d_partly_cloudy_puresky_4k.hdr');
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
    } catch (error) {
        scene.background = new THREE.Color(0x0a0a12);
    }
}

function loadAudio() {
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    
    const audioLoader = new THREE.AudioLoader();
    
    audioLoader.load('https://assets.mixkit.co/sfx/preview/mixkit-cold-wind-1151.mp3', (buffer) => {
        windSound = new THREE.Audio(audioListener);
        windSound.setBuffer(buffer);
        windSound.setLoop(true);
        windSound.setVolume(0.2);
        windSound.play();
    });
    
    audioLoader.load('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3', (buffer) => {
        victorySound = new THREE.Audio(audioListener);
        victorySound.setBuffer(buffer);
        victorySound.setVolume(0.7);
    });
}

function createMaze() {
    const mazeMap = [
        [1,1,1,1,1,1],
        [1,0,0,0,0,1],
        [1,0,1,1,0,1],
        [1,0,0,1,0,1],
        [1,1,0,0,0,1],
        [1,1,1,1,1,1]
    ];

    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a3a,
        roughness: 0.8
    });

    for (let z = 0; z < mazeMap.length; z++) {
        for (let x = 0; x < mazeMap[0].length; x++) {
            if (mazeMap[z][x] === 1) {
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(2, 2, 2),
                    wallMaterial
                );
                wall.position.set(x * 2 - 5, 1, z * 2 - 5);
                wall.castShadow = true;
                wall.receiveShadow = true;
                wall.name = 'wall';
                scene.add(wall);
            }
        }
    }

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshStandardMaterial({ 
            color: 0x151525,
            roughness: 0.9
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    scene.add(floor);
}

function createKeys() {
    const keyPositions = [
        new THREE.Vector3(-2, 1.5, -2),
        new THREE.Vector3(3, 1.5, 0),
        new THREE.Vector3(0, 1.5, 3)
    ];

    for (let i = 0; i < totalKeys; i++) {
        const keyGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const keyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const key = new THREE.Mesh(keyGeometry, keyMaterial);
        key.position.copy(keyPositions[i]);
        key.userData.isKey = true;
        key.userData.collected = false;
        
        const keyLight = new THREE.PointLight(0xFFD700, 0.5, 3);
        keyLight.position.copy(key.position);
        scene.add(keyLight);
        
        scene.add(key);
        keys.push(key);
    }
}

function createLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
}

// ==================== ANIMACIÓN ====================
function animate() {
    if (gameStarted) {
        // Rotar llaves
        keys.forEach(key => {
            if (key && !key.userData.collected) {
                key.rotation.y += 0.02;
            }
        });
        
        // Actualizar controles si no estamos en VR
        if (!renderer.xr.isPresenting) {
            controls.update();
        }
        
        // Actualizar movimiento VR si estamos en VR
        if (renderer.xr.isPresenting) {
            updateVRMovement();
        }
    }
    
    renderer.render(scene, camera);
}

// ==================== INTERACCIÓN ====================
function collectKey(key) {
    key.userData.collected = true;
    key.visible = false;
    keysCollected++;
    
    updateKeyCounter();
    
    if (keysCollected >= totalKeys) {
        setTimeout(showVictory, 1000);
    }
    
    console.log(`🗝️ Llave recogida en VR! Total: ${keysCollected}/${totalKeys}`);
}

function updateKeyCounter() {
    const counterValue = document.querySelector('.counter-value');
    if (counterValue) {
        counterValue.textContent = `${keysCollected}/${totalKeys}`;
    }
}

function showVictory() {
    if (victorySound) victorySound.play();
    victoryPanel.style.display = 'flex';
    
    // Confeti
    createConfetti();
}

function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const geometry = new THREE.PlaneGeometry(0.1, 0.1);
        const material = new THREE.MeshBasicMaterial({
            color: Math.random() * 0xffffff,
            side: THREE.DoubleSide
        });
        const confetti = new THREE.Mesh(geometry, material);
        
        confetti.position.set(
            (Math.random() - 0.5) * 10,
            Math.random() * 5 + 5,
            (Math.random() - 0.5) * 10
        );
        
        confetti.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        scene.add(confetti);
        
        const speed = 0.02 + Math.random() * 0.03;
        const rotationSpeed = (Math.random() - 0.5) * 0.1;
        
        function animateConfetti() {
            confetti.position.y -= speed;
            confetti.rotation.x += rotationSpeed;
            confetti.rotation.z += rotationSpeed;
            
            if (confetti.position.y > -5) {
                requestAnimationFrame(animateConfetti);
            } else {
                scene.remove(confetti);
            }
        }
        
        animateConfetti();
    }
}

// ==================== UTILIDADES ====================
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function createParticles() {
    const container = document.querySelector('.particles-container');
    if (!container) return;
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: rgba(0, 168, 255, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 10 + 5}s infinite linear;
        `;
        container.appendChild(particle);
    }
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ==================== FUNCIONES UI ====================
function restartGame() {
    victoryPanel.style.display = 'none';
    keysCollected = 0;
    updateKeyCounter();
    
    keys.forEach(key => {
        key.userData.collected = false;
        key.visible = true;
    });
    
    camera.position.set(0, 1.6, 5);
    camera.rotation.set(0, 0, 0);
}

function backToMenu() {
    gameContainer.style.display = 'none';
    startScreen.style.display = 'flex';
    startScreen.style.opacity = '1';
    
    if (windSound) windSound.stop();
    restartGame();
    exitVR();
}

function exitVR() {
    if (renderer && renderer.xr && renderer.xr.isPresenting) {
        renderer.xr.getSession().end();
    }
}

// ==================== INICIAR ====================
window.addEventListener('DOMContentLoaded', init);

// Funciones de debug para probar desde consola
window.debugVR = {
    showControllers: () => {
        console.log('Controladores:', { controller1, controller2 });
    },
    testTrigger: () => {
        console.log('Simulando trigger...');
        if (controller1) {
            const event = { target: controller1 };
            onSelectStart(event);
            setTimeout(() => onSelectEnd(event), 500);
        }
    },
    resetPosition: () => {
        camera.position.set(0, 1.6, 5);
        console.log('Posición reiniciada');
    }
};