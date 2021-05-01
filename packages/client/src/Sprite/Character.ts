import * as PIXI from 'pixi.js';
import { Direction, Utils } from '@rpgjs/common'
import { spritesheets } from './Spritesheets'
import { FloatingText } from '../Effects/FloatingText'
import { Animation } from '../Effects/Animation'
import { Animation as AnimationEnum } from '../Effects/AnimationCharacter';

const { capitalize } = Utils

export default class Character extends PIXI.Sprite {
   
    tilesOverlay: any
    h: number = 1
    w: number = 1
    protected direction: number = 0
    private graphic: string = ''
    private spritesheet: any
    private _x: number = 0
    private _y: number = 0
    public z: number = 0
    private effects: any[] = []
    private fixed: boolean = false
    private playStandardAnimation: boolean = true
    public animation: Animation
    private objSaved: object = {}

    anim
    overlayShape: { 
        offset: [number, number],
        sizeTiles: [number, number]
    }

     /** 
     * the direction of the sprite
     * 
     * @prop {Direction} dir up, down, left or up
     * @memberof RpgSprite
     * */
    get dir(): Direction {
        return [
            Direction.Down, 
            Direction.Left, 
            Direction.Right,
            Direction.Up
        ][this.direction]
    }

    /** 
     * To know if the sprite is a player
     * 
     * @prop {boolean} isPlayer
     * @memberof RpgSprite
     * */
    get isPlayer(): boolean {
        return this.data.type == 'player'
    }

    /** 
     * To know if the sprite is an event
     * 
     * @prop {boolean} isEvent
     * @memberof RpgSprite
     * */
    get isEvent(): boolean {
        return this.data.type == 'event'
    }

    /** 
     * To know if the sprite is the sprite controlled by the player
     * 
     * @prop {boolean} isCurrentPlayer
     * @memberof RpgSprite
     * */
    get isCurrentPlayer(): boolean {
        return this.data.playerId === this.scene.game.playerId
    }

    constructor(private data: any, protected scene: any) {
        super()
        this.x = data.position.x 
        this.y = data.position.y
        this.fixed = data.fixed
        this.overlayShape = {
            offset: [0, 0],
            sizeTiles: [1, 1]
        }
    }

    // Todo
    addEffect(str) {
        const id = Math.random()
        const text = new FloatingText(str, {
            fontFamily : 'Arial', 
            fontSize: 50, 
            fill : 0xffffff, 
            align : 'center',
            stroke: 'black',
            letterSpacing: 4,
            strokeThickness: 3
        })
        text['id'] = id
        this.addChild(text)
        text.run().then(() => {
            const index = this.effects.findIndex(effect => effect['id'] == id)
            this.effects.splice(index, 1)
            this.removeChild(text)
        })
        this.effects.push(text)
    }

    /**
     * Recover the position according to the graphic
     * Normally, the position is that of the hitbox but, we retrieve the top left corner of the graphic
     * 
     * You can also pass the `middle` value as first parameter to retrieve the positions from the middle of the sprite
     * 
     * @title Get Positions of Graphic
     * @method sprite.getPositionsOfGraphic(align)
     * @param {string} [align] middle
     * @returns { x: number, y: number }
     * @memberof RpgSprite
     */
    getPositionsOfGraphic(align?: string): { x: number, y: number } {
        const isMiddle = align == 'middle'
        return {
            x: this.x - this.w * this.anchor.x + (isMiddle ? this.w / 2 : 0),
            y: this.y - this.h * this.anchor.y + (isMiddle ? this.h / 2 : 0)
        }
    }

    showAnimation(graphic: string, animationName: string) {
        const refreshAnimation = (graphic) => {
            this.removeChild(this.animation)
            this.animation = new Animation(graphic)
            this.addChild(this.animation)
        }
        const memoryGraphic = this.graphic

        refreshAnimation(graphic)
        
        this.animation.onFinish = () => {
            this.playStandardAnimation = true
            refreshAnimation(memoryGraphic)
            this.update(this.objSaved)
        }

        this.playStandardAnimation = false
        this.playAnimation(animationName)
        return this.animation
    }

    setGraphic() {
        this.spritesheet = spritesheets.get(this.graphic)
        this.animation = new Animation(this.graphic)
        this.addChild(this.animation)
        this.animation.applyTransform = (frame, spritesheet) => {
            const { spriteWidth, spriteHeight } = spritesheet
            let anchor = [0, 0]
            
            if (frame.anchor) {
                anchor = frame.anchor
            }
            else {
                const data = this.data
                if (this.data.wHitbox && this.data.hHitbox) {
                    const w = (1 - (data.wHitbox / spriteWidth)) / 2
                    const h = 1 - (data.hHitbox / spriteHeight)
                    anchor = [w, h]
                }
            }
            
            this.overlayShape = {
                offset: [-spriteWidth * anchor[0], -spriteWidth * anchor[1]],
                sizeTiles: [1, 1]
            }

            return {
                anchor
            }
        }
    }

    update(obj): any {
        const { graphic, speed } = obj

        if (graphic != this.graphic) {
            this.graphic = graphic
            this.setGraphic()
        }

        if (this.anim) this.anim.update()

        let moving = false

        if (!this.fixed) {
            this.z = Math.floor(obj.position.z)
            this._x = Math.floor(obj.position.x)
            this._y = Math.floor(obj.position.y) - this.z

            this.parent.zIndex = this._y
     
            obj.posX = obj.position.x
            obj.posY = obj.position.y
    
            this.direction = obj.direction

            // If the positions coming from the server are too different from the client, we reposition the player.
            if (Math.abs(this._x - this.x) > speed * 15) this.x = this._x
            if (Math.abs(this._y - this.y) > speed * 15) this.y = this._y
          
            if (this._x > this.x) {
                this.x += Math.min(speed, this._x - this.x)
                moving = true
            }
    
            if (this._x < this.x) {
                this.x -= Math.min(speed, this.x - this._x)
                moving = true
            }
    
            if (this._y > this.y) {
                this.y += Math.min(speed, this._y - this.y)
                moving = true
            }
    
            if (this._y < this.y) {
                this.y -= Math.min(speed, this.y - this._y)
                moving = true
            }
        }

        if (this.animation) this.animation.update()

        if (this.playStandardAnimation) {
            if (moving) {
                this.onMove()
                this.playAnimation(AnimationEnum.Walk)
            }
            else {
                this.playAnimation(AnimationEnum.Stand)
            }
        }

        this.onUpdate(obj)
        this.objSaved = obj

        return {
            moving,
            instance: this
        }
    }

    playAnimation(name: string) {
        const hook = `onCharacter${capitalize(name)}`
        if (!this.spritesheet) return
        if (this.spritesheet[hook]) {
            this.spritesheet[hook](this)
        }
        else if (this.animation.has(name)) {
            this.animation.play(name, [this.dir])
        }
    }

    // Hooks
    onInit() {}
    onUpdate(obj) {}
    onMove() {}
    onChanges(data, old) { }
}