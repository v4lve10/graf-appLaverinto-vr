import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// Variables globales
let scene, camera, renderer, controls;
let keys = [];
let keysCollected = 0;
const totalKeys = 8; // 8 llaves como solicitaste
let audioListener, windSound, victorySound;
let gameStarted = false;

// Variables para movimiento con teclado
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const moveSpeed = 0.1;

// Variables para VR
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let controllerModelFactory;
let isInVR = false;

// Variables para movimiento VR
const vrMoveSpeed = 0.08; // Aumentado para laberinto grande

// Elementos DOM
let startScreen, gameContainer, startButton;
let keyCounter, victoryPanel, restartButton, backToMenuButton, exitVRButton;

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
    
    // Actualizar texto para 8 llaves
    const counterValue = document.querySelector('.counter-value');
    if (counterValue) counterValue.textContent = `0/${totalKeys}`;
    
    // Actualizar especificaciones
    const specValue = document.querySelector('.spec-value:last-child');
    if (specValue) specValue.textContent = `${totalKeys} Llaves Digitales`;
    
    const dimensionSpec = document.querySelector('.spec-value:nth-child(2)');
    if (dimensionSpec) dimensionSpec.textContent = '15x15 Laberinto Gigante';
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
    backToMenuButton.addEventListener('click', backToMenu);
    exitVRButton.addEventListener('click', exitVR);
    
    // Crear partículas para el fondo
    createParticles();
    
    console.log('✅ Interfaz inicializada para Meta Quest 3');
}

function startGame() {
    console.log('🎮 Iniciando juego...');
    
    // Animación de salida
    startScreen.style.opacity = '0';
    startScreen.style.transition = 'opacity 0.8s ease';
    
    setTimeout(() => {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        
        // Inicializar Three.js
        initThreeJS();
        
        // Inicializar controles
        initMovementControls();
        
        // Inicializar juego
        initGame();
    }, 800);
}

function initThreeJS() {
    console.log('🖥️ Inicializando Three.js...');
    
    // 1. Escena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a12, 10, 100);

    // 2. Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    // 3. Renderer optimizado para Quest 3
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limitar para mejor performance en Quest
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

    // 5. Botón VR personalizado
    const vrButton = VRButton.createButton(renderer);
    vrButton.innerHTML = '🎮 ACTIVAR VR - META QUEST 3';
    vrButton.classList.add('custom-vr-button');
    vrButton.style.cssText = `
        background: linear-gradient(90deg, #00a8ff, #00fff7) !important;
        font-family: 'Orbitron', sans-serif !important;
        font-weight: 600 !important;
        letter-spacing: 1px !important;
    `;
    document.body.appendChild(vrButton);

    // 6. Configurar controles VR específicos para Quest 3
    setupVRControllers();

    // 7. Eventos
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onDocumentClick);
    
    // 8. Detectar inicio/fin de VR
    renderer.xr.addEventListener('sessionstart', () => {
        console.log('🚀 Sesión VR META QUEST 3 iniciada');
        isInVR = true;
        showVRControlsInfo();
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        console.log('👋 Sesión VR finalizada');
        isInVR = false;
        hideVRControlsInfo();
    });
    
    // 9. Iniciar loop
    renderer.setAnimationLoop(animate);
    
    console.log('✅ Three.js inicializado para Meta Quest 3');
}

// ==================== MAPEO ESPECÍFICO META QUEST 3 ====================
function setupVRControllers() {
    console.log('🎮 Configurando controles META QUEST 3...');
    
    controllerModelFactory = new XRControllerModelFactory();
    
    // Controlador izquierdo
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onVRSelectStart);
    controller1.addEventListener('selectend', onVRSelectEnd);
    controller1.addEventListener('squeezestart', onVRSqueezeStart);
    controller1.addEventListener('squeezeend', onVRSqueezeEnd);
    scene.add(controller1);
    
    // Modelo del controlador izquierdo
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);
    
    // Controlador derecho
    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onVRSelectStart);
    controller2.addEventListener('selectend', onVRSelectEnd);
    scene.add(controller2);
    
    // Modelo del controlador derecho
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
    
    // Rayo para apuntar (solo controlador derecho para interacción)
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);
    
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
        color: 0x00ff00, 
        linewidth: 3,
        transparent: true,
        opacity: 0.7
    }));
    line.name = 'pointer';
    line.scale.z = 4; // Rayo más largo
    
    // Solo en controlador derecho para interacción
    controller2.add(line.clone());
    
    // En controlador izquierdo solo para referencia (más tenue)
    const leftLine = line.clone();
    leftLine.material.opacity = 0.3;
    controller1.add(leftLine);
    
    console.log('✅ Controles META QUEST 3 configurados');
    console.log('🎮 Mapeo Meta Quest 3:');
    console.log('   • Joystick Izquierdo: Movimiento');
    console.log('   • Trigger (Gatillo): Recoger llaves');
    console.log('   • Botón A/X: Movimiento adelante');
    console.log('   • Botón B/Y: Movimiento atrás');
    console.log('   • Grip: Teleport/Modo especial');
}

// ==================== MOVIMIENTO VR META QUEST 3 ====================
function updateVRMovement() {
    if (!isInVR || !renderer.xr.isPresenting) return;
    
    const session = renderer.xr.getSession();
    if (!session || !session.inputSources) return;
    
    // Revisar ambos controladores
    for (let i = 0; i < Math.min(2, session.inputSources.length); i++) {
        const inputSource = session.inputSources[i];
        if (inputSource && inputSource.gamepad) {
            const gamepad = inputSource.gamepad;
            
            // 🔧 MAPEO META QUEST 3:
            // Ejes 0-1: Joystick derecho (rotación/mira)
            // Ejes 2-3: Joystick izquierdo (MOVIMIENTO) <- ESTE ES EL IMPORTANTE
            // Botón 0: A/X (izquierdo), Botón 1: B/Y (izquierdo)
            // Botón 2: Grip (izquierdo), Botón 3: Menu/System
            // Botón 4: A/X (derecho), Botón 5: B/Y (derecho)
            // Botón 6: Grip (derecho)
            
            if (gamepad.axes && gamepad.axes.length >= 4) {
                // 🎮 JOYSTICK IZQUIERDO PARA MOVIMIENTO (ejes 2 y 3)
                let joystickX = 0;
                let joystickY = 0;
                
                // Intentar diferentes configuraciones
                if (gamepad.axes.length >= 4) {
                    // Meta Quest 3 usa ejes 2 y 3 para joystick izquierdo
                    joystickX = gamepad.axes[2] || 0;
                    joystickY = gamepad.axes[3] || 0;
                    
                    // Si no hay movimiento en 2-3, probar con 0-1
                    if (Math.abs(joystickX) < 0.1 && Math.abs(joystickY) < 0.1) {
                        joystickX = gamepad.axes[0] || 0;
                        joystickY = gamepad.axes[1] || 0;
                    }
                }
                
                // Zona muerta
                const deadZone = 0.15;
                
                if (Math.abs(joystickX) > deadZone || Math.abs(joystickY) > deadZone) {
                    // DEBUG: Solo mostrar si hay movimiento significativo
                    if (Math.abs(joystickX) > deadZone * 2 || Math.abs(joystickY) > deadZone * 2) {
                        console.log(`🎮 Controlador ${i} (${inputSource.handedness}):`);
                        console.log(`   Ejes: [0]=${gamepad.axes[0]?.toFixed(2)}, [1]=${gamepad.axes[1]?.toFixed(2)}, [2]=${gamepad.axes[2]?.toFixed(2)}, [3]=${gamepad.axes[3]?.toFixed(2)}`);
                        console.log(`   Usando: X=${joystickX.toFixed(2)}, Y=${joystickY.toFixed(2)}`);
                    }
                    
                    // MOVIMIENTO BASADO EN LA DIRECCIÓN DE LA CABEZA
                    if (Math.abs(joystickY) > deadZone) {
                        const forward = new THREE.Vector3(0, 0, -1);
                        forward.applyQuaternion(camera.quaternion);
                        forward.y = 0;
                        forward.normalize();
                        
                        camera.position.add(forward.multiplyScalar(-joystickY * vrMoveSpeed * 1.5));
                    }
                    
                    if (Math.abs(joystickX) > deadZone) {
                        const right = new THREE.Vector3(1, 0, 0);
                        right.applyQuaternion(camera.quaternion);
                        right.y = 0;
                        right.normalize();
                        
                        camera.position.add(right.multiplyScalar(joystickX * vrMoveSpeed * 1.5));
                    }
                }
            }
            
            // 🎮 MOVIMIENTO CON BOTONES (alternativo)
            if (gamepad.buttons && gamepad.buttons.length >= 7) {
                // Detectar qué controlador es
                const isLeftController = inputSource.handedness === 'left';
                
                // Botones específicos por controlador
                if (isLeftController) {
                    // Controlador izquierdo: Botón A/X (índice 0) para adelante
                    if (gamepad.buttons[0] && gamepad.buttons[0].pressed) {
                        console.log('🎮 Botón A/X (izquierdo) - Moviendo adelante');
                        const forward = new THREE.Vector3(0, 0, -1);
                        forward.applyQuaternion(camera.quaternion);
                        forward.y = 0;
                        forward.normalize();
                        camera.position.add(forward.multiplyScalar(vrMoveSpeed));
                    }
                    
                    // Controlador izquierdo: Botón B/Y (índice 1) para atrás
                    if (gamepad.buttons[1] && gamepad.buttons[1].pressed) {
                        console.log('🎮 Botón B/Y (izquierdo) - Moviendo atrás');
                        const backward = new THREE.Vector3(0, 0, 1);
                        backward.applyQuaternion(camera.quaternion);
                        backward.y = 0;
                        backward.normalize();
                        camera.position.add(backward.multiplyScalar(vrMoveSpeed));
                    }
                } else {
                    // Controlador derecho: Botón A/X (índice 4) para adelante
                    if (gamepad.buttons[4] && gamepad.buttons[4].pressed) {
                        console.log('🎮 Botón A/X (derecho) - Moviendo adelante');
                        const forward = new THREE.Vector3(0, 0, -1);
                        forward.applyQuaternion(camera.quaternion);
                        forward.y = 0;
                        forward.normalize();
                        camera.position.add(forward.multiplyScalar(vrMoveSpeed));
                    }
                    
                    // Controlador derecho: Botón B/Y (índice 5) para atrás
                    if (gamepad.buttons[5] && gamepad.buttons[5].pressed) {
                        console.log('🎮 Botón B/Y (derecho) - Moviendo atrás');
                        const backward = new THREE.Vector3(0, 0, 1);
                        backward.applyQuaternion(camera.quaternion);
                        backward.y = 0;
                        backward.normalize();
                        camera.position.add(backward.multiplyScalar(vrMoveSpeed));
                    }
                }
            }
        }
    }
}

// ==================== EVENTOS VR META QUEST 3 ====================
function onVRSelectStart(event) {
    const controller = event.target;
    console.log('🎮 Trigger presionado en VR');
    
    // Raycaster para detectar objetos
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(controller.quaternion);
    
    raycaster.set(controller.position, direction);
    
    // Buscar BOLAS AMARILLAS (llaves)
    const keyIntersects = raycaster.intersectObjects(keys.filter(k => !k.userData.collected));
    if (keyIntersects.length > 0) {
        collectKey(keyIntersects[0].object);
        
        // Efecto visual y háptico
        const pointer = controller.getObjectByName('pointer');
        if (pointer) {
            pointer.material.color.setHex(0xffaa00);
            setTimeout(() => {
                if (pointer) pointer.material.color.setHex(0x00ff00);
            }, 200);
        }
        
        // Vibrar controlador (si está disponible)
        if (controller.inputSource && controller.inputSource.gamepad && 
            controller.inputSource.gamepad.hapticActuators && 
            controller.inputSource.gamepad.hapticActuators[0]) {
            controller.inputSource.gamepad.hapticActuators[0].pulse(0.5, 100);
        }
        
        return;
    }
    
    // Cambiar color del rayo si no hay nada
    const pointer = controller.getObjectByName('pointer');
    if (pointer) {
        pointer.material.color.setHex(0xff0000);
        setTimeout(() => {
            if (pointer) pointer.material.color.setHex(0x00ff00);
        }, 100);
    }
}

function onVRSelectEnd(event) {
    const controller = event.target;
    const pointer = controller.getObjectByName('pointer');
    if (pointer) {
        pointer.material.color.setHex(0x00ff00);
    }
}

function onVRSqueezeStart(event) {
    console.log('🎮 Grip presionado - Modo especial activado');
    // Podríamos activar modo de teleporte o algo especial
}

function onVRSqueezeEnd(event) {
    console.log('🎮 Grip liberado');
}

// ==================== JUEGO ====================
async function initGame() {
    console.log('🎮 Inicializando juego...');
    await loadEnvironment();
    loadAudio();
    createMaze();
    createKeys();
    createLighting();
    gameStarted = true;
    console.log('✅ Juego inicializado');
}

async function loadEnvironment() {
    const rgbeLoader = new RGBELoader();
    try {
        const texture = await rgbeLoader.loadAsync('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/kloofendal_48d_partly_cloudy_puresky_4k.hdr');
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
        console.log('✅ HDRI cargado');
    } catch (error) {
        console.warn('⚠️ Usando color sólido para mejor performance en Quest');
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
        console.log('✅ Sonido ambiental cargado');
    });
    
    // Sonido de victoria
    audioLoader.load('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3', (buffer) => {
        victorySound = new THREE.Audio(audioListener);
        victorySound.setBuffer(buffer);
        victorySound.setVolume(0.7);
        console.log('✅ Sonido de victoria cargado');
    });
}

// ==================== LABERINTO GRANDE (15x15) ====================
function createMaze() {
    console.log('🧱 Creando laberinto GRANDE 15x15 para Meta Quest 3...');
    
    const mazeMap = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
        [1,0,1,0,1,0,0,0,0,0,1,0,1,0,1],
        [1,0,0,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,1,1,1,1,0,1,0,1,0,1,0,1,0,1],
        [1,0,0,0,0,0,1,0,1,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,0,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a3a,
        roughness: 0.9, // Menos reflejos para mejor performance
        metalness: 0.2
    });

    const mazeSize = 15;
    const wallSpacing = 2.5;
    
    for (let z = 0; z < mazeSize; z++) {
        for (let x = 0; x < mazeSize; x++) {
            if (mazeMap[z][x] === 1) {
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(wallSpacing, 2, wallSpacing),
                    wallMaterial
                );
                const offset = (mazeSize * wallSpacing) / 2 - wallSpacing / 2;
                wall.position.set(
                    x * wallSpacing - offset, 
                    1, 
                    z * wallSpacing - offset
                );
                wall.castShadow = true;
                wall.receiveShadow = true;
                wall.name = 'wall';
                scene.add(wall);
            }
        }
    }

    // Piso grande
    const floorSize = mazeSize * wallSpacing + 10;
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(floorSize, floorSize),
        new THREE.MeshStandardMaterial({ 
            color: 0x151525,
            roughness: 1.0 // Sin reflejos para mejor performance
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    scene.add(floor);
    
    console.log(`✅ Laberinto 15x15 creado (${floorSize}x${floorSize} unidades)`);
}

// ==================== CREAR 8 BOLAS AMARILLAS ====================
function createKeys() {
    console.log('🌟 Creando 8 bolas amarillas para Meta Quest 3...');
    
    const keyPositions = [
        new THREE.Vector3(-12, 1.5, -12),
        new THREE.Vector3(-8, 1.5, -10),
        new THREE.Vector3(-15, 1.5, 0),
        new THREE.Vector3(-10, 1.5, 5),
        new THREE.Vector3(0, 1.5, 0),
        new THREE.Vector3(5, 1.5, -5),
        new THREE.Vector3(12, 1.5, 8),
        new THREE.Vector3(15, 1.5, 2)
    ];

    for (let i = 0; i < totalKeys; i++) {
        const keyGeometry = new THREE.SphereGeometry(0.35, 24, 24); // Optimizado para VR
        const keyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.4,
            metalness: 0.7,
            roughness: 0.3
        });
        
        const key = new THREE.Mesh(keyGeometry, keyMaterial);
        key.position.copy(keyPositions[i]);
        key.userData.isKey = true;
        key.userData.collected = false;
        key.userData.id = i;
        key.name = `bola_amarilla_${i}`;
        
        // Luz optimizada para VR
        const keyLight = new THREE.PointLight(0xFFD700, 0.8, 6);
        keyLight.position.copy(key.position);
        keyLight.position.y += 0.2;
        scene.add(keyLight);
        
        // Halo simplificado para mejor performance
        createKeyHalo(key.position, i);
        
        scene.add(key);
        keys.push(key);
    }
    console.log(`✅ ${totalKeys} bolas amarillas creadas`);
}

function createKeyHalo(position, keyIndex) {
    const haloGeometry = new THREE.RingGeometry(0.5, 0.6, 16); // Menos polígonos
    const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2
    });
    
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.copy(position);
    halo.position.y += 0.1;
    halo.rotation.x = -Math.PI / 2;
    halo.userData.isHalo = true;
    halo.userData.parentKey = keyIndex;
    scene.add(halo);
}

function createLighting() {
    console.log('💡 Creando iluminación optimizada para Quest 3...');
    
    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Luz direccional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024; // Reducido para performance
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Luces de acento estratégicas
    const accentLights = [
        { x: -15, y: 4, z: -15, color: 0x00a8ff, intensity: 0.4 },
        { x: 15, y: 4, z: -15, color: 0x00fff7, intensity: 0.4 },
        { x: -15, y: 4, z: 15, color: 0xff00ff, intensity: 0.4 },
        { x: 15, y: 4, z: 15, color: 0xffaa00, intensity: 0.4 }
    ];
    
    accentLights.forEach(lightData => {
        const light = new THREE.PointLight(lightData.color, lightData.intensity, 20);
        light.position.set(lightData.x, lightData.y, lightData.z);
        scene.add(light);
    });
}

// ==================== FUNCIONES DE INTERACCIÓN ====================
function onDocumentClick(event) {
    if (isInVR) return;
    
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
    if (key.userData.collected) return;
    
    key.userData.collected = true;
    key.visible = false;
    keysCollected++;
    
    // Ocultar halo y luz
    scene.children.forEach(child => {
        if (child.userData.isHalo && child.userData.parentKey === key.userData.id) {
            child.visible = false;
        }
        if (child instanceof THREE.PointLight && child.position.distanceTo(key.position) < 1) {
            child.intensity = 0;
        }
    });
    
    // Efecto de partículas
    createKeyParticles(key.position);
    
    // Actualizar UI
    updateKeyCounter();
    
    // Verificar victoria
    if (keysCollected >= totalKeys) {
        setTimeout(() => {
            showVictory();
        }, 1000);
    }
    
    console.log(`🌟 Bola amarilla recogida! Total: ${keysCollected}/${totalKeys}`);
}

function createKeyParticles(position) {
    const particleCount = 15; // Optimizado para VR
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.04, 6, 6); // Menos polígonos
        const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.3,
            (Math.random() - 0.5) * 0.2
        );
        particle.userData.life = 1.0;
        scene.add(particle);
        
        function animateParticle() {
            if (particle.userData.life > 0) {
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.y -= 0.01;
                particle.userData.life -= 0.04;
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
        counterValue.style.transform = 'scale(1.2)';
        counterValue.style.color = '#FFD700';
        setTimeout(() => counterValue.style.transform = 'scale(1)', 300);
    }
}

function showVictory() {
    console.log('🎉 ¡VICTORIA! Todas las bolas amarillas recogidas');
    
    if (victorySound) victorySound.play();
    
    // Actualizar panel de victoria
    const victoryTitle = document.querySelector('.victory-title');
    const victoryMessage = document.querySelector('.victory-message');
    const statValue = document.querySelector('.stat-value');
    
    if (victoryTitle) victoryTitle.textContent = '¡LABERINTO GIGANTE COMPLETADO!';
    if (victoryMessage) victoryMessage.textContent = `Encontraste las ${totalKeys} llaves en el laberinto 15x15`;
    if (statValue) statValue.textContent = `${totalKeys}/${totalKeys}`;
    
    victoryPanel.style.display = 'flex';
    createConfetti();
}

function createConfetti() {
    const confettiCount = 80; // Optimizado para VR
    
    for (let i = 0; i < confettiCount; i++) {
        const geometry = new THREE.PlaneGeometry(0.08, 0.08); // Más pequeño
        const material = new THREE.MeshBasicMaterial({
            color: Math.random() * 0xffffff,
            side: THREE.DoubleSide
        });
        const confetti = new THREE.Mesh(geometry, material);
        
        confetti.position.set(
            (Math.random() - 0.5) * 20,
            Math.random() * 8 + 5,
            (Math.random() - 0.5) * 20
        );
        
        scene.add(confetti);
        
        const speed = 0.02 + Math.random() * 0.02;
        
        function animateConfetti() {
            confetti.position.y -= speed;
            confetti.rotation.z += 0.05;
            if (confetti.position.y > -5) {
                requestAnimationFrame(animateConfetti);
            } else {
                scene.remove(confetti);
            }
        }
        animateConfetti();
    }
}

// ==================== ANIMACIÓN ====================
function animate() {
    if (gameStarted) {
        // Rotar y flotar bolas amarillas
        keys.forEach(key => {
            if (key && !key.userData.collected) {
                key.rotation.y += 0.015;
                key.position.y = 1.5 + Math.sin(Date.now() * 0.001 + key.userData.id) * 0.2;
                
                scene.children.forEach(child => {
                    if (child.userData.isHalo && child.userData.parentKey === key.userData.id) {
                        child.position.y = key.position.y + 0.1;
                        child.rotation.z += 0.01;
                    }
                });
            }
        });
        
        // Actualizar movimiento según modo
        if (!isInVR) {
            controls.update();
            updateMovement();
        } else {
            updateVRMovement();
        }
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ==================== FUNCIONES DE MOVIMIENTO ====================
function initMovementControls() {
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': moveForward = true; break;
            case 'KeyS': case 'ArrowDown': moveBackward = true; break;
            case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
            case 'KeyD': case 'ArrowRight': moveRight = true; break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': moveForward = false; break;
            case 'KeyS': case 'ArrowDown': moveBackward = false; break;
            case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
            case 'KeyD': case 'ArrowRight': moveRight = false; break;
        }
    });
}

function updateMovement() {
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

// ==================== FUNCIONES UI Y UTILIDADES ====================
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function createParticles() {
    const particlesContainer = document.querySelector('.particles-container');
    for (let i = 0; i < 40; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: rgba(0, 168, 255, ${Math.random() * 0.4 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 8 + 4}s infinite linear;
        `;
        particlesContainer.appendChild(particle);
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

function restartGame() {
    victoryPanel.style.display = 'none';
    keysCollected = 0;
    updateKeyCounter();
    
    keys.forEach(key => {
        key.userData.collected = false;
        key.visible = true;
    });
    
    scene.children.forEach(child => {
        if (child.userData.isHalo) child.visible = true;
        if (child instanceof THREE.PointLight && child.intensity === 0) {
            child.intensity = 0.8;
        }
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

// ==================== INFORMACIÓN DE CONTROLES VR ====================
function showVRControlsInfo() {
    const controlsInfo = document.createElement('div');
    controlsInfo.id = 'vr-controls-info';
    controlsInfo.innerHTML = `
        <div style="
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            z-index: 1000;
            border: 2px solid #00a8ff;
            max-width: 300px;
        ">
            <h3 style="margin: 0 0 10px 0; color: #00fff7;">🎮 CONTROLES META QUEST 3</h3>
            <div style="margin-bottom: 8px;"><strong>Joystick Izquierdo:</strong> Movimiento</div>
            <div style="margin-bottom: 8px;"><strong>Trigger (Gatillo):</strong> Recoger llaves</div>
            <div style="margin-bottom: 8px;"><strong>Botón A/X:</strong> Movimiento adelante</div>
            <div style="margin-bottom: 8px;"><strong>Botón B/Y:</strong> Movimiento atrás</div>
            <div style="color: #ffaa00; font-size: 12px;">Apaga los guardianes para mejor experiencia</div>
        </div>
    `;
    document.body.appendChild(controlsInfo);
    
    setTimeout(() => {
        if (controlsInfo.parentNode) {
            controlsInfo.style.opacity = '0';
            controlsInfo.style.transition = 'opacity 1s';
            setTimeout(() => {
                if (controlsInfo.parentNode) {
                    controlsInfo.parentNode.removeChild(controlsInfo);
                }
            }, 1000);
        }
    }, 10000); // Mostrar por 10 segundos
}

function hideVRControlsInfo() {
    const info = document.getElementById('vr-controls-info');
    if (info && info.parentNode) {
        info.parentNode.removeChild(info);
    }
}

// ==================== DEBUG PARA QUEST 3 ====================
window.debugQuest3 = {
    testControllers: () => {
        const session = renderer.xr.getSession();
        if (session && session.inputSources) {
            console.log('🎮=== DEBUG META QUEST 3 ===');
            session.inputSources.forEach((source, index) => {
                if (source.gamepad) {
                    console.log(`Controlador ${index} (${source.handedness}):`);
                    console.log('  Botones:', source.gamepad.buttons.map((b, i) => 
                        `${i}: ${b.pressed ? 'PRESSED' : 'released'} (${b.value.toFixed(2)})`
                    ).join(', '));
                    console.log('  Ejes:', source.gamepad.axes.map((a, i) => 
                        `${i}: ${a.toFixed(3)}`
                    ).join(', '));
                }
            });
            console.log('============================');
        }
    },
    
    moveToKey: (keyIndex) => {
        if (keyIndex >= 0 && keyIndex < keys.length) {
            const key = keys[keyIndex];
            camera.position.copy(key.position);
            camera.position.y = 1.6;
            console.log(`📍 Teletransportado a llave ${keyIndex}`);
        }
    }
};

// ==================== INICIAR ====================
window.addEventListener('DOMContentLoaded', init);