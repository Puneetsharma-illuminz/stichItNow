const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const dotenv = require('dotenv');
dotenv.config();

const pre = require('./preCondition');

const AuthBearer = require('hapi-auth-bearer-token');

let routes = require('./Routes');
const auth = require('./auth');
let host;

let port = 8000;

if (process.env.NODE_ENV == 'live') {

    port = process.env.PORT || 3000
} else {
    // host = 'localhost';
    port = 3000;
}
console.log(process.env.PORT);
(async() => {

    async function StartServer() {
        const app = new Hapi.Server({
            host: host,
            port: port,
            routes: { cors: true },
            // cache: { engine: require('catbox-memory'), name: 'memory' },
        });
        const swaggerOptions = {
            info: {
                title: 'STN Documentation',
                version: '1.0.0',
                contact: {

                }
            },
            // swaggerUI:false,
            // documentationPage:false,
            schemes: ['http', 'https']
        };
        await app.register(AuthBearer);
        await app.register(pre);
        await app.register(auth);
        await app.register([
            Inert,
            Vision,
            {
                plugin: HapiSwagger,
                options: swaggerOptions
            },
        ]);
        await app.register({
            plugin: require('hapi-rate-limit'),
            options: {
                enabled: true,
                userLimit: 500,
                userCache: { segment: 'hapi-rate-limit-user', expiresIn: 600000 },
                pathLimit: 500,
                pathCache: { segment: 'hapi-rate-limit-path', expiresIn: 600000 },
                userPathLimit: 500,
                userPathCache: true,
                userPathCache: {
                    segment: 'hapi-rate-limit-userPath',
                    expiresIn: 6000
                }
            }
        });

        app.route(routes, {
            config: {
                origin: ['*'],
                additionalHeaders: ['cache-control', 'x-requested-with', 'authorization',
                    'contentlanguage', 'postman-token', 'authorization', 'utcoffset', 'content-type', 'devicetype'
                ]
            }


        });


        app.state('data', {
            ttl: null,
            isSecure: false,
            isHttpOnly: true,
            encoding: 'base64json',
            // domain:'.onlinefoodmerchant.com',
            clearInvalid: true, // remove invalid cookies
            strictHeader: true // don't allow violations of RFC 6265
        });
        await app.start();
        console.log('Server running at: ', app.info.uri)
    }
    try {
        await StartServer();
    } catch (error) {
        console.log(error);
    }
})();