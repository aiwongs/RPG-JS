import { RpgEvent, EventData, RpgPlayer, Query, Move } from '@rpgjs/server'
import { Monster } from '../database/enemies/monster'
import { Potion } from '../database/items/potion';

@EventData({
    name: 'EV-1',
    syncAll: true,
    width: 32,
    height: 32,
    hitbox: {
        width: 32,
        height: 16
    }
})
class _ChestEvent extends RpgEvent {

    async onInit() {
        this.speed = 1
        this.frequency = 200
        this.setGraphic('hero')
        //this.infiniteMoveRoute([ Move.tileRandom() ])
    }

    onChanges(player) {
        if (player.getVariable('A')) {
            return
        }
    }

    async onAction(player: RpgPlayer) {
        /*await player.showText('Hey !')
        player.addItem(Potion)*/
       // await player.showText('Hey', { talkWith: this })
    }

    onPlayerTouch() {
        
    }

    onEventTouch() {

    }

    onDestroy() {

    }
}

export function ChestEvent() {
    return _ChestEvent
}