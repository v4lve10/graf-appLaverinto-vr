import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// ==================== VARIABLES GLOBALES ====================
let scene, camera, renderer, controls;
let keys = [];
let keysCollected = 0;
const totalKeys = 3;
let audioListener, windSound, victorySound;
let gameStarted = false;

// Elementos DOM
let startScreen, gameContainer, startButton;
let keyCounter, victoryPanel, restartButton, backToMenuButton, exitVRButton;

// ==================== CONTROLES DE MOVIMIENTO ====================
// Variables para movimiento con teclado
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const moveSpeed = 0.1;

// Variables para controles móviles
let mobileForward = false;
let mobileBackward = false;
let mobileLeft = false;
let mobileRight = false;

// Variables para controles VR
let controller1, controller2;
let teleportRing;

// ==================== INICIALIZACIÓN ====================
async function init() {
    console.log('🚀 Inicializando juego VR...');
    
    // Configurar elementos DOM
    startScreen = document.getElementById('start-screen');
    gameContainer = document.getElementById('game-container');
    startButton = document.getElementById('start-button');
    keyCounter = document.getElementById('key-counter');
    victoryPanel = document.getElementById('victory-panel');
    restartButton = document.getElementById('restart-button');
    backToMenuButton = document.getElementById('back-to-menu');
    exitVRButton = document.getElementById('exit-vr-button');
    
    // Verificar elementos
    if (!startButton) {
        console.error('❌ Botón no encontrado');
        return;
    }
    
    console.log('✅ Elementos DOM cargados');
    
    // Configurar eventos
    setupEventListeners();
    
    // Crear partículas
    createParticles();
    
    console.log('✅ Juego inicializado - Listo para jugar');
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Botón de inicio
    startButton.addEventListener('click', startGame);
    
    // Botones del juego
    restartButton.addEventListener('click', restartGame);
    backToMenuButton.addEventListener('click', backToMenu);
    exitVRButton.addEventListener('click', exitVR);
    
    // Controles móviles
    setupMobileControls();
    
    // Actualizar contador inicial
    updateKeyCounter();
}

// ==================== INICIAR JUEGO ====================
function startGame() {
    console.log('🎮 Iniciando juego...');
    
    // Animación de transición
    startScreen.style.opacity = '0';
    startScreen.style.transition = 'opacity 0.8s ease';
    
    setTimeout(() => {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        
        // Inicializar Three.js
        initThreeJS();
        
        // Inicializar controles de movimiento
        initMovementControls();
        
        // Inicializar el juego
        initGame();
    }, 800);
}

// ==================== THREE.JS ====================
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
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        
        // Añadir canvas al contenedor
        gameContainer.appendChild(renderer.domElement);

        // 4. Controles (modo escritorio)
        controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.6, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.update();

        // 5. Botón VR
        const vrButton = VRButton.createButton(renderer);
        vrButton.classList.add('custom-vr-button');
        document.body.appendChild(vrButton);

        // 6. Configurar controles VR
        setupVRControllers();
        
        // 7. Configurar teleportación
        setupTeleportation();

        // 8. Eventos de ventana
        window.addEventListener('resize', onWindowResize);
        renderer.domElement.addEventListener('click', onDocumentClick);
        
        // 9. Iniciar loop de animación
        renderer.setAnimationLoop(animate);
        
        console.log('✅ Three.js inicializado');
        
    } catch (error) {
        console.error('❌ Error en Three.js:', error);
        showError('Error al cargar el motor 3D');
    }
}

// ==================== CONTROLES DE MOVIMIENTO ====================
function initMovementControls() {
    console.log('🎮 Configurando controles...');
    
    // Teclado
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // También configurar tecla ESC para menú
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            backToMenu();
        }
    });
}

function onKeyDown(event) {
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
        case 'Space':
            // Salto simple
            if (!renderer.xr.isPresenting && camera.position.y <= 1.6) {
                camera.position.y += 0.5;
            }
            break;
    }
}

function onKeyUp(event) {
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
}

// Controles móviles táctiles
function setupMobileControls() {
    const btnForward = document.getElementById('btn-forward');
    const btnBackward = document.getElementById('btn-backward');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    
    if (btnForward) {
        btnForward.addEventListener('touchstart', () => mobileForward = true);
        btnForward.addEventListener('touchend', () => mobileForward = false);
        btnForward.addEventListener('mousedown', () => mobileForward = true);
        btnForward.addEventListener('mouseup', () => mobileForward = false);
        btnForward.addEventListener('mouseleave', () => mobileForward = false);
    }
    
    if (btnBackward) {
        btnBackward.addEventListener('touchstart', () => mobileBackward = true);
        btnBackward.addEventListener('touchend', () => mobileBackward = false);
        btnBackward.addEventListener('mousedown', () => mobileBackward = true);
        btnBackward.addEventListener('mouseup', () => mobileBackward = false);
        btnBackward.addEventListener('mouseleave', () => mobileBackward = false);
    }
    
    if (btnLeft) {
        btnLeft.addEventListener('touchstart', () => mobileLeft = true);
        btnLeft.addEventListener('touchend', () => mobileLeft = false);
        btnLeft.addEventListener('mousedown', () => mobileLeft = true);
        btnLeft.addEventListener('mouseup', () => mobileLeft = false);
        btnLeft.addEventListener('mouseleave', () => mobileLeft = false);
    }
    
    if (btnRight) {
        btnRight.addEventListener('touchstart', () => mobileRight = true);
        btnRight.addEventListener('touchend', () => mobileRight = false);
        btnRight.addEventListener('mousedown', () => mobileRight = true);
        btnRight.addEventListener('mouseup', () => mobileRight = false);
        btnRight.addEventListener('mouseleave', () => mobileRight = false);
    }
}

// Actualizar movimiento en cada frame
function updateMovement() {
    // Solo mover en modo escritorio (no VR)
    if (!renderer.xr.isPresenting) {
        // Combinar controles teclado y móviles
        const forward = moveForward || mobileForward;
        const backward = moveBackward || mobileBackward;
        const left = moveLeft || mobileLeft;
        const right = moveRight || mobileRight;
        
        if (forward) {
            camera.position.x -= Math.sin(camera.rotation.y) * moveSpeed;
            camera.position.z -= Math.cos(camera.rotation.y) * moveSpeed;
        }
        if (backward) {
            camera.position.x += Math.sin(camera.rotation.y) * moveSpeed;
            camera.position.z += Math.cos(camera.rotation.y) * moveSpeed;
        }
        if (left) {
            camera.position.x -= Math.cos(camera.rotation.y) * moveSpeed;
            camera.position.z += Math.sin(camera.rotation.y) * moveSpeed;
        }
        if (right) {
            camera.position.x += Math.cos(camera.rotation.y) * moveSpeed;
            camera.position.z -= Math.sin(camera.rotation.y) * moveSpeed;
        }
        
        // Gravedad simple
        if (camera.position.y > 1.6) {
            camera.position.y -= 0.05;
        }
    }
}

// ==================== INICIALIZAR JUEGO ====================
async function initGame() {
    console.log('🎮 Inicializando elementos del juego...');
    
    try {
        await loadEnvironment();
        loadAudio();
        createMaze();
        createKeys();
        createLighting();
        gameStarted = true;
        
        console.log('✅ Juego listo');
        console.log('🎯 Encuentra las 3 llaves doradas');
        console.log('🕹️ Controles: WASD para moverte, click en las llaves');
        
    } catch (error) {
        console.error('❌ Error al inicializar el juego:', error);
    }
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
        
        // Actualizar controles y movimiento
        if (!renderer.xr.isPresenting) {
            controls.update();
            updateMovement();
        }
    }
    
    // Renderizar escena
    renderer.render(scene, camera);
}

// ==================== CONTROLES VR ====================
function setupVRControllers() {
    controller1 = renderer.xr.getController(0);
    controller2 = renderer.xr.getController(1);
    
    // Modelo simple para los controllers
    const controllerModel = (controller) => {
        const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.15);
        const material = new THREE.MeshBasicMaterial({ color: 0x00a8ff });
        const mesh = new THREE.Mesh(geometry, material);
        controller.add(mesh);
    };
    
    if (controller1) {
        controllerModel(controller1);
        scene.add(controller1);
        
        // Evento trigger para recoger llaves
        controller1.addEventListener('selectstart', onVRSelect);
    }
    
    if (controller2) {
        controllerModel(controller2);
        scene.add(controller2);
    }
}

function setupTeleportation() {
    // Anillo de teleportación
    const geometry = new THREE.RingGeometry(0.1, 0.2, 32);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5 
    });
    teleportRing = new THREE.Mesh(geometry, material);
    teleportRing.visible = false;
    teleportRing.rotation.x = -Math.PI / 2;
    scene.add(teleportRing);
}

function onVRSelect() {
    if (!controller1) return;
    
    // Raycaster desde el controller
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), controller1);
    
    // Buscar llaves
    const keyIntersects = raycaster.intersectObjects(keys.filter(k => !k.userData.collected));
    if (keyIntersects.length > 0) {
        collectKey(keyIntersects[0].object);
        return;
    }
    
    // Buscar piso para teleportación
    const floorIntersects = raycaster.intersectObjects(scene.children.filter(obj => 
        obj.name === 'floor' || (obj.geometry && obj.geometry.type === 'PlaneGeometry')
    ));
    
    if (floorIntersects.length > 0) {
        teleportRing.position.copy(floorIntersects[0].point);
        teleportRing.position.y += 0.01;
        teleportRing.visible = true;
        
        setTimeout(() => {
            if (teleportRing.visible) {
                camera.position.x = teleportRing.position.x;
                camera.position.z = teleportRing.position.z;
                teleportRing.visible = false;
            }
        }, 300);
    }
}

// ==================== RECURSOS ====================
async function loadEnvironment() {
    const rgbeLoader = new RGBELoader();
    try {
        const texture = await rgbeLoader.loadAsync('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/kloofendal_48d_partly_cloudy_puresky_4k.hdr');
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
        console.log('✅ HDRI cargado');
    } catch (error) {
        console.warn('⚠️ Usando color sólido');
        scene.background = new THREE.Color(0x0a0a12);
    }
}

function loadAudio() {
    audioListener = new THREE.AudioListener();
    camera.add(audioListener);

    const audioLoader = new THREE.AudioLoader();
    
    // Sonido ambiental
    audioLoader.load('https://assets.mixkit.co/sfx/preview/mixkit-cold-wind-1151.mp3', (buffer) => {
        windSound = new THREE.Audio(audioListener);
        windSound.setBuffer(buffer);
        windSound.setLoop(true);
        windSound.setVolume(0.2);
        windSound.play();
    });
    
    // Sonido de victoria
    audioLoader.load('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3', (buffer) => {
        victorySound = new THREE.Audio(audioListener);
        victorySound.setBuffer(buffer);
        victorySound.setVolume(0.7);
    });
}

// ==================== LABERINTO ====================
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
                wall.name = 'wall';
                scene.add(wall);
            }
        }
    }

    // Piso
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

// ==================== LLAVES ====================
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
        
        // Luz para la llave
        const keyLight = new THREE.PointLight(0xFFD700, 0.5, 3);
        keyLight.position.copy(key.position);
        scene.add(keyLight);
        
        scene.add(key);
        keys.push(key);
    }
}

// ==================== ILUMINACIÓN ====================
function createLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
}

// ==================== INTERACCIÓN ====================
function onDocumentClick(event) {
    if (renderer.xr.isPresenting) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(keys.filter(k => !k.userData.collected));
    
    if (intersects.length > 0) {
        collectKey(intersects[0].object);
    }
}

function collectKey(key) {
    key.userData.collected = true;
    key.visible = false;
    keysCollected++;
    
    // Partículas de efecto
    createKeyParticles(key.position);
    
    // Actualizar UI
    updateKeyCounter();
    
    // Verificar victoria
    if (keysCollected >= totalKeys) {
        setTimeout(showVictory, 1000);
    }
}

function createKeyParticles(position) {
    for (let i = 0; i < 10; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        particle.userData.life = 1.0;
        
        scene.add(particle);
        
        function animateParticle() {
            if (particle.userData.life > 0) {
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.y -= 0.005;
                particle.userData.life -= 0.02;
                particle.material.opacity = particle.userData.life;
                requestAnimationFrame(animateParticle);
            } else {
                scene.remove(particle);
            }
        }
        
        animateParticle();
    }
}

function updateKeyCounter() {
    const counterValue = document.querySelector('.counter-value');
    if (counterValue) {
        counterValue.textContent = `${keysCollected}/${totalKeys}`;
    }
}

// ==================== VICTORIA ====================
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

function showError(message) {
    gameContainer.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white; background: rgba(0,0,0,0.8); padding: 30px; border-radius: 10px;">
            <h2 style="color: #ff4444;">❌ ERROR</h2>
            <p>${message}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #00a8ff; border: none; color: white; border-radius: 5px; cursor: pointer;">
                Recargar
            </button>
        </div>
    `;
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