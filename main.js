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
let vrMovementVector = new THREE.Vector3();
const vrMoveSpeed = 0.05;

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
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);
    backToMenuButton.addEventListener('click', backToMenu);
    exitVRButton.addEventListener('click', exitVR);
    
    // Inicializar contador
    updateKeyCounter();
    
    // Crear partículas para el fondo
    createParticles();
    
    console.log('✅ Interfaz inicializada');
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

    // 6. Configurar controles VR
    setupVRControllers();

    // 7. Eventos
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onDocumentClick);
    
    // 8. Detectar inicio/fin de VR
    renderer.xr.addEventListener('sessionstart', () => {
        console.log('🚀 Sesión VR iniciada');
        isInVR = true;
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        console.log('👋 Sesión VR finalizada');
        isInVR = false;
    });
    
    // 9. Iniciar loop
    renderer.setAnimationLoop(animate);
    
    console.log('✅ Three.js inicializado');
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
            case 'Space':
                if (!isInVR && camera.position.y <= 1.6) {
                    camera.position.y += 0.5;
                }
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
    
    console.log('✅ Controles de teclado configurados (WASD/Flechas)');
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
        
        // Gravedad simple
        if (camera.position.y > 1.6) {
            camera.position.y -= 0.05;
        }
    }
}

// ==================== CONTROLES VR ====================
function setupVRControllers() {
    console.log('🎮 Configurando controles VR...');
    
    controllerModelFactory = new XRControllerModelFactory();
    
    // Controlador 1
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onVRSelectStart);
    controller1.addEventListener('selectend', onVRSelectEnd);
    controller1.addEventListener('squeezestart', onVRSqueezeStart);
    controller1.addEventListener('squeezeend', onVRSqueezeEnd);
    scene.add(controller1);
    
    // Modelo del controlador 1
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);
    
    // Controlador 2
    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onVRSelectStart);
    controller2.addEventListener('selectend', onVRSelectEnd);
    scene.add(controller2);
    
    // Modelo del controlador 2
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
    
    // Rayo para apuntar
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);
    
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
        color: 0x00ff00, 
        linewidth: 2,
        transparent: true,
        opacity: 0.5
    }));
    line.name = 'pointer';
    line.scale.z = 3;
    
    controller1.add(line.clone());
    controller2.add(line.clone());
    
    console.log('✅ Controles VR configurados');
}

// ==================== EVENTOS VR ====================
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
        
        // Efecto visual
        const pointer = controller.getObjectByName('pointer');
        if (pointer) {
            pointer.material.color.setHex(0xffaa00);
            setTimeout(() => {
                if (pointer) pointer.material.color.setHex(0x00ff00);
            }, 200);
        }
        return;
    }
    
    // Cambiar color del rayo
    const pointer = controller.getObjectByName('pointer');
    if (pointer) {
        pointer.material.color.setHex(0xff0000);
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
    console.log('🎮 Grip presionado - Movimiento VR activado');
    // Aquí podríamos activar movimiento continuo
}

function onVRSqueezeEnd(event) {
    console.log('🎮 Grip liberado');
}

// ==================== MOVIMIENTO VR CON JOYSTICK ====================
function updateVRMovement() {
    if (!isInVR || !renderer.xr.isPresenting) return;
    
    const session = renderer.xr.getSession();
    if (!session || !session.inputSources) return;
    
    // Revisar ambos controladores
    for (let i = 0; i < Math.min(2, session.inputSources.length); i++) {
        const inputSource = session.inputSources[i];
        if (inputSource && inputSource.gamepad) {
            const gamepad = inputSource.gamepad;
            
            // DEBUG: Mostrar información del joystick
            if (gamepad.axes && gamepad.axes.length >= 2) {
                const joystickX = gamepad.axes[0];
                const joystickY = gamepad.axes[1];
                
                // Solo mostrar si hay movimiento significativo
                if (Math.abs(joystickX) > 0.1 || Math.abs(joystickY) > 0.1) {
                    console.log(`🎮 Controlador ${i}: X=${joystickX.toFixed(2)}, Y=${joystickY.toFixed(2)}`);
                }
                
                // MOVIMIENTO CON JOYSTICK
                const deadZone = 0.15;
                
                if (Math.abs(joystickY) > deadZone) {
                    // Movimiento hacia adelante/atrás basado en la dirección de la cabeza
                    const forward = new THREE.Vector3(0, 0, -1);
                    forward.applyQuaternion(camera.quaternion);
                    forward.y = 0;
                    forward.normalize();
                    
                    camera.position.add(forward.multiplyScalar(-joystickY * vrMoveSpeed));
                }
                
                if (Math.abs(joystickX) > deadZone) {
                    // Movimiento lateral
                    const right = new THREE.Vector3(1, 0, 0);
                    right.applyQuaternion(camera.quaternion);
                    right.y = 0;
                    right.normalize();
                    
                    camera.position.add(right.multiplyScalar(joystickX * vrMoveSpeed));
                }
            }
            
            // También probar con botones específicos para movimiento
            if (gamepad.buttons && gamepad.buttons.length >= 4) {
                // Botón A/X para mover adelante
                if (gamepad.buttons[0] && gamepad.buttons[0].pressed) {
                    const forward = new THREE.Vector3(0, 0, -1);
                    forward.applyQuaternion(camera.quaternion);
                    forward.y = 0;
                    forward.normalize();
                    camera.position.add(forward.multiplyScalar(vrMoveSpeed));
                }
                
                // Botón B/Y para mover atrás
                if (gamepad.buttons[1] && gamepad.buttons[1].pressed) {
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

// ==================== JUEGO ====================
async function initGame() {
    console.log('🎮 Inicializando juego...');
    await loadEnvironment();
    loadAudio();
    createMaze();
    createKeys();  // <- AQUÍ CREAMOS LAS BOLAS AMARILLAS
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
        console.warn('⚠️ Usando color sólido');
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
        console.log('✅ Sonido ambiental cargado');
    });
    
    audioLoader.load('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3', (buffer) => {
        victorySound = new THREE.Audio(audioListener);
        victorySound.setBuffer(buffer);
        victorySound.setVolume(0.7);
        console.log('✅ Sonido de victoria cargado');
    });
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
            roughness: 0.9,
            metalness: 0.1
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    scene.add(floor);
    
    console.log('✅ Laberinto creado');
}

// ==================== CREAR BOLAS AMARILLAS (LLAVES) ====================
function createKeys() {
    console.log('🌟 Creando bolas amarillas (llaves)...');
    
    const keyPositions = [
        new THREE.Vector3(-2, 1.5, -2),   // Esquina superior izquierda
        new THREE.Vector3(3, 1.5, 0),     // Lado derecho
        new THREE.Vector3(0, 1.5, 3)      // Al fondo
    ];

    for (let i = 0; i < totalKeys; i++) {
        try {
            // BOLA AMARILLA - Esfera dorada brillante
            const keyGeometry = new THREE.SphereGeometry(0.3, 32, 32); // Tamaño aumentado
            const keyMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xFFD700,           // Color dorado
                emissive: 0xFFAA00,        // Brillo interno
                emissiveIntensity: 0.5,    // Intensidad del brillo
                metalness: 0.9,            // Muy metálico
                roughness: 0.1,            // Muy suave (brillante)
                transparent: true,
                opacity: 0.9
            });
            
            const key = new THREE.Mesh(keyGeometry, keyMaterial);
            key.position.copy(keyPositions[i]);
            key.userData.isKey = true;
            key.userData.collected = false;
            key.userData.id = i;
            key.name = `bola_amarilla_${i}`;
            
            // Añadir punto de luz AMARILLO alrededor de la bola
            const keyLight = new THREE.PointLight(0xFFD700, 1.0, 5); // Luz más fuerte
            keyLight.position.copy(key.position);
            keyLight.position.y += 0.2;
            scene.add(keyLight);
            
            // Añadir halo de partículas alrededor
            createKeyHalo(key.position);
            
            scene.add(key);
            keys.push(key);
            
            console.log(`✅ Bola amarilla ${i+1} creada en:`, keyPositions[i]);
            
        } catch (error) {
            console.error('❌ Error creando bola amarilla:', error);
        }
    }
    console.log('✅ Todas las bolas amarillas creadas');
}

function createKeyHalo(position) {
    // Crear un halo de partículas alrededor de la bola
    const haloGeometry = new THREE.RingGeometry(0.4, 0.5, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
    });
    
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.copy(position);
    halo.position.y += 0.1;
    halo.rotation.x = -Math.PI / 2;
    halo.userData.isHalo = true;
    halo.userData.parentKey = keys.length - 1;
    scene.add(halo);
}

function createLighting() {
    console.log('💡 Creando iluminación...');
    
    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Luz direccional (sol)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Luces decorativas
    const lightColors = [0x00a8ff, 0x00fff7, 0xff00ff];
    lightColors.forEach((color, i) => {
        const light = new THREE.PointLight(color, 0.5, 15);
        light.position.set((i - 1) * 4, 3, -5);
        scene.add(light);
    });
    
    console.log('✅ Iluminación creada');
}

function onDocumentClick(event) {
    // Para modo escritorio
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
    
    // Ocultar halo también
    scene.children.forEach(child => {
        if (child.userData.isHalo && child.userData.parentKey === key.userData.id) {
            child.visible = false;
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
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        
        // Velocidad aleatoria
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.3,
            (Math.random() - 0.5) * 0.2
        );
        
        particle.userData.life = 1.0;
        scene.add(particle);
        
        // Animar partícula
        function animateParticle() {
            if (particle.userData.life > 0) {
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.y -= 0.01; // Gravedad
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
        // Efecto visual cuando se recogen
        counterValue.style.transform = 'scale(1.2)';
        counterValue.style.color = '#FFD700';
        setTimeout(() => {
            counterValue.style.transform = 'scale(1)';
        }, 300);
    }
}

function showVictory() {
    console.log('🎉 ¡VICTORIA! Todas las bolas amarillas recogidas');
    
    // Sonido
    if (victorySound) victorySound.play();
    
    // Mostrar panel
    victoryPanel.style.display = 'flex';
    
    // Confeti
    createConfetti();
}

function createConfetti() {
    const confettiCount = 100;
    
    for (let i = 0; i < confettiCount; i++) {
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

// ==================== ANIMACIÓN ====================
function animate() {
    if (gameStarted) {
        // Rotar y hacer flotar las bolas amarillas
        keys.forEach(key => {
            if (key && !key.userData.collected) {
                // Rotación
                key.rotation.y += 0.02;
                key.rotation.x += 0.01;
                
                // Flotación suave
                key.position.y = 1.5 + Math.sin(Date.now() * 0.001 + key.userData.id) * 0.2;
                
                // Rotar halos también
                scene.children.forEach(child => {
                    if (child.userData.isHalo && child.userData.parentKey === key.userData.id) {
                        child.position.y = key.position.y + 0.1;
                        child.rotation.z += 0.01;
                    }
                });
            }
        });
        
        // Actualizar controles según el modo
        if (!isInVR) {
            controls.update();
            updateMovement();
        } else {
            // En VR, actualizar movimiento con joystick
            updateVRMovement();
        }
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function createParticles() {
    const particlesContainer = document.querySelector('.particles-container');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 1}px;
            height: ${Math.random() * 4 + 1}px;
            background: rgba(0, 168, 255, ${Math.random() * 0.5 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 10 + 5}s infinite linear;
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

// ==================== FUNCIONES UI ====================
function restartGame() {
    victoryPanel.style.display = 'none';
    keysCollected = 0;
    updateKeyCounter();
    
    keys.forEach(key => {
        key.userData.collected = false;
        key.visible = true;
    });
    
    // Reactivar halos
    scene.children.forEach(child => {
        if (child.userData.isHalo) {
            child.visible = true;
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

// ==================== INICIAR ====================
window.addEventListener('DOMContentLoaded', init);

// ==================== DEBUG PARA CONTROLES ====================
window.debugControls = {
    // Probar joystick
    testJoystick: () => {
        const session = renderer.xr.getSession();
        if (session && session.inputSources) {
            session.inputSources.forEach((source, index) => {
                if (source.gamepad) {
                    console.log(`🎮 Controlador ${index}:`, {
                        id: source.gamepad.id,
                        axes: source.gamepad.axes.map(a => a.toFixed(3)),
                        buttons: source.gamepad.buttons.map(b => b.pressed)
                    });
                }
            });
        }
    },
    
    // Forzar movimiento
    move: (direction) => {
        const dirMap = {
            'forward': new THREE.Vector3(0, 0, -1),
            'backward': new THREE.Vector3(0, 0, 1),
            'left': new THREE.Vector3(-1, 0, 0),
            'right': new THREE.Vector3(1, 0, 0)
        };
        
        if (dirMap[direction]) {
            const moveDir = dirMap[direction].clone();
            moveDir.applyQuaternion(camera.quaternion);
            moveDir.y = 0;
            moveDir.normalize();
            camera.position.add(moveDir.multiplyScalar(0.5));
            console.log(`📍 Movido hacia ${direction}`);
        }
    },
    
    // Mostrar posición
    showPosition: () => {
        console.log('📍 Posición:', camera.position);
        console.log('🎯 Rotación:', camera.rotation);
    }
};