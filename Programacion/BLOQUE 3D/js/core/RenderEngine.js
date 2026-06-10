import * as THREE from 'three';

export default class RenderEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xb9cfdb);
        this.scene.fog = new THREE.Fog(0xb9cfdb, 18, 46);

        this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        if (THREE.SRGBColorSpace) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        }

        this.cameraTarget = new THREE.Vector3(2, 0, 2);
        this.boardColumns = 5;
        this.boardRows = 4;
        this.setupLights();
        this.focusOnBoard(5, 4);
    }

    setupLights() {
        const hemisphere = new THREE.HemisphereLight(0xffffff, 0x716650, 1.85);
        this.scene.add(hemisphere);

        const keyLight = new THREE.DirectionalLight(0xfff3d4, 2.15);
        keyLight.position.set(12, 18, 11);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 80;
        keyLight.shadow.camera.left = -18;
        keyLight.shadow.camera.right = 18;
        keyLight.shadow.camera.top = 18;
        keyLight.shadow.camera.bottom = -18;
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xadcbe0, 0.82);
        fillLight.position.set(-12, 10, -10);
        this.scene.add(fillLight);
    }

    focusOnBoard(columns, rows) {
        this.boardColumns = columns;
        this.boardRows = rows;

        const centerX = (columns - 1) / 2;
        const centerZ = (rows - 1) / 2;
        const maxDimension = Math.max(columns, rows);
        const aspect = window.innerWidth / window.innerHeight;
        const portraitBoost = aspect < 0.8 ? 1.32 : 1;
        const distance = Math.max(9, maxDimension * 1.85) * portraitBoost;
        const height = Math.max(7.5, maxDimension * 1.15) * (aspect < 0.8 ? 1.18 : 1);

        this.cameraTarget.set(centerX, 0, centerZ);
        this.camera.position.set(centerX + distance * 0.7, height, centerZ + distance * 0.9);
        this.camera.lookAt(this.cameraTarget);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.focusOnBoard(this.boardColumns, this.boardRows);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    add(object3d) {
        this.scene.add(object3d);
    }
}
