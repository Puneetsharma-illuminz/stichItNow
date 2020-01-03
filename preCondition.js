const boom =require('boom')
const services = require('./services/databaseServices');
const constant = require('./config/constant')

var myplugin = [{  
    name: 'preCondition',
    register:  async function (server) {
        server.ext({
            type: 'onPreHandler',
            async method(request, reply) {
                console.log('--12------>',request.query,request.state)
                console.log('-------->payload',request.payload, request.headers)
            //     if(request.headers.authorization){
            //     let sessionInfo =  request.auth.credentials.userSession;
            //     if(sessionInfo.role == constant.USER.SERVICE_PROVIDER){
            //     let s = await services.pathAccess(request,sessionInfo);
            //         if(!s){
            //             return boom.badRequest(constant.MESSAGE.NOT_HAVE_PERMISSION)
            //         }   
            //     }
            //  return reply.continue;
            // }
            return reply.continue;
        }
          });
    }},{
        name: 'onReq',
    register:  async function (server) {
        server.ext({
            type: 'onRequest',
            async method(request, reply) {

                console.log('--12------>',request.query,request.state)
                console.log('-------->',request.payload, request.headers)
            //     if(request.headers.authorization){
            //     let sessionInfo =  request.auth.credentials.userSession;
            //     if(sessionInfo.role == constant.USER.SERVICE_PROVIDER){
            //     let s = await services.pathAccess(request,sessionInfo);
            //         if(!s){
            //             return boom.badRequest(constant.MESSAGE.NOT_HAVE_PERMISSION)
            //         }   
            //     }
            //  return reply.continue;
            // }
            return reply.continue;
        }
          });
    },
},{
    name: 'onpre',
    register:  async function (server) {
        
        server.ext({
            type: 'onPreResponse',
            async method(request, reply) {
                // // console.log('--------->',request)
                if (!request.headers.origin) {
                    return reply.continue
                  }
                
                  // depending on whether we have a boom or not,
                  // headers need to be set differently.
                  var response = request.response.isBoom ? request.response.output : request.response
                
                  response.headers['access-control-allow-origin'] = request.headers.origin
                  response.headers['access-control-allow-credentials'] = 'true'
                  if (request.method !== 'options') {
                    return reply.continue
                  }
                
                  response.statusCode = 200
                  response.headers['access-control-expose-headers'] = 'content-type, content-length, etag'
                  response.headers['access-control-max-age'] = 60 * 10 // 10 minutes
                  // dynamically set allowed headers & method
                  if (request.headers['access-control-request-headers']) {
                    response.headers['access-control-allow-headers'] = request.headers['access-control-request-headers']
                  }
                  if (request.headers['access-control-request-method']) {
                    response.headers['access-control-allow-methods'] = request.headers['access-control-request-method']
                  }             
                 return reply.continue   
            }
          });
    }
}]; 
module.exports = myplugin; 