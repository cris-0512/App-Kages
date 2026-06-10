import * as THREE from 'three';

const STATE = {
    STANDING: 'STANDING',
    LAYING_X: 'LAYING_X',
    LAYING_Z: 'LAYING_Z'
};

export default class Block {
    constructor(renderEngine, board, callbacks = {}) {
        this.renderEngine = renderEngine;
        this.board = board;
        this.onMove = callbacks.onMove || (() => {});
        this.onWin = callbacks.onWin || (() => {});
        this.onFall = callbacks.onFall || (() => {});
        this.onSwitch = callbacks.onSwitch || (() => {});

        const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x8c7b64, roughness: 0.72, metalness: 0.04 });
        const topMaterial = new THREE.MeshStandardMaterial({ color: 0xd6c7ac, roughness: 0.68, metalness: 0.03 });
        const bottomMaterial = new THREE.MeshStandardMaterial({ color: 0x554c3f, roughness: 0.76, metalness: 0.02 });
        const capMaterial = new THREE.MeshStandardMaterial({ color: 0xaa9574, roughness: 0.7, metalness: 0.03 });
        this.materials = [capMaterial, capMaterial, topMaterial, bottomMaterial, sideMaterial, sideMaterial];
        this.edgeMaterial = new THREE.LineBasicMaterial({ color: 0x332d25, transparent: true, opacity: 0.56 });
        this.geometry = new THREE.BoxGeometry(1, 2, 1);

        this.mesh = new THREE.Mesh(this.geometry, this.materials);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(this.geometry), this.edgeMaterial);
        this.mesh.add(edges);

        this.renderEngine.add(this.mesh);

        this.targetPosition = new THREE.Vector3();
        this.targetQuaternion = new THREE.Quaternion();
        this.startPosition = new THREE.Vector3();
        this.startQuaternion = new THREE.Quaternion();
        this.rollPivot = new THREE.Vector3();
        this.rollAxis = new THREE.Vector3();
        this.rollStartOffset = new THREE.Vector3();
        this.rollQuaternion = new THREE.Quaternion();
        this.finalRollQuaternion = new THREE.Quaternion();

        this.animationTime = 0;
        this.animationDuration = 0.24;
        this.isAnimating = false;
        this.isFrozen = false;
        this.isPaused = false;
        this.isFalling = false;
        this.moves = 0;

        this.resetPosition({ x: 1, z: 1 });
    }

    setPaused(status) {
        this.isPaused = status;
    }

    resetPosition(start = { x: 1, z: 1 }) {
        this.state = STATE.STANDING;
        this.gridX = start.x;
        this.gridZ = start.z;
        this.moves = 0;
        this.isFrozen = false;
        this.isAnimating = false;
        this.isFalling = false;
        this.animationTime = 0;

        this.calculateTargetTransform();
        this.mesh.position.copy(this.targetPosition);
        this.mesh.quaternion.copy(this.targetQuaternion);
        this.mesh.visible = true;
    }

    tryMove(direction) {
        if (this.isAnimating || this.isFrozen || this.isPaused || this.isFalling) {
            return false;
        }

        const roll = this.getRollTransform(direction);
        const next = this.getNextState(direction);
        if (!next) {
            return false;
        }

        this.state = next.state;
        this.gridX = next.x;
        this.gridZ = next.z;
        this.moves++;

        this.startPosition.copy(this.mesh.position);
        this.startQuaternion.copy(this.mesh.quaternion);
        this.rollPivot.copy(roll.pivot);
        this.rollAxis.copy(roll.axis);
        this.rollStartOffset.copy(this.startPosition).sub(this.rollPivot);
        this.calculateTargetTransform();
        this.finalRollQuaternion.setFromAxisAngle(this.rollAxis, Math.PI / 2);
        this.targetQuaternion.copy(this.finalRollQuaternion).multiply(this.startQuaternion);
        this.animationTime = 0;
        this.isAnimating = true;

        return true;
    }

    getNextState(direction) {
        let nextState = this.state;
        let nextX = this.gridX;
        let nextZ = this.gridZ;

        if (this.state === STATE.STANDING) {
            if (direction === 'RIGHT') {
                nextX += 1.5;
                nextState = STATE.LAYING_X;
            } else if (direction === 'LEFT') {
                nextX -= 1.5;
                nextState = STATE.LAYING_X;
            } else if (direction === 'DOWN') {
                nextZ += 1.5;
                nextState = STATE.LAYING_Z;
            } else if (direction === 'UP') {
                nextZ -= 1.5;
                nextState = STATE.LAYING_Z;
            }
        } else if (this.state === STATE.LAYING_X) {
            if (direction === 'RIGHT') {
                nextX += 1.5;
                nextState = STATE.STANDING;
            } else if (direction === 'LEFT') {
                nextX -= 1.5;
                nextState = STATE.STANDING;
            } else if (direction === 'DOWN') {
                nextZ += 1;
            } else if (direction === 'UP') {
                nextZ -= 1;
            }
        } else if (this.state === STATE.LAYING_Z) {
            if (direction === 'DOWN') {
                nextZ += 1.5;
                nextState = STATE.STANDING;
            } else if (direction === 'UP') {
                nextZ -= 1.5;
                nextState = STATE.STANDING;
            } else if (direction === 'RIGHT') {
                nextX += 1;
            } else if (direction === 'LEFT') {
                nextX -= 1;
            }
        }

        if (!['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(direction)) {
            return null;
        }

        return { state: nextState, x: nextX, z: nextZ };
    }

    getRollTransform(direction) {
        const pivot = new THREE.Vector3(this.gridX, 0, this.gridZ);
        const axis = new THREE.Vector3(1, 0, 0);

        if (direction === 'RIGHT') {
            pivot.x += this.state === STATE.LAYING_X ? 1 : 0.5;
            axis.set(0, 0, -1);
        } else if (direction === 'LEFT') {
            pivot.x -= this.state === STATE.LAYING_X ? 1 : 0.5;
            axis.set(0, 0, 1);
        } else if (direction === 'DOWN') {
            pivot.z += this.state === STATE.LAYING_Z ? 1 : 0.5;
            axis.set(1, 0, 0);
        } else if (direction === 'UP') {
            pivot.z -= this.state === STATE.LAYING_Z ? 1 : 0.5;
            axis.set(-1, 0, 0);
        }

        return { pivot, axis };
    }

    calculateTargetTransform() {
        this.targetQuaternion.identity();

        if (this.state === STATE.STANDING) {
            this.targetPosition.set(this.gridX, 1, this.gridZ);
            return;
        }

        if (this.state === STATE.LAYING_X) {
            this.targetPosition.set(this.gridX, 0.5, this.gridZ);
            this.targetQuaternion.setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
            return;
        }

        this.targetPosition.set(this.gridX, 0.5, this.gridZ);
        this.targetQuaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    }

    getOccupiedCells() {
        if (this.state === STATE.STANDING) {
            return [{ x: this.gridX, z: this.gridZ }];
        }

        if (this.state === STATE.LAYING_X) {
            return [
                { x: this.gridX - 0.5, z: this.gridZ },
                { x: this.gridX + 0.5, z: this.gridZ }
            ];
        }

        return [
            { x: this.gridX, z: this.gridZ - 0.5 },
            { x: this.gridX, z: this.gridZ + 0.5 }
        ];
    }

    update(deltaTime) {
        if (this.isPaused) {
            return;
        }

        if (this.isFalling) {
            this.mesh.position.y -= 7 * deltaTime;
            this.mesh.rotation.x += 2.4 * deltaTime;
            this.mesh.rotation.z += 1.8 * deltaTime;
            return;
        }

        if (!this.isAnimating) {
            return;
        }

        this.animationTime += deltaTime;
        const t = Math.min(1, this.animationTime / this.animationDuration);
        const eased = 1 - Math.pow(1 - t, 3);

        this.rollQuaternion.setFromAxisAngle(this.rollAxis, eased * Math.PI / 2);
        this.mesh.position.copy(this.rollStartOffset).applyQuaternion(this.rollQuaternion).add(this.rollPivot);
        this.mesh.quaternion.copy(this.rollQuaternion).multiply(this.startQuaternion);

        if (t >= 1) {
            this.mesh.position.copy(this.targetPosition);
            this.mesh.quaternion.copy(this.targetQuaternion);
            this.isAnimating = false;
            this.checkGameState();
        }
    }

    checkGameState() {
        const occupiedCells = this.getOccupiedCells();

        if (!this.board.isSafe(this.state, occupiedCells)) {
            this.isFrozen = true;
            this.isFalling = true;
            this.onFall(this.moves);
            return;
        }

        if (this.board.isGoal(this.state, occupiedCells)) {
            this.isFrozen = true;
            this.onWin(this.moves);
            return;
        }

        const switchResult = this.board.pressSwitches(this.state, occupiedCells);
        if (switchResult.changed) {
            this.onSwitch(switchResult);
        }

        this.onMove(this.moves);
    }
}
