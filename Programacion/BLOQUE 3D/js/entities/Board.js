import * as THREE from 'three';

const EMPTY = '.';
const BRIDGE = 'B';

export default class Board {
    constructor(renderEngine) {
        this.renderEngine = renderEngine;
        this.tiles = [];
        this.bridgeTiles = [];
        this.currentMap = [];
        this.activeBridges = false;

        this.levels = [
            {
                name: 'Sector 1',
                subtitle: 'Iniciacion',
                optimalMoves: 6,
                start: { x: 1, z: 1 },
                map: [
                    '#####',
                    '#####',
                    '###G#',
                    '#####'
                ]
            },
            {
                name: 'Sector 2',
                subtitle: 'Pasillo largo',
                optimalMoves: 8,
                start: { x: 1, z: 1 },
                map: [
                    '#########',
                    '#########',
                    '########G',
                    '#########'
                ]
            },
            {
                name: 'Sector 3',
                subtitle: 'Cristal liviano',
                optimalMoves: 6,
                start: { x: 1, z: 1 },
                map: [
                    '#######',
                    '##F####',
                    '#####G#',
                    '#######'
                ]
            },
            {
                name: 'Sector 4',
                subtitle: 'Puente magnetico',
                optimalMoves: 6,
                start: { x: 1, z: 1 },
                map: [
                    '####....',
                    '##S#....',
                    '####BB##',
                    '....###G',
                    '....####'
                ]
            },
            {
                name: 'Sector 5',
                subtitle: 'Interruptor pesado',
                optimalMoves: 7,
                start: { x: 1, z: 1 },
                map: [
                    '####H....',
                    '#####....',
                    '#####BB#.',
                    '....#BBG.',
                    '....####.'
                ]
            },
            {
                name: 'Sector 6',
                subtitle: 'Ruta fracturada',
                optimalMoves: 14,
                start: { x: 1, z: 1 },
                map: [
                    '#########',
                    '####.#..#',
                    '#########',
                    '###.##.##',
                    '#..#..###',
                    '####.####',
                    '.#####.#G'
                ]
            }
        ];

        this.materials = {
            floor: new THREE.MeshStandardMaterial({
                color: 0x8f8a7d,
                roughness: 0.78,
                metalness: 0.04
            }),
            goal: new THREE.MeshStandardMaterial({
                color: 0x817b70,
                roughness: 0.82,
                metalness: 0.03
            }),
            switch: new THREE.MeshStandardMaterial({
                color: 0x8f6d45,
                roughness: 0.64,
                metalness: 0.04
            }),
            heavySwitch: new THREE.MeshStandardMaterial({
                color: 0x756044,
                roughness: 0.68,
                metalness: 0.04
            }),
            fragile: new THREE.MeshStandardMaterial({
                color: 0xc8b474,
                roughness: 0.28,
                metalness: 0.02,
                transparent: true,
                opacity: 0.72
            }),
            bridge: new THREE.MeshStandardMaterial({
                color: 0x6e7f54,
                roughness: 0.7,
                metalness: 0.04
            }),
            edge: new THREE.LineBasicMaterial({ color: 0x303436, transparent: true, opacity: 0.62 }),
            goalHole: new THREE.MeshBasicMaterial({ color: 0x121619 }),
            goalBevel: new THREE.MeshStandardMaterial({ color: 0x3e4548, roughness: 0.6, metalness: 0.1 }),
            switchTop: new THREE.MeshStandardMaterial({ color: 0xb85f3f, roughness: 0.54, metalness: 0.06 }),
            heavyTop: new THREE.MeshStandardMaterial({ color: 0xc79a42, roughness: 0.5, metalness: 0.08 })
        };
    }

    clearBoard() {
        [...this.tiles, ...this.bridgeTiles].forEach((group) => this.disposeGroup(group));
        this.tiles = [];
        this.bridgeTiles = [];
    }

    disposeGroup(group) {
        this.renderEngine.scene.remove(group);
        group.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
        });
    }

    buildLevel(levelIndex) {
        const level = this.levels[levelIndex];
        const width = Math.max(...level.map.map((row) => row.length));

        this.clearBoard();
        this.activeBridges = Boolean(level.bridgesActive);
        this.currentMap = level.map.map((row) => row.padEnd(width, EMPTY).split(''));

        for (let z = 0; z < this.currentMap.length; z++) {
            for (let x = 0; x < width; x++) {
                const tileType = this.currentMap[z][x];

                if (tileType !== EMPTY && tileType !== BRIDGE) {
                    this.createTile(x, z, tileType, this.tiles);
                }
            }
        }

        this.refreshBridgeTiles();
        this.renderEngine.focusOnBoard(width, this.currentMap.length);
    }

    refreshBridgeTiles() {
        this.bridgeTiles.forEach((group) => this.disposeGroup(group));
        this.bridgeTiles = [];

        if (!this.activeBridges) {
            return;
        }

        for (let z = 0; z < this.currentMap.length; z++) {
            for (let x = 0; x < this.currentMap[z].length; x++) {
                if (this.currentMap[z][x] === BRIDGE) {
                    this.createTile(x, z, BRIDGE, this.bridgeTiles);
                }
            }
        }
    }

    createTile(x, z, type, collection) {
        const group = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.22, 0.96), this.getMaterial(type));
        base.position.set(0, -0.11, 0);
        base.receiveShadow = true;

        const edge = new THREE.LineSegments(
            new THREE.EdgesGeometry(base.geometry),
            this.materials.edge
        );
        edge.position.copy(base.position);

        group.add(base, edge);
        group.position.set(x, 0, z);

        if (type === 'G') {
            this.decorateGoal(group);
        } else if (type === 'S') {
            this.decorateSwitch(group, false);
        } else if (type === 'H') {
            this.decorateSwitch(group, true);
        } else if (type === 'F') {
            this.decorateFragile(group);
        }

        this.renderEngine.add(group);
        collection.push(group);
    }

    decorateGoal(group) {
        const hole = new THREE.Mesh(
            new THREE.CircleGeometry(0.35, 40),
            this.materials.goalHole
        );
        hole.rotation.x = -Math.PI / 2;
        hole.position.y = 0.012;
        group.add(hole);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.37, 0.035, 12, 40),
            this.materials.goalBevel
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.04;
        group.add(ring);
    }

    decorateSwitch(group, heavy) {
        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.34, 0.08, 28),
            heavy ? this.materials.heavyTop : this.materials.switchTop
        );
        pad.position.y = 0.06;
        group.add(pad);

    }

    decorateFragile(group) {
        const crossMaterial = new THREE.LineBasicMaterial({ color: 0x6d5f35, transparent: true, opacity: 0.76 });
        const points = [
            new THREE.Vector3(-0.34, 0.04, -0.34),
            new THREE.Vector3(0.34, 0.04, 0.34),
            new THREE.Vector3(0.34, 0.04, -0.34),
            new THREE.Vector3(-0.34, 0.04, 0.34)
        ];
        const cross = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), crossMaterial);
        group.add(cross);
    }

    getMaterial(type) {
        if (type === 'G') return this.materials.goal;
        if (type === 'S') return this.materials.switch;
        if (type === 'H') return this.materials.heavySwitch;
        if (type === 'F') return this.materials.fragile;
        if (type === BRIDGE) return this.materials.bridge;
        return this.materials.floor;
    }

    getTile(x, z) {
        if (!Number.isInteger(x) || !Number.isInteger(z)) {
            return EMPTY;
        }

        if (z < 0 || z >= this.currentMap.length) {
            return EMPTY;
        }

        if (x < 0 || x >= this.currentMap[z].length) {
            return EMPTY;
        }

        return this.currentMap[z][x];
    }

    isSolidTile(tileType) {
        if (tileType === EMPTY) {
            return false;
        }

        if (tileType === BRIDGE) {
            return this.activeBridges;
        }

        return true;
    }

    isSafe(state, occupiedCells) {
        return occupiedCells.every(({ x, z }) => {
            const tileType = this.getTile(x, z);
            if (!this.isSolidTile(tileType)) {
                return false;
            }

            return !(state === 'STANDING' && tileType === 'F');
        });
    }

    isGoal(state, occupiedCells) {
        return state === 'STANDING' && this.getTile(occupiedCells[0].x, occupiedCells[0].z) === 'G';
    }

    pressSwitches(state, occupiedCells) {
        const touchesSoftSwitch = occupiedCells.some(({ x, z }) => this.getTile(x, z) === 'S');
        const pressesHeavySwitch = state === 'STANDING'
            && occupiedCells.some(({ x, z }) => this.getTile(x, z) === 'H');

        if (!touchesSoftSwitch && !pressesHeavySwitch) {
            return { changed: false, kind: null };
        }

        if (this.activeBridges) {
            return { changed: false, kind: touchesSoftSwitch ? 'soft' : 'heavy' };
        }

        this.activeBridges = true;
        this.refreshBridgeTiles();

        return { changed: true, kind: touchesSoftSwitch ? 'soft' : 'heavy' };
    }
}
