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

// Variables para VR
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let controllerModelFactory;
let isInVR = false;

// MOVIMIENTO VR - Nuevas variables
let vrMoveForward = false;
let vrMoveBackward = false;
let vrMoveLeft = false;
let vrMoveRight = false;
let vrMoveVector = new THREE.Vector3();
const vrMoveSpeed = 0.05;
let lastControllerPosition = new THREE.Vector3();
let movementEnabled = true;

// Elementos DOM
let startScreen, gameContainer, startButton;
let keyCounter, victoryPanel, restartButton, backToMenuButton, exitVRButton;

// ==================== INICIALIZACIÓN ====================
async function init() {
    console.log('🎮 Configurando movimiento para Meta Quest 3...');
    
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

    // Cámara
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.6, 5);

    // Renderer con WebXR
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor'); // IMPORTANTE para movimiento
    
    gameContainer.appendChild(renderer.domElement);

    // Controles para modo escritorio
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.enableDamping = true;

    // Botón VR
    const vrButton = VRButton.createButton(renderer);
    vrButton.classList.add('custom-vr-button');
    document.body.appendChild(vrButton);

    // Configurar controles VR CON MOVIMIENTO
    setupVRControllersWithMovement();

    // Eventos
    window.addEventListener('resize', onWindowResize);
    
    // Detectar cuando entramos/salimos de VR
    renderer.xr.addEventListener('sessionstart', onVRSessionStart);
    renderer.xr.addEventListener('sessionend', onVRSessionEnd);
    
    // Iniciar animación
    renderer.setAnimationLoop(animate);
}

// ==================== CONFIGURACIÓN DE MOVIMIENTO VR ====================
function setupVRControllersWithMovement() {
    console.log('🎮 Configurando movimiento con joystick para Meta Quest 3...');
    
    // Crear modelo de controladores
    controllerModelFactory = new XRControllerModelFactory();
    
    // Controlador 1 (mano izquierda - para movimiento)
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    controller1.addEventListener('connected', onControllerConnected);
    controller1.addEventListener('disconnected', onControllerDisconnected);
    scene.add(controller1);
    
    // Grip para el controlador 1
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);
    
    // Controlador 2 (mano derecha - para interacción)
    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    scene.add(controller2);
    
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
    
    // Rayo para apuntar (solo en controlador derecho)
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);
    
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
        color: 0x00ff00, 
        linewidth: 2,
        transparent: true,
        opacity: 0.7
    }));
    line.name = 'pointer';
    line.scale.z = 3;
    
    controller2.add(line.clone());
    
    console.log('✅ Sistema de movimiento VR configurado');
}

function onControllerConnected(event) {
    console.log('🎮 Controlador conectado:', event.data);
    const controller = event.target;
    
    // Configurar gamepad para joystick
    if (controller.gamepad) {
        console.log('🕹️ Gamepad detectado:', controller.gamepad);
        console.log('📊 Botones:', controller.gamepad.buttons.length);
        console.log('🎮 Ejes:', controller.gamepad.axes.length);
    }
}

function onControllerDisconnected(event) {
    console.log('🎮 Controlador desconectado');
}

function onVRSessionStart() {
    console.log('🚀 Sesión VR iniciada - Movimiento habilitado');
    isInVR = true;
    movementEnabled = true;
    
    // Ocultar instrucciones de teclado en VR
    document.querySelectorAll('.instruction-item').forEach(item => {
        item.style.opacity = '0.5';
    });
}

function onVRSessionEnd() {
    console.log('👋 Sesión VR terminada');
    isInVR = false;
    
    // Mostrar instrucciones de teclado nuevamente
    document.querySelectorAll('.instruction-item').forEach(item => {
        item.style.opacity = '1';
    });
}

// ==================== MOVIMIENTO CON JOYSTICK ====================
function updateVRMovementWithJoystick() {
    if (!isInVR || !movementEnabled) return;
    
    const session = renderer.xr.getSession();
    if (!session) return;
    
    // Obtener input sources (controladores)
    const inputSources = session.inputSources;
    
    // Buscar el joystick del controlador izquierdo (normalmente índice 0)
    if (inputSources && inputSources[0] && inputSources[0].gamepad) {
        const gamepad = inputSources[0].gamepad;
        
        // En Meta Quest, el joystick está en los ejes 2 y 3
        // axes[0] y axes[1] suelen ser el joystick táctil
        if (gamepad.axes.length >= 2) {
            const joystickX = gamepad.axes[0]; // Horizontal: -1 (izquierda) a 1 (derecha)
            const joystickY = gamepad.axes[1]; // Vertical: -1 (atrás) a 1 (adelante)
            
            // Umbral para evitar drift
            const deadZone = 0.15;
            
            // MOVIMIENTO HACIA ADELANTE/ATRÁS
            if (Math.abs(joystickY) > deadZone) {
                // Calcular dirección basada en la rotación de la cabeza
                const forward = new THREE.Vector3(0, 0, -1);
                forward.applyQuaternion(camera.quaternion);
                forward.y = 0; // Mantener en plano horizontal
                forward.normalize();
                
                // Mover en la dirección de la cabeza
                camera.position.add(forward.multiplyScalar(-joystickY * vrMoveSpeed));
                
                // Debug en consola
                if (Math.abs(joystickY) > 0.5) {
                    console.log(`🎮 Movimiento Y: ${joystickY.toFixed(2)}`);
                }
            }
            
            // MOVIMIENTO LATERAL (STRAFING)
            if (Math.abs(joystickX) > deadZone) {
                // Calcular derecha basada en la rotación de la cabeza
                const right = new THREE.Vector3(1, 0, 0);
                right.applyQuaternion(camera.quaternion);
                right.y = 0; // Mantener en plano horizontal
                right.normalize();
                
                // Mover lateralmente
                camera.position.add(right.multiplyScalar(joystickX * vrMoveSpeed));
            }
            
            // TELEPORTACIÓN CON JOYSTICK (alternativa)
            if (gamepad.buttons && gamepad.buttons[1] && gamepad.buttons[1].pressed) {
                // Botón B/Y para teleportación rápida
                setupTeleportation();
            }
        }
        
        // MOVIMIENTO CON BOTONES (alternativa si el joystick no funciona)
        if (gamepad.buttons.length >= 4) {
            // Botón del joystick hacia arriba (normalmente botón 12 o similar)
            if (gamepad.buttons[12] && gamepad.buttons[12].pressed) {
                vrMoveForward = true;
            } else {
                vrMoveForward = false;
            }
            
            // Botón del joystick hacia abajo
            if (gamepad.buttons[13] && gamepad.buttons[13].pressed) {
                vrMoveBackward = true;
            } else {
                vrMoveBackward = false;
            }
        }
    }
    
    // MOVIMIENTO CON BOTONES ALTERNATIVO
    if (vrMoveForward) {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        camera.position.add(forward.multiplyScalar(vrMoveSpeed));
    }
    
    if (vrMoveBackward) {
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        camera.position.add(forward.multiplyScalar(vrMoveSpeed));
    }
}

// Sistema de teleportación como alternativa
function setupTeleportation() {
    if (!controller2) return;
    
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(controller2.quaternion);
    
    raycaster.set(controller2.position, direction);
    
    const floorIntersects = raycaster.intersectObjects(scene.children.filter(obj => 
        obj.name === 'floor'
    ));
    
    if (floorIntersects.length > 0) {
        const targetPos = floorIntersects[0].point;
        targetPos.y += 1.6; // Altura de la cámara
        
        // Interpolación suave
        camera.position.lerp(targetPos, 0.3);
        
        // Indicador visual
        const indicator = new THREE.Mesh(
            new THREE.RingGeometry(0.1, 0.2, 32),
            new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                side: THREE.DoubleSide,
                transparent: true
            })
        );
        indicator.position.copy(floorIntersects[0].point);
        indicator.position.y += 0.01;
        indicator.rotation.x = -Math.PI / 2;
        scene.add(indicator);
        
        setTimeout(() => scene.remove(indicator), 300);
    }
}

// ==================== EVENTOS DE CONTROLES ====================
function onSelectStart(event) {
    const controller = event.target;
    
    // Lanzar rayo desde el controlador
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
    
    // Efecto visual
    const pointer = controller.getObjectByName('pointer');
    if (pointer) {
        pointer.material.color.setHex(0xff0000);
        pointer.material.opacity = 1;
    }
}

function onSelectEnd(event) {
    const controller = event.target;
    const pointer = controller.getObjectByName('pointer');
    if (pointer) {
        pointer.material.color.setHex(0x00ff00);
        pointer.material.opacity = 0.7;
    }
}

// ==================== JUEGO ====================
async function initGame() {
    await loadEnvironment();
    loadAudio();
    createMaze();
    createKeys();
    createLighting();
    gameStarted = true;
    
    console.log('✅ Juego listo');
    console.log('🎮 Meta Quest 3: Usa el joystick para moverte');
    console.log('🎯 Presiona trigger para recoger llaves');
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
            roughness: 0.2,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3
        });
        
        const key = new THREE.Mesh(keyGeometry, keyMaterial);
        key.position.copy(keyPositions[i]);
        key.userData.isKey = true;
        key.userData.collected = false;
        key.name = `key_${i}`;
        
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
                // Flotar suavemente
                key.position.y = 1.5 + Math.sin(Date.now() * 0.001 + key.userData.id) * 0.1;
            }
        });
        
        // Actualizar controles modo escritorio
        if (!isInVR) {
            controls.update();
        }
        
        // Actualizar movimiento VR si estamos en VR
        if (isInVR) {
            updateVRMovementWithJoystick();
        }
    }
    
    renderer.render(scene, camera);
}

// ==================== INTERACCIÓN ====================
function collectKey(key) {
    key.userData.collected = true;
    key.visible = false;
    keysCollected++;
    
    // Efecto de partículas
    createKeyParticles(key.position);
    
    updateKeyCounter();
    
    if (keysCollected >= totalKeys) {
        setTimeout(showVictory, 1000);
    }
    
    console.log(`🗝️ Llave recogida! Total: ${keysCollected}/${totalKeys}`);
}

function createKeyParticles(position) {
    for (let i = 0; i < 15; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        particle.userData.life = 1.0;
        
        scene.add(particle);
        
        function animateParticle() {
            if (particle.userData.life > 0) {
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.y -= 0.005;
                particle.userData.life -= 0.03;
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
        // Cambiar color cuando se acercan a ganar
        if (keysCollected === totalKeys) {
            counterValue.style.color = '#0f0';
            counterValue.style.textShadow = '0 0 10px #0f0';
        } else if (keysCollected >= totalKeys - 1) {
            counterValue.style.color = '#ffaa00';
        }
    }
}

function showVictory() {
    if (victorySound) victorySound.play();
    victoryPanel.style.display = 'flex';
    
    createConfetti();
}

function createConfetti() {
    for (let i = 0; i < 100; i++) {
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
        const rotationSpeed = (Math.random() - 0.5) * 0.2;
        
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

// ==================== DEBUG PARA META QUEST 3 ====================
window.debugQuest3 = {
    // Ver estado de gamepad
    showGamepadInfo: () => {
        const session = renderer.xr.getSession();
        if (session && session.inputSources && session.inputSources[0]) {
            const gamepad = session.inputSources[0].gamepad;
            console.log('🕹️ Gamepad Info:', {
                id: gamepad.id,
                index: gamepad.index,
                buttons: gamepad.buttons.map((b, i) => `${i}: ${b.pressed ? 'PRESSED' : 'released'}`),
                axes: gamepad.axes.map((a, i) => `${i}: ${a.toFixed(3)}`)
            });
        } else {
            console.log('❌ No hay gamepad activo');
        }
    },
    
    // Probar ejes del joystick
    testJoystick: () => {
        setInterval(() => {
            const session = renderer.xr.getSession();
            if (session && session.inputSources && session.inputSources[0]) {
                const gamepad = session.inputSources[0].gamepad;
                if (gamepad.axes.length >= 2) {
                    const x = gamepad.axes[0];
                    const y = gamepad.axes[1];
                    if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
                        console.log(`🎮 Joystick: X=${x.toFixed(2)}, Y=${y.toFixed(2)}`);
                    }
                }
            }
        }, 1000);
    },
    
    // Forzar movimiento
    moveForward: () => {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();
        camera.position.add(forward.multiplyScalar(0.5));
        console.log('📍 Movido hacia adelante');
    },
    
    // Resetear posición
    resetPosition: () => {
        camera.position.set(0, 1.6, 5);
        camera.rotation.set(0, 0, 0);
        console.log('📍 Posición reiniciada');
    },
    
    // Habilitar/deshabilitar movimiento
    toggleMovement: () => {
        movementEnabled = !movementEnabled;
        console.log(`🎮 Movimiento ${movementEnabled ? 'HABILITADO' : 'DESHABILITADO'}`);
    }
};