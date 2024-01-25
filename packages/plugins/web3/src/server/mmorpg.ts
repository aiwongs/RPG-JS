import { RpgServer, RpgModule, RpgPlayer } from '@rpgjs/server'
import AuthModule from '@rpgjs/auth'
import { PlayerWeb3Manager } from './web3manager'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        web3: PlayerWeb3Manager
    }
}

// @ts-ignore
@RpgModule<RpgServer>({
    imports: [AuthModule],
    player: {
        onConnected(player: RpgPlayer) {
            player.web3 = new PlayerWeb3Manager(player._socket.web3)
            delete player._socket.web3
        }
    }
})
export default class RpgServerWeb3ModuleEngine { }