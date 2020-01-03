const constant = require('../config/constant');
const { serviceProviderController } = require('../Controllers');
const boom = require('boom');
let BaseJoi = require('joi')
const Extension = require('joi-date-extensions');
let Joi = BaseJoi.extend(Extension);
var routes = [];

const universalFunctions = require("../universalFunction/functions");

exports.login = {
    method: 'POST',
    path: '/admin/login',
    async handler(request) {
        const remoteIP = request.info.remoteAddress;
        // const lang = request.headers.contentlanguage;
        let data = await serviceProviderController.login(request.payload, remoteIP);
        return data;
    },
    config: {
        tags: ['api', 'user'],
        validate: {
            headers: {},
            options: {
                allowUnknown: true,
                abortEarly: true
            },
            payload: {
                email: Joi.string().email({ minDomainAtoms: 1 }).required().lowercase(),
                password: Joi.string().required(),
                //  country: Joi.number().required()

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
exports.getZone = {
    method: 'GET',
    path: '/serviceprovider/getzone',
    async handler(request) {
        const remoteIP = request.info.remoteAddress;
        const utcoffset = request.headers.utcoffset;
        let data = await serviceProviderController.getZone(request.query);
        return data;
    },
    config: {
        auth: {
            strategy: 'JwtAuth',
            scope: [constant.ROLE.SERVICE_PROVIDER]
        },
        tags: ['api', 'user'],
        validate: {
            headers: {
                authorization: Joi.string().required().description('Bearer Token'),
                utcoffset: Joi.number().required().description('utc offset').error((er) => { return constant.MESSAGE.INVALID_HEADERS }),
            },
            options: {
                allowUnknown: true,
                abortEarly: true
            },
            query: {
                pageNumber: Joi.number().optional().allow(''),
                name: Joi.string().optional().allow(''),
                starttime: Joi.number().allow(''),
                endtime: Joi.number().allow(''),

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

for (let key in exports) {
    routes.push(exports[key]);
}

module.exports = routes;