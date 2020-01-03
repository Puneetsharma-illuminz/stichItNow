
const services = require('./services/databaseServices');
const boom =require('boom')
const constant =require('./config/constant')

var myplugin = {  
    name: 'auth',
    register: function (server) {
        server.auth.strategy('JwtAuth', 'bearer-access-token',
            {
                allowQueryToken: false,
                allowMultipleHeaders: true,
                accessTokenName: 'accessToken',
                unauthorized:((e)=>{
                    return boom.unauthorized(constant.MESSAGE.bad_token)
                }),
                validate:async (request, token)=> {
                    try{
                        if(request.headers.devicetype == constant.DEVICE_TYPE.WEB){
                        console.log('-------->',request.state)
                            token = request.state.data || null
                        }
                        if(!token){
                            throw new Error();
                        }
                        let response =  await services.verifyToken(token);  
                    const isValid = true;
                        const credentials = { scope: response.role, userSession: response};
                   if(response.role == constant.ROLE.SERVICE_PROVIDER){
                    credentials.scope =response.permissions
                   }
                        const artifacts = {};
                        return { isValid, credentials, artifacts };
  
                    }catch(e){
                        let isValid = false;
                        let artifacts = {};
                        const credentials = {};
                        // h.output =e;
                        return {isValid, credentials,artifacts};
                    }
                },
            });
    } 
}; 
module.exports = myplugin; 