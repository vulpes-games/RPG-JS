import { RpgPlayer } from '@rpgjs/server'

export class Player extends RpgPlayer {

    _rev

    async onConnected() {

      
      this.setVision({
        type: 'box',
        width: 100,
        height: 100
      })

     /* const gui = this.gui('gui-name')

      gui.on('change-name', (name) => {
           this.name = name
           gui.close()
      })

      await gui.open({}, {
          waitingAction: true,
          blockPlayerInput: true
      })
      */

       /*const data = await db.get('test')

       if (false) {
         this.load(data.data)
         this._rev = data._rev
       }
       else {
        
       }  */
      

        
    }

    onJoinMap() {
      //const gui = this.gui('info')
      //gui.open({})
    }

    onInput({ input }) {
      if (input == 'back') {
        this.callMainMenu()
        //this.showEmotionBubble('confusion')
      }
    }

    onDead() {
       
    }

    onInVision(other: RpgPlayer) {
      console.log('in')
    }

    onOutVision(other: RpgPlayer) {

    }

    onLevelUp(nbLevel) {
        
    }
}