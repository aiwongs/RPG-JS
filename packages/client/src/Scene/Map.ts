import * as PIXI from 'pixi.js'
import { RpgCommonMap, Input, Control, RpgPlugin, HookClient } from '@rpgjs/common'
import TileMap from '../Tilemap'
import { Viewport } from 'pixi-viewport'
import { IScene } from '../Interfaces/Scene'
import { Scene } from './Scene'
import { SceneData } from './SceneData'
import { spritesheets } from '../Sprite/Spritesheets'
import Character from '../Sprite/Character'
import { RpgSprite } from '../Sprite/Player'
import { RpgSound } from '../Sound/RpgSound'
import { Howler } from 'howler'

@SceneData({
    inputs: {
        [Control.Up]: {
            repeat: true,
            bind: Input.Up
        },
        [Control.Down]: {
            repeat: true,
            bind: Input.Down
        },
        [Control.Right]: {
            repeat: true,
            bind: Input.Right
        },
        [Control.Left]: {
            repeat: true,
            bind: Input.Left
        },
        [Control.Action]: {
            bind: [Input.Space, Input.Enter]
        },
        [Control.Back]: {
            bind: Input.Escape
        }
    }
})
export class SceneMap extends Scene implements IScene {

    protected tilemap: TileMap

    /** 
     * The viewport of the map
     * 
     * It automatically follows the sprite representing the player but you can attach it to something else
     * 
     * > Do not change the size of the viewport
     * 
     * @prop {PIXI.Viewport} viewport
     * @memberof RpgSceneMap
     * */
    protected viewport: Viewport | undefined
    private players: object = {}
    private isLoaded: boolean = false
    private gameMap: RpgCommonMap

    constructor(
            protected game: any, 
            private options: { screenWidth?: number, screenHeight?: number } = {}) {
        super(game)
        this.onInit()
    }

    load(obj): Promise<Viewport> {
        this.gameMap = new RpgCommonMap()
        this.gameMap.load(obj)

        if (!this.game.standalone) RpgCommonMap.buffer.set(obj.id, this.gameMap)

        this.tilemap = new TileMap(obj, this.game.renderer)

        const loader = PIXI.Loader.shared
        let nbLoad = 0

        loader.reset()

        for (let tileset of this.tilemap.tileSets) {
            if (tileset.spritesheet.resource) continue
            loader.add(tileset.name, tileset.spritesheet.image)
            nbLoad++
        }

        loader.load((loader, resources) => {
            for (let tileset of this.tilemap.tileSets) {
                const spritesheet = spritesheets.get(tileset.name)
                if (resources[tileset.name]) spritesheet.resource = resources[tileset.name]  
            }
        })

        Howler.stop()

        RpgPlugin.emit(HookClient.SceneMapLoading, loader)

        return new Promise((resolve, reject) => {
            
            const complete = () => {
                this.tilemap.load()
                this.viewport = new Viewport({
                    screenWidth: this.options.screenWidth,
                    screenHeight: this.options.screenHeight,
                    worldWidth: obj.width * obj.tileWidth,
                    worldHeight: obj.height * obj.tileHeight
                })
                this.tilemap.addChild(this.animationLayer)
                this.viewport.clamp({ direction: 'all' })
                this.viewport.addChild(this.tilemap)
                this.isLoaded = true
                if (obj.sounds) {
                    const sound = new RpgSound(obj.sounds[0])
                    sound.play()
                }
                resolve(this.viewport)
                if  (this.onLoad) this.onLoad()
            }
            loader.onError.add(() => {
                reject()
            })
            loader.onComplete.add(complete)
            if (nbLoad == 0) {
                complete()
            }
        })
    }

    draw(t: number, dt: number, frame: number) {
        if (!this.isLoaded) {
            return
        }
        super.draw(t, dt, frame)
        this.tilemap.drawAnimateTile(frame)
    }

    onUpdateObject(logic, sprite: Character, moving: boolean): Character {
        if (!sprite.overlayShape) return sprite
        const { x, y, tilesOverlay }: any = sprite
        const { x: offsetX, y: offsetY, width, height } = sprite.overlayShape
        const { paramsChanged } = logic
        if (moving || (paramsChanged && (paramsChanged.width || paramsChanged.height))) {
            tilesOverlay.removeChildren()
            const addTile = (x, y) => {
                const tiles = this.tilemap.createOverlayTiles(x, y, sprite)
                if (tiles.length) tilesOverlay.addChild(...tiles)
            }
            let _x = x + offsetX
            let _y = y + offsetY
            for (let i = _x ; i <= _x + width ; i += this.gameMap.tileWidth) {
                for (let j = _y ; j <= _y + height ; j += this.gameMap.tileHeight) {
                    addTile(i, j)
                }
            }
        }
        return sprite
    }

    setPlayerPosition(id: string, { x, y }: { x: number, y: number }) {
        this.players[id].x = x
        this.players[id].y = y
    }

    updateScene(obj) {
        const shapes = obj.partial.shapes
        if (shapes) {
            const shapesInMap = this.gameMap.shapes
            for (let name in shapes) {
                const shapeMap = shapesInMap[name]
                let shape = shapes[name]
                if (shape == null) {
                    this.gameMap.removeShape(name)
                    continue
                }
                shape = {
                    ...shape,
                    x: shape.hitbox.pos.x,
                    y: shape.hitbox.pos.y,
                    width: shape.hitbox.w,
                    height: shape.hitbox.h,
                    properties: {}
                }
                if (shapesInMap[name]) {
                    shapeMap.set(shape)
                }
                else {
                    this.gameMap.createShape(shape)
                }
            }
        }
    }

    addObject(obj, id: string): Character {
        const wrapper = new PIXI.Container()
        const tilesOverlay = new PIXI.Container()
        const sprite = new this.game._playerClass(obj, this)
        
        sprite.tilesOverlay = tilesOverlay
        wrapper.addChild(sprite, tilesOverlay)
        this.objects.set(id, sprite)
        this.tilemap.getEventLayer().addChild(wrapper)

        if (sprite.isCurrentPlayer) this.viewport?.follow(sprite)
        sprite.onInit()

        this.onAddSprite(sprite)
        RpgPlugin.emit(HookClient.AddSprite, sprite)

        return sprite
    }

    removeObject(id: string) {
        let sprite =  this.objects.get(id)
        if (sprite) {
            this.objects.delete(id)
            this.onRemoveSprite(sprite)
            RpgPlugin.emit(HookClient.RemoveSprite, sprite)
            sprite.destroy()
        }
    }
}