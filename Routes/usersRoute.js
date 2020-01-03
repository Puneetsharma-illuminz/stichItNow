//const Joi = require('@hapi/joi'); //.extend(require('@hapi/joi-date'));

let BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
let Joi = BaseJoi.extend(Extension);
const { userController } = require('../Controllers');
const boom = require('boom');
const universalFunctions = require("../universalFunction/functions");
const { constant } = require('../config');

var routes = [];


exports.phoneExist = {
    "method": 'POST',
    path: '/user/userExist',

    config: {
        handler: async(request) => {
            const lang = request.headers['accept-language'];
            // console.log(request.payload);
            // let sessionInfo = request.auth.credentials.userSession;
            let data = await userController.userExist(request.payload, lang);
            return data;
        },

        tags: ['api', 'user'],
        validate: {
            headers: {
                'accept-language': Joi.string().optional().default('en').description('lang'),
            },
            options: {
                allowUnknown: true
            },
            payload: {
                // type: Joi.string().valid(Object.keys(constant.ORDER_TYPE)).required()
                email: Joi.string().email({ minDomainAtoms: 1 }).required().lowercase(),
                phoneNumber: Joi.string().required(),
                countryCode: Joi.number().required(),
                referralCode: Joi.string().trim().optional().allow(''),
                // orderId: Joi.number().required()
            },
            failAction: universalFunctions.failActionFunction,
        },

        plugins: {
            'hapi-swagger': {
                responses: {
                    '400': {
                        'description': 'BadRequest'
                    }
                },
                payloadType: 'form'
            }
        },

    }
}

exports.sendPhoneVerificationCode = {
    method: 'POST',
    path: '/user/sendPhoneVerificationCode',
    async handler(request) {
        // const lang = request.headers['accept-language'];;
        // let sessionInfo = request.auth.credentials.userSession;
        let data = await userController.verifyUsers(request.payload);
        return data;
    },
    config: {

        tags: ['api', 'user'],
        validate: {
            headers: {
                // 'accept-language': Joi.string().optional().default('en').description('lang'),     
            },
            options: {
                allowUnknown: true
            },
            payload: Joi.object({
                phoneNumber: Joi.string().required()
                    //  countryCode: Joi.number().required(),
            }),
            failAction: universalFunctions.failActionFunction,
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '400': {
                        'description': 'BadRequest'
                    }
                },
                payloadType: 'form'
            }
        },

    }
}



exports.register = {
    method: 'POST',
    path: '/user/signUp',
    async handler(request) {
        const remoteIP = request.info.remoteAddress;
        const lang = request.headers['accept-language'];
        let data = await userController.signUp(request.payload, remoteIP);
        return data;
    },
    config: {
        tags: ['api', 'user'],
        validate: {
            headers: {
                // 'accept-language': Joi.string().optional().default('en').description('lang'),
            },
            options: {
                allowUnknown: true
            },
            payload: {
                email: Joi.string().email().optional().lowercase().allow(''),
                password: Joi.string().required(),
                deviceToken: Joi.string().optional().allow(''),
                phoneNumber: Joi.string().required(),
                countryCode: Joi.number().required(),
                fullName: Joi.string().optional().allow(''),
                lastName: Joi.string().optional().allow(''),
                verificationCode: Joi.string().optional().allow(''),
                referralCode: Joi.string().trim().optional().allow(''),

            },
            failAction: universalFunctions.failActionFunction,

        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '400': {
                        'description': 'BadRequest'
                    }
                },
                payloadType: 'form'
            }
        },
        pre: [{
            assign: 'verifyUser',
            async method(request) {
                try {
                    let data = await userController.verifyUserEmail(request.payload.phoneNumber, request.payload.email, request.payload.countryCode)
                    if (data && data.messageData) {
                        return boom.badRequest(data.messageData)
                    }
                    return true;
                } catch (e) {
                    console.log(e)
                    e = universalFunctions.sendExceptions(e, constant.MESSAGE.SOMETHING_WENT_WRONG)
                    return boom.badRequest(e)
                }
            },
        }]
    }
};

exports.login = {
    method: 'POST',
    path: '/user/login',
    async handler(request) {
        const remoteIP = request.info.remoteAddress;
        const devicetype = request.headers.devicetype;
        const lang = request.headers['accept-language'];;
        let data = await userController.login(request.payload, remoteIP, devicetype);
        return data;
    },
    config: {
        tags: ['api', 'user'],
        validate: {
            headers: {
                // 'accept-language': Joi.string().optional().default('en').description('lang'),
                // 'devicetype': Joi.string().valid(Object.keys(constant.DEVICE_TYPE)).required().error((er)=>{return constant.MESSAGE.INVALID_HEADERS}),

            },
            options: {
                allowUnknown: true
            },
            payload: {
                // email: Joi.string().email({ minDomainAtoms: 1 }).required().lowercase(),
                password: Joi.string().required(),
                // deviceToken: Joi.string().optional().allow(''),
                // userLongitude:Joi.number().min(-180).max(180),
                // userLatitude: Joi.number().min(-90).max(90),
                // phoneNumber: Joi.string().required(),
                // countryCode: Joi.number().required(),
            },
            failAction: universalFunctions.failActionFunction,

        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '400': {
                        'description': 'BadRequest'
                    }
                },
                payloadType: 'form'
            }
        },
    }
};
exports.userLogout = {
    method: 'POST',
    path: '/user/logout',
    async handler(request) {
        const lang = request.headers['accept-language'];;
        let sessionInfo = request.auth.credentials.userSession;
        let data = await userController.userLogout(request.payload, sessionInfo);
        return data;
    },
    config: {
        auth: {
            strategy: 'JwtAuth',
            scope: [constant.ROLE.USER]
        },
        tags: ['api', 'user'],
        validate: {
            headers: {
                // authorization: Joi.string().required().description('Bearer Token'),
                //  'accept-language': Joi.string().optional().default('en').description('lang'),     
            },
            options: {
                allowUnknown: true
            },
            failAction: universalFunctions.failActionFunction,
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '400': {
                        'description': 'BadRequest'
                    }
                },
                payloadType: 'form'
            }
        },

    }
}
exports.forgotPassword = {
    method: 'POST',
    path: '/user/forgotPassword',
    async handler(request) {
        const lang = request.headers['accept-language'];;
        let data = await userController.forgotPassword(request.payload, lang);
        return data;
    },
    config: {
        tags: ['api', 'user'],
        validate: {
            headers: {
                'accept-language': Joi.string().optional().default('en').description('lang'),

            },
            payload: {
                countryCode: Joi.string().required(),
                phoneNumber: Joi.string().required(),
                password: Joi.string().required(),
                verificationCode: Joi.number().required()
            },
            options: {
                allowUnknown: true
            },
            failAction: universalFunctions.failActionFunction,
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '400': {
                        'description': 'BadRequest'
                    }
                },
                payloadType: 'form'
            }
        },

    }
}

exports.sendForgotPasswordVerificationCode = {
    method: 'POST',
    path: '/user/sendForgotPasswordVerificationCode',
    async handler(request) {
        const lang = request.headers['accept-language'];
        let data = await userController.sendForgotPasswordVerificationCode(request.payload, lang);
        return data;
    },
    config: {
        tags: ['api', 'user'],
        validate: {
            headers: {
                'accept-language': Joi.string().optional().default('en').description('lang'),
            },
            payload: {
                countryCode: Joi.string().required(),
                phoneNumber: Joi.string().required()
            },
            options: {
                allowUnknown: true
            },
            failAction: universalFunctions.failActionFunction,
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '400': {
                        'description': 'BadRequest'
                    }
                },
                payloadType: 'form'
            }
        },

    }
}
exports.socialLogin = {
    method: 'POST',
    path: '/user/socialLogin',
    async handler(request) {
        const remoteIP = request.info.remoteAddress;
        request.payload.devicetype = request.headers.devicetype;
        let data = await userController.socialLogin(request.payload, remoteIP);

        return data;
    },
    config: {
        tags: ['api', 'user'],
        validate: {
            headers: {
                'accept-language': Joi.string().optional().default('en').description('lang'),
                //'devicetype': Joi.string().valid(Object.keys(constant.DEVICE_TYPE)).required().error((er) => { return constant.MESSAGE.INVALID_HEADERS }),

            },
            options: {
                allowUnknown: true
            },
            payload: {
                deviceToken: Joi.string().optional().allow(''),
                socialType: Joi.number().required().valid([Object.keys(constant.SOCIAL_LOGIN)]).description('social media type'),
                fullName: Joi.string().trim().required(),
                accessToken: Joi.string().required().description('access token to verify the user'),
                socialID: Joi.string().trim().required().description('Either facebookID/googleID'),
                image: Joi.string().trim().optional().allow(''),
                phoneNumber: Joi.string().optional().allow(''),
                countryCode: Joi.number().optional().allow(''),
                verificationCode: Joi.string().optional().allow(''),
                email: Joi.string().email({ minDomainSegments: 1 }).optional().lowercase(),
                referralCode: Joi.string().trim().optional().allow(''),
            },
            failAction: universalFunctions.failActionFunction,

        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '400': {
                        'description': 'BadRequest'
                    }
                },
                payloadType: 'form'
            }
        },
    }
};


exports.addAddress = {
    method: 'POST',
    path: '/user/addAddress',
    async handler(request) {
        let sessionInfo = request.auth.credentials.userSession;
        const lang = request.headers['accept-language'];;
        let data = await userController.addAddress(request.payload, lang, sessionInfo);
        return data;
    },
    config: {
        auth: {
            strategy: 'JwtAuth',
            scope: ['USER']
        },
        tags: ['api', 'user'],
        validate: {
            headers: {
                'accept-language': Joi.string().optional().default('en').description('lang'),
                authorization: Joi.string().required().description('Bearer Token'),
            },
            options: {
                allowUnknown: true
            },
            payload: {
                addressId: Joi.number().optional(),
                address: Joi.string().required(),
                houseNumber: Joi.string().required(),
                landMark: Joi.string().optional().allow(),
                // type: Joi.string().valid(Object.keys(constant.ADDRESS_TYPE)).required(),
                otherText: Joi.string().optional().allow(),
                userLongitude: Joi.number().min(-180).max(180),
                userLatitude: Joi.number().min(-90).max(90),
                buildingName: Joi.string().optional().allow('', null)
            },
            failAction: universalFunctions.failActionFunction,

        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '400': {
                        'description': 'BadRequest'
                    }
                },
                payloadType: 'form'
            }
        },
    }
};

exports.getCategories = {
    method: 'GET',
    path: '/user/getCategories',
    async handler(request) {
        //let sessionInfo = request.auth.credentials.userSession;
        const lang = request.headers['accept-language'];;
        let data = await userController.getCategories();
        return data;
    }
};

exports.getCategoriesAndVehicleInfo = {
    method: 'GET',
    path: '/user/getCategoriesAndVehicleInfo',
    async handler(request) {
        //let sessionInfo = request.auth.credentials.userSession;

        const lang = request.headers['accept-language'];

        let data = await userController.getCategoriesAndVehicleInfo();


        return data;
    }
};
exports.calculateDistance = {
    method: 'POST',
    path: '/user/calculateDistance',
    async handler(request) {
        //let sessionInfo = request.auth.credentials.userSession;
        const lang = request.headers['accept-language'];;
        let data = await userController.calculateDistance(request.payload);
        return data;
    }
};

exports.getVehicles = {
    method: 'POST',
    path: '/user/getVehicles',
    async handler(request) {
        //let sessionInfo = request.auth.credentials.userSession;
        const lang = request.headers['accept-language'];;
        // let data = await userController.getVehicles();
        return data;
    }
};
for (let key in exports) {
    routes.push(exports[key]);
}

//console.log(routes);
module.exports = routes;