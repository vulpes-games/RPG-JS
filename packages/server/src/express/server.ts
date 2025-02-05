import http from 'http'
import path from 'path'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import entryPoint from '../entry-point'
import PrettyError from 'pretty-error'
import { ModuleType } from '@rpgjs/common'
import { RpgServerEngine } from '../server'
import { api } from './api'
import { Query } from '../Query'

type ExpressServerOptions = {
    basePath: string,
    globalConfig?: any,
    envs?: object
}

export function expressServer(modules: ModuleType[], options: ExpressServerOptions): Promise<{
    app: express.Express,
    server: http.Server,
    game: RpgServerEngine
}> {
    return new Promise((resolve, reject) => {
        const envs = options.envs || {}
        const dirname = options.basePath
        const PORT = process.env.PORT || 3000
        const pe = new PrettyError()
        const app = express()
        const server = http.createServer(app)
        const io = new Server(server, {
            maxHttpBufferSize: 1e10,
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        })

        // @ts-ignore
        const isBuilt = !!envs.VITE_BUILT

        // @ts-ignore
        const hasStatic = process.env.STATIC_DIRECTORY_ENABLED
        const staticDirectory = isBuilt ? '' : 'dist'
        // @ts-ignore
        const staticEnabled = (isBuilt && hasStatic === undefined) || hasStatic === 'true'

        if (!isBuilt) {
            app.use(express.json({
                // TODO
                limit: '50mb'
            }))
        }

        app.use(cors())

        if (staticEnabled) {
            app.use('/', express.static(path.join(dirname, '..', staticDirectory, 'client')))
        }

        let rpgGame: RpgServerEngine

        async function start() {
            rpgGame = await entryPoint(modules, { io, ...options })
            rpgGame.app = app
            rpgGame.start()
            app.use('/api', api(rpgGame))
            app.use((err: any, req: any, res: any, next: any) => {
                const status = err.status || 500
                res.status(status).json({ error: err.message })
            })
            resolve({
                app,
                server,
                game: rpgGame
            })
        }

        // @ts-ignore
        const serverPort = !isBuilt ? (envs.VITE_SERVER_URL || '').split(':')[1] || PORT : PORT
        server.listen(serverPort, start)

        process.on('uncaughtException', function (error) {
            console.log(pe.render(error))
        })

        process.on('unhandledRejection', function (reason: any) {
            console.log(pe.render(reason))
        })

        if (import.meta['hot']) {
            import.meta['hot'].on("vite:beforeFullReload", () => {
                server.close()
                Query.getPlayers().forEach(player => {
                    player.gameReload()
                })
                rpgGame.stop()
            });
        }
    })
}