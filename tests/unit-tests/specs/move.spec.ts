import { Move, ShapePositioning, Direction, EventData, EventMode, RpgEvent, RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { Control, RpgClientEngine } from '@rpgjs/client'
import {_beforeEach} from './beforeEach'
import { clear, nextTick } from '@rpgjs/testing'
import { inputs } from './fixtures/control'

let  client: RpgClientEngine, player: RpgPlayer, fixture, playerId
let server: RpgServerEngine

const INITIAL_SPEED = 3
const INITIAL_DIRECTION = 3

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
    server = ret.server
})

test('Default Speed', async () => {
    expect(player.speed).toBe(INITIAL_SPEED) // default speed
})

test('Move Route', async () => {
   await player.moveRoutes([ Move.right() ])
   expect(player.position).toMatchObject({ x: INITIAL_SPEED, y: 0, z: 0 })
})

test('Repeat Move Route', async () => {
    await player.moveRoutes([ Move.repeatMove(Direction.Right, 2) ])
    expect(player.position).toMatchObject({ x: INITIAL_SPEED * 2, y: 0, z: 0 })
})

test('Repeat Tile Move Route', async () => {
    await player.moveRoutes([ Move.tileRight(2) ])
    expect(player.position).toMatchObject({ x: 60, y: 0, z: 0 })
})

describe('Change Direction', () => {
    test('Change Direction [Right]', async () => {
        await player.moveRoutes([ Move.turnRight() ])
        expect(player.direction).toBe(2)
    })

    test('Change Direction [Left]', async () => {
        await player.moveRoutes([ Move.turnLeft() ])
        expect(player.direction).toBe(4)
    })

    test('Change Direction [Up]', async () => {
        await player.moveRoutes([ Move.turnUp() ])
        expect(player.direction).toBe(1)
    })

    test('Change Direction [Down]', async () => {
        await player.moveRoutes([ Move.turnDown() ])
        expect(player.direction).toBe(3)
    })

    describe('Event Move', () => {
        let event: RpgEvent
        beforeEach(() => {
            @EventData({
                name: 'test',
                mode: EventMode.Scenario
            })
            class MyEvent extends RpgEvent {}
            const events = player.createDynamicEvent({
                x: 0,
                y: 0,
                event: MyEvent
            })
            event = Object.values(events)[0] as RpgEvent
        })

        test('Turn Direction Toward Player', async () => {
            event.position.y = 50
            await event.moveRoutes([ Move.turnTowardPlayer(player) ])
            expect(event.direction).toBe(1)
        })
    
        test('Away From Player', async () => {
            event.position.y = 50
            await event.moveRoutes([ Move.awayFromPlayer(player) ])
            expect(event.position).toMatchObject({ x:0, y: 50 + INITIAL_SPEED, z: 0 })
        })

        test('Toward Player', async () => {
            event.position.y = 50
            await event.moveRoutes([ Move.towardPlayer(player) ])
            expect(event.position).toMatchObject({ x:0, y: 50 - INITIAL_SPEED, z: 0 })
        })
    })
})

describe('pendingMove & canMove test', () => {
    test('canMove property (true by default)', () => {
        expect(player.canMove).toBe(true)
    })

    test('(client)', () => {
        client.sendInput(Control.Right)
        const pendingMove = client.player?.pendingMove
        expect(pendingMove).not.toHaveLength(0)
        expect(pendingMove?.[0]).toMatchObject({ frame: 0, input: Control.Right })
    })

    test('(server)', async () => {
        client.sendInput(Control.Right)
        await client.processInput()
        const pendingMove = player?.pendingMove
        expect(pendingMove).not.toHaveLength(0)
    })

    describe('Block Move', () => {
        beforeEach(async () => {
            player.canMove = false
            await nextTick(client)
        })
    
        test('canMove property, client side test', async () => {
            expect(client.player?.canMove).toBe(false)
        })
    
        test('canMove property, client do not press input', async () => {
            client.sendInput(Control.Right)
            await client.processInput()
            expect(player?.pendingMove).toHaveLength(0)
        })
    })
})

test('Move but limit of the map', async () => {
    player.position.x = 1
    await player.moveRoutes([ Move.left() ])
    expect(player.position).toMatchObject({ x: 0, y: 0, z: 0 })
    await nextTick(client)
    expect(client.player?.position).toMatchObject({ x: 0, y: 0, z: 0 })
})

describe('Size Max Shape of Player', () => {
    test('(default)', async () => {
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 0, minY: 0, maxX: 32, maxY: 32 })
    })

    test('(hitbox)', async () => {
        player.setHitbox(100, 100)
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 0, minY: 0, maxX: 100, maxY: 100 })
    })

    test('(hitbox) + (position)', async () => {
        player.setHitbox(100, 100)
        player.position.x = 50
        player.position.y = 50
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 50, minY: 50, maxX: 150, maxY: 150 })
    })

    test('(attach shape)', async () => {
        player.position.x = 200
        player.position.y = 200
        player.setHitbox(10, 10)
        player.attachShape({
            width: 100,
            height: 100,
            positioning: ShapePositioning.Center
        })
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 155, minY: 155, maxX: 255, maxY: 255 })
    })

    test('(multi attach shape)', async () => {
        player.position.x = 200
        player.position.y = 200
        player.setHitbox(10, 10)
        player.attachShape({
            width: 100,
            height: 100,
            positioning: ShapePositioning.Center
        })
        player.attachShape({
            width: 50,
            height: 200,
            positioning: ShapePositioning.Center
        })
        const maxShape = player.getSizeMaxShape()
        expect(maxShape).toMatchObject({ minX: 155, minY: 105, maxX: 255, maxY: 305 })
    })
})

describe('Move To', () => {
    test('To Position', () => {
        player.moveTo({ x: 10, y: 10 })
        server.nextTick(0)
        //console.log(player.position)
    })
})
 
afterEach(() => {
    clear()
})