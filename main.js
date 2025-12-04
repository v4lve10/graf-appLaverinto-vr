import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Variables globales
let scene, camera, renderer, controls;
let keys = [];
let keysCollected = 0;
const totalKeys = 3;
let gameStarted = false;

// Variables para movimiento con teclado
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const moveSpeed = 0.1;

// Variables para VR
let isInVR = false;

// Elementos DOM
let startScreen, gameContainer, startButton;
let keyCounter, victoryPanel, restartButton, backToMenuButton, exitVRButton;

// ==================== INICIALIZACIÓN ====================
function init() {
    console.log('🚀 Inicializando juego...');
    
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
    
    // Inicializar contador
    updateKeyCounter();
    
    // Ocultar elementos del juego al inicio
    victoryPanel.style.display = 'none';
    
    console.log('✅ Interfaz inicializada');
}

function startGame() {
    console.log('🎮 Iniciando juego...');
    
    // Animación de salida de pantalla de inicio
    startScreen.style.opacity = '0';
    startScreen.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        
        // Inicializar Three.js
        initThreeJS();
        
        // Inicializar controles
        initMovementControls();
        
        // Inicializar juego
        initGame();
    }, 500);
}

function initThreeJS() {
    console.log('🖥️ Inicializando Three.js...');
    
    try {
        // 1. Escena
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0a0a12, 10, 50);

        // 2. Cámara
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 5);

        // 3. Renderer
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.xr.enabled = true;
        
        // Insertar canvas
        gameContainer.appendChild(renderer.domElement);

        // 4. Controles para modo escritorio
        controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.6, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.update();

        // 5. Botón VR
        const vrButton = VRButton.createButton(renderer);
        vrButton.classList.add('custom-vr-button');
        document.body.appendChild(vrButton);

        // 6. Eventos
        window.addEventListener('resize', onWindowResize);
        
        // 7. Detectar inicio/fin de VR
        renderer.xr.addEventListener('sessionstart', () => {
            console.log('🚀 Sesión VR iniciada');
            isInVR = true;
        });
        
        renderer.xr.addEventListener('sessionend', () => {
            console.log('👋 Sesión VR finalizada');
            isInVR = false;
        });
        
        // 8. Iniciar loop
        renderer.setAnimationLoop(animate);
        
        console.log('✅ Three.js inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error al inicializar Three.js:', error);
        alert('Error al cargar el juego. Por favor, revisa la consola para más detalles.');
    }
}

function initMovementControls() {
    console.log('🎮 Configurando controles de movimiento...');
    
    // Teclado
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                moveRight = true;
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                moveRight = false;
                break;
        }
    });
    
    // Click en la pantalla para recoger llaves (solo escritorio)
    renderer.domElement.addEventListener('click', (event) => {
        if (!isInVR) {
            onDocumentClick(event);
        }
    });
    
    console.log('✅ Controles configurados');
}

function updateMovement() {
    // Solo en modo escritorio
    if (!isInVR) {
        if (moveForward) {
            camera.position.x -= Math.sin(camera.rotation.y) * moveSpeed;
            camera.position.z -= Math.cos(camera.rotation.y) * moveSpeed;
        }
        if (moveBackward) {
            camera.position.x += Math.sin(camera.rotation.y) * moveSpeed;
            camera.position.z += Math.cos(camera.rotation.y) * moveSpeed;
        }
        if (moveLeft) {
            camera.position.x -= Math.cos(camera.rotation.y) * moveSpeed;
            camera.position.z += Math.sin(camera.rotation.y) * moveSpeed;
        }
        if (moveRight) {
            camera.position.x += Math.cos(camera.rotation.y) * moveSpeed;
            camera.position.z -= Math.sin(camera.rotation.y) * moveSpeed;
        }
    }
}

// ==================== JUEGO ====================
function initGame() {
    console.log('🎮 Inicializando juego...');
    
    // Crear ambiente básico primero
    createBasicEnvironment();
    
    // Crear laberinto
    createMaze();
    
    // Crear bolas amarillas
    createKeys();
    
    // Crear iluminación
    createLighting();
    
    gameStarted = true;
    console.log('✅ Juego inicializado');
}

function createBasicEnvironment() {
    // Piso
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x151525,
        roughness: 0.9,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Cielo
    const skyGeometry = new THREE.SphereGeometry(50, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0a0a12,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
}

function createMaze() {
    console.log('🧱 Creando laberinto...');
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
        roughness: 0.8,
        metalness: 0.3
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
                scene.add(wall);
            }
        }
    }
    
    console.log('✅ Laberinto creado');
}

function createKeys() {
    console.log('🌟 Creando bolas amarillas...');
    
    const keyPositions = [
        new THREE.Vector3(-2, 1.5, -2),
        new THREE.Vector3(3, 1.5, 0),
        new THREE.Vector3(0, 1.5, 3)
    ];

    for (let i = 0; i < totalKeys; i++) {
        const keyGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const keyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.3,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const key = new THREE.Mesh(keyGeometry, keyMaterial);
        key.position.copy(keyPositions[i]);
        key.userData.isKey = true;
        key.userData.collected = false;
        key.userData.id = i;
        
        scene.add(key);
        keys.push(key);
    }
    
    console.log('✅ Bolas amarillas creadas');
}

function createLighting() {
    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Luz direccional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Luces de acento
    const accentLight1 = new THREE.PointLight(0x00a8ff, 0.5, 10);
    accentLight1.position.set(5, 3, 5);
    scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0xff00ff, 0.5, 10);
    accentLight2.position.set(-5, 3, -5);
    scene.add(accentLight2);
}

function onDocumentClick(event) {
    if (isInVR) return;
    
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(keys.filter(k => !k.userData.collected));
    
    if (intersects.length > 0) {
        collectKey(intersects[0].object);
    }
}

function collectKey(key) {
    if (key.userData.collected) return;
    
    key.userData.collected = true;
    key.visible = false;
    keysCollected++;
    
    // Actualizar UI
    updateKeyCounter();
    
    // Verificar victoria
    if (keysCollected >= totalKeys) {
        setTimeout(() => {
            showVictory();
        }, 500);
    }
    
    console.log(`🌟 Bola recogida! Total: ${keysCollected}/${totalKeys}`);
}

function updateKeyCounter() {
    const counterValue = document.querySelector('.counter-value');
    if (counterValue) {
        counterValue.textContent = `${keysCollected}/${totalKeys}`;
    }
}

function showVictory() {
    console.log('🎉 ¡VICTORIA!');
    victoryPanel.style.display = 'flex';
}

// ==================== ANIMACIÓN ====================
function animate() {
    if (gameStarted) {
        // Rotar bolas amarillas
        keys.forEach(key => {
            if (key && !key.userData.collected) {
                key.rotation.y += 0.02;
                key.rotation.x += 0.01;
                key.position.y = 1.5 + Math.sin(Date.now() * 0.001 + key.userData.id) * 0.2;
            }
        });
        
        // Actualizar movimiento
        if (!isInVR) {
            controls.update();
            updateMovement();
        }
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
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
    
    resetPlayerPosition();
}

function backToMenu() {
    gameContainer.style.display = 'none';
    startScreen.style.display = 'flex';
    startScreen.style.opacity = '1';
    restartGame();
}

function exitVR() {
    if (renderer && renderer.xr && renderer.xr.isPresenting) {
        renderer.xr.getSession().end();
    }
}

function resetPlayerPosition() {
    if (camera) {
        camera.position.set(0, 1.6, 5);
        camera.rotation.set(0, 0, 0);
    }
    if (controls) {
        controls.target.set(0, 1.6, 0);
        controls.update();
    }
}

// ==================== INICIAR ====================
// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, inicializando...');
    init();
});