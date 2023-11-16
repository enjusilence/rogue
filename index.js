const DEBUG = false;

const FIELD_WIDTH = 40;
const FIELD_HEIGTH = 24;

const MIN_ROOM_COUNT = 5;
const MAX_ROOM_COUNT = 10;

const MIN_ROOM_SIZE = 3;
const MAX_ROOM_SIZE = 8;

const MIN_PATHWAYS = 3;
const MAX_PATHWAYS = 5;

const PC_COUNT = 1;
const ENEMY_COUNT = 10;
const SWORD_COUNT = 2;
const POT_COUNT = 10;
const ENTITIES_COUNT = PC_COUNT + ENEMY_COUNT + SWORD_COUNT + POT_COUNT;

PLAYER_STATS = { health: 100, damage: 10 };
ENEMY_STATS = { health: 50, damage: 10 };

SWORD_BONUS_DAMAGE = 10;
HEAL_POT_HEALTH_REGEN = 25;
ENEMY_LINE_OF_SIGHT = 7;

const TileStates = {
  Empty: "",
  Wall: "W",
  Player: "P",
  Enemy: "E",
  HealPot: "HP",
  Sword: "SW",
};

const ImpassableTiles = [TileStates.Enemy, TileStates.Player, TileStates.Wall];

const PlayerActions = {
  MoveUp: "Up",
  MoveDown: "Down",
  MoveLeft: "Left",
  MoveRight: "Right",
  Attack: "Attack",
};

const Directions = {
  Up: "Up",
  Down: "Down",
  Left: "Left",
  Right: "Right",
};

const Controls = {
  KeyW: PlayerActions.MoveUp,
  KeyS: PlayerActions.MoveDown,
  KeyA: PlayerActions.MoveLeft,
  KeyD: PlayerActions.MoveRight,
  ArrowUp: PlayerActions.MoveUp,
  ArrowDown: PlayerActions.MoveDown,
  ArrowLeft: PlayerActions.MoveLeft,
  ArrowRight: PlayerActions.MoveRight,
  Space: PlayerActions.Attack,
};

class Game {
  constructor(root) {
    this.root = root;
    this.canvas = new Canvas();
    Entity.generateEntities(this.canvas);
    this.player = Entity.entities["P-0"];
  }
  init() {
    this.listener = this.keyPressHandler.bind(this);
    this.player.draw(this.canvas);
    this.tick();
    this.root.setAttribute("tabindex", "0");
    this.root.focus();
    this.root.addEventListener("keyup", this.listener);
  }
  tick() {
    const enemyList = Entity.getEnemyList();
    enemyList.forEach((e) => e.tick(this.canvas));
    Entity.getPickUpsList().forEach((e) => e.tick(this.canvas));
    const injectedDOM = this.canvas.createDOMFragment(Entity.entities);
    this.root.innerHTML = "";
    this.root.append(injectedDOM);
    if (!this.player.isAlive) this.gameOver();
  }
  gameOver() {
    console.log("Game Over!");
    this.root.removeEventListener("keyup", this.listener);
  }
  keyPressHandler(evt) {
    if (Controls[evt.code]) {
      const isActionValid = this.player.action(Controls[evt.code]);
      if (!isActionValid) return;
      this.tick();
    }
  }
}

class Canvas {
  constructor() {
    while (!checkLayoutValidity(this.layout)) {
      this.layout = this.createBaseLayout();
      this.createRooms();
      this.createPathways();
      this.createOutlineWalls();
    }
  }
  getLayout() {
    return this.layout;
  }
  isCellEmpty(x, y) {
    if (x < 0 || x >= FIELD_WIDTH) return false;
    return this.layout[x][y] === TileStates.Empty;
  }
  getCell(x, y) {
    return this.layout[x][y];
  }
  getSurroundingTiles(x, y) {
    const tiles = [
      this.layout[x - 1][y - 1],
      this.layout[x - 1][y],
      this.layout[x - 1][y + 1],
      this.layout[x][y - 1],
      this.layout[x][y + 1],
      this.layout[x + 1][y - 1],
      this.layout[x + 1][y],
      this.layout[x + 1][y + 1],
    ];
    return tiles;
  }
  createDOMFragment(entities) {
    const fragment = new DocumentFragment();
    for (let y = 0; y < FIELD_HEIGTH; y++) {
      for (let x = 0; x < FIELD_WIDTH; x++) {
        const element = this.createDOMElement(this.layout[x][y], entities);
        // Добавит координаты
        if (DEBUG) element.append(`${x}\n${y}`);
        fragment.append(element);
      }
    }
    return fragment;
  }
  createDOMElement(id, entities) {
    const [type] = id.split("-");
    const tileElement = document.createElement("div");
    tileElement.className = "tile";
    if (type) tileElement.classList.add(`tile${type}`);
    if (type === TileStates.Player || type === TileStates.Enemy) {
      const healthBar = document.createElement("div");
      healthBar.className = "health";
      healthBar.style = `width: ${entities[id].getHealthPercent()}%`;
      tileElement.appendChild(healthBar);
    }
    return tileElement;
  }
  createBaseLayout() {
    return Array.from({ length: FIELD_WIDTH }, () =>
      Array.from({ length: FIELD_HEIGTH }, () => TileStates.Wall)
    );
  }
  createRooms() {
    const generateRoom = () => {
      const randomizeCornerCoordinates = (lengthX, lengthY) => {
        const x = randomSingleNumber(0, FIELD_WIDTH - lengthX);
        const y = randomSingleNumber(0, FIELD_HEIGTH - lengthY);
        return { x, y };
      };

      const [lengthX, lengthY] = Array.from({ length: 2 }, () =>
        randomSingleNumber(MIN_ROOM_SIZE, MAX_ROOM_SIZE)
      );
      const startCorner = randomizeCornerCoordinates(lengthX, lengthY);

      for (let x = startCorner.x; x < startCorner.x + lengthX; x++) {
        for (let y = startCorner.y; y < startCorner.y + lengthY; y++) {
          this.layout[x][y] = TileStates.Empty;
        }
      }
    };

    const roomCount = randomSingleNumber(MIN_ROOM_COUNT, MAX_ROOM_COUNT);

    if (DEBUG) console.log("Rooms:", roomCount);
    Array.from({ length: roomCount }).forEach(() => generateRoom());
  }
  createPathways() {
    const drawVerticalPathway = (x) => {
      this.layout[x] = this.layout[x].map(() => TileStates.Empty);
    };
    const drawHorizontalPathway = (y) => {
      for (const xRow of this.layout) {
        xRow[y] = TileStates.Empty;
      }
    };

    const [verticalPathwayCount, horisontalPathwayCount] = Array.from(
      { length: 2 },
      () => randomSingleNumber(MIN_PATHWAYS, MAX_PATHWAYS)
    );

    if (DEBUG)
      console.log(
        "verticalPathwayCount:",
        verticalPathwayCount,
        "horisontalPathwayCount:",
        horisontalPathwayCount
      );

    randomMultipleNumbers(0, FIELD_WIDTH - 1, verticalPathwayCount).forEach(
      (x) => drawVerticalPathway(x)
    );
    randomMultipleNumbers(0, FIELD_HEIGTH - 1, horisontalPathwayCount).forEach(
      (y) => drawHorizontalPathway(y)
    );
  }
  createOutlineWalls() {
    this.layout[-1] = Array.from(
      { length: FIELD_HEIGTH + 2 },
      () => TileStates.Wall
    );
    this.layout[FIELD_WIDTH] = Array.from(
      { length: FIELD_HEIGTH + 2 },
      () => TileStates.Wall
    );
    for (let xRow of this.layout) {
      xRow[-1] = TileStates.Wall;
      xRow[FIELD_HEIGTH] = TileStates.Wall;
    }
  }
  getEmptyCells() {
    const emptyCells = [];
    for (const x in this.layout) {
      for (const y in this.layout[x]) {
        if (this.isCellEmpty(x, y)) {
          emptyCells.push({ x, y });
        }
      }
    }
    return emptyCells;
  }
  checkLineOfSight({ x1, y1, x2, y2 }) {
    if (Math.abs(x1 - x2) + Math.abs(y1 - y2) > ENEMY_LINE_OF_SIGHT)
      return false;
    const tilesToCheck = getLineOfSightTiles({ x1, y1, x2, y2 });
    for (const tile of tilesToCheck) {
      const { x, y } = tile;
      if (this.getCell(x, y) === TileStates.Wall) return false;
    }
    return true;
  }
}

class Tile {
  constructor() {}
  static isEmpty(canvas, x, y) {
    return canvas[x][y] === TileStates.Empty;
  }
}

class Entity {
  static entities = {};
  static entityList = [];
  constructor({ x, y, type, id, canvas }) {
    this.isAlive = true;
    this.canvas = canvas;
    this.id = id;
    this.x = Number(x);
    this.y = Number(y);
    this.type = type;
    this.lastX = Number(x);
    this.lastY = Number(y);
  }
  static getEnemyList() {
    return this.entityList.filter((entity) => entity instanceof Enemy);
  }
  static getPickUpsList() {
    return this.entityList.filter((entity) => entity instanceof PickUp);
  }
  static generateEntities(canvas) {
    const emptyCells = canvas.getEmptyCells();
    const entitySpots = shuffleArray(emptyCells).slice(0, ENTITIES_COUNT);
    const entitiesToCreate = []
      .concat(Array.from({ length: PC_COUNT }, () => TileStates.Player))
      .concat(Array.from({ length: SWORD_COUNT }, () => TileStates.Sword))
      .concat(Array.from({ length: POT_COUNT }, () => TileStates.HealPot))
      .concat(Array.from({ length: ENEMY_COUNT }, () => TileStates.Enemy));

    entitiesToCreate.forEach((type, i) => {
      const { x, y } = entitySpots[i];
      const newEntity = this.create({ x, y, type, canvas, i });
      this.entities[newEntity.id] = newEntity;
      this.entityList.push(newEntity);
    });

    return [this.entities, this.entityList];
  }
  static destroy(id) {
    this.entityList = this.entityList.filter((e) => e.id !== id);
  }
  static create({ x, y, type, canvas, i }) {
    const id = `${type}-${i}`;
    switch (type) {
      case TileStates.Player:
        return new Player({ x, y, canvas, id });
      case TileStates.Enemy:
        return new Enemy({ x, y, canvas, id });
      case TileStates.Sword:
        return new Sword({ x, y, id, canvas });
      case TileStates.HealPot:
        return new HealPotion({ x, y, id, canvas });
    }
  }
  draw() {
    if (this.isAlive) this.canvas.layout[this.x][this.y] = this.id;
  }
  erase() {
    this.canvas.layout[this.x][this.y] = TileStates.Empty;
  }
}

class Character extends Entity {
  constructor({ x, y, id, type, health, damage, canvas }) {
    super({ id, x, y, type });
    this.canvas = canvas;
    this.maxHealth = health;
    this.currentHealth = health;
    this.damage = damage;
  }
  getHealthPercent() {
    if (this.currentHealth <= 0) return 0;
    return Math.ceil((this.currentHealth / this.maxHealth) * 100);
  }
  checkTileAvailiability({ newX, newY }) {
    const id = this.canvas.getCell(newX, newY);
    const [type] = id.split("-");
    if (ImpassableTiles.includes(type)) return false;
    return true;
  }
  takeHit(damage) {
    this.currentHealth = this.currentHealth - damage;
    if (this.currentHealth <= 0) this.kill();
  }
  kill() {
    this.isAlive = false;
    this.erase(this.canvas);
    Entity.destroy(this.id);
  }
  move(direction) {
    const moveConsts = {
      [Directions.Up]: { moveX: 0, moveY: -1 },
      [Directions.Down]: { moveX: 0, moveY: 1 },
      [Directions.Left]: { moveX: -1, moveY: 0 },
      [Directions.Right]: { moveX: 1, moveY: 0 },
    };
    const { moveX, moveY } = moveConsts[direction];
    const desiredCoordinates = { newX: this.x + moveX, newY: this.y + moveY };
    this.moveOnTile(desiredCoordinates);
    if (!this.checkTileAvailiability(desiredCoordinates)) return false;
    const { newX, newY } = desiredCoordinates;
    [this.lastX, this.lastY] = [this.x, this.y];
    [this.x, this.y] = [newX, newY];
    return true;
  }
  moveOnTile() {}
}

class Player extends Character {
  constructor({ x, y, id, canvas }) {
    super({
      id,
      x,
      y,
      canvas,
      type: TileStates.Player,
      health: PLAYER_STATS.health,
      damage: PLAYER_STATS.damage,
    });
  }
  action(action) {
    if (action === PlayerActions.Attack) return this.attack();
    if (!this.move(action)) return false;
    this.erase(this.canvas);
    this.draw(this.canvas);
    return true;
  }
  move(direction) {
    return super.move(direction);
  }
  attack() {
    const surroundingEnemies = this.canvas
      .getSurroundingTiles(this.x, this.y)
      .filter((id) => id.split("-")[0] === TileStates.Enemy);
    surroundingEnemies.forEach((id) =>
      Entity.entities[id].takeHit(this.damage)
    );
    return true;
  }
  pickUpSword() {
    this.damage += SWORD_BONUS_DAMAGE;
  }
  pickUpHealPot() {
    this.currentHealth = Math.min(
      this.maxHealth,
      this.currentHealth + HEAL_POT_HEALTH_REGEN
    );
  }
  erase(canvas) {
    canvas.layout[this.lastX][this.lastY] = TileStates.Empty;
    canvas.layout[this.x][this.y] = TileStates.Empty;
  }
  moveOnTile({ newX, newY }) {
    const id = this.canvas.getCell(newX, newY);
    const [type] = id.split("-");
    switch (type) {
      case TileStates.Enemy:
        this.takeHit(ENEMY_STATS.damage / 2);
        break;
      case TileStates.Sword:
        this.pickUpSword();
        Entity.entities[id].pop();
      case TileStates.HealPot:
        this.pickUpHealPot();
        Entity.entities[id].pop();
    }
  }
}

class Enemy extends Character {
  constructor({ x, y, id, canvas }) {
    super({
      id,
      x,
      y,
      canvas,
      type: TileStates.Enemy,
      health: ENEMY_STATS.health,
      damage: ENEMY_STATS.damage,
    });
    this.face = this.turnFace();
    this.lastFaceChange = 0;
  }
  tick() {
    this.erase(this.canvas);
    const isPlayerNear = this.canvas
      .getSurroundingTiles(this.x, this.y)
      .includes("P-0");
    if (isPlayerNear) {
      this.attack();
    } else {
      this.choseDirection();
      if (!this.move(this.face)) {
        this.turnFace(this.face);
        this.move(this.face);
      }
    }
    this.draw(this.canvas);
  }
  attack() {
    Entity.entities["P-0"].takeHit(this.damage);
  }
  choseDirection() {
    const canSee = this.canvas.checkLineOfSight({
      x1: this.x,
      y1: this.y,
      x2: Entity.entities["P-0"].x,
      y2: Entity.entities["P-0"].y,
    });
    if (DEBUG && canSee) console.log(this.id, this.x, this.y, "can see you!");
    if (canSee) {
      this.turnTowardsPlayer();
      return;
    }
    const chanceToTurn = this.lastFaceChange / (this.lastFaceChange + 10);
    const isTurning = Math.random() < chanceToTurn;
    if (isTurning) {
      this.face = this.turnFace(this.face);
    } else {
      this.lastFaceChange++;
    }
  }
  turnTowardsPlayer() {
    this.lastFaceChange = 0;
    const { x, y } = Entity.entities["P-0"];
    let newDirection;
    if (Math.abs(x - this.x) > Math.abs(y - this.y)) {
      if (x > this.x) {
        newDirection = Directions.Right;
      } else {
        newDirection = Directions.Left;
      }
    } else if (y > this.y) {
      newDirection = Directions.Down;
    } else newDirection = Directions.Up;
    this.face = newDirection;
  }
  turnFace(lastFace = null) {
    this.lastFaceChange = 0;
    return (this.face = shuffleArray(Object.values(Directions)).find(
      (dir) => dir !== lastFace
    ));
  }
}

class PickUp extends Entity {
  pop() {
    this.erase(this.canvas);
    Entity.destroy(this.id);
  }
  tick() {
    if (this.canvas.getCell(this.x, this.y) === TileStates.Empty) this.draw();
  }
}

class HealPotion extends PickUp {
  constructor({ x, y, id, canvas }) {
    super({ id, x, y, canvas, type: TileStates.HealPot });
  }
}

class Sword extends PickUp {
  constructor({ x, y, id, canvas }) {
    super({ id, x, y, canvas, type: TileStates.Sword });
  }
}

// Helper functions

function randomSingleNumber(minValue, maxValue) {
  return Math.floor(Math.random() * (maxValue - minValue + 1) + minValue);
}

function randomMultipleNumbers(minValue, maxValue, amount) {
  const array = Array.from(
    { length: maxValue - minValue + 1 },
    (_, i) => i + minValue
  );
  const shuffledArray = shuffleArray(array).slice(0, amount);
  return shuffledArray;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getLineOfSightTiles({ x1, y1, x2, y2 }) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  let candidates = [];
  if (x1 === x2) {
    for (let y = minY + 1; y < maxY; y++) candidates.push({ x: x1, y });
    return candidates;
  }
  if (y1 === y2) {
    for (let x = minX + 1; x < maxX; x++) candidates.push({ x, y: y1 });
    return candidates;
  }
  const equationParams = ({ x1, y1, x2, y2 }) => {
    return { a: y2 - y1, b: x1 - x2, c: y1 * x2 - x1 * y2 };
  };
  const { a, b, c } = equationParams({ x1, y1, x2, y2 });
  const evalEquation = ({ x, y }) => a * x + b * y + c;

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const [sq1, sq2, sq3, sq4] = [
        { x: x - 0.5, y: y - 0.5 },
        { x: x + 0.5, y: y - 0.5 },
        { x: x + 0.5, y: y + 0.5 },
        { x: x - 0.5, y: y + 0.5 },
      ];
      if (
        evalEquation(sq1) * evalEquation(sq3) < 0 ||
        evalEquation(sq2) * evalEquation(sq4) < 0
      ) {
        candidates.push({ x, y });
      }
    }
  }
  return candidates;
}

function checkLayoutValidity(array) {
  if (!array) return false;
  let grid = JSON.parse(JSON.stringify(array));
  const gridLength = grid.length;
  const rowLength = grid[0].length;
  let count = 0;
  // Loop through every cell in the grid
  for (let i = 0; i < gridLength; i++) {
    for (let j = 0; j < rowLength; j++) {
      // When we hit land we know we are on an island
      // We will use this cell to visit all the 1's connected to it
      // Once we've visited all the 1's connected to this cell then we increase the count
      if (grid[i][j] === "") {
        dfs(i, j);
        count++;
      }
    }
  }

  // DFS search
  // Look in all directions and set the current cell to 0 to prevent this cell from being visited again
  function dfs(i, j) {
    if (grid[i][j] === "") {
      grid[i][j] = "W";
      // look north
      if (i - 1 >= 0) dfs(i - 1, j);
      // look east
      if (j + 1 < rowLength) dfs(i, j + 1);
      // look south
      if (i + 1 < gridLength) dfs(i + 1, j);
      // look west
      if (j - 1 >= 0) dfs(i, j - 1);
    }
  }
  if (DEBUG) console.log(count);
  return count === 1;
}
